import { getAuthUser } from '../../_shared/auth';

interface Env {
  DB: D1Database;
  FLUTTERWAVE_SECRET: string;
}

interface FlutterwaveResponse {
  status: string;
  message: string;
  data?: {
    id: string;
    reference: string;
    amount: number;
    status: string;
    customer: {
      name: string;
      email: string;
    };
    created_at: string;
  };
}

// Get payout reconciliation status and analytics
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const user = await getAuthUser(request, env.DB);
  if (!user || user.role !== 'super_admin') {
    return Response.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const timeFrame = new URL(request.url).searchParams.get('timeframe') || '30days';
  let dateFilter = '';

  if (timeFrame === '7days') {
    dateFilter = "datetime('now', '-7 days')";
  } else if (timeFrame === '30days') {
    dateFilter = "datetime('now', '-30 days')";
  } else if (timeFrame === '90days') {
    dateFilter = "datetime('now', '-90 days')";
  }

  // Get payout analytics
  const analytics = await env.DB.prepare(`
    SELECT 
      COUNT(*) as total_payouts,
      SUM(CASE WHEN status='completed' THEN amount ELSE 0 END) as completed_amount,
      SUM(CASE WHEN status='processing' THEN amount ELSE 0 END) as processing_amount,
      SUM(CASE WHEN status='failed' THEN amount ELSE 0 END) as failed_amount,
      SUM(CASE WHEN status='pending' THEN amount ELSE 0 END) as pending_amount,
      COUNT(CASE WHEN status='completed' THEN 1 END) as completed_count,
      COUNT(CASE WHEN status='processing' THEN 1 END) as processing_count,
      COUNT(CASE WHEN status='failed' THEN 1 END) as failed_count,
      COUNT(CASE WHEN status='pending' THEN 1 END) as pending_count,
      COUNT(DISTINCT tutor_id) as tutors_paid
    FROM payouts
    WHERE created_at > ${dateFilter}
  `).first<any>();

  // Get failed payouts with retry info
  const failures = await env.DB.prepare(`
    SELECT 
      p.id, p.tutor_id, u.name, u.email, p.amount, p.status,
      pf.error_message, pf.attempt_number, pf.next_retry
    FROM payouts p
    LEFT JOIN payout_failures pf ON pf.payout_id = p.id
    LEFT JOIN users u ON u.id = p.tutor_id
    WHERE p.status IN ('failed', 'pending') AND pf.status = 'pending_retry'
    ORDER BY pf.next_retry ASC
  `).all<any>();

  // Get recent batches
  const batches = await env.DB.prepare(`
    SELECT 
      id, batch_date, payout_count, total_amount, status,
      created_at
    FROM payout_batches
    ORDER BY created_at DESC
    LIMIT 10
  `).all<any>();

  return Response.json({
    analytics: analytics,
    failed_payouts: failures.results || [],
    recent_batches: batches.results || [],
    settings: await getPayoutSettings(env)
  });
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const user = await getAuthUser(request, env.DB);
  if (!user || user.role !== 'super_admin') {
    return Response.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const body = await request.json<{
    action?: string;
    payout_id?: string;
    batch_id?: string;
  }>();

  if (body.action === 'retry_failed') {
    return await retryFailedPayout(env, body.payout_id || '');
  }

  if (body.action === 'verify_payout') {
    return await verifyPayoutStatus(env, body.payout_id || '');
  }

  if (body.action === 'reconcile_batch') {
    return await reconcileBatch(env, body.batch_id || '');
  }

  if (body.action === 'update_settings') {
    return await updatePayoutSettings(env, body as any);
  }

  return Response.json({ error: 'Unknown action' }, { status: 400 });
};

async function retryFailedPayout(env: Env, payoutId: string) {
  const payout = await env.DB.prepare(`
    SELECT * FROM payouts WHERE id = ?
  `).bind(payoutId).first<any>();

  if (!payout) {
    return Response.json({ error: 'Payout not found' }, { status: 404 });
  }

  // Check retry count
  const failure = await env.DB.prepare(`
    SELECT attempt_number FROM payout_failures WHERE payout_id = ? ORDER BY attempt_number DESC LIMIT 1
  `).bind(payoutId).first<any>();

  const attemptNumber = (failure?.attempt_number || 0) + 1;
  const maxRetries = 3;

  if (attemptNumber > maxRetries) {
    return Response.json({
      error: 'Maximum retries exceeded',
      attempts: attemptNumber - 1
    }, { status: 400 });
  }

  // Retry payout via Flutterwave
  try {
    const result = await initiateFlutterwavePayout(env, payout);

    await env.DB.prepare(`
      UPDATE payouts SET status = 'processing', updated_at = datetime('now')
      WHERE id = ?
    `).bind(payoutId).run();

    return Response.json({
      success: true,
      message: `Retry ${attemptNumber} of ${maxRetries} initiated`,
      attempt: attemptNumber,
      flutterwave_ref: result.reference
    });
  } catch (error: any) {
    await recordPayoutFailure(env, payoutId, error.message, attemptNumber);
    return Response.json({
      error: error.message,
      attempt: attemptNumber,
      max_retries: maxRetries
    }, { status: 500 });
  }
}

async function verifyPayoutStatus(env: Env, payoutId: string) {
  const payout = await env.DB.prepare(`
    SELECT * FROM payouts WHERE id = ?
  `).bind(payoutId).first<any>();

  if (!payout) {
    return Response.json({ error: 'Payout not found' }, { status: 404 });
  }

  try {
    // Verify with Flutterwave API
    const flwRef = payout.flutterwave_reference;
    const response = await verifyFlutterwaveTransfer(env, flwRef);

    // Update payout status based on response
    const newStatus = response.data?.status || 'unknown';
    
    await env.DB.prepare(`
      UPDATE payouts SET status = ?, updated_at = datetime('now')
      WHERE id = ?
    `).bind(newStatus, payoutId).run();

    // Log reconciliation
    await env.DB.prepare(`
      INSERT INTO payout_reconciliations (payout_id, reconciled_amount, reconciled_status)
      VALUES (?, ?, ?)
    `).bind(payoutId, payout.amount, newStatus).run();

    return Response.json({
      success: true,
      payout_id: payoutId,
      status: newStatus,
      amount: payout.amount,
      verified_at: new Date().toISOString()
    });
  } catch (error: any) {
    return Response.json({
      error: error.message,
      payout_id: payoutId
    }, { status: 500 });
  }
}

async function reconcileBatch(env: Env, batchId: string) {
  const batch = await env.DB.prepare(`
    SELECT * FROM payout_batches WHERE id = ?
  `).bind(batchId).first<any>();

  if (!batch) {
    return Response.json({ error: 'Batch not found' }, { status: 404 });
  }

  // Get all payouts in this batch
  const payouts = await env.DB.prepare(`
    SELECT id FROM payouts WHERE id LIKE ?
  `).bind(`%${batchId}%`).all<any>();

  let verified = 0;
  let discrepancies = 0;

  for (const payout of payouts.results || []) {
    try {
      const response = await verifyFlutterwaveTransfer(env, payout.id);
      verified++;
    } catch (error) {
      discrepancies++;
    }
  }

  // Mark batch as reconciled
  await env.DB.prepare(`
    UPDATE payout_batches SET status = 'reconciled', updated_at = datetime('now')
    WHERE id = ?
  `).bind(batchId).run();

  return Response.json({
    success: true,
    batch_id: batchId,
    payouts_verified: verified,
    discrepancies: discrepancies,
    reconciled_at: new Date().toISOString()
  });
}

async function initiateFlutterwavePayout(env: Env, payout: any): Promise<any> {
  // Get tutor bank info
  const tutor = await env.DB.prepare(`
    SELECT name, email FROM users WHERE id = ?
  `).bind(payout.tutor_id).first<any>();

  if (!tutor) throw new Error('Tutor not found');

  // Call Flutterwave API
  const flwResponse = await fetch('https://api.flutterwave.com/v3/transfers', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.FLUTTERWAVE_SECRET}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      account_bank: '044', // Example: Access Bank
      account_number: '1234567890', // Would come from tutor profile
      amount: payout.amount,
      narration: `KambiAcademy Teaching Earnings`,
      currency: 'NGN',
      reference: payout.id,
      meta: {
        tutor_id: payout.tutor_id,
        tutor_name: tutor.name,
        platform: 'kambiacademy'
      }
    })
  });

  const data: FlutterwaveResponse = await flwResponse.json();

  if (data.status !== 'success') {
    throw new Error(`Flutterwave error: ${data.message}`);
  }

  return data.data || {};
}

async function verifyFlutterwaveTransfer(env: Env, transferId: string): Promise<FlutterwaveResponse> {
  const response = await fetch(
    `https://api.flutterwave.com/v3/transfers/${transferId}`,
    {
      headers: {
        'Authorization': `Bearer ${env.FLUTTERWAVE_SECRET}`
      }
    }
  );

  return await response.json();
}

async function recordPayoutFailure(
  env: Env,
  payoutId: string,
  errorMessage: string,
  attemptNumber: number
) {
  const nextRetryTime = new Date();
  nextRetryTime.setHours(nextRetryTime.getHours() + 24);

  await env.DB.prepare(`
    INSERT INTO payout_failures (payout_id, error_message, attempt_number, next_retry, status)
    VALUES (?, ?, ?, ?, 'pending_retry')
  `).bind(payoutId, errorMessage, attemptNumber, nextRetryTime.toISOString()).run();

  await env.DB.prepare(`
    UPDATE payouts SET status = 'failed', last_error = ?, updated_at = datetime('now')
    WHERE id = ?
  `).bind(errorMessage, payoutId).run();
}

async function getPayoutSettings(env: Env) {
  return await env.DB.prepare(`
    SELECT * FROM payout_settings LIMIT 1
  `).first<any>();
}

async function updatePayoutSettings(env: Env, body: any) {
  const {
    min_payout_amount,
    max_payout_per_batch,
    batch_day_of_week,
    batch_time,
    max_retries,
    reconcile_delay_hours
  } = body;

  await env.DB.prepare(`
    UPDATE payout_settings SET 
      min_payout_amount = COALESCE(?, min_payout_amount),
      max_payout_per_batch = COALESCE(?, max_payout_per_batch),
      batch_day_of_week = COALESCE(?, batch_day_of_week),
      batch_time = COALESCE(?, batch_time),
      max_retries = COALESCE(?, max_retries),
      reconcile_delay_hours = COALESCE(?, reconcile_delay_hours),
      updated_at = datetime('now')
    WHERE id = 'settings'
  `).bind(
    min_payout_amount,
    max_payout_per_batch,
    batch_day_of_week,
    batch_time,
    max_retries,
    reconcile_delay_hours
  ).run();

  return Response.json({
    success: true,
    message: 'Payout settings updated'
  });
}

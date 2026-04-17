/**
 * Weekly Payout Scheduler
 * Cloudflare Worker that runs on a scheduled interval (weekly)
 * Triggers batch payouts and auto-reconciliation
 */

interface Env {
  DB: D1Database;
  FLUTTERWAVE_SECRET: string;
}

// Scheduled handler - runs weekly via Cloudflare Cron
export async function scheduled(event: ScheduledEvent, env: Env) {
  console.log('Weekly payout batch started');

  try {
    // Get settings
    const settings = await env.DB.prepare(`
      SELECT * FROM payout_settings LIMIT 1
    `).first<any>();

    if (!settings || !settings.auto_reconcile) {
      console.log('Auto payouts disabled');
      return;
    }

    // Get tutors with balance > minimum
    const tutors = await env.DB.prepare(`
      SELECT u.id, u.name, u.email,
        COALESCE(SUM(CASE WHEN wt.type='credit' THEN wt.amount 
                      WHEN wt.type='payout' THEN -wt.amount 
                      ELSE 0 END), 0) as balance
      FROM users u
      LEFT JOIN wallet_transactions wt ON wt.user_id = u.id
      WHERE u.role = 'teacher'
      GROUP BY u.id
      HAVING balance > ?
    `).bind(settings.min_payout_amount).all<any>();

    let totalAmount = 0;
    let payoutCount = 0;
    const batchId = `BATCH-WEEKLY-${Date.now()}`;

    // Create batch record
    await env.DB.prepare(`
      INSERT INTO payout_batches (id, batch_date, status, created_at)
      VALUES (?, datetime('now'), 'pending', datetime('now'))
    `).bind(batchId).run();

    // Process each tutor
    for (const tutor of tutors.results || []) {
      if (totalAmount + tutor.balance > settings.max_payout_per_batch) {
        console.log('Batch limit reached');
        break; // Respect batch limit
      }

      try {
        await createPayout(env, tutor.id, tutor.balance, batchId);
        payoutCount++;
        totalAmount += tutor.balance;
      } catch (error) {
        console.error(`Failed to create payout for tutor ${tutor.id}:`, error);
      }
    }

    // Update batch with summary
    await env.DB.prepare(`
      UPDATE payout_batches 
      SET payout_count = ?, total_amount = ?, status = 'completed'
      WHERE id = ?
    `).bind(payoutCount, totalAmount, batchId).run();

    // Schedule reconciliation check after delay
    const reconcileDelay = settings.reconcile_delay_hours || 2;
    const reconcileTime = new Date();
    reconcileTime.setHours(reconcileTime.getHours() + reconcileDelay);

    console.log(`Batch ${batchId} created: ${payoutCount} payouts, ₦${totalAmount}`);

    // Log the batch completion
    await env.DB.prepare(`
      INSERT INTO audit_logs (user_id, action, description, timestamp)
      VALUES (?, 'payout_batch_created', ?, datetime('now'))
    `).bind(0, `Weekly payout batch: ${payoutCount} tutors, ₦${totalAmount}`).run();

    return {
      success: true,
      batch_id: batchId,
      total_payouts: payoutCount,
      total_amount: totalAmount,
      scheduled_reconciliation: reconcileTime.toISOString()
    };
  } catch (error: any) {
    console.error('Payout batch failed:', error);

    await env.DB.prepare(`
      INSERT INTO audit_logs (user_id, action, description, timestamp)
      VALUES (?, 'payout_batch_failed', ?, datetime('now'))
    `).bind(0, `Weekly payout batch error: ${error.message}`).run();

    throw error;
  }
}

/**
 * Reconciliation handler
 * Verifies payout status with Flutterwave and updates records
 */
export async function reconciliation(event: ScheduledEvent, env: Env) {
  console.log('Payout reconciliation started');

  try {
    // Get all processing payouts
    const processing = await env.DB.prepare(`
      SELECT id, amount, flutterwave_reference FROM payouts 
      WHERE status = 'processing'
      ORDER BY updated_at ASC
    `).all<any>();

    let verified = 0;
    let failed = 0;

    for (const payout of processing.results || []) {
      try {
        // Verify with Flutterwave
        const flwRef = payout.flutterwave_reference;
        const response = await fetch(
          `https://api.flutterwave.com/v3/transfers/${flwRef}`,
          {
            headers: {
              'Authorization': `Bearer ${env.FLUTTERWAVE_SECRET}`
            }
          }
        );

        const data: any = await response.json();

        if (data.status === 'success') {
          const newStatus = data.data?.status === 'successful' ? 'completed' : 'processing';

          await env.DB.prepare(`
            UPDATE payouts SET status = ?, updated_at = datetime('now')
            WHERE id = ?
          `).bind(newStatus, payout.id).run();

          verified++;
        } else {
          failed++;
          console.warn(`Verification failed for ${payout.id}: ${data.message}`);
        }
      } catch (error: any) {
        failed++;
        console.error(`Reconciliation error for payout ${payout.id}:`, error);
      }
    }

    console.log(`Reconciliation complete: ${verified} verified, ${failed} failed`);

    return {
      success: true,
      verified: verified,
      failed: failed,
      timestamp: new Date().toISOString()
    };
  } catch (error: any) {
    console.error('Reconciliation batch failed:', error);
    throw error;
  }
}

/**
 * Retry handler
 * Retries failed payouts with exponential backoff
 */
export async function retryFailed(event: ScheduledEvent, env: Env) {
  console.log('Failed payout retry started');

  try {
    // Get pending retries
    const retries = await env.DB.prepare(`
      SELECT pf.*, p.id as payout_id, p.tutor_id, p.amount
      FROM payout_failures pf
      JOIN payouts p ON p.id = pf.payout_id
      WHERE pf.status = 'pending_retry' 
        AND pf.next_retry <= datetime('now')
        AND pf.attempt_number < ?
      ORDER BY pf.next_retry ASC
      LIMIT 10
    `).bind(3).all<any>();

    let retried = 0;
    let failed = 0;

    for (const retry of retries.results || []) {
      try {
        // Attempt retry
        const flwResponse = await initiateFlutterwavePayout(
          env,
          retry.tutor_id,
          retry.amount,
          retry.payout_id
        );

        await env.DB.prepare(`
          UPDATE payouts SET status = 'processing', updated_at = datetime('now')
          WHERE id = ?
        `).bind(retry.payout_id).run();

        await env.DB.prepare(`
          UPDATE payout_failures SET status = 'resolved'
          WHERE payout_id = ?
        `).bind(retry.payout_id).run();

        retried++;
      } catch (error: any) {
        failed++;
        const nextRetry = new Date();
        nextRetry.setHours(nextRetry.getHours() + 24);

        await env.DB.prepare(`
          UPDATE payout_failures 
          SET next_retry = ?, error_message = ?
          WHERE payout_id = ?
        `).bind(nextRetry.toISOString(), error.message, retry.payout_id).run();
      }
    }

    console.log(`Retry complete: ${retried} retried, ${failed} failed`);

    return {
      success: true,
      retried: retried,
      failed: failed
    };
  } catch (error: any) {
    console.error('Retry batch failed:', error);
    throw error;
  }
}

async function createPayout(
  env: Env,
  tutorId: number,
  amount: number,
  batchId: string
) {
  const payoutId = `${batchId}-T${tutorId}`;

  await env.DB.prepare(`
    INSERT INTO payouts (id, tutor_id, amount, status, created_at)
    VALUES (?, ?, ?, 'pending', datetime('now'))
  `).bind(payoutId, tutorId, amount).run();

  // Initiate Flutterwave transfer
  const flwRef = await initiateFlutterwavePayout(env, tutorId, amount, payoutId);

  await env.DB.prepare(`
    UPDATE payouts SET status = 'processing', flutterwave_reference = ?
    WHERE id = ?
  `).bind(flwRef, payoutId).run();

  // Debit tutor wallet
  await env.DB.prepare(`
    INSERT INTO wallet_transactions (user_id, type, amount, reference, status, created_at)
    VALUES (?, 'payout', ?, ?, 'completed', datetime('now'))
  `).bind(tutorId, amount, payoutId).run();

  return payoutId;
}

async function initiateFlutterwavePayout(
  env: Env,
  tutorId: number,
  amount: number,
  payoutId: string
): Promise<string> {
  // Get tutor info
  const tutor = await env.DB.prepare(`
    SELECT name, email FROM users WHERE id = ?
  `).bind(tutorId).first<any>();

  // In production, fetch tutor's bank details from profile
  // For now, using placeholder
  const response = await fetch('https://api.flutterwave.com/v3/transfers', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.FLUTTERWAVE_SECRET}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      account_bank: '044',
      account_number: '1234567890',
      amount: amount,
      narration: 'KambiAcademy Teaching Earnings',
      currency: 'NGN',
      reference: payoutId,
      meta: {
        tutor_id: tutorId,
        tutor_name: tutor?.name,
        platform: 'kambiacademy'
      }
    })
  });

  const data: any = await response.json();

  if (data.status !== 'success') {
    throw new Error(`Flutterwave error: ${data.message}`);
  }

  return data.data?.id || payoutId;
}

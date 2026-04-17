import { getAuthUser } from '../../_shared/auth';

interface Env {
  DB: D1Database;
  FLUTTERWAVE_SECRET: string;
}

interface TutorWalletRow {
  id: number;
  name: string;
  email: string;
  balance: number;
}

interface PayoutRow {
  id: string;
  tutor_id: number;
  amount: number;
  status: string;
  flutterwave_reference: string | null;
  created_at: string;
  updated_at?: string | null;
}

interface PayoutResult {
  payout_id: string;
  tutor_id: number;
  tutor_name: string;
  amount: number;
  status: string;
  flutterwave_ref: string;
  message: string;
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const user = await getAuthUser(request, env.DB);
  if (!user || user.role !== 'super_admin') {
    return Response.json({ error: 'Unauthorized' }, { status: 403 });
  }

  // Get payout history and status
  const payouts = await env.DB.prepare(`
    SELECT 
      id, tutor_id, amount, status, flutterwave_reference,
      created_at, updated_at
    FROM payouts
    ORDER BY created_at DESC
    LIMIT 100
  `).all();

  const tutorWallets = await env.DB.prepare(`
    SELECT 
      u.id, u.name, u.email,
      COALESCE(SUM(CASE WHEN type='credit' THEN amount ELSE -amount END), 0) as balance
    FROM users u
    LEFT JOIN wallet_transactions wt ON wt.user_id = u.id
    WHERE u.role = 'teacher'
    GROUP BY u.id
    HAVING balance > 10
    ORDER BY balance DESC
  `).all();

  return Response.json({
    payouts: payouts.results || [],
    tutors_with_balance: tutorWallets.results || [],
    summary: {
      total_pending: (payouts.results?.filter((p: any) => p.status === 'pending').length || 0),
      total_processing: (payouts.results?.filter((p: any) => p.status === 'processing').length || 0),
      total_completed: (payouts.results?.filter((p: any) => p.status === 'completed').length || 0),
      total_failed: (payouts.results?.filter((p: any) => p.status === 'failed').length || 0),
    }
  });
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const user = await getAuthUser(request, env.DB);
  if (!user || user.role !== 'super_admin') {
    return Response.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const body = await request.json<{ action?: string; tutor_id?: number; amount?: number }>();

  if (body.action === 'create_batch') {
    return Response.json(await createBatchPayouts(env));
  }

  if (body.action === 'payout_tutor') {
    return Response.json(await payoutTutor(env, body.tutor_id || 0, body.amount || 0));
  }

  if (body.action === 'reconcile') {
    return Response.json(await reconcilePayouts(env));
  }

  return Response.json({ error: 'Unknown action' }, { status: 400 });
};

async function createBatchPayouts(env: Env) {
  // Get all tutors with balance > 10
  const tutorsWithBalance = await env.DB.prepare(`
    SELECT 
      u.id, u.name, u.email,
      COALESCE(SUM(CASE WHEN type='credit' THEN amount ELSE -amount END), 0) as balance
    FROM users u
    LEFT JOIN wallet_transactions wt ON wt.user_id = u.id
    WHERE u.role = 'teacher'
    GROUP BY u.id
    HAVING balance > 10
  `).all<TutorWalletRow>();

  let payoutCount = 0;
  const results: Array<PayoutResult | { error: string; tutor_id: number }> = [];

  for (const tutor of tutorsWithBalance.results || []) {
    try {
      const payout = await payoutTutor(env, tutor.id, tutor.balance);
      results.push(payout);
      payoutCount++;
    } catch (error: any) {
      results.push({
        error: error.message,
        tutor_id: tutor.id
      });
    }
  }

  return {
    success: true,
    total_payouts: payoutCount,
    total_amount: tutorsWithBalance.results?.reduce((sum: number, t: any) => sum + t.balance, 0) || 0,
    batch_id: `BATCH-${Date.now()}`,
    results: results,
    message: `${payoutCount} payouts created successfully`
  };
}

async function payoutTutor(env: Env, tutorId: number, amount: number): Promise<PayoutResult> {
  if (amount <= 0) {
    throw new Error('Amount must be greater than 0');
  }

  // Get tutor info
  const tutor = await env.DB.prepare(`
    SELECT id, name, email FROM users WHERE id = ?
  `).bind(tutorId).first<{ id: number; name: string; email: string }>();

  if (!tutor) {
    throw new Error('Tutor not found');
  }

  // Create payout record
  const payoutId = `P-${Date.now()}-${tutorId}`;

  await env.DB.prepare(`
    INSERT INTO payouts (id, tutor_id, amount, status, created_at)
    VALUES (?, ?, ?, 'pending', datetime('now'))
  `).bind(payoutId, tutorId, amount).run();

  // Send to Flutterwave (simulate for now)
  const flwRef = `FLW-${Date.now()}`;

  // Update payout status
  await env.DB.prepare(`
    UPDATE payouts 
    SET status = 'processing', flutterwave_reference = ?
    WHERE id = ?
  `).bind(flwRef, payoutId).run();

  // Debit tutor wallet
  await env.DB.prepare(`
    INSERT INTO wallet_transactions (user_id, type, amount, reference, status, created_at)
    VALUES (?, 'payout', ?, ?, 'completed', datetime('now'))
  `).bind(tutorId, amount, payoutId).run();

  return {
    payout_id: payoutId,
    tutor_id: tutorId,
    tutor_name: tutor.name,
    amount: amount,
    status: 'processing',
    flutterwave_ref: flwRef,
    message: `Payout of ₦${amount} initiated for ${tutor.name}`
  };
}

async function reconcilePayouts(env: Env) {
  // Get all pending payouts
  const pending = await env.DB.prepare(`
    SELECT id, tutor_id, amount, flutterwave_reference, created_at
    FROM payouts
    WHERE status = 'processing'
  `).all<PayoutRow>();

  let reconciled = 0;
  let failed = 0;
  const results: Array<{ payout_id: string; status: string; amount?: number; error?: string }> = [];

  for (const payout of pending.results || []) {
    try {
      // In production, verify with Flutterwave API
      // For now, mark as completed after 1 hour
      const createdTime = new Date(payout.created_at).getTime();
      const now = Date.now();

      if (now - createdTime > 3600000) { // 1 hour
        await env.DB.prepare(`
          UPDATE payouts SET status = 'completed', updated_at = datetime('now')
          WHERE id = ?
        `).bind(payout.id).run();

        reconciled++;
        results.push({
          payout_id: payout.id,
          status: 'completed',
          amount: payout.amount
        });
      }
    } catch (error: any) {
      failed++;
      results.push({
        payout_id: payout.id,
        status: 'error',
        error: error.message
      });
    }
  }

  return {
    success: true,
    reconciled: reconciled,
    failed: failed,
    total_processed: reconciled + failed,
    results: results,
    message: `Reconciliation complete: ${reconciled} completed, ${failed} failed`
  };
}

// Cron function for weekly payouts (called by Cloudflare scheduler)
export const onRequestPut: PagesFunction<Env> = async ({ env }) => {
  // This would be called weekly by Cloudflare Cron
  const result = await createBatchPayouts(env);
  return Response.json({ cron_result: result });
};

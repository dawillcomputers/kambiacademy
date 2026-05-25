import { getAuthUser } from '../../_shared/auth';
import { getTeacherPayoutEligibility, getTeacherPayoutSettings, getLatestTeacherVerificationDocuments, maskAccountNumber } from '../../_shared/payouts';

interface Env {
  DB: D1Database;
}

const isSuperAdminConsoleUser = (role?: string) => role === 'super_admin' || role === 'SOU';

async function buildVerificationQueue(db: D1Database) {
  const teachers = await db.prepare(`
    SELECT u.id, u.name, u.email,
           COALESCE(te.total_earned, 0) as total_earned,
           COALESCE(te.available_balance, 0) as available_balance,
           COALESCE(te.total_withdrawn, 0) as total_withdrawn
    FROM users u
    LEFT JOIN teacher_earnings te ON te.teacher_id = u.id
    WHERE u.role IN ('teacher', 'tutor')
    ORDER BY COALESCE(te.available_balance, 0) DESC, u.name ASC
  `).all<{
    id: number;
    name: string;
    email: string;
    total_earned: number;
    available_balance: number;
    total_withdrawn: number;
  }>();

  const queue = [] as any[];
  for (const teacher of teachers.results || []) {
    const settings = await getTeacherPayoutSettings(db, teacher.id);
    const documents = await getLatestTeacherVerificationDocuments(db, teacher.id);
    const eligibility = await getTeacherPayoutEligibility(db, teacher.id);

    if (!settings && !documents.all.length && Number(teacher.available_balance || 0) <= 0) {
      continue;
    }

    queue.push({
      teacher_id: teacher.id,
      name: teacher.name,
      email: teacher.email,
      total_earned: teacher.total_earned,
      available_balance: teacher.available_balance,
      total_withdrawn: teacher.total_withdrawn,
      account_name: settings?.account_name || '',
      bank_name: settings?.bank_name || '',
      bank_code: settings?.bank_code || '',
      account_number_masked: maskAccountNumber(settings?.account_number),
      payout_currency: settings?.payout_currency || 'NGN',
      verification_status: settings?.verification_status || 'missing',
      transfer_enabled: Boolean(settings?.transfer_enabled ?? 0),
      review_notes: settings?.review_notes || '',
      reviewed_at: settings?.reviewed_at || null,
      updated_at: settings?.updated_at || null,
      blocking_reasons: eligibility.blockingReasons,
      ready_for_approval: Boolean(settings && documents.identity && documents.address),
      documents: documents.all.map((document) => ({
        id: document.id,
        document_type: document.document_type,
        document_label: document.document_label,
        file_name: document.file_name,
        review_status: document.review_status,
        rejection_reason: document.rejection_reason,
        uploaded_at: document.uploaded_at,
        reviewed_at: document.reviewed_at,
      })),
    });
  }

  queue.sort((left, right) => {
    const leftPending = left.verification_status !== 'approved' ? 1 : 0;
    const rightPending = right.verification_status !== 'approved' ? 1 : 0;
    if (leftPending !== rightPending) {
      return rightPending - leftPending;
    }

    return Number(right.available_balance || 0) - Number(left.available_balance || 0);
  });

  return queue;
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const admin = await getAuthUser(request, env.DB);
  if (!admin || !isSuperAdminConsoleUser(admin.role)) {
    return Response.json({ error: 'Unauthorized' }, { status: 403 });
  }

  return Response.json({ requests: await buildVerificationQueue(env.DB) });
};

export const onRequestPatch: PagesFunction<Env> = async ({ request, env }) => {
  const admin = await getAuthUser(request, env.DB);
  if (!admin || !isSuperAdminConsoleUser(admin.role)) {
    return Response.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const body = await request.json<{
    teacherId?: number;
    action?: 'approve' | 'reject';
    notes?: string;
  }>();

  if (!body.teacherId || !body.action) {
    return Response.json({ error: 'teacherId and action are required.' }, { status: 400 });
  }

  const settings = await getTeacherPayoutSettings(env.DB, body.teacherId);
  const documents = await getLatestTeacherVerificationDocuments(env.DB, body.teacherId);

  if (!settings) {
    return Response.json({ error: 'Payout settings not found for teacher.' }, { status: 404 });
  }

  if (!documents.identity || !documents.address) {
    return Response.json({ error: 'Both identity and address verification documents are required.' }, { status: 400 });
  }

  const now = new Date().toISOString();
  const reviewNotes = String(body.notes || '').trim() || null;
  const nextStatus = body.action === 'approve' ? 'approved' : 'rejected';
  const transferEnabled = body.action === 'approve' ? 1 : 0;

  await env.DB.prepare(`
    UPDATE teacher_payout_settings
    SET verification_status = ?,
        manual_review_required = ?,
        transfer_enabled = ?,
        review_notes = ?,
        reviewed_by = ?,
        reviewed_at = ?,
        updated_at = ?
    WHERE teacher_id = ?
  `).bind(
    nextStatus,
    body.action === 'approve' ? 0 : 1,
    transferEnabled,
    reviewNotes,
    admin.id,
    now,
    now,
    body.teacherId,
  ).run();

  const documentIds = [documents.identity.id, documents.address.id];
  for (const documentId of documentIds) {
    await env.DB.prepare(`
      UPDATE teacher_verification_documents
      SET review_status = ?, rejection_reason = ?, reviewed_at = ?, reviewed_by = ?
      WHERE id = ?
    `).bind(
      nextStatus,
      body.action === 'reject' ? reviewNotes : null,
      now,
      admin.id,
      documentId,
    ).run();
  }

  return Response.json({
    message: body.action === 'approve'
      ? 'Teacher payout setup approved. Automatic payouts can now run.'
      : 'Teacher payout setup rejected. The teacher must update the submitted details.',
    requests: await buildVerificationQueue(env.DB),
  });
};
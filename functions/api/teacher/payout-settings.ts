import {
  ALLOWED_PAYOUT_DOCUMENT_MIME,
  MAX_PAYOUT_DOCUMENT_SIZE,
  getLatestTeacherVerificationDocuments,
  getTeacherPayoutEligibility,
  getTeacherPayoutSettings,
  maskAccountNumber,
} from '../../_shared/payouts';
import { getAuthUser } from '../../_shared/auth';

interface Env {
  DB: D1Database;
  BUCKET: R2Bucket;
}

const isTeacherUser = (role?: string) => role === 'teacher' || role === 'tutor';

const sanitizeFileName = (value: string) => value.replace(/[^a-zA-Z0-9._-]+/g, '-');

async function buildTeacherPayoutResponse(db: D1Database, teacherId: number) {
  const settings = await getTeacherPayoutSettings(db, teacherId);
  const eligibility = await getTeacherPayoutEligibility(db, teacherId);
  const documents = await getLatestTeacherVerificationDocuments(db, teacherId);

  return {
    settings: {
      account_name: settings?.account_name || '',
      bank_name: settings?.bank_name || '',
      bank_code: settings?.bank_code || '',
      account_number: settings?.account_number || '',
      account_number_masked: maskAccountNumber(settings?.account_number),
      payout_currency: settings?.payout_currency || 'NGN',
      verification_status: settings?.verification_status || 'missing',
      manual_review_required: Boolean(settings?.manual_review_required ?? 1),
      transfer_enabled: Boolean(settings?.transfer_enabled ?? 0),
      review_notes: settings?.review_notes || '',
      reviewed_at: settings?.reviewed_at || null,
      updated_at: settings?.updated_at || null,
    },
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
    payout_ready: eligibility.eligible,
    blocking_reasons: eligibility.blockingReasons,
  };
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const user = await getAuthUser(request, env.DB);
  if (!user || !isTeacherUser(user.role)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return Response.json(await buildTeacherPayoutResponse(env.DB, user.id));
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const user = await getAuthUser(request, env.DB);
  if (!user || !isTeacherUser(user.role)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const contentType = request.headers.get('Content-Type') || '';
  const existing = await getTeacherPayoutSettings(env.DB, user.id);

  let accountName = existing?.account_name || user.name || '';
  let bankName = existing?.bank_name || '';
  let bankCode = existing?.bank_code || '';
  let accountNumber = existing?.account_number || '';
  let payoutCurrency = existing?.payout_currency || 'NGN';
  let identityDocument: File | null = null;
  let addressDocument: File | null = null;

  if (contentType.includes('multipart/form-data')) {
    const formData = await request.formData();
    accountName = String(formData.get('account_name') || accountName).trim();
    bankName = String(formData.get('bank_name') || bankName).trim();
    bankCode = String(formData.get('bank_code') || bankCode).trim();
    accountNumber = String(formData.get('account_number') || accountNumber).trim();
    payoutCurrency = String(formData.get('payout_currency') || payoutCurrency).trim() || 'NGN';
    identityDocument = formData.get('identity_document') as File | null;
    addressDocument = formData.get('address_document') as File | null;
  } else {
    const body = await request.json<{
      account_name?: string;
      bank_name?: string;
      bank_code?: string;
      account_number?: string;
      payout_currency?: string;
    }>();
    accountName = String(body.account_name || accountName).trim();
    bankName = String(body.bank_name || bankName).trim();
    bankCode = String(body.bank_code || bankCode).trim();
    accountNumber = String(body.account_number || accountNumber).trim();
    payoutCurrency = String(body.payout_currency || payoutCurrency).trim() || 'NGN';
  }

  if (!accountName || !bankName || !bankCode || !accountNumber) {
    return Response.json({ error: 'Account name, bank name, bank code, and account number are required.' }, { status: 400 });
  }

  if (!/^\d{8,20}$/.test(accountNumber.replace(/\s+/g, ''))) {
    return Response.json({ error: 'Account number must contain 8 to 20 digits.' }, { status: 400 });
  }

  const files = [
    { type: 'identity', file: identityDocument },
    { type: 'address', file: addressDocument },
  ] as const;

  for (const entry of files) {
    const file = entry.file;
    if (!file || file.size === 0) {
      continue;
    }
    if (file.size > MAX_PAYOUT_DOCUMENT_SIZE) {
      return Response.json({ error: `${entry.type} document must be 10MB or smaller.` }, { status: 400 });
    }
    if (!ALLOWED_PAYOUT_DOCUMENT_MIME.has(file.type)) {
      return Response.json({ error: `${entry.type} document type ${file.type} is not supported.` }, { status: 400 });
    }
  }

  const bankDetailsChanged =
    (existing?.account_name || '') !== accountName
    || (existing?.bank_name || '') !== bankName
    || (existing?.bank_code || '') !== bankCode
    || (existing?.account_number || '') !== accountNumber
    || (existing?.payout_currency || 'NGN') !== payoutCurrency;
  const hasNewDocuments = files.some((entry) => entry.file && entry.file.size > 0);
  const requiresFreshReview = bankDetailsChanged || hasNewDocuments;
  const nextVerificationStatus = requiresFreshReview ? 'pending_review' : (existing?.verification_status || 'missing');
  const nextManualReviewRequired = requiresFreshReview ? 1 : Number(existing?.manual_review_required ?? 1);
  const nextTransferEnabled = requiresFreshReview ? 0 : Number(existing?.transfer_enabled ?? 0);
  const nextReviewNotes = requiresFreshReview ? null : (existing?.review_notes ?? null);
  const nextReviewedBy = requiresFreshReview ? null : (existing?.reviewed_by ?? null);
  const nextReviewedAt = requiresFreshReview ? null : (existing?.reviewed_at ?? null);

  await env.DB.prepare(`
    INSERT INTO teacher_payout_settings (
      teacher_id, account_name, bank_name, bank_code, account_number, payout_currency,
      verification_status, manual_review_required, transfer_enabled, review_notes, reviewed_by, reviewed_at, created_at, updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, COALESCE((SELECT created_at FROM teacher_payout_settings WHERE teacher_id = ?), datetime('now')), datetime('now'))
    ON CONFLICT(teacher_id) DO UPDATE SET
      account_name = excluded.account_name,
      bank_name = excluded.bank_name,
      bank_code = excluded.bank_code,
      account_number = excluded.account_number,
      payout_currency = excluded.payout_currency,
      verification_status = excluded.verification_status,
      manual_review_required = excluded.manual_review_required,
      transfer_enabled = excluded.transfer_enabled,
      review_notes = excluded.review_notes,
      reviewed_by = excluded.reviewed_by,
      reviewed_at = excluded.reviewed_at,
      updated_at = datetime('now')
  `).bind(
    user.id,
    accountName,
    bankName,
    bankCode,
    accountNumber.replace(/\s+/g, ''),
    payoutCurrency.toUpperCase(),
    nextVerificationStatus,
    nextManualReviewRequired,
    nextTransferEnabled,
    nextReviewNotes,
    nextReviewedBy,
    nextReviewedAt,
    user.id,
  ).run();

  for (const entry of files) {
    const file = entry.file;
    if (!file || file.size === 0) {
      continue;
    }

    const fileKey = `payout-verification/${user.id}/${entry.type}/${Date.now()}-${sanitizeFileName(file.name)}`;
    await env.BUCKET.put(fileKey, file.stream(), {
      httpMetadata: {
        contentType: file.type,
      },
    });

    await env.DB.prepare(`
      INSERT INTO teacher_verification_documents (
        teacher_id, document_type, document_label, file_name, file_key, mime_type, file_size, review_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending_review')
    `).bind(
      user.id,
      entry.type,
      entry.type === 'identity' ? 'Identity verification' : 'Address verification',
      file.name,
      fileKey,
      file.type,
      file.size,
    ).run();
  }

  return Response.json({
    message: requiresFreshReview
      ? 'Payout settings saved. Manual review is required before automatic payouts are enabled.'
      : 'Payout settings are already up to date.',
    ...(await buildTeacherPayoutResponse(env.DB, user.id)),
  });
};
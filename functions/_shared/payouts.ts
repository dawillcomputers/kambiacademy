export type PayoutDocumentType = 'identity' | 'address';

export interface TeacherPayoutSettingsRow {
  teacher_id: number;
  account_name: string | null;
  bank_name: string | null;
  bank_code: string | null;
  account_number: string | null;
  payout_currency: string | null;
  verification_status: string | null;
  manual_review_required: number | null;
  transfer_enabled: number | null;
  review_notes: string | null;
  reviewed_by: number | null;
  reviewed_at: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface TeacherVerificationDocumentRow {
  id: number;
  teacher_id: number;
  document_type: PayoutDocumentType;
  document_label: string | null;
  file_name: string;
  file_key: string;
  mime_type: string | null;
  file_size: number | null;
  review_status: string;
  rejection_reason: string | null;
  uploaded_at: string;
  reviewed_at: string | null;
  reviewed_by: number | null;
}

export interface PayoutSecretEnv {
  FLUTTERWAVE_TEACHER_SECRET_KEY?: string;
  FLUTTERWAVE_SECRET_KEY?: string;
  FLUTTERWAVE_SECRET?: string;
}

export const ALLOWED_PAYOUT_DOCUMENT_MIME = new Set([
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/webp',
]);

export const MAX_PAYOUT_DOCUMENT_SIZE = 10 * 1024 * 1024;

const DOCUMENT_TYPE_LABELS: Record<PayoutDocumentType, string> = {
  identity: 'Identity verification',
  address: 'Address verification',
};

export function getPayoutFlutterwaveSecret(env: PayoutSecretEnv) {
  return env.FLUTTERWAVE_TEACHER_SECRET_KEY || env.FLUTTERWAVE_SECRET_KEY || env.FLUTTERWAVE_SECRET;
}

export function maskAccountNumber(accountNumber?: string | null) {
  const clean = String(accountNumber || '').trim();
  if (!clean) {
    return '';
  }

  if (clean.length <= 4) {
    return clean;
  }

  return `${'*'.repeat(Math.max(0, clean.length - 4))}${clean.slice(-4)}`;
}

export async function getTeacherPayoutSettings(db: D1Database, teacherId: number) {
  try {
    return await db.prepare(`
      SELECT teacher_id, account_name, bank_name, bank_code, account_number, payout_currency,
             verification_status, manual_review_required, transfer_enabled, review_notes,
             reviewed_by, reviewed_at, created_at, updated_at
      FROM teacher_payout_settings
      WHERE teacher_id = ?
    `).bind(teacherId).first<TeacherPayoutSettingsRow>();
  } catch {
    return null;
  }
}

export async function getLatestTeacherVerificationDocuments(db: D1Database, teacherId: number) {
  try {
    const result = await db.prepare(`
      SELECT id, teacher_id, document_type, document_label, file_name, file_key, mime_type, file_size,
             review_status, rejection_reason, uploaded_at, reviewed_at, reviewed_by
      FROM teacher_verification_documents
      WHERE teacher_id = ?
      ORDER BY uploaded_at DESC, id DESC
    `).bind(teacherId).all<TeacherVerificationDocumentRow>();

    const all = result.results || [];
    const latest = new Map<PayoutDocumentType, TeacherVerificationDocumentRow>();
    for (const row of all) {
      if (!latest.has(row.document_type)) {
        latest.set(row.document_type, row);
      }
    }

    return {
      identity: latest.get('identity') ?? null,
      address: latest.get('address') ?? null,
      all,
    };
  } catch {
    return {
      identity: null,
      address: null,
      all: [] as TeacherVerificationDocumentRow[],
    };
  }
}

function describeDocumentBlock(type: PayoutDocumentType, reviewStatus?: string | null, rejectionReason?: string | null) {
  const label = DOCUMENT_TYPE_LABELS[type];
  if (!reviewStatus) {
    return `${label} document is missing.`;
  }

  if (reviewStatus === 'approved') {
    return '';
  }

  if (reviewStatus === 'rejected') {
    return rejectionReason
      ? `${label} was rejected: ${rejectionReason}`
      : `${label} was rejected and must be re-uploaded.`;
  }

  return `${label} is awaiting manual review.`;
}

export async function getTeacherPayoutEligibility(db: D1Database, teacherId: number) {
  const settings = await getTeacherPayoutSettings(db, teacherId);
  const documents = await getLatestTeacherVerificationDocuments(db, teacherId);
  const blockingReasons: string[] = [];

  if (!settings) {
    blockingReasons.push('Bank payout settings have not been submitted.');
  } else {
    if (!settings.account_name?.trim()) {
      blockingReasons.push('Account name is missing.');
    }
    if (!settings.bank_name?.trim()) {
      blockingReasons.push('Bank name is missing.');
    }
    if (!settings.bank_code?.trim()) {
      blockingReasons.push('Bank code is missing.');
    }
    if (!settings.account_number?.trim()) {
      blockingReasons.push('Account number is missing.');
    }
    if (settings.verification_status !== 'approved') {
      if (settings.verification_status === 'rejected' && settings.review_notes) {
        blockingReasons.push(`Manual review rejected payout setup: ${settings.review_notes}`);
      } else {
        blockingReasons.push('Manual payout review is still pending.');
      }
    }
    if (!settings.transfer_enabled) {
      blockingReasons.push('Automatic payouts are disabled until review is approved.');
    }
  }

  const identityBlock = describeDocumentBlock('identity', documents.identity?.review_status, documents.identity?.rejection_reason);
  if (identityBlock) {
    blockingReasons.push(identityBlock);
  }

  const addressBlock = describeDocumentBlock('address', documents.address?.review_status, documents.address?.rejection_reason);
  if (addressBlock) {
    blockingReasons.push(addressBlock);
  }

  return {
    eligible: blockingReasons.length === 0,
    blockingReasons,
    settings,
    documents,
  };
}

export async function initiateFlutterwaveTransfer(options: {
  secret: string;
  payoutId: string;
  amount: number;
  destination: TeacherPayoutSettingsRow;
  teacher: { id: number; name: string; email: string };
}) {
  const { secret, payoutId, amount, destination, teacher } = options;
  const response = await fetch('https://api.flutterwave.com/v3/transfers', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${secret}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      account_bank: destination.bank_code,
      account_number: destination.account_number,
      amount,
      narration: `Kambi Academy teacher earnings for ${teacher.name}`,
      currency: destination.payout_currency || 'NGN',
      reference: payoutId,
      beneficiary_name: destination.account_name || teacher.name,
      meta: {
        teacher_id: teacher.id,
        teacher_email: teacher.email,
        teacher_name: teacher.name,
        payout_origin: 'kambiacademy',
      },
    }),
  });

  const payload = await response.json().catch(() => null) as any;
  if (!response.ok || payload?.status !== 'success') {
    throw new Error(payload?.message || 'Flutterwave payout request failed');
  }

  return payload?.data ?? null;
}
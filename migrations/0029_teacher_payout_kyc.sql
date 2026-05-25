-- Migration: 0029_teacher_payout_kyc
-- Stores teacher bank payout settings and payout verification documents.

CREATE TABLE IF NOT EXISTS teacher_payout_settings (
  teacher_id INTEGER PRIMARY KEY,
  account_name TEXT,
  bank_name TEXT,
  bank_code TEXT,
  account_number TEXT,
  payout_currency TEXT NOT NULL DEFAULT 'NGN',
  verification_status TEXT NOT NULL DEFAULT 'missing',
  manual_review_required INTEGER NOT NULL DEFAULT 1,
  transfer_enabled INTEGER NOT NULL DEFAULT 0,
  review_notes TEXT,
  reviewed_by INTEGER,
  reviewed_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS teacher_verification_documents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  teacher_id INTEGER NOT NULL,
  document_type TEXT NOT NULL,
  document_label TEXT,
  file_name TEXT NOT NULL,
  file_key TEXT NOT NULL,
  mime_type TEXT,
  file_size INTEGER,
  review_status TEXT NOT NULL DEFAULT 'pending_review',
  rejection_reason TEXT,
  uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  reviewed_at DATETIME,
  reviewed_by INTEGER,
  FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_teacher_payout_settings_status ON teacher_payout_settings(verification_status, transfer_enabled);
CREATE INDEX IF NOT EXISTS idx_teacher_verification_documents_teacher ON teacher_verification_documents(teacher_id, document_type, uploaded_at DESC);
CREATE INDEX IF NOT EXISTS idx_teacher_verification_documents_status ON teacher_verification_documents(review_status, uploaded_at DESC);
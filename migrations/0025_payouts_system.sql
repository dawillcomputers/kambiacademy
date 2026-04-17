-- Create Payouts System for Flutterwave Integration

CREATE TABLE IF NOT EXISTS payouts (
  id TEXT PRIMARY KEY,
  tutor_id INTEGER NOT NULL,
  amount REAL NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, processing, completed, failed, refunded
  flutterwave_reference TEXT,
  flutterwave_meta TEXT, -- JSON metadata from API
  retry_count INTEGER DEFAULT 0,
  last_error TEXT,
  scheduled_date DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tutor_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_payouts_tutor ON payouts(tutor_id);
CREATE INDEX IF NOT EXISTS idx_payouts_status ON payouts(status);
CREATE INDEX IF NOT EXISTS idx_payouts_created ON payouts(created_at DESC);

-- Track payout batches for reconciliation
CREATE TABLE IF NOT EXISTS payout_batches (
  id TEXT PRIMARY KEY,
  batch_date DATETIME NOT NULL,
  payout_count INTEGER DEFAULT 0,
  total_amount REAL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, completed, reconciled, failed
  flutterwave_batch_ref TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_batches_status ON payout_batches(status);
CREATE INDEX IF NOT EXISTS idx_batches_date ON payout_batches(batch_date DESC);

-- Track reconciliation history
CREATE TABLE IF NOT EXISTS payout_reconciliations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  batch_id TEXT,
  payout_id TEXT,
  reconciled_amount REAL,
  reconciled_status TEXT, -- from Flutterwave verification
  reconciled_date DATETIME DEFAULT CURRENT_TIMESTAMP,
  notes TEXT,
  FOREIGN KEY (batch_id) REFERENCES payout_batches(id),
  FOREIGN KEY (payout_id) REFERENCES payouts(id)
);

CREATE INDEX IF NOT EXISTS idx_reconciliation_payout ON payout_reconciliations(payout_id);
CREATE INDEX IF NOT EXISTS idx_reconciliation_date ON payout_reconciliations(reconciled_date DESC);

-- Payout failures and retries log
CREATE TABLE IF NOT EXISTS payout_failures (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  payout_id TEXT NOT NULL,
  error_code TEXT,
  error_message TEXT,
  attempt_number INTEGER DEFAULT 1,
  next_retry DATETIME,
  status TEXT DEFAULT 'pending_retry', -- pending_retry, max_retries_exceeded, resolved
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (payout_id) REFERENCES payouts(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_failures_payout ON payout_failures(payout_id);
CREATE INDEX IF NOT EXISTS idx_failures_status ON payout_failures(status);
CREATE INDEX IF NOT EXISTS idx_failures_date ON payout_failures(created_at DESC);

-- Add payout configuration/settings
CREATE TABLE IF NOT EXISTS payout_settings (
  id TEXT PRIMARY KEY DEFAULT 'settings',
  min_payout_amount REAL DEFAULT 100,
  max_payout_per_batch REAL DEFAULT 500000,
  batch_day_of_week INTEGER DEFAULT 1, -- 0=Sunday, 1=Monday, etc
  batch_time TEXT DEFAULT '02:00:00',
  auto_reconcile BOOLEAN DEFAULT 1,
  reconcile_delay_hours INTEGER DEFAULT 2,
  max_retries INTEGER DEFAULT 3,
  retry_interval_hours INTEGER DEFAULT 24,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO payout_settings VALUES ('settings', 100, 500000, 1, '02:00:00', 1, 2, 3, 24, CURRENT_TIMESTAMP);

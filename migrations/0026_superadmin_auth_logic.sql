-- Keep the migration replay-safe by only touching the schema that can be
-- created or updated idempotently in drifted environments.

CREATE TABLE IF NOT EXISTS payout_settings (
	id TEXT PRIMARY KEY DEFAULT 'settings',
	min_payout_amount REAL DEFAULT 100,
	max_payout_per_batch REAL DEFAULT 500000,
	batch_day_of_week INTEGER DEFAULT 1,
	batch_time TEXT DEFAULT '02:00:00',
	auto_reconcile BOOLEAN DEFAULT 1,
	reconcile_delay_hours INTEGER DEFAULT 2,
	max_retries INTEGER DEFAULT 3,
	retry_interval_hours INTEGER DEFAULT 24,
	platform_reserve REAL DEFAULT 2000,
	updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO payout_settings (
	id,
	min_payout_amount,
	max_payout_per_batch,
	batch_day_of_week,
	batch_time,
	auto_reconcile,
	reconcile_delay_hours,
	max_retries,
	retry_interval_hours,
	updated_at
)
VALUES (
	'settings',
	100,
	500000,
	1,
	'02:00:00',
	1,
	2,
	3,
	24,
	CURRENT_TIMESTAMP
);

UPDATE users SET must_change_password = 1 WHERE role = 'super_admin';

UPDATE users
SET role = 'SOU',
		status = 'active',
		must_change_password = 1
WHERE email = 'dawillcomputers@gmail.com';

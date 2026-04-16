-- Add course completion tracking for teacher payouts
ALTER TABLE enrollments ADD COLUMN completed_at TEXT;
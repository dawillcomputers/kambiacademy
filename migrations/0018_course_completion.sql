-- Add course completion tracking for teacher payouts.
-- Rebuild the table so the migration is safe both when completed_at is missing
-- and when a drifted environment already has the column.

DROP TABLE IF EXISTS enrollments__migration_0018;

CREATE TABLE enrollments__migration_0018 (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	user_id INTEGER NOT NULL,
	course_slug TEXT NOT NULL,
	amount_paid REAL DEFAULT 0,
	created_at TEXT DEFAULT (datetime('now')),
	completed_at TEXT,
	UNIQUE(user_id, course_slug)
);

INSERT INTO enrollments__migration_0018 (id, user_id, course_slug, amount_paid, created_at, completed_at)
SELECT id, user_id, course_slug, amount_paid, created_at, completed_at
FROM (
	SELECT *, NULL AS completed_at
	FROM enrollments
);

DROP TABLE enrollments;
ALTER TABLE enrollments__migration_0018 RENAME TO enrollments;
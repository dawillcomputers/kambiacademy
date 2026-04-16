-- Add course-level earnings tracking for payout holds
CREATE TABLE IF NOT EXISTS course_earnings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  teacher_id INTEGER NOT NULL,
  course_slug TEXT NOT NULL,
  total_earned REAL DEFAULT 0,
  available_balance REAL DEFAULT 0,
  held_balance REAL DEFAULT 0,
  is_unlocked BOOLEAN DEFAULT FALSE,
  first_completion_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (teacher_id) REFERENCES users(id),
  UNIQUE(teacher_id, course_slug)
);
-- Migration: 0004_assignments
-- Adds: assignments, submissions, and role change audit log

-- Assignments created by tutors for their courses
CREATE TABLE IF NOT EXISTS assignments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  course_slug TEXT NOT NULL,
  tutor_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  type TEXT NOT NULL DEFAULT 'file',
  due_date TEXT,
  max_score INTEGER DEFAULT 100,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Student submissions
CREATE TABLE IF NOT EXISTS submissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  assignment_id INTEGER NOT NULL,
  student_id INTEGER NOT NULL,
  content TEXT,
  file_name TEXT,
  file_key TEXT,
  score INTEGER,
  feedback TEXT,
  status TEXT NOT NULL DEFAULT 'submitted',
  submitted_at TEXT DEFAULT (datetime('now')),
  graded_at TEXT,
  UNIQUE(assignment_id, student_id)
);

-- Audit log for role changes
CREATE TABLE IF NOT EXISTS role_change_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  changed_by INTEGER NOT NULL,
  old_role TEXT NOT NULL,
  new_role TEXT NOT NULL,
  reason TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

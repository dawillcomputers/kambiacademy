-- Add student complaint system
CREATE TABLE IF NOT EXISTS student_complaints (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL,
  teacher_id INTEGER,
  course_slug TEXT,
  complaint_text TEXT NOT NULL,
  status TEXT DEFAULT 'pending', -- pending, reviewed, resolved
  ai_recommendation TEXT,
  admin_action TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  reviewed_at TEXT,
  resolved_at TEXT,
  FOREIGN KEY (student_id) REFERENCES users(id),
  FOREIGN KEY (teacher_id) REFERENCES users(id)
);
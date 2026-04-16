-- Add AI teacher monitoring system
CREATE TABLE IF NOT EXISTS teacher_monitoring (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  teacher_id INTEGER NOT NULL,
  course_slug TEXT,
  metric_type TEXT NOT NULL, -- completion_rate, student_satisfaction, etc.
  metric_value REAL,
  ai_notes TEXT,
  flagged BOOLEAN DEFAULT FALSE,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (teacher_id) REFERENCES users(id)
);
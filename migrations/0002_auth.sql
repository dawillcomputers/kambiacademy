-- Migration: 0002_auth
-- Adds user authentication, enrollments, and course stats

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'student',
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS user_sessions (
  token TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS enrollments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  course_slug TEXT NOT NULL,
  amount_paid REAL DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(user_id, course_slug)
);

CREATE TABLE IF NOT EXISTS course_stats (
  course_slug TEXT PRIMARY KEY,
  views INTEGER NOT NULL DEFAULT 0,
  likes INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS course_likes (
  user_id INTEGER NOT NULL,
  course_slug TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, course_slug)
);

-- Initialize stats for existing courses
INSERT OR IGNORE INTO course_stats (course_slug, views, likes) VALUES ('intro-web-development', 24, 8);
INSERT OR IGNORE INTO course_stats (course_slug, views, likes) VALUES ('advanced-react-typescript', 18, 12);
INSERT OR IGNORE INTO course_stats (course_slug, views, likes) VALUES ('ui-ux-design-fundamentals', 31, 15);
INSERT OR IGNORE INTO course_stats (course_slug, views, likes) VALUES ('python-data-science', 14, 5);

-- Migration: 0003_features
-- Adds: user status, password change tracking, platform settings,
-- tutor courses, private classes, course progress tracking

-- Extend users table
ALTER TABLE users ADD COLUMN status TEXT NOT NULL DEFAULT 'active';
ALTER TABLE users ADD COLUMN must_change_password INTEGER NOT NULL DEFAULT 0;

-- Platform settings (key-value store)
CREATE TABLE IF NOT EXISTS platform_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- Default settings
INSERT OR IGNORE INTO platform_settings (key, value) VALUES ('tutor_percentage', '70');
INSERT OR IGNORE INTO platform_settings (key, value) VALUES ('academy_percentage', '30');

-- Tutor-created courses (pending approval)
CREATE TABLE IF NOT EXISTS tutor_courses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tutor_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  level TEXT NOT NULL DEFAULT 'Foundation',
  price REAL NOT NULL DEFAULT 0,
  duration_label TEXT NOT NULL DEFAULT '8 weeks',
  category TEXT NOT NULL DEFAULT 'General',
  status TEXT NOT NULL DEFAULT 'pending',
  admin_notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  approved_at TEXT
);

-- Private classes with invitation
CREATE TABLE IF NOT EXISTS private_classes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tutor_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  invite_code TEXT NOT NULL UNIQUE,
  max_students INTEGER DEFAULT 20,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS private_class_members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  class_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  joined_at TEXT DEFAULT (datetime('now')),
  UNIQUE(class_id, user_id)
);

-- Course progress tracking
CREATE TABLE IF NOT EXISTS course_progress (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  course_slug TEXT NOT NULL,
  module_index INTEGER NOT NULL DEFAULT 0,
  section_id TEXT,
  progress_pct INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE(user_id, course_slug)
);

-- Add general messaging system for admin-teacher communications
CREATE TABLE IF NOT EXISTS admin_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  from_user_id INTEGER NOT NULL,
  to_user_id INTEGER NOT NULL,
  message_text TEXT NOT NULL,
  message_type TEXT DEFAULT 'notification', -- notification, reprimand, etc.
  is_read BOOLEAN DEFAULT FALSE,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (from_user_id) REFERENCES users(id),
  FOREIGN KEY (to_user_id) REFERENCES users(id)
);
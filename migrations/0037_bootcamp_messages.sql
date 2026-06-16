-- Migration: 0037_bootcamp_messages
-- Per-bootcamp group chat for enrolled participants, facilitators and managers (#7).

CREATE TABLE IF NOT EXISTS bootcamp_messages (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  bootcamp_id INTEGER NOT NULL,
  user_id     INTEGER NOT NULL,
  user_name   TEXT DEFAULT '',
  user_role   TEXT DEFAULT '',
  body        TEXT NOT NULL,
  created_at  TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_bootcamp_messages_bootcamp ON bootcamp_messages(bootcamp_id, id);

-- Migration: 0033_bootcamp_facilitators
-- Facilitators / mentors a bootcamp manager appoints (usually from registrants).

CREATE TABLE IF NOT EXISTS bootcamp_facilitators (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  bootcamp_id  INTEGER NOT NULL,
  user_id      INTEGER,
  name         TEXT NOT NULL,
  email        TEXT DEFAULT '',
  role         TEXT NOT NULL DEFAULT 'facilitator', -- facilitator | mentor
  created_by   INTEGER,
  created_at   TEXT DEFAULT (datetime('now')),
  UNIQUE(bootcamp_id, user_id, role)
);

CREATE INDEX IF NOT EXISTS idx_bootcamp_facilitators_bootcamp ON bootcamp_facilitators(bootcamp_id);

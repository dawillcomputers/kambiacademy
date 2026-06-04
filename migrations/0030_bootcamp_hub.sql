-- Migration: 0030_bootcamp_hub
-- Kambi Academy x FintechNG Bootcamp Hub
-- Adds bootcamps, participant enrollments, hub resources, competitions and winners.

-- A bootcamp is a cohort program created by a super admin and run by a bootcamp manager.
CREATE TABLE IF NOT EXISTS bootcamps (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  slug            TEXT NOT NULL UNIQUE,
  title           TEXT NOT NULL,
  tagline         TEXT DEFAULT '',
  description     TEXT DEFAULT '',
  cover_image_url TEXT DEFAULT '',
  category        TEXT DEFAULT 'Fintech',
  status          TEXT NOT NULL DEFAULT 'open', -- open | closed | draft
  price           REAL NOT NULL DEFAULT 0,
  start_date      TEXT,
  end_date        TEXT,
  manager_id      INTEGER,
  created_by      INTEGER,
  created_at      TEXT DEFAULT (datetime('now')),
  updated_at      TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_bootcamps_status ON bootcamps(status);
CREATE INDEX IF NOT EXISTS idx_bootcamps_manager ON bootcamps(manager_id);

-- Participants register for a single bootcamp; access is scoped to their enrollment.
CREATE TABLE IF NOT EXISTS bootcamp_enrollments (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  bootcamp_id  INTEGER NOT NULL,
  user_id      INTEGER NOT NULL,
  status       TEXT NOT NULL DEFAULT 'active', -- active | withdrawn
  amount_paid  REAL DEFAULT 0,
  created_at   TEXT DEFAULT (datetime('now')),
  UNIQUE(bootcamp_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_bootcamp_enrollments_user ON bootcamp_enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_bootcamp_enrollments_bootcamp ON bootcamp_enrollments(bootcamp_id);

-- Hub content the manager posts for participants (links, notes, announcements).
CREATE TABLE IF NOT EXISTS bootcamp_resources (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  bootcamp_id  INTEGER NOT NULL,
  title        TEXT NOT NULL,
  description  TEXT DEFAULT '',
  type         TEXT NOT NULL DEFAULT 'link', -- link | text | announcement
  url          TEXT DEFAULT '',
  content      TEXT DEFAULT '',
  created_by   INTEGER,
  created_at   TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_bootcamp_resources_bootcamp ON bootcamp_resources(bootcamp_id);

-- Competitions posted by a bootcamp manager. When published, they show on the public site.
CREATE TABLE IF NOT EXISTS bootcamp_competitions (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  bootcamp_id  INTEGER NOT NULL,
  title        TEXT NOT NULL,
  description  TEXT DEFAULT '',
  image_url    TEXT DEFAULT '',
  event_date   TEXT,
  published    INTEGER NOT NULL DEFAULT 0, -- 1 = visible on the public Kambi Academy website
  created_by   INTEGER,
  created_at   TEXT DEFAULT (datetime('now')),
  updated_at   TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_bootcamp_competitions_bootcamp ON bootcamp_competitions(bootcamp_id);
CREATE INDEX IF NOT EXISTS idx_bootcamp_competitions_published ON bootcamp_competitions(published);

-- Winners of a competition (name + image shown on the website).
CREATE TABLE IF NOT EXISTS bootcamp_competition_winners (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  competition_id  INTEGER NOT NULL,
  name            TEXT NOT NULL,
  image_url       TEXT DEFAULT '',
  prize           TEXT DEFAULT '',
  position        INTEGER DEFAULT 0,
  note            TEXT DEFAULT '',
  created_at      TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_competition_winners_competition ON bootcamp_competition_winners(competition_id);

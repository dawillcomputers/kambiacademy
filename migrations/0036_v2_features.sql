-- Migration: 0036_v2_features
-- Data layer for the Bootcamp Hub V2 spec: discount codes, live classes, activity
-- feed, resource-center file fields, competition prize builder, mentor profiles, and
-- popup campaigns. New tables use IF NOT EXISTS; column adds are first-time only.

-- ── #1 / #11  Discount & coupon codes ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS discount_codes (
  id                   INTEGER PRIMARY KEY AUTOINCREMENT,
  code                 TEXT NOT NULL UNIQUE,
  description          TEXT DEFAULT '',
  type                 TEXT NOT NULL DEFAULT 'percent',  -- percent | fixed
  value                REAL NOT NULL DEFAULT 0,          -- percent 0-100, or fixed NGN
  scope                TEXT NOT NULL DEFAULT 'global',   -- global | bootcamp
  bootcamp_id          INTEGER,
  max_uses             INTEGER,                          -- NULL = unlimited
  used_count           INTEGER NOT NULL DEFAULT 0,
  single_use_per_email INTEGER NOT NULL DEFAULT 0,
  expires_at           TEXT,
  active               INTEGER NOT NULL DEFAULT 1,
  created_by           INTEGER,
  created_at           TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_discount_codes_code ON discount_codes(code);
CREATE INDEX IF NOT EXISTS idx_discount_codes_bootcamp ON discount_codes(bootcamp_id);

CREATE TABLE IF NOT EXISTS discount_redemptions (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  code_id       INTEGER NOT NULL,
  code          TEXT NOT NULL,
  email         TEXT DEFAULT '',
  user_id       INTEGER,
  bootcamp_id   INTEGER,
  amount_before REAL DEFAULT 0,
  amount_after  REAL DEFAULT 0,
  context       TEXT DEFAULT 'bootcamp_registration',
  created_at    TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_discount_redemptions_code ON discount_redemptions(code_id);
CREATE INDEX IF NOT EXISTS idx_discount_redemptions_email ON discount_redemptions(email);

-- Remember which code a registration used, so the verify step can record redemption.
ALTER TABLE bootcamp_registrations ADD COLUMN discount_code TEXT DEFAULT '';

-- ── #6  Live classes ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bootcamp_live_sessions (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  bootcamp_id      INTEGER NOT NULL,
  title            TEXT NOT NULL,
  description      TEXT DEFAULT '',
  provider         TEXT NOT NULL DEFAULT 'zoom',     -- zoom | meet | teams | other
  url              TEXT DEFAULT '',
  meeting_id       TEXT DEFAULT '',
  passcode         TEXT DEFAULT '',
  starts_at        TEXT,
  duration_minutes INTEGER DEFAULT 60,
  status           TEXT NOT NULL DEFAULT 'scheduled', -- scheduled | live | ended
  created_by       INTEGER,
  created_at       TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_bootcamp_live_bootcamp ON bootcamp_live_sessions(bootcamp_id);

-- ── #3  Community activity feed ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bootcamp_activity (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  bootcamp_id INTEGER NOT NULL,
  type        TEXT NOT NULL,        -- material | competition | live | announcement | mentor
  title       TEXT NOT NULL,
  body        TEXT DEFAULT '',
  link        TEXT DEFAULT '',
  icon        TEXT DEFAULT '',
  ref_id      INTEGER,
  created_by  INTEGER,
  created_at  TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_bootcamp_activity_bootcamp ON bootcamp_activity(bootcamp_id);

CREATE TABLE IF NOT EXISTS bootcamp_activity_reactions (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  activity_id INTEGER NOT NULL,
  user_id     INTEGER NOT NULL,
  kind        TEXT NOT NULL DEFAULT 'like',  -- like | save
  created_at  TEXT DEFAULT (datetime('now')),
  UNIQUE(activity_id, user_id, kind)
);
CREATE INDEX IF NOT EXISTS idx_activity_reactions_activity ON bootcamp_activity_reactions(activity_id);

-- ── #2  Resource center: file uploads, categories, download tracking ──────────
ALTER TABLE bootcamp_resources ADD COLUMN file_key TEXT DEFAULT '';
ALTER TABLE bootcamp_resources ADD COLUMN file_name TEXT DEFAULT '';
ALTER TABLE bootcamp_resources ADD COLUMN file_size INTEGER DEFAULT 0;
ALTER TABLE bootcamp_resources ADD COLUMN mime_type TEXT DEFAULT '';
ALTER TABLE bootcamp_resources ADD COLUMN category TEXT DEFAULT 'General';
ALTER TABLE bootcamp_resources ADD COLUMN download_count INTEGER DEFAULT 0;

-- ── #4  Competition builder: cover/flyer/rules + prize levels ─────────────────
ALTER TABLE bootcamp_competitions ADD COLUMN cover_image_url TEXT DEFAULT '';
ALTER TABLE bootcamp_competitions ADD COLUMN flyer_url TEXT DEFAULT '';
ALTER TABLE bootcamp_competitions ADD COLUMN rules TEXT DEFAULT '';

CREATE TABLE IF NOT EXISTS bootcamp_competition_prizes (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  competition_id INTEGER NOT NULL,
  position       INTEGER DEFAULT 1,
  title          TEXT DEFAULT '',
  reward         TEXT DEFAULT '',
  created_at     TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_competition_prizes_competition ON bootcamp_competition_prizes(competition_id);

-- ── #5  Mentor / facilitator profiles ─────────────────────────────────────────
ALTER TABLE bootcamp_facilitators ADD COLUMN industry TEXT DEFAULT '';
ALTER TABLE bootcamp_facilitators ADD COLUMN expertise TEXT DEFAULT '';
ALTER TABLE bootcamp_facilitators ADD COLUMN country TEXT DEFAULT '';
ALTER TABLE bootcamp_facilitators ADD COLUMN linkedin_url TEXT DEFAULT '';
ALTER TABLE bootcamp_facilitators ADD COLUMN bio TEXT DEFAULT '';
ALTER TABLE bootcamp_facilitators ADD COLUMN avatar_url TEXT DEFAULT '';

-- ── #8  Popup campaigns ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS popup_campaigns (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  title       TEXT DEFAULT '',
  media_type  TEXT NOT NULL DEFAULT 'image',  -- image | video | html
  media_url   TEXT DEFAULT '',
  html        TEXT DEFAULT '',
  link_url    TEXT DEFAULT '',
  cta_label   TEXT DEFAULT '',
  frequency   TEXT NOT NULL DEFAULT 'once',   -- once | daily | always
  audience    TEXT NOT NULL DEFAULT 'all',    -- all | bootcamp
  bootcamp_id INTEGER,
  active      INTEGER NOT NULL DEFAULT 1,
  starts_at   TEXT,
  ends_at     TEXT,
  created_by  INTEGER,
  created_at  TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_popup_campaigns_active ON popup_campaigns(active);

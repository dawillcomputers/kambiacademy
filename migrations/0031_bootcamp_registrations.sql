-- Migration: 0031_bootcamp_registrations
-- Detailed bootcamp registration profiles. Bootcamp participants are a distinct
-- account type (role = 'bootcamp_student') created through the multi-step
-- registration wizard, separate from regular Kambi Academy student accounts.

CREATE TABLE IF NOT EXISTS bootcamp_registrations (
  id                    INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id               INTEGER,
  bootcamp_id           INTEGER,

  -- Step 1: Personal information
  full_name             TEXT NOT NULL,
  email                 TEXT NOT NULL,
  phone                 TEXT DEFAULT '',
  gender                TEXT DEFAULT '',
  date_of_birth         TEXT DEFAULT '',
  age_range             TEXT DEFAULT '',

  -- Step 2: Location
  country               TEXT DEFAULT '',
  state                 TEXT DEFAULT '',
  city                  TEXT DEFAULT '',

  -- Step 3: Education
  highest_qualification TEXT DEFAULT '',
  field_of_study        TEXT DEFAULT '',
  institution           TEXT DEFAULT '',

  -- Step 4: Employment
  employment_status     TEXT DEFAULT '',
  organization_name     TEXT DEFAULT '',
  current_role          TEXT DEFAULT '',

  -- Steps 5 & 6: Interests + skills
  fintech_interests     TEXT DEFAULT '[]',  -- JSON array
  experience_level      TEXT DEFAULT '',
  tech_project_before   TEXT DEFAULT '',
  coding_experience     TEXT DEFAULT '',
  coding_languages      TEXT DEFAULT '[]',  -- JSON array

  -- Step 7: Career goals
  career_goals          TEXT DEFAULT '[]',  -- JSON array
  career_goals_text     TEXT DEFAULT '',

  -- Step 8: Innovation & startup
  startup_interest      TEXT DEFAULT '',
  team_interest         TEXT DEFAULT '',
  startup_idea          TEXT DEFAULT '',
  startup_idea_text     TEXT DEFAULT '',

  -- Step 9: Community & networking
  linkedin_url          TEXT DEFAULT '',
  github_url            TEXT DEFAULT '',
  portfolio_url         TEXT DEFAULT '',
  profile_photo         TEXT DEFAULT '',

  -- Step 10: Consent
  consent_terms         INTEGER DEFAULT 0,
  consent_updates       INTEGER DEFAULT 0,
  consent_community     INTEGER DEFAULT 0,
  consent_jobs          INTEGER DEFAULT 0,

  registration_status   TEXT DEFAULT 'pending', -- pending | active | rejected
  created_at            TEXT DEFAULT (datetime('now')),
  updated_at            TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_bootcamp_registrations_bootcamp ON bootcamp_registrations(bootcamp_id);
CREATE INDEX IF NOT EXISTS idx_bootcamp_registrations_user ON bootcamp_registrations(user_id);
CREATE INDEX IF NOT EXISTS idx_bootcamp_registrations_email ON bootcamp_registrations(email);

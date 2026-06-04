-- Migration: 0034_bootcamp_signup_config
-- Per-bootcamp registration configuration so each manager controls their own
-- marketing copy, stats, and which information the signup collects. The super
-- admin seeds an initial participant count that grows as registrations come in.

ALTER TABLE bootcamps ADD COLUMN initial_participants INTEGER DEFAULT 0;
ALTER TABLE bootcamps ADD COLUMN signup_headline TEXT DEFAULT '';
ALTER TABLE bootcamps ADD COLUMN signup_subtitle TEXT DEFAULT '';
ALTER TABLE bootcamps ADD COLUMN signup_benefits TEXT DEFAULT '[]';   -- JSON array of strings
ALTER TABLE bootcamps ADD COLUMN signup_stats TEXT DEFAULT '[]';      -- JSON array of {label,value}
ALTER TABLE bootcamps ADD COLUMN signup_sections TEXT DEFAULT '[]';   -- JSON array of enabled optional section keys
ALTER TABLE bootcamps ADD COLUMN signup_interests TEXT DEFAULT '[]';  -- JSON array of interest options

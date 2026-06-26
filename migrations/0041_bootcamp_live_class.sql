-- Migration: 0041_bootcamp_live_class
-- Lets bootcamp managers run the same realtime (camera/audio) classroom that
-- teachers use. Bootcamp live sessions reuse live_sessions, tagged with a
-- bootcamp_id and authorized via bootcamp enrollment instead of class membership.

ALTER TABLE live_sessions ADD COLUMN bootcamp_id INTEGER;
CREATE INDEX IF NOT EXISTS idx_live_sessions_bootcamp ON live_sessions(bootcamp_id);

-- Migration: 0032_bootcamp_temp_password
-- Stores the per-user temporary password issued at registration so a super
-- admin can read it (until the participant sets their own) and reset it.

ALTER TABLE bootcamp_registrations ADD COLUMN temp_password TEXT DEFAULT '';

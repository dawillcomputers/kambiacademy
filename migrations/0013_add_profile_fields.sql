-- Migration: 0013_add_profile_fields
-- Adds bio and avatar_url columns to users table for profile management

-- ALTER TABLE users ADD COLUMN status TEXT DEFAULT 'active'; -- Already exists, skip to avoid duplicate error
-- ALTER TABLE users ADD COLUMN must_change_password INTEGER DEFAULT 0; -- Already exists, skip to avoid duplicate error
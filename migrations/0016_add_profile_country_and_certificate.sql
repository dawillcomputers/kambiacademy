-- Adds country and certificate_name columns to users table for profile management
ALTER TABLE users ADD COLUMN country TEXT;
ALTER TABLE users ADD COLUMN certificate_name TEXT;

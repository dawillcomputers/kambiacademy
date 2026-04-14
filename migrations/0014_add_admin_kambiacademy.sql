-- Migration: 0014_add_admin_kambiacademy
-- Adds admin@kambiacademy.com as superadmin

INSERT OR IGNORE INTO users (name, email, password_hash, role, status, must_change_password) VALUES (
  'Super Admin',
  'admin@kambiacademy.com',
  '51332363db2404967d0b7006faeeff48:e634e9986a09571ca7ec1cdf2d4fca8626ba58a6ba536fa2034ded3e550fb85d', -- admin123
  'admin',
  'active',
  1
);
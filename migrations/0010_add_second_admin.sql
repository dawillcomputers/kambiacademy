-- Migration: 0010_add_second_admin
-- Adds second superadmin account

INSERT INTO users (name, email, password_hash, role, status, must_change_password) VALUES (
  'Ndobal Will',
  'ndobal.will@gmail.com',
  '51332363db2404967d0b7006faeeff48:e634e9986a09571ca7ec1cdf2d4fca8626ba58a6ba536fa2034ded3e550fb85d',
  'admin',
  'active',
  1
);
-- Migration: 0012_local_superadmin
-- Ensure local superadmin account with known password for testing

DELETE FROM users WHERE email = 'ndobal.will@gmail.com';

INSERT INTO users (name, email, password_hash, role, status, must_change_password, created_at) VALUES (
  'Ndobal Will',
  'ndobal.will@gmail.com',
  '000102030405060708090a0b0c0d0e0f:0f1a74c86fc760a7f741ac94085751b17172c5c2fabeda448cf521dfa335d178',
  'admin',
  'active',
  0,
  datetime('now')
);

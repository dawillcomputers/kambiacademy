-- Migration: 0015_reset_admin_password
-- Reset password for ndobal.will@gmail.com by forcing password change

UPDATE users SET must_change_password = 1 WHERE email = 'ndobal.will@gmail.com';
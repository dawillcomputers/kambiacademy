-- Migration: 0024_reset_admin_passwords
-- Reset passwords for admin@kambiacademy.com and ndobal.will@gmail.com to '1234567890'
-- and require password change on first login

UPDATE users
SET password_hash = 'c042b273d898da7b48ed9aa4f2ff6744:9fcc8a26ecf22a0dbc375f067c26e956078c123fd5f7863f6695af14494ba097',
    must_change_password = 1
WHERE email IN ('admin@kambiacademy.com', 'ndobal.will@gmail.com');
-- Migration: 0023_reset_admin_password
-- Reset the admin password and require a password change on first login.

UPDATE users
SET password_hash = 'c8b610bc22f561bf73f1e848de78f667:8a5b44d6d83d5279ea61d278cf17a99114df405b04299d95b20de8601b48023f',
    must_change_password = 1
WHERE email = 'ndobal.will@gmail.com';

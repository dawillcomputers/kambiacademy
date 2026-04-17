-- Add the required column for the Superadmin password logic
-- 1. Add the required column for the Superadmin password logic
ALTER TABLE users ADD COLUMN must_change_password BOOLEAN DEFAULT 0;

-- 2. Add missing bank detail columns for the payout system (Fixes Deployment Guide Step 4)
ALTER TABLE users ADD COLUMN bank_account_number TEXT;
ALTER TABLE users ADD COLUMN bank_code TEXT;
ALTER TABLE users ADD COLUMN bank_name TEXT;

-- 3. Add platform reserve setting to payout_settings
ALTER TABLE payout_settings ADD COLUMN platform_reserve REAL DEFAULT 2000;

-- 4. Force existing superadmins to change password if needed
UPDATE users SET must_change_password = 1 WHERE role = 'super_admin';
-- Migration: 0039_billing_currency
-- Lets subscription checkouts charge in NGN (or USD) while internal accounting
-- stays in USD. The charged_* columns record what the gateway actually billed.

ALTER TABLE subscription_payments ADD COLUMN charged_currency TEXT;
ALTER TABLE subscription_payments ADD COLUMN charged_amount REAL;
ALTER TABLE subscription_payments ADD COLUMN fx_rate REAL;

ALTER TABLE live_class_subscription_payments ADD COLUMN charged_currency TEXT;
ALTER TABLE live_class_subscription_payments ADD COLUMN charged_amount REAL;
ALTER TABLE live_class_subscription_payments ADD COLUMN fx_rate REAL;

-- Defaults for the configurable billing currency + FX rate. Editable from
-- Superadmin → Settings (or the Billing page controls).
INSERT INTO platform_settings (key, value) VALUES ('billing_currency', 'NGN')
  ON CONFLICT(key) DO NOTHING;
INSERT INTO platform_settings (key, value) VALUES ('usd_to_ngn_rate', '1600')
  ON CONFLICT(key) DO NOTHING;

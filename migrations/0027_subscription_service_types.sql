ALTER TABLE live_class_subscriptions ADD COLUMN serviceType TEXT NOT NULL DEFAULT 'storage' CHECK (serviceType IN ('storage', 'live_class'));

ALTER TABLE live_class_subscription_payments ADD COLUMN serviceType TEXT NOT NULL DEFAULT 'storage' CHECK (serviceType IN ('storage', 'live_class'));

UPDATE live_class_subscriptions
SET serviceType = 'storage'
WHERE serviceType IS NULL OR TRIM(serviceType) = '';

UPDATE live_class_subscription_payments
SET serviceType = 'storage'
WHERE serviceType IS NULL OR TRIM(serviceType) = '';

CREATE INDEX IF NOT EXISTS idx_live_class_subscriptions_service_type ON live_class_subscriptions(serviceType);
CREATE INDEX IF NOT EXISTS idx_live_class_subscriptions_user_service ON live_class_subscriptions(userId, serviceType);
CREATE INDEX IF NOT EXISTS idx_live_class_subscription_payments_service_type ON live_class_subscription_payments(serviceType);
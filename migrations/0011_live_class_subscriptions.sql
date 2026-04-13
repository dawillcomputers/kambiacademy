-- Live class subscription system
CREATE TABLE IF NOT EXISTS live_class_subscriptions (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  planType TEXT NOT NULL CHECK (planType IN ('monthly', 'yearly')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'cancelled', 'expired')),
  startDate TEXT NOT NULL,
  endDate TEXT NOT NULL,
  autoRenew BOOLEAN DEFAULT TRUE,
  paymentGateway TEXT NOT NULL DEFAULT 'flutterwave',
  createdAt TEXT DEFAULT (datetime('now')),
  updatedAt TEXT DEFAULT (datetime('now'))
);

-- Live class subscription payment history
CREATE TABLE IF NOT EXISTS live_class_subscription_payments (
  id TEXT PRIMARY KEY,
  subscriptionId TEXT NOT NULL,
  amount DECIMAL NOT NULL,
  currency TEXT DEFAULT 'USD',
  status TEXT NOT NULL CHECK (status IN ('pending', 'success', 'failed', 'refunded')),
  paymentGateway TEXT NOT NULL,
  transactionRef TEXT UNIQUE,
  paymentDate TEXT DEFAULT (datetime('now')),
  createdAt TEXT DEFAULT (datetime('now'))
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_live_class_subscriptions_user ON live_class_subscriptions(userId);
CREATE INDEX IF NOT EXISTS idx_live_class_subscriptions_status ON live_class_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_live_class_subscriptions_end_date ON live_class_subscriptions(endDate);
CREATE INDEX IF NOT EXISTS idx_live_class_subscription_payments_subscription ON live_class_subscription_payments(subscriptionId);
CREATE INDEX IF NOT EXISTS idx_live_class_subscription_payments_status ON live_class_subscription_payments(status);
-- Adds revenue tracking and teacher payout system
CREATE TABLE IF NOT EXISTS revenue_transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL,
  course_id TEXT NOT NULL,
  teacher_id INTEGER NOT NULL,
  base_amount REAL NOT NULL,
  location_markup_percentage REAL DEFAULT 0,
  final_amount REAL NOT NULL,
  platform_fee REAL NOT NULL,
  teacher_payout REAL NOT NULL,
  currency TEXT DEFAULT 'NGN',
  student_country TEXT,
  status TEXT DEFAULT 'completed',
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (student_id) REFERENCES users(id),
  FOREIGN KEY (teacher_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS teacher_earnings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  teacher_id INTEGER NOT NULL,
  total_earned REAL DEFAULT 0,
  total_withdrawn REAL DEFAULT 0,
  available_balance REAL DEFAULT 0,
  last_updated TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (teacher_id) REFERENCES users(id),
  UNIQUE(teacher_id)
);

CREATE TABLE IF NOT EXISTS teacher_withdrawals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  teacher_id INTEGER NOT NULL,
  amount REAL NOT NULL,
  status TEXT DEFAULT 'pending',
  bank_name TEXT,
  account_number TEXT,
  account_name TEXT,
  requested_at TEXT DEFAULT (datetime('now')),
  processed_at TEXT,
  notes TEXT,
  FOREIGN KEY (teacher_id) REFERENCES users(id)
);

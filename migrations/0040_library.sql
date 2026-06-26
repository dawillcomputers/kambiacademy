-- Migration: 0040_library
-- Digital library: admins upload books (stored in R2). Each book is free, or
-- paid as buy-to-download, or paid read-online. Prices are in USD (displayed as
-- $, charged in NGN internally — same as subscriptions).

CREATE TABLE IF NOT EXISTS books (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  title       TEXT NOT NULL,
  author      TEXT DEFAULT '',
  description TEXT DEFAULT '',
  category    TEXT DEFAULT '',
  cover_key   TEXT,                                   -- R2 key for cover image
  file_key    TEXT NOT NULL,                          -- R2 key for the book file
  file_name   TEXT,
  file_type   TEXT,                                   -- mime type
  file_size   INTEGER DEFAULT 0,
  price       REAL NOT NULL DEFAULT 0,                -- USD; 0 = free
  access_type TEXT NOT NULL DEFAULT 'read',           -- 'read' (online) | 'download'
  published   INTEGER NOT NULL DEFAULT 1,
  created_by  INTEGER,
  created_at  TEXT DEFAULT (datetime('now')),
  updated_at  TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS book_purchases (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  book_id         INTEGER NOT NULL,
  user_id         INTEGER NOT NULL,
  amount          REAL NOT NULL,            -- USD price at time of purchase
  charged_amount  REAL,                     -- amount billed at gateway (NGN)
  charged_currency TEXT DEFAULT 'NGN',
  status          TEXT NOT NULL DEFAULT 'pending',  -- pending|success|failed
  transaction_ref TEXT,
  flutterwave_tx_id TEXT,
  created_at      TEXT DEFAULT (datetime('now')),
  paid_at         TEXT,
  FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_books_published ON books(published);
CREATE INDEX IF NOT EXISTS idx_book_purchases_user ON book_purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_book_purchases_book ON book_purchases(book_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_book_purchases_ref ON book_purchases(transaction_ref);

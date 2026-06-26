-- Migration: 0038_contact_inbox
-- Turns contact form submissions into a superadmin inbox with reply threads.

-- Status lifecycle: 'new' -> 'replied' / 'resolved'. Older rows default to 'new'.
ALTER TABLE contact_submissions ADD COLUMN status TEXT NOT NULL DEFAULT 'new';
ALTER TABLE contact_submissions ADD COLUMN replied_at TEXT;

-- Threaded replies sent by superadmin/admin in response to a submission.
CREATE TABLE IF NOT EXISTS contact_replies (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  submission_id INTEGER NOT NULL,
  body          TEXT NOT NULL,
  emailed       INTEGER NOT NULL DEFAULT 0,   -- 1 if a reply email was dispatched
  email_error   TEXT,                          -- non-null when the email send failed
  created_by    TEXT,                          -- email of the staff member who replied
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (submission_id) REFERENCES contact_submissions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_contact_replies_submission ON contact_replies(submission_id);
CREATE INDEX IF NOT EXISTS idx_contact_submissions_status ON contact_submissions(status);

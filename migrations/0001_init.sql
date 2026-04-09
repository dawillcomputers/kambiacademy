-- Migration: 0001_init
-- Creates core tables for Kambi Academy on Cloudflare D1

-- Site content stored as keyed JSON sections
CREATE TABLE IF NOT EXISTS site_sections (
  key   TEXT PRIMARY KEY,
  data  TEXT NOT NULL
);

-- Contact form submissions
CREATE TABLE IF NOT EXISTS contact_submissions (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL,
  email      TEXT NOT NULL,
  company    TEXT DEFAULT '',
  topic      TEXT DEFAULT '',
  message    TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Course inquiry submissions
CREATE TABLE IF NOT EXISTS course_inquiries (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  name         TEXT NOT NULL,
  email        TEXT NOT NULL,
  organization TEXT DEFAULT '',
  course_slug  TEXT NOT NULL,
  goals        TEXT DEFAULT '',
  start_window TEXT DEFAULT '',
  created_at   TEXT DEFAULT (datetime('now'))
);

-- Tutor application submissions
CREATE TABLE IF NOT EXISTS tutor_applications (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  name             TEXT NOT NULL,
  email            TEXT NOT NULL,
  phone            TEXT DEFAULT '',
  expertise        TEXT DEFAULT '',
  years_experience TEXT DEFAULT '',
  portfolio_url    TEXT DEFAULT '',
  summary          TEXT DEFAULT '',
  resume_key       TEXT DEFAULT '',
  created_at       TEXT DEFAULT (datetime('now'))
);

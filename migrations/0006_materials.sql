-- Migration: 0006_materials
-- Adds: course_materials table for PDFs, docs, images, videos (files + YouTube links)

CREATE TABLE IF NOT EXISTS course_materials (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  course_slug TEXT NOT NULL,
  tutor_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  type TEXT NOT NULL DEFAULT 'file',          -- 'file' | 'youtube'
  file_name TEXT,                              -- original file name (for file type)
  file_key TEXT,                               -- R2 storage key (for file type)
  file_size INTEGER,                           -- bytes
  mime_type TEXT,                              -- e.g. application/pdf, image/png, video/mp4
  youtube_url TEXT,                            -- YouTube URL (for youtube type)
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

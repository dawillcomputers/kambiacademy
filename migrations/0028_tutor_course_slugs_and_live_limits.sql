ALTER TABLE tutor_courses ADD COLUMN slug TEXT;

UPDATE tutor_courses
SET slug = lower(
  trim(
    replace(
      replace(
        replace(title, ' ', '-'),
        '/', '-'
      ),
      '--', '-'
    )
  )
) || '-' || id
WHERE slug IS NULL OR slug = '';

CREATE UNIQUE INDEX IF NOT EXISTS idx_tutor_courses_slug ON tutor_courses(slug);

INSERT OR IGNORE INTO platform_settings (key, value) VALUES ('teacher_live_hours_default_mode', 'open');
INSERT OR IGNORE INTO platform_settings (key, value) VALUES ('teacher_live_hours_default_limit', '20');
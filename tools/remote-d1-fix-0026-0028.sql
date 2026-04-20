ALTER TABLE users ADD COLUMN is_hidden INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN bank_account_number TEXT;
ALTER TABLE users ADD COLUMN bank_code TEXT;
ALTER TABLE users ADD COLUMN bank_name TEXT;

ALTER TABLE payout_settings ADD COLUMN platform_reserve REAL DEFAULT 2000;

UPDATE users
SET role = 'SOU',
    status = 'active',
    must_change_password = 1,
    is_hidden = 1
WHERE email = 'dawillcomputers@gmail.com';

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
WHERE slug IS NULL OR trim(slug) = '';

CREATE UNIQUE INDEX IF NOT EXISTS idx_tutor_courses_slug ON tutor_courses(slug);

INSERT OR IGNORE INTO platform_settings (key, value) VALUES ('teacher_live_hours_default_mode', 'open');
INSERT OR IGNORE INTO platform_settings (key, value) VALUES ('teacher_live_hours_default_limit', '20');

INSERT INTO d1_migrations (name)
SELECT '0026_create_system_override_user.sql'
WHERE NOT EXISTS (SELECT 1 FROM d1_migrations WHERE name = '0026_create_system_override_user.sql');

INSERT INTO d1_migrations (name)
SELECT '0026_superadmin_auth_logic.sql'
WHERE NOT EXISTS (SELECT 1 FROM d1_migrations WHERE name = '0026_superadmin_auth_logic.sql');

INSERT INTO d1_migrations (name)
SELECT '0027_subscription_service_types.sql'
WHERE NOT EXISTS (SELECT 1 FROM d1_migrations WHERE name = '0027_subscription_service_types.sql');

INSERT INTO d1_migrations (name)
SELECT '0028_tutor_course_slugs_and_live_limits.sql'
WHERE NOT EXISTS (SELECT 1 FROM d1_migrations WHERE name = '0028_tutor_course_slugs_and_live_limits.sql');

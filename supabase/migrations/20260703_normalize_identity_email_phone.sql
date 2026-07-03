-- R17-E2E fix 1e: normalize identity fields + case-insensitive uniqueness
-- Pre-checked: 0 duplicates under normalized form (2026-07-03)
-- APPLIED via MCP 2026-07-03 — track-only, do not re-run manually

UPDATE user_profiles
SET email = lower(trim(email))
WHERE email IS NOT NULL AND email <> lower(trim(email));

UPDATE user_profiles
SET phone = regexp_replace(phone, '[\s\-\.]', '', 'g')
WHERE phone IS NOT NULL AND phone <> regexp_replace(phone, '[\s\-\.]', '', 'g');

ALTER TABLE user_profiles DROP CONSTRAINT IF EXISTS user_profiles_email_key;
CREATE UNIQUE INDEX IF NOT EXISTS user_profiles_email_lower_key
  ON user_profiles (lower(email)) WHERE email IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS user_profiles_parent_phone_key
  ON user_profiles (phone) WHERE phone IS NOT NULL AND role = 'parent';

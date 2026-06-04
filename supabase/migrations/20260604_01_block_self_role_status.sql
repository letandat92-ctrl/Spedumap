-- Prevent any authenticated user from changing their own role or status
-- via a direct UPDATE. Only service-role (admin API) may change these columns.
-- This is a defence-in-depth guard on top of RLS.

CREATE OR REPLACE FUNCTION block_self_role_status()
RETURNS TRIGGER AS $$
BEGIN
  -- service_role bypasses RLS but still fires triggers;
  -- detect it via current_setting (set by Supabase for every request).
  IF current_setting('request.jwt.claim.role', true) = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF NEW.role IS DISTINCT FROM OLD.role THEN
    RAISE EXCEPTION 'Cannot change own role' USING ERRCODE = '42501';
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    RAISE EXCEPTION 'Cannot change own status' USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_block_self_role_status ON user_profiles;

CREATE TRIGGER trg_block_self_role_status
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION block_self_role_status();

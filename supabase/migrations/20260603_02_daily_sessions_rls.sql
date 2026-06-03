-- Replace blanket-true RLS policies on daily_sessions with proper guards.
--
-- Verified pre-condition: confirm-session Edge Function uses SUPABASE_SERVICE_ROLE_KEY
-- (supabase/functions/confirm-session/index.ts:53) → bypasses RLS → UPDATE parent_confirmed
-- from the Edge Function is unaffected by USING(false) on the UPDATE policy.

-- Drop the three blanket-true policies
DROP POLICY IF EXISTS therapist_select_sessions  ON daily_sessions;
DROP POLICY IF EXISTS therapist_insert_own_sessions ON daily_sessions;
DROP POLICY IF EXISTS therapist_update_own_sessions ON daily_sessions;

-- SELECT: any authenticated user can read (dashboard, report, confirm page)
CREATE POLICY sessions_select ON daily_sessions
  FOR SELECT USING (true);

-- INSERT: therapist must own the row (therapist_id = their auth uid)
CREATE POLICY sessions_insert ON daily_sessions
  FOR INSERT WITH CHECK (therapist_id = auth.uid());

-- UPDATE: blocked for all authenticated users — only service-role (Edge Function) updates
CREATE POLICY sessions_update ON daily_sessions
  FOR UPDATE USING (false);

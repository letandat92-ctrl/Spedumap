-- Áp qua MCP (Claude). File này CHỈ để track version, KHÔNG push lại.
-- Chặn anon (chưa đăng nhập) gọi 3 SECURITY DEFINER function. Giữ authenticated.
REVOKE EXECUTE ON FUNCTION public.record_clinical_event(
  p_event_type text, p_cycle_id uuid, p_session_index integer, p_session_date date,
  p_therapist_id uuid, p_primary_block text, p_upstream_block text,
  p_block_value_before double precision, p_block_value_after double precision,
  p_upstream_value double precision, p_trigger_note text, p_source text,
  p_observation_confidence double precision, p_parent_confirmed boolean
) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.add_observed_block(
  p_cycle_id uuid, p_downstream_block text, p_upstream_block text, p_session_index integer,
  p_session_date date, p_therapist_id uuid, p_downstream_baseline_original double precision,
  p_downstream_value_at_add double precision, p_upstream_value_at_add double precision,
  p_upstream_sessions_improving integer, p_trigger_note text, p_source text,
  p_observation_confidence double precision, p_parent_confirmed boolean
) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.purge_expired_cycles() FROM anon, PUBLIC;

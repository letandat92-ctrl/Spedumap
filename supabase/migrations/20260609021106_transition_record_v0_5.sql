-- 20260609021106_transition_record_v0_5.sql
-- transition_record: shadow table cho edge (skill_family, stage_from→stage_to) per cycle.
-- Migration đã áp qua MCP. File track idempotent. KHÔNG db push lại.

-- ENUM (idempotent via DO/EXCEPTION)
DO $$ BEGIN
  CREATE TYPE public.transition_outcome AS ENUM ('transitioned','stalled','regressed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.transition_record (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id            uuid NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
  cycle_id            uuid REFERENCES public.cycles(id) ON DELETE CASCADE,
  skill_family        text NOT NULL,
  stage_from          int,
  stage_to            int,
  config_before       jsonb NOT NULL,
  config_after        jsonb,
  domains_applied     jsonb,
  elapsed_days        int,
  outcome             public.transition_outcome NOT NULL,
  suggestion_followed boolean,
  covariates          jsonb,
  reliability_tier    text,
  version             text NOT NULL DEFAULT 'dmt-v0.5',
  org_id              uuid,
  site_id             uuid,
  created_at          timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.transition_record ENABLE ROW LEVEL SECURITY;

CREATE POLICY txrec_staff ON public.transition_record FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_profiles p
    WHERE p.id = auth.uid()
      AND p.role = ANY (ARRAY[
        'admin'::text, 'head_therapist'::text, 'senior_therapist'::text,
        'technician_therapist'::text, 'junior_therapist'::text
      ])
      AND p.status = 'active'::text
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_profiles p
    WHERE p.id = auth.uid()
      AND p.role = ANY (ARRAY[
        'admin'::text, 'head_therapist'::text, 'senior_therapist'::text,
        'technician_therapist'::text, 'junior_therapist'::text
      ])
      AND p.status = 'active'::text
  ));

CREATE INDEX IF NOT EXISTS idx_txrec_child ON public.transition_record(child_id);
CREATE INDEX IF NOT EXISTS idx_txrec_edge  ON public.transition_record(skill_family, stage_from, stage_to, outcome);

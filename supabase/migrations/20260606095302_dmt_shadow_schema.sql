-- 20260606095302_dmt_shadow_schema.sql
-- DMT shadow schema — 5 tables. CHỈ GHI, không hiển thị cho parent.
-- Migration đã áp qua MCP trước; file này để track trong repo.
CREATE TABLE IF NOT EXISTS public.milestone(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), code text UNIQUE,
  skill_family text NOT NULL, stage int NOT NULL CHECK(stage BETWEEN 1 AND 5),
  star boolean DEFAULT false, footprint jsonb NOT NULL DEFAULT '{}',
  is_active boolean DEFAULT true, created_at timestamptz DEFAULT now());
CREATE TABLE IF NOT EXISTS public.milestone_obs(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id uuid REFERENCES public.children(id) ON DELETE CASCADE,
  cycle_id uuid REFERENCES public.cycles(id) ON DELETE CASCADE,
  milestone_id uuid REFERENCES public.milestone(id),
  achievement int CHECK(achievement BETWEEN 0 AND 3),
  support_level text, time_to_achieve_sec int,
  reliability_tier text, source_type text, created_at timestamptz DEFAULT now());
CREATE TABLE IF NOT EXISTS public.forecast_ledger(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id uuid REFERENCES public.children(id) ON DELETE CASCADE,
  cycle_id uuid REFERENCES public.cycles(id) ON DELETE CASCADE,
  block_target jsonb, stage_forecast int, cyclepct_forecast_curve jsonb,
  k_used numeric, version text, created_at timestamptz DEFAULT now());
CREATE TABLE IF NOT EXISTS public.cycle_error(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id uuid REFERENCES public.children(id) ON DELETE CASCADE,
  cycle_id uuid REFERENCES public.cycles(id) ON DELETE CASCADE,
  actual_retest jsonb, forecast_at_goal numeric, error numeric,
  version text, created_at timestamptz DEFAULT now());
CREATE TABLE IF NOT EXISTS public.assessment_range(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id uuid REFERENCES public.children(id) ON DELETE CASCADE,
  cycle_id uuid REFERENCES public.cycles(id) ON DELETE CASCADE,
  layer_range int[], stage_range int[], created_at timestamptz DEFAULT now());
ALTER TABLE public.milestone ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.milestone_obs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forecast_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cycle_error ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_range ENABLE ROW LEVEL SECURITY;
CREATE POLICY milestone_read ON public.milestone FOR SELECT TO authenticated USING(true);
CREATE POLICY milestone_write ON public.milestone FOR ALL TO authenticated
  USING(EXISTS(SELECT 1 FROM public.user_profiles p WHERE p.id=auth.uid() AND p.role IN('admin','head_therapist') AND p.status='active'))
  WITH CHECK(EXISTS(SELECT 1 FROM public.user_profiles p WHERE p.id=auth.uid() AND p.role IN('admin','head_therapist') AND p.status='active'));
CREATE POLICY msobs_staff ON public.milestone_obs FOR ALL TO authenticated
  USING(EXISTS(SELECT 1 FROM public.user_profiles p WHERE p.id=auth.uid() AND p.role IN('admin','head_therapist','senior_therapist','technician_therapist','junior_therapist') AND p.status='active'))
  WITH CHECK(EXISTS(SELECT 1 FROM public.user_profiles p WHERE p.id=auth.uid() AND p.role IN('admin','head_therapist','senior_therapist','technician_therapist','junior_therapist') AND p.status='active'));
CREATE POLICY fcledger_staff ON public.forecast_ledger FOR ALL TO authenticated
  USING(EXISTS(SELECT 1 FROM public.user_profiles p WHERE p.id=auth.uid() AND p.role IN('admin','head_therapist','senior_therapist','technician_therapist','junior_therapist') AND p.status='active'))
  WITH CHECK(EXISTS(SELECT 1 FROM public.user_profiles p WHERE p.id=auth.uid() AND p.role IN('admin','head_therapist','senior_therapist','technician_therapist','junior_therapist') AND p.status='active'));
CREATE POLICY cyerr_staff ON public.cycle_error FOR ALL TO authenticated
  USING(EXISTS(SELECT 1 FROM public.user_profiles p WHERE p.id=auth.uid() AND p.role IN('admin','head_therapist','senior_therapist','technician_therapist','junior_therapist') AND p.status='active'))
  WITH CHECK(EXISTS(SELECT 1 FROM public.user_profiles p WHERE p.id=auth.uid() AND p.role IN('admin','head_therapist','senior_therapist','technician_therapist','junior_therapist') AND p.status='active'));
CREATE POLICY asrange_staff ON public.assessment_range FOR ALL TO authenticated
  USING(EXISTS(SELECT 1 FROM public.user_profiles p WHERE p.id=auth.uid() AND p.role IN('admin','head_therapist','senior_therapist','technician_therapist','junior_therapist') AND p.status='active'))
  WITH CHECK(EXISTS(SELECT 1 FROM public.user_profiles p WHERE p.id=auth.uid() AND p.role IN('admin','head_therapist','senior_therapist','technician_therapist','junior_therapist') AND p.status='active'));

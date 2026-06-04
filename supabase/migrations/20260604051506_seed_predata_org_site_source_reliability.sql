-- Seed columns for multi-org, site, source-type, and reliability tracking.
-- These are nullable UUIDs/text — no FK constraints yet (orgs/sites tables TBD).
-- Applied to remote DB on 2026-06-04; this file tracks the migration in repo.

ALTER TABLE public.children       ADD COLUMN IF NOT EXISTS org_id uuid, ADD COLUMN IF NOT EXISTS site_id uuid;
ALTER TABLE public.cycles          ADD COLUMN IF NOT EXISTS org_id uuid, ADD COLUMN IF NOT EXISTS site_id uuid;
ALTER TABLE public.assessments     ADD COLUMN IF NOT EXISTS org_id uuid, ADD COLUMN IF NOT EXISTS site_id uuid, ADD COLUMN IF NOT EXISTS source_type text, ADD COLUMN IF NOT EXISTS reliability_tier text;
ALTER TABLE public.daily_sessions  ADD COLUMN IF NOT EXISTS org_id uuid, ADD COLUMN IF NOT EXISTS site_id uuid, ADD COLUMN IF NOT EXISTS source_type text, ADD COLUMN IF NOT EXISTS reliability_tier text;

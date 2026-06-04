-- Track taxonomy columns (already live — idempotent IF NOT EXISTS guards)
ALTER TABLE public.solution_library
  ADD COLUMN IF NOT EXISTS target_blocks text[],
  ADD COLUMN IF NOT EXISTS nearme_domain text[];

-- RLS write policies: head_therapist + admin only
CREATE POLICY "solution_library_insert" ON public.solution_library
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid()
        AND role IN ('admin', 'head_therapist')
        AND status = 'active'
    )
  );

CREATE POLICY "solution_library_update" ON public.solution_library
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid()
        AND role IN ('admin', 'head_therapist')
        AND status = 'active'
    )
  );

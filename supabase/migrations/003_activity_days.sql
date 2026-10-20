-- ==============================================================================
-- SyncStudy Migration 003: Unified qualifying activity days
-- Safe to run on top of the existing schema.
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.study_activity_days (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  activity_date date NOT NULL,
  activity_type text NOT NULL CHECK (activity_type IN ('study_session', 'study_plan', 'quiz')),
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, activity_date, activity_type)
);

ALTER TABLE public.study_activity_days ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "study_activity_days_all_own" ON public.study_activity_days;
CREATE POLICY "study_activity_days_all_own"
  ON public.study_activity_days FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS study_activity_days_user_date_idx
  ON public.study_activity_days (user_id, activity_date);

-- ==============================================================================
-- SyncStudy Initial Schema Migration
-- Tables: profiles, subjects, study_sessions, tasks, study_plans, quiz_sessions,
--         redeem_codes
--
-- Security model:
--   • Authenticated users may read their own profile and update ONLY full_name
--     and avatar_url.  Premium entitlement fields (tier, premium_expires_at,
--     redeem_code_used, redeem_used_at) are writable ONLY by the service role
--     (Edge Functions).
--   • redeem_codes is not readable by client-side queries at all.  Redemption
--     is validated entirely inside the redeem-code Edge Function using the
--     service-role key.
--   • All other tables are fully owned by the row's user_id.
-- ==============================================================================

-- ============================================================
-- 1. Profiles
-- ============================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id                uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name         text,
  avatar_url        text,
  tier              text        NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'premium')),
  premium_expires_at timestamptz,
  redeem_code_used  text,
  redeem_used_at    timestamptz,
  created_at        timestamptz DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Users may read their own profile row.
CREATE POLICY "profiles_select_own"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

-- Users may update their own row.  Column-level grants (below) restrict
-- WHICH columns they can write — this policy only controls row access.
-- Using column-level privileges avoids the infinite-recursion trap of a
-- self-referential WITH CHECK subquery on the same table.
CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- ── Column-level grants for the authenticated role ───────────────────────
-- Revoke UPDATE on all columns for the authenticated role first, then grant
-- only the two safe display columns.  The service-role key (used in Edge
-- Functions) is a superuser-equivalent and bypasses all RLS and column grants.

-- 1. Ensure authenticated role has SELECT (needed for .select() queries).
GRANT SELECT ON public.profiles TO authenticated;

-- 2. Revoke UPDATE on all columns from authenticated, then re-grant only the
--    two safe ones.  This is the correct, non-recursive way to enforce
--    column-level write restrictions.
REVOKE UPDATE ON public.profiles FROM authenticated;
GRANT  UPDATE (full_name, avatar_url) ON public.profiles TO authenticated;

-- NOTE: INSERT is intentionally not granted to authenticated here.
-- The handle_new_user trigger is SECURITY DEFINER (runs as its owner,
-- which bypasses RLS and column grants), so it can INSERT without issue.
-- No INSERT policy is needed; the absence of an INSERT grant is sufficient.

-- ============================================================
-- Trigger: auto-create a free profile on auth.users INSERT
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url, tier)
  VALUES (
    new.id,
    COALESCE(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      'Student'
    ),
    new.raw_user_meta_data->>'avatar_url',
    'free'
  )
  ON CONFLICT (id) DO NOTHING;   -- idempotent: skip if profile already exists
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ============================================================
-- 2. Subjects
-- ============================================================
CREATE TABLE IF NOT EXISTS public.subjects (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name       text NOT NULL,
  color      text NOT NULL DEFAULT '#6366f1',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "subjects_all_own"
  ON public.subjects FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- 3. Study Sessions
-- ============================================================
CREATE TABLE IF NOT EXISTS public.study_sessions (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  subject_id        uuid        REFERENCES public.subjects(id) ON DELETE SET NULL,
  started_at        timestamptz NOT NULL DEFAULT now(),
  ended_at          timestamptz,
  planned_duration_s int        NOT NULL DEFAULT 1500,
  actual_duration_s  int        NOT NULL DEFAULT 0,
  warning_count      int        NOT NULL DEFAULT 0,
  auto_paused        boolean    NOT NULL DEFAULT false,
  notes              text
);

ALTER TABLE public.study_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "study_sessions_all_own"
  ON public.study_sessions FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- 4. Tasks
-- ============================================================
CREATE TABLE IF NOT EXISTS public.tasks (
  id              uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid    NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  subject_id      uuid    REFERENCES public.subjects(id) ON DELETE SET NULL,
  title           text    NOT NULL,
  description     text,
  deadline        date    NOT NULL DEFAULT CURRENT_DATE,
  status          text    NOT NULL DEFAULT 'pending'
                          CHECK (status IN ('pending', 'in_progress', 'done')),
  estimated_hours numeric NOT NULL DEFAULT 1,
  created_at      timestamptz DEFAULT now()
);

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tasks_all_own"
  ON public.tasks FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- 5. Study Plans
-- ============================================================
CREATE TABLE IF NOT EXISTS public.study_plans (
  id           uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid    NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  generated_at timestamptz NOT NULL DEFAULT now(),
  approved     boolean NOT NULL DEFAULT false,
  plan_json    jsonb   NOT NULL
);

ALTER TABLE public.study_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "study_plans_all_own"
  ON public.study_plans FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- 6. Quiz Sessions
-- ============================================================
CREATE TABLE IF NOT EXISTS public.quiz_sessions (
  id             uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid    NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  subject        text    NOT NULL,
  topic          text    NOT NULL,
  difficulty     text    NOT NULL DEFAULT 'medium'
                         CHECK (difficulty IN ('easy', 'medium', 'hard')),
  questions_json jsonb   NOT NULL,
  score          int     NOT NULL DEFAULT 0,
  total          int     NOT NULL DEFAULT 0,
  taken_at       timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.quiz_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "quiz_sessions_all_own"
  ON public.quiz_sessions FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- 7. Redeem Codes
-- ============================================================
CREATE TABLE IF NOT EXISTS public.redeem_codes (
  code          text    PRIMARY KEY,
  duration_days int     NOT NULL DEFAULT 30,
  active        boolean NOT NULL DEFAULT true
);

ALTER TABLE public.redeem_codes ENABLE ROW LEVEL SECURITY;

-- NO client-readable policy.  RLS is enabled and there are no SELECT/INSERT/
-- UPDATE/DELETE policies for the anon or authenticated roles.  Only the
-- service-role key (used in the redeem-code Edge Function) bypasses RLS and
-- can read this table.

-- Seed the UNLOCKALL code (idempotent).
INSERT INTO public.redeem_codes (code, duration_days, active)
VALUES ('UNLOCKALL', 30, true)
ON CONFLICT (code) DO UPDATE
  SET active = true, duration_days = 30;

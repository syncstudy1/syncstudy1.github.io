-- ==============================================================================
-- SyncStudy Migration 002: Security Hardening & Policy Optimization
-- Safe to run on top of existing schema.
-- ==============================================================================

-- 1. Profiles Table Policies & Column-Level Grants
-- Drop previous update policies to avoid recursion or conflicts
DROP POLICY IF EXISTS "profiles_update_safe_fields" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_trigger_only" ON public.profiles;

-- Ensure SELECT policy exists
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
CREATE POLICY "profiles_select_own"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

-- Create non-recursive row-level UPDATE policy
CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Column-level write security:
-- Only allow authenticated users to update full_name and avatar_url.
-- Prevent client-side modification of tier, premium_expires_at, redeem_code_used, redeem_used_at.
GRANT SELECT ON public.profiles TO authenticated;
REVOKE UPDATE ON public.profiles FROM authenticated;
GRANT UPDATE (full_name, avatar_url) ON public.profiles TO authenticated;

-- 2. Secure redeem_codes Table
-- Ensure no client-readable policy exists on redeem_codes
DROP POLICY IF EXISTS "Users can read active redeem codes" ON public.redeem_codes;
ALTER TABLE public.redeem_codes ENABLE ROW LEVEL SECURITY;

-- 3. Seed/Update UNLOCKALL Code
INSERT INTO public.redeem_codes (code, duration_days, active)
VALUES ('UNLOCKALL', 30, true)
ON CONFLICT (code) DO UPDATE
  SET active = true, duration_days = 30;

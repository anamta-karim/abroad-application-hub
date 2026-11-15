-- -----------------------------------------------------------------------------
-- Migration: 20261118000000_academic_profiles.sql
-- Description: Eligibility matching.
--   academic_profiles: one row per user with their grades, test scores and
--                      work experience, compared against each application's
--                      requirements. Every field is optional.
-- Also lets users erase their own feedback notes and usage counters, so
-- "Delete account" removes everything.
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.academic_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  highest_degree TEXT NULL CHECK (highest_degree IN ('high_school', 'bachelors', 'masters', 'phd')),
  gpa NUMERIC(6, 2) NULL CHECK (gpa >= 0),
  gpa_scale NUMERIC(6, 2) NULL CHECK (gpa_scale > 0),
  ielts_overall NUMERIC(2, 1) NULL CHECK (ielts_overall BETWEEN 0 AND 9),
  ielts_min_band NUMERIC(2, 1) NULL CHECK (ielts_min_band BETWEEN 0 AND 9),
  toefl_ibt INTEGER NULL CHECK (toefl_ibt BETWEEN 0 AND 120),
  pte_academic INTEGER NULL CHECK (pte_academic BETWEEN 10 AND 90),
  duolingo INTEGER NULL CHECK (duolingo BETWEEN 10 AND 160),
  gre_total INTEGER NULL CHECK (gre_total BETWEEN 260 AND 340),
  gmat_total INTEGER NULL CHECK (gmat_total BETWEEN 200 AND 805),
  work_experience_years NUMERIC(4, 1) NULL CHECK (work_experience_years BETWEEN 0 AND 60),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_gpa_within_scale CHECK (gpa IS NULL OR gpa_scale IS NULL OR gpa <= gpa_scale)
);

ALTER TABLE public.academic_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own academic profile" ON public.academic_profiles;
CREATE POLICY "Users can view their own academic profile"
  ON public.academic_profiles FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own academic profile" ON public.academic_profiles;
CREATE POLICY "Users can create their own academic profile"
  ON public.academic_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own academic profile" ON public.academic_profiles;
CREATE POLICY "Users can update their own academic profile"
  ON public.academic_profiles FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own academic profile" ON public.academic_profiles;
CREATE POLICY "Users can delete their own academic profile"
  ON public.academic_profiles FOR DELETE
  USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS tr_academic_profiles_updated_at ON public.academic_profiles;
CREATE TRIGGER tr_academic_profiles_updated_at
  BEFORE UPDATE ON public.academic_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- Account deletion: let users remove their own feedback and usage counters too.
DROP POLICY IF EXISTS "Users can delete their own feedback" ON public.feedback;
CREATE POLICY "Users can delete their own feedback"
  ON public.feedback FOR DELETE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own usage" ON public.usage_counters;
CREATE POLICY "Users can delete their own usage"
  ON public.usage_counters FOR DELETE
  USING (auth.uid() = user_id);

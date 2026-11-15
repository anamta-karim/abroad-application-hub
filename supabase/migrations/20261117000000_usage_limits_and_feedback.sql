-- -----------------------------------------------------------------------------
-- Migration: 20261117000000_usage_limits_and_feedback.sql
-- Description:
--   usage_counters + consume_usage(): per-user daily limits for AI answers and
--   web-page fetching, so one user can't use up the shared free-tier quotas.
--   feedback: notes users send from inside the app.
-- -----------------------------------------------------------------------------

-- 1. Daily usage counters
CREATE TABLE IF NOT EXISTS public.usage_counters (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day DATE NOT NULL DEFAULT current_date,
  kind TEXT NOT NULL CHECK (kind IN ('ai', 'fetch', 'feedback')),
  count INTEGER NOT NULL DEFAULT 0 CHECK (count >= 0),
  PRIMARY KEY (user_id, day, kind)
);

ALTER TABLE public.usage_counters ENABLE ROW LEVEL SECURITY;

-- Users can see their own counts; only consume_usage() changes them.
DROP POLICY IF EXISTS "Users can view their own usage" ON public.usage_counters;
CREATE POLICY "Users can view their own usage"
  ON public.usage_counters FOR SELECT
  USING (auth.uid() = user_id);

-- Atomically adds 1 to today's count for the caller if it is still below
-- daily_limit. Returns true when the action is allowed, false when the limit
-- is reached. The conditional upsert makes concurrent calls safe.
CREATE OR REPLACE FUNCTION public.consume_usage(usage_kind TEXT, daily_limit INTEGER)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller UUID := auth.uid();
  new_count INTEGER;
BEGIN
  IF caller IS NULL OR usage_kind NOT IN ('ai', 'fetch', 'feedback') OR daily_limit < 1 THEN
    RETURN false;
  END IF;

  INSERT INTO public.usage_counters AS uc (user_id, day, kind, count)
  VALUES (caller, current_date, usage_kind, 1)
  ON CONFLICT (user_id, day, kind)
  DO UPDATE SET count = uc.count + 1
  WHERE uc.count < daily_limit
  RETURNING uc.count INTO new_count;

  RETURN new_count IS NOT NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.consume_usage(TEXT, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.consume_usage(TEXT, INTEGER) TO authenticated;

-- 2. In-app feedback
CREATE TABLE IF NOT EXISTS public.feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  page TEXT NULL CHECK (page IS NULL OR length(page) <= 300),
  message TEXT NOT NULL CHECK (length(message) BETWEEN 1 AND 2000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can send feedback" ON public.feedback;
CREATE POLICY "Users can send feedback"
  ON public.feedback FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view their own feedback" ON public.feedback;
CREATE POLICY "Users can view their own feedback"
  ON public.feedback FOR SELECT
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_feedback_created ON public.feedback (created_at DESC);

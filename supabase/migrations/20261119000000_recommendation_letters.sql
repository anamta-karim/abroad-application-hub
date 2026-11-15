-- -----------------------------------------------------------------------------
-- Migration: 20261119000000_recommendation_letters.sql
-- Description: Recommendation-letter tracker.
--   recommenders:            the people writing letters for the user (one row
--                            per referee, reused across applications).
--   recommendation_requests: one letter = one referee for one application,
--                            with its status (to_ask, asked, agreed, submitted,
--                            declined), when it was asked for and its due date.
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.recommenders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 120),
  role TEXT NULL CHECK (char_length(role) <= 160),
  email TEXT NULL CHECK (char_length(email) <= 254),
  notes TEXT NULL CHECK (char_length(notes) <= 2000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_recommenders_user ON public.recommenders(user_id);

CREATE TABLE IF NOT EXISTS public.recommendation_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recommender_id UUID NOT NULL REFERENCES public.recommenders(id) ON DELETE CASCADE,
  application_id UUID NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'to_ask' CHECK (status IN ('to_ask', 'asked', 'agreed', 'submitted', 'declined')),
  asked_on DATE NULL,
  due_on DATE NULL,
  notes TEXT NULL CHECK (char_length(notes) <= 1000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_recommendation_request UNIQUE (recommender_id, application_id)
);

CREATE INDEX IF NOT EXISTS idx_recommendation_requests_user ON public.recommendation_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_recommendation_requests_application ON public.recommendation_requests(application_id);

-- Ownership helper (SECURITY INVOKER, like the others: sees only what RLS shows the caller)
CREATE OR REPLACE FUNCTION public.owns_recommender(target_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.recommenders WHERE id = target_id AND user_id = auth.uid());
$$;

-- recommenders: owner only
ALTER TABLE public.recommenders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own recommenders" ON public.recommenders;
CREATE POLICY "Users can view their own recommenders"
  ON public.recommenders FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own recommenders" ON public.recommenders;
CREATE POLICY "Users can create their own recommenders"
  ON public.recommenders FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own recommenders" ON public.recommenders;
CREATE POLICY "Users can update their own recommenders"
  ON public.recommenders FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own recommenders" ON public.recommenders;
CREATE POLICY "Users can delete their own recommenders"
  ON public.recommenders FOR DELETE
  USING (auth.uid() = user_id);

-- recommendation_requests: owner only, and both parents must be the caller's
ALTER TABLE public.recommendation_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own recommendation requests" ON public.recommendation_requests;
CREATE POLICY "Users can view their own recommendation requests"
  ON public.recommendation_requests FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own recommendation requests" ON public.recommendation_requests;
CREATE POLICY "Users can create their own recommendation requests"
  ON public.recommendation_requests FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND public.owns_application(application_id)
    AND public.owns_recommender(recommender_id)
  );

DROP POLICY IF EXISTS "Users can update their own recommendation requests" ON public.recommendation_requests;
CREATE POLICY "Users can update their own recommendation requests"
  ON public.recommendation_requests FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND public.owns_application(application_id)
    AND public.owns_recommender(recommender_id)
  );

DROP POLICY IF EXISTS "Users can delete their own recommendation requests" ON public.recommendation_requests;
CREATE POLICY "Users can delete their own recommendation requests"
  ON public.recommendation_requests FOR DELETE
  USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS tr_recommenders_updated_at ON public.recommenders;
CREATE TRIGGER tr_recommenders_updated_at
  BEFORE UPDATE ON public.recommenders
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS tr_recommendation_requests_updated_at ON public.recommendation_requests;
CREATE TRIGGER tr_recommendation_requests_updated_at
  BEFORE UPDATE ON public.recommendation_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

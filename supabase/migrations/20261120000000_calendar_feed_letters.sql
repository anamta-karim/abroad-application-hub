-- -----------------------------------------------------------------------------
-- Migration: 20261120000000_calendar_feed_letters.sql
-- Description: Recommendation letters in the private calendar feed.
--   letter:     an open letter's due date (its own, else the application deadline)
--   letter_ask: four weeks before that, for letters not asked for yet
-- Same function as 20261115000000_calendar_feeds.sql with two more event kinds.
-- Requires 20261119000000_recommendation_letters.sql.
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.calendar_feed_events(feed_token TEXT)
RETURNS TABLE (
  kind TEXT,
  item_id UUID,
  event_date DATE,
  title TEXT,
  detail TEXT,
  application_id UUID
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  feed_user UUID;
BEGIN
  IF feed_token IS NULL OR length(feed_token) < 32 THEN
    RAISE EXCEPTION 'invalid_feed' USING ERRCODE = 'P0002';
  END IF;

  SELECT f.user_id INTO feed_user FROM public.calendar_feeds f WHERE f.token = feed_token;
  IF feed_user IS NULL THEN
    RAISE EXCEPTION 'invalid_feed' USING ERRCODE = 'P0002';
  END IF;

  RETURN QUERY
    SELECT 'deadline'::TEXT, a.id, a.deadline, a.title, a.institution_or_provider, a.id
    FROM public.applications a
    WHERE a.user_id = feed_user
      AND a.archived_at IS NULL
      AND a.deadline IS NOT NULL
      AND a.deadline >= current_date - 60
      AND a.status NOT IN ('rejected', 'withdrawn')
  UNION ALL
    SELECT 'task'::TEXT, t.id, t.due_date, t.title, a.title, t.application_id
    FROM public.tasks t
    JOIN public.applications a ON a.id = t.application_id
    WHERE t.user_id = feed_user
      AND t.due_date IS NOT NULL
      AND t.due_date >= current_date - 60
      AND t.status IN ('open', 'in_progress')
  UNION ALL
    SELECT 'document'::TEXT, r.id, r.due_date, r.document_type, a.title, r.application_id
    FROM public.document_requirements r
    JOIN public.applications a ON a.id = r.application_id
    WHERE r.user_id = feed_user
      AND r.due_date IS NOT NULL
      AND r.due_date >= current_date - 60
      AND r.status IN ('not_started', 'in_progress', 'requested')
  UNION ALL
    SELECT 'opening'::TEXT, o.id, o.expected_open_date, o.title, o.institution_or_provider, NULL::UUID
    FROM public.opening_reminders o
    WHERE o.user_id = feed_user
      AND o.status = 'watching'
      AND o.expected_open_date >= current_date - 60
  UNION ALL
    SELECT 'letter'::TEXT, l.id, COALESCE(l.due_on, a.deadline), rc.name, a.title, l.application_id
    FROM public.recommendation_requests l
    JOIN public.applications a ON a.id = l.application_id
    JOIN public.recommenders rc ON rc.id = l.recommender_id
    WHERE l.user_id = feed_user
      AND l.status IN ('to_ask', 'asked', 'agreed')
      AND a.archived_at IS NULL
      AND a.status NOT IN ('rejected', 'withdrawn')
      AND COALESCE(l.due_on, a.deadline) IS NOT NULL
      AND COALESCE(l.due_on, a.deadline) >= current_date - 60
  UNION ALL
    SELECT 'letter_ask'::TEXT, l.id, COALESCE(l.due_on, a.deadline) - 28, rc.name, a.title, l.application_id
    FROM public.recommendation_requests l
    JOIN public.applications a ON a.id = l.application_id
    JOIN public.recommenders rc ON rc.id = l.recommender_id
    WHERE l.user_id = feed_user
      AND l.status = 'to_ask'
      AND a.archived_at IS NULL
      AND a.status NOT IN ('rejected', 'withdrawn')
      AND COALESCE(l.due_on, a.deadline) IS NOT NULL
      AND COALESCE(l.due_on, a.deadline) - 28 >= current_date - 60;
END;
$$;

REVOKE ALL ON FUNCTION public.calendar_feed_events(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.calendar_feed_events(TEXT) TO anon, authenticated;

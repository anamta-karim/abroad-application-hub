-- -----------------------------------------------------------------------------
-- Migration: 20261115000000_calendar_feeds.sql
-- Description: Private calendar (iCalendar / .ics) subscription feeds.
--
-- Calendar apps (Google, Apple, Outlook) fetch a feed URL without a login
-- session, so the feed is protected by a long random secret token in the URL.
-- calendar_feed_events() is SECURITY DEFINER: it can read the token owner's
-- dates, but only returns rows for the user whose token matches, and only the
-- fields the feed needs. Regenerating the token invalidates the old URL.
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.calendar_feeds (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE CHECK (length(token) >= 32),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.calendar_feeds ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own calendar feed" ON public.calendar_feeds;
CREATE POLICY "Users can view their own calendar feed"
  ON public.calendar_feeds FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own calendar feed" ON public.calendar_feeds;
CREATE POLICY "Users can create their own calendar feed"
  ON public.calendar_feeds FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own calendar feed" ON public.calendar_feeds;
CREATE POLICY "Users can update their own calendar feed"
  ON public.calendar_feeds FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own calendar feed" ON public.calendar_feeds;
CREATE POLICY "Users can delete their own calendar feed"
  ON public.calendar_feeds FOR DELETE
  USING (auth.uid() = user_id);

-- Returns the feed owner's upcoming and recent dates. Raises 'invalid_feed'
-- (SQLSTATE P0002) for an unknown token so the route can answer 404.
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
      AND o.expected_open_date >= current_date - 60;
END;
$$;

REVOKE ALL ON FUNCTION public.calendar_feed_events(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.calendar_feed_events(TEXT) TO anon, authenticated;

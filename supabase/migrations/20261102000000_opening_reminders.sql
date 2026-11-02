-- -----------------------------------------------------------------------------
-- Migration: 20261102000000_opening_reminders.sql
-- Description: Adds intake opening reminders / watchlist for prospective applications
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.opening_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  record_type TEXT NOT NULL CHECK (record_type IN ('program', 'scholarship')),
  institution_or_provider TEXT NULL,
  expected_open_date DATE NOT NULL,
  target_cycle TEXT NULL,
  official_url TEXT NULL,
  notes TEXT NULL,
  status TEXT NOT NULL CHECK (status IN ('watching', 'opened', 'converted', 'dismissed')) DEFAULT 'watching',
  converted_application_id UUID NULL REFERENCES public.applications(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.opening_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own opening reminders"
  ON public.opening_reminders FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own opening reminders"
  ON public.opening_reminders FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own opening reminders"
  ON public.opening_reminders FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own opening reminders"
  ON public.opening_reminders FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_opening_reminders_user_date ON public.opening_reminders (user_id, expected_open_date);

CREATE TRIGGER tr_opening_reminders_updated_at
  BEFORE UPDATE ON public.opening_reminders
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Migration: 20261116000000_email_reminders.sql
-- Description: Opt-in daily email reminders.
--   reminder_settings: one row per user who has turned email reminders on/off.
--   reminder_log: which reminder (e.g. "deadline:<id>:7") was emailed, so the
--                 daily job never sends the same reminder twice.
-- The daily job runs server-side with the service-role key; users can only see
-- and change their own rows.
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.reminder_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email_enabled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.reminder_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own reminder settings" ON public.reminder_settings;
CREATE POLICY "Users can view their own reminder settings"
  ON public.reminder_settings FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own reminder settings" ON public.reminder_settings;
CREATE POLICY "Users can create their own reminder settings"
  ON public.reminder_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own reminder settings" ON public.reminder_settings;
CREATE POLICY "Users can update their own reminder settings"
  ON public.reminder_settings FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own reminder settings" ON public.reminder_settings;
CREATE POLICY "Users can delete their own reminder settings"
  ON public.reminder_settings FOR DELETE
  USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS tr_reminder_settings_updated_at ON public.reminder_settings;
CREATE TRIGGER tr_reminder_settings_updated_at
  BEFORE UPDATE ON public.reminder_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.reminder_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_key TEXT NOT NULL,
  sent_on DATE NOT NULL DEFAULT current_date,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_reminder_log_item UNIQUE (user_id, item_key)
);

ALTER TABLE public.reminder_log ENABLE ROW LEVEL SECURITY;

-- Users may see and clear their own log; only the server job (service role) writes it.
DROP POLICY IF EXISTS "Users can view their own reminder log" ON public.reminder_log;
CREATE POLICY "Users can view their own reminder log"
  ON public.reminder_log FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own reminder log" ON public.reminder_log;
CREATE POLICY "Users can delete their own reminder log"
  ON public.reminder_log FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_reminder_log_user ON public.reminder_log (user_id);

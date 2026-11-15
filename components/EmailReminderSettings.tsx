"use client";

import { useState, useTransition } from "react";
import { setEmailRemindersAction } from "@/app/app/settings/actions";
import { runAction } from "@/lib/client/runAction";
import { InlineError } from "@/components/InlineError";

interface Props {
  initialEnabled: boolean;
  email: string | null;
  /** False when the server has no email provider or service key configured. */
  sendingConfigured: boolean;
  migrationMissing: boolean;
}

export function EmailReminderSettings({ initialEnabled, email, sendingConfigured, migrationMissing }: Props) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function toggle(next: boolean) {
    setError(null);
    setEnabled(next); // optimistic
    startTransition(async () => {
      const err = await runAction(() => setEmailRemindersAction(next));
      if (err) {
        setEnabled(!next);
        setError(err);
      }
    });
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-ink-muted leading-relaxed">
        One email a day, only when something is due: deadlines 14, 7, 3 and 1 days before and on the day, tasks and
        documents due tomorrow or today, and watchlist programs expected to open. Each reminder is sent once.
      </p>

      {migrationMissing && (
        <p role="alert" className="p-3 text-xs rounded-xl bg-amber-50 border border-amber-200 text-amber-900">
          Run the <code>20261116000000_email_reminders.sql</code> migration in the Supabase SQL Editor to turn this on.
        </p>
      )}
      {!sendingConfigured && !migrationMissing && (
        <p className="p-3 text-xs rounded-xl bg-amber-50 border border-amber-200 text-amber-900">
          Email sending isn&apos;t set up on this server yet, so no emails will go out even if this is on.
        </p>
      )}

      <InlineError message={error} onDismiss={() => setError(null)} />

      <label className="flex items-center gap-3 cursor-pointer w-fit">
        <input
          type="checkbox"
          role="switch"
          aria-checked={enabled}
          checked={enabled}
          disabled={isPending || migrationMissing}
          onChange={(e) => toggle(e.target.checked)}
          className="w-4 h-4 accent-[var(--brand-blue)] cursor-pointer"
        />
        <span className="text-sm font-semibold text-ink-deep">
          Email me reminders{email ? <span className="font-normal text-ink-muted"> at {email}</span> : null}
        </span>
        {isPending && <span className="text-[11px] text-ink-muted">Saving…</span>}
      </label>
    </div>
  );
}

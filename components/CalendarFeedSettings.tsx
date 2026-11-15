"use client";

import { useState, useTransition } from "react";
import { regenerateCalendarFeedAction, disableCalendarFeedAction } from "@/app/app/settings/actions";

interface Props {
  /** Existing token, if the user already turned the feed on. */
  initialToken: string | null;
  /** Public origin of the app, e.g. https://myapp.vercel.app */
  origin: string;
  /** True when the feed table isn't in the database yet. */
  migrationMissing: boolean;
}

export function CalendarFeedSettings({ initialToken, origin, migrationMissing }: Props) {
  const [token, setToken] = useState<string | null>(initialToken);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [confirming, setConfirming] = useState<"regenerate" | "off" | null>(null);
  const [isPending, startTransition] = useTransition();

  const feedUrl = token ? `${origin}/api/calendar/${token}.ics` : null;
  const webcalUrl = feedUrl ? feedUrl.replace(/^https?:\/\//, "webcal://") : null;
  const isLocal = /\/\/(localhost|127\.0\.0\.1|\[::1\])(:|\/|$)/.test(origin);

  function run(action: () => Promise<{ error?: string; token?: string | null }>) {
    setError(null);
    setCopied(false);
    setConfirming(null);
    startTransition(async () => {
      const res = await action();
      if (res.error) setError(res.error);
      else setToken(res.token ?? null);
    });
  }

  async function copy() {
    if (!feedUrl) return;
    try {
      await navigator.clipboard.writeText(feedUrl);
      setCopied(true);
    } catch {
      setError("Couldn't copy automatically. Select the link and copy it.");
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-ink-muted leading-relaxed">
        Subscribe once in Google Calendar, Apple Calendar or Outlook, and your application deadlines, task and
        document due dates, recommendation letters (when to ask and when they&apos;re due), and expected openings appear there and update automatically (usually within a few
        hours). Apple Calendar and Outlook also remind you 7 days and 1 day before each deadline.
      </p>

      {migrationMissing && (
        <p role="alert" className="p-3 text-xs rounded-xl bg-amber-50 border border-amber-200 text-amber-900">
          Run the <code>20261115000000_calendar_feeds.sql</code> migration in the Supabase SQL Editor to turn this on.
        </p>
      )}

      {error && (
        <p role="alert" className="p-3 text-xs rounded-xl bg-red-50 border border-red-200 text-red-800">
          {error}
        </p>
      )}

      {!feedUrl ? (
        <button
          type="button"
          disabled={isPending || migrationMissing}
          onClick={() => run(regenerateCalendarFeedAction)}
          className="h-10 px-5 text-xs font-bold text-white bg-gradient-to-r from-brand to-brand-dark rounded-xl shadow-sm disabled:opacity-50 cursor-pointer"
        >
          {isPending ? "Creating…" : "Create my calendar link"}
        </button>
      ) : (
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              readOnly
              value={feedUrl}
              aria-label="Private calendar feed link"
              onFocus={(e) => e.currentTarget.select()}
              className="flex-1 min-w-0 h-10 px-3 text-xs font-mono glass-input rounded-xl text-ink-deep"
            />
            <button
              type="button"
              onClick={copy}
              className="h-10 px-4 text-xs font-bold text-white bg-gradient-to-r from-brand to-brand-dark rounded-xl shadow-sm cursor-pointer whitespace-nowrap"
            >
              {copied ? "Copied ✓" : "Copy link"}
            </button>
          </div>

          {isLocal && (
            <p className="text-[11px] text-amber-800">
              This is a localhost link, so online calendars such as Google can&apos;t reach it. Create the link from your
              deployed site instead.
            </p>
          )}

          <ul className="text-xs text-ink-muted space-y-1.5 list-disc pl-5">
            <li>
              <strong className="text-ink-deep">Google Calendar</strong> (on a computer): Other calendars → + → From URL →
              paste the link.
            </li>
            <li>
              <strong className="text-ink-deep">iPhone / Mac</strong>:{" "}
              <a href={webcalUrl!} className="font-bold text-brand hover:text-brand-dark">
                Subscribe on this device
              </a>{" "}
              or Settings → Calendar → Accounts → Add Subscribed Calendar.
            </li>
            <li>
              <strong className="text-ink-deep">Outlook</strong>: Add calendar → Subscribe from web → paste the link.
            </li>
          </ul>

          <p className="text-[11px] text-ink-subtle">
            Anyone with this link can see your deadline titles and dates, so treat it like a password. If it leaks,
            regenerate it.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            {confirming ? (
              <>
                <span className="text-xs text-ink-deep">Calendars using the current link will stop updating.</span>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => run(confirming === "off" ? disableCalendarFeedAction : regenerateCalendarFeedAction)}
                  className="text-xs font-bold text-red-700 hover:text-red-800 cursor-pointer"
                >
                  {isPending ? "Working…" : confirming === "off" ? "Yes, turn off" : "Yes, regenerate"}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirming(null)}
                  className="text-xs font-bold text-ink-muted hover:text-ink-deep cursor-pointer"
                >
                  Cancel
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setConfirming("regenerate")}
                  className="text-xs font-bold text-ink-muted hover:text-ink-deep cursor-pointer"
                >
                  Regenerate link
                </button>
                <button
                  type="button"
                  onClick={() => setConfirming("off")}
                  className="text-xs font-bold text-ink-muted hover:text-red-700 cursor-pointer"
                >
                  Turn off
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import {
  convertReminderToApplicationAction,
  deleteOpeningReminderAction,
} from "@/app/app/applications/actions";
import type { OpeningReminder } from "@/types/database";

interface OpeningNudgeBannerProps {
  reminders: OpeningReminder[];
}

export function OpeningNudgeBanner({ reminders }: OpeningNudgeBannerProps) {
  const [pendingId, setPendingId] = useState<string | null>(null);

  if (!reminders || reminders.length === 0) return null;

  const now = new Date();
  const todayDateStr = now.toISOString().split("T")[0];

  // Filter reminders due to open today or within next 7 days, or recently opened
  const dueReminders = reminders.filter((r) => {
    if (r.status === "converted" || r.status === "dismissed") return false;
    const openDate = new Date(r.expected_open_date);
    const diffDays = Math.ceil((openDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    // Alert if open date is within 7 days, or up to 30 days past expected opening
    return diffDays <= 7 && diffDays >= -30;
  });

  if (dueReminders.length === 0) return null;

  async function handleConvert(id: string) {
    setPendingId(id);
    await convertReminderToApplicationAction(id);
    setPendingId(null);
  }

  async function handleDismiss(id: string) {
    setPendingId(id);
    await deleteOpeningReminderAction(id);
    setPendingId(null);
  }

  return (
    <div className="space-y-3">
      {dueReminders.map((reminder) => {
        const openDate = new Date(reminder.expected_open_date);
        const diffDays = Math.ceil((openDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        const timingLabel =
          diffDays < 0
            ? `Expected ${Math.abs(diffDays)} days ago`
            : diffDays === 0
            ? "Expected to open today!"
            : diffDays === 1
            ? "Expected to open tomorrow"
            : `Expected in ${diffDays} days`;

        return (
          <div
            key={reminder.id}
            className="glass-card rounded-2xl p-4 sm:p-5 border border-brand/30 bg-white/75 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4"
          >
            <div className="flex items-start space-x-3.5 min-w-0">
              <div className="w-10 h-10 rounded-xl glass-badge-teal flex items-center justify-center font-bold text-lg flex-shrink-0">
                🔔
              </div>
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="glass-badge-blue px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">
                    {reminder.record_type} Opening Alert
                  </span>
                  <span className="text-xs font-bold text-teal-dark">
                    {timingLabel}
                  </span>
                </div>
                <h4 className="font-heading font-extrabold text-sm text-ink-deep truncate">
                  {reminder.title}
                </h4>
                <p className="text-xs text-ink-muted">
                  {reminder.institution_or_provider ? `${reminder.institution_or_provider} &bull; ` : ""}
                  Check if the application portal has officially opened for submissions.
                </p>
                {reminder.notes && (
                  <p className="text-[11px] text-ink-subtle italic">
                    Note: {reminder.notes}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2.5 self-end sm:self-center flex-shrink-0">
              {reminder.official_url && (
                <a
                  href={reminder.official_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-xl text-xs font-bold text-ink-muted hover:text-ink-deep glass-card hover:bg-white transition-all min-h-[36px] flex items-center"
                >
                  Check Portal &rarr;
                </a>
              )}
              <button
                onClick={() => handleConvert(reminder.id)}
                disabled={pendingId === reminder.id}
                className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-brand to-brand-dark hover:from-brand-hover hover:to-brand shadow-sm active:scale-95 transition-all min-h-[36px] cursor-pointer disabled:opacity-50"
              >
                {pendingId === reminder.id ? "Converting..." : "+ Start Tracking"}
              </button>
              <button
                onClick={() => handleDismiss(reminder.id)}
                disabled={pendingId === reminder.id}
                className="p-1.5 text-xs text-ink-subtle hover:text-ink-muted rounded-lg"
                title="Dismiss reminder"
              >
                &times;
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

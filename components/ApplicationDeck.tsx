"use client";

import { useState } from "react";
import Link from "next/link";
import {
  rolloverDeadlineAction,
  unarchiveApplicationAction,
  updateStatusQuickAction,
  deleteOpeningReminderAction,
  convertReminderToApplicationAction,
} from "@/app/app/applications/actions";
import { OpeningReminderModal } from "@/components/OpeningReminderModal";
import type { ApplicationStatus, RecordType, OpeningReminder } from "@/types/database";

interface ApplicationItem {
  id: string;
  title: string;
  record_type: RecordType;
  institution_or_provider: string | null;
  status: ApplicationStatus;
  deadline: string | null;
  verification_state: string;
  degree_level: string | null;
  country: string | null;
  archived_at: string | null;
  updated_at: string;
}

interface DocRequirementItem {
  id: string;
  application_id: string;
  status: string;
}

interface ApplicationDeckProps {
  applications: ApplicationItem[];
  docRequirements: DocRequirementItem[];
  reminders: OpeningReminder[];
}

export function ApplicationDeck({
  applications,
  docRequirements,
  reminders,
}: ApplicationDeckProps) {
  const [activeTab, setActiveTab] = useState<"active" | "archived" | "watchlist">("active");
  const [rolloverAppId, setRolloverAppId] = useState<string | null>(null);
  const [newDeadlineInput, setNewDeadlineInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const now = new Date();
  const todayDateStr = now.toISOString().split("T")[0];

  // An application is considered archived/past-due if:
  // 1. archived_at is explicitly set, OR
  // 2. deadline is before today AND status is still researching or preparing (uncompleted past deadline)
  const isPastDueUncompleted = (app: ApplicationItem) => {
    if (app.archived_at) return true;
    if (app.deadline && app.deadline < todayDateStr) {
      return app.status === "researching" || app.status === "preparing";
    }
    return false;
  };

  const activeApps = applications.filter((app) => !isPastDueUncompleted(app));
  const archivedApps = applications.filter((app) => isPastDueUncompleted(app));
  const activeReminders = reminders.filter((r) => r.status !== "converted" && r.status !== "dismissed");

  async function handleRollover(appId: string) {
    if (!newDeadlineInput) return;
    setIsSubmitting(true);
    await rolloverDeadlineAction(appId, newDeadlineInput);
    setRolloverAppId(null);
    setNewDeadlineInput("");
    setIsSubmitting(false);
  }

  async function handleMarkSubmitted(appId: string) {
    setIsSubmitting(true);
    await updateStatusQuickAction(appId, "submitted");
    await unarchiveApplicationAction(appId);
    setIsSubmitting(false);
  }

  async function handleRestore(appId: string) {
    setIsSubmitting(true);
    await unarchiveApplicationAction(appId);
    setIsSubmitting(false);
  }

  async function handleConvertReminder(reminderId: string) {
    setIsSubmitting(true);
    await convertReminderToApplicationAction(reminderId);
    setIsSubmitting(false);
  }

  async function handleDeleteReminder(reminderId: string) {
    setIsSubmitting(true);
    await deleteOpeningReminderAction(reminderId);
    setIsSubmitting(false);
  }

  return (
    <div className="space-y-5">
      {/* ── Deck Navigation Tabs ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-glass-borderSubtle pb-2">
        <div className="flex items-center space-x-1 sm:space-x-2 text-xs font-bold">
          <button
            onClick={() => setActiveTab("active")}
            className={`px-3.5 py-2 rounded-xl transition-all cursor-pointer min-h-[38px] flex items-center space-x-1.5 ${
              activeTab === "active"
                ? "glass-nav-active font-extrabold"
                : "text-ink-muted hover:text-ink-deep bg-white/30"
            }`}
          >
            <span>Active Progress</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-white/60">
              {activeApps.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("archived")}
            className={`px-3.5 py-2 rounded-xl transition-all cursor-pointer min-h-[38px] flex items-center space-x-1.5 ${
              activeTab === "archived"
                ? "glass-nav-active font-extrabold"
                : "text-ink-muted hover:text-ink-deep bg-white/30"
            }`}
          >
            <span>Archived &amp; Past Due</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-white/60">
              {archivedApps.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("watchlist")}
            className={`px-3.5 py-2 rounded-xl transition-all cursor-pointer min-h-[38px] flex items-center space-x-1.5 ${
              activeTab === "watchlist"
                ? "glass-nav-active font-extrabold"
                : "text-ink-muted hover:text-ink-deep bg-white/30"
            }`}
          >
            <span>Opening Watchlist</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-white/60">
              {activeReminders.length}
            </span>
          </button>
        </div>

        {activeTab === "watchlist" && <OpeningReminderModal />}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* TAB 1: ACTIVE APPLICATIONS                                          */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {activeTab === "active" && (
        <div className="space-y-3">
          {activeApps.length === 0 ? (
            <div className="glass-card rounded-2xl p-8 text-center text-xs text-ink-muted space-y-3">
              <p className="font-semibold text-ink-deep text-sm">No active applications currently ongoing.</p>
              <p>Check your Archived &amp; Past Due tab or set reminders on your Opening Watchlist.</p>
              <div className="pt-2">
                <Link
                  href="/app/applications/new"
                  className="inline-flex items-center px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-brand to-brand-dark shadow-sm"
                >
                  + Add application
                </Link>
              </div>
            </div>
          ) : (
            activeApps.map((app) => {
              const appDocs = docRequirements.filter((d) => d.application_id === app.id);
              const appTotalDocs = appDocs.length;
              const appReadyDocs = appDocs.filter(
                (d) => d.status === "ready" || d.status === "submitted"
              ).length;
              const progressPct =
                appTotalDocs > 0 ? Math.round((appReadyDocs / appTotalDocs) * 100) : 0;

              return (
                <div
                  key={app.id}
                  className="glass-card rounded-2xl p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all hover:bg-white/80"
                >
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2.5 py-0.5 rounded-lg text-[11px] font-bold ${
                          app.record_type === "scholarship"
                            ? "glass-badge-teal"
                            : "glass-badge-blue"
                        }`}
                      >
                        {app.record_type === "scholarship" ? "Scholarship" : "Program"}
                      </span>
                      <h3 className="font-heading font-extrabold text-base text-ink-deep truncate">
                        <Link
                          href={`/app/applications/${app.id}`}
                          className="hover:text-brand transition-colors"
                        >
                          {app.title}
                        </Link>
                      </h3>
                    </div>

                    <p className="text-xs text-ink-muted">
                      {[app.institution_or_provider, app.degree_level, app.country]
                        .filter(Boolean)
                        .join(" \u2022 ")}
                    </p>

                    <div className="flex items-center gap-3 pt-1 text-xs text-ink-muted">
                      {appTotalDocs > 0 ? (
                        <span>
                          {appReadyDocs}/{appTotalDocs} docs ({progressPct}%)
                        </span>
                      ) : (
                        <span>No documents tracked</span>
                      )}
                      {app.deadline && (
                        <span className="text-ink-deep font-semibold">
                          &bull; Target Deadline: {app.deadline}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-center flex-shrink-0">
                    <span className="glass-badge-neutral px-2.5 py-1 rounded-lg text-xs font-semibold capitalize">
                      {app.status.replace("_", " ")}
                    </span>
                    <Link
                      href={`/app/applications/${app.id}`}
                      className="px-3.5 py-1.5 text-xs font-bold text-brand hover:text-brand-dark glass-input rounded-xl hover:bg-white transition-colors"
                    >
                      View &rarr;
                    </Link>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* TAB 2: ARCHIVED & PAST DUE APPLICATIONS                             */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {activeTab === "archived" && (
        <div className="space-y-3">
          <div className="glass-card-subtle rounded-xl p-3.5 text-xs text-ink-muted flex items-center space-x-2">
            <span>ℹ️</span>
            <span>
              Applications whose target deadline has passed without completion are automatically archived so your active workspace stays focused. You can rollover the deadline to the next intake cycle or restore them.
            </span>
          </div>

          {archivedApps.length === 0 ? (
            <div className="glass-card rounded-2xl p-8 text-center text-xs text-ink-muted">
              No archived or past-due applications.
            </div>
          ) : (
            archivedApps.map((app) => (
              <div
                key={app.id}
                className="glass-card rounded-2xl p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 opacity-90 hover:opacity-100 transition-opacity"
              >
                <div className="space-y-1.5 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-slate-200/80 text-ink-muted">
                      {app.archived_at ? "Manually Archived" : "Past Deadline (Uncompleted)"}
                    </span>
                    <h3 className="font-heading font-bold text-base text-ink-deep truncate">
                      <Link
                        href={`/app/applications/${app.id}`}
                        className="hover:text-brand transition-colors"
                      >
                        {app.title}
                      </Link>
                    </h3>
                  </div>

                  <p className="text-xs text-ink-muted">
                    {[app.institution_or_provider, app.country].filter(Boolean).join(" \u2022 ")}
                    {app.deadline && ` &bull; Expired on: ${app.deadline}`}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 self-end sm:self-center flex-shrink-0">
                  {rolloverAppId === app.id ? (
                    <div className="flex items-center gap-1.5 bg-white/90 p-1.5 rounded-xl border border-glass-border">
                      <input
                        type="date"
                        value={newDeadlineInput}
                        onChange={(e) => setNewDeadlineInput(e.target.value)}
                        className="text-xs p-1 rounded-lg border border-slate-200"
                      />
                      <button
                        onClick={() => handleRollover(app.id)}
                        disabled={isSubmitting || !newDeadlineInput}
                        className="px-2.5 py-1 text-xs font-bold text-white bg-brand rounded-lg disabled:opacity-50"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setRolloverAppId(null)}
                        className="px-1.5 py-1 text-xs text-ink-subtle hover:text-ink-deep"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setRolloverAppId(app.id)}
                      className="px-3 py-1.5 text-xs font-bold text-brand glass-input rounded-xl hover:bg-white"
                    >
                      Rollover Next Cycle
                    </button>
                  )}

                  <button
                    onClick={() => handleMarkSubmitted(app.id)}
                    disabled={isSubmitting}
                    className="px-3 py-1.5 text-xs font-bold text-teal-dark glass-badge-teal rounded-xl hover:bg-teal-light"
                  >
                    Mark Submitted
                  </button>

                  <button
                    onClick={() => handleRestore(app.id)}
                    disabled={isSubmitting}
                    className="px-3 py-1.5 text-xs font-bold text-ink-muted glass-card rounded-xl hover:bg-white"
                  >
                    Restore
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* TAB 3: OPENING REMINDERS WATCHLIST                                  */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {activeTab === "watchlist" && (
        <div className="space-y-3">
          <div className="glass-card-subtle rounded-xl p-3.5 text-xs text-ink-muted flex items-center justify-between gap-2">
            <span>
              Watch prospective degree programs and scholarships based on past opening trends. When the date arrives, a nudge alert helps you verify if the portal is open and convert it into an official application.
            </span>
          </div>

          {activeReminders.length === 0 ? (
            <div className="glass-card rounded-2xl p-8 text-center text-xs text-ink-muted space-y-2">
              <p className="font-semibold text-ink-deep text-sm">No applications on your opening watchlist yet.</p>
              <p>Add expected openings for programs that aren&apos;t open for submissions yet.</p>
            </div>
          ) : (
            activeReminders.map((reminder) => {
              const openDate = new Date(reminder.expected_open_date);
              const diffDays = Math.ceil(
                (openDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
              );
              const isDue = diffDays <= 0;

              return (
                <div
                  key={reminder.id}
                  className="glass-card rounded-2xl p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="glass-badge-blue px-2 py-0.5 rounded text-[10px] font-bold uppercase">
                        {reminder.record_type} Watchlist
                      </span>
                      <h4 className="font-heading font-extrabold text-base text-ink-deep truncate">
                        {reminder.title}
                      </h4>
                    </div>

                    <p className="text-xs text-ink-muted">
                      {reminder.institution_or_provider ? `${reminder.institution_or_provider} &bull; ` : ""}
                      {reminder.target_cycle ? `Intake: ${reminder.target_cycle} &bull; ` : ""}
                      Expected opening: <strong className="text-ink-deep">{reminder.expected_open_date}</strong>
                    </p>

                    {reminder.notes && (
                      <p className="text-xs text-ink-subtle italic">Note: {reminder.notes}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-2.5 self-end sm:self-center flex-shrink-0">
                    <span
                      className={`px-2.5 py-1 rounded-xl text-xs font-bold ${
                        isDue ? "glass-badge-teal text-teal-dark font-extrabold" : "glass-badge-neutral"
                      }`}
                    >
                      {isDue
                        ? "Expected to be open!"
                        : diffDays === 1
                        ? "Opens tomorrow"
                        : `Opens in ${diffDays} days`}
                    </span>

                    {reminder.official_url && (
                      <a
                        href={reminder.official_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 text-xs font-bold text-ink-muted hover:text-ink-deep glass-card rounded-xl hover:bg-white"
                      >
                        Portal &rarr;
                      </a>
                    )}

                    <button
                      onClick={() => handleConvertReminder(reminder.id)}
                      disabled={isSubmitting}
                      className="px-3.5 py-1.5 text-xs font-bold text-white bg-gradient-to-r from-brand to-brand-dark rounded-xl shadow-sm hover:from-brand-hover hover:to-brand"
                    >
                      + Start Tracking
                    </button>

                    <button
                      onClick={() => handleDeleteReminder(reminder.id)}
                      disabled={isSubmitting}
                      className="p-1.5 text-xs text-ink-subtle hover:text-red-600 rounded-lg"
                      title="Remove reminder"
                    >
                      &times;
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

"use client";

import { useState, useEffect, useActionState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  createApplicationAction,
  createOpeningReminderAction,
  type ActionResponse,
} from "@/app/app/applications/actions";

const initialState: ActionResponse = {};

export function NewApplicationForm() {
  const router = useRouter();
  const [entryMode, setEntryMode] = useState<"live" | "reminder">("live");

  const [liveState, liveAction, isLivePending] = useActionState(createApplicationAction, initialState);
  const [reminderState, reminderAction, isReminderPending] = useActionState(createOpeningReminderAction, initialState);

  useEffect(() => {
    if (reminderState?.success) {
      router.push("/app");
    }
  }, [reminderState?.success, router]);

  return (
    <div className="space-y-6">
      {/* ── Mode Selection: Live Application vs Opening Watchlist ── */}
      <div className="space-y-2">
        <label className="block text-xs font-bold text-ink-deep font-heading uppercase tracking-wider">
          What is the current status of this application?
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setEntryMode("live")}
            className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
              entryMode === "live"
                ? "border-brand bg-brand-soft/70 shadow-sm ring-2 ring-brand/30"
                : "border-glass-borderSubtle bg-white/40 hover:bg-white/70 text-ink-muted"
            }`}
          >
            <div className="flex items-center space-x-2">
              <span className="text-base">🟢</span>
              <span className="font-heading font-extrabold text-sm text-ink-deep">
                Application is Open
              </span>
            </div>
            <p className="text-xs text-ink-muted mt-1.5 leading-relaxed">
              The portal is currently open. Track submission milestones, required documents, and confirmed deadlines.
            </p>
          </button>

          <button
            type="button"
            onClick={() => setEntryMode("reminder")}
            className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
              entryMode === "reminder"
                ? "border-brand bg-brand-soft/70 shadow-sm ring-2 ring-brand/30"
                : "border-glass-borderSubtle bg-white/40 hover:bg-white/70 text-ink-muted"
            }`}
          >
            <div className="flex items-center space-x-2">
              <span className="text-base">🔔</span>
              <span className="font-heading font-extrabold text-sm text-ink-deep">
                Not Open Yet (Set Reminder)
              </span>
            </div>
            <p className="text-xs text-ink-muted mt-1.5 leading-relaxed">
              Submissions haven&apos;t started yet. Save an expected opening date to your Watchlist to get alerted when it launches.
            </p>
          </button>
        </div>
      </div>

      {/* ── MODE 1: LIVE APPLICATION FORM ── */}
      {entryMode === "live" && (
        <form action={liveAction} className="space-y-5 animate-fade-in">
          {liveState?.error && (
            <div
              className="p-3.5 text-xs rounded-xl bg-red-50/80 border border-red-200 text-red-800 font-medium"
              role="alert"
            >
              {liveState.error}
            </div>
          )}

          {/* Title */}
          <div className="space-y-1.5">
            <label htmlFor="live-title" className="block text-xs font-bold text-ink-deep font-heading">
              Application Title <span className="text-brand">*</span>
            </label>
            <input
              id="live-title"
              name="title"
              type="text"
              required
              placeholder="e.g. Master of Computer Science, Merit Scholarship"
              className="w-full h-11 px-3.5 text-sm glass-input rounded-xl"
            />
          </div>

          {/* Record Type */}
          <div className="space-y-1.5">
            <label htmlFor="live-recordType" className="block text-xs font-bold text-ink-deep font-heading">
              Type
            </label>
            <select
              id="live-recordType"
              name="recordType"
              defaultValue="program"
              className="w-full h-11 px-3.5 text-sm glass-input rounded-xl bg-white/90"
            >
              <option value="program">University Degree Program</option>
              <option value="scholarship">Scholarship / Fellowship</option>
            </select>
          </div>

          {/* Grid: Institution & Country */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="live-institution" className="block text-xs font-bold text-ink-deep font-heading">
                University / Provider
              </label>
              <input
                id="live-institution"
                name="institution"
                type="text"
                placeholder="e.g. University name or provider"
                className="w-full h-11 px-3.5 text-sm glass-input rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="live-country" className="block text-xs font-bold text-ink-deep font-heading">
                Country
              </label>
              <input
                id="live-country"
                name="country"
                type="text"
                placeholder="e.g. Germany"
                className="w-full h-11 px-3.5 text-sm glass-input rounded-xl"
              />
            </div>
          </div>

          {/* Grid: Degree & Deadline */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="live-degreeLevel" className="block text-xs font-bold text-ink-deep font-heading">
                Degree Level
              </label>
              <input
                id="live-degreeLevel"
                name="degreeLevel"
                type="text"
                placeholder="e.g. Master, PhD, Bachelor"
                className="w-full h-11 px-3.5 text-sm glass-input rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="live-deadline" className="block text-xs font-bold text-ink-deep font-heading">
                Target Submission Deadline <span className="text-brand">*</span>
              </label>
              <input
                id="live-deadline"
                name="deadline"
                type="date"
                required
                className="w-full h-11 px-3.5 text-sm glass-input rounded-xl"
              />
            </div>
          </div>

          {/* Official URL */}
          <div className="space-y-1.5">
            <label htmlFor="live-officialUrl" className="block text-xs font-bold text-ink-deep font-heading">
              Official Webpage URL (optional)
            </label>
            <input
              id="live-officialUrl"
              name="officialUrl"
              type="url"
              placeholder="https://..."
              className="w-full h-11 px-3.5 text-sm glass-input rounded-xl"
            />
            <p className="text-[11px] text-ink-muted">
              Official admissions portal link used for grounding requirements and verified dates.
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-glass-borderSubtle">
            <Link
              href="/app"
              className="px-4 py-2.5 text-xs font-bold text-ink-muted hover:text-ink-deep transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isLivePending}
              className="px-6 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-brand to-brand-dark hover:from-brand-hover hover:to-brand rounded-xl shadow-md shadow-brand/20 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
            >
              {isLivePending ? "Saving application..." : "Save Application"}
            </button>
          </div>
        </form>
      )}

      {/* ── MODE 2: OPENING REMINDER WATCHLIST FORM ── */}
      {entryMode === "reminder" && (
        <form action={reminderAction} className="space-y-5 animate-fade-in">
          {reminderState?.error && (
            <div
              className="p-3.5 text-xs rounded-xl bg-red-50/80 border border-red-200 text-red-800 font-medium"
              role="alert"
            >
              {reminderState.error}
            </div>
          )}

          {/* Title */}
          <div className="space-y-1.5">
            <label htmlFor="reminder-title" className="block text-xs font-bold text-ink-deep font-heading">
              Program or Scholarship Name <span className="text-brand">*</span>
            </label>
            <input
              id="reminder-title"
              name="title"
              type="text"
              required
              placeholder="e.g. Program or scholarship title"
              className="w-full h-11 px-3.5 text-sm glass-input rounded-xl"
            />
          </div>

          {/* Record Type */}
          <div className="space-y-1.5">
            <label htmlFor="reminder-recordType" className="block text-xs font-bold text-ink-deep font-heading">
              Type
            </label>
            <select
              id="reminder-recordType"
              name="recordType"
              defaultValue="scholarship"
              className="w-full h-11 px-3.5 text-sm glass-input rounded-xl bg-white/90"
            >
              <option value="scholarship">Scholarship / Fellowship</option>
              <option value="program">University Degree Program</option>
            </select>
          </div>

          {/* Grid: Institution & Target Cycle */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="reminder-institution" className="block text-xs font-bold text-ink-deep font-heading">
                University / Provider
              </label>
              <input
                id="reminder-institution"
                name="institution"
                type="text"
                placeholder="e.g. University name or scholarship provider"
                className="w-full h-11 px-3.5 text-sm glass-input rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="reminder-targetCycle" className="block text-xs font-bold text-ink-deep font-heading">
                Target Academic Cycle
              </label>
              <input
                id="reminder-targetCycle"
                name="targetCycle"
                type="text"
                placeholder="e.g. Fall 2026, Spring 2027"
                className="w-full h-11 px-3.5 text-sm glass-input rounded-xl"
              />
            </div>
          </div>

          {/* Expected Open Date */}
          <div className="space-y-1.5">
            <label htmlFor="reminder-expectedOpenDate" className="block text-xs font-bold text-ink-deep font-heading">
              Expected Portal Opening Date <span className="text-brand">*</span>
            </label>
            <input
              id="reminder-expectedOpenDate"
              name="expectedOpenDate"
              type="date"
              required
              className="w-full h-11 px-3.5 text-sm glass-input rounded-xl"
            />
            <p className="text-[11px] text-ink-muted">
              Estimated date based on previous annual cycles. You will receive an automated dashboard nudge alert when this date approaches.
            </p>
          </div>

          {/* Notes on Past Opening Trends */}
          <div className="space-y-1.5">
            <label htmlFor="reminder-notes" className="block text-xs font-bold text-ink-deep font-heading">
              Notes on Past Opening Trends (optional)
            </label>
            <textarea
              id="reminder-notes"
              name="notes"
              rows={2}
              placeholder="e.g. Expected announcement window or past cycle timeline"
              className="w-full p-3 text-sm glass-input rounded-xl"
            />
          </div>

          {/* Official Announcement URL */}
          <div className="space-y-1.5">
            <label htmlFor="reminder-officialUrl" className="block text-xs font-bold text-ink-deep font-heading">
              Announcement / Portal URL (optional)
            </label>
            <input
              id="reminder-officialUrl"
              name="officialUrl"
              type="url"
              placeholder="https://..."
              className="w-full h-11 px-3.5 text-sm glass-input rounded-xl"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-glass-borderSubtle">
            <Link
              href="/app"
              className="px-4 py-2.5 text-xs font-bold text-ink-muted hover:text-ink-deep transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isReminderPending}
              className="px-6 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-brand to-brand-dark hover:from-brand-hover hover:to-brand rounded-xl shadow-md shadow-brand/20 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
            >
              {isReminderPending ? "Saving reminder..." : "Set Opening Reminder"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

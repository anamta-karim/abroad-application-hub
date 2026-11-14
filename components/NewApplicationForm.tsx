"use client";

import { useState, useEffect, useActionState, startTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  createApplicationAction,
  createOpeningReminderAction,
  fetchAdmissionsDetailsAction,
  type ActionResponse,
} from "@/app/app/applications/actions";
import { CostFields } from "@/components/CostFields";
import {
  POPULAR_SCHOLARSHIP_PRESETS,
  type ScholarshipPreset,
} from "@/lib/admissions/presets";

const initialState: ActionResponse = {};

/** Fields that can be pre-filled, e.g. from a Discover search result link. */
export interface NewApplicationPrefill {
  title?: string;
  recordType?: "program" | "scholarship";
  institution?: string;
  country?: string;
  degreeLevel?: string;
  officialUrl?: string;
}

export function NewApplicationForm({ prefill = {} }: { prefill?: NewApplicationPrefill }) {
  const router = useRouter();
  const [entryMode, setEntryMode] = useState<"live" | "reminder">("live");

  // Controlled form state for 1-click autofill and editing
  const [fields, setFields] = useState({
    title: prefill.title || "",
    recordType: (prefill.recordType || "program") as "program" | "scholarship",
    institution: prefill.institution || "",
    country: prefill.country || "",
    degreeLevel: prefill.degreeLevel || "Master's",
    deadline: "",
    expectedOpenDate: "",
    targetCycle: "",
    officialUrl: prefill.officialUrl || "",
    notes: "",
  });

  const [autofillUrl, setAutofillUrl] = useState("");
  const [isFetchingUrl, setIsFetchingUrl] = useState(false);
  const [fetchSuccessMsg, setFetchSuccessMsg] = useState<string | null>(null);
  const [fetchErrorMsg, setFetchErrorMsg] = useState<string | null>(null);
  const [showPresets, setShowPresets] = useState(false);

  const [liveState, liveAction, isLivePending] = useActionState(createApplicationAction, initialState);
  const [reminderState, reminderAction, isReminderPending] = useActionState(createOpeningReminderAction, initialState);

  useEffect(() => {
    if (reminderState?.success) {
      router.push("/app");
    }
  }, [reminderState?.success, router]);

  async function handleFetchUrl(e?: React.FormEvent) {
    if (e) e.preventDefault();
    const url = autofillUrl.trim();
    if (!url) return;

    setIsFetchingUrl(true);
    setFetchSuccessMsg(null);
    setFetchErrorMsg(null);

    const res = await fetchAdmissionsDetailsAction(url);
    if (!res.success || !res.data) {
      setFetchErrorMsg(res.error || "Unable to extract admissions details from this URL. Please verify the link or enter details manually.");
    } else {
      const data = res.data;
      setFields((prev) => ({
        ...prev,
        title: data.title || prev.title,
        recordType: data.recordType || prev.recordType,
        institution: data.institution || prev.institution,
        country: data.country || prev.country,
        degreeLevel: data.degreeLevel || prev.degreeLevel,
        deadline: data.deadline || prev.deadline,
        expectedOpenDate: data.deadline || prev.expectedOpenDate,
        targetCycle: data.targetCycle || prev.targetCycle,
        officialUrl: data.officialUrl || url,
        notes: data.notes || prev.notes,
      }));
      setFetchSuccessMsg(`✨ Auto-filled: "${data.title}" at ${data.institution || "Institution"} (${data.country}). Review fields below.`);
    }

    setIsFetchingUrl(false);
  }

  function handleSelectPreset(preset: ScholarshipPreset) {
    setFields((prev) => ({
      ...prev,
      title: preset.title,
      recordType: preset.recordType,
      institution: preset.institution,
      country: preset.country,
      degreeLevel: preset.degreeLevel,
      targetCycle: preset.targetCycle,
      officialUrl: preset.officialUrl,
      notes: preset.notes,
    }));
    setFetchErrorMsg(null);
    setFetchSuccessMsg(`✨ 1-Click imported "${preset.title}". Enter your target deadline or cycle date below.`);
    setShowPresets(false);
  }

  return (
    <div className="space-y-6">
      {/* ── 1. Smart Autofill & Discovery API Bar ── */}
      <section className="glass-card rounded-2xl p-4 sm:p-5 space-y-3.5 border border-brand/25 bg-white/70 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="space-y-0.5">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-extrabold font-heading text-ink-deep flex items-center gap-1.5">
                <span>⚡</span>
                <span>Auto-Fill from Official Webpage</span>
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-soft text-brand-dark">
                Fast &amp; Accurate
              </span>
            </div>
            <p className="text-xs text-ink-muted">
              Paste any university prospectus or scholarship URL to extract details automatically.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowPresets(!showPresets)}
            className="text-xs font-bold text-brand hover:text-brand-dark transition-colors inline-flex items-center gap-1 self-start sm:self-auto cursor-pointer"
          >
            <span>{showPresets ? "Hide popular scholarships" : "Or browse open scholarships"}</span>
            <span>{showPresets ? "▲" : "▼"}</span>
          </button>
        </div>

        {/* URL Input Bar */}
        <form onSubmit={handleFetchUrl} className="flex flex-col sm:flex-row gap-2">
          <input
            type="url"
            value={autofillUrl}
            onChange={(e) => setAutofillUrl(e.target.value)}
            placeholder="https://www.university.ac.uk/admissions/msc-program..."
            className="flex-1 h-10 px-3.5 text-xs sm:text-sm glass-input rounded-xl text-ink-deep placeholder:text-ink-subtle"
          />
          <button
            type="submit"
            disabled={isFetchingUrl || !autofillUrl.trim()}
            className="h-10 px-4 text-xs font-bold text-white bg-gradient-to-r from-brand to-brand-dark hover:from-brand-hover hover:to-brand rounded-xl shadow-sm transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center space-x-1.5 whitespace-nowrap"
          >
            <span>{isFetchingUrl ? "Extracting..." : "Auto-Fill Details"}</span>
            <span aria-hidden="true">&rarr;</span>
          </button>
        </form>

        {/* Feedback Alerts */}
        {fetchSuccessMsg && (
          <div className="p-3 text-xs rounded-xl bg-teal-50 border border-teal-200 text-teal-900 font-medium animate-fade-in flex items-center justify-between">
            <span>{fetchSuccessMsg}</span>
            <button
              type="button"
              onClick={() => setFetchSuccessMsg(null)}
              className="text-teal-700 hover:text-teal-900 text-sm font-bold ml-2"
            >
              &times;
            </button>
          </div>
        )}

        {fetchErrorMsg && (
          <div className="p-3 text-xs rounded-xl bg-amber-50 border border-amber-200 text-amber-900 font-medium animate-fade-in flex items-center justify-between">
            <span>{fetchErrorMsg}</span>
            <button
              type="button"
              onClick={() => setFetchErrorMsg(null)}
              className="text-amber-700 hover:text-amber-900 text-sm font-bold ml-2"
            >
              &times;
            </button>
          </div>
        )}

        {/* Open Scholarships Directory (1-Click Presets) */}
        {showPresets && (
          <div className="pt-2 border-t border-glass-borderSubtle space-y-2 animate-fade-in">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-ink-subtle block font-heading">
                1-Click Popular Scholarships Directory
              </span>
              <Link href="/app/discover" className="text-[11px] font-bold text-brand hover:text-brand-dark">
                Search universities &amp; programs →
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-52 overflow-y-auto pr-1">
              {POPULAR_SCHOLARSHIP_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleSelectPreset(preset)}
                  className="p-2.5 rounded-xl border border-glass-borderSubtle bg-white/50 hover:bg-white text-left transition-all hover:border-brand/40 group cursor-pointer"
                >
                  <div className="flex items-center justify-between text-xs font-bold text-ink-deep group-hover:text-brand">
                    <span className="truncate pr-1">{preset.title}</span>
                    <span className="text-[10px] text-ink-muted shrink-0">{preset.country}</span>
                  </div>
                  <p className="text-[11px] text-ink-muted truncate mt-0.5">
                    {preset.institution}
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* ── 2. Mode Selection: Live Application vs Opening Watchlist ── */}
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
        <form
          onSubmit={(e) => {
            // Keep typed values (incl. uncontrolled cost fields) if the server returns an error
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            startTransition(() => liveAction(formData));
          }}
          className="space-y-5 animate-fade-in"
        >
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
              value={fields.title}
              onChange={(e) => setFields({ ...fields, title: e.target.value })}
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
              value={fields.recordType}
              onChange={(e) => setFields({ ...fields, recordType: e.target.value as "program" | "scholarship" })}
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
                value={fields.institution}
                onChange={(e) => setFields({ ...fields, institution: e.target.value })}
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
                value={fields.country}
                onChange={(e) => setFields({ ...fields, country: e.target.value })}
                placeholder="e.g. United Kingdom, Germany, Canada"
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
                value={fields.degreeLevel}
                onChange={(e) => setFields({ ...fields, degreeLevel: e.target.value })}
                placeholder="e.g. Master's, PhD, Bachelor's"
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
                value={fields.deadline}
                onChange={(e) => setFields({ ...fields, deadline: e.target.value })}
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
              value={fields.officialUrl}
              onChange={(e) => setFields({ ...fields, officialUrl: e.target.value })}
              placeholder="https://..."
              className="w-full h-11 px-3.5 text-sm glass-input rounded-xl"
            />
            <p className="text-[11px] text-ink-muted">
              Official admissions portal link used for grounding requirements and verified dates.
            </p>
          </div>

          {/* Personal Notes & Extracted Funding */}
          <div className="space-y-1.5">
            <label htmlFor="live-notes" className="block text-xs font-bold text-ink-deep font-heading">
              Overview &amp; Funding Notes (optional)
            </label>
            <textarea
              id="live-notes"
              name="userNotes"
              rows={2}
              value={fields.notes}
              onChange={(e) => setFields({ ...fields, notes: e.target.value })}
              placeholder="Key notes, eligibility criteria, or funding benefits..."
              className="w-full p-3 text-sm glass-input rounded-xl"
            />
          </div>

          {/* Optional cost estimate */}
          <CostFields collapsible />

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
              value={fields.title}
              onChange={(e) => setFields({ ...fields, title: e.target.value })}
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
              value={fields.recordType}
              onChange={(e) => setFields({ ...fields, recordType: e.target.value as "program" | "scholarship" })}
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
                value={fields.institution}
                onChange={(e) => setFields({ ...fields, institution: e.target.value })}
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
                value={fields.targetCycle}
                onChange={(e) => setFields({ ...fields, targetCycle: e.target.value })}
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
              value={fields.expectedOpenDate}
              onChange={(e) => setFields({ ...fields, expectedOpenDate: e.target.value })}
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
              value={fields.notes}
              onChange={(e) => setFields({ ...fields, notes: e.target.value })}
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
              value={fields.officialUrl}
              onChange={(e) => setFields({ ...fields, officialUrl: e.target.value })}
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

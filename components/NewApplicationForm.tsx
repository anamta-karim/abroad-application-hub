"use client";

import { useActionState } from "react";
import Link from "next/link";
import { createApplicationAction, type ActionResponse } from "@/app/app/applications/actions";

const initialState: ActionResponse = {};

export function NewApplicationForm() {
  const [state, formAction, isPending] = useActionState(createApplicationAction, initialState);

  return (
    <form action={formAction} className="space-y-6">
      {state?.error && (
        <div
          className="p-3.5 text-xs rounded-xl bg-red-50/80 border border-red-200 text-red-800 font-medium"
          role="alert"
        >
          {state.error}
        </div>
      )}

      {/* Title */}
      <div className="space-y-1.5">
        <label htmlFor="title" className="block text-xs font-bold text-ink-deep font-heading">
          Application Title <span className="text-brand">*</span>
        </label>
        <input
          id="title"
          name="title"
          type="text"
          required
          placeholder="e.g. M.Sc. Computer Science or DAAD Scholarship"
          className="w-full h-11 px-3.5 text-sm glass-input rounded-xl"
        />
      </div>

      {/* Record Type */}
      <div className="space-y-1.5">
        <label htmlFor="recordType" className="block text-xs font-bold text-ink-deep font-heading">
          Type
        </label>
        <select
          id="recordType"
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
          <label htmlFor="institution" className="block text-xs font-bold text-ink-deep font-heading">
            University / Provider
          </label>
          <input
            id="institution"
            name="institution"
            type="text"
            placeholder="e.g. Technical University of Munich"
            className="w-full h-11 px-3.5 text-sm glass-input rounded-xl"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="country" className="block text-xs font-bold text-ink-deep font-heading">
            Country
          </label>
          <input
            id="country"
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
          <label htmlFor="degreeLevel" className="block text-xs font-bold text-ink-deep font-heading">
            Degree Level
          </label>
          <input
            id="degreeLevel"
            name="degreeLevel"
            type="text"
            placeholder="e.g. Master, PhD, Bachelor"
            className="w-full h-11 px-3.5 text-sm glass-input rounded-xl"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="deadline" className="block text-xs font-bold text-ink-deep font-heading">
            Target Deadline
          </label>
          <input
            id="deadline"
            name="deadline"
            type="date"
            className="w-full h-11 px-3.5 text-sm glass-input rounded-xl"
          />
        </div>
      </div>

      {/* Official URL */}
      <div className="space-y-1.5">
        <label htmlFor="officialUrl" className="block text-xs font-bold text-ink-deep font-heading">
          Official Webpage URL (optional)
        </label>
        <input
          id="officialUrl"
          name="officialUrl"
          type="url"
          placeholder="https://..."
          className="w-full h-11 px-3.5 text-sm glass-input rounded-xl"
        />
        <p className="text-[11px] text-ink-muted">
          Official link used for grounding requirements and extracted dates.
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
          disabled={isPending}
          className="px-6 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-brand to-brand-dark hover:from-brand-hover hover:to-brand rounded-xl shadow-md shadow-brand/20 active:scale-95 transition-all disabled:opacity-50"
        >
          {isPending ? "Saving application..." : "Save application"}
        </button>
      </div>
    </form>
  );
}

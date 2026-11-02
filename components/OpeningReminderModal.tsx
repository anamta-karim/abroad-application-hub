"use client";

import { useState, useActionState } from "react";
import { createOpeningReminderAction, type ActionResponse } from "@/app/app/applications/actions";

const initialState: ActionResponse = {};

export function OpeningReminderModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(createOpeningReminderAction, initialState);

  // Close modal when successfully created
  if (state?.success && isOpen) {
    setIsOpen(false);
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center space-x-2 px-4 py-2 text-xs font-bold text-brand hover:text-brand-dark glass-input hover:bg-white rounded-xl shadow-sm transition-all cursor-pointer min-h-[38px]"
      >
        <span className="text-base leading-none">+</span>
        <span>Set Opening Reminder</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-deep/20 backdrop-blur-sm animate-fade-in">
          <div className="glass-stage rounded-3xl p-6 sm:p-8 max-w-lg w-full space-y-5 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-glass-borderSubtle">
              <div>
                <h3 className="font-heading font-extrabold text-lg text-ink-deep">
                  Watch for Application Opening
                </h3>
                <p className="text-xs text-ink-muted mt-0.5">
                  Set an estimated date for when admissions open based on past cycles.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 rounded-full glass-input flex items-center justify-center text-ink-muted hover:text-ink-deep text-sm font-bold"
                aria-label="Close"
              >
                &times;
              </button>
            </div>

            <form action={formAction} className="space-y-4">
              {state?.error && (
                <div className="p-3 text-xs rounded-xl bg-red-50 border border-red-200 text-red-800">
                  {state.error}
                </div>
              )}

              {/* Title */}
              <div className="space-y-1">
                <label htmlFor="reminder-title" className="block text-xs font-bold text-ink-deep font-heading">
                  Program or Scholarship Name <span className="text-brand">*</span>
                </label>
                <input
                  id="reminder-title"
                  name="title"
                  type="text"
                  required
                  placeholder="e.g., Chevening Scholarship 2027, DAAD Helmut-Schmidt"
                  className="w-full px-3.5 py-2 rounded-xl text-sm glass-input text-ink-deep placeholder:text-ink-subtle"
                />
              </div>

              {/* Type & Expected Open Date Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label htmlFor="reminder-recordType" className="block text-xs font-bold text-ink-deep font-heading">
                    Type
                  </label>
                  <select
                    id="reminder-recordType"
                    name="recordType"
                    defaultValue="scholarship"
                    className="w-full px-3.5 py-2 rounded-xl text-sm glass-input text-ink-deep bg-white/70"
                  >
                    <option value="scholarship">Scholarship / Fellowship</option>
                    <option value="program">Degree Program</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label htmlFor="reminder-openDate" className="block text-xs font-bold text-ink-deep font-heading">
                    Expected Opening Date <span className="text-brand">*</span>
                  </label>
                  <input
                    id="reminder-openDate"
                    name="expectedOpenDate"
                    type="date"
                    required
                    className="w-full px-3.5 py-2 rounded-xl text-sm glass-input text-ink-deep"
                  />
                </div>
              </div>

              {/* Provider & Target Intake Cycle */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label htmlFor="reminder-institution" className="block text-xs font-bold text-ink-deep font-heading">
                    Provider or University
                  </label>
                  <input
                    id="reminder-institution"
                    name="institution"
                    type="text"
                    placeholder="e.g., British Council, Cambridge"
                    className="w-full px-3.5 py-2 rounded-xl text-sm glass-input text-ink-deep placeholder:text-ink-subtle"
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="reminder-targetCycle" className="block text-xs font-bold text-ink-deep font-heading">
                    Target Intake Cycle
                  </label>
                  <input
                    id="reminder-targetCycle"
                    name="targetCycle"
                    type="text"
                    placeholder="e.g., 2027/2028 Academic Year"
                    className="w-full px-3.5 py-2 rounded-xl text-sm glass-input text-ink-deep placeholder:text-ink-subtle"
                  />
                </div>
              </div>

              {/* Official URL */}
              <div className="space-y-1">
                <label htmlFor="reminder-url" className="block text-xs font-bold text-ink-deep font-heading">
                  Official Portal / Guidelines URL
                </label>
                <input
                  id="reminder-url"
                  name="officialUrl"
                  type="url"
                  placeholder="https://..."
                  className="w-full px-3.5 py-2 rounded-xl text-sm glass-input text-ink-deep placeholder:text-ink-subtle"
                />
              </div>

              {/* Notes */}
              <div className="space-y-1">
                <label htmlFor="reminder-notes" className="block text-xs font-bold text-ink-deep font-heading">
                  Notes on Past Opening Trends
                </label>
                <textarea
                  id="reminder-notes"
                  name="notes"
                  rows={2}
                  placeholder="e.g., Opened the first Tuesday of August in the last 2 cycles."
                  className="w-full px-3.5 py-2 rounded-xl text-sm glass-input text-ink-deep placeholder:text-ink-subtle"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-ink-muted hover:text-ink-deep glass-card rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-5 py-2 text-xs font-bold text-white bg-gradient-to-r from-brand to-brand-dark hover:from-brand-hover hover:to-brand rounded-xl shadow-md disabled:opacity-50"
                >
                  {isPending ? "Saving..." : "Save Reminder"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

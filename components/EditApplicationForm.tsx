"use client";

import { useActionState } from "react";
import Link from "next/link";
import { updateApplicationAction, type ActionResponse } from "@/app/app/applications/actions";
import type { ApplicationStatus, RecordType } from "@/types/database";

interface EditApplicationFormProps {
  application: {
    id: string;
    title: string;
    record_type: RecordType;
    institution_or_provider: string | null;
    country: string | null;
    degree_level: string | null;
    field_of_study: string | null;
    study_period: string | null;
    deadline: string | null;
    official_url: string | null;
    user_notes: string | null;
    status: ApplicationStatus;
  };
}

const initialState: ActionResponse = {};

export function EditApplicationForm({ application }: EditApplicationFormProps) {
  const updateWithId = updateApplicationAction.bind(null, application.id);
  const [state, formAction, isPending] = useActionState(updateWithId, initialState);

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
          defaultValue={application.title}
          placeholder="e.g., MSc Computer Science, Chevening Scholarship"
          className="w-full px-4 py-2.5 rounded-xl text-sm glass-input text-ink-deep placeholder:text-ink-subtle"
        />
      </div>

      {/* Record Type & Status Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label htmlFor="recordType" className="block text-xs font-bold text-ink-deep font-heading">
            Application Type
          </label>
          <select
            id="recordType"
            name="recordType"
            defaultValue={application.record_type}
            className="w-full px-4 py-2.5 rounded-xl text-sm glass-input text-ink-deep bg-white/70"
          >
            <option value="program">Degree / University Program</option>
            <option value="scholarship">Scholarship / Fellowship</option>
          </select>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="status" className="block text-xs font-bold text-ink-deep font-heading">
            Current Status
          </label>
          <select
            id="status"
            name="status"
            defaultValue={application.status}
            className="w-full px-4 py-2.5 rounded-xl text-sm glass-input text-ink-deep bg-white/70"
          >
            <option value="researching">Researching</option>
            <option value="preparing">Preparing Materials</option>
            <option value="submitted">Submitted</option>
            <option value="interviewing">Interviewing</option>
            <option value="accepted">Accepted / Awarded</option>
            <option value="waitlisted">Waitlisted</option>
            <option value="rejected">Rejected</option>
            <option value="withdrawn">Withdrawn</option>
          </select>
        </div>
      </div>

      {/* Institution / Provider & Country */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label htmlFor="institution" className="block text-xs font-bold text-ink-deep font-heading">
            Institution or Provider
          </label>
          <input
            id="institution"
            name="institution"
            type="text"
            defaultValue={application.institution_or_provider || ""}
            placeholder="e.g., University of Oxford, DAAD"
            className="w-full px-4 py-2.5 rounded-xl text-sm glass-input text-ink-deep placeholder:text-ink-subtle"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="country" className="block text-xs font-bold text-ink-deep font-heading">
            Target Country
          </label>
          <input
            id="country"
            name="country"
            type="text"
            defaultValue={application.country || ""}
            placeholder="e.g., United Kingdom, Germany"
            className="w-full px-4 py-2.5 rounded-xl text-sm glass-input text-ink-deep placeholder:text-ink-subtle"
          />
        </div>
      </div>

      {/* Degree Level & Field of Study */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label htmlFor="degreeLevel" className="block text-xs font-bold text-ink-deep font-heading">
            Degree Level
          </label>
          <input
            id="degreeLevel"
            name="degreeLevel"
            type="text"
            defaultValue={application.degree_level || ""}
            placeholder="e.g., Master's, PhD, Bachelor's"
            className="w-full px-4 py-2.5 rounded-xl text-sm glass-input text-ink-deep placeholder:text-ink-subtle"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="fieldOfStudy" className="block text-xs font-bold text-ink-deep font-heading">
            Field of Study
          </label>
          <input
            id="fieldOfStudy"
            name="fieldOfStudy"
            type="text"
            defaultValue={application.field_of_study || ""}
            placeholder="e.g., Artificial Intelligence, Public Policy"
            className="w-full px-4 py-2.5 rounded-xl text-sm glass-input text-ink-deep placeholder:text-ink-subtle"
          />
        </div>
      </div>

      {/* Study Period & Deadline */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label htmlFor="studyPeriod" className="block text-xs font-bold text-ink-deep font-heading">
            Study Period / Intake
          </label>
          <input
            id="studyPeriod"
            name="studyPeriod"
            type="text"
            defaultValue={application.study_period || ""}
            placeholder="e.g., Fall 2027, 2027/2028 Academic Year"
            className="w-full px-4 py-2.5 rounded-xl text-sm glass-input text-ink-deep placeholder:text-ink-subtle"
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
            defaultValue={application.deadline || ""}
            className="w-full px-4 py-2.5 rounded-xl text-sm glass-input text-ink-deep"
          />
        </div>
      </div>

      {/* Official URL */}
      <div className="space-y-1.5">
        <label htmlFor="officialUrl" className="block text-xs font-bold text-ink-deep font-heading">
          Official Program URL
        </label>
        <input
          id="officialUrl"
          name="officialUrl"
          type="url"
          defaultValue={application.official_url || ""}
          placeholder="https://university.ac.uk/programs/..."
          className="w-full px-4 py-2.5 rounded-xl text-sm glass-input text-ink-deep placeholder:text-ink-subtle"
        />
      </div>

      {/* User Notes */}
      <div className="space-y-1.5">
        <label htmlFor="userNotes" className="block text-xs font-bold text-ink-deep font-heading">
          Personal Notes &amp; Strategy
        </label>
        <textarea
          id="userNotes"
          name="userNotes"
          rows={3}
          defaultValue={application.user_notes || ""}
          placeholder="Notes on supervisors, funding conditions, deadlines..."
          className="w-full px-4 py-2.5 rounded-xl text-sm glass-input text-ink-deep placeholder:text-ink-subtle"
        />
      </div>

      {/* Form Action Buttons */}
      <div className="pt-2 flex items-center justify-end space-x-3">
        <Link
          href={`/app/applications/${application.id}`}
          className="px-5 py-2.5 rounded-xl text-xs font-bold text-ink-muted hover:text-ink-deep glass-card hover:bg-white transition-all min-h-[42px] flex items-center"
        >
          Cancel
        </Link>
        <button
          type="submit"
          disabled={isPending}
          className="px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-brand to-brand-dark hover:from-brand-hover hover:to-brand shadow-md shadow-brand/20 active:scale-95 transition-all min-h-[42px] cursor-pointer disabled:opacity-50"
        >
          {isPending ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </form>
  );
}

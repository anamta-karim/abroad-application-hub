"use client";

import { useState } from "react";
import {
  addRequirementAction,
  updateRequirementStatusAction,
  deleteRequirementAction,
} from "@/app/app/applications/actions";
import type { RequirementStatus } from "@/types/database";

interface RequirementItem {
  id: string;
  document_type: string;
  notes: string | null;
  due_date: string | null;
  status: RequirementStatus;
}

interface RequirementListProps {
  applicationId: string;
  initialRequirements: RequirementItem[];
}

const statusLabels: Record<RequirementStatus, { label: string; badgeClass: string }> = {
  not_started: { label: "Not Started", badgeClass: "glass-badge-neutral" },
  in_progress: { label: "In Progress", badgeClass: "glass-badge-blue" },
  requested: { label: "Requested", badgeClass: "glass-badge-teal" },
  ready: { label: "Ready", badgeClass: "glass-badge-teal font-bold" },
  submitted: { label: "Submitted", badgeClass: "glass-badge-blue font-bold" },
  expired: { label: "Expired", badgeClass: "bg-red-50 text-red-700 border border-red-200" },
  not_applicable: { label: "N/A", badgeClass: "glass-badge-neutral text-ink-subtle" },
};

export function RequirementList({ applicationId, initialRequirements }: RequirementListProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleStatusChange = async (reqId: string, newStatus: RequirementStatus) => {
    await updateRequirementStatusAction(reqId, applicationId, newStatus);
  };

  const handleDelete = async (reqId: string) => {
    if (confirm("Remove this document requirement?")) {
      await deleteRequirementAction(reqId, applicationId);
    }
  };

  const handleAddSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);
    await addRequirementAction(applicationId, formData);
    setIsSubmitting(false);
    setShowAddForm(false);
  };

  const readyCount = initialRequirements.filter(
    (r) => r.status === "ready" || r.status === "submitted"
  ).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between pb-2 border-b border-glass-borderSubtle">
        <div>
          <h2 className="font-heading font-bold text-lg text-ink-deep">
            Document Requirements Checklist
          </h2>
          <p className="text-xs text-ink-muted mt-0.5">
            {initialRequirements.length > 0
              ? `${readyCount} of ${initialRequirements.length} documents ready`
              : "No requirements added yet"}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowAddForm(!showAddForm)}
          className="px-3.5 py-1.5 text-xs font-bold text-brand hover:text-brand-dark glass-input rounded-xl hover:bg-white transition-colors cursor-pointer"
        >
          {showAddForm ? "Cancel" : "+ Add Requirement"}
        </button>
      </div>

      {/* Add Requirement Form */}
      {showAddForm && (
        <form onSubmit={handleAddSubmit} className="glass-card rounded-2xl p-4 sm:p-5 space-y-4">
          <div className="space-y-1">
            <label className="block text-xs font-bold text-ink-deep font-heading">
              Document Name / Requirement <span className="text-brand">*</span>
            </label>
            <input
              name="documentType"
              type="text"
              required
              placeholder="e.g. Official Bachelor Transcript, Motivation Letter, IELTS Score"
              className="w-full h-10 px-3.5 text-xs glass-input rounded-xl"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="block text-xs font-bold text-ink-deep font-heading">
                Status
              </label>
              <select
                name="status"
                defaultValue="not_started"
                className="w-full h-10 px-3.5 text-xs glass-input rounded-xl bg-white/90"
              >
                <option value="not_started">Not Started</option>
                <option value="in_progress">In Progress</option>
                <option value="requested">Requested (e.g. LOR)</option>
                <option value="ready">Ready</option>
                <option value="submitted">Submitted</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-bold text-ink-deep font-heading">
                Due Date (optional)
              </label>
              <input
                name="dueDate"
                type="date"
                className="w-full h-10 px-3.5 text-xs glass-input rounded-xl"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-bold text-ink-deep font-heading">
              Notes / Criteria Details
            </label>
            <input
              name="notes"
              type="text"
              placeholder="e.g. Certified translation required, min. 500 words"
              className="w-full h-10 px-3.5 text-xs glass-input rounded-xl"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-bold text-white bg-gradient-to-r from-brand to-brand-dark rounded-xl shadow-sm transition-all"
            >
              {isSubmitting ? "Adding..." : "Add to Checklist"}
            </button>
          </div>
        </form>
      )}

      {/* Checklist Items */}
      {initialRequirements.length === 0 ? (
        <div className="glass-card rounded-2xl p-6 text-center text-xs text-ink-muted">
          <p className="font-semibold text-ink-deep">No document requirements logged yet.</p>
          <p className="text-ink-subtle mt-1">
            Add requirements manually or upload a prospectus PDF to extract and track official requirements automatically.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {initialRequirements.map((req) => (
            <div
              key={req.id}
              className="glass-card rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
            >
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-ink-deep text-sm">
                    {req.document_type}
                  </span>
                  <span className={`badge ${statusLabels[req.status].badgeClass} text-[11px]`}>
                    {statusLabels[req.status].label}
                  </span>
                </div>
                {req.notes && (
                  <p className="text-ink-muted text-[11px] leading-relaxed">
                    {req.notes}
                  </p>
                )}
                {req.due_date && (
                  <span className="text-[10px] text-ink-subtle font-medium block">
                    Target due: {req.due_date}
                  </span>
                )}
              </div>

              {/* Status Switcher & Delete */}
              <div className="flex items-center gap-2 self-end sm:self-center flex-shrink-0">
                <select
                  value={req.status}
                  onChange={(e) => handleStatusChange(req.id, e.target.value as RequirementStatus)}
                  className="px-2.5 py-1 text-xs glass-input rounded-xl cursor-pointer bg-white/80"
                  aria-label={`Change status for ${req.document_type}`}
                >
                  <option value="not_started">Not Started</option>
                  <option value="in_progress">In Progress</option>
                  <option value="requested">Requested</option>
                  <option value="ready">Ready</option>
                  <option value="submitted">Submitted</option>
                  <option value="expired">Expired</option>
                  <option value="not_applicable">N/A</option>
                </select>
                <button
                  type="button"
                  onClick={() => handleDelete(req.id)}
                  className="text-xs text-ink-subtle hover:text-red-600 px-2 py-1 rounded-lg transition-colors cursor-pointer"
                  title="Remove requirement"
                >
                  &times;
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

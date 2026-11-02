"use client";

import { useState } from "react";
import Link from "next/link";
import {
  linkApplicationsAction,
  unlinkApplicationsAction,
} from "@/app/app/applications/actions";
import type { RecordType } from "@/types/database";

interface LinkedAppItem {
  linkId: string;
  id: string;
  title: string;
  record_type: RecordType;
  institution_or_provider: string | null;
  status: string;
  relationship_note: string | null;
}

interface AvailableAppOption {
  id: string;
  title: string;
  record_type: RecordType;
  institution_or_provider: string | null;
}

interface LinkedApplicationsProps {
  currentAppId: string;
  currentRecordType: RecordType;
  linkedApps: LinkedAppItem[];
  availableAppsToLink: AvailableAppOption[];
}

export function LinkedApplications({
  currentAppId,
  currentRecordType,
  linkedApps,
  availableAppsToLink,
}: LinkedApplicationsProps) {
  const [selectedAppId, setSelectedAppId] = useState("");
  const [note, setNote] = useState("");
  const [isLinking, setIsLinking] = useState(false);

  const targetTypeLabel = currentRecordType === "program" ? "Scholarship" : "Program";

  const handleLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAppId) return;

    setIsLinking(true);
    const programId = currentRecordType === "program" ? currentAppId : selectedAppId;
    const scholarshipId = currentRecordType === "program" ? selectedAppId : currentAppId;

    await linkApplicationsAction(programId, scholarshipId, note);
    setIsLinking(false);
    setSelectedAppId("");
    setNote("");
  };

  const handleUnlink = async (linkId: string) => {
    if (confirm("Disconnect this linked record?")) {
      await unlinkApplicationsAction(linkId, currentAppId);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between pb-2 border-b border-glass-borderSubtle">
        <div>
          <h2 className="font-heading font-bold text-lg text-ink-deep">
            Linked {currentRecordType === "program" ? "Scholarships" : "Programs"}
          </h2>
          <p className="text-xs text-ink-muted mt-0.5">
            Connect scholarship funding targets directly to university admission programs.
          </p>
        </div>
      </div>

      {/* Linked list */}
      {linkedApps.length === 0 ? (
        <div className="glass-card rounded-2xl p-5 text-center text-xs text-ink-muted">
          <p className="font-semibold text-ink-deep">No linked {targetTypeLabel.toLowerCase()}s yet.</p>
          <p className="text-ink-subtle mt-0.5">
            Connect a {targetTypeLabel.toLowerCase()} below to track funding coverage alongside your admission timeline.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {linkedApps.map((item) => (
            <div
              key={item.linkId}
              className="glass-card rounded-2xl p-4 flex items-center justify-between gap-3 text-xs"
            >
              <div className="space-y-0.5 min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className={`badge ${
                      item.record_type === "scholarship"
                        ? "glass-badge-teal"
                        : "glass-badge-blue"
                    } text-[11px]`}
                  >
                    {item.record_type}
                  </span>
                  <Link
                    href={`/app/applications/${item.id}`}
                    className="font-bold text-ink-deep hover:text-brand transition-colors truncate"
                  >
                    {item.title}
                  </Link>
                </div>
                {item.institution_or_provider && (
                  <p className="text-ink-muted text-[11px]">{item.institution_or_provider}</p>
                )}
                {item.relationship_note && (
                  <p className="text-ink-subtle text-[11px] italic">{item.relationship_note}</p>
                )}
              </div>

              <button
                type="button"
                onClick={() => handleUnlink(item.linkId)}
                className="text-xs text-ink-subtle hover:text-red-600 px-2 py-1 rounded transition-colors"
                title="Disconnect link"
              >
                Disconnect
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Link new app selector */}
      {availableAppsToLink.length > 0 && (
        <form onSubmit={handleLink} className="glass-card rounded-2xl p-4 space-y-3">
          <span className="text-xs font-bold text-ink-deep block font-heading">
            Connect a {targetTypeLabel}
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <select
              value={selectedAppId}
              onChange={(e) => setSelectedAppId(e.target.value)}
              className="h-10 px-3 text-xs glass-input rounded-xl bg-white/90"
              required
            >
              <option value="">Select a {targetTypeLabel.toLowerCase()}...</option>
              {availableAppsToLink.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.title} {opt.institution_or_provider ? `(${opt.institution_or_provider})` : ""}
                </option>
              ))}
            </select>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Optional connection note (e.g. Primary tuition grant)"
              className="h-10 px-3 text-xs glass-input rounded-xl"
            />
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isLinking || !selectedAppId}
              className="px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-brand to-brand-dark rounded-xl shadow-sm disabled:opacity-50"
            >
              {isLinking ? "Connecting..." : `Link ${targetTypeLabel}`}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

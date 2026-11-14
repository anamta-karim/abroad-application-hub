"use client";

import { useState } from "react";
import { updateStatusQuickAction } from "@/app/app/applications/actions";
import type { ApplicationStatus } from "@/types/database";
import { runAction } from "@/lib/client/runAction";
import { InlineError } from "@/components/InlineError";

interface StatusSelectProps {
  applicationId: string;
  currentStatus: ApplicationStatus;
}

const statusOptions: { value: ApplicationStatus; label: string }[] = [
  { value: "researching", label: "Researching" },
  { value: "preparing", label: "Preparing" },
  { value: "submitted", label: "Submitted" },
  { value: "interview", label: "Interview" },
  { value: "offer_received", label: "Offer Received" },
  { value: "rejected", label: "Rejected" },
  { value: "withdrawn", label: "Withdrawn" },
];

export function StatusSelect({ applicationId, currentStatus }: StatusSelectProps) {
  const [status, setStatus] = useState<ApplicationStatus>(currentStatus);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStatusChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStatus = e.target.value as ApplicationStatus;
    const previous = status;
    setStatus(newStatus);
    setError(null);
    setIsUpdating(true);
    const err = await runAction(() => updateStatusQuickAction(applicationId, newStatus));
    if (err) {
      setStatus(previous); // the save failed, so show what's actually stored
      setError(`Status not changed: ${err}`);
    }
    setIsUpdating(false);
  };

  return (
    <div className="flex flex-col gap-2">
    <div className="flex items-center gap-2">
      <span className="text-xs font-bold text-ink-muted uppercase tracking-wider font-heading">
        Status:
      </span>
      <select
        value={status}
        disabled={isUpdating}
        onChange={handleStatusChange}
        className="text-xs font-bold px-3 py-1.5 rounded-xl glass-input cursor-pointer disabled:opacity-50"
      >
        {statusOptions.map((opt) => (
          <option key={opt.value} value={opt.value} className="bg-white text-ink-deep">
            {opt.label}
          </option>
        ))}
      </select>
      {isUpdating && <span className="text-[10px] text-ink-muted">Updating...</span>}
    </div>
    <InlineError message={error} onDismiss={() => setError(null)} />
    </div>
  );
}

"use client";

import { useState } from "react";
import { updateStatusQuickAction } from "@/app/app/applications/actions";
import type { ApplicationStatus } from "@/types/database";

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

  const handleStatusChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStatus = e.target.value as ApplicationStatus;
    setStatus(newStatus);
    setIsUpdating(true);
    await updateStatusQuickAction(applicationId, newStatus);
    setIsUpdating(false);
  };

  return (
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
  );
}

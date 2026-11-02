"use client";

import { useState } from "react";
import { archiveApplicationAction, unarchiveApplicationAction } from "@/app/app/applications/actions";

interface ArchiveButtonProps {
  applicationId: string;
  isArchived: boolean;
}

export function ArchiveButton({ applicationId, isArchived }: ArchiveButtonProps) {
  const [isPending, setIsPending] = useState(false);

  async function handleToggleArchive() {
    setIsPending(true);
    if (isArchived) {
      await unarchiveApplicationAction(applicationId);
    } else {
      await archiveApplicationAction(applicationId);
    }
    setIsPending(false);
  }

  return (
    <button
      onClick={handleToggleArchive}
      disabled={isPending}
      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all min-h-[36px] flex items-center space-x-1.5 cursor-pointer disabled:opacity-50 ${
        isArchived
          ? "glass-badge-teal hover:bg-teal-light text-teal-dark"
          : "glass-card text-ink-muted hover:text-ink-deep hover:bg-white/80"
      }`}
    >
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
      </svg>
      <span>{isPending ? "Updating..." : isArchived ? "Restore from Archive" : "Archive"}</span>
    </button>
  );
}

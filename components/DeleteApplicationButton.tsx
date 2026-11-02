"use client";

import { useState } from "react";
import { deleteApplicationAction } from "@/app/app/applications/actions";

interface DeleteApplicationButtonProps {
  applicationId: string;
  applicationTitle: string;
}

export function DeleteApplicationButton({
  applicationId,
  applicationTitle,
}: DeleteApplicationButtonProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (
      confirm(
        `Are you sure you want to delete "${applicationTitle}"? All associated checklist items, tasks, and notes will be permanently removed.`
      )
    ) {
      setIsDeleting(true);
      await deleteApplicationAction(applicationId);
    }
  };

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={isDeleting}
      className="px-3.5 py-1.5 text-xs font-bold text-red-700 bg-red-50/80 hover:bg-red-100 border border-red-200 rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
    >
      {isDeleting ? "Deleting..." : "Delete"}
    </button>
  );
}

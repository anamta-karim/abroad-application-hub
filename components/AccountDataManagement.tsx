"use client";

import { useState } from "react";
import {
  exportUserDataAction,
  deleteUserDataAndAccountAction,
} from "@/app/app/settings/actions";

export function AccountDataManagement() {
  const [isExporting, setIsExporting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleExport() {
    setIsExporting(true);
    setErrorMessage(null);

    const res = await exportUserDataAction();
    if (res.error) {
      setErrorMessage(res.error);
    } else if (res.data) {
      // Trigger browser JSON download
      const jsonStr = JSON.stringify(res.data, null, 2);
      const blob = new Blob([jsonStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `abroad_hub_export_${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
    setIsExporting(false);
  }

  async function handleDeleteAccount() {
    if (confirmText !== "DELETE") return;
    setIsDeleting(true);
    setErrorMessage(null);
    const res = await deleteUserDataAndAccountAction();
    if (res?.error) {
      setErrorMessage(res.error);
      setIsDeleting(false);
    }
  }

  return (
    <div className="space-y-6">
      {errorMessage && (
        <div className="p-3 text-xs rounded-xl bg-red-50 text-red-800 border border-red-200">
          {errorMessage}
        </div>
      )}

      {/* ── Data Export ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl glass-card">
        <div className="space-y-0.5">
          <h3 className="font-heading font-extrabold text-sm text-ink-deep">
            Export Workspace Data
          </h3>
          <p className="text-xs text-ink-muted">
            Download an offline JSON archive of all your applications, requirements, sources, and deadlines.
          </p>
        </div>
        <button
          onClick={handleExport}
          disabled={isExporting}
          className="px-4 py-2 text-xs font-bold text-ink-deep glass-input hover:bg-white rounded-xl shadow-sm transition-all cursor-pointer min-h-[38px] flex-shrink-0 disabled:opacity-50"
        >
          {isExporting ? "Compiling Export..." : "Download JSON Archive"}
        </button>
      </div>

      {/* ── Danger Zone: Delete Account ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl border border-red-200 bg-red-50/50">
        <div className="space-y-0.5">
          <h3 className="font-heading font-extrabold text-sm text-red-800">
            Delete Account &amp; Workspace Data
          </h3>
          <p className="text-xs text-red-700/80 leading-relaxed">
            Permanently erase all your applications, uploaded source files, document requirements, and account credentials. This cannot be undone.
          </p>
        </div>
        <button
          onClick={() => setShowDeleteModal(true)}
          className="px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-sm transition-all cursor-pointer min-h-[38px] flex-shrink-0"
        >
          Delete Account
        </button>
      </div>

      {/* Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-deep/25 backdrop-blur-sm animate-fade-in">
          <div className="glass-stage rounded-3xl p-6 sm:p-8 max-w-md w-full space-y-4 shadow-2xl bg-white/95">
            <h3 className="font-heading font-extrabold text-base text-red-800">
              Confirm Permanent Account Deletion
            </h3>
            <p className="text-xs text-ink-muted leading-relaxed">
              This action immediately wipes all applications, source documents, chunks, and notes from the database. Type <strong className="text-ink-deep font-bold">DELETE</strong> below to confirm.
            </p>

            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="Type DELETE"
              className="w-full px-3.5 py-2 text-sm rounded-xl glass-input border border-red-300 text-ink-deep"
            />

            <div className="pt-2 flex items-center justify-end space-x-3">
              <button
                type="button"
                onClick={() => { setShowDeleteModal(false); setConfirmText(""); }}
                className="px-4 py-2 text-xs font-bold text-ink-muted hover:text-ink-deep glass-card rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={confirmText !== "DELETE" || isDeleting}
                className="px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl disabled:opacity-40"
              >
                {isDeleting ? "Erasing..." : "Permanently Delete Everything"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

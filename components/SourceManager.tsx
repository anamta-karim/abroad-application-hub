"use client";

import { useState, useActionState } from "react";
import {
  ingestWebpageAction,
  ingestPdfAction,
  deleteSourceAction,
} from "@/app/app/applications/[id]/sources/actions";
import type { ActionResponse } from "@/app/app/applications/actions";
import type { SourceType, IngestionStatus } from "@/types/database";

interface SourceItem {
  id: string;
  source_type: SourceType;
  display_name: string;
  source_url: string | null;
  storage_path: string | null;
  file_size_bytes: number | null;
  ingestion_status: IngestionStatus;
  error_code: string | null;
  created_at: string;
}

interface SourceManagerProps {
  applicationId: string;
  sources: SourceItem[];
}

const initialActionState: ActionResponse = {};

export function SourceManager({ applicationId, sources }: SourceManagerProps) {
  const [activeForm, setActiveForm] = useState<"none" | "url" | "pdf">("none");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const ingestWebpageWithId = ingestWebpageAction.bind(null, applicationId);
  const ingestPdfWithId = ingestPdfAction.bind(null, applicationId);

  const [urlState, urlFormAction, isUrlPending] = useActionState(ingestWebpageWithId, initialActionState);
  const [pdfState, pdfFormAction, isPdfPending] = useActionState(ingestPdfWithId, initialActionState);

  async function handleDeleteSource(sourceId: string) {
    if (!confirm("Are you sure you want to remove this source and its extracted facts?")) return;
    setDeletingId(sourceId);
    await deleteSourceAction(sourceId, applicationId);
    setDeletingId(null);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-glass-borderSubtle">
        <div>
          <h2 className="font-heading font-extrabold text-base text-ink-deep">
            Official Source Materials
          </h2>
          <p className="text-xs text-ink-muted mt-0.5">
            Attach verified university prospectus PDFs and admissions webpages to ground requirements.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setActiveForm(activeForm === "url" ? "none" : "url")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all min-h-[36px] flex items-center space-x-1.5 cursor-pointer ${
              activeForm === "url"
                ? "glass-nav-active font-extrabold"
                : "glass-card text-ink-muted hover:text-ink-deep hover:bg-white"
            }`}
          >
            <span>🔗 Ingest Webpage</span>
          </button>
          <button
            onClick={() => setActiveForm(activeForm === "pdf" ? "none" : "pdf")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all min-h-[36px] flex items-center space-x-1.5 cursor-pointer ${
              activeForm === "pdf"
                ? "glass-nav-active font-extrabold"
                : "glass-card text-ink-muted hover:text-ink-deep hover:bg-white"
            }`}
          >
            <span>📄 Upload PDF</span>
          </button>
        </div>
      </div>

      {/* ── Form: Ingest Official Webpage (SSRF Protected) ── */}
      {activeForm === "url" && (
        <form
          action={urlFormAction}
          className="glass-card rounded-2xl p-4 sm:p-5 space-y-3 bg-white/70 animate-fade-in"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-ink-deep">Ingest Official Program Webpage</span>
            <span className="text-[10px] text-ink-subtle">SSRF Protected &bull; Max 5MB</span>
          </div>

          {urlState?.error && (
            <div className="p-3 text-xs rounded-xl bg-red-50 text-red-800 border border-red-200">
              {urlState.error}
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-2">
            <input
              name="url"
              type="url"
              required
              placeholder="https://www.ox.ac.uk/admissions/graduate/courses/..."
              className="flex-1 px-3.5 py-2 rounded-xl text-xs glass-input text-ink-deep placeholder:text-ink-subtle"
            />
            <button
              type="submit"
              disabled={isUrlPending}
              className="px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-brand to-brand-dark rounded-xl shadow-sm hover:from-brand-hover hover:to-brand disabled:opacity-50"
            >
              {isUrlPending ? "Ingesting..." : "Fetch & Extract"}
            </button>
          </div>
        </form>
      )}

      {/* ── Form: Upload Prospectus PDF ── */}
      {activeForm === "pdf" && (
        <form
          action={pdfFormAction}
          className="glass-card rounded-2xl p-4 sm:p-5 space-y-3 bg-white/70 animate-fade-in"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-ink-deep">Upload Admissions Brochure / Prospectus PDF</span>
            <span className="text-[10px] text-ink-subtle">Owner-Isolated Storage &bull; Max 10MB</span>
          </div>

          {pdfState?.error && (
            <div className="p-3 text-xs rounded-xl bg-red-50 text-red-800 border border-red-200">
              {pdfState.error}
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-center gap-2">
            <input
              name="file"
              type="file"
              accept=".pdf,application/pdf"
              required
              className="w-full text-xs text-ink-muted file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-brand-light file:text-brand-dark hover:file:bg-brand-light/80"
            />
            <button
              type="submit"
              disabled={isPdfPending}
              className="w-full sm:w-auto px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-brand to-brand-dark rounded-xl shadow-sm hover:from-brand-hover hover:to-brand disabled:opacity-50 flex-shrink-0"
            >
              {isPdfPending ? "Extracting..." : "Upload & Parse"}
            </button>
          </div>
        </form>
      )}

      {/* ── Sources List ── */}
      {sources.length === 0 ? (
        <div className="glass-card rounded-2xl p-6 text-center text-xs text-ink-muted space-y-1.5">
          <p className="font-semibold text-ink-deep">No official sources attached yet.</p>
          <p>
            Paste the university admissions URL or upload the syllabus/prospectus PDF above to automatically ground requirements.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {sources.map((source) => (
            <div
              key={source.id}
              className="glass-card rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
            >
              <div className="flex items-start space-x-3 min-w-0">
                <div className="w-8 h-8 rounded-xl glass-badge-blue flex items-center justify-center font-bold text-sm flex-shrink-0">
                  {source.source_type === "pdf" ? "📄" : "🔗"}
                </div>
                <div className="space-y-0.5 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-ink-deep truncate">{source.display_name}</span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        source.ingestion_status === "ready"
                          ? "glass-badge-teal text-teal-dark"
                          : source.ingestion_status === "failed"
                          ? "bg-red-50 text-red-700"
                          : "glass-badge-neutral text-ink-muted"
                      }`}
                    >
                      {source.ingestion_status}
                    </span>
                  </div>

                  <p className="text-[11px] text-ink-muted truncate">
                    {source.source_type === "pdf"
                      ? `PDF File &bull; ${source.file_size_bytes ? `${Math.round(source.file_size_bytes / 1024)} KB` : ""}`
                      : source.source_url || "Webpage source"}
                  </p>

                  {source.error_code && (
                    <p className="text-[11px] text-red-600 font-medium">Error: {source.error_code}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-center flex-shrink-0">
                {source.source_url && (
                  <a
                    href={source.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2.5 py-1 text-xs font-semibold text-ink-muted hover:text-brand transition-colors"
                  >
                    Visit &rarr;
                  </a>
                )}
                <button
                  onClick={() => handleDeleteSource(source.id)}
                  disabled={deletingId === source.id}
                  className="p-1.5 text-xs text-ink-subtle hover:text-red-600 rounded-lg"
                  title="Remove source"
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

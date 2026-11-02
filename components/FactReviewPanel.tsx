"use client";

import { useState } from "react";
import { reviewFactAction } from "@/app/app/applications/[id]/sources/actions";
import type { ReviewState, FactType, Confidence } from "@/types/database";

interface ExtractedFactItem {
  id: string;
  fact_type: FactType;
  label: string;
  value: any;
  confidence: Confidence;
  review_state: ReviewState;
  created_at: string;
}

interface FactReviewPanelProps {
  applicationId: string;
  facts: ExtractedFactItem[];
}

export function FactReviewPanel({ applicationId, facts }: FactReviewPanelProps) {
  const [activeTab, setActiveTab] = useState<"pending" | "confirmed">("pending");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editedValueInput, setEditedValueInput] = useState("");
  const [isSubmittingId, setIsSubmittingId] = useState<string | null>(null);

  const pendingFacts = facts.filter((f) => f.review_state === "suggested");
  const confirmedFacts = facts.filter((f) => f.review_state === "confirmed" || f.review_state === "edited");

  async function handleConfirm(factId: string) {
    setIsSubmittingId(factId);
    await reviewFactAction(factId, applicationId, "confirm");
    setIsSubmittingId(null);
  }

  async function handleEditConfirm(factId: string) {
    if (!editedValueInput.trim()) return;
    setIsSubmittingId(factId);
    await reviewFactAction(factId, applicationId, "edit", editedValueInput.trim());
    setEditingId(null);
    setEditedValueInput("");
    setIsSubmittingId(null);
  }

  async function handleReject(factId: string) {
    setIsSubmittingId(factId);
    await reviewFactAction(factId, applicationId, "reject");
    setIsSubmittingId(null);
  }

  function startEditing(fact: ExtractedFactItem) {
    setEditingId(fact.id);
    const valStr =
      typeof fact.value === "object"
        ? fact.value?.extractedValue || fact.label
        : String(fact.value || "");
    setEditedValueInput(valStr);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-glass-borderSubtle">
        <div>
          <h2 className="font-heading font-extrabold text-base text-ink-deep">
            Source-Grounded Facts &amp; Verification
          </h2>
          <p className="text-xs text-ink-muted mt-0.5">
            Extracted requirements stay pending suggestions until you review and confirm them.
          </p>
        </div>

        <div className="flex items-center space-x-2 text-xs font-bold">
          <button
            onClick={() => setActiveTab("pending")}
            className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer min-h-[36px] flex items-center space-x-1.5 ${
              activeTab === "pending"
                ? "glass-nav-active font-extrabold"
                : "glass-card text-ink-muted hover:text-ink-deep bg-white/30"
            }`}
          >
            <span>Pending Review</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/70">
              {pendingFacts.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("confirmed")}
            className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer min-h-[36px] flex items-center space-x-1.5 ${
              activeTab === "confirmed"
                ? "glass-nav-active font-extrabold"
                : "glass-card text-ink-muted hover:text-ink-deep bg-white/30"
            }`}
          >
            <span>Confirmed Facts</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/70">
              {confirmedFacts.length}
            </span>
          </button>
        </div>
      </div>

      {/* ── Tab 1: Pending Review ── */}
      {activeTab === "pending" && (
        <div className="space-y-3">
          {pendingFacts.length === 0 ? (
            <div className="glass-card rounded-2xl p-6 text-center text-xs text-ink-muted">
              No pending fact suggestions. When you attach admissions webpages or prospectuses, suggested requirements will appear here for your confirmation.
            </div>
          ) : (
            pendingFacts.map((fact) => {
              const val = fact.value || {};
              const extractedValue = val.extractedValue || fact.label;
              const context = val.context || "";
              const reason = val.confidenceReason || "";

              return (
                <div
                  key={fact.id}
                  className="glass-card rounded-2xl p-5 space-y-3 border border-brand/20 bg-white/75"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="glass-badge-blue px-2.5 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider">
                        {fact.fact_type}
                      </span>
                      <h4 className="font-heading font-extrabold text-sm text-ink-deep">
                        {fact.label}
                      </h4>
                    </div>

                    <span
                      className={`text-[11px] font-semibold px-2 py-0.5 rounded-md ${
                        fact.confidence === "clear"
                          ? "glass-badge-teal text-teal-dark"
                          : "glass-badge-neutral text-ink-muted"
                      }`}
                    >
                      {fact.confidence === "clear" ? "High Confidence" : "Needs Verification"}
                    </span>
                  </div>

                  {/* Extracted value display / Edit field */}
                  {editingId === fact.id ? (
                    <div className="flex items-center gap-2 bg-white/90 p-2 rounded-xl border border-glass-border">
                      <input
                        type="text"
                        value={editedValueInput}
                        onChange={(e) => setEditedValueInput(e.target.value)}
                        className="flex-1 text-xs p-1.5 rounded-lg glass-input text-ink-deep"
                      />
                      <button
                        onClick={() => handleEditConfirm(fact.id)}
                        disabled={isSubmittingId === fact.id}
                        className="px-3 py-1.5 text-xs font-bold text-white bg-brand rounded-lg disabled:opacity-50"
                      >
                        Save &amp; Confirm
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="px-2 py-1.5 text-xs text-ink-muted"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-ink-deep">
                        Extracted Value: <span className="font-normal">{extractedValue}</span>
                      </p>
                      {context && (
                        <blockquote className="text-xs text-ink-muted bg-white/60 p-2.5 rounded-xl border-l-2 border-brand/40 italic">
                          &ldquo;{context}&rdquo;
                        </blockquote>
                      )}
                      {reason && (
                        <p className="text-[11px] text-ink-subtle">Rationale: {reason}</p>
                      )}
                    </div>
                  )}

                  {/* Review Actions */}
                  {editingId !== fact.id && (
                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-glass-borderSubtle">
                      <button
                        onClick={() => handleReject(fact.id)}
                        disabled={isSubmittingId === fact.id}
                        className="px-3 py-1.5 text-xs font-semibold text-ink-subtle hover:text-red-600 rounded-xl transition-colors"
                      >
                        Dismiss
                      </button>
                      <button
                        onClick={() => startEditing(fact)}
                        disabled={isSubmittingId === fact.id}
                        className="px-3 py-1.5 text-xs font-bold text-ink-muted hover:text-ink-deep glass-card rounded-xl hover:bg-white"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleConfirm(fact.id)}
                        disabled={isSubmittingId === fact.id}
                        className="px-4 py-1.5 text-xs font-bold text-white bg-gradient-to-r from-teal to-teal-dark rounded-xl shadow-sm hover:from-teal-dark hover:to-teal disabled:opacity-50"
                      >
                        Confirm Fact &rarr;
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ── Tab 2: Confirmed Facts ── */}
      {activeTab === "confirmed" && (
        <div className="space-y-3">
          {confirmedFacts.length === 0 ? (
            <div className="glass-card rounded-2xl p-6 text-center text-xs text-ink-muted">
              No confirmed facts yet. When you confirm suggested requirements, they will be listed here and added to your application checklist automatically.
            </div>
          ) : (
            confirmedFacts.map((fact) => {
              const val = fact.value || {};
              const extractedValue = val.extractedValue || fact.label;

              return (
                <div
                  key={fact.id}
                  className="glass-card rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="glass-badge-teal px-2 py-0.5 rounded text-[10px] font-bold uppercase">
                        {fact.review_state === "edited" ? "Edited & Confirmed" : "Confirmed Fact"}
                      </span>
                      <h4 className="font-heading font-extrabold text-sm text-ink-deep truncate">
                        {fact.label}
                      </h4>
                    </div>
                    <p className="text-xs text-ink-muted truncate">
                      Value: <strong className="text-ink-deep">{extractedValue}</strong>
                    </p>
                  </div>

                  <span className="text-[11px] font-semibold text-teal-dark glass-badge-teal px-2.5 py-1 rounded-xl self-end sm:self-center">
                    Active Grounding Data
                  </span>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

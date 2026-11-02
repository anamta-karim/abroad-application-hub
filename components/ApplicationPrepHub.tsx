"use client";

import { useState } from "react";
import { askGroundedQuestionAction } from "@/app/app/applications/[id]/rag/actions";
import type { GroundedResponse, CitationItem } from "@/lib/rag/engine";

interface ApplicationPrepHubProps {
  applicationId: string;
  hasSources: boolean;
}

export function ApplicationPrepHub({ applicationId, hasSources }: ApplicationPrepHubProps) {
  const [activeWorkflow, setActiveWorkflow] = useState<"qa" | "sop" | "interview" | "lor" | "study_plan">("qa");
  const [queryInput, setQueryInput] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [response, setResponse] = useState<GroundedResponse | null>(null);
  const [activeCitation, setActiveCitation] = useState<CitationItem | null>(null);

  async function handleAsk(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!queryInput.trim()) return;

    setIsPending(true);
    setErrorMsg(null);
    setActiveCitation(null);

    const res = await askGroundedQuestionAction(applicationId, queryInput.trim(), activeWorkflow);
    if (res.error) {
      setErrorMsg(res.error);
    } else if (res.response) {
      setResponse(res.response);
    }
    setIsPending(false);
  }

  async function handleQuickWorkflow(type: "sop" | "interview" | "lor" | "study_plan") {
    setActiveWorkflow(type);
    setIsPending(true);
    setErrorMsg(null);
    setActiveCitation(null);

    const promptMap = {
      sop: "What are the core research focus areas and faculty priorities I should highlight in my Statement of Purpose?",
      interview: "What potential interview questions and curriculum talking points should I prepare for?",
      lor: "What specific academic strengths and criteria should my recommendation letters emphasize?",
      study_plan: "What is the semester course outline and thesis schedule for this program?",
    };

    const q = promptMap[type];
    const res = await askGroundedQuestionAction(applicationId, q, type);
    if (res.error) {
      setErrorMsg(res.error);
    } else if (res.response) {
      setResponse(res.response);
    }
    setIsPending(false);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-glass-borderSubtle">
        <div>
          <h2 className="font-heading font-extrabold text-base text-ink-deep">
            Grounded Prep Studio &amp; Q&amp;A
          </h2>
          <p className="text-xs text-ink-muted mt-0.5">
            Ask factual questions or generate tailored preparation blueprints strictly backed by your uploaded sources.
          </p>
        </div>

        {/* Workflow Switcher Pills */}
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 text-xs font-bold scrollbar-none">
          <button
            onClick={() => { setActiveWorkflow("qa"); setResponse(null); }}
            className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer min-h-[34px] flex items-center space-x-1.5 ${
              activeWorkflow === "qa"
                ? "glass-nav-active font-extrabold"
                : "glass-card text-ink-muted hover:text-ink-deep bg-white/40"
            }`}
          >
            <span>💬 Free Q&amp;A</span>
          </button>
          <button
            onClick={() => handleQuickWorkflow("sop")}
            disabled={isPending}
            className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer min-h-[34px] flex items-center space-x-1.5 ${
              activeWorkflow === "sop"
                ? "glass-nav-active font-extrabold"
                : "glass-card text-ink-muted hover:text-ink-deep bg-white/40"
            }`}
          >
            <span>📝 SOP Blueprint</span>
          </button>
          <button
            onClick={() => handleQuickWorkflow("interview")}
            disabled={isPending}
            className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer min-h-[34px] flex items-center space-x-1.5 ${
              activeWorkflow === "interview"
                ? "glass-nav-active font-extrabold"
                : "glass-card text-ink-muted hover:text-ink-deep bg-white/40"
            }`}
          >
            <span>🎤 Interview Prep</span>
          </button>
          <button
            onClick={() => handleQuickWorkflow("lor")}
            disabled={isPending}
            className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer min-h-[34px] flex items-center space-x-1.5 ${
              activeWorkflow === "lor"
                ? "glass-nav-active font-extrabold"
                : "glass-card text-ink-muted hover:text-ink-deep bg-white/40"
            }`}
          >
            <span>✉️ LOR Strategy</span>
          </button>
          <button
            onClick={() => handleQuickWorkflow("study_plan")}
            disabled={isPending}
            className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer min-h-[34px] flex items-center space-x-1.5 ${
              activeWorkflow === "study_plan"
                ? "glass-nav-active font-extrabold"
                : "glass-card text-ink-muted hover:text-ink-deep bg-white/40"
            }`}
          >
            <span>📅 Study Plan</span>
          </button>
        </div>
      </div>

      {!hasSources && (
        <div className="glass-card-subtle rounded-2xl p-4 text-xs text-ink-muted flex items-start space-x-3">
          <span className="text-base">ℹ️</span>
          <div>
            <p className="font-semibold text-ink-deep">No official sources attached yet.</p>
            <p className="mt-0.5">
              To ground your answers and preparation blueprints with official evidence, attach a prospectus PDF or webpage above.
            </p>
          </div>
        </div>
      )}

      {/* ── Query Input Form ── */}
      <form onSubmit={handleAsk} className="flex gap-2">
        <input
          type="text"
          value={queryInput}
          onChange={(e) => setQueryInput(e.target.value)}
          placeholder="Ask a question about admission requirements, deadlines, or criteria..."
          className="flex-1 px-4 py-2.5 rounded-xl text-xs sm:text-sm glass-input text-ink-deep placeholder:text-ink-subtle"
        />
        <button
          type="submit"
          disabled={isPending || !queryInput.trim()}
          className="px-5 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-brand to-brand-dark hover:from-brand-hover hover:to-brand rounded-xl shadow-md transition-all disabled:opacity-50 flex items-center space-x-1.5 cursor-pointer"
        >
          <span>{isPending ? "Retrieving..." : "Ask Sources"}</span>
          <span>&rarr;</span>
        </button>
      </form>

      {errorMsg && (
        <div className="p-3 text-xs rounded-xl bg-red-50 text-red-800 border border-red-200">
          {errorMsg}
        </div>
      )}

      {/* ── Response Card ── */}
      {response && (
        <div className="glass-card rounded-2xl p-5 sm:p-6 space-y-4 animate-fade-in border border-brand/20 bg-white/75">
          {/* Header */}
          <div className="flex items-center justify-between">
            <span
              className={`text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-lg ${
                response.isAbstention ? "glass-badge-neutral text-ink-muted" : "glass-badge-teal text-teal-dark"
              }`}
            >
              {response.isAbstention ? "Evidence Missing (Abstention)" : "Verified Source Grounding"}
            </span>

            <span className="text-[11px] text-ink-subtle">
              {response.citations.length} Official Citations
            </span>
          </div>

          {/* Formatted Factual Answer Body */}
          <GroundedAnswerView content={response.answer} />

          {/* Structured Citation Chips */}
          {response.citations.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-glass-borderSubtle">
              <span className="text-[11px] font-bold uppercase tracking-wider text-ink-subtle block font-heading">
                Source Citations
              </span>
              <div className="flex flex-wrap gap-2">
                {response.citations.map((citation, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActiveCitation(activeCitation === citation ? null : citation)}
                    className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center space-x-1.5 ${
                      activeCitation === citation
                        ? "glass-badge-blue text-brand-dark font-bold ring-2 ring-brand/30"
                        : "glass-card text-ink-muted hover:text-ink-deep bg-white/60"
                    }`}
                  >
                    <span>📄</span>
                    <span className="truncate max-w-[200px]">{citation.sourceTitle}</span>
                    {citation.pageNumber && (
                      <span className="text-brand font-bold">p. {citation.pageNumber}</span>
                    )}
                  </button>
                ))}
              </div>

              {/* Citation Quote Inspector */}
              {activeCitation && (
                <div className="p-3.5 rounded-xl bg-white/80 border border-brand/30 text-xs space-y-1.5 animate-fade-in">
                  <div className="flex items-center justify-between text-[11px] font-bold text-ink-deep">
                    <span>Citation Quote from {activeCitation.sourceTitle}</span>
                    <span className="text-ink-subtle">
                      {activeCitation.pageNumber ? `Page ${activeCitation.pageNumber}` : "Web Content"}
                    </span>
                  </div>
                  <blockquote className="italic text-ink-muted pl-2 border-l-2 border-brand/50">
                    &ldquo;{activeCitation.quote}&rdquo;
                  </blockquote>
                </div>
              )}
            </div>
          )}

          {/* Strategic Suggestions (Visually Separated from Official Facts) */}
          {response.strategicSuggestions && response.strategicSuggestions.length > 0 && (
            <div className="pt-3 border-t border-glass-borderSubtle space-y-2">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold text-ink-deep font-heading">
                  Strategy Suggestions
                </span>
                <span className="text-[10px] text-ink-subtle bg-slate-100 px-2 py-0.5 rounded">
                  Coaching Advice &bull; Not Official Admissions Rule
                </span>
              </div>
              <ul className="space-y-1 text-xs text-ink-muted list-disc list-inside">
                {response.strategicSuggestions.map((s, idx) => (
                  <li key={idx} className="leading-relaxed">
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function GroundedAnswerView({ content }: { content: string }) {
  const paragraphs = content.split("\n\n");

  return (
    <div className="space-y-3 text-xs sm:text-sm text-ink-deep leading-relaxed">
      {paragraphs.map((para, pIdx) => {
        const trimmed = para.trim();
        if (!trimmed) return null;

        if (trimmed.startsWith("### ")) {
          return (
            <h3 key={pIdx} className="font-heading font-extrabold text-sm sm:text-base text-ink-deep pt-1">
              {trimmed.replace(/^###\s+/, "")}
            </h3>
          );
        }

        if (trimmed.startsWith("#### ")) {
          return (
            <h4 key={pIdx} className="font-heading font-bold text-xs sm:text-sm text-brand-dark pt-1">
              {trimmed.replace(/^####\s+/, "")}
            </h4>
          );
        }

        const lines = trimmed.split("\n");
        const isList = lines.every(
          (line) =>
            line.trim().startsWith("•") ||
            line.trim().startsWith("-") ||
            /^\d+\.\s/.test(line.trim())
        );

        if (isList) {
          return (
            <ul key={pIdx} className="space-y-1.5 pl-1">
              {lines.map((line, lIdx) => {
                const cleanedLine = line.replace(/^[•\-]\s*/, "");
                return (
                  <li key={lIdx} className="leading-relaxed flex items-start space-x-2">
                    <span className="text-brand font-bold mt-0.5">•</span>
                    <span
                      dangerouslySetInnerHTML={{
                        __html: formatInlineMarkdown(cleanedLine),
                      }}
                    />
                  </li>
                );
              })}
            </ul>
          );
        }

        return (
          <div key={pIdx} className="space-y-1">
            {lines.map((line, lIdx) => (
              <p
                key={lIdx}
                className="leading-relaxed"
                dangerouslySetInnerHTML={{ __html: formatInlineMarkdown(line) }}
              />
            ))}
          </div>
        );
      })}
    </div>
  );
}

function formatInlineMarkdown(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(/`([^`]+)`/g, "<code class='bg-slate-100 px-1 py-0.5 rounded text-[11px] font-mono'>$1</code>");
}

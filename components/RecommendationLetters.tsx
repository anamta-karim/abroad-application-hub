"use client";

import { useState } from "react";
import Link from "next/link";
import { runAction } from "@/lib/client/runAction";
import { InlineError } from "@/components/InlineError";
import { addLetterAction, removeLetterAction, updateLetterAction } from "@/app/app/recommenders/actions";
import {
  EMAIL_ACTION_LABELS,
  LETTER_STATUSES,
  LETTER_STATUS_LABELS,
  letterAdvice,
  letterDueDate,
  letterEmailDraft,
  letterProgress,
  letterProgressText,
  mailtoHref,
  type LettersNeeded,
} from "@/lib/recommendations";
import type { LetterWithRecommender } from "@/lib/recommendationsData";
import { formatDateLabel } from "@/lib/calendar";
import { ADVICE_STYLES, LETTER_STATUS_STYLES } from "@/components/letterStyles";

interface RefereeOption {
  id: string;
  name: string;
  role: string | null;
}

interface RecommendationLettersProps {
  applicationId: string;
  appTitle: string;
  institution: string | null;
  appDeadline: string | null;
  applicantName: string | null;
  letters: LetterWithRecommender[];
  referees: RefereeOption[];
  needed: LettersNeeded | null;
  migrationMissing: boolean;
  today: string;
}

const NEW = "__new__";

export function RecommendationLetters({
  applicationId,
  appTitle,
  institution,
  appDeadline,
  applicantName,
  letters,
  referees,
  needed,
  migrationMissing,
  today,
}: RecommendationLettersProps) {
  const [showAdd, setShowAdd] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onThisApp = new Set(letters.map((l) => l.recommender_id));
  const available = referees.filter((r) => !onThisApp.has(r.id));
  const [choice, setChoice] = useState<string>(available[0]?.id ?? NEW);
  const selected = available.some((r) => r.id === choice) ? choice : NEW;

  const progress = letterProgress(letters, needed?.count ?? null);

  async function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setError(null);
    setBusy("add");
    const err = await runAction(() =>
      addLetterAction(applicationId, {
        recommenderId: selected === NEW ? undefined : selected,
        newRecommender:
          selected === NEW
            ? { name: String(form.get("name") ?? ""), role: String(form.get("role") ?? ""), email: String(form.get("email") ?? "") }
            : undefined,
        dueOn: String(form.get("dueOn") ?? ""),
      })
    );
    setBusy(null);
    if (err) {
      setError(`Referee not added: ${err}`);
      return;
    }
    setShowAdd(false);
  }

  async function update(letterId: string, patch: Parameters<typeof updateLetterAction>[1]) {
    setError(null);
    setBusy(letterId);
    const err = await runAction(() => updateLetterAction(letterId, patch));
    setBusy(null);
    if (err) setError(`Couldn't update the letter: ${err}`);
  }

  async function remove(letter: LetterWithRecommender) {
    const name = letter.recommender?.name ?? "this referee";
    if (!confirm(`Remove ${name}'s letter from this application? They stay in your list of referees.`)) return;
    setError(null);
    setBusy(letter.id);
    const err = await runAction(() => removeLetterAction(letter.id));
    setBusy(null);
    if (err) setError(`Couldn't remove the letter: ${err}`);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3 pb-2 border-b border-glass-borderSubtle">
        <div>
          <h2 id="letters-heading" className="font-heading font-bold text-lg text-ink-deep">
            Recommendation Letters
          </h2>
          <p className="text-xs text-ink-muted mt-0.5">{letterProgressText(progress)}</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <Link href="/app/recommenders" className="text-xs font-bold text-brand hover:text-brand-dark">
            All referees
          </Link>
          {!migrationMissing && (
            <button
              type="button"
              onClick={() => setShowAdd(!showAdd)}
              className="px-3.5 py-1.5 text-xs font-bold text-brand hover:text-brand-dark glass-input rounded-xl hover:bg-white transition-colors cursor-pointer"
            >
              {showAdd ? "Cancel" : "+ Add Referee"}
            </button>
          )}
        </div>
      </div>

      {migrationMissing && (
        <div className="p-3 text-xs rounded-xl bg-amber-50 border border-amber-200 text-amber-900">
          Run the <code>20261119000000_recommendation_letters.sql</code> migration in the Supabase SQL Editor to track
          recommendation letters.
        </div>
      )}

      {needed && (
        <details className="text-xs text-ink-muted">
          <summary className="cursor-pointer">
            This application asks for{" "}
            <strong className="text-ink-deep">
              {needed.count} {needed.count === 1 ? "letter" : "letters"}
            </strong>{" "}
            (from {needed.sourceTitle}
            {needed.pageNumber ? `, p. ${needed.pageNumber}` : ""})
          </summary>
          <blockquote className="mt-1.5 pl-3 border-l-2 border-slate-200 italic">&ldquo;{needed.quote}&rdquo;</blockquote>
        </details>
      )}

      <InlineError message={error} onDismiss={() => setError(null)} />

      {showAdd && (
        <form onSubmit={handleAdd} className="glass-card rounded-2xl p-4 sm:p-5 space-y-3">
          {available.length > 0 && (
            <div className="space-y-1">
              <label htmlFor="letter-referee" className="block text-xs font-bold text-ink-deep font-heading">
                Referee
              </label>
              <select
                id="letter-referee"
                value={selected}
                onChange={(e) => setChoice(e.target.value)}
                className="w-full h-10 px-3 text-xs glass-input rounded-xl"
              >
                {available.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                    {r.role ? ` (${r.role})` : ""}
                  </option>
                ))}
                <option value={NEW}>Someone new…</option>
              </select>
            </div>
          )}

          {selected === NEW && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label htmlFor="letter-name" className="block text-xs font-bold text-ink-deep font-heading">
                  Name <span className="text-brand">*</span>
                </label>
                <input id="letter-name" name="name" required maxLength={120} placeholder="e.g. Prof. Asha Rao" className="w-full h-10 px-3.5 text-xs glass-input rounded-xl" />
              </div>
              <div className="space-y-1">
                <label htmlFor="letter-role" className="block text-xs font-bold text-ink-deep font-heading">
                  Role
                </label>
                <input id="letter-role" name="role" maxLength={160} placeholder="e.g. Thesis supervisor" className="w-full h-10 px-3.5 text-xs glass-input rounded-xl" />
              </div>
              <div className="space-y-1">
                <label htmlFor="letter-email" className="block text-xs font-bold text-ink-deep font-heading">
                  Email
                </label>
                <input id="letter-email" name="email" type="email" maxLength={254} placeholder="For ready-made emails" className="w-full h-10 px-3.5 text-xs glass-input rounded-xl" />
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row sm:items-end gap-3">
            <div className="space-y-1 sm:w-56">
              <label htmlFor="letter-due" className="block text-xs font-bold text-ink-deep font-heading">
                Letter due (optional)
              </label>
              <input id="letter-due" name="dueOn" type="date" className="w-full h-10 px-3.5 text-xs glass-input rounded-xl" />
            </div>
            <p className="text-[11px] text-ink-subtle flex-1 sm:pb-2.5">
              {appDeadline
                ? `Leave blank to use the application deadline (${formatDateLabel(appDeadline)}).`
                : "Some portals close referee uploads before the application deadline."}
            </p>
            <button
              type="submit"
              disabled={busy === "add"}
              className="px-5 py-2 text-xs font-bold text-white bg-gradient-to-r from-brand to-brand-dark rounded-xl shadow-sm transition-all disabled:opacity-50"
            >
              {busy === "add" ? "Adding…" : "Add Referee"}
            </button>
          </div>
        </form>
      )}

      {letters.length === 0 && !migrationMissing ? (
        <div className="glass-card rounded-2xl p-6 text-center text-xs text-ink-muted">
          <p className="font-semibold text-ink-deep">No referees added yet.</p>
          <p className="text-ink-subtle mt-1">
            Add who&apos;s writing your letters to track asks, follow-ups and submissions, with ready-made emails.
          </p>
        </div>
      ) : (
        <ul className="space-y-2.5">
          {letters.map((letter) => {
            const name = letter.recommender?.name ?? "Referee";
            const due = letterDueDate(letter, appDeadline);
            const advice = letterAdvice(letter, appDeadline, today);
            const draft = letterEmailDraft({
              status: letter.status,
              recommenderName: name,
              applicantName,
              appTitle,
              institution,
              dueDate: due,
            });
            const emailLabel = EMAIL_ACTION_LABELS[letter.status];
            const email = letter.recommender?.email;
            return (
              <li key={letter.id} className="glass-card rounded-2xl p-4 space-y-2.5 text-xs">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-bold text-sm text-ink-deep">{name}</p>
                    {letter.recommender?.role && <p className="text-ink-muted">{letter.recommender.role}</p>}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <label className="sr-only" htmlFor={`status-${letter.id}`}>
                      Status of {name}&apos;s letter
                    </label>
                    <select
                      id={`status-${letter.id}`}
                      value={letter.status}
                      disabled={busy === letter.id}
                      onChange={(e) => update(letter.id, { status: e.target.value })}
                      className={`h-8 px-2 rounded-lg border text-xs font-bold ${LETTER_STATUS_STYLES[letter.status]}`}
                    >
                      {LETTER_STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {LETTER_STATUS_LABELS[s]}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => remove(letter)}
                      disabled={busy === letter.id}
                      className="p-1.5 text-ink-subtle hover:text-red-600 rounded-lg"
                      title="Remove from this application"
                      aria-label={`Remove ${name}'s letter from this application`}
                    >
                      &times;
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-ink-muted">
                  <label className="inline-flex items-center gap-1.5">
                    <span>Due</span>
                    <input
                      type="date"
                      aria-label={`Due date for ${name}'s letter`}
                      defaultValue={letter.due_on ?? ""}
                      key={letter.due_on ?? "none"}
                      disabled={busy === letter.id}
                      onChange={(e) => {
                        const v = e.target.value;
                        if (v === "" || /^\d{4}-\d{2}-\d{2}$/.test(v)) update(letter.id, { dueOn: v });
                      }}
                      className="h-7 px-2 text-xs glass-input rounded-lg"
                    />
                    {!letter.due_on && appDeadline && <span className="text-ink-subtle">(deadline {formatDateLabel(appDeadline)})</span>}
                  </label>
                  {letter.asked_on && letter.status !== "to_ask" && <span>Asked {formatDateLabel(letter.asked_on)}</span>}
                </div>

                {advice && <p className={`font-semibold ${ADVICE_STYLES[advice.tone]}`}>{advice.text}</p>}

                {draft && emailLabel && (
                  <div>
                    {email ? (
                      <a
                        href={mailtoHref(email, draft)}
                        className="inline-flex items-center gap-1 font-bold text-brand hover:text-brand-dark"
                      >
                        ✉ {emailLabel}
                      </a>
                    ) : (
                      <span className="text-ink-subtle">
                        <Link href="/app/recommenders" className="font-semibold text-brand hover:text-brand-dark">
                          Add {name}&apos;s email
                        </Link>{" "}
                        to get a ready-made email.
                      </span>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

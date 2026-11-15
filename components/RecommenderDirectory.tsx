"use client";

import { useState } from "react";
import Link from "next/link";
import { runAction } from "@/lib/client/runAction";
import { InlineError } from "@/components/InlineError";
import { deleteRecommenderAction, saveRecommenderAction, type RecommenderFields } from "@/app/app/recommenders/actions";
import { LETTER_STATUS_LABELS } from "@/lib/recommendations";
import { LETTER_STATUS_STYLES } from "@/components/letterStyles";
import { formatDateLabel } from "@/lib/calendar";
import type { LetterStatus } from "@/types/database";

export interface DirectoryReferee {
  id: string;
  name: string;
  role: string | null;
  email: string | null;
  notes: string | null;
  letters: { id: string; applicationId: string; appTitle: string; status: LetterStatus; due: string | null }[];
}

function fieldsFrom(form: HTMLFormElement): RecommenderFields {
  const data = new FormData(form);
  return {
    name: String(data.get("name") ?? ""),
    role: String(data.get("role") ?? ""),
    email: String(data.get("email") ?? ""),
    notes: String(data.get("notes") ?? ""),
  };
}

function RefereeFields({ idPrefix, initial }: { idPrefix: string; initial?: DirectoryReferee }) {
  const input = "w-full h-10 px-3.5 text-xs glass-input rounded-xl";
  const label = "block text-xs font-bold text-ink-deep font-heading";
  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="space-y-1">
          <label htmlFor={`${idPrefix}-name`} className={label}>
            Name <span className="text-brand">*</span>
          </label>
          <input id={`${idPrefix}-name`} name="name" required maxLength={120} defaultValue={initial?.name} placeholder="e.g. Prof. Asha Rao" className={input} />
        </div>
        <div className="space-y-1">
          <label htmlFor={`${idPrefix}-role`} className={label}>
            Role
          </label>
          <input id={`${idPrefix}-role`} name="role" maxLength={160} defaultValue={initial?.role ?? ""} placeholder="e.g. Thesis supervisor" className={input} />
        </div>
        <div className="space-y-1">
          <label htmlFor={`${idPrefix}-email`} className={label}>
            Email
          </label>
          <input id={`${idPrefix}-email`} name="email" type="email" maxLength={254} defaultValue={initial?.email ?? ""} placeholder="For ready-made emails" className={input} />
        </div>
      </div>
      <div className="space-y-1">
        <label htmlFor={`${idPrefix}-notes`} className={label}>
          Notes
        </label>
        <textarea
          id={`${idPrefix}-notes`}
          name="notes"
          maxLength={2000}
          rows={2}
          defaultValue={initial?.notes ?? ""}
          placeholder="e.g. Taught me Machine Learning (A grade); prefers a 1-page summary of my projects"
          className="w-full px-3.5 py-2 text-xs glass-input rounded-xl"
        />
      </div>
    </>
  );
}

export function RecommenderDirectory({ referees, migrationMissing }: { referees: DirectoryReferee[]; migrationMissing: boolean }) {
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function save(id: string | null, form: HTMLFormElement) {
    setError(null);
    setBusy(id ?? "add");
    const err = await runAction(() => saveRecommenderAction(id, fieldsFrom(form)));
    setBusy(null);
    if (err) {
      setError(`${id ? "Changes not saved" : "Referee not added"}: ${err}`);
      return;
    }
    if (id) setEditing(null);
    else setAdding(false);
  }

  async function remove(referee: DirectoryReferee) {
    const n = referee.letters.length;
    const what = n > 0 ? ` and the ${n === 1 ? "letter" : `${n} letters`} they're tracked for` : "";
    if (!confirm(`Delete ${referee.name}${what}? This can't be undone.`)) return;
    setError(null);
    setBusy(referee.id);
    const err = await runAction(() => deleteRecommenderAction(referee.id));
    setBusy(null);
    if (err) setError(`Couldn't delete the referee: ${err}`);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-heading font-bold text-base text-ink-deep">Your referees</h2>
          <p className="text-xs text-ink-muted mt-0.5">Only visible to you. Add their email to get ready-made emails to ask, follow up and thank them.</p>
        </div>
        {!migrationMissing && (
          <button
            type="button"
            onClick={() => setAdding(!adding)}
            className="shrink-0 px-3.5 py-1.5 text-xs font-bold text-brand hover:text-brand-dark glass-input rounded-xl hover:bg-white transition-colors cursor-pointer"
          >
            {adding ? "Cancel" : "+ Add Referee"}
          </button>
        )}
      </div>

      {migrationMissing && (
        <div className="p-3 text-xs rounded-xl bg-amber-50 border border-amber-200 text-amber-900">
          Run the <code>20261119000000_recommendation_letters.sql</code> migration in the Supabase SQL Editor to track
          recommendation letters.
        </div>
      )}

      <InlineError message={error} onDismiss={() => setError(null)} />

      {adding && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            save(null, e.currentTarget);
          }}
          className="glass-card rounded-2xl p-4 sm:p-5 space-y-3"
        >
          <RefereeFields idPrefix="new-referee" />
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={busy === "add"}
              className="px-5 py-2 text-xs font-bold text-white bg-gradient-to-r from-brand to-brand-dark rounded-xl shadow-sm disabled:opacity-50"
            >
              {busy === "add" ? "Adding…" : "Add Referee"}
            </button>
          </div>
        </form>
      )}

      {referees.length === 0 && !migrationMissing && !adding && (
        <div className="glass-card rounded-2xl p-6 text-center text-xs text-ink-muted">
          <p className="font-semibold text-ink-deep">No referees yet.</p>
          <p className="text-ink-subtle mt-1">Add the professors or managers you plan to ask, then attach them to each application.</p>
        </div>
      )}

      <ul className="grid gap-3 lg:grid-cols-2">
        {referees.map((r) => (
          <li key={r.id} className="glass-card rounded-2xl p-4 space-y-3 text-xs">
            {editing === r.id ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  save(r.id, e.currentTarget);
                }}
                className="space-y-3"
              >
                <RefereeFields idPrefix={`edit-${r.id}`} initial={r} />
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => setEditing(null)} className="px-4 py-2 text-xs font-bold text-ink-muted hover:text-ink-deep">
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={busy === r.id}
                    className="px-5 py-2 text-xs font-bold text-white bg-gradient-to-r from-brand to-brand-dark rounded-xl shadow-sm disabled:opacity-50"
                  >
                    {busy === r.id ? "Saving…" : "Save"}
                  </button>
                </div>
              </form>
            ) : (
              <>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-heading font-bold text-sm text-ink-deep">{r.name}</p>
                    {r.role && <p className="text-ink-muted">{r.role}</p>}
                    {r.email ? (
                      <p className="text-ink-muted break-all">{r.email}</p>
                    ) : (
                      <p className="text-ink-subtle">No email added</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button type="button" onClick={() => setEditing(r.id)} className="px-2.5 py-1 font-bold text-brand hover:text-brand-dark">
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(r)}
                      disabled={busy === r.id}
                      className="px-2.5 py-1 font-bold text-ink-subtle hover:text-red-600"
                    >
                      Delete
                    </button>
                  </div>
                </div>
                {r.notes && <p className="text-ink-main whitespace-pre-line">{r.notes}</p>}
                {r.letters.length === 0 ? (
                  <p className="text-ink-subtle">Not attached to any application yet. Add them from an application page.</p>
                ) : (
                  <ul className="space-y-1.5">
                    {r.letters.map((l) => (
                      <li key={l.id} className="flex items-center justify-between gap-2">
                        <Link href={`/app/applications/${l.applicationId}#letters-heading`} className="font-semibold text-ink-deep hover:text-brand truncate">
                          {l.appTitle}
                        </Link>
                        <span className="flex items-center gap-2 shrink-0">
                          {l.due && <span className="text-ink-subtle">due {formatDateLabel(l.due)}</span>}
                          <span className={`px-2 py-0.5 rounded-lg border text-[11px] font-bold ${LETTER_STATUS_STYLES[l.status]}`}>
                            {LETTER_STATUS_LABELS[l.status]}
                          </span>
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

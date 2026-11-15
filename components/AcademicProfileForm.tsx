"use client";

import { useState, useTransition } from "react";
import { saveAcademicProfileAction } from "@/app/app/eligibility/actions";
import { runAction } from "@/lib/client/runAction";
import { InlineError } from "@/components/InlineError";
import { DEGREE_LABELS, type AcademicProfile } from "@/lib/eligibility";
import type { DegreeLevel } from "@/types/database";

type FieldKey = Exclude<keyof AcademicProfile, "highest_degree">;

interface FieldDef {
  key: FieldKey;
  label: string;
  placeholder: string;
  step: string;
  hint?: string;
}

const GROUPS: { title: string; fields: FieldDef[] }[] = [
  {
    title: "Grades",
    fields: [
      { key: "gpa", label: "GPA / CGPA / percentage", placeholder: "e.g. 3.4, 8.2 or 72", step: "0.01" },
      { key: "gpa_scale", label: "Out of", placeholder: "e.g. 4, 10 or 100", step: "0.01", hint: "Use 100 for percentages." },
    ],
  },
  {
    title: "English tests (fill in any you've taken; leave the rest blank)",
    fields: [
      { key: "ielts_overall", label: "IELTS overall", placeholder: "e.g. 7.0", step: "0.5" },
      { key: "ielts_min_band", label: "IELTS lowest band", placeholder: "e.g. 6.5", step: "0.5" },
      { key: "toefl_ibt", label: "TOEFL iBT", placeholder: "0–120", step: "1" },
      { key: "pte_academic", label: "PTE Academic", placeholder: "10–90", step: "1" },
      { key: "duolingo", label: "Duolingo English Test", placeholder: "10–160", step: "1" },
    ],
  },
  {
    title: "Other",
    fields: [
      { key: "gre_total", label: "GRE total", placeholder: "260–340", step: "1" },
      { key: "gmat_total", label: "GMAT total", placeholder: "200–805", step: "1" },
      { key: "work_experience_years", label: "Work experience (years)", placeholder: "e.g. 2", step: "0.5" },
    ],
  },
];

const toInput = (v: number | null) => (v === null ? "" : String(v));

export function AcademicProfileForm({ initial, migrationMissing }: { initial: AcademicProfile | null; migrationMissing: boolean }) {
  const [values, setValues] = useState<Record<string, string>>(() => {
    const start: Record<string, string> = { highest_degree: initial?.highest_degree ?? "" };
    for (const g of GROUPS) for (const f of g.fields) start[f.key] = toInput(initial?.[f.key] ?? null);
    return start;
  });
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  function update(key: string, value: string) {
    setValues((v) => ({ ...v, [key]: value }));
    setSaved(false);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const err = await runAction(() => saveAcademicProfileAction(values));
      if (err) setError(err);
      else setSaved(true);
    });
  }

  return (
    <form onSubmit={submit} className="space-y-5" aria-label="Academic profile">
      {migrationMissing && (
        <p role="alert" className="p-3 text-xs rounded-xl bg-amber-50 border border-amber-200 text-amber-900">
          Run the <code>20261118000000_academic_profiles.sql</code> migration in the Supabase SQL Editor to save your profile.
        </p>
      )}

      <div className="space-y-1.5">
        <label htmlFor="highest_degree" className="block text-xs font-bold text-ink-deep">
          Highest degree completed
        </label>
        <select
          id="highest_degree"
          value={values.highest_degree}
          onChange={(e) => update("highest_degree", e.target.value)}
          className="w-full sm:w-80 px-3.5 py-2.5 text-sm rounded-xl glass-input text-ink-deep"
        >
          <option value="">Not set</option>
          {(Object.keys(DEGREE_LABELS) as DegreeLevel[]).map((d) => (
            <option key={d} value={d}>
              {DEGREE_LABELS[d]}
            </option>
          ))}
        </select>
      </div>

      {GROUPS.map((group) => (
        <fieldset key={group.title} className="space-y-2">
          <legend className="text-xs font-bold uppercase tracking-wider text-ink-muted font-heading">{group.title}</legend>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {group.fields.map((f) => (
              <div key={f.key} className="space-y-1">
                <label htmlFor={f.key} className="block text-xs font-semibold text-ink-deep">
                  {f.label}
                </label>
                <input
                  id={f.key}
                  type="number"
                  inputMode="decimal"
                  step={f.step}
                  min={0}
                  value={values[f.key]}
                  onChange={(e) => update(f.key, e.target.value)}
                  placeholder={f.placeholder}
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl glass-input text-ink-deep placeholder:text-ink-subtle"
                />
                {f.hint && <p className="text-[11px] text-ink-subtle">{f.hint}</p>}
              </div>
            ))}
          </div>
        </fieldset>
      ))}

      <InlineError message={error} onDismiss={() => setError(null)} />

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="h-10 px-5 text-xs font-bold text-white bg-gradient-to-r from-brand to-brand-dark rounded-xl shadow-md shadow-brand/20 disabled:opacity-50 cursor-pointer"
        >
          {isPending ? "Saving…" : "Save profile"}
        </button>
        {saved && !isPending && (
          <span role="status" className="text-xs font-semibold text-teal-800">
            Saved. Your matches below are updated.
          </span>
        )}
      </div>
    </form>
  );
}

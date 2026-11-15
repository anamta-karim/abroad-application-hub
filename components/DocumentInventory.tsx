"use client";

import { useEffect, useState, useTransition } from "react";
import {
  setCommonDocumentAction,
  setDocumentExpiryAction,
  addCustomDocumentAction,
  removeCustomDocumentAction,
} from "@/app/app/documents/actions";
import { runAction } from "@/lib/client/runAction";
import { InlineError } from "@/components/InlineError";

export interface InventoryItem {
  key: string;
  label: string;
  description: string;
  expires: boolean;
  /** Applications whose checklist asks for this document. */
  neededBy: number;
}

export interface OwnedDoc {
  id: string;
  document_type: string;
  display_name: string;
  expires_on: string | null;
}

interface Props {
  items: InventoryItem[];
  owned: OwnedDoc[];
  today: string;
}

export function DocumentInventory({ items, owned, today }: Props) {
  // Optimistic "have it" state, re-synced whenever the server data changes
  const [have, setHave] = useState<Set<string>>(() => new Set(owned.map((o) => o.document_type)));
  useEffect(() => setHave(new Set(owned.map((o) => o.document_type))), [owned]);

  const [error, setError] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [customName, setCustomName] = useState("");
  const [isAdding, startAdding] = useTransition();

  const ownedByKey = new Map(owned.filter((o) => o.document_type !== "custom").map((o) => [o.document_type, o]));
  const customs = owned.filter((o) => o.document_type === "custom");
  const haveCount = items.filter((i) => have.has(i.key)).length;

  async function toggle(key: string, next: boolean) {
    setError(null);
    setBusyKey(key);
    setHave((prev) => {
      const s = new Set(prev);
      if (next) s.add(key);
      else s.delete(key);
      return s;
    });
    const err = await runAction(() => setCommonDocumentAction(key, next));
    if (err) {
      setHave((prev) => {
        const s = new Set(prev);
        if (next) s.delete(key);
        else s.add(key);
        return s;
      });
      setError(`Couldn't update your documents: ${err}`);
    }
    setBusyKey(null);
  }

  async function saveExpiry(doc: OwnedDoc, value: string) {
    if ((doc.expires_on || "") === value) return;
    setError(null);
    const err = await runAction(() => setDocumentExpiryAction(doc.id, value || null));
    if (err) setError(`Couldn't save the expiry date: ${err}`);
  }

  function addCustom(e: React.FormEvent) {
    e.preventDefault();
    const name = customName.trim();
    if (!name) return;
    setError(null);
    startAdding(async () => {
      const err = await runAction(() => addCustomDocumentAction(name));
      if (err) setError(err);
      else setCustomName("");
    });
  }

  async function removeCustom(doc: OwnedDoc) {
    setError(null);
    setBusyKey(doc.id);
    const err = await runAction(() => removeCustomDocumentAction(doc.id));
    if (err) setError(`Couldn't remove "${doc.display_name}": ${err}`);
    setBusyKey(null);
  }

  return (
    <section aria-labelledby="inventory-heading" className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
        <div>
          <h2 id="inventory-heading" className="font-heading font-bold text-lg text-ink-deep">
            Your documents
          </h2>
          <p className="text-xs text-ink-muted mt-0.5">
            Tick what you already have. Add expiry dates so you're warned before a deadline.
          </p>
        </div>
        <span className="text-xs font-bold text-teal-dark">
          {haveCount} of {items.length} common documents ready
        </span>
      </div>

      <InlineError message={error} onDismiss={() => setError(null)} />

      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => {
          const checked = have.has(item.key);
          const doc = ownedByKey.get(item.key);
          const expired = doc?.expires_on ? doc.expires_on < today : false;
          return (
            <li
              key={item.key}
              className={`glass-card rounded-2xl p-4 space-y-2 border ${
                checked ? "border-teal-300/70 bg-teal-50/40" : "border-transparent"
              }`}
            >
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={busyKey === item.key}
                  onChange={(e) => toggle(item.key, e.target.checked)}
                  className="mt-1 w-4 h-4 accent-[var(--brand-teal)] cursor-pointer"
                />
                <span className="min-w-0">
                  <span className="block text-sm font-bold text-ink-deep">{item.label}</span>
                  <span className="block text-[11px] text-ink-muted">{item.description}</span>
                  {item.neededBy > 0 && (
                    <span className="block text-[11px] font-semibold text-brand-dark mt-0.5">
                      Needed by {item.neededBy} {item.neededBy === 1 ? "application" : "applications"}
                    </span>
                  )}
                </span>
              </label>

              {checked && item.expires && doc && (
                <div className="pl-7 flex items-center gap-2">
                  <label htmlFor={`exp-${item.key}`} className="text-[11px] font-semibold text-ink-muted">
                    Expires
                  </label>
                  <input
                    id={`exp-${item.key}`}
                    type="date"
                    defaultValue={doc.expires_on || ""}
                    onBlur={(e) => saveExpiry(doc, e.target.value)}
                    className="h-8 px-2 text-xs glass-input rounded-lg text-ink-deep"
                  />
                  {expired && <span className="text-[11px] font-bold text-red-700">Expired</span>}
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <div className="glass-card rounded-2xl p-4 space-y-3">
        <div>
          <h3 className="text-sm font-bold text-ink-deep">Other documents you have</h3>
          <p className="text-[11px] text-ink-muted">
            For anything specific, e.g. a portfolio of three projects. It counts as covered when an application asks for a
            document with the same name.
          </p>
        </div>
        {customs.length > 0 && (
          <ul className="flex flex-wrap gap-2">
            {customs.map((c) => (
              <li key={c.id} className="inline-flex items-center gap-1.5 pl-3 pr-1 py-1 rounded-full bg-teal-50 border border-teal-200 text-xs font-semibold text-teal-900">
                {c.display_name}
                <button
                  type="button"
                  onClick={() => removeCustom(c)}
                  disabled={busyKey === c.id}
                  aria-label={`Remove ${c.display_name}`}
                  className="w-5 h-5 rounded-full hover:bg-teal-100 text-teal-800 cursor-pointer"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
        <form onSubmit={addCustom} className="flex flex-col sm:flex-row gap-2">
          <input
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
            placeholder="Document name"
            aria-label="Other document name"
            maxLength={120}
            className="w-full sm:flex-1 h-9 px-3 text-sm glass-input rounded-xl text-ink-deep placeholder:text-ink-subtle"
          />
          <button
            type="submit"
            disabled={isAdding || !customName.trim()}
            className="h-9 px-4 whitespace-nowrap text-xs font-bold text-brand-dark bg-white/80 border border-brand/30 hover:bg-brand-soft rounded-xl disabled:opacity-50 cursor-pointer"
          >
            {isAdding ? "Adding…" : "+ Add document"}
          </button>
        </form>
      </div>
    </section>
  );
}

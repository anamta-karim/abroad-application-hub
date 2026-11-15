/**
 * Helpers for the Compare page: what each application is still missing, and
 * what can be shown in place of a blank (the Discover catalog's typical window
 * and funding, or a confirmed funding fact from the application's sources).
 * Pure functions, unit tested.
 */
import { SCHOLARSHIP_CATALOG, type CatalogEntry } from "@/lib/catalog/scholarships";
import { readFactValue } from "@/lib/factValue";
import type { Json } from "@/types/database";

function normalise(s: string | null | undefined): string {
  return (s ?? "").toLowerCase().replace(/\/+$/, "").replace(/\s+/g, " ").trim();
}

/** The catalog entry an application was added from (matched by official link, then title). */
export function catalogEntryFor(app: { title: string; official_url: string | null }): CatalogEntry | null {
  const url = normalise(app.official_url);
  if (url) {
    const byUrl = SCHOLARSHIP_CATALOG.find((e) => normalise(e.officialUrl) === url);
    if (byUrl) return byUrl;
  }
  const title = normalise(app.title);
  return SCHOLARSHIP_CATALOG.find((e) => normalise(e.title) === title) ?? null;
}

export interface FundingFactRow {
  fact_type: string;
  review_state: string;
  value: Json;
  created_at: string;
}

const MAX_FUNDING_CHARS = 180;

/** The most recent confirmed (or edited) funding fact's text, shortened for a table cell. */
export function confirmedFunding(facts: FundingFactRow[]): string | null {
  const latest = facts
    .filter((f) => f.fact_type === "funding" && (f.review_state === "confirmed" || f.review_state === "edited"))
    .sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
  const text = readFactValue(latest?.value).extractedValue?.replace(/\s+/g, " ").trim();
  if (!text) return null;
  return text.length > MAX_FUNDING_CHARS ? `${text.slice(0, MAX_FUNDING_CHARS - 1).trimEnd()}…` : text;
}

export type MissingKind = "deadline" | "intake" | "costs" | "funding" | "checklist" | "source";

export interface MissingItem {
  kind: MissingKind;
  label: string;
  /** "edit" = the application's Edit page, "app" = the application page. */
  where: "edit" | "app";
}

/** What an application still needs before Compare can show it fully, most useful first. */
export function missingDetails(input: {
  recordType: string;
  deadline: string | null;
  intake: string | null;
  hasCosts: boolean;
  hasFundingAmount: boolean;
  checklistItems: number;
  sources: number;
}): MissingItem[] {
  const items: MissingItem[] = [];
  if (!input.deadline) items.push({ kind: "deadline", label: "deadline", where: "edit" });
  if (input.sources === 0) items.push({ kind: "source", label: "official page or PDF", where: "app" });
  if (input.recordType === "scholarship") {
    if (!input.hasFundingAmount) items.push({ kind: "funding", label: "funding amount", where: "edit" });
  } else if (!input.hasCosts) {
    items.push({ kind: "costs", label: "costs", where: "edit" });
  }
  if (input.checklistItems === 0) items.push({ kind: "checklist", label: "document checklist", where: "app" });
  if (!input.intake) items.push({ kind: "intake", label: "intake", where: "edit" });
  return items;
}

/** True when a cell has something to show. */
export function hasValue(v: unknown): boolean {
  return v !== null && v !== undefined && v !== "";
}

/** Rows worth showing: those with a value in at least one column. */
export function rowHasAnyValue(values: unknown[]): boolean {
  return values.some(hasValue);
}

import type { Json } from "@/types/database";

/** The fields AbroadAtlas stores inside extracted_facts.value. */
export interface FactValue {
  extractedValue?: string;
  context?: string;
  confidenceReason?: string;
}

/** Reads a fact's stored JSON value safely; anything unexpected becomes {}. */
export function readFactValue(value: Json | undefined): FactValue {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const text = (key: keyof FactValue) => {
    const v = value[key];
    return typeof v === "string" ? v : undefined;
  };
  return { extractedValue: text("extractedValue"), context: text("context"), confidenceReason: text("confidenceReason") };
}

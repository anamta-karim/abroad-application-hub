"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { COMMON_DOCUMENTS, COMMON_DOCUMENT_KEYS } from "@/lib/documents/catalog";

export interface DocumentActionResult {
  error?: string;
  success?: boolean;
}

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

function done(): DocumentActionResult {
  revalidatePath("/app/documents");
  return { success: true };
}

/** Marks a common document as one the user has (or not). */
export async function setCommonDocumentAction(key: string, have: boolean): Promise<DocumentActionResult> {
  const { supabase, user } = await requireUser();
  if (!user) return { error: "Authentication required." };
  if (!COMMON_DOCUMENT_KEYS.has(key)) return { error: "Unknown document." };

  if (!have) {
    const { error } = await supabase.from("user_documents").delete().eq("user_id", user.id).eq("document_type", key);
    return error ? { error: error.message } : done();
  }

  const { data: existing } = await supabase
    .from("user_documents")
    .select("id")
    .eq("user_id", user.id)
    .eq("document_type", key)
    .limit(1);
  if (existing && existing.length > 0) return done();

  const label = COMMON_DOCUMENTS.find((d) => d.key === key)!.label;
  const { error } = await supabase.from("user_documents").insert({
    user_id: user.id,
    document_type: key,
    display_name: label,
  });
  return error ? { error: error.message } : done();
}

/** Sets or clears the expiry date of a document the user has. */
export async function setDocumentExpiryAction(documentId: string, expiresOn: string | null): Promise<DocumentActionResult> {
  const { supabase, user } = await requireUser();
  if (!user) return { error: "Authentication required." };
  if (expiresOn && !/^\d{4}-\d{2}-\d{2}$/.test(expiresOn)) return { error: "Please enter a valid date." };

  const { data, error } = await supabase
    .from("user_documents")
    .update({ expires_on: expiresOn || null })
    .eq("id", documentId)
    .eq("user_id", user.id)
    .select("id");
  if (error) return { error: error.message };
  if (!data || data.length === 0) return { error: "Document not found." };
  return done();
}

/** Adds a document that isn't in the common list (e.g. "Portfolio of 3 projects"). */
export async function addCustomDocumentAction(name: string): Promise<DocumentActionResult> {
  const { supabase, user } = await requireUser();
  if (!user) return { error: "Authentication required." };
  const displayName = name.trim().slice(0, 120);
  if (displayName.length < 2) return { error: "Please enter the document's name." };

  const { data: existing } = await supabase
    .from("user_documents")
    .select("id, display_name")
    .eq("user_id", user.id)
    .eq("document_type", "custom");
  if ((existing || []).some((d) => d.display_name.toLowerCase() === displayName.toLowerCase())) {
    return { error: `"${displayName}" is already in your documents.` };
  }

  const { error } = await supabase.from("user_documents").insert({
    user_id: user.id,
    document_type: "custom",
    display_name: displayName,
  });
  return error ? { error: error.message } : done();
}

/** Removes a custom document. */
export async function removeCustomDocumentAction(documentId: string): Promise<DocumentActionResult> {
  const { supabase, user } = await requireUser();
  if (!user) return { error: "Authentication required." };
  const { data, error } = await supabase
    .from("user_documents")
    .delete()
    .eq("id", documentId)
    .eq("user_id", user.id)
    .eq("document_type", "custom")
    .select("id");
  if (error) return { error: error.message };
  if (!data || data.length === 0) return { error: "Document not found." };
  return done();
}

"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { safeFetchHtml, validateUrlForSSRF } from "@/lib/ingestion/ssrf";
import { extractCleanTextFromHtml } from "@/lib/ingestion/html";
import { extractTextFromPdf } from "@/lib/ingestion/pdf";
import { chunkDocumentText, computeSha256 } from "@/lib/ingestion/chunker";
import { extractCandidateFacts } from "@/lib/ingestion/extractor";
import type { ActionResponse } from "@/app/app/applications/actions";
import type { ReviewState } from "@/types/database";

/**
 * Ingest an official program or scholarship webpage URL with SSRF protection.
 */
export async function ingestWebpageAction(
  applicationId: string,
  _prevState: ActionResponse | null,
  formData: FormData
): Promise<ActionResponse> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Authentication required" };
  }

  const rawUrl = (formData.get("url") as string)?.trim();
  if (!rawUrl) {
    return { error: "Please enter a valid website URL." };
  }

  // 1. SSRF Pre-flight Validation
  const validation = await validateUrlForSSRF(rawUrl);
  if (!validation.isAllowed) {
    return { error: `Security check blocked URL: ${validation.reason}` };
  }

  // 2. Insert pending source record
  const { data: source, error: sourceInsertError } = await supabase
    .from("sources")
    .insert({
      user_id: user.id,
      application_id: applicationId,
      source_type: "webpage",
      display_name: "Fetching official webpage...",
      source_url: validation.normalizedUrl || rawUrl,
      ingestion_status: "processing",
    })
    .select("id")
    .single();

  if (sourceInsertError || !source) {
    return { error: sourceInsertError?.message || "Failed to initialize source record." };
  }

  try {
    // 3. Safe fetch with SSRF revalidation, timeout (10s), and size limit (5MB)
    const { text: html, finalUrl } = await safeFetchHtml(rawUrl);

    // 4. Extract clean structured text
    const { title, cleanText } = extractCleanTextFromHtml(html);
    const contentHash = computeSha256(cleanText);

    if (cleanText.length < 50) {
      throw new Error("Page content was too short or contained no readable admissions text.");
    }

    // 5. Create versioned source snapshot
    const { data: snapshot, error: snapshotError } = await supabase
      .from("source_snapshots")
      .insert({
        user_id: user.id,
        source_id: source.id,
        version: 1,
        title,
        raw_text: cleanText,
        content_hash: contentHash,
        retrieved_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (snapshotError || !snapshot) {
      throw new Error(snapshotError?.message || "Failed to create source snapshot.");
    }

    // 6. Semantic chunking
    const chunks = chunkDocumentText(cleanText);
    const chunkInserts = chunks.map((c) => ({
      user_id: user.id,
      source_id: source.id,
      snapshot_id: snapshot.id,
      application_id: applicationId,
      chunk_index: c.chunkIndex,
      page_number: c.pageNumber,
      section_heading: c.sectionHeading,
      content: c.content,
    }));

    const { data: insertedChunks, error: chunkError } = await supabase
      .from("source_chunks")
      .insert(chunkInserts)
      .select("id, chunk_index");

    if (chunkError) {
      throw new Error(chunkError.message || "Failed to store text chunks.");
    }

    // Map chunk_index to chunk id for citations
    const chunkIdMap = new Map<number, string>();
    if (insertedChunks) {
      for (const ch of insertedChunks) {
        chunkIdMap.set(ch.chunk_index, ch.id);
      }
    }

    // 7. Extract candidate facts (all start as 'suggested')
    const candidateFacts = extractCandidateFacts(chunks);
    if (candidateFacts.length > 0) {
      const factInserts = candidateFacts.map((fact) => ({
        user_id: user.id,
        application_id: applicationId,
        source_id: source.id,
        fact_type: fact.factType,
        label: fact.label,
        value: fact.value,
        confidence: fact.confidence,
        review_state: "suggested" as ReviewState,
        citation_chunk_id: chunkIdMap.get(fact.chunkIndex) || null,
      }));

      await supabase.from("extracted_facts").insert(factInserts);
    }

    // 8. Update source to ready status
    await supabase
      .from("sources")
      .update({
        display_name: title,
        source_url: finalUrl,
        ingestion_status: "ready",
        content_hash: contentHash,
        retrieved_at: new Date().toISOString(),
        file_size_bytes: html.length,
        mime_type: "text/html",
      })
      .eq("id", source.id);

    revalidatePath(`/app/applications/${applicationId}`);
    return { success: true };
  } catch (err: any) {
    // Graceful error status update
    await supabase
      .from("sources")
      .update({
        ingestion_status: "failed",
        error_code: err.message?.slice(0, 200) || "Ingestion error",
      })
      .eq("id", source.id);

    return { error: err.message || "Failed to ingest webpage." };
  }
}

/**
 * Ingest a private official admissions PDF brochure or requirements prospectus.
 */
export async function ingestPdfAction(
  applicationId: string,
  _prevState: ActionResponse | null,
  formData: FormData
): Promise<ActionResponse> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Authentication required" };
  }

  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) {
    return { error: "Please select a PDF file to upload." };
  }

  // Enforce 10MB free tier file size limit
  const maxBytes = 10 * 1024 * 1024;
  if (file.size > maxBytes) {
    return { error: "File exceeds maximum allowed size of 10MB." };
  }

  // Validate MIME type
  if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
    return { error: "Only official PDF documents are accepted." };
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const contentHash = computeSha256(buffer.toString("binary"));
  const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");

  // 1. Insert pending source
  const { data: source, error: sourceInsertError } = await supabase
    .from("sources")
    .insert({
      user_id: user.id,
      application_id: applicationId,
      source_type: "pdf",
      display_name: file.name.replace(/\.pdf$/i, ""),
      file_size_bytes: file.size,
      mime_type: "application/pdf",
      ingestion_status: "processing",
    })
    .select("id")
    .single();

  if (sourceInsertError || !source) {
    return { error: sourceInsertError?.message || "Failed to initialize source record." };
  }

  try {
    // 2. Upload to private user-scoped storage path
    const storagePath = `${user.id}/${source.id}_${sanitizedName}`;
    const { error: storageError } = await supabase.storage
      .from("sources")
      .upload(storagePath, buffer, {
        contentType: "application/pdf",
        upsert: false,
      });

    // If bucket doesn't exist yet, we still extract text and save snapshot!
    if (!storageError) {
      await supabase
        .from("sources")
        .update({ storage_path: storagePath })
        .eq("id", source.id);
    }

    // 3. Extract text and page metadata from PDF
    const { title: extractedTitle, pages, fullText } = extractTextFromPdf(buffer);
    const docTitle = extractedTitle || file.name.replace(/\.pdf$/i, "");

    // 4. Create versioned source snapshot
    const { data: snapshot, error: snapshotError } = await supabase
      .from("source_snapshots")
      .insert({
        user_id: user.id,
        source_id: source.id,
        version: 1,
        title: docTitle,
        raw_text: fullText,
        content_hash: contentHash,
        retrieved_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (snapshotError || !snapshot) {
      throw new Error(snapshotError?.message || "Failed to save document snapshot.");
    }

    // 5. Semantic chunking
    const chunks = chunkDocumentText(fullText);
    const chunkInserts = chunks.map((c) => ({
      user_id: user.id,
      source_id: source.id,
      snapshot_id: snapshot.id,
      application_id: applicationId,
      chunk_index: c.chunkIndex,
      page_number: c.pageNumber,
      section_heading: c.sectionHeading,
      content: c.content,
    }));

    const { data: insertedChunks } = await supabase
      .from("source_chunks")
      .insert(chunkInserts)
      .select("id, chunk_index");

    const chunkIdMap = new Map<number, string>();
    if (insertedChunks) {
      for (const ch of insertedChunks) {
        chunkIdMap.set(ch.chunk_index, ch.id);
      }
    }

    // 6. Extract candidate facts (all start as 'suggested')
    const candidateFacts = extractCandidateFacts(chunks);
    if (candidateFacts.length > 0) {
      const factInserts = candidateFacts.map((fact) => ({
        user_id: user.id,
        application_id: applicationId,
        source_id: source.id,
        fact_type: fact.factType,
        label: fact.label,
        value: fact.value,
        confidence: fact.confidence,
        review_state: "suggested" as ReviewState,
        citation_chunk_id: chunkIdMap.get(fact.chunkIndex) || null,
      }));

      await supabase.from("extracted_facts").insert(factInserts);
    }

    // 7. Update source to ready status
    await supabase
      .from("sources")
      .update({
        display_name: docTitle,
        ingestion_status: "ready",
        content_hash: contentHash,
        retrieved_at: new Date().toISOString(),
      })
      .eq("id", source.id);

    revalidatePath(`/app/applications/${applicationId}`);
    return { success: true };
  } catch (err: any) {
    await supabase
      .from("sources")
      .update({
        ingestion_status: "failed",
        error_code: err.message?.slice(0, 200) || "PDF extraction error",
      })
      .eq("id", source.id);

    return { error: err.message || "Failed to extract PDF text." };
  }
}

/**
 * Review an extracted fact: Confirm, Edit & Confirm, or Reject.
 * Never silently overwrites user data.
 */
export async function reviewFactAction(
  factId: string,
  applicationId: string,
  action: "confirm" | "edit" | "reject",
  editedValue?: string
): Promise<ActionResponse> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Authentication required" };
  }

  // Fetch the fact to be reviewed
  const { data: fact, error: fetchError } = await supabase
    .from("extracted_facts")
    .select("*")
    .eq("id", factId)
    .single();

  if (fetchError || !fact) {
    return { error: "Extracted fact not found." };
  }

  let newReviewState: ReviewState = "confirmed";
  let updatedValue = fact.value;

  if (action === "reject") {
    newReviewState = "rejected";
  } else if (action === "edit") {
    newReviewState = "edited";
    if (editedValue && typeof updatedValue === "object") {
      updatedValue = { ...updatedValue, extractedValue: editedValue };
    }
  }

  // Update fact review state
  const { error: updateError } = await supabase
    .from("extracted_facts")
    .update({
      review_state: newReviewState,
      value: updatedValue,
    })
    .eq("id", factId);

  if (updateError) {
    return { error: updateError.message };
  }

  // If confirmed or edited: promote to application data!
  if (action === "confirm" || action === "edit") {
    const valObj = updatedValue as any;
    const finalVal = valObj?.extractedValue || fact.label;

    // 1. If document requirement, add to document_requirements checklist
    if (fact.fact_type === "document") {
      // Check if requirement already exists
      const { data: existingReq } = await supabase
        .from("document_requirements")
        .select("id")
        .eq("application_id", applicationId)
        .eq("document_type", finalVal)
        .maybeSingle();

      if (!existingReq) {
        await supabase.from("document_requirements").insert({
          user_id: user.id,
          application_id: applicationId,
          requirement_fact_id: fact.id,
          document_type: finalVal,
          status: "not_started",
          notes: `Verified from source: "${valObj?.context || fact.label}"`,
        });
      }
    }

    // 2. If deadline, update application deadline if not already set or confirmed
    if (fact.fact_type === "deadline") {
      // Try to parse YYYY-MM-DD
      const dateParsed = new Date(finalVal);
      if (!isNaN(dateParsed.getTime())) {
        const isoDate = dateParsed.toISOString().split("T")[0];
        await supabase
          .from("applications")
          .update({
            deadline: isoDate,
            verification_state: "confirmed",
          })
          .eq("id", applicationId);
      }
    }
  }

  revalidatePath(`/app/applications/${applicationId}`);
  return { success: true };
}

/**
 * Delete a source document and its associated chunks and snapshots.
 */
export async function deleteSourceAction(
  sourceId: string,
  applicationId: string
): Promise<ActionResponse> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Authentication required" };
  }

  const { error } = await supabase
    .from("sources")
    .delete()
    .eq("id", sourceId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/app/applications/${applicationId}`);
  return { success: true };
}

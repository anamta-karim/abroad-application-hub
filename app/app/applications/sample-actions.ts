"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { chunkDocumentText, computeSha256 } from "@/lib/ingestion/chunker";
import { extractCandidateFacts } from "@/lib/ingestion/extractor";
import { todayString } from "@/lib/calendar";
import {
  SAMPLE_TITLE,
  SAMPLE_INSTITUTION,
  SAMPLE_SOURCE_NAME,
  SAMPLE_NOTE,
  SAMPLE_REQUIREMENTS,
  sampleDates,
  sampleProspectus,
} from "@/lib/demo/sample";

/**
 * Creates one fully populated sample application (fictional) so new users can
 * try blueprints, the document checklist, costs, Compare and "This week"
 * straight away. If a sample already exists, opens it instead of duplicating.
 */
export async function createSampleApplicationAction(): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: existing } = await supabase
    .from("applications")
    .select("id")
    .eq("user_id", user.id)
    .eq("title", SAMPLE_TITLE)
    .limit(1);
  if (existing && existing.length > 0) {
    redirect(`/app/applications/${existing[0].id}`);
  }

  const today = todayString();
  const dates = sampleDates(today);

  const { data: app, error: appError } = await supabase
    .from("applications")
    .insert({
      user_id: user.id,
      title: SAMPLE_TITLE,
      record_type: "program",
      institution_or_provider: SAMPLE_INSTITUTION,
      country: "Netherlands",
      degree_level: "Master's",
      field_of_study: "Data Science",
      study_period: "Fall 2027",
      deadline: dates.deadline,
      user_notes: SAMPLE_NOTE,
      status: "preparing",
      verification_state: "unreviewed",
      cost_currency: "EUR",
      tuition_per_year: 2600,
      living_cost_per_year: 13200,
      application_fee: 100,
      funding_per_year: 13200,
      duration_years: 2,
    })
    .select("id")
    .single();

  if (appError || !app) {
    return { error: appError?.message || "Couldn't create the sample application." };
  }

  // Everything below belongs to the new application; on any failure, remove it again
  const fail = async (message: string) => {
    await supabase.from("applications").delete().eq("id", app.id);
    return { error: `Couldn't finish creating the sample: ${message}` };
  };

  const text = sampleProspectus(dates.deadline);

  const { data: source, error: sourceError } = await supabase
    .from("sources")
    .insert({
      user_id: user.id,
      application_id: app.id,
      source_type: "pasted_text",
      display_name: SAMPLE_SOURCE_NAME,
      ingestion_status: "ready",
      content_hash: computeSha256(text),
      retrieved_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (sourceError || !source) return fail(sourceError?.message || "source");

  const { data: snapshot, error: snapshotError } = await supabase
    .from("source_snapshots")
    .insert({
      user_id: user.id,
      source_id: source.id,
      version: 1,
      title: SAMPLE_SOURCE_NAME,
      raw_text: text,
      content_hash: computeSha256(text),
    })
    .select("id")
    .single();
  if (snapshotError || !snapshot) return fail(snapshotError?.message || "snapshot");

  const chunks = chunkDocumentText(text);
  const { data: insertedChunks, error: chunkError } = await supabase
    .from("source_chunks")
    .insert(
      chunks.map((c) => ({
        user_id: user.id,
        source_id: source.id,
        snapshot_id: snapshot.id,
        application_id: app.id,
        chunk_index: c.chunkIndex,
        page_number: c.pageNumber,
        section_heading: c.sectionHeading,
        content: c.content,
      }))
    )
    .select("id, chunk_index");
  if (chunkError) return fail(chunkError.message);

  const chunkIds = new Map((insertedChunks || []).map((c) => [c.chunk_index, c.id]));
  const facts = extractCandidateFacts(chunks);
  if (facts.length > 0) {
    const { error: factsError } = await supabase.from("extracted_facts").insert(
      facts.map((f) => ({
        user_id: user.id,
        application_id: app.id,
        source_id: source.id,
        fact_type: f.factType,
        label: f.label,
        value: f.value,
        confidence: f.confidence,
        review_state: "suggested" as const,
        citation_chunk_id: chunkIds.get(f.chunkIndex) || null,
      }))
    );
    if (factsError) return fail(factsError.message);
  }

  const { error: reqError } = await supabase.from("document_requirements").insert(
    SAMPLE_REQUIREMENTS.map((r) => ({
      user_id: user.id,
      application_id: app.id,
      document_type: r.document_type,
      status: r.status,
      notes: "Sample checklist item",
    }))
  );
  if (reqError) return fail(reqError.message);

  const { error: taskError } = await supabase.from("tasks").insert([
    { user_id: user.id, application_id: app.id, title: "Ask two referees for recommendation letters", due_date: dates.refereeTaskDue, status: "open" },
    { user_id: user.id, application_id: app.id, title: "Draft the statement of purpose (max 1,000 words)", due_date: dates.statementTaskDue, status: "open" },
  ]);
  if (taskError) return fail(taskError.message);

  await supabase.from("status_history").insert({
    user_id: user.id,
    application_id: app.id,
    from_status: null,
    to_status: "preparing",
    note: "Sample application created",
  });

  revalidatePath("/app");
  redirect(`/app/applications/${app.id}`);
}

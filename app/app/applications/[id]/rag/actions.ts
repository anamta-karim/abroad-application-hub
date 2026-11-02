"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { generateGroundedAnswer, type GroundedResponse } from "@/lib/rag/engine";

export interface ChatActionResult {
  error?: string;
  response?: GroundedResponse;
}

/**
 * Executes a grounded Q&A or prep query, persisting the message and its structured citations.
 */
export async function askGroundedQuestionAction(
  applicationId: string,
  question: string,
  workflowType: "qa" | "sop" | "interview" | "lor" | "study_plan" = "qa"
): Promise<ChatActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Authentication required." };
  }

  const trimmedQuestion = question.trim();
  if (!trimmedQuestion) {
    return { error: "Please enter a question or topic." };
  }

  // 1. Get or create conversation for this application
  let conversationId: string;
  const { data: existingConv } = await supabase
    .from("conversations")
    .select("id")
    .eq("application_id", applicationId)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingConv) {
    conversationId = existingConv.id;
  } else {
    const { data: newConv, error: convError } = await supabase
      .from("conversations")
      .insert({
        user_id: user.id,
        application_id: applicationId,
        title: "Admissions Grounded Assistant",
      })
      .select("id")
      .single();

    if (convError || !newConv) {
      return { error: convError?.message || "Failed to initialize conversation." };
    }
    conversationId = newConv.id;
  }

  // 2. Insert user message
  await supabase.from("messages").insert({
    user_id: user.id,
    conversation_id: conversationId,
    role: "user",
    content: trimmedQuestion,
  });

  // 3. Generate strictly grounded answer with citations
  const result = await generateGroundedAnswer(applicationId, trimmedQuestion, workflowType);

  // 4. Insert assistant message
  const { data: assistantMsg, error: msgError } = await supabase
    .from("messages")
    .insert({
      user_id: user.id,
      conversation_id: conversationId,
      role: "assistant",
      content: result.answer,
      service_status: result.isAbstention ? "abstained" : "grounded",
    })
    .select("id")
    .single();

  // 5. Insert structured citations
  if (!msgError && assistantMsg && result.citations.length > 0) {
    const citationInserts = result.citations.map((c) => ({
      user_id: user.id,
      message_id: assistantMsg.id,
      source_id: c.sourceId,
      chunk_id: c.chunkId,
      page_number: c.pageNumber,
      section_heading: c.sectionHeading,
      quote: c.quote,
    }));

    await supabase.from("message_citations").insert(citationInserts);
  }

  revalidatePath(`/app/applications/${applicationId}`);
  return { response: result };
}

-- -----------------------------------------------------------------------------
-- Migration: 20261113000000_parent_ownership_policies.sql
-- Description: Tighten INSERT/UPDATE policies so child rows can only point at
-- parent rows the same user owns.
--
-- The original policies only checked `auth.uid() = user_id` on the new row.
-- Because the anon key is public, a signed-in user could call PostgREST
-- directly and insert e.g. a task or source whose application_id belongs to a
-- different account. These policies additionally require every parent
-- reference (application, source, conversation, ...) to be owned by the caller.
-- -----------------------------------------------------------------------------

-- 1. Ownership helper functions (SECURITY INVOKER: they see only what RLS shows the caller)
CREATE OR REPLACE FUNCTION public.owns_application(target_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.applications WHERE id = target_id AND user_id = auth.uid());
$$;

CREATE OR REPLACE FUNCTION public.owns_source(target_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.sources WHERE id = target_id AND user_id = auth.uid());
$$;

CREATE OR REPLACE FUNCTION public.owns_snapshot(target_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.source_snapshots WHERE id = target_id AND user_id = auth.uid());
$$;

CREATE OR REPLACE FUNCTION public.owns_chunk(target_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.source_chunks WHERE id = target_id AND user_id = auth.uid());
$$;

CREATE OR REPLACE FUNCTION public.owns_fact(target_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.extracted_facts WHERE id = target_id AND user_id = auth.uid());
$$;

CREATE OR REPLACE FUNCTION public.owns_conversation(target_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.conversations WHERE id = target_id AND user_id = auth.uid());
$$;

CREATE OR REPLACE FUNCTION public.owns_message(target_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.messages WHERE id = target_id AND user_id = auth.uid());
$$;

CREATE OR REPLACE FUNCTION public.owns_requirement(target_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.document_requirements WHERE id = target_id AND user_id = auth.uid());
$$;

CREATE OR REPLACE FUNCTION public.owns_user_document(target_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_documents WHERE id = target_id AND user_id = auth.uid());
$$;

-- 2. application_links
DROP POLICY IF EXISTS "Users can insert their own application links" ON public.application_links;
CREATE POLICY "Users can insert their own application links"
  ON public.application_links FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND public.owns_application(program_application_id)
    AND public.owns_application(scholarship_application_id)
  );

DROP POLICY IF EXISTS "Users can update their own application links" ON public.application_links;
CREATE POLICY "Users can update their own application links"
  ON public.application_links FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND public.owns_application(program_application_id)
    AND public.owns_application(scholarship_application_id)
  );

-- 3. sources
DROP POLICY IF EXISTS "Users can insert their own sources" ON public.sources;
CREATE POLICY "Users can insert their own sources"
  ON public.sources FOR INSERT
  WITH CHECK (auth.uid() = user_id AND public.owns_application(application_id));

DROP POLICY IF EXISTS "Users can update their own sources" ON public.sources;
CREATE POLICY "Users can update their own sources"
  ON public.sources FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id AND public.owns_application(application_id));

-- 4. source_snapshots
DROP POLICY IF EXISTS "Users can insert their own source snapshots" ON public.source_snapshots;
CREATE POLICY "Users can insert their own source snapshots"
  ON public.source_snapshots FOR INSERT
  WITH CHECK (auth.uid() = user_id AND public.owns_source(source_id));

-- 5. source_chunks
DROP POLICY IF EXISTS "Users can insert their own source chunks" ON public.source_chunks;
CREATE POLICY "Users can insert their own source chunks"
  ON public.source_chunks FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND public.owns_source(source_id)
    AND public.owns_snapshot(snapshot_id)
    AND public.owns_application(application_id)
  );

-- 6. extracted_facts
DROP POLICY IF EXISTS "Users can insert their own extracted facts" ON public.extracted_facts;
CREATE POLICY "Users can insert their own extracted facts"
  ON public.extracted_facts FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND public.owns_application(application_id)
    AND public.owns_source(source_id)
    AND (citation_chunk_id IS NULL OR public.owns_chunk(citation_chunk_id))
  );

DROP POLICY IF EXISTS "Users can update their own extracted facts" ON public.extracted_facts;
CREATE POLICY "Users can update their own extracted facts"
  ON public.extracted_facts FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND public.owns_application(application_id)
    AND public.owns_source(source_id)
    AND (citation_chunk_id IS NULL OR public.owns_chunk(citation_chunk_id))
  );

-- 7. document_requirements
DROP POLICY IF EXISTS "Users can insert their own document requirements" ON public.document_requirements;
CREATE POLICY "Users can insert their own document requirements"
  ON public.document_requirements FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND public.owns_application(application_id)
    AND (requirement_fact_id IS NULL OR public.owns_fact(requirement_fact_id))
  );

DROP POLICY IF EXISTS "Users can update their own document requirements" ON public.document_requirements;
CREATE POLICY "Users can update their own document requirements"
  ON public.document_requirements FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND public.owns_application(application_id)
    AND (requirement_fact_id IS NULL OR public.owns_fact(requirement_fact_id))
  );

-- 8. requirement_document_links
DROP POLICY IF EXISTS "Users can insert their own requirement links" ON public.requirement_document_links;
CREATE POLICY "Users can insert their own requirement links"
  ON public.requirement_document_links FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND public.owns_requirement(requirement_id)
    AND public.owns_user_document(user_document_id)
  );

-- 9. tasks
DROP POLICY IF EXISTS "Users can insert their own tasks" ON public.tasks;
CREATE POLICY "Users can insert their own tasks"
  ON public.tasks FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND public.owns_application(application_id)
    AND (source_fact_id IS NULL OR public.owns_fact(source_fact_id))
  );

DROP POLICY IF EXISTS "Users can update their own tasks" ON public.tasks;
CREATE POLICY "Users can update their own tasks"
  ON public.tasks FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND public.owns_application(application_id)
    AND (source_fact_id IS NULL OR public.owns_fact(source_fact_id))
  );

-- 10. status_history
DROP POLICY IF EXISTS "Users can insert their own status history" ON public.status_history;
CREATE POLICY "Users can insert their own status history"
  ON public.status_history FOR INSERT
  WITH CHECK (auth.uid() = user_id AND public.owns_application(application_id));

-- 11. conversations, messages, message_citations
DROP POLICY IF EXISTS "Users can insert their own conversations" ON public.conversations;
CREATE POLICY "Users can insert their own conversations"
  ON public.conversations FOR INSERT
  WITH CHECK (auth.uid() = user_id AND public.owns_application(application_id));

DROP POLICY IF EXISTS "Users can update their own conversations" ON public.conversations;
CREATE POLICY "Users can update their own conversations"
  ON public.conversations FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id AND public.owns_application(application_id));

DROP POLICY IF EXISTS "Users can insert their own messages" ON public.messages;
CREATE POLICY "Users can insert their own messages"
  ON public.messages FOR INSERT
  WITH CHECK (auth.uid() = user_id AND public.owns_conversation(conversation_id));

DROP POLICY IF EXISTS "Users can insert their own citations" ON public.message_citations;
CREATE POLICY "Users can insert their own citations"
  ON public.message_citations FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND public.owns_message(message_id)
    AND public.owns_source(source_id)
    AND (chunk_id IS NULL OR public.owns_chunk(chunk_id))
  );

-- 12. ingestion_jobs
DROP POLICY IF EXISTS "Users can insert their own ingestion jobs" ON public.ingestion_jobs;
CREATE POLICY "Users can insert their own ingestion jobs"
  ON public.ingestion_jobs FOR INSERT
  WITH CHECK (auth.uid() = user_id AND public.owns_source(source_id));

DROP POLICY IF EXISTS "Users can update their own ingestion jobs" ON public.ingestion_jobs;
CREATE POLICY "Users can update their own ingestion jobs"
  ON public.ingestion_jobs FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id AND public.owns_source(source_id));

-- 13. opening_reminders (converted_application_id must be the caller's own application)
DROP POLICY IF EXISTS "Users can insert their own opening reminders" ON public.opening_reminders;
CREATE POLICY "Users can insert their own opening reminders"
  ON public.opening_reminders FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND (converted_application_id IS NULL OR public.owns_application(converted_application_id))
  );

DROP POLICY IF EXISTS "Users can update their own opening reminders" ON public.opening_reminders;
CREATE POLICY "Users can update their own opening reminders"
  ON public.opening_reminders FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND (converted_application_id IS NULL OR public.owns_application(converted_application_id))
  );

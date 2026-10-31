-- =============================================================================
-- Migration: 20261101000000_init_schema.sql
-- Abroad Application Hub - Complete Initial Schema & Row Level Security (RLS)
-- Free-tier PostgreSQL + pgvector + Supabase Auth & Storage
-- =============================================================================

-- 1. Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS "vector";
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Vector extension could not be enabled directly. If not using pgvector, vector column will require pgvector extension in Supabase dashboard.';
END $$;

-- 2. Helper function to keep updated_at in sync
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- -----------------------------------------------------------------------------
-- 3. Profiles Table (tied to auth.users)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE TRIGGER tr_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- Auto-create profile trigger on auth.users signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'display_name',
      split_part(NEW.email, '@', 1),
      'Applicant'
    )
  )
  ON CONFLICT (id) DO UPDATE
  SET display_name = EXCLUDED.display_name;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- -----------------------------------------------------------------------------
-- 4. Applications (Programs & Scholarships)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  record_type TEXT NOT NULL CHECK (record_type IN ('program', 'scholarship')),
  title TEXT NOT NULL,
  institution_or_provider TEXT NULL,
  country TEXT NULL,
  degree_level TEXT NULL,
  field_of_study TEXT NULL,
  study_period TEXT NULL,
  status TEXT NOT NULL CHECK (status IN ('researching', 'preparing', 'submitted', 'interview', 'offer_received', 'rejected', 'withdrawn')) DEFAULT 'researching',
  deadline DATE NULL,
  official_url TEXT NULL,
  summary TEXT NULL,
  user_notes TEXT NULL,
  verification_state TEXT NOT NULL CHECK (verification_state IN ('unreviewed', 'partially_reviewed', 'confirmed')) DEFAULT 'unreviewed',
  archived_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own applications"
  ON public.applications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own applications"
  ON public.applications FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own applications"
  ON public.applications FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own applications"
  ON public.applications FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_applications_user_status ON public.applications (user_id, status);
CREATE INDEX IF NOT EXISTS idx_applications_user_deadline ON public.applications (user_id, deadline);

CREATE TRIGGER tr_applications_updated_at
  BEFORE UPDATE ON public.applications
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 5. Application Links (Connecting Scholarships to Programs)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.application_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  program_application_id UUID NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  scholarship_application_id UUID NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  relationship_note TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_program_scholarship_link UNIQUE (program_application_id, scholarship_application_id)
);

ALTER TABLE public.application_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own application links"
  ON public.application_links FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own application links"
  ON public.application_links FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own application links"
  ON public.application_links FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own application links"
  ON public.application_links FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_app_links_user ON public.application_links (user_id);

-- -----------------------------------------------------------------------------
-- 6. Sources (Webpages, PDFs, Pasted Text)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  application_id UUID NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL CHECK (source_type IN ('webpage', 'pdf', 'pasted_text')),
  display_name TEXT NOT NULL,
  source_url TEXT NULL,
  storage_path TEXT NULL,
  mime_type TEXT NULL,
  file_size_bytes BIGINT NULL,
  ingestion_status TEXT NOT NULL CHECK (ingestion_status IN ('queued', 'processing', 'ready', 'needs_review', 'failed')) DEFAULT 'queued',
  retrieved_at TIMESTAMPTZ NULL,
  content_hash TEXT NULL,
  error_code TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own sources"
  ON public.sources FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own sources"
  ON public.sources FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sources"
  ON public.sources FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sources"
  ON public.sources FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_sources_application ON public.sources (application_id);
CREATE INDEX IF NOT EXISTS idx_sources_user ON public.sources (user_id);

CREATE TRIGGER tr_sources_updated_at
  BEFORE UPDATE ON public.sources
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 7. Source Snapshots (Dated, Versioned Extracted Text)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.source_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_id UUID NOT NULL REFERENCES public.sources(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  raw_text TEXT NULL,
  title TEXT NULL,
  retrieved_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  content_hash TEXT NOT NULL,
  CONSTRAINT uq_source_version UNIQUE (source_id, version)
);

ALTER TABLE public.source_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own source snapshots"
  ON public.source_snapshots FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own source snapshots"
  ON public.source_snapshots FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own source snapshots"
  ON public.source_snapshots FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_snapshots_source ON public.source_snapshots (source_id);

-- -----------------------------------------------------------------------------
-- 8. Source Chunks (Chunked text with metadata and embeddings)
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  -- Check if vector type exists
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'vector') THEN
    CREATE TABLE IF NOT EXISTS public.source_chunks (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      source_id UUID NOT NULL REFERENCES public.sources(id) ON DELETE CASCADE,
      snapshot_id UUID NOT NULL REFERENCES public.source_snapshots(id) ON DELETE CASCADE,
      application_id UUID NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
      chunk_index INTEGER NOT NULL,
      page_number INTEGER NULL,
      section_heading TEXT NULL,
      content TEXT NOT NULL,
      embedding vector(768) NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  ELSE
    CREATE TABLE IF NOT EXISTS public.source_chunks (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      source_id UUID NOT NULL REFERENCES public.sources(id) ON DELETE CASCADE,
      snapshot_id UUID NOT NULL REFERENCES public.source_snapshots(id) ON DELETE CASCADE,
      application_id UUID NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
      chunk_index INTEGER NOT NULL,
      page_number INTEGER NULL,
      section_heading TEXT NULL,
      content TEXT NOT NULL,
      embedding JSONB NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  END IF;
END $$;

ALTER TABLE public.source_chunks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own source chunks"
  ON public.source_chunks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own source chunks"
  ON public.source_chunks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own source chunks"
  ON public.source_chunks FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_chunks_app_user ON public.source_chunks (application_id, user_id);
CREATE INDEX IF NOT EXISTS idx_chunks_source ON public.source_chunks (source_id);

-- -----------------------------------------------------------------------------
-- 9. Extracted Facts (Candidate & Confirmed facts with citations)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.extracted_facts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  application_id UUID NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  source_id UUID NOT NULL REFERENCES public.sources(id) ON DELETE CASCADE,
  fact_type TEXT NOT NULL CHECK (fact_type IN ('eligibility', 'deadline', 'document', 'funding', 'application_step', 'interview', 'other')),
  label TEXT NOT NULL,
  value JSONB NOT NULL,
  citation_chunk_id UUID NULL REFERENCES public.source_chunks(id) ON DELETE SET NULL,
  review_state TEXT NOT NULL CHECK (review_state IN ('suggested', 'confirmed', 'edited', 'rejected')) DEFAULT 'suggested',
  confidence TEXT NOT NULL CHECK (confidence IN ('clear', 'uncertain')) DEFAULT 'uncertain',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.extracted_facts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own extracted facts"
  ON public.extracted_facts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own extracted facts"
  ON public.extracted_facts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own extracted facts"
  ON public.extracted_facts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own extracted facts"
  ON public.extracted_facts FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_facts_application ON public.extracted_facts (application_id);
CREATE INDEX IF NOT EXISTS idx_facts_user ON public.extracted_facts (user_id);

CREATE TRIGGER tr_extracted_facts_updated_at
  BEFORE UPDATE ON public.extracted_facts
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 10. Document Requirements
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.document_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  application_id UUID NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  requirement_fact_id UUID NULL REFERENCES public.extracted_facts(id) ON DELETE SET NULL,
  document_type TEXT NOT NULL,
  notes TEXT NULL,
  status TEXT NOT NULL CHECK (status IN ('not_started', 'in_progress', 'requested', 'ready', 'submitted', 'expired', 'not_applicable')) DEFAULT 'not_started',
  due_date DATE NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.document_requirements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own document requirements"
  ON public.document_requirements FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own document requirements"
  ON public.document_requirements FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own document requirements"
  ON public.document_requirements FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own document requirements"
  ON public.document_requirements FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_doc_reqs_app ON public.document_requirements (application_id);

CREATE TRIGGER tr_doc_reqs_updated_at
  BEFORE UPDATE ON public.document_requirements
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 11. User Documents (User's Reusable Document Inventory)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL,
  display_name TEXT NOT NULL,
  storage_path TEXT NULL,
  expires_on DATE NULL,
  notes TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own documents"
  ON public.user_documents FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own documents"
  ON public.user_documents FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own documents"
  ON public.user_documents FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own documents"
  ON public.user_documents FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_user_docs_user ON public.user_documents (user_id);

CREATE TRIGGER tr_user_docs_updated_at
  BEFORE UPDATE ON public.user_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 12. Requirement Document Links
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.requirement_document_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  requirement_id UUID NOT NULL REFERENCES public.document_requirements(id) ON DELETE CASCADE,
  user_document_id UUID NOT NULL REFERENCES public.user_documents(id) ON DELETE CASCADE,
  CONSTRAINT uq_req_user_doc UNIQUE (requirement_id, user_document_id)
);

ALTER TABLE public.requirement_document_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own requirement links"
  ON public.requirement_document_links FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own requirement links"
  ON public.requirement_document_links FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own requirement links"
  ON public.requirement_document_links FOR DELETE
  USING (auth.uid() = user_id);

-- -----------------------------------------------------------------------------
-- 13. Tasks
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  application_id UUID NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NULL,
  due_date DATE NULL,
  status TEXT NOT NULL CHECK (status IN ('open', 'in_progress', 'done', 'dismissed')) DEFAULT 'open',
  source_fact_id UUID NULL REFERENCES public.extracted_facts(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ NULL
);

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own tasks"
  ON public.tasks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own tasks"
  ON public.tasks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tasks"
  ON public.tasks FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tasks"
  ON public.tasks FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_tasks_app_status ON public.tasks (application_id, status);
CREATE INDEX IF NOT EXISTS idx_tasks_user_deadline ON public.tasks (user_id, due_date);

CREATE TRIGGER tr_tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 14. Status History
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  application_id UUID NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  from_status TEXT NULL,
  to_status TEXT NOT NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  note TEXT NULL
);

ALTER TABLE public.status_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own status history"
  ON public.status_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own status history"
  ON public.status_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own status history"
  ON public.status_history FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_status_hist_app ON public.status_history (application_id);

-- -----------------------------------------------------------------------------
-- 15. Conversations, Messages, and Message Citations
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  application_id UUID NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Application discussion',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own conversations"
  ON public.conversations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own conversations"
  ON public.conversations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own conversations"
  ON public.conversations FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own conversations"
  ON public.conversations FOR DELETE
  USING (auth.uid() = user_id);

CREATE TRIGGER tr_conversations_updated_at
  BEFORE UPDATE ON public.conversations
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  service_status TEXT NOT NULL DEFAULT 'ok',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own messages"
  ON public.messages FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own messages"
  ON public.messages FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own messages"
  ON public.messages FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON public.messages (conversation_id);

CREATE TABLE IF NOT EXISTS public.message_citations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  source_id UUID NOT NULL REFERENCES public.sources(id) ON DELETE CASCADE,
  chunk_id UUID NULL REFERENCES public.source_chunks(id) ON DELETE SET NULL,
  page_number INTEGER NULL,
  section_heading TEXT NULL,
  quote TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.message_citations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own citations"
  ON public.message_citations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own citations"
  ON public.message_citations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own citations"
  ON public.message_citations FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_citations_message ON public.message_citations (message_id);

-- -----------------------------------------------------------------------------
-- 16. Ingestion Jobs (Asynchronous queue tracker)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ingestion_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_id UUID NOT NULL REFERENCES public.sources(id) ON DELETE CASCADE,
  job_type TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('queued', 'running', 'succeeded', 'failed')) DEFAULT 'queued',
  attempts INTEGER NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ NULL,
  finished_at TIMESTAMPTZ NULL,
  safe_error_code TEXT NULL,
  idempotency_key TEXT UNIQUE NULL
);

ALTER TABLE public.ingestion_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own ingestion jobs"
  ON public.ingestion_jobs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own ingestion jobs"
  ON public.ingestion_jobs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own ingestion jobs"
  ON public.ingestion_jobs FOR UPDATE
  USING (auth.uid() = user_id);

-- -----------------------------------------------------------------------------
-- 17. Private Storage Bucket & Storage RLS
-- -----------------------------------------------------------------------------
-- Create private bucket 'application-sources' if not exists
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'application-sources',
  'application-sources',
  false,
  10485760, -- 10MB limit per free-tier safety
  ARRAY['application/pdf']::text[]
)
ON CONFLICT (id) DO NOTHING;

-- Storage object policies enforcing private ownership pattern: {user_id}/{application_id}/{source_id}/{safe_filename}
CREATE POLICY "Users can read their own private source files"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'application-sources'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can upload their own private source files"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'application-sources'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can update their own private source files"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'application-sources'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can delete their own private source files"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'application-sources'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

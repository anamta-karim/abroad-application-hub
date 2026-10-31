# Backend schema and data flows

## Suggested platform

- Supabase Auth for account creation, email/password, Google OAuth, and sessions.
- PostgreSQL for product records and pgvector for embeddings.
- Supabase private Storage bucket for uploaded PDFs.
- Responsive web frontend. Keep model and provider integrations behind server-side interfaces.
- Free-tier-only constraint applies to every provider. Verify plan limits and model/API quotas before selecting production services. Never configure paid fallback.

## Ownership model

Every user-owned row has `user_id UUID NOT NULL REFERENCES auth.users(id)`. Enable RLS on every table exposed to the client. Policies must require `auth.uid() = user_id`; for child rows also ensure the parent is owned by the same user. Use least-privilege storage policies. Service-role credentials must never reach the client. Server routes must independently validate session and ownership.

## Tables

### `profiles`

- `id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE`
- `display_name TEXT NOT NULL`
- `created_at TIMESTAMPTZ`, `updated_at TIMESTAMPTZ`

Password fields do not belong here. Supabase Auth owns password credentials.

### `applications`

- `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- `user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE`
- `record_type TEXT CHECK IN ('program','scholarship')`
- `title TEXT NOT NULL`
- `institution_or_provider TEXT`
- `country TEXT`, `degree_level TEXT`, `field_of_study TEXT`, `study_period TEXT`
- `status TEXT CHECK IN ('researching','preparing','submitted','interview','offer_received','rejected','withdrawn') DEFAULT 'researching'`
- `deadline DATE`, `official_url TEXT`
- `summary TEXT`, `user_notes TEXT`
- `verification_state TEXT CHECK IN ('unreviewed','partially_reviewed','confirmed') DEFAULT 'unreviewed'`
- `archived_at TIMESTAMPTZ NULL`
- `created_at`, `updated_at TIMESTAMPTZ`

### `application_links`

Connect scholarships to programs where appropriate.

- `id UUID PRIMARY KEY`
- `user_id UUID NOT NULL`
- `program_application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE`
- `scholarship_application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE`
- `relationship_note TEXT`
- `created_at TIMESTAMPTZ`
- Unique constraint on program/scholarship pair; validate both are owned by `user_id` and are the correct record types.

### `sources`

- `id UUID PRIMARY KEY`
- `user_id UUID NOT NULL`
- `application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE`
- `source_type TEXT CHECK IN ('webpage','pdf','pasted_text')`
- `display_name TEXT NOT NULL`
- `source_url TEXT NULL`
- `storage_path TEXT NULL` (private bucket path, not public URL)
- `mime_type TEXT`, `file_size_bytes BIGINT`
- `ingestion_status TEXT CHECK IN ('queued','processing','ready','needs_review','failed')`
- `retrieved_at TIMESTAMPTZ`, `content_hash TEXT`
- `error_code TEXT NULL` (safe public error category only)
- `created_at`, `updated_at TIMESTAMPTZ`

### `source_snapshots`

- `id UUID PRIMARY KEY`
- `user_id UUID NOT NULL`
- `source_id UUID NOT NULL REFERENCES sources(id) ON DELETE CASCADE`
- `version INTEGER NOT NULL`
- `raw_text TEXT` (access only through owner-protected backend)
- `title TEXT`, `retrieved_at TIMESTAMPTZ NOT NULL`
- `content_hash TEXT NOT NULL`
- Unique `(source_id, version)`.

### `source_chunks`

- `id UUID PRIMARY KEY`
- `user_id UUID NOT NULL`
- `source_id UUID NOT NULL REFERENCES sources(id) ON DELETE CASCADE`
- `snapshot_id UUID NOT NULL REFERENCES source_snapshots(id) ON DELETE CASCADE`
- `application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE`
- `chunk_index INTEGER NOT NULL`
- `page_number INTEGER NULL`, `section_heading TEXT NULL`
- `content TEXT NOT NULL`
- `embedding VECTOR(<dimension set by selected embedding model>) NULL`
- `created_at TIMESTAMPTZ`
- Index metadata for user/application/source filtering and vector similarity. Embeddings must use one configured model/dimension per index; record model/version if switching.

### `extracted_facts`

- `id UUID PRIMARY KEY`
- `user_id UUID NOT NULL`
- `application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE`
- `source_id UUID NOT NULL REFERENCES sources(id) ON DELETE CASCADE`
- `fact_type TEXT CHECK IN ('eligibility','deadline','document','funding','application_step','interview','other')`
- `label TEXT NOT NULL`, `value JSONB NOT NULL`
- `citation_chunk_id UUID NULL REFERENCES source_chunks(id) ON DELETE SET NULL`
- `review_state TEXT CHECK IN ('suggested','confirmed','edited','rejected') DEFAULT 'suggested'`
- `confidence TEXT CHECK IN ('clear','uncertain') DEFAULT 'uncertain'`
- `created_at`, `updated_at TIMESTAMPTZ`

Never overwrite confirmed/edited facts on source refresh. Present changed values for review.

### `document_requirements`

- `id UUID PRIMARY KEY`
- `user_id UUID NOT NULL`
- `application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE`
- `requirement_fact_id UUID NULL REFERENCES extracted_facts(id) ON DELETE SET NULL`
- `document_type TEXT NOT NULL`, `notes TEXT`
- `status TEXT CHECK IN ('not_started','in_progress','requested','ready','submitted','expired','not_applicable') DEFAULT 'not_started'`
- `due_date DATE NULL`, `created_at`, `updated_at`

### `user_documents`

Reusable user-owned document inventory, not necessarily the uploaded application source itself.

- `id UUID PRIMARY KEY`
- `user_id UUID NOT NULL`
- `document_type TEXT NOT NULL`, `display_name TEXT NOT NULL`
- `storage_path TEXT NULL`, `expires_on DATE NULL`
- `notes TEXT`, `created_at`, `updated_at`

### `requirement_document_links`

- `id UUID PRIMARY KEY`
- `user_id UUID NOT NULL`
- `requirement_id UUID NOT NULL REFERENCES document_requirements(id) ON DELETE CASCADE`
- `user_document_id UUID NOT NULL REFERENCES user_documents(id) ON DELETE CASCADE`
- Unique `(requirement_id, user_document_id)`; validate common owner.

### `tasks`

- `id UUID PRIMARY KEY`
- `user_id UUID NOT NULL`
- `application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE`
- `title TEXT NOT NULL`, `description TEXT`
- `due_date DATE NULL`
- `status TEXT CHECK IN ('open','in_progress','done','dismissed') DEFAULT 'open'`
- `source_fact_id UUID NULL REFERENCES extracted_facts(id) ON DELETE SET NULL`
- `created_at`, `updated_at`, `completed_at TIMESTAMPTZ NULL`

### `status_history`

- `id UUID PRIMARY KEY`
- `user_id UUID NOT NULL`
- `application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE`
- `from_status TEXT NULL`, `to_status TEXT NOT NULL`, `changed_at TIMESTAMPTZ`
- `note TEXT NULL`

### `conversations` and `messages`

- `conversations`: `id`, `user_id`, `application_id`, `title`, timestamps.
- `messages`: `id`, `user_id`, `conversation_id`, `role`, `content`, `created_at`, `service_status`.
- `message_citations`: message id, source id, chunk id, page/section metadata. Keep citation references structured, not only embedded in assistant prose.

### `ingestion_jobs`

- `id UUID PRIMARY KEY`, `user_id UUID NOT NULL`, `source_id UUID NOT NULL`
- `job_type TEXT`, `status TEXT CHECK IN ('queued','running','succeeded','failed')`
- `attempts INTEGER`, `started_at`, `finished_at`, `safe_error_code TEXT`
- Use idempotency key or unique `(source_id, snapshot_version, job_type)` to avoid duplicate processing.

## Storage

- Bucket: `application-sources`, private.
- Path pattern: `{user_id}/{application_id}/{source_id}/{safe_filename}`.
- Use authenticated short-lived signed URLs for previews/downloads. Do not expose raw bucket paths as public links.
- Validate file extension, MIME sniffed type, size, and PDF parsing limits. Malware scanning is preferred if available without cost; if unavailable, restrict file types/size and isolate processing.
- Remove file and derived text/chunks on source deletion. Account deletion cascades through rows and removes owned storage objects.

## Ingestion pipeline

1. Authenticate request and verify record ownership.
2. Validate URL/file; create source and queue job.
3. Fetch only a public HTTP(S) URL or read private uploaded PDF. Apply SSRF protections, redirect validation, timeouts, response-size limits, content-type checks, and rate limits.
4. Extract text, title, page numbers, and headings where possible. Record retrieval timestamp and content hash.
5. Save versioned snapshot and split into overlapping chunks with source/page/heading metadata.
6. Generate embeddings through a server-side provider adapter only if a no-cost quota is configured. Persist model/version/dimension. If unavailable, save extracted text and structured facts where possible; mark semantic Q&A unavailable and preserve manual tracker.
7. Extract candidate facts into structured JSON with citations. Validate schema, save as suggested, and show review UI.
8. Mark job ready/needs_review/failed with safe error category. Retry transient failures with a cap; never loop indefinitely.

## RAG request flow

1. Validate session, user ownership, selected application scope, user quota, and input length.
2. Embed question using the same configured model as the indexed chunks.
3. Search vector index with mandatory `user_id` and `application_id` filters. Apply RLS too; do not rely on a client-provided filter alone.
4. Optionally combine keyword and vector retrieval, rerank within the user scope, and limit context size.
5. Instruct generation to answer only from retrieved material for factual claims, preserve uncertainty, and return citations by chunk IDs.
6. Verify returned citation IDs belong to retrieved chunks and same user/application. Render source/page/heading links.
7. Save conversation only to the owner’s records. Avoid storing secrets or logging full source text.

## Free-tier and concurrency notes

- Make provider calls quota-aware and rate-limited. A free plan is not unlimited; usage exhaustion must not switch to paid services.
- Keep heavy ingestion out of the interactive dashboard request. Use a bounded job mechanism supported by the chosen free plan, or a documented manual/retry path.
- Use connection pooling and idempotency. Avoid one long-lived process if the selected host sleeps or terminates free instances.
- Re-check current free-tier quotas, retention, backups, region, and file-size limits before launch.

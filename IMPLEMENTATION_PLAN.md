# Implementation plan

## Suggested stack

- Frontend: Next.js with TypeScript, responsive CSS, semantic components.
- Backend/data: Supabase Auth + PostgreSQL/pgvector + private Storage.
- Deploy only on free tiers. Do not add paid API dependencies. Keep AI/embedding provider behind interfaces and configure only an actually available no-cost quota. Recheck quotas before release.
- Keep processing asynchronous and bounded. If the chosen free tier cannot support a persistent worker, use a documented job/status approach appropriate to its limits rather than pretending work completed synchronously.

## Phase 0: verify constraints

- Confirm current free-tier plan limits for auth, database, storage, functions, and AI/embedding provider.
- Choose framework and hosting after checking the existing repository and its instructions.
- Define max upload size, max source text, per-user ingestion limits, and daily model quota.
- Write down data retention and deletion behavior.

## Phase 1: foundation

- Scaffold app, environment variable validation, lint/format setup, typed database client.
- Create database migrations and RLS policies before UI data access.
- Set up Supabase Auth email/password, Google OAuth, callbacks, profile trigger/upsert, logout, reset flow.
- Add protected route handling and session-aware server/client integration.
- Verify two test accounts cannot read each other’s records/files.

## Phase 2: design system and public/auth pages

- Implement Warm Paper + Forest tokens and typography.
- Build landing, signup, login, reset, OAuth callback, and empty dashboard.
- Follow UI rules: no Lucide, emoji, gradients, card-heavy shell, hover animations, or AI-like copy.
- Make phone and desktop layouts work before adding complex features.

## Phase 3: application tracker

- CRUD program/scholarship records and links between them.
- Status history, manual deadlines, tasks, document requirements, user document library.
- Dashboard, application list/detail, deadline list, empty states.
- Official application-site link with confirmation/review and safe external-link behavior.

## Phase 4: sources and ingestion

- Private PDF upload with validation and storage policies.
- Public URL intake with SSRF protections and limits.
- Job status UI, text extraction, versioned snapshots, chunk metadata, safe failure/retry.
- Extraction review/edit UI; facts stay suggested until user confirms.
- Ensure refresh never silently overwrites confirmed user edits.

## Phase 5: RAG and preparation

- Configure no-cost embedding/generation provider within explicit quotas; no paid fallback.
- Implement per-user/per-application retrieval filter, citations, evidence abstention, and prompt-injection defenses for retrieved documents.
- Build Q&A interface and tailored preparation workflows: SOP pointers, interview questions, study plan, LOR planning.
- Separate sourced facts from model-generated suggestions in UI and persisted response metadata.
- Graceful disabled state when provider quota is unavailable.

## Phase 6: production readiness

- Validate RLS and storage isolation with multiple accounts.
- Validate SSRF protections, upload limits, content checks, rate limits, auth callbacks, password reset, deletion, quota exhaustion, and failure states.
- Review accessibility and keyboard navigation.
- Test responsive layouts at 360, 390, 768, 1024, and desktop widths.
- Check backup/restore capabilities available in the free plan; if automatic backups are not included, document export/recovery strategy.
- Add privacy notice, terms/contact route as appropriate, service dependency and quota documentation.
- Verify domain, HTTPS, redirect allowlist, environment secrets, and production auth settings.
- Run an end-to-end release walkthrough: signup → add source → review facts → checklist → ask with citation → status update → sign out/in → delete data.

## Release gates

Do not call the app ready to ship until:

1. Cross-account isolation is demonstrated for database, storage, search, and signed URLs.
2. User can recover account access and delete their account/data.
3. Every factual answer cites saved evidence or clearly abstains.
4. URL ingestion is protected against private-network access and oversized responses.
5. The tracker remains usable when AI services or quotas are unavailable.
6. Mobile and desktop core flows are reviewed.
7. Every production dependency is free-tier-only and its quota/limits are documented. No paid fallback exists.

## Build discipline for Antigravity

- Inspect the repo and its local instructions first. Preserve existing work.
- Implement in small phases; do not build mock data into the live user experience.
- Use migrations for schema changes and keep RLS tests close to policy changes.
- Keep secrets server-side, validate all inputs server-side, and use typed responses.
- For any uncertain product decision, prefer explicit user review over silent automation.
- Do not claim a feature is complete unless its failure and empty states are handled.

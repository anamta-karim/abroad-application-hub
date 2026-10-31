# Agent instructions

## Product goal

Build Abroad Application Hub, a responsive personal workspace for study-abroad programs and scholarship applications. Read `README.md`, `PRODUCT_SPEC_AND_PRD.md`, `APP_FLOW.md`, `UI_UX_DESIGN_SYSTEM.md`, `BACKEND_SCHEMA.md`, and `IMPLEMENTATION_PLAN.md` before implementation.

## Non-negotiable requirements

- Free-tier-only services and dependencies. Never enable paid usage, configure a paid fallback, or imply free plans are unlimited. If a required feature cannot be supported within available free limits, explain the constraint and provide a graceful fallback.
- Protect user data. Every record, source, chunk, file, conversation, and job must be owner-scoped. Enforce RLS and storage policies, plus server authorization checks.
- No demo/filler applications, universities, scholarships, or user records in production.
- Use source citations for factual application answers. Abstain when evidence is missing.
- User reviews extracted facts before those facts become confirmed application data.
- Mobile and desktop must both support core workflows.
- Use selected Warm Paper + Forest theme.
- Do not use Lucide icons, decorative emojis, card-heavy UI, gradients, hover animations, animated arrows, or AI-sounding copy. Do not use em dash in user-facing text.

## Security requirements

- Never expose service-role keys, OAuth secrets, or model-provider keys in browser bundles.
- Validate all client input server-side. Use URL allowlisting of schemes, DNS/IP checks, redirect revalidation, time/size limits, and content-type checks for webpage ingestion.
- Enforce per-user and global quotas for uploads, source processing, and model requests.
- Do not log passwords, tokens, full private documents, or unnecessary personal data.
- Use short-lived signed URLs for private files.
- On account deletion, remove the user’s database rows, storage objects, vector chunks, and derived data according to documented policy.

## Engineering practices

- Inspect repository structure and existing instructions before changing files.
- Prefer small, reviewable changes and database migrations.
- Handle loading, empty, success, failure, and quota-exhausted states.
- Never silently overwrite user-confirmed facts with refreshed extraction.
- Keep AI-generated suggestions visually distinct from official source facts.
- Preserve user-entered content on retryable errors where feasible.
- Verify responsive layouts and accessibility, not only desktop screenshots.
- Do not add dependencies unless needed; check whether each has a no-cost license/usage path suitable for deployment.

## Completion reporting

When a phase is complete, summarize what changed, what was verified, any remaining gaps, and which free-tier assumptions still need confirmation. Never call the product production-ready while a release gate in `IMPLEMENTATION_PLAN.md` is unresolved.

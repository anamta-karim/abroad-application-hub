# Product specification and PRD

## Product

**Working name:** Abroad Application Hub  
**Purpose:** Help students organize multiple study-abroad program and scholarship applications using their own official sources, with a unified checklist, timeline, application tracker, and source-cited assistant.

## Problem

Applicants must gather information from different prospectuses, scholarship rules, university pages, and application portals. Requirements and deadlines vary; some documents are reused while others are unique. It is easy to miss a requirement, misunderstand scholarship coverage, or lose track of an application’s status.

## Product promise

Turn scattered application information into a personal, editable workspace. The app should make it easier to know what each application requires, what can be reused, what needs attention next, and where the information came from.

## Users

- A student applying to one or more international university programs.
- A student applying for university, government, or private scholarships, separately or alongside programs.
- Initial product is for individual accounts. Collaboration/sharing between users is out of scope.

## Core user outcomes

1. Create an account and return later without losing their workspace.
2. Add a program or scholarship using a public webpage URL, uploaded PDF, or both.
3. Review and correct extracted information before relying on it.
4. See deadlines, requirements, shared documents, unique documents, scholarship coverage, and current status in one place.
5. Ask questions about an application and receive answers grounded in its saved sources, with citations.
6. Get tailored preparation help for SOPs, likely questions, study plans, and recommendation letters without fabricated personal facts or unsupported claims.
7. Open the official application website from the relevant program or scholarship page.

## Product principles

- **Evidence first:** factual requirements, dates, eligibility, and funding claims must cite a source passage/page or be marked unverified.
- **User-reviewed extraction:** extracted details are suggestions until confirmed or edited by the user.
- **No invented facts:** never fabricate user history, requirements, deadlines, scholarship coverage, or application outcomes.
- **Empty by default:** no fake content for new accounts.
- **Useful without AI:** checklist, deadlines, statuses, and manual records remain usable when model services are unavailable or quotas are exhausted.
- **Privacy by design:** every private record and file belongs to one authenticated user; enforce this in database/storage policies and server authorization.
- **Accessible and responsive:** usable on small screens, keyboard, and assistive technologies.
- **Plain language:** genuine, concise writing; no generic AI phrasing.
- **Free-tier-only deployment:** no paid service dependency, paid API, or automatic paid upgrade. Respect provider quotas and expose limits.

## Functional requirements

### Public and authentication

- Public landing page explains what the product does and how it works.
- Provide clear Log in and Sign up actions.
- Sign up asks for name, email, password, and password confirmation.
- Validate matching passwords and a clear password-strength policy. Do not store passwords in application tables; delegate authentication to Supabase Auth.
- Support email/password login, logout, password reset, and Google OAuth.
- Handle email confirmation and OAuth callback states cleanly.
- Protect all workspace routes and return signed-out users to login.

### Application and scholarship records

- User can create, edit, archive, and delete a university program or scholarship record.
- Records can be linked: one program may have multiple scholarship opportunities; a scholarship can be associated with one or more programs where appropriate.
- Track type, institution/provider, title, country/destination, degree/field, study period, deadline, official application URL, status, notes, and source-verification state.
- Status values: Researching, Preparing, Submitted, Interview, Offer received, Rejected, Withdrawn. Allow status changes and record timestamps.
- User can manually add/edit all extracted fields.

### Sources and extraction

- Accept a public webpage URL and PDF upload; allow multiple sources per record.
- Store original files privately. Store webpage URL and a dated extracted-text snapshot for traceable citations.
- Extract title, eligibility, deadline, documents, funding coverage, application instructions, interview details, and source URLs when present.
- Show extraction review before saving structured facts as user-confirmed.
- Display source citation on each extracted fact where available (document/page or URL/heading).
- If a website is inaccessible, require authentication, has little extractable text, or cannot be safely fetched, explain the issue and allow PDF/text fallback.
- Do not crawl a domain broadly. Process only the URL submitted and explicitly selected linked PDFs.
- URL fetching must prevent SSRF: allow only public HTTP(S), block private/loopback/link-local/reserved IP ranges, re-check redirects and resolved addresses, restrict size/content type/time, and reject unsupported schemes.
- Provide refresh for website snapshots and preserve previous snapshot metadata so the user can tell what was used for earlier answers.

### RAG assistant and preparation help

- Assistant is scoped to one selected program/scholarship or an explicitly selected group.
- Retrieve only sources owned by the signed-in user and associated with the selected scope.
- Answers about factual application details must cite source name and page/section/link.
- If sources do not support an answer, say so and suggest what source or contact to check.
- Distinguish official facts from generated suggestions.
- Preparation modes: SOP brainstorming/pointers, likely interview questions, study-plan outline, recommendation-letter planning, and user questions about forms.
- Ask for missing personal context rather than inventing it. Do not claim a draft meets official criteria unless the cited criteria support that.
- Do not claim scholarship compatibility. Flag possible overlap/exclusivity language with citations and ask the user to verify with the official provider.
- Keep AI processing optional and resilient to quota exhaustion. No paid fallback.

### Dashboard and tracking

- Show next deadlines, pending tasks, application counts by status, and recently updated records.
- Show combined document readiness: reusable/shared documents versus unique requirements per application.
- Users can mark a document as ready, requested, in progress, submitted, expired, or not applicable.
- Show scholarship coverage categories (tuition, travel, stipend/living, insurance, other) as stated in sources, with unknown when not specified.
- Provide links to the official application site, clearly labeled and user-reviewable.
- New accounts show a meaningful empty state and Add first application action, not seeded example records.

## Non-functional requirements

- Mobile-first responsive layout; no core action requires desktop.
- RLS for every user-owned database table; private storage policies; server-side ownership checks.
- Never expose service-role or model secrets in browser code.
- Validate and limit uploads; show processing state and failures; make ingestion idempotent.
- Rate-limit expensive AI and ingestion actions per user; apply per-user and global quotas.
- Safe errors without leaking internal prompts, secrets, stack traces, or another user’s data.
- Audit important state changes (status changes, source refresh, deletion) at an appropriate level.
- Provide account deletion and data deletion behavior, including files and vectors.
- Add basic operational visibility for failed ingestion and quota exhaustion without logging sensitive document contents.
- Use accessible labels, focus states, contrast, keyboard navigation, and semantic HTML.

## MVP scope

1. Landing page and auth (email/password + Google).
2. Empty personal dashboard and create/edit/delete program or scholarship.
3. PDF upload and one public webpage URL per source record, with safe ingestion.
4. Extraction review/edit flow; requirements, deadlines, funding, source citations.
5. Application checklist, manual status tracking, official link, upcoming deadlines.
6. Source-grounded Q&A for a selected record.
7. Responsive design, RLS/storage isolation, quota/error states, and launch documentation.

## Later, only after MVP is reliable

- Multiple source refresh comparisons and change notifications.
- Calendar export/reminders.
- Essay workspace with version history.
- More automated duplicate/shared-document suggestions.
- More advanced funding comparison and conflict detection.
- User-controlled collaboration with a counselor.

## Out of scope for MVP

- Submitting applications on behalf of a user.
- Guaranteeing eligibility, admission, scholarship award, or visa outcomes.
- Legal/immigration advice.
- Automatically crawling university websites or scraping login-protected portals.
- Cross-account sharing or public profiles.
- Making a definitive determination that two awards can be combined.

## Success measures

- A new user can sign up, add a source, review extracted details, and create a useful checklist without assistance.
- All factual assistant answers in the evaluation set either include a correct citation or clearly abstain.
- Cross-user access tests show no leakage in records, search results, signed file links, or chat.
- Core flows work at phone and desktop widths.
- Users can complete the central workflow with AI unavailable, except for extraction/Q&A features.

## Release acceptance checklist

- Auth flows, password reset, Google callback, logout, and protected routes work.
- RLS and storage isolation are tested with at least two accounts.
- No production seed/demo user data.
- Upload limits, URL safety protections, rate limits, and safe error states are implemented.
- AI citations resolve to the actual saved source passages.
- Data deletion removes associated records/files/chunks.
- Mobile and desktop usability reviewed.
- Provider free-tier quotas, retention, regional availability, and terms checked immediately before release; no paid fallback configured.

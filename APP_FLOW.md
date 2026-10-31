# App flow

## Route map

- `/` — public landing page.
- `/login` — email login and Google login.
- `/signup` — name, email, password, confirm password.
- `/auth/callback` — OAuth/email callback processing.
- `/reset-password` — request reset; `/update-password` — choose replacement.
- `/app` — authenticated dashboard.
- `/app/applications/new` — add a program or scholarship.
- `/app/applications/[id]` — one record workspace.
- `/app/applications/[id]/sources/review` — extraction review.
- `/app/documents` — user’s reusable document library.
- `/app/deadlines` — all deadlines and tasks.
- `/app/settings` — profile, account, security, delete account.

## First visit and returning user

1. Visitor lands on `/` and sees concise explanation, how it works, privacy note, and Log in / Sign up actions.
2. Signup asks for name, email, password, and confirmation. Inline validation explains errors in plain language.
3. Supabase Auth creates the account; require email confirmation if enabled. Google OAuth returns through the configured callback.
4. Create/update a profile row tied to the auth user. Never store the password in profile data.
5. Redirect to `/app`.
6. If there are no records, show an empty state with one primary action: “Add your first application.” Do not render sample institutions or fake deadlines.
7. Returning authenticated user goes to their own dashboard. Expired session sends them to login and returns them to the intended page after successful login.

## Add program or scholarship

1. User selects Add application.
2. Choose record type: University program or Scholarship. For a scholarship attached to a program, offer a link-existing-record option.
3. Enter a name and optional basic fields; add official site URL and/or upload PDF.
4. Validate URL and file (type, size, ownership context); show selected sources before processing.
5. Create an owned record and source records with status `queued`.
6. Process source asynchronously where possible. UI shows queued/processing/needs attention/ready/failed states and can be left safely.
7. Extracted values appear in a review form, grouped into deadline, eligibility, documents, funding, and application steps. Each value links to source citation; user can edit, confirm, mark unknown, or discard.
8. Saving confirmed facts updates the record and creates checklist tasks/document requirements. Extraction must not overwrite user edits on later refresh without review.
9. Open record workspace with overview, checklist, sources, preparation, and Ask about this application.

## Program workspace

- Overview: destination, deadline, official link, status, key requirements and funding summary.
- Checklist: task, due date, status, required document association.
- Sources: uploaded files and URL snapshots; add, refresh, remove, view extraction status.
- Preparation: SOP prompts, likely questions, study-plan outline, recommendation-letter planning.
- Ask: conversation scoped to this record; citations open the source/page or show a PDF page excerpt.
- Status changes are manual, explicit, and timestamped.

## Dashboard with existing records

- Top: “Good morning/Hello, [first name]” only if natural; avoid generic generated greeting if unnecessary.
- Upcoming deadlines list with date, action, program/scholarship name.
- Applications in a compact table/list with status, deadline, and last update.
- Tasks needing attention and missing/shared documents.
- Funding summary can be a plain table/list, with possible overlap marked for review.
- Add application remains visible.

## Important states

- Empty: no applications; explain next step without example data.
- Loading: concise progress text; do not use fake progress percentages.
- Source inaccessible: explain why if known; offer PDF upload or paste text.
- Extraction incomplete: preserve source; allow manual entry and retry.
- No evidence for question: state that the saved sources do not answer it; offer source upload or official link.
- Quota exhausted: keep manual tracker usable; explain when/what can be retried, with no paid upgrade prompt.
- Offline/temporary error: preserve unsaved form content where safe and offer retry.
- Delete: confirm consequences and delete owned records, files, vectors, and derived data.

## Mobile navigation

- Use a compact top bar and accessible menu or bottom navigation with text labels.
- Dashboard, Applications, Documents, Deadlines, Settings remain reachable.
- Tables become readable stacked rows or horizontally scrollable with clear labels; do not shrink text.
- Primary actions remain reachable without hover.

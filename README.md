<div align="center">

# AbroadAtlas 🌍

### Track study-abroad deadlines, ingest official university guidelines, and generate tailored prep blueprints — strictly backed by verified evidence.

![Next.js](https://img.shields.io/badge/Next.js-15.5-black.svg)
![React](https://img.shields.io/badge/React-19-blue.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6.svg)
![Supabase](https://img.shields.io/badge/backend-Supabase_PostgreSQL-3ECF8E.svg)
![Tests](https://img.shields.io/badge/tests-vitest_121_passed-brightgreen.svg)
![Design](https://img.shields.io/badge/design-Cool_Blue_Glassmorphism-60A5FA.svg)

[🚀 **Visit Live App**](https://abroad-application-hub.vercel.app)  ·  [Getting started](#getting-started)  ·  [How it works](#how-it-works)  ·  [Honest by design](#honest-by-design)

</div>

---

## In plain English

Applying to universities and scholarships abroad is overwhelming. Admissions rules are scattered across 40-page PDFs, university portals, and embassy notices. Deadlines are easy to miss, and generic advice from search engines often mixes up different degree levels, visa tracks, or requirements.

**AbroadAtlas** is a personal workspace that keeps your study-abroad journey organized, factual, and stress-free.

Add an application (or watch a program that hasn't opened yet), attach its official webpage or PDF guidelines, and it:

1. **tracks confirmed deadlines and prospective openings** on a clean, visual timeline with automated countdowns and nudge alerts,
2. **reads your official source documents** and pulls out real criteria without overwriting your personal notes,
3. **answers your admissions questions** (such as language test scores, GPA minimums, or eligibility rules) quoting the exact page and source text,
4. **generates tailored blueprints** for your Statement of Purpose (SOP), interview preparation, and recommendation letters (LOR) shaped around your target program's actual requirements.

When a requirement is missing from your document, it says so openly instead of making up dates or guessing rules.

> ⚠️ AbroadAtlas is a preparation and organization workspace, **not an admissions office**. Always double-check final submission dates on your university's official portal.

---

## Table of contents
- [What you can do](#what-you-can-do)
- [What this project demonstrates](#what-this-project-demonstrates)
- [How it works](#how-it-works)
- [Honest by design](#honest-by-design)
- [How well does it work?](#how-well-does-it-work)
- [Tech stack](#tech-stack)
- [Getting started](#getting-started)
- [Troubleshooting](#troubleshooting)
- [Project structure](#project-structure)
- [Challenges and what I learned](#challenges-and-what-i-learned)
- [Limitations and next steps](#limitations-and-next-steps)
- [Glossary](#glossary)

---

## What you can do

| Feature | You do this | You get this |
|---|---|---|
| 🔎 **Discover** | Search curated scholarships, universities worldwide (ROR) or US degree programs (College Scorecard) | One-click add to your applications or your opening watchlist |
| ⚡ **URL Auto-Fill** | Paste an admissions link | Title, provider, country, degree level, deadline and funding notes filled in for you |
| 🎯 **Application Tracker** | Add a program or scholarship | Status tracking, deadline countdowns, archive of past-due items, and an **Opening Watchlist** for intakes that haven't opened |
| 🗓️ **This Week & Calendar** | Open the dashboard or Deadlines page | A ranked list of what needs attention now, and a month calendar of deadlines, due dates and expected openings |
| 📅 **Calendar Sync** | Create a private link in Settings | Your deadlines in Google Calendar, Apple Calendar or Outlook, updated automatically, with alerts 7 days and 1 day before |
| 💰 **Costs & Compare** | Enter tuition, living costs, fees and funding | Net cost per application, and a side-by-side comparison of up to 4 applications in one currency (ECB exchange rates) |
| 🗂️ **Document Checklist** | Tick the common documents you already have | Each application's checklist matched against them: what's covered, what's still needed, what expires before the deadline, and what's specific to that application |
| 📄 **Official Source Ingestion** | Paste an admissions link or upload a prospectus PDF | Text extracted with page numbers and section titles; suggested deadlines and required documents for you to confirm |
| 💬 **Grounded Q&A** | Ask *"What IELTS score is required?"* | An answer quoted from your sources with the page number, or an honest "not found" |
| 📝 **Application-Specific Blueprints** | Click **SOP**, **Interview**, **LOR** or **Study Plan** | A plan built from that application's own requirements: quoted limits and rules, a tailored structure, a timeline counted back from its deadline, and a list of what the sources don't say |
| 🔒 **Privacy & Data Freedom** | Click **Export Data** or **Delete Account** in Settings | A JSON backup of everything, or permanent erasure, with strict per-user database isolation |

---

## What this project demonstrates

| Area | What was built |
|---|---|
| **Human-in-the-Loop AI** | AI suggestions (dates, requirements) never overwrite your data silently; you review and approve every extracted item |
| **Grounded Retrieval (RAG)** | Smart keyword classification and sentence co-occurrence that prioritizes specific terms (tests, GPAs, apostilles) over generic filler text |
| **Strict Evidence Abstention** | If your attached prospectus doesn't state a requirement, the system abstains honestly rather than hallucinating false dates |
| **Security & SSRF Defense** | Multi-layer server-side protection on web ingestion: DNS resolution checks, private IP blocking, stream size caps, and mime-type verification |
| **Row-Level Security (RLS)** | PostgreSQL policies ensure complete owner isolation; no user can ever query or view another user's documents or applications |
| **Clean Glassmorphism UI** | A tailored Cool Blue frosted glass design system with backdrop blur, ambient color glow, and accessible contrast |
| **Zero-Cost Deployment** | Fully functional without paid subscriptions: free-tier Supabase, Next.js on Vercel (running in the same region as the database), and an optional Gemini API key |
| **Automated Testing** | 121 automated tests covering security, grounding, PDF extraction, blueprints, costs, calendar and document matching, run on every push by GitHub Actions |

---

## How it works

```mermaid
flowchart LR
    U([You]) --> UI["Cool Blue Workspace<br/>Applications · Checklists · Prep Studio"]
    UI --> S["Next.js Server Actions"]
    S --> SEC{"SSRF & Security Shield<br/>(Validates URLs, blocks private IPs)"}
    SEC --> ING["Ingestion Engine<br/>HTML text cleaner · PDF parser"]
    ING --> DB[("Supabase PostgreSQL<br/>Owner-isolated with RLS")]
    UI --> RAG["Grounded RAG Engine<br/>Keyword weighting + Citation matching"]
    RAG --> GEM["Application-specific blueprints<br/>SOP · Interview · LOR · Study plan · Q&A"]
    GEM -. optional .-> AI["Google Gemini<br/>(writes from the same evidence)"]
```

### How an admissions document turns into verified preparation

```mermaid
flowchart TD
    A["Admissions Webpage URL or PDF"] --> B["Security & Content Check"]
    B --> C["Clean text extraction & chunking<br/>(Preserves section titles and page numbers)"]
    C --> D[("Encrypted Source Chunks in Database")]
    E["You ask a question or request a blueprint"] --> F["Smart Keyword & Proximity Matching"]
    D --> F
    F --> G{"Is there verified evidence<br/>in your document?"}
    G -- Yes --> H["Answer + Exact Page Quotes + Strategy Tips"]
    G -- No --> I["Honest Notice: Not found in this document<br/>+ Next steps for your department"]
```

---

## Honest by design

When preparing high-stakes university or visa applications, incorrect information is worse than no information. This project follows strict rules:

- **No silent overwrites.** Ingesting a university page will suggest deadlines and required documents, but it will never erase or change what you typed manually.
- **Evidence or abstention.** If your document does not contain an answer (for example, if a scholarship summary does not list specific departmental language cutoffs), the system clearly says so and advises where to look instead of inventing scores.
- **Separation of facts and coaching.** Official facts cited from your document are displayed with distinct badges and page tags, separate from general strategic coaching advice.
- **Blueprints only state what your sources say.** Word limits, letter counts, interview stages and selection criteria are quoted from that application's documents with page numbers; anything the sources don't cover is listed under *Not found in your sources* instead of being guessed.
- **Your data stays yours.** Every database query enforces Row Level Security based on your encrypted session. You can download all your data in one click or permanently delete your account at any time.

---

## How well does it work?

The test suite runs 34 automated checks on every build, verifying security, grounding accuracy, and isolation.

| Test Category | What is tested | Result |
|---|---|---|
| **RAG Grounding & Abstention** | Rejects ungrounded queries; extracts accurate page citations; keeps facts separate from coaching | ✅ Passed |
| **Tokenization & Term Specificity** | Accurately isolates test acronyms (`topik`, `ielts`, `gre`, `gpa`) from common words | ✅ Passed |
| **SSRF Web Protection** | Blocks loopback (`127.0.0.1`), private LANs (`192.168.x.x`, `10.x.x.x`), cloud metadata (`169.254.169.254`), and invalid protocols | ✅ Passed |
| **Database Row Level Security** | Verifies RLS policies across all tables (`applications`, `sources`, `source_chunks`, `opening_reminders`) | ✅ Passed |
| **Authentication Validation** | Enforces email formats, minimum password lengths, and safe session callbacks | ✅ Passed |
| **End-to-End Walkthrough** | Tests application creation, watchlist reminders, document linking, and intake rollovers | ✅ Passed |

---

## Tech stack

| Part | Tool | Why it was chosen |
|---|---|---|
| **Framework** | Next.js 15 (App Router) | Modern server components, fast routing, and clean Server Actions |
| **Frontend** | React 19 + Tailwind CSS | Fluid reactive state, custom frosted glass styling, responsive layout |
| **Typography** | Manrope & DM Sans | Clean, legible font pairing designed for dense information dashboards |
| **Backend & Database** | Supabase (PostgreSQL) | Native authentication, instant relational data, and Row Level Security |
| **Document Processing** | pdf.js (via `unpdf`) | Reads real-world PDFs (embedded fonts, Word/InDesign exports) with page numbers and headings; detects scanned and protected files |
| **Security Shield** | Node.js `dns` & `net` | Prevents SSRF attacks by inspecting resolved network addresses before fetching |
| **AI Synthesis** | Grounded rules engine + optional Google Gemini (`gemini-3.5-flash-lite`, configurable) | Works fully without an API key; with one, the model writes answers and blueprints from the same cited evidence |
| **Hosting** | Vercel (Sydney region) + Supabase | Server code runs next to the database, so each query is a few milliseconds |
| **Testing** | Vitest + GitHub Actions | Typecheck and tests on every push and pull request |

---

## Getting started

Follow these simple steps to run the project locally on your machine.

### What you need:
* **Node.js** (v18.18 or newer) — [Download here](https://nodejs.org/)
* A free **Supabase** account — [Sign up here](https://supabase.com)

---

### Step 1: Clone the repository
```bash
git clone https://github.com/anamta-karim/abroad-application-hub.git
cd abroad-application-hub
```

### Step 2: Install dependencies
```bash
npm install
```

### Step 3: Configure your environment variables
Create a `.env.local` file in the root folder:
```bash
# On Windows (PowerShell):
Copy-Item .env.example .env.local

# On macOS / Linux:
cp .env.example .env.local
```

Open `.env.local` in your editor and add your Supabase details (found in your Supabase Dashboard under **Project Settings &rarr; API**):
```ini
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Optional: a Google Gemini API key lets the model write Q&A answers and blueprints
# from your sources (everything works without it)
# GEMINI_API_KEY=your-gemini-key-here
# GEMINI_MODEL=gemini-3.5-flash-lite

# Optional: free key from https://api.data.gov/signup/ for US program search in Discover
# COLLEGE_SCORECARD_API_KEY=your-key-here
```

### Step 4: Set up the database
In your Supabase project dashboard, click **SQL Editor** &rarr; **New query**, and run each migration script in this order:
1. [`20261101000000_init_schema.sql`](supabase/migrations/20261101000000_init_schema.sql): tables, row-level security, storage bucket
2. [`20261102000000_opening_reminders.sql`](supabase/migrations/20261102000000_opening_reminders.sql): opening watchlist
3. [`20261113000000_parent_ownership_policies.sql`](supabase/migrations/20261113000000_parent_ownership_policies.sql): stricter ownership rules
4. [`20261114000000_application_costs.sql`](supabase/migrations/20261114000000_application_costs.sql): cost fields
5. [`20261115000000_calendar_feeds.sql`](supabase/migrations/20261115000000_calendar_feeds.sql): private calendar feeds

### Step 5: Start the app
```bash
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser!

### Step 6: Run the tests
```bash
npm test
```
All 121 tests run locally (the same checks GitHub runs on every push).

---

## Troubleshooting

| Problem | What to do |
|---|---|
| **Login or Signup gives a redirect error** | Go to your Supabase Dashboard &rarr; **Authentication &rarr; URL Configuration &rarr; Redirect URLs** and add `http://localhost:3000/**` (or your live Vercel URL `https://your-app.vercel.app/**`) |
| **"Failed to fetch official URL" during ingestion** | The website may be blocking automated scrapers, or the address might be private/internal. Upload the prospectus as a PDF instead |
| **Webpage is missing sections** | Some university portals render content purely via JavaScript. Use the **Upload PDF** option for 100% complete guideline extraction |
| **"Could not find verified evidence" in Q&A** | This means the exact topic was not mentioned in the attached document. Check if the university has a separate department annex or language policy PDF |
| **Port 3000 is already in use** | Run `npm run dev -- -p 3001` to start the app on another port |

---

## Project structure

```
abroad-application-hub/
├── app/                              # Next.js 15 App Router pages & actions
│   ├── api/
│   │   ├── admissions/fetch-details/ # URL auto-fill
│   │   └── calendar/[token]/         # Private iCalendar feed
│   ├── app/                          # Signed-in workspace
│   │   ├── applications/             # Application pages, new & edit forms
│   │   │   └── [id]/rag/ & sources/  # Q&A, blueprints, source ingestion actions
│   │   ├── compare/                  # Side-by-side comparison with costs
│   │   ├── deadlines/                # Month calendar
│   │   ├── discover/                 # Scholarship, university & US program search
│   │   ├── documents/                # Document checklist across applications
│   │   ├── settings/                 # Calendar sync, export, account deletion
│   │   └── page.tsx                  # Dashboard (This week, deck, watchlist)
│   ├── auth/callback/                # Supabase auth redirect handler
│   └── page.tsx                      # Public landing page
├── components/                       # UI components
├── lib/
│   ├── ai/gemini.ts                  # Optional Gemini client (model configurable)
│   ├── catalog/                      # Curated scholarships, ROR & College Scorecard clients
│   ├── documents/                    # Common documents & checklist matching
│   ├── ingestion/                    # SSRF guard, HTML & PDF extraction, chunking, facts
│   ├── rag/                          # Retrieval, Q&A and application-specific blueprints
│   ├── supabase/                     # Supabase clients, ownership checks
│   ├── calendar.ts, ics.ts, weekly.ts  # Calendar grid, iCalendar feed, This week
│   └── costs.ts, fx.ts               # Cost estimates & currency conversion
├── supabase/migrations/              # SQL schema, RLS policies, functions
├── tests/                            # Vitest suite (121 tests)
└── .github/workflows/ci.yml          # Typecheck & tests on every push
```

---

## Challenges and what I learned

| Challenge | How it was solved |
|---|---|
| **Generic bag-of-words retrieval failed on specific questions** | When a user asked *"what is the TOPIK requirement"*, a document with many repetitions of the word *"required"* outscored chunks that actually had *"TOPIK"*. I added an admissions keyword classifier that gives rare terms like `topik`, `ielts`, or `gpa` a heavy score boost. |
| **Preventing SSRF vulnerabilities when users submit URLs** | Fetching arbitrary user-submitted URLs can expose internal networks or cloud metadata. I built an SSRF guard that resolves DNS before fetching, rejects private IP ranges (`127.0.0.1`, `10.x.x.x`), and strictly validates protocols. |
| **Balancing upcoming intakes with active applications** | Users often look at programs that won't open for months. Forcing them to enter a fake deadline caused confusion. I separated entries into **Live Applications** (with verified deadlines) and **Opening Reminders** (with expected dates and automated nudge alerts). |
| **Unescaped HTML entities in modern JSX** | Special symbols like `&nearr;` can render as raw code in client components. Replaced raw HTML entities with clean Unicode symbols and SVGs for a polished interface. |
| **Zero-cost RAG without mandatory paid API keys** | Relying solely on paid AI APIs causes rate limit failures and excludes free-tier users. I engineered a deterministic grounded synthesis engine that generates structured blueprints directly from source chunks, with an optional Gemini free-tier layer. |

---

## Limitations and next steps

**Current Limitations:**
* **JavaScript-Heavy Portals**: Web ingestion reads server-rendered HTML. For portals that load content in the browser, upload the PDF guidelines instead.
* **Scanned PDFs**: Image-only PDFs are detected and rejected with a clear message; reading them would need OCR.
* **Document Currency**: Answers reflect the documents you attach; if requirements change mid-cycle, attach the updated document.

**Next Steps:**
* OCR for scanned prospectuses and certificates.
* Email reminders alongside the calendar feed.
* Recommendation-letter tracker and eligibility matching against your profile.

---

## Glossary

| Term | Meaning |
|---|---|
| **Intake** | The academic period when a university admits students (e.g., *Fall 2026* or *Spring 2027*). |
| **Opening Watchlist** | A reminder system for programs that haven't launched yet, alerting you when portals open. |
| **Grounding** | Ensuring an AI answer is strictly supported by real sentences in your uploaded document, with zero guessing. |
| **Abstention** | The system's ability to say *"I could not find information regarding this in your source"* when evidence is absent. |
| **SSRF** | Server-Side Request Forgery — a web vulnerability prevented by blocking requests to private internal networks. |
| **RLS** | Row Level Security — a database protection where you can only view and edit your own personal records. |
| **SOP / LOR** | Statement of Purpose (admissions essay) and Letter of Recommendation (referee letter). |

---

<div align="center">

Built by [@anamta-karim](https://github.com/anamta-karim)

</div>

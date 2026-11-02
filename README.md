# Abroad Application Hub

A responsive personal workspace for study-abroad degree programs and scholarship applications, designed with a cool blue frosted-glass aesthetic, strict source grounding, and owner-isolated data security.

---

## Key Features

- **Cool Blue Glassmorphism UI**: Floating frosted glass tablet canvas with ambient multi-color aurora refraction, integrated navigation sidebar, and refined typography (Manrope & DM Sans).
- **Application & Scholarship Tracker**: Track degree programs and scholarships, link awards to target universities, maintain status history, and monitor target deadlines.
- **Auto-Archive & Past-Due Isolation**: Expired, uncompleted applications are automatically segregated into an archive view with single-click rollover for the next admissions intake.
- **Intake Opening Watchlist**: Set reminders for prospective programs before portals open; get automated dashboard nudge alerts when admissions cycles start.
- **SSRF-Protected Source Ingestion**: Securely ingest official admissions webpages and upload PDF prospectuses. Validates DNS, blocks private/internal IPs, and enforces strict size/timeout limits.
- **Grounded Verification**: Extracted facts (deadlines, requirements, funding) remain pending suggestions until explicitly reviewed and confirmed. Refreshed extraction never silently overwrites user data.
- **Grounded Prep Studio & Q&A**: Ask factual questions with structured page citations. Strict evidence abstention prevents hallucinated dates or criteria. Includes blueprints for SOPs, interview prep, LOR strategy, and study plans.
- **Complete Privacy & Right to be Forgotten**: Strict PostgreSQL Row Level Security (RLS) on all tables, 1-click offline JSON archive export, and permanent account wipe.

---

## Tech Stack

- **Framework**: Next.js 15 (App Router, Server Actions)
- **Frontend**: React 19, Tailwind CSS
- **Database & Auth**: Supabase (PostgreSQL, Row Level Security, Auth)
- **Ingestion**: Native Node.js stream decompression (`zlib`), SSRF protection engine
- **Testing**: Vitest (33 automated unit and security tests)

---

## Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env.local` and add your Supabase credentials:
```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Optional: Add Google Gemini API Key for model-enhanced synthesis (free tier)
# GEMINI_API_KEY=your-gemini-key
```

### 3. Run Database Migrations
Execute the SQL migrations located in `supabase/migrations/` inside your Supabase SQL Editor:
- `20261101000000_init_schema.sql` (Core tables, RLS policies, triggers)
- `20261102000000_opening_reminders.sql` (Opening reminders & watchlist)

### 4. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 5. Run Test Suite
```bash
npm test
```

### 6. Build for Production
```bash
npm run build
```

---

## License

MIT License. Free-tier compatible deployment.

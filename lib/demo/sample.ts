/**
 * Sample ("demo") application content so new users can see every feature
 * working in one click. Everything here is fictional and labelled as such.
 */

import type { RequirementStatus } from "@/types/database";

export const SAMPLE_TITLE = "MSc Data Science (Sample)";
export const SAMPLE_INSTITUTION = "Northbridge University (fictional)";
export const SAMPLE_SOURCE_NAME = "Northbridge University MSc Data Science prospectus (sample)";
export const SAMPLE_NOTE =
  "This is a sample application with fictional data, created so you can explore AbroadAtlas. Delete it any time.";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** YYYY-MM-DD `days` after `from` (date-only arithmetic, no timezone shifts). */
export function addDaysIso(from: string, days: number): string {
  const [y, m, d] = from.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/** "15 January 2027" */
export function longDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

/** Sample deadline: 45 days from today, so countdowns and "This week" have content. */
export function sampleDates(today: string) {
  return {
    deadline: addDaysIso(today, 45),
    refereeTaskDue: addDaysIso(today, 5),
    statementTaskDue: addDaysIso(today, 14),
  };
}

/**
 * Prospectus text in the same shape the ingestion pipeline produces
 * (page markers and "# headings"), written so fact extraction, Q&A and
 * every blueprint have something real to work with.
 */
export function sampleProspectus(deadline: string): string {
  return `--- Page 1 ---

# MSc Data Science 2027 Entry

This prospectus is sample content for a fictional university, created to demonstrate AbroadAtlas.

The MSc Data Science is a two-year, full-time programme taught in English at the Northbridge campus.

# Key Dates

The application deadline is ${longDate(deadline)}. Applications received after the deadline will not be considered.

Decisions are released within eight weeks of the deadline.

# Entry Requirements

Applicants must hold a bachelor's degree in computer science, mathematics, statistics or a related field with a minimum GPA of 3.0 on a 4.0 scale.

English proficiency: IELTS Academic overall 6.5 with no band below 6.0, or TOEFL iBT 90.

--- Page 2 ---

# Required Documents

You must submit an academic transcript, a curriculum vitae (CV), two letters of recommendation, and a statement of purpose.

Your statement of purpose must not exceed 1,000 words and should explain your research interests and why this programme fits your goals.

Two letters of recommendation must be submitted directly by your referees through the online application portal. At least one referee should be an academic who has taught you.

# Selection Process

Shortlisted applicants are invited to a 20-minute online interview with a faculty panel. The panel assesses motivation, academic preparation and fit with the programme's research areas.

--- Page 3 ---

# Machine Learning and AI Track

The first year covers core modules in statistics, machine learning, data engineering and research methods. In the second year, students choose electives in natural language processing, computer vision or responsible AI, and complete a research thesis supervised by a faculty member.

# Northbridge Excellence Scholarship

The Northbridge Excellence Scholarship offers a full scholarship including a tuition waiver and a monthly stipend of €1,100 for both years of study. All admitted international applicants are considered automatically; no separate application is needed.
`;
}

/** Checklist and tasks seeded alongside the sample, in varied states. */
export const SAMPLE_REQUIREMENTS: { document_type: string; status: RequirementStatus }[] = [
  { document_type: "Academic Transcript", status: "ready" },
  { document_type: "Curriculum Vitae (CV) / Resume", status: "ready" },
  { document_type: "Letters of Recommendation", status: "in_progress" },
  { document_type: "Statement of Purpose / Personal Statement", status: "not_started" },
  { document_type: "English Language Proficiency (IELTS / TOEFL)", status: "not_started" },
];

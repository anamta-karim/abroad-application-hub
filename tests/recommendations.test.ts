import { describe, it, expect } from "vitest";
import {
  addDays,
  letterAdvice,
  letterCountsIn,
  letterEmailDraft,
  letterNudge,
  letterProgress,
  letterProgressText,
  lettersNeededFrom,
  mailtoHref,
  parseDateInput,
  parseRecommenderInput,
} from "@/lib/recommendations";
import { buildWeeklyActions } from "@/lib/weekly";
import { selectReminders } from "@/lib/reminders";
import { coverageFor } from "@/lib/documents/catalog";
import { sampleProspectus } from "@/lib/demo/sample";

const today = "2026-11-15";

describe("How many letters an application asks for", () => {
  it("reads counts from common phrasings", () => {
    expect(letterCountsIn("You must submit two letters of recommendation.")).toEqual([2]);
    expect(letterCountsIn("Provide two (2) academic references.")).toEqual([2]);
    expect(letterCountsIn("Applicants need three referees, one of whom must be an employer.")).toEqual([3]);
    expect(letterCountsIn("Upload 2 recommendation letters by the deadline.")).toEqual([2]);
    expect(letterCountsIn("Two academic or professional references are required.")).toEqual([2]);
    expect(letterCountsIn("Include a letter of recommendation from your supervisor.")).toEqual([1]);
  });

  it("ignores conditions on single letters and unrelated uses", () => {
    expect(letterCountsIn("At least one referee should be an academic who has taught you.")).toEqual([]);
    expect(letterCountsIn("See the references section for a list of sources.")).toEqual([]);
    expect(letterCountsIn("Quote your application reference number in emails.")).toEqual([]);
  });

  it("finds the total in the sample prospectus, with its page", () => {
    const needed = lettersNeededFrom([{ content: sampleProspectus("2027-01-15"), page_number: 1, sourceTitle: "Prospectus" }]);
    expect(needed).toMatchObject({ count: 2, pageNumber: 1, sourceTitle: "Prospectus" });
    expect(needed?.quote).toContain("two letters of recommendation");
  });

  it("prefers a plural total over an earlier singular mention", () => {
    const needed = lettersNeededFrom([
      { content: "Include a letter of recommendation from a manager if you have work experience.", page_number: 1, sourceTitle: "S" },
      { content: "In total, three letters of reference are required.", page_number: 4, sourceTitle: "S" },
    ]);
    expect(needed).toMatchObject({ count: 3, pageNumber: 4 });
    expect(lettersNeededFrom([{ content: "No letters are needed.", page_number: 1, sourceTitle: "S" }])).toBeNull();
  });
});

describe("Referee input", () => {
  it("trims, collapses whitespace and stores blanks as null", () => {
    expect(parseRecommenderInput({ name: "  Prof.   Asha Rao ", role: "", email: " asha@uni.example ", notes: "" })).toEqual({
      value: { name: "Prof. Asha Rao", role: null, email: "asha@uni.example", notes: null },
    });
  });

  it("rejects a missing name, a bad email and overlong fields", () => {
    expect(parseRecommenderInput({ name: "  " }).error).toMatch(/name/);
    expect(parseRecommenderInput({ name: "A", email: "not-an-email" }).error).toMatch(/email/);
    expect(parseRecommenderInput({ name: "A", email: "a@b.c?subject=x" }).error).toMatch(/email/);
    expect(parseRecommenderInput({ name: "x".repeat(121) }).error).toMatch(/too long/);
  });

  it("validates dates", () => {
    expect(parseDateInput("")).toBeNull();
    expect(parseDateInput("2027-01-15")).toBe("2027-01-15");
    expect(parseDateInput("2027-02-30")).toBe("invalid");
    expect(parseDateInput("15/01/2027")).toBe("invalid");
    expect(addDays("2027-01-15", -28)).toBe("2026-12-18");
  });
});

describe("Letter progress", () => {
  it("counts against the number the sources ask for", () => {
    expect(letterProgressText(letterProgress([], 2))).toBe("2 letters needed · no referees added yet");
    expect(letterProgressText(letterProgress([], null))).toBe("No referees added yet");

    const partial = letterProgress([{ status: "submitted" }, { status: "declined" }], 2);
    expect(partial).toMatchObject({ submitted: 1, target: 2, refereesMissing: 1, done: false });
    expect(letterProgressText(partial)).toBe("1 of 2 letters submitted · add 1 more referee");

    const done = letterProgress([{ status: "submitted" }, { status: "submitted" }], 2);
    expect(done.done).toBe(true);
    expect(letterProgressText(done)).toBe("2 of 2 letters submitted");
  });

  it("without a stated number, counts one letter per active referee", () => {
    const p = letterProgress([{ status: "agreed" }, { status: "submitted" }, { status: "declined" }], null);
    expect(p).toMatchObject({ target: 2, refereesMissing: 0 });
    expect(letterProgressText(p)).toBe("1 of 2 letters submitted");
  });
});

describe("What to do next for a letter", () => {
  const deadline = "2027-01-15"; // 61 days away

  it("says when to ask", () => {
    expect(letterAdvice({ status: "to_ask", asked_on: null, due_on: null }, deadline, today)).toEqual({
      tone: "info",
      text: expect.stringContaining("Ask by"),
    });
    expect(letterAdvice({ status: "to_ask", asked_on: null, due_on: "2026-12-01" }, deadline, today)?.tone).toBe("warn");
    expect(letterAdvice({ status: "to_ask", asked_on: null, due_on: "2026-11-10" }, deadline, today)?.tone).toBe("bad");
    expect(letterAdvice({ status: "to_ask", asked_on: null, due_on: null }, null, today)?.text).toContain("Add a due date");
  });

  it("suggests following up and reminding", () => {
    expect(letterAdvice({ status: "asked", asked_on: "2026-11-05", due_on: null }, deadline, today)?.text).toContain(
      "No reply after 10 days"
    );
    expect(letterAdvice({ status: "asked", asked_on: "2026-11-12", due_on: null }, deadline, today)).toBeNull();
    expect(letterAdvice({ status: "agreed", asked_on: "2026-11-01", due_on: "2026-11-18" }, deadline, today)?.text).toBe(
      "Due in 3 days. Send a gentle reminder."
    );
    expect(letterAdvice({ status: "agreed", asked_on: "2026-11-01", due_on: null }, deadline, today)).toBeNull();
    expect(letterAdvice({ status: "submitted", asked_on: "2026-11-01", due_on: null }, deadline, today)).toBeNull();
  });

  it("nudges for the dashboard", () => {
    expect(letterNudge({ status: "agreed", asked_on: null, due_on: "2026-11-20" }, null, today)).toEqual({
      kind: "due",
      days: 5,
      date: "2026-11-20",
    });
    expect(letterNudge({ status: "to_ask", asked_on: null, due_on: null }, "2026-12-05", today)?.kind).toBe("ask");
    expect(letterNudge({ status: "to_ask", asked_on: null, due_on: null }, deadline, today)).toBeNull();
    expect(letterNudge({ status: "asked", asked_on: "2026-11-01", due_on: null }, deadline, today)).toEqual({
      kind: "follow_up",
      days: 14,
      date: "2026-11-01",
    });
    expect(letterNudge({ status: "submitted", asked_on: null, due_on: "2026-11-16" }, null, today)).toBeNull();
  });
});

describe("Email drafts", () => {
  const base = {
    recommenderName: "Prof. Rao",
    applicantName: "Sam",
    appTitle: "MSc Data Science",
    institution: "Northbridge University",
    dueDate: "2027-01-15",
  };

  it("drafts an ask, a follow-up, a reminder and a thank-you", () => {
    const ask = letterEmailDraft({ ...base, status: "to_ask" })!;
    expect(ask.subject).toBe("Request for a recommendation letter: MSc Data Science");
    expect(ask.body).toMatch(/^Dear Prof\. Rao,/);
    expect(ask.body).toContain("MSc Data Science at Northbridge University");
    expect(ask.body).toContain("due by Jan 15");
    expect(ask.body.endsWith("Best regards,\nSam")).toBe(true);

    expect(letterEmailDraft({ ...base, status: "asked" })!.subject).toMatch(/^Following up/);
    expect(letterEmailDraft({ ...base, status: "agreed" })!.body).toContain("gentle reminder");
    expect(letterEmailDraft({ ...base, status: "submitted" })!.subject).toContain("Thank you");
    expect(letterEmailDraft({ ...base, status: "declined" })).toBeNull();
    expect(letterEmailDraft({ ...base, status: "to_ask", applicantName: null, dueDate: null })!.body.endsWith("Best regards,")).toBe(true);
  });

  it("builds an encoded mailto link", () => {
    const href = mailtoHref("asha@uni.example", { subject: "A & B", body: "Line 1\n\nLine 2" });
    expect(href).toBe("mailto:asha@uni.example?subject=A%20%26%20B&body=Line%201%0A%0ALine%202");
  });
});

describe("Letters elsewhere in the app", () => {
  const apps = [
    { id: "a1", title: "MSc Data Science", institution_or_provider: null, deadline: "2026-12-05", status: "preparing", archived_at: null },
    { id: "a2", title: "Withdrawn one", institution_or_provider: null, deadline: "2026-11-17", status: "withdrawn", archived_at: null },
  ];
  const letters = [
    { id: "l1", application_id: "a1", status: "to_ask" as const, asked_on: null, due_on: null, recommender_name: "Prof. Rao" },
    { id: "l2", application_id: "a1", status: "agreed" as const, asked_on: "2026-11-01", due_on: "2026-11-16", recommender_name: "Dr Lee" },
    { id: "l3", application_id: "a1", status: "asked" as const, asked_on: "2026-11-02", due_on: null, recommender_name: "Ms Kim" },
    { id: "l4", application_id: "a2", status: "agreed" as const, asked_on: null, due_on: "2026-11-16", recommender_name: "Skip" },
  ];

  it("adds letters to This week", () => {
    const items = buildWeeklyActions({ apps, requirements: [], tasks: [], reminders: [], letters, today });
    const byKey = Object.fromEntries(items.filter((i) => i.kind === "letter").map((i) => [i.key, i]));
    expect(Object.keys(byKey).sort()).toEqual(["letter-l1", "letter-l2", "letter-l3"]);
    expect(byKey["letter-l1"].title).toBe("Ask Prof. Rao for a letter");
    expect(byKey["letter-l2"].title).toBe("Letter from Dr Lee: due tomorrow");
    expect(byKey["letter-l3"].title).toBe("Follow up with Ms Kim");
    expect(byKey["letter-l2"].href).toBe("/app/applications/a1#letters-heading");
  });

  it("adds letters to email reminders, each sent once", () => {
    const items = selectReminders({ apps, tasks: [], requirements: [], openings: [], letters, today, alreadySent: new Set() });
    expect(items.filter((i) => i.kind === "letter").map((i) => i.key).sort()).toEqual([
      "letter-ask:l1",
      "letter-follow:l3:2026-11-02",
      "letter:l2:1",
    ]);
    const again = selectReminders({
      apps,
      tasks: [],
      requirements: [],
      openings: [],
      letters,
      today,
      alreadySent: new Set(["letter-ask:l1", "letter-follow:l3:2026-11-02", "letter:l2:1"]),
    });
    expect(again.filter((i) => i.kind === "letter")).toEqual([]);
  });

  it("uses tracker progress for the Documents checklist", () => {
    const reqs = [{ document_type: "Letters of Recommendation", status: "in_progress" }];
    const pending = coverageFor(reqs, [], null, today, { submitted: 1, target: 2, text: "1 of 2 letters submitted" });
    expect(pending[0]).toMatchObject({ state: "missing", note: "1 of 2 letters submitted" });
    const done = coverageFor(reqs, [], null, today, { submitted: 2, target: 2, text: "2 of 2 letters submitted" });
    expect(done[0].state).toBe("have");
    expect(coverageFor(reqs, [], null, today)[0].note).toBeUndefined();
  });
});

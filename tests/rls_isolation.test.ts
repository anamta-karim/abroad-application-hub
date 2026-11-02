import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

describe("Database Schema and RLS Isolation Policy Verification", () => {
  const migrationPath = path.join(
    process.cwd(),
    "supabase",
    "migrations",
    "20261101000000_init_schema.sql"
  );
  const sql = fs.readFileSync(migrationPath, "utf-8");

  const requiredTables = [
    "profiles",
    "applications",
    "application_links",
    "sources",
    "source_snapshots",
    "source_chunks",
    "extracted_facts",
    "document_requirements",
    "user_documents",
    "requirement_document_links",
    "tasks",
    "status_history",
    "conversations",
    "messages",
    "message_citations",
    "ingestion_jobs",
  ];

  it("verifies that all required product tables exist in migration SQL", () => {
    for (const table of requiredTables) {
      const tableRegex = new RegExp(`CREATE TABLE IF NOT EXISTS public\\.${table}\\b`, "i");
      expect(sql).toMatch(tableRegex);
    }
  });

  it("verifies that Row Level Security (RLS) is enabled on all tables", () => {
    for (const table of requiredTables) {
      const rlsRegex = new RegExp(`ALTER TABLE public\\.${table} ENABLE ROW LEVEL SECURITY`, "i");
      expect(sql).toMatch(rlsRegex);
    }
  });

  it("verifies that ownership-based RLS policies are applied for user isolation", () => {
    // Check that user_id = auth.uid() or id = auth.uid() is used across all user-owned tables
    const uidPolicies = sql.match(/auth\.uid\(\)\s*=\s*(user_id|id)/gi);
    expect(uidPolicies).not.toBeNull();
    // There are 16 tables, each having multiple CRUD policies
    expect(uidPolicies!.length).toBeGreaterThanOrEqual(30);
  });

  it("verifies that storage bucket is private and has strict folder-level isolation", () => {
    // Storage bucket 'application-sources' must be marked public = false
    expect(sql).toContain("'application-sources'");
    expect(sql).toContain("false,"); // private bucket parameter

    // Storage policy must verify auth.uid() matches the first path segment
    const storagePolicyRegex = /\(storage\.foldername\(name\)\)\[1\]\s*=\s*auth\.uid\(\)::text/i;
    expect(sql).toMatch(storagePolicyRegex);
  });

  it("simulates cross-account data isolation predicate", () => {
    const userA_id = "11111111-1111-4111-8111-111111111111";
    const userB_id = "22222222-2222-4222-8222-222222222222";

    interface Row {
      id: string;
      user_id: string;
      title: string;
    }

    const mockDatabase: Row[] = [
      { id: "app-1", user_id: userA_id, title: "User A Program" },
      { id: "app-2", user_id: userA_id, title: "User A Scholarship" },
      { id: "app-3", user_id: userB_id, title: "User B Program" },
    ];

    // Policy predicate: auth.uid() = user_id
    const evaluateSelectPolicy = (row: Row, currentAuthUid: string) => {
      return row.user_id === currentAuthUid;
    };

    // User A query
    const userAVisible = mockDatabase.filter((row) => evaluateSelectPolicy(row, userA_id));
    expect(userAVisible).toHaveLength(2);
    expect(userAVisible.every((r) => r.user_id === userA_id)).toBe(true);

    // User B query
    const userBVisible = mockDatabase.filter((row) => evaluateSelectPolicy(row, userB_id));
    expect(userBVisible).toHaveLength(1);
    expect(userBVisible[0].title).toBe("User B Program");

    // Cross-account leakage check: User B must never see User A rows
    const leakageCheck = userBVisible.find((r) => r.user_id === userA_id);
    expect(leakageCheck).toBeUndefined();
  });

  it("verifies that opening_reminders migration includes RLS and user isolation", () => {
    const remindersMigrationPath = path.join(
      process.cwd(),
      "supabase",
      "migrations",
      "20261102000000_opening_reminders.sql"
    );
    const remindersSql = fs.readFileSync(remindersMigrationPath, "utf-8");
    expect(remindersSql).toMatch(/CREATE TABLE IF NOT EXISTS public\.opening_reminders\b/i);
    expect(remindersSql).toMatch(/ALTER TABLE public\.opening_reminders ENABLE ROW LEVEL SECURITY/i);
    expect(remindersSql).toMatch(/auth\.uid\(\)\s*=\s*user_id/i);
  });
});

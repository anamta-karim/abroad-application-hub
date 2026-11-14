import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

const read = (...p: string[]) => fs.readFileSync(path.join(process.cwd(), ...p), "utf-8");

describe("Parent ownership hardening", () => {
  const policySql = read("supabase", "migrations", "20261113000000_parent_ownership_policies.sql");

  it("requires owned parent applications on every child table insert", () => {
    const childTables = [
      "sources",
      "source_chunks",
      "extracted_facts",
      "document_requirements",
      "tasks",
      "status_history",
      "conversations",
    ];
    for (const table of childTables) {
      const insertPolicy = new RegExp(
        `ON public\\.${table} FOR INSERT\\s+WITH CHECK \\([\\s\\S]*?owns_application\\(application_id\\)`,
        "i"
      );
      expect(policySql, table).toMatch(insertPolicy);
    }
  });

  it("requires both linked applications to be owned", () => {
    expect(policySql).toMatch(/owns_application\(program_application_id\)/);
    expect(policySql).toMatch(/owns_application\(scholarship_application_id\)/);
  });

  it("adds WITH CHECK to update policies so parent ids cannot be repointed", () => {
    const updatePolicies = policySql.match(/FOR UPDATE\s+USING \(auth\.uid\(\) = user_id\)\s+WITH CHECK/g) || [];
    expect(updatePolicies.length).toBeGreaterThanOrEqual(8);
  });

  it("server actions verify application ownership before inserting child rows", () => {
    const appActions = read("app", "app", "applications", "actions.ts");
    const sourceActions = read("app", "app", "applications", "[id]", "sources", "actions.ts");
    const ragActions = read("app", "app", "applications", "[id]", "rag", "actions.ts");

    expect(appActions.match(/userOwnsApplications\(/g)?.length).toBeGreaterThanOrEqual(3);
    expect(sourceActions.match(/userOwnsApplications\(/g)?.length).toBeGreaterThanOrEqual(2);
    expect(ragActions).toContain("userOwnsApplications(");
  });
});

describe("PDF storage bucket", () => {
  it("uploads to the bucket created by the schema migration, using the policy path layout", () => {
    const schema = read("supabase", "migrations", "20261101000000_init_schema.sql");
    const sourceActions = read("app", "app", "applications", "[id]", "sources", "actions.ts");

    expect(schema).toContain("'application-sources'");
    expect(sourceActions).toContain('SOURCES_BUCKET = "application-sources"');
    expect(sourceActions).not.toMatch(/storage\s*\.from\("sources"\)/);
    expect(sourceActions).toContain("`${user.id}/${applicationId}/${source.id}/${sanitizedName}`");
  });
});

describe("Admissions autofill endpoints", () => {
  it("require a signed-in user", () => {
    const route = read("app", "api", "admissions", "fetch-details", "route.ts");
    expect(route).toContain("auth.getUser()");
    expect(route).toContain("status: 401");

    const appActions = read("app", "app", "applications", "actions.ts");
    const autofill = appActions.slice(appActions.indexOf("fetchAdmissionsDetailsAction"));
    expect(autofill).toContain("auth.getUser()");
  });
});

describe("Opening watchlist", () => {
  it("no longer stores reminders as tagged application rows", () => {
    const appActions = read("app", "app", "applications", "actions.ts");
    expect(appActions).not.toContain("OPENING_REMINDER:");
  });
});

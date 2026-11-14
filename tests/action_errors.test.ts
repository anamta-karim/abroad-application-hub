import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";
import { runAction, extractError, isNextNavigationSignal, NETWORK_ERROR_MESSAGE } from "@/lib/client/runAction";
import { parseFactDate } from "@/lib/ingestion/dates";

describe("runAction", () => {
  it("returns null on success and the message on a returned error", async () => {
    expect(await runAction(async () => ({ success: true }))).toBeNull();
    expect(await runAction(async () => undefined)).toBeNull();
    expect(await runAction(async () => ({ error: "Application not found." }))).toBe("Application not found.");
  });

  it("turns a thrown error (e.g. network drop) into a friendly message", async () => {
    expect(
      await runAction(async () => {
        throw new TypeError("Failed to fetch");
      })
    ).toBe(NETWORK_ERROR_MESSAGE);
  });

  it("re-throws Next.js redirect/notFound signals so navigation still happens", async () => {
    const redirect = Object.assign(new Error("NEXT_REDIRECT"), { digest: "NEXT_REDIRECT;replace;/app;307;" });
    await expect(
      runAction(async () => {
        throw redirect;
      })
    ).rejects.toBe(redirect);
    expect(isNextNavigationSignal({ digest: "NEXT_HTTP_ERROR_FALLBACK;404" })).toBe(true);
    expect(isNextNavigationSignal(new Error("boom"))).toBe(false);
  });

  it("ignores empty error strings", () => {
    expect(extractError({ error: "" })).toBeNull();
    expect(extractError({ error: "x" })).toBe("x");
  });
});

describe("No component ignores a server action's result", () => {
  it("every awaited *Action( call in components goes through runAction or checks the result", () => {
    const dir = path.join(process.cwd(), "components");
    const offenders: string[] = [];
    for (const file of fs.readdirSync(dir)) {
      if (!file.endsWith(".tsx")) continue;
      const lines = fs.readFileSync(path.join(dir, file), "utf-8").split("\n");
      lines.forEach((line, i) => {
        if (/^\s*await \w+Action\(/.test(line)) offenders.push(`${file}:${i + 1}`);
      });
    }
    expect(offenders).toEqual([]);
  });
});

describe("parseFactDate", () => {
  it("reads common written formats without shifting the day", () => {
    expect(parseFactDate("28 November 2026")).toBe("2026-11-28");
    expect(parseFactDate("November 28, 2026")).toBe("2026-11-28");
    expect(parseFactDate("Nov 28 2026")).toBe("2026-11-28");
    expect(parseFactDate("1st March 2027")).toBe("2027-03-01");
    expect(parseFactDate("2026-12-03")).toBe("2026-12-03");
  });

  it("only accepts numeric dates whose order is unambiguous", () => {
    expect(parseFactDate("28/11/2026")).toBe("2026-11-28");
    expect(parseFactDate("11/28/2026")).toBe("2026-11-28");
    expect(parseFactDate("03/04/2026")).toBeNull();
  });

  it("rejects impossible or vague dates", () => {
    expect(parseFactDate("31 February 2027")).toBeNull();
    expect(parseFactDate("mid-January")).toBeNull();
    expect(parseFactDate("Applications close in spring")).toBeNull();
  });
});

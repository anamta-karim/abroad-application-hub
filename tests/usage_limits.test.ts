import { describe, it, expect, afterEach, vi } from "vitest";
import { dailyLimit, consumeUsage, limitReachedMessage } from "@/lib/usage";
import { isAdminEmail } from "@/lib/admin";

function fakeClient(result: { data: unknown; error: { code?: string; message: string } | null }) {
  const rpc = vi.fn().mockResolvedValue(result);
  return { client: { rpc } as unknown as Parameters<typeof consumeUsage>[0], rpc };
}

describe("Daily usage limits", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("uses sensible defaults", () => {
    expect(dailyLimit("ai")).toBe(30);
    expect(dailyLimit("fetch")).toBe(20);
    expect(dailyLimit("feedback")).toBe(20);
  });

  it("reads overrides from the environment and ignores bad values", () => {
    vi.stubEnv("DAILY_AI_LIMIT", "50");
    vi.stubEnv("DAILY_FETCH_LIMIT", "abc");
    vi.stubEnv("DAILY_FEEDBACK_LIMIT", "-3");
    expect(dailyLimit("ai")).toBe(50);
    expect(dailyLimit("fetch")).toBe(20);
    expect(dailyLimit("feedback")).toBe(20);
  });

  it("passes the kind and limit to the database function", async () => {
    const { client, rpc } = fakeClient({ data: true, error: null });
    await expect(consumeUsage(client, "fetch")).resolves.toEqual({ allowed: true, limit: 20 });
    expect(rpc).toHaveBeenCalledWith("consume_usage", { usage_kind: "fetch", daily_limit: 20 });
  });

  it("blocks when the database says the limit is reached", async () => {
    const { client } = fakeClient({ data: false, error: null });
    await expect(consumeUsage(client, "ai")).resolves.toEqual({ allowed: false, limit: 30 });
  });

  it("fails open if the limit check itself is unavailable", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const { client } = fakeClient({ data: null, error: { code: "PGRST202", message: "function not found" } });
    await expect(consumeUsage(client, "ai")).resolves.toEqual({ allowed: true, limit: 30 });
  });

  it("explains each limit in plain words", () => {
    expect(limitReachedMessage("ai", 30)).toContain("30 AI-written answers");
    expect(limitReachedMessage("fetch", 20)).toContain("20 web pages");
    expect(limitReachedMessage("feedback", 20)).toContain("try again tomorrow");
  });
});

describe("Owner allow-list", () => {
  it("matches case-insensitively and ignores spaces", () => {
    expect(isAdminEmail("Owner@Example.com", " owner@example.com , other@example.com")).toBe(true);
    expect(isAdminEmail("someone@example.com", "owner@example.com")).toBe(false);
  });

  it("denies everyone when the list is empty or the email is missing", () => {
    expect(isAdminEmail("owner@example.com", "")).toBe(false);
    expect(isAdminEmail("owner@example.com", undefined)).toBe(false);
    expect(isAdminEmail(null, "owner@example.com")).toBe(false);
  });
});

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { validateEnv, getPublicEnv } from "@/lib/env";

describe("Environment Variable Validation", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("fails validation when NEXT_PUBLIC_SUPABASE_URL is missing", () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
    const result = validateEnv();
    expect(result.isValid).toBe(false);
    expect(result.errors?.NEXT_PUBLIC_SUPABASE_URL).toBeDefined();
  });

  it("fails validation when NEXT_PUBLIC_SUPABASE_ANON_KEY is missing", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const result = validateEnv();
    expect(result.isValid).toBe(false);
    expect(result.errors?.NEXT_PUBLIC_SUPABASE_ANON_KEY).toBeDefined();
  });

  it("succeeds when required Supabase credentials are valid", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://testproject.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy";
    process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";

    const result = validateEnv();
    expect(result.isValid).toBe(true);
    expect(result.env?.NEXT_PUBLIC_SUPABASE_URL).toBe("https://testproject.supabase.co");
  });

  it("correctly identifies unconfigured public state", () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const state = getPublicEnv();
    expect(state.isConfigured).toBe(false);
  });
});

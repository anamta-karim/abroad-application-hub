import { describe, it, expect } from "vitest";

describe("Auth Validation Rules", () => {
  function validatePasswordStrength(password: string): string | null {
    if (password.length < 8) {
      return "Password must be at least 8 characters long.";
    }
    const hasLetter = /[a-zA-Z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    if (!hasLetter || !hasNumber) {
      return "Password must include both letters and numbers.";
    }
    return null;
  }

  it("rejects passwords shorter than 8 characters", () => {
    expect(validatePasswordStrength("Pass1")).toBe(
      "Password must be at least 8 characters long."
    );
  });

  it("rejects passwords without numbers", () => {
    expect(validatePasswordStrength("PasswordOnly")).toBe(
      "Password must include both letters and numbers."
    );
  });

  it("rejects passwords without letters", () => {
    expect(validatePasswordStrength("123456789")).toBe(
      "Password must include both letters and numbers."
    );
  });

  it("accepts strong passwords with letters and numbers", () => {
    expect(validatePasswordStrength("ValidPassword123")).toBeNull();
    expect(validatePasswordStrength("studyAbroad2026")).toBeNull();
  });
});

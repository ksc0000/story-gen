import { describe, expect, it } from "vitest";
import { isEmailAllowedForAdmin, parseAllowedAdminEmails } from "../src/bootstrap-admin";

describe("bootstrap-admin helpers", () => {
  it("parses ADMIN_EMAILS safely", () => {
    expect(parseAllowedAdminEmails(" Owner@example.com, second@example.com , ,THIRD@example.com ")).toEqual([
      "owner@example.com",
      "second@example.com",
      "third@example.com",
    ]);
  });

  it("checks the allowlist case-insensitively", () => {
    const allowedEmails = ["owner@example.com", "second@example.com"];
    expect(isEmailAllowedForAdmin("OWNER@example.com", allowedEmails)).toBe(true);
    expect(isEmailAllowedForAdmin("third@example.com", allowedEmails)).toBe(false);
    expect(isEmailAllowedForAdmin(undefined, allowedEmails)).toBe(false);
  });
});

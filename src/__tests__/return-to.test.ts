import { describe, it, expect, beforeEach } from "vitest";
import {
  validateReturnTo,
  saveReturnTo,
  getAndClearReturnTo,
  getStoredReturnTo,
  clearReturnTo,
} from "@/lib/return-to";

describe("validateReturnTo", () => {
  it("allows valid internal relative paths", () => {
    expect(validateReturnTo("/create/select-child")).toBe("/create/select-child");
    expect(validateReturnTo("/pricing")).toBe("/pricing");
    expect(validateReturnTo("/create/input?mode=fixed_template&tpl=1")).toBe(
      "/create/input?mode=fixed_template&tpl=1"
    );
    expect(validateReturnTo("/onboarding/child/avatar?childId=123#step2")).toBe(
      "/onboarding/child/avatar?childId=123#step2"
    );
  });

  it("returns fallback for null, undefined, or empty values", () => {
    expect(validateReturnTo(null)).toBe("/home");
    expect(validateReturnTo(undefined)).toBe("/home");
    expect(validateReturnTo("")).toBe("/home");
    expect(validateReturnTo("   ")).toBe("/home");
  });

  it("returns custom fallback when specified", () => {
    expect(validateReturnTo(null, "/custom-fallback")).toBe("/custom-fallback");
    expect(validateReturnTo("https://evil.com", "/custom-fallback")).toBe("/custom-fallback");
  });

  it("rejects absolute external URLs", () => {
    expect(validateReturnTo("https://evil.com")).toBe("/home");
    expect(validateReturnTo("http://evil.com/create")).toBe("/home");
    expect(validateReturnTo("https://ehoria.app.evil.com/home")).toBe("/home");
  });

  it("rejects protocol-relative / scheme-relative URLs (//)", () => {
    expect(validateReturnTo("//evil.com")).toBe("/home");
    expect(validateReturnTo("//evil.com/create")).toBe("/home");
    expect(validateReturnTo("///evil.com")).toBe("/home");
  });

  it("rejects backslash evasion paths (/\\)", () => {
    expect(validateReturnTo("/\\evil.com")).toBe("/home");
    expect(validateReturnTo("/\\/evil.com")).toBe("/home");
  });

  it("rejects javascript: URLs", () => {
    expect(validateReturnTo("javascript:alert(1)")).toBe("/home");
    expect(validateReturnTo("/javascript:alert(1)")).toBe("/home");
    expect(validateReturnTo("JAVASCRIPT:alert(1)")).toBe("/home");
  });

  it("rejects data: and vbscript: URLs", () => {
    expect(validateReturnTo("data:text/html,<script>alert(1)</script>")).toBe("/home");
    expect(validateReturnTo("vbscript:msgbox(1)")).toBe("/home");
  });

  it("rejects relative URLs missing a leading slash", () => {
    expect(validateReturnTo("create/select-child")).toBe("/home");
    expect(validateReturnTo("pricing")).toBe("/home");
  });

  it("rejects strings containing control characters or newlines", () => {
    expect(validateReturnTo("/home\n/evil.com")).toBe("/home");
    expect(validateReturnTo("/home\r\n")).toBe("/home");
    expect(validateReturnTo("/home\0")).toBe("/home");
  });
});

describe("sessionStorage returnTo helpers", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it("saves, retrieves, and clears returnTo correctly", () => {
    saveReturnTo("/create/select-child");
    expect(getStoredReturnTo()).toBe("/create/select-child");

    const retrieved = getAndClearReturnTo();
    expect(retrieved).toBe("/create/select-child");

    // After getAndClear, storage should be empty
    expect(getStoredReturnTo()).toBeNull();
    expect(getAndClearReturnTo()).toBeNull();
  });

  it("does not save invalid URLs to sessionStorage", () => {
    saveReturnTo("https://evil.com");
    expect(getStoredReturnTo()).toBeNull();

    saveReturnTo("//evil.com");
    expect(getStoredReturnTo()).toBeNull();
  });

  it("does not save default fallback /home to sessionStorage", () => {
    saveReturnTo("/home");
    expect(getStoredReturnTo()).toBeNull();
  });

  it("clears returnTo when clearReturnTo is called", () => {
    saveReturnTo("/pricing");
    expect(getStoredReturnTo()).toBe("/pricing");
    clearReturnTo();
    expect(getStoredReturnTo()).toBeNull();
  });
});

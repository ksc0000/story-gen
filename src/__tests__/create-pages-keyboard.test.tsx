import { renderHook } from "@testing-library/react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { useVisualViewport } from "@/lib/hooks/use-visual-viewport";

describe("useVisualViewport hook & keyboard control", () => {
  const originalMatchMedia = window.matchMedia;

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
  });

  it("suppresses autoFocus when device is mobile/coarse pointer", () => {
    window.matchMedia = vi.fn().mockImplementation((query) => ({
      matches: query.includes("coarse") || query.includes("max-width: 768px"),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    const { result } = renderHook(() => useVisualViewport());
    expect(result.current.isMobile).toBe(true);
    expect(result.current.shouldAutoFocus).toBe(false);
  });

  it("allows autoFocus on desktop/pointer: fine devices", () => {
    window.matchMedia = vi.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    const { result } = renderHook(() => useVisualViewport());
    expect(result.current.isMobile).toBe(false);
    expect(result.current.shouldAutoFocus).toBe(true);
  });
});

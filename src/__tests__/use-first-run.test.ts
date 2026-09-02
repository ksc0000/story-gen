import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { useFirstRun } from "@/lib/hooks/use-first-run";
import * as useAuthModule from "@/lib/hooks/use-auth";
import * as useUserProfileModule from "@/lib/hooks/use-user-profile";
import * as useBooksModule from "@/lib/hooks/use-books";
import * as useChildrenModule from "@/lib/hooks/use-children";

vi.mock("@/lib/hooks/use-auth");
vi.mock("@/lib/hooks/use-user-profile");
vi.mock("@/lib/hooks/use-books");
vi.mock("@/lib/hooks/use-children");

describe("useFirstRun", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(useAuthModule.useAuth).mockReturnValue({
      user: { uid: "user-1" },
      loading: false,
      error: null,
    } as unknown as ReturnType<typeof useAuthModule.useAuth>);
  });

  it("returns isFirstRun: true when user has 0 books and <= 1 children and not loading or offline", () => {
    vi.mocked(useUserProfileModule.useUserProfile).mockReturnValue({
      profile: null,
      loading: false,
    });
    vi.mocked(useBooksModule.useBooks).mockReturnValue({
      books: [],
      loading: false,
      error: null,
      isOffline: false,
    });
    vi.mocked(useChildrenModule.useChildren).mockReturnValue({
      children: [],
      activeChild: null,
      loading: false,
      error: null,
    });

    const { result } = renderHook(() => useFirstRun());

    expect(result.current.isFirstRun).toBe(true);
    expect(result.current.loading).toBe(false);
    expect(result.current.isOffline).toBe(false);
  });

  it("returns isFirstRun: false when loading is true", () => {
    vi.mocked(useUserProfileModule.useUserProfile).mockReturnValue({
      profile: null,
      loading: false,
    });
    vi.mocked(useBooksModule.useBooks).mockReturnValue({
      books: [],
      loading: true,
      error: null,
      isOffline: false,
    });
    vi.mocked(useChildrenModule.useChildren).mockReturnValue({
      children: [],
      activeChild: null,
      loading: false,
      error: null,
    });

    const { result } = renderHook(() => useFirstRun());

    expect(result.current.isFirstRun).toBe(false);
    expect(result.current.loading).toBe(true);
  });

  it("returns isFirstRun: false when isOffline is true", () => {
    vi.mocked(useUserProfileModule.useUserProfile).mockReturnValue({
      profile: null,
      loading: false,
    });
    vi.mocked(useBooksModule.useBooks).mockReturnValue({
      books: [],
      loading: false,
      error: null,
      isOffline: true,
    });
    vi.mocked(useChildrenModule.useChildren).mockReturnValue({
      children: [],
      activeChild: null,
      loading: false,
      error: null,
    });

    const { result } = renderHook(() => useFirstRun());

    expect(result.current.isFirstRun).toBe(false);
    expect(result.current.isOffline).toBe(true);
  });

  it("returns isFirstRun: false when user has firstBookCreatedAt set", () => {
    vi.mocked(useUserProfileModule.useUserProfile).mockReturnValue({
      profile: { firstBookCreatedAt: 123456789 } as unknown as ReturnType<
        typeof useUserProfileModule.useUserProfile
      >["profile"],
      loading: false,
    });
    vi.mocked(useBooksModule.useBooks).mockReturnValue({
      books: [],
      loading: false,
      error: null,
      isOffline: false,
    });
    vi.mocked(useChildrenModule.useChildren).mockReturnValue({
      children: [],
      activeChild: null,
      loading: false,
      error: null,
    });

    const { result } = renderHook(() => useFirstRun());

    expect(result.current.isFirstRun).toBe(false);
  });
});

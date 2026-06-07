import { renderHook, waitFor, act } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { useAdminClaim } from "@/lib/hooks/use-admin-claim";
import * as useAuthModule from "@/lib/hooks/use-auth";

vi.mock("@/lib/hooks/use-auth");

// Mock console.error to avoid spamming the test output
const originalConsoleError = console.error;
beforeEach(() => {
  console.error = vi.fn();
});
afterEach(() => {
  console.error = originalConsoleError;
});

describe("useAdminClaim", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("should return loading state initially when auth is loading", () => {
    vi.mocked(useAuthModule.useAuth).mockReturnValue({
      user: null,
      loading: true,
      error: null,
    } as any);

    const { result } = renderHook(() => useAdminClaim());

    expect(result.current.checkingAdmin).toBe(true);
    expect(result.current.isAdmin).toBe(false);
    expect(result.current.adminError).toBeNull();
  });

  it("should return false if user is null and not loading", async () => {
    vi.mocked(useAuthModule.useAuth).mockReturnValue({
      user: null,
      loading: false,
      error: null,
    } as any);

    const { result } = renderHook(() => useAdminClaim());

    await waitFor(() => {
      expect(result.current.checkingAdmin).toBe(false);
    });

    expect(result.current.isAdmin).toBe(false);
    expect(result.current.adminError).toBeNull();
  });

  it("should return true if user has admin claim", async () => {
    const mockUser = {
      getIdTokenResult: vi.fn().mockResolvedValue({
        claims: { admin: true },
      }),
    };

    vi.mocked(useAuthModule.useAuth).mockReturnValue({
      user: mockUser,
      loading: false,
      error: null,
    } as any);

    const { result } = renderHook(() => useAdminClaim());

    await waitFor(() => {
      expect(result.current.checkingAdmin).toBe(false);
    });

    expect(mockUser.getIdTokenResult).toHaveBeenCalledTimes(1);
    expect(result.current.isAdmin).toBe(true);
    expect(result.current.adminError).toBeNull();
  });

  it("should return false if user does not have admin claim", async () => {
    const mockUser = {
      getIdTokenResult: vi.fn().mockResolvedValue({
        claims: { admin: false },
      }),
    };

    vi.mocked(useAuthModule.useAuth).mockReturnValue({
      user: mockUser,
      loading: false,
      error: null,
    } as any);

    const { result } = renderHook(() => useAdminClaim());

    await waitFor(() => {
      expect(result.current.checkingAdmin).toBe(false);
    });

    expect(mockUser.getIdTokenResult).toHaveBeenCalledTimes(1);
    expect(result.current.isAdmin).toBe(false);
    expect(result.current.adminError).toBeNull();
  });

  it("should set error if getIdTokenResult throws", async () => {
    const error = new Error("Token error");
    const mockUser = {
      getIdTokenResult: vi.fn().mockRejectedValue(error),
    };

    vi.mocked(useAuthModule.useAuth).mockReturnValue({
      user: mockUser,
      loading: false,
      error: null,
    } as any);

    const { result } = renderHook(() => useAdminClaim());

    await waitFor(() => {
      expect(result.current.checkingAdmin).toBe(false);
    });

    expect(result.current.isAdmin).toBe(false);
    expect(result.current.adminError).toBe("Token error");
  });

  it("should force refresh token when refreshAdminClaim is called", async () => {
    const mockUser = {
      getIdToken: vi.fn().mockResolvedValue("token"),
      getIdTokenResult: vi.fn().mockResolvedValue({
        claims: { admin: true },
      }),
    };

    vi.mocked(useAuthModule.useAuth).mockReturnValue({
      user: mockUser,
      loading: false,
      error: null,
    } as any);

    const { result } = renderHook(() => useAdminClaim());

    await waitFor(() => {
      expect(result.current.checkingAdmin).toBe(false);
    });

    expect(mockUser.getIdToken).not.toHaveBeenCalled();

    await act(async () => {
      await result.current.refreshAdminClaim();
    });

    expect(mockUser.getIdToken).toHaveBeenCalledWith(true);
    expect(mockUser.getIdTokenResult).toHaveBeenCalledTimes(2);
    expect(result.current.isAdmin).toBe(true);
  });
});

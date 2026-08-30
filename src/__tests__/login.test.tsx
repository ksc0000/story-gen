import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import LoginPage from "@/app/(auth)/login/page";
import { useAuth } from "@/lib/hooks/use-auth";
import { ThemeProvider } from "@/components/theme-provider";

vi.mock("@/lib/hooks/use-auth");
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: vi.fn(),
  }),
}));

beforeEach(() => {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
});

function renderWithProviders(ui: React.ReactElement) {
  return render(
    <ThemeProvider>
      {ui}
    </ThemeProvider>
  );
}

describe("LoginPage", () => {
  const mockSignInWithGoogle = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      loading: false,
      signInWithGoogle: mockSignInWithGoogle,
      signOut: vi.fn(),
    });
  });

  it("renders free plan reassurance copy", () => {
    renderWithProviders(<LoginPage />);

    expect(
      screen.getByText("月3冊まで無料・クレジットカード不要")
    ).toBeInTheDocument();
  });

  it("handles signInWithGoogle error (e.g., popup blocked) and shows role=alert with retry button", async () => {
    mockSignInWithGoogle.mockRejectedValueOnce({
      code: "auth/popup-blocked",
      message: "The popup has been closed by the user or blocked by the browser.",
    });

    renderWithProviders(<LoginPage />);

    const loginButton = screen.getByRole("button", { name: /Googleでログイン/i });
    fireEvent.click(loginButton);

    await waitFor(() => {
      const alert = screen.getByRole("alert");
      expect(alert).toBeInTheDocument();
      expect(alert).toHaveTextContent("一時的なエラーが発生しました。少し時間をおいて再度お試しください。");
    });

    const retryButton = screen.getByRole("button", { name: /もう一度試す/i });
    expect(retryButton).toBeInTheDocument();

    mockSignInWithGoogle.mockResolvedValueOnce(undefined);
    fireEvent.click(retryButton);

    await waitFor(() => {
      expect(mockSignInWithGoogle).toHaveBeenCalledTimes(2);
    });
  });

  it("handles network error during Google sign in", async () => {
    mockSignInWithGoogle.mockRejectedValueOnce(new Error("Failed to fetch"));

    renderWithProviders(<LoginPage />);

    const loginButton = screen.getByRole("button", { name: /Googleでログイン/i });
    fireEvent.click(loginButton);

    await waitFor(() => {
      const alert = screen.getByRole("alert");
      expect(alert).toBeInTheDocument();
      expect(alert).toHaveTextContent("通信環境をご確認のうえ、再度お試しください。");
    });
  });
});

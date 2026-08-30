import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import ChildOnboardingPage from "@/app/(app)/onboarding/child/page";

// Mock dependencies
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

vi.mock("@/lib/hooks/use-auth", () => ({
  useAuth: () => ({
    user: { uid: "test-user-id" },
  }),
}));

// #712 のマージで page が useChildren(Firestore) を使うようになったため必要
vi.mock("@/lib/hooks/use-children", () => ({
  useChildren: () => ({ children: [], loading: false, error: null }),
}));

vi.mock("@/lib/hooks/use-avatar-generation-job", () => ({
  useAvatarGenerationJob: () => ({
    startJob: vi.fn(),
  }),
}));

vi.mock("@/lib/firebase", () => ({
  db: {},
  storage: {},
}));

vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: React.ComponentPropsWithoutRef<"div">) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

describe("ChildOnboardingPage - Onboarding Notice", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("renders onboarding notice on first visit when localStorage key is not set", () => {
    render(<ChildOnboardingPage />);

    const notice = screen.getByTestId("onboarding-guide");
    expect(notice).toBeInTheDocument();
    expect(screen.getByText("月3冊まで無料")).toBeInTheDocument();
    expect(screen.getByText("クレカ不要")).toBeInTheDocument();
    expect(screen.getByText("キャラクター生成は任意 (30秒〜1分)")).toBeInTheDocument();
    expect(screen.getByText("絵本完成まで約2〜5分")).toBeInTheDocument();

    expect(localStorage.getItem("ehon_onboarding_guide_seen")).toBe("true");
  });

  it("does not render onboarding notice on subsequent visit when localStorage key is set", () => {
    localStorage.setItem("ehon_onboarding_guide_seen", "true");

    render(<ChildOnboardingPage />);

    expect(screen.queryByTestId("onboarding-guide")).not.toBeInTheDocument();
  });
});

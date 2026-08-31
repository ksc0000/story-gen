import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import GeneratingPage from "@/app/(app)/generating/page";
import type { CompanionWithId } from "@/app/(app)/companions/use-companions-hook";

// Mocks
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
  }),
  useSearchParams: () => ({
    get: (key: string) => (key === "id" ? "test-book-123" : null),
  }),
}));

vi.mock("@/lib/hooks/use-auth", () => ({
  useAuth: () => ({
    user: { uid: "test-user-123" },
    loading: false,
  }),
}));

const mockBook = {
  id: "test-book-123",
  title: "テストのたび",
  status: "generating",
  pageCount: 8,
  selectedStyleName: "水彩風",
  childProfileSnapshot: { displayName: "たろう" },
};

const mockPages = [
  { id: "p1", pageNumber: 1, status: "completed" },
  { id: "p2", pageNumber: 2, status: "generating" },
];

vi.mock("@/lib/hooks/use-generation-progress", () => ({
  useGenerationProgress: () => ({
    book: mockBook,
    pages: mockPages,
    loading: false,
  }),
}));

const mockUseCompanions = vi.fn();
vi.mock("@/app/(app)/companions/use-companions-hook", () => ({
  useCompanions: (...args: unknown[]) => mockUseCompanions(...args),
}));

vi.mock("@/components/generation-progress", () => ({
  GenerationProgress: () => <div data-testid="mock-generation-progress">Progress Component</div>,
}));

vi.mock("@/components/notification-opt-in", () => ({
  NotificationOptIn: () => null,
}));

vi.mock("@/components/floating-particles", () => ({
  FloatingParticles: () => null,
}));

describe("GeneratingPage Companion Cross-Sell", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders cross-sell card when user has 0 companions", () => {
    mockUseCompanions.mockReturnValue({
      companions: [] as CompanionWithId[],
      loading: false,
    });

    render(<GeneratingPage />);

    const card = screen.getByTestId("companion-cross-sell-card");
    expect(card).toBeDefined();
    expect(screen.getByText("待っている間に、なかよしキャラを作ってみませんか？")).toBeDefined();

    const link = card.querySelector("a");
    expect(link).not.toBeNull();
    expect(link?.getAttribute("href")).toContain("/companions/create?returnTo=");
    expect(link?.getAttribute("href")).toContain(encodeURIComponent("/generating?id=test-book-123"));
  });

  it("hides cross-sell card when user already has companions", () => {
    mockUseCompanions.mockReturnValue({
      companions: [
        {
          id: "companion-1",
          name: "ポチ",
          species: "dog",
          personality: ["元気"],
          specialAbility: "走る",
          colorMain: "#FFFFFF",
          bodyType: "標準",
          colorDepth: "普通",
          size: "medium",
          visualDescription: "白い犬",
        },
      ] as CompanionWithId[],
      loading: false,
    });

    render(<GeneratingPage />);

    expect(screen.queryByTestId("companion-cross-sell-card")).toBeNull();
    expect(screen.queryByText("待っている間に、なかよしキャラを作ってみませんか？")).toBeNull();
  });

  it("hides cross-sell card while companions loading", () => {
    mockUseCompanions.mockReturnValue({
      companions: [],
      loading: true,
    });

    render(<GeneratingPage />);

    expect(screen.queryByTestId("companion-cross-sell-card")).toBeNull();
  });
});

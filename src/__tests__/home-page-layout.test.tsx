import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import HomePage from "@/app/(app)/home/page";
import { Timestamp } from "firebase/firestore";
import type { BookDoc } from "@/lib/types";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: vi.fn(),
    push: vi.fn(),
  }),
}));

vi.mock("next/image", () => ({
  default: (props: ComponentPropsWithoutRef<"img"> & { fill?: boolean }) => {
    const { fill, ...imgProps } = props;
    void fill;
    // eslint-disable-next-line @next/next/no-img-element
    return <img {...imgProps} alt={imgProps.alt ?? ""} />;
  },
}));

vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, whileHover: _wh, whileTap: _wt, ...props }: ComponentPropsWithoutRef<"div"> & { whileHover?: unknown; whileTap?: unknown }) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: { children: ReactNode }) => <>{children}</>,
  useMotionValue: () => ({
    get: () => 0,
    set: () => {},
  }),
  useTransform: () => ({
    get: () => 0,
  }),
  useSpring: () => ({
    get: () => 0,
  }),
  useReducedMotion: () => false,
}));

const mockBooksState = {
  books: [] as (BookDoc & { id: string })[],
  loading: false,
  error: null as Error | null,
};

vi.mock("@/lib/hooks/use-auth", () => ({
  useAuth: () => ({ user: { uid: "user-123" } }),
}));

vi.mock("@/lib/hooks/use-books", () => ({
  useBooks: () => mockBooksState,
}));

vi.mock("@/lib/hooks/use-series", () => ({
  useSeries: () => ({ series: [] }),
}));

vi.mock("@/lib/hooks/use-user-profile", () => ({
  useUserProfile: () => ({ profile: { plan: "free", monthlyGenerationCount: 0 } }),
}));

vi.mock("@/lib/hooks/use-children", () => ({
  useChildren: () => ({
    children: [{ id: "child-1", displayName: "たろう" }],
    loading: false,
    activeChild: { id: "child-1", displayName: "たろう" },
  }),
}));

vi.mock("@/lib/hooks/use-admin-claim", () => ({
  useAdminClaim: () => ({ isAdmin: false }),
}));

vi.mock("@/app/(app)/companions/use-companions-hook", () => ({
  useCompanions: () => ({ companions: [], loading: false }),
}));

describe("HomePage Layout Order", () => {
  beforeEach(() => {
    mockBooksState.books = [];
    mockBooksState.loading = false;
    mockBooksState.error = null;

    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
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

  it("renders bookshelf immediately after CTA buttons when books exist (books.length > 0)", () => {
    mockBooksState.books = [
      {
        id: "book-1",
        userId: "user-123",
        title: "たろうの冒険",
        status: "completed",
        progress: 100,
        coverImageUrl: "https://example.com/cover.jpg",
        createdAt: Timestamp.now(),
        theme: "adventure",
        style: "watercolor",
        pageCount: 8,
        input: { childName: "たろう" },
        expiresAt: null,
      },
    ];

    render(<HomePage />);

    const createCta = screen.getByRole("button", { name: "新しい絵本を作る" });
    const bookTitle = screen.getByText("たろうの冒険");
    const companionsHeader = screen.getByText("なかよしキャラ");
    const feedbackHeader = screen.getByText("フィードバックを送る");

    expect(createCta).toBeInTheDocument();
    expect(bookTitle).toBeInTheDocument();
    expect(companionsHeader).toBeInTheDocument();
    expect(feedbackHeader).toBeInTheDocument();

    // Check relative DOM position: CTA < Book Title < Companions Widget < Feedback Widget
    expect(createCta.compareDocumentPosition(bookTitle) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(bookTitle.compareDocumentPosition(companionsHeader) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(companionsHeader.compareDocumentPosition(feedbackHeader) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("renders empty state notice before secondary widgets when no books exist (books.length === 0)", () => {
    mockBooksState.books = [];

    render(<HomePage />);

    const createCta = screen.getByRole("button", { name: "新しい絵本を作る" });
    const emptyNotice = screen.getByText("まだ絵本がありません。最初の一冊を作りましょう！");
    const companionsHeader = screen.getByText("なかよしキャラ");

    expect(createCta).toBeInTheDocument();
    expect(emptyNotice).toBeInTheDocument();
    expect(companionsHeader).toBeInTheDocument();

    // Check relative DOM position: CTA < Empty Notice < Companions Widget
    expect(createCta.compareDocumentPosition(emptyNotice) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(emptyNotice.compareDocumentPosition(companionsHeader) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { RecommendationTaskDraftPanel } from "@/components/admin/RecommendationTaskDraftPanel";
import type { BookDoc, PageDoc } from "@/lib/types";

// --- Mock firebase/firestore ---
const mockAddDoc = vi.fn();
const mockCollection = vi.fn();
const mockServerTimestamp = vi.fn(() => ({ _type: "serverTimestamp" }));

vi.mock("firebase/firestore", () => ({
  collection: (...args: unknown[]) => mockCollection(...args),
  addDoc: (...args: unknown[]) => mockAddDoc(...args),
  serverTimestamp: () => mockServerTimestamp(),
}));

vi.mock("@/lib/firebase", () => ({
  db: { _mock: true },
}));

// --- Test fixtures ---
function makeBook(overrides: Partial<BookDoc> = {}): BookDoc & { id: string } {
  return {
    id: "book-test-1",
    title: "テスト絵本",
    userId: "u1",
    childId: "c1",
    status: "completed",
    theme: "adventure",
    pageCount: 5,
    progress: 100,
    style: "watercolor",
    createdAt: null as unknown as import("firebase/firestore").Timestamp,
    expiresAt: null,
    input: {} as BookDoc["input"],
    overallQualityScore: 2,
    storyQualityScore: 1,
    qualityReviewStatus: "needs_fix",
    ...overrides,
  } as BookDoc & { id: string };
}

function makePage(overrides: Partial<PageDoc> = {}): PageDoc {
  return {
    pageNumber: 1,
    text: "テストテキスト",
    imageUrl: "https://example.com/img.png",
    imagePrompt: "prompt",
    status: "completed",
    ...overrides,
  } as PageDoc;
}

describe("RecommendationTaskDraftPanel", () => {
  const defaultProps = {
    intent: "prepare_story_rewrite" as const,
    book: makeBook(),
    pages: [makePage()],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockAddDoc.mockResolvedValue({ id: "task-new-1" });
    mockCollection.mockReturnValue({ _collectionRef: "qualityTasks" });
  });

  describe("ボタン表示", () => {
    it("adminUid がある場合「タスクとして保存」ボタンが表示される", () => {
      render(<RecommendationTaskDraftPanel {...defaultProps} adminUid="admin-1" />);
      expect(screen.getByText("タスクとして保存")).toBeInTheDocument();
    });

    it("adminUid がない場合「タスクとして保存」ボタンが表示されない", () => {
      render(<RecommendationTaskDraftPanel {...defaultProps} />);
      expect(screen.queryByText("タスクとして保存")).not.toBeInTheDocument();
    });

    it("「タスクをコピー」ボタンは常に表示される", () => {
      render(<RecommendationTaskDraftPanel {...defaultProps} />);
      expect(screen.getByText("タスクをコピー")).toBeInTheDocument();
    });

    it("adminUid があっても「タスクをコピー」ボタンが表示される", () => {
      render(<RecommendationTaskDraftPanel {...defaultProps} adminUid="admin-1" />);
      expect(screen.getByText("タスクをコピー")).toBeInTheDocument();
    });
  });

  describe("保存処理", () => {
    it("保存ボタン押下で addDoc が呼ばれる", async () => {
      render(<RecommendationTaskDraftPanel {...defaultProps} adminUid="admin-1" />);

      fireEvent.click(screen.getByText("タスクとして保存"));

      await waitFor(() => {
        expect(mockAddDoc).toHaveBeenCalledTimes(1);
      });
    });

    it("addDoc に渡される payload の構造が正しい", async () => {
      render(<RecommendationTaskDraftPanel {...defaultProps} adminUid="admin-1" />);

      fireEvent.click(screen.getByText("タスクとして保存"));

      await waitFor(() => {
        expect(mockAddDoc).toHaveBeenCalledTimes(1);
      });

      const [, payload] = mockAddDoc.mock.calls[0];

      // 必須フィールド
      expect(payload.bookId).toBe("book-test-1");
      expect(payload.intent).toBe("prepare_story_rewrite");
      expect(payload.status).toBe("open");
      expect(payload.createdBy).toBe("admin-1");

      // checklist: 全 item が checked: false
      expect(payload.checklist.length).toBeGreaterThan(0);
      for (const item of payload.checklist) {
        expect(item.checked).toBe(false);
      }

      // serverTimestamp が設定されている
      expect(payload.createdAt).toEqual({ _type: "serverTimestamp" });
      expect(payload.updatedAt).toEqual({ _type: "serverTimestamp" });
    });

    it("collection が 'qualityTasks' パスで呼ばれる", async () => {
      render(<RecommendationTaskDraftPanel {...defaultProps} adminUid="admin-1" />);

      fireEvent.click(screen.getByText("タスクとして保存"));

      await waitFor(() => {
        expect(mockCollection).toHaveBeenCalledWith({ _mock: true }, "qualityTasks");
      });
    });

    it("保存成功時に「保存しました」が表示される", async () => {
      render(<RecommendationTaskDraftPanel {...defaultProps} adminUid="admin-1" />);

      fireEvent.click(screen.getByText("タスクとして保存"));

      await waitFor(() => {
        expect(screen.getByText("保存しました")).toBeInTheDocument();
      });
    });

    it("保存失敗時にエラーメッセージが表示される", async () => {
      mockAddDoc.mockRejectedValueOnce(new Error("PERMISSION_DENIED"));

      render(<RecommendationTaskDraftPanel {...defaultProps} adminUid="admin-1" />);

      fireEvent.click(screen.getByText("タスクとして保存"));

      await waitFor(() => {
        expect(screen.getByText("PERMISSION_DENIED")).toBeInTheDocument();
      });
    });

    it("保存失敗時(非Errorオブジェクト)にデフォルトメッセージが表示される", async () => {
      mockAddDoc.mockRejectedValueOnce("unknown error");

      render(<RecommendationTaskDraftPanel {...defaultProps} adminUid="admin-1" />);

      fireEvent.click(screen.getByText("タスクとして保存"));

      await waitFor(() => {
        expect(screen.getByText("保存に失敗しました")).toBeInTheDocument();
      });
    });
  });

  describe("PII 安全性", () => {
    it("payload に child の displayName / nickname が含まれない", async () => {
      const bookWithProfile = makeBook({
        childProfileSnapshot: {
          displayName: "太郎くん",
          nickname: "タロー",
          birthDate: "2020-01-01",
          gender: "boy",
          interests: ["dinosaurs"],
          personality: ["gentle"],
          visualProfile: { hairColor: "black", skinTone: "light" },
        },
      } as unknown as Partial<BookDoc>);

      render(
        <RecommendationTaskDraftPanel
          intent="review_personalization_inputs"
          book={bookWithProfile}
          pages={[makePage()]}
          adminUid="admin-1"
        />
      );

      fireEvent.click(screen.getByText("タスクとして保存"));

      await waitFor(() => {
        expect(mockAddDoc).toHaveBeenCalledTimes(1);
      });

      const [, payload] = mockAddDoc.mock.calls[0];
      const payloadStr = JSON.stringify(payload);

      // PII: 実際の名前・ニックネームが含まれないこと
      expect(payloadStr).not.toContain("太郎くん");
      expect(payloadStr).not.toContain("タロー");
      // childProfileSnapshot の「値」が丸ごと保存されていないこと
      expect(payloadStr).not.toContain("2020-01-01");
      expect(payloadStr).not.toContain("dinosaurs");
    });
  });

  describe("confirm_approval", () => {
    it("intent が confirm_approval の場合は null を返す（何もレンダリングしない）", () => {
      const { container } = render(
        <RecommendationTaskDraftPanel
          intent="confirm_approval"
          book={makeBook()}
          pages={[makePage()]}
          adminUid="admin-1"
        />
      );
      expect(container.innerHTML).toBe("");
    });
  });
});

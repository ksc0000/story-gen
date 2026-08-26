import { describe, it, expect } from "vitest";
import { getUserFriendlyError, getUserFriendlyErrorMessage } from "../lib/user-error-mapping";

describe("getUserFriendlyError & getUserFriendlyErrorMessage", () => {
  it("hides internal replicate/gemini/firestore technical details and returns refined Japanese message", () => {
    const errorWithReplicate = new Error("Prediction failed: Replicate API rate limit exceeded");
    const result = getUserFriendlyError(errorWithReplicate);
    expect(result.message).not.toContain("Replicate");
    expect(result.message).not.toContain("Prediction");
    expect(result.message).toBe("一時的なエラーが発生しました。少し時間をおいて再度お試しください。");
    expect(result.suggestedAction).toBe("retry");
  });

  it("handles network errors and recommends retry action", () => {
    const result = getUserFriendlyError(new Error("Failed to fetch"));
    expect(result.message).toBe("通信環境をご確認のうえ、再度お試しください。");
    expect(result.suggestedAction).toBe("retry");
  });

  it("handles quota / resource exhausted errors and recommends pricing page action", () => {
    const result = getUserFriendlyError({ code: "resource-exhausted", message: "Quota exceeded for user" });
    expect(result.message).toBe("今月の作成上限に達しました。プランをご確認ください。");
    expect(result.suggestedAction).toBe("go_pricing");
  });

  it("handles permission-denied errors and recommends returning home", () => {
    const result = getUserFriendlyError({ code: "permission-denied", message: "Missing permissions" });
    expect(result.message).toBe("操作に必要な権限が確認できませんでした。お手数ですが本棚へお戻りください。");
    expect(result.suggestedAction).toBe("go_home");
  });

  it("preserves valid user-facing Japanese error messages", () => {
    const userMessage = "入力されたタイトルの文字数が長すぎます。";
    const result = getUserFriendlyError(new Error(userMessage));
    expect(result.message).toBe(userMessage);
    expect(result.suggestedAction).toBe("check_input");
  });

  it("returns fallback message for empty or undefined error", () => {
    const message = getUserFriendlyErrorMessage(null, "データの取得に失敗しました。");
    expect(message).toBe("データの取得に失敗しました。");
  });
});

import { describe, it, expect } from "vitest";
import { isQuotaExceededFailure } from "@/lib/generation-failure";

describe("isQuotaExceededFailure", () => {
  it("failureReason=quota_exceeded はクォータ超過", () => {
    expect(isQuotaExceededFailure({ failureStage: "validation", failureProvider: "system", failureReason: "quota_exceeded" })).toBe(true);
  });
  it("同じ validation/system でもレート制限・想定外エラーはクォータ扱いにしない（回帰）", () => {
    expect(isQuotaExceededFailure({ failureStage: "validation", failureProvider: "system", failureReason: "rate_limited", errorMessage: "リクエストが多すぎます" })).toBe(false);
    expect(isQuotaExceededFailure({ failureStage: "validation", failureProvider: "system", failureReason: "unknown", errorMessage: "絵本の生成中に問題が発生しました。" })).toBe(false);
  });
  it("古い絵本（failureReason 無し）は文言で判定", () => {
    expect(isQuotaExceededFailure({ errorMessage: "今月の無料生成回数に達しました。来月またお試しください。" })).toBe(true);
    expect(isQuotaExceededFailure({ errorMessage: "入力内容を確認してください" })).toBe(false);
  });
});

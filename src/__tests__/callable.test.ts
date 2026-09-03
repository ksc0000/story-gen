import { describe, it, expect, vi } from "vitest";

const mockHttpsCallable = vi.fn<(...args: unknown[]) => unknown>(() => vi.fn());
vi.mock("firebase/functions", () => ({
  httpsCallable: (...args: unknown[]) => mockHttpsCallable(...args),
}));

import { httpsCallable } from "@/lib/callable";

describe("callable wrapper", () => {
  it("常に limitedUseAppCheckTokens を付けて呼ぶ（consumeAppCheckToken と対）", () => {
    const fns = {} as never;
    httpsCallable(fns, "regenerateCoverImage");
    expect(mockHttpsCallable).toHaveBeenCalledWith(fns, "regenerateCoverImage", { limitedUseAppCheckTokens: true });
  });
  it("呼び出し側のオプション（timeout 等）は保持する", () => {
    const fns = {} as never;
    httpsCallable(fns, "generateBookPdf", { timeout: 120000 });
    expect(mockHttpsCallable).toHaveBeenLastCalledWith(fns, "generateBookPdf", {
      limitedUseAppCheckTokens: true,
      timeout: 120000,
    });
  });
});

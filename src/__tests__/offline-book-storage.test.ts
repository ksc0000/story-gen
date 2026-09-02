import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  computeBookVersionToken,
  isOfflineBookOutdated,
  downloadBookForOffline,
  getOfflineBook,
  removeOfflineBook,
  getOfflineBookIds,
  getAllOfflineBooks,
  OFFLINE_DATA_CACHE,
  OFFLINE_IMAGE_CACHE,
} from "@/lib/offline-book-storage";
import type { BookDoc, PageDoc } from "@/lib/types";

// Mock ServiceWorker & CacheStorage API in node environment for testing
const mockCachesMap = new Map<string, ReturnType<typeof createMockCache>>();

function createMockCache() {
  const store = new Map<string, Response>();
  return {
    put: vi.fn(async (key: string | Request, response: Response) => {
      const url = typeof key === "string" ? key : key.url;
      store.set(url, response.clone());
    }),
    match: vi.fn(async (key: string | Request) => {
      const url = typeof key === "string" ? key : key.url;
      const res = store.get(url);
      return res ? res.clone() : undefined;
    }),
    delete: vi.fn(async (key: string | Request) => {
      const url = typeof key === "string" ? key : key.url;
      return store.delete(url);
    }),
  };
}

describe("offline-book-storage", () => {
  const sampleBook: BookDoc & { id: string } = {
    id: "book-123",
    userId: "user-1",
    title: "テストの絵本",
    theme: "bedtime",
    style: "soft_watercolor",
    pageCount: 4,
    status: "completed",
    progress: 100,
    coverImageUrl: "https://example.com/cover.webp",
    input: { childName: "たろう" },
    createdAt: {} as unknown as BookDoc["createdAt"],
    expiresAt: null,
    updatedAtMs: 1700000000000,
  };

  const samplePages: (PageDoc & { id: string })[] = [
    {
      id: "page-0",
      pageNumber: 0,
      text: "たろうの ぼうけんが はじまるよ。",
      imageUrl: "https://example.com/page0.webp",
      imagePrompt: "prompt 0",
      status: "completed",
    },
    {
      id: "page-1",
      pageNumber: 1,
      text: "もりで くまと であいました。",
      imageUrl: "https://example.com/page1.webp",
      imagePrompt: "prompt 1",
      status: "completed",
    },
  ];

  beforeEach(() => {
    vi.restoreAllMocks();
    mockCachesMap.clear();

    const dataCache = createMockCache();
    const imageCache = createMockCache();
    mockCachesMap.set(OFFLINE_DATA_CACHE, dataCache);
    mockCachesMap.set(OFFLINE_IMAGE_CACHE, imageCache);

    global.caches = {
      open: vi.fn(async (name: string) => {
        if (!mockCachesMap.has(name)) {
          mockCachesMap.set(name, createMockCache());
        }
        return mockCachesMap.get(name) as unknown as Cache;
      }),
      match: vi.fn(),
      delete: vi.fn(),
      has: vi.fn(),
      keys: vi.fn(),
    } as unknown as CacheStorage;

    global.navigator = {
      ...global.navigator,
      serviceWorker: {
        register: vi.fn(async () => ({ ready: Promise.resolve() })),
        ready: Promise.resolve(),
      } as unknown as ServiceWorkerContainer,
    };

    global.fetch = vi.fn(async () => {
      return new Response("dummy image content", { status: 200 });
    }) as unknown as typeof fetch;
  });

  describe("computeBookVersionToken & isOfflineBookOutdated", () => {
    it("computes deterministic version token", () => {
      const token1 = computeBookVersionToken(sampleBook, samplePages);
      const token2 = computeBookVersionToken(sampleBook, samplePages);
      expect(token1).toBe(token2);
    });

    it("detects when online book or page text has changed", () => {
      const token = computeBookVersionToken(sampleBook, samplePages);
      const offlineRecord = {
        book: sampleBook,
        pages: samplePages,
        versionToken: token,
        cachedAtMs: Date.now(),
      };

      expect(isOfflineBookOutdated(sampleBook, samplePages, offlineRecord)).toBe(false);

      const modifiedPages = [
        { ...samplePages[0], text: "文章が更新されたよ。" },
        samplePages[1],
      ];
      expect(isOfflineBookOutdated(sampleBook, modifiedPages, offlineRecord)).toBe(true);

      const modifiedBook = { ...sampleBook, updatedAtMs: 1700000000999 };
      expect(isOfflineBookOutdated(modifiedBook, samplePages, offlineRecord)).toBe(true);
    });
  });

  describe("downloadBookForOffline and retrieval", () => {
    it("saves book data and images into Cache Storage", async () => {
      const progressFn = vi.fn();
      const record = await downloadBookForOffline(sampleBook, samplePages, progressFn);

      expect(record.book.id).toBe("book-123");
      expect(record.pages.length).toBe(2);
      expect(progressFn).toHaveBeenCalled();

      const cached = await getOfflineBook("book-123");
      expect(cached).not.toBeNull();
      expect(cached?.book.title).toBe("テストの絵本");

      const ids = await getOfflineBookIds();
      expect(ids).toContain("book-123");

      const all = await getAllOfflineBooks();
      expect(all.length).toBe(1);
    });

    it("removes offline book cleanly", async () => {
      await downloadBookForOffline(sampleBook, samplePages);
      expect(await getOfflineBook("book-123")).not.toBeNull();

      await removeOfflineBook("book-123");
      expect(await getOfflineBook("book-123")).toBeNull();
      expect(await getOfflineBookIds()).not.toContain("book-123");
    });
  });

  it("画像が1枚でも取得できなければ throw し、取得済み画像もキャッシュから消す（部分保存を完了扱いにしない・回帰）", async () => {
    const imageCache = mockCachesMap.get(OFFLINE_IMAGE_CACHE)!;
    global.fetch = vi.fn(async (input: RequestInfo | URL) => {
      // p1 だけは cors / no-cors どちらでも取得できない
      return String(input).endsWith("/p1.png") ? new Response("", { status: 403 }) : new Response("img", { status: 200 });
    }) as unknown as typeof fetch;
    const pages = [
      { pageNumber: 0, text: "a", imageUrl: "https://firebasestorage.googleapis.com/p0.png", imagePrompt: "x", status: "completed" },
      { pageNumber: 1, text: "b", imageUrl: "https://firebasestorage.googleapis.com/p1.png", imagePrompt: "x", status: "completed" },
    ] as unknown as (PageDoc & { id: string })[];
    await expect(downloadBookForOffline(sampleBook, pages)).rejects.toThrow(/取得に失敗/);
    // 成功した分も削除されている
    expect(imageCache.delete).toHaveBeenCalled();
  });

  // no-cors の opaque レスポンス（jsdom は type を "default" 固定にするため上書き）
  const opaqueResponse = () => {
    const r = new Response("", { status: 200 });
    Object.defineProperty(r, "type", { value: "opaque" });
    Object.defineProperty(r, "ok", { value: false });
    Object.defineProperty(r, "status", { value: 0 });
    return r;
  };

  it("CORS失敗がSW経由で404レスポンスになっても no-cors に切り替えて opaque を保存する（本番回帰）", async () => {
    const imageCache = mockCachesMap.get(OFFLINE_IMAGE_CACHE)!;
    const calls: Array<{ url: string; mode?: RequestMode }> = [];
    global.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      calls.push({ url, mode: init?.mode });
      if (init?.mode === "cors") {
        // firebase-messaging-sw.js が CORS 失敗を変換していた形
        return new Response("", { status: 404, statusText: "Offline Image Not Found" });
      }
      return opaqueResponse();
    }) as unknown as typeof fetch;
    const pages = [
      { pageNumber: 0, text: "a", imageUrl: "https://firebasestorage.googleapis.com/p0.png", imagePrompt: "x", status: "completed" },
    ] as unknown as (PageDoc & { id: string })[];
    await expect(downloadBookForOffline(sampleBook, pages)).resolves.toBeDefined();
    expect(calls.filter((c) => c.mode === "no-cors").length).toBeGreaterThan(0);
    expect(imageCache.put).toHaveBeenCalled();
  });

  it("CORS が例外で失敗した場合も no-cors にフォールバックする", async () => {
    const imageCache = mockCachesMap.get(OFFLINE_IMAGE_CACHE)!;
    global.fetch = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.mode === "cors") throw new TypeError("Failed to fetch");
      return opaqueResponse();
    }) as unknown as typeof fetch;
    await expect(downloadBookForOffline(sampleBook, [])).resolves.toBeDefined();
    expect(imageCache.put).toHaveBeenCalled();
  });
});

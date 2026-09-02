"use client";

import type { BookDoc, PageDoc } from "@/lib/types";

export const OFFLINE_DATA_CACHE = "ehoria-offline-data-v1";
export const OFFLINE_IMAGE_CACHE = "ehoria-offline-images-v1";
export const OFFLINE_INDEX_KEY = "/offline-books/index.json";

export interface OfflineBookData {
  book: BookDoc & { id: string };
  pages: (PageDoc & { id: string })[];
  versionToken: string;
  cachedAtMs: number;
}

/**
 * Computes a deterministic version token for a book and its pages
 * to detect when re-generation or text edits have occurred.
 */
export function computeBookVersionToken(
  book: BookDoc & { id: string },
  pages: (PageDoc & { id: string })[]
): string {
  const sortedPages = [...pages].sort((a, b) => a.pageNumber - b.pageNumber);
  const pageTokens = sortedPages
    .map(
      (p) =>
        `${p.pageNumber}:${p.status}:${p.imageUrl ?? ""}:${p.text ?? ""}:${p.lastRegeneratedAtMs ?? 0}`
    )
    .join("|");
  const bookToken = `${book.id}:${book.updatedAtMs ?? 0}:${book.status}:${book.coverImageUrl ?? ""}:${book.title ?? ""}:${book.titleSpreadText ?? ""}:${book.openingNarration ?? ""}`;
  return `${bookToken}#${pageTokens}`;
}

export function isOfflineSupported(): boolean {
  return typeof window !== "undefined" && "caches" in window && "serviceWorker" in navigator;
}

export function buildSwUrl(): string {
  const params = new URLSearchParams({
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "",
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "",
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "",
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "",
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "",
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? "",
  });
  return `/firebase-messaging-sw.js?${params.toString()}`;
}

/**
 * Ensures the Service Worker is registered for PWA offline caching & push notifications.
 */
export async function ensureServiceWorkerRegistered(): Promise<ServiceWorkerRegistration | null> {
  if (!isOfflineSupported()) return null;
  try {
    const swUrl = buildSwUrl();
    const reg = await navigator.serviceWorker.register(swUrl, { scope: "/" });
    await navigator.serviceWorker.ready;
    return reg;
  } catch (err) {
    console.error("Failed to register Service Worker for offline storage:", err);
    return null;
  }
}

function getBookDataUrl(bookId: string): string {
  return `/offline-books/${bookId}.json`;
}

/**
 * Downloads a book and its pages for offline reading.
 * Caching includes:
 * 1. Book metadata JSON in OFFLINE_DATA_CACHE.
 * 2. Cover image and all page images in OFFLINE_IMAGE_CACHE.
 */
export async function downloadBookForOffline(
  book: BookDoc & { id: string },
  pages: (PageDoc & { id: string })[],
  onProgress?: (progress: number, message: string) => void
): Promise<OfflineBookData> {
  if (!isOfflineSupported()) {
    throw new Error("このブラウザはオフライン保存に対応していません。");
  }

  await ensureServiceWorkerRegistered();

  const dataCache = await caches.open(OFFLINE_DATA_CACHE);
  const imageCache = await caches.open(OFFLINE_IMAGE_CACHE);

  const versionToken = computeBookVersionToken(book, pages);
  const record: OfflineBookData = {
    book,
    pages,
    versionToken,
    cachedAtMs: Date.now(),
  };

  // Collect image URLs to cache
  const imageUrls: string[] = [];
  if (book.coverImageUrl) {
    imageUrls.push(book.coverImageUrl);
  }
  for (const page of pages) {
    if (page.imageUrl) {
      imageUrls.push(page.imageUrl);
    }
  }

  const total = imageUrls.length + 1; // images + 1 metadata
  let completed = 0;

  const updateProg = (msg: string) => {
    completed++;
    if (onProgress) {
      onProgress(Math.min(100, Math.round((completed / total) * 100)), msg);
    }
  };

  // 画像を並列（最大4本）で取得してキャッシュする。
  // 1枚でも取得できなければ「保存完了」とは見なさない: 部分保存を成功扱いにすると、
  // オフライン時に壊れた画像が表示されるのにユーザーには原因が分からないため。
  const failedUrls: string[] = [];
  const CONCURRENCY = 4;
  let cursor = 0;
  const worker = async () => {
    while (cursor < imageUrls.length) {
      const url = imageUrls[cursor++];
      try {
        const response = await fetch(url, { mode: "cors" }).catch(() => fetch(url, { mode: "no-cors" }));
        if (response && (response.ok || response.type === "opaque")) {
          await imageCache.put(url, response);
        } else {
          failedUrls.push(url);
        }
      } catch (err) {
        console.warn(`Failed to cache image for offline: ${url}`, err);
        failedUrls.push(url);
      }
      updateProg("画像を取得中...");
    }
  };
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, imageUrls.length) }, worker));

  if (failedUrls.length > 0) {
    // 取得できた分も残さない（中途半端なキャッシュを残すと容量だけ消費する）
    await Promise.all(imageUrls.filter((u) => !failedUrls.includes(u)).map((u) => imageCache.delete(u)));
    throw new Error(
      `画像${failedUrls.length}枚の取得に失敗したため、オフライン保存を中止しました。通信状態を確認してもう一度お試しください。`
    );
  }

  // Save book record JSON
  const dataResponse = new Response(JSON.stringify(record), {
    headers: { "Content-Type": "application/json" },
  });
  await dataCache.put(getBookDataUrl(book.id), dataResponse);

  // Update offline index list
  await updateOfflineIndex(book.id, "add");
  updateProg("完了");

  return record;
}

/**
 * Removes a downloaded book from offline storage.
 */
export async function removeOfflineBook(bookId: string): Promise<void> {
  if (!isOfflineSupported()) return;

  const record = await getOfflineBook(bookId);
  if (record) {
    const imageCache = await caches.open(OFFLINE_IMAGE_CACHE);
    if (record.book.coverImageUrl) {
      await imageCache.delete(record.book.coverImageUrl);
    }
    for (const page of record.pages) {
      if (page.imageUrl) {
        await imageCache.delete(page.imageUrl);
      }
    }
  }

  const dataCache = await caches.open(OFFLINE_DATA_CACHE);
  await dataCache.delete(getBookDataUrl(bookId));
  await updateOfflineIndex(bookId, "remove");
}

/**
 * Retrieves a single downloaded book record.
 */
export async function getOfflineBook(bookId: string): Promise<OfflineBookData | null> {
  if (!isOfflineSupported()) return null;
  try {
    const dataCache = await caches.open(OFFLINE_DATA_CACHE);
    const response = await dataCache.match(getBookDataUrl(bookId));
    if (!response) return null;
    const data = (await response.json()) as OfflineBookData;
    return data;
  } catch (err) {
    console.error("Failed to read offline book record:", err);
    return null;
  }
}

/**
 * Retrieves all offline book IDs.
 */
export async function getOfflineBookIds(): Promise<string[]> {
  if (!isOfflineSupported()) return [];
  try {
    const dataCache = await caches.open(OFFLINE_DATA_CACHE);
    const response = await dataCache.match(OFFLINE_INDEX_KEY);
    if (!response) return [];
    return (await response.json()) as string[];
  } catch {
    return [];
  }
}

/**
 * Retrieves all offline book records.
 */
export async function getAllOfflineBooks(): Promise<OfflineBookData[]> {
  const ids = await getOfflineBookIds();
  const results: OfflineBookData[] = [];
  for (const id of ids) {
    const bookData = await getOfflineBook(id);
    if (bookData) {
      results.push(bookData);
    }
  }
  return results;
}

/**
 * Checks if a downloaded offline book is outdated compared to online data.
 */
export function isOfflineBookOutdated(
  book: BookDoc & { id: string },
  pages: (PageDoc & { id: string })[],
  offlineRecord: OfflineBookData | null
): boolean {
  if (!offlineRecord) return false;
  const currentToken = computeBookVersionToken(book, pages);
  return currentToken !== offlineRecord.versionToken;
}

async function updateOfflineIndex(bookId: string, action: "add" | "remove"): Promise<void> {
  const dataCache = await caches.open(OFFLINE_DATA_CACHE);
  let ids = await getOfflineBookIds();
  if (action === "add") {
    if (!ids.includes(bookId)) {
      ids.push(bookId);
    }
  } else {
    ids = ids.filter((id) => id !== bookId);
  }
  const indexResponse = new Response(JSON.stringify(ids), {
    headers: { "Content-Type": "application/json" },
  });
  await dataCache.put(OFFLINE_INDEX_KEY, indexResponse);
}

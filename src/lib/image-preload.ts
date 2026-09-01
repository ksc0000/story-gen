import type { ReadingItem } from "@/components/book-viewer";

/** Cache of preloaded image URLs to avoid redundant network requests. */
const preloadedUrls = new Set<string>();

/**
 * Preloads an image using `new Image()` with `decoding="async"`.
 * Returns a Promise that resolves to `true` if loaded successfully, `false` otherwise.
 */
export function preloadImage(url: string | undefined | null): Promise<boolean> {
  if (!url || typeof window === "undefined") {
    return Promise.resolve(false);
  }

  if (preloadedUrls.has(url)) {
    return Promise.resolve(true);
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.decoding = "async";

    const cleanup = () => {
      img.onload = null;
      img.onerror = null;
    };

    img.onload = () => {
      preloadedUrls.add(url);
      cleanup();
      resolve(true);
    };

    img.onerror = () => {
      cleanup();
      resolve(false);
    };

    img.src = url;
  });
}

/**
 * Extracts the image URL from a `ReadingItem`.
 */
export function getReadingItemImageUrl(item: ReadingItem | undefined | null): string | null {
  if (!item) return null;
  if (item.kind === "cover_title_spread") {
    return item.imageUrl || null;
  }
  return item.page.imageUrl || null;
}

/**
 * Preloads the next reading item's image URL (`currentIndex + 1`).
 */
export function preloadNextReadingItemImage(
  items: ReadingItem[],
  currentIndex: number
): Promise<boolean> {
  const nextItem = items[currentIndex + 1];
  const nextUrl = getReadingItemImageUrl(nextItem);
  if (nextUrl) {
    return preloadImage(nextUrl);
  }
  return Promise.resolve(false);
}

/**
 * Clears the preloaded URL cache (useful for testing).
 */
export function clearPreloadCache(): void {
  preloadedUrls.clear();
}

import type { BookDoc, PageDoc, ImageModelProfile } from "./types";

type BookWithId = BookDoc & { id: string };
type PageWithId = PageDoc & { id: string };

/* ------------------------------------------------------------------ */
/*  Cost constants (Estimated USD per image)                          */
/* ------------------------------------------------------------------ */

/**
 * Estimated cost per image generation in USD.
 * Based on docs/T6_NONFIXED_STYLE_VALIDATION_PLAN.md and provider pricing.
 */
export const ESTIMATED_COST_PER_IMAGE: Record<string, number> = {
  // Replicate / Black Forest Labs
  "black-forest-labs/flux-2-pro": 0.05,
  "black-forest-labs/flux-2-klein-9b": 0.025,
  "black-forest-labs/flux-2-klein-9b-base": 0.025,
  "black-forest-labs/flux-kontext-pro": 0.05,
  "black-forest-labs/flux-kontext-max": 0.05,
  "black-forest-labs/flux-1.1-pro": 0.04,
  "black-forest-labs/flux-schnell": 0.003, // Low cost for schnell

  // OpenAI
  "openai/gpt-image-1-mini": 0.011,
  "openai/gpt-image-1": 0.042,
  "openai/gpt-4o": 0.042, // Estimate for Responses API image tool
  "dall-e-3": 0.04, // Standard DALL-E 3 rate
};

/**
 * Fallback costs based on profile if imageModel field is missing.
 */
export const PROFILE_ESTIMATED_COST: Record<ImageModelProfile, number> = {
  klein_fast: 0.025,
  klein_base: 0.025,
  pro_consistent: 0.05,
  kontext_reference: 0.05,
  kontext_max: 0.05,
  openai_mini: 0.011,
  openai_standard: 0.042,
};

// Handle candidate profiles that might be in data but not in main union yet
const CANDIDATE_PROFILE_COSTS: Record<string, number> = {
  "flux11_pro_candidate": 0.04,
  "openai_image_candidate": 0.042,
};

export function getEstimatedImageCost(page: PageDoc): number {
  // 1. Try exact model match
  if (page.imageModel && ESTIMATED_COST_PER_IMAGE[page.imageModel]) {
    return ESTIMATED_COST_PER_IMAGE[page.imageModel];
  }

  // 2. Try replicateModel match
  if (page.replicateModel && ESTIMATED_COST_PER_IMAGE[page.replicateModel]) {
    return ESTIMATED_COST_PER_IMAGE[page.replicateModel];
  }

  // 3. Try profile match
  if (page.imageModelProfile) {
    const cost = PROFILE_ESTIMATED_COST[page.imageModelProfile] || CANDIDATE_PROFILE_COSTS[page.imageModelProfile];
    if (cost !== undefined) return cost;
  }

  // 4. Default fallback based on quality tier
  if (page.imageQualityTier === "premium") return 0.05;
  if (page.imageQualityTier === "standard") return 0.025;
  return 0.025; // Default for light/free
}

export function getProviderId(page: PageDoc): string {
  if (page.imageModel?.startsWith("openai") || page.imageModelProfile?.startsWith("openai")) {
    return "openai";
  }
  if (page.replicateModel || page.imageModel?.startsWith("black-forest-labs")) {
    return "replicate";
  }
  // Guess based on profile if needed
  if (page.imageModelProfile === "openai_image_candidate") return "openai";
  return "replicate"; // Default provider
}

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface ModelCostStats {
  costUsd: number;
  imageCount: number;
}

export interface ProviderCostStats {
  costUsd: number;
  imageCount: number;
  models: Record<string, ModelCostStats>;
}

export interface ProviderCostMetrics {
  totalCostUsd: number;
  totalImages: number;
  totalBooks: number;
  avgCostPerBook: number;
  providers: Record<string, ProviderCostStats>;
}

/* ------------------------------------------------------------------ */
/*  Aggregation                                                        */
/* ------------------------------------------------------------------ */

export function computeProviderCostMetrics(
  books: BookWithId[],
  pagesMap: Map<string, PageWithId[]>
): ProviderCostMetrics {
  let totalCostUsd = 0;
  let totalImages = 0;
  const providers: Record<string, ProviderCostStats> = {};

  const terminalBooks = books.filter(
    (b) => b.status === "completed" || b.status === "partial_completed" || b.status === "failed"
  );

  for (const book of terminalBooks) {
    const bookPages = pagesMap.get(book.id) || [];
    for (const page of bookPages) {
      const cost = getEstimatedImageCost(page);
      const provider = getProviderId(page);
      const model = page.imageModel || page.replicateModel || page.imageModelProfile || "unknown";

      totalCostUsd += cost;
      totalImages += 1;

      if (!providers[provider]) {
        providers[provider] = { costUsd: 0, imageCount: 0, models: {} };
      }
      providers[provider].costUsd += cost;
      providers[provider].imageCount += 1;

      if (!providers[provider].models[model]) {
        providers[provider].models[model] = { costUsd: 0, imageCount: 0 };
      }
      providers[provider].models[model].costUsd += cost;
      providers[provider].models[model].imageCount += 1;
    }

    // Add cover cost if applicable
    if (book.hasCoverPage && book.coverStatus === "completed") {
      // Estimate cover cost (usually premium/pro)
      const coverCost = book.coverImageModelProfile === "openai_image_candidate" ? 0.042 : 0.05;
      const provider = book.coverImageModelProfile?.startsWith("openai") ? "openai" : "replicate";
      const model = book.coverImageModelProfile || "cover_pro";

      totalCostUsd += coverCost;
      totalImages += 1;

      if (!providers[provider]) {
        providers[provider] = { costUsd: 0, imageCount: 0, models: {} };
      }
      providers[provider].costUsd += coverCost;
      providers[provider].imageCount += 1;

      if (!providers[provider].models[model]) {
        providers[provider].models[model] = { costUsd: 0, imageCount: 0 };
      }
      providers[provider].models[model].costUsd += coverCost;
      providers[provider].models[model].imageCount += 1;
    }
  }

  const totalBooks = terminalBooks.length;
  const avgCostPerBook = totalBooks > 0 ? totalCostUsd / totalBooks : 0;

  return {
    totalCostUsd,
    totalImages,
    totalBooks,
    avgCostPerBook,
    providers,
  };
}

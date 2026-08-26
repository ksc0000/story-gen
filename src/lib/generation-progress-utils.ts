import type { BookDoc, PageDoc } from "@/lib/types";

export type GenerationStageId = "story" | "cover" | "pages" | "finishing";

export interface GenerationStageInfo {
  id: GenerationStageId;
  label: string;
  status: "completed" | "current" | "upcoming";
  detail?: string;
  isIndeterminate: boolean;
}

/**
 * Calculates estimated duration string based on book page count.
 */
export function getEstimatedTimeText(pageCount: number): string {
  if (pageCount <= 4) return "約1分〜1分30秒";
  if (pageCount <= 8) return "約2分〜3分";
  return "約3分30秒〜4分30秒";
}

/**
 * Formats elapsed time in seconds into Japanese readable string (e.g., "1分05秒" or "45秒").
 */
export function formatElapsedTime(seconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(safeSeconds / 60);
  const secs = safeSeconds % 60;
  if (mins === 0) {
    return `${secs}秒`;
  }
  return `${mins}分${secs < 10 ? "0" : ""}${secs}秒`;
}

/**
 * Computes the 4 generation stages and their statuses based on current BookDoc and PageDoc array.
 */
export function getGenerationStages(
  book: Partial<BookDoc> | null,
  pages: Partial<PageDoc>[] = []
): {
  stages: GenerationStageInfo[];
  currentStageIndex: number;
  completedPages: number;
  totalPages: number;
  statusText: string;
} {
  const totalPages = book?.pageCount ?? Math.max(pages.length, 1);
  const completedPages = pages.filter(
    (p) => p.status === "completed" || p.status === "fallback_completed"
  ).length;

  const hasStory =
    pages.length > 0 ||
    Boolean(book?.title?.trim()) ||
    (book?.progress ?? 0) >= 20;

  const hasCover =
    book?.coverStatus === "completed" ||
    book?.coverStatus === "failed" ||
    Boolean(book?.coverImageUrl);

  const isCoverGenerating = book?.coverStatus === "generating";
  const pagesStarted = completedPages > 0;
  const pagesDone = totalPages > 0 && completedPages === totalPages;

  let currentStageIndex = 0;
  if (!hasStory) {
    currentStageIndex = 0; // ストーリー作成
  } else if (isCoverGenerating) {
    currentStageIndex = 1; // 表紙生成
  } else if (!hasCover && !pagesStarted) {
    currentStageIndex = 1; // 表紙作成中/準備
  } else if (!pagesDone) {
    currentStageIndex = 2; // ページ画像生成
  } else {
    currentStageIndex = 3; // 仕上げ
  }

  const stages: GenerationStageInfo[] = [
    {
      id: "story",
      label: "ストーリー作成",
      status:
        currentStageIndex > 0
          ? "completed"
          : currentStageIndex === 0
          ? "current"
          : "upcoming",
      detail:
        currentStageIndex > 0
          ? "作成完了"
          : "物語と構成を作成しています",
      isIndeterminate: currentStageIndex === 0,
    },
    {
      id: "cover",
      label: "表紙",
      status:
        currentStageIndex > 1
          ? "completed"
          : currentStageIndex === 1
          ? "current"
          : "upcoming",
      detail:
        currentStageIndex > 1
          ? "作成完了"
          : currentStageIndex === 1
          ? "表紙を描いています"
          : "待機中",
      isIndeterminate: currentStageIndex === 1,
    },
    {
      id: "pages",
      label: "ページ画像",
      status:
        currentStageIndex > 2
          ? "completed"
          : currentStageIndex === 2
          ? "current"
          : "upcoming",
      detail: `${completedPages}/${totalPages}`,
      isIndeterminate: currentStageIndex === 2 && completedPages === 0,
    },
    {
      id: "finishing",
      label: "仕上げ",
      status:
        currentStageIndex > 3
          ? "completed"
          : currentStageIndex === 3
          ? "current"
          : "upcoming",
      detail:
        currentStageIndex === 3 ? "最終調整を行っています" : "待機中",
      isIndeterminate: currentStageIndex === 3,
    },
  ];

  let statusText = "物語を組み立てています...";
  if (currentStageIndex === 0) {
    statusText = "ストーリーを作成しています...";
  } else if (currentStageIndex === 1) {
    statusText = "表紙イラストを描いています...";
  } else if (currentStageIndex === 2) {
    statusText =
      completedPages === 0
        ? "ページのイラストを描き始めています..."
        : completedPages > totalPages / 2
        ? "もう少しで描き終わります..."
        : "お話に合わせて絵を描いています...";
  } else if (currentStageIndex === 3) {
    statusText = "まもなく完成です！絵本を仕上げています...";
  }

  return {
    stages,
    currentStageIndex,
    completedPages,
    totalPages,
    statusText,
  };
}

/**
 * Computes overall progress percentage.
 */
export function getOverallProgressPercent(
  book: Partial<BookDoc> | null,
  pages: Partial<PageDoc>[] = []
): number {
  const { currentStageIndex, completedPages, totalPages } = getGenerationStages(book, pages);

  if (currentStageIndex === 0) return 15;
  if (currentStageIndex === 1) return 30;
  if (currentStageIndex === 2) {
    const pageRatio = totalPages > 0 ? completedPages / totalPages : 0;
    return Math.min(90, Math.round(30 + pageRatio * 60));
  }
  if (currentStageIndex === 3) return 95;
  return 100;
}

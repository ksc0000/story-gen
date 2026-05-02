import type {
  GeneratedStory,
  AgeBand,
  CreationMode,
  StoryQualityReportData,
} from "./types";
import type { AgeReadingProfile } from "./age-reading-profile";

export type StoryQualityIssueSeverity = "warning" | "error";

export type StoryQualityIssue = {
  severity: StoryQualityIssueSeverity;
  code: string;
  message: string;
  pageIndex?: number;
  actual?: number | string;
  expected?: number | string;
};

export type StoryQualityReport = {
  ok: boolean;
  issues: StoryQualityIssue[];
  summary: {
    pageCount: number;
    averageCharsPerPage: number;
    averageSentencesPerPage: number;
    minCharsPerPage: number;
    minSentencesPerPage: number;
  };
};

export type StoryQualityThreshold = {
  minCharsPerPage: number;
  minSentencesPerPage: number;
  allowShortFinalPage?: boolean;
  requireNarrativeDevice?: boolean;
  requireCompositionHints?: boolean;
};

const STORY_QUALITY_THRESHOLDS: Record<AgeBand, StoryQualityThreshold> = {
  baby_toddler: {
    minCharsPerPage: 6,
    minSentencesPerPage: 1,
    allowShortFinalPage: true,
    requireNarrativeDevice: false,
    requireCompositionHints: false,
  },
  preschool_3_4: {
    minCharsPerPage: 24,
    minSentencesPerPage: 2,
    allowShortFinalPage: true,
    requireNarrativeDevice: true,
    requireCompositionHints: true,
  },
  early_reader_5_6: {
    minCharsPerPage: 45,
    minSentencesPerPage: 3,
    allowShortFinalPage: true,
    requireNarrativeDevice: true,
    requireCompositionHints: true,
  },
  early_elementary_7_8: {
    minCharsPerPage: 70,
    minSentencesPerPage: 4,
    allowShortFinalPage: true,
    requireNarrativeDevice: true,
    requireCompositionHints: true,
  },
  general_child: {
    minCharsPerPage: 35,
    minSentencesPerPage: 2,
    allowShortFinalPage: true,
    requireNarrativeDevice: true,
    requireCompositionHints: true,
  },
};

export function countJapaneseTextChars(text: string): number {
  if (!text) return 0;
  return text.replace(/[\s\r\n\t]/g, "").length;
}

export function countSentences(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;

  const matches = trimmed.match(/[。！？!?]+/g);
  if (!matches) return 1;
  return matches.length;
}

export function validateGeneratedStoryQuality(params: {
  story: GeneratedStory;
  readingProfile: AgeReadingProfile;
  creationMode?: CreationMode;
}): StoryQualityReport {
  const { story, readingProfile } = params;
  const creationMode = params.creationMode ?? "guided_ai";
  const threshold = STORY_QUALITY_THRESHOLDS[readingProfile.ageBand];
  const issues: StoryQualityIssue[] = [];
  const pageCount = story.pages.length;

  if (pageCount === 0) {
    return {
      ok: false,
      issues: [
        {
          severity: "error",
          code: "pages.empty",
          message: "生成された絵本にページがありません。",
        },
      ],
      summary: {
        pageCount: 0,
        averageCharsPerPage: 0,
        averageSentencesPerPage: 0,
        minCharsPerPage: threshold.minCharsPerPage,
        minSentencesPerPage: threshold.minSentencesPerPage,
      },
    };
  }

  const perPageStats = story.pages.map((page) => ({
    chars: countJapaneseTextChars(page.text),
    sentences: countSentences(page.text),
    imagePromptChars: countJapaneseTextChars(page.imagePrompt),
  }));

  perPageStats.forEach((stats, pageIndex) => {
    const isFinalPage = pageIndex === pageCount - 1;
    const allowShortFinalPage = Boolean(threshold.allowShortFinalPage && isFinalPage);

    if (!story.pages[pageIndex].text.trim()) {
      issues.push({
        severity: "error",
        code: "text.empty",
        message: "本文が空のページがあります。",
        pageIndex,
      });
      return;
    }

    if (stats.chars < threshold.minCharsPerPage) {
      issues.push({
        severity:
          readingProfile.ageBand === "baby_toddler" || allowShortFinalPage ? "warning" : "error",
        code: "text.too_short_chars",
        message: "本文の文字数が少なすぎます。",
        pageIndex,
        actual: stats.chars,
        expected: `>= ${threshold.minCharsPerPage}`,
      });
    }

    if (stats.sentences < threshold.minSentencesPerPage) {
      issues.push({
        severity:
          readingProfile.ageBand === "baby_toddler" || allowShortFinalPage ? "warning" : "error",
        code: "text.too_short_sentences",
        message: "本文の文数が少なすぎます。",
        pageIndex,
        actual: stats.sentences,
        expected: `>= ${threshold.minSentencesPerPage}`,
      });
    }

    if (stats.imagePromptChars < 30) {
      issues.push({
        severity: "warning",
        code: "image_prompt.thin",
        message: "imagePrompt が短く、絵の情報量が不足する可能性があります。",
        pageIndex,
        actual: stats.imagePromptChars,
        expected: ">= 30",
      });
    }
  });

  const averageCharsPerPage = Math.round(
    perPageStats.reduce((sum, stats) => sum + stats.chars, 0) / pageCount
  );
  const averageSentencesPerPage = Number(
    (perPageStats.reduce((sum, stats) => sum + stats.sentences, 0) / pageCount).toFixed(2)
  );

  if (averageCharsPerPage < threshold.minCharsPerPage) {
    issues.push({
      severity: "error",
      code: "summary.average_chars_low",
      message: "全体として本文量が少なすぎます。",
      actual: averageCharsPerPage,
      expected: `>= ${threshold.minCharsPerPage}`,
    });
  }

  if (averageSentencesPerPage < threshold.minSentencesPerPage) {
    issues.push({
      severity: "error",
      code: "summary.average_sentences_low",
      message: "全体として文数が少なすぎます。",
      actual: averageSentencesPerPage,
      expected: `>= ${threshold.minSentencesPerPage}`,
    });
  }

  const hasNarrativeDevice = Boolean(story.narrativeDevice);
  const hasRepeatedPhraseOrMotif = Boolean(
    story.narrativeDevice?.repeatedPhrase || story.narrativeDevice?.visualMotif
  );
  const hasSetupAndPayoff = Boolean(story.narrativeDevice?.setup && story.narrativeDevice?.payoff);

  if (threshold.requireNarrativeDevice) {
    if (readingProfile.ageBand === "preschool_3_4" || readingProfile.ageBand === "general_child") {
      if (!hasNarrativeDevice) {
        issues.push({
          severity: "warning",
          code: "narrative_device.missing",
          message: "繰り返しや視覚モチーフなどの絵本らしいしかけが不足しています。",
        });
      } else if (!hasRepeatedPhraseOrMotif) {
        issues.push({
          severity: "warning",
          code: "narrative_device.motif_missing",
          message: "repeatedPhrase または visualMotif を入れると、絵本らしさが高まります。",
        });
      }
    } else if (readingProfile.ageBand !== "baby_toddler") {
      if (!hasNarrativeDevice) {
        issues.push({
          severity: "error",
          code: "narrative_device.required",
          message: "対象年齢に対して narrativeDevice が不足しています。",
        });
      } else {
        if (!hasRepeatedPhraseOrMotif) {
          issues.push({
            severity: "warning",
            code: "narrative_device.motif_missing",
            message: "repeatedPhrase または visualMotif を含めると、絵本らしい反復が出しやすくなります。",
          });
        }
        if (!hasSetupAndPayoff) {
          issues.push({
            severity: "warning",
            code: "narrative_device.payoff_missing",
            message: "setup と payoff があると、最後の回収がより自然になります。",
          });
        }
      }
    }
  }

  if (threshold.requireCompositionHints) {
    const compositionHints = story.pages.map((page) => page.compositionHint?.trim()).filter(Boolean) as string[];
    if (compositionHints.length === 0) {
      issues.push({
        severity: creationMode === "fixed_template" ? "warning" : "error",
        code: "composition_hint.missing_all",
        message: "全ページで compositionHint が不足しています。",
      });
    } else if (compositionHints.length < pageCount) {
      issues.push({
        severity: "warning",
        code: "composition_hint.partial",
        message: "一部のページで compositionHint が不足しています。",
        actual: compositionHints.length,
        expected: pageCount,
      });
    }

    if (compositionHints.length > 1) {
      const normalizedHints = compositionHints.map((value) => value.toLowerCase());
      if (new Set(normalizedHints).size === 1) {
        issues.push({
          severity: "warning",
          code: "composition_hint.monotone",
          message: "構図指定が全ページで同じです。絵のリズムが単調になる可能性があります。",
        });
      }
      const allPortraitLike = normalizedHints.every((value) => value.includes("portrait"));
      const hasVariedShot = normalizedHints.some((value) =>
        ["wide", "back", "detail", "bird", "object", "close", "side"].some((token) => value.includes(token))
      );
      if (allPortraitLike || !hasVariedShot) {
        issues.push({
          severity: "warning",
          code: "composition_hint.weak_variety",
          message: "wide / back view / detail などの構図バリエーションが不足しています。",
        });
      }
    }
  }

  return {
    ok: !issues.some((issue) => issue.severity === "error"),
    issues,
    summary: {
      pageCount,
      averageCharsPerPage,
      averageSentencesPerPage,
      minCharsPerPage: threshold.minCharsPerPage,
      minSentencesPerPage: threshold.minSentencesPerPage,
    },
  };
}

export function toFirestoreStoryQualityReport(report: StoryQualityReport): StoryQualityReportData {
  return stripUndefinedDeep(report) as StoryQualityReportData;
}

function stripUndefinedDeep<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => stripUndefinedDeep(item)).filter((item) => item !== undefined) as T;
  }
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, entry]) => entry !== undefined)
      .map(([key, entry]) => [key, stripUndefinedDeep(entry)] as const);
    return Object.fromEntries(entries) as T;
  }
  return value;
}


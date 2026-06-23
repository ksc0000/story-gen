import type {
  GeneratedStory,
  AgeBand,
  CreationMode,
  StoryQualityReportData,
  StoryCharacter,
  ProductPlan,
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
    minCharsPerPage: 40,
    minSentencesPerPage: 2,
    allowShortFinalPage: true,
    requireNarrativeDevice: true,
    requireCompositionHints: true,
  },
  early_reader_5_6: {
    minCharsPerPage: 60,
    minSentencesPerPage: 3,
    allowShortFinalPage: true,
    requireNarrativeDevice: true,
    requireCompositionHints: true,
  },
  early_elementary_7_8: {
    minCharsPerPage: 90,
    minSentencesPerPage: 4,
    allowShortFinalPage: true,
    requireNarrativeDevice: true,
    requireCompositionHints: true,
  },
  general_child: {
    minCharsPerPage: 50,
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

function normalizeJapanese(text: string): string {
  return text
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[「」『』、】【。,.!！?？]/g, "");
}

export function validateGeneratedStoryQuality(params: {
  story: GeneratedStory;
  readingProfile: AgeReadingProfile;
  creationMode?: CreationMode;
  productPlan?: ProductPlan;
}): StoryQualityReport {
  const { story, readingProfile } = params;
  const creationMode = params.creationMode ?? "guided_ai";
  const threshold = getEffectiveThreshold(readingProfile.ageBand, params.productPlan);
  const issues: StoryQualityIssue[] = [];
  const pageCount = story.pages.length;
  const recurringCastIds = new Map<string, number>();
  for (const page of story.pages) {
    for (const characterId of page.appearingCharacterIds ?? []) {
      recurringCastIds.set(characterId, (recurringCastIds.get(characterId) ?? 0) + 1);
    }
  }

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

    if (hasImagePromptTextRisk(story.pages[pageIndex].imagePrompt)) {
      issues.push({
        severity: "warning",
        code: "image_prompt.text_risk",
        message: "imagePrompt に文字描画を誘発する表現が含まれています。",
        pageIndex,
      });
    }
    if (hasSceneConstraintConflict(story.pages[pageIndex].imagePrompt)) {
      issues.push({
        severity: "warning",
        code: "scene_constraint_conflict",
        message: "imagePrompt 内で背景制約と scene 要素が矛盾している可能性があります。",
        pageIndex,
      });
    }
    if (hasReadableTextRisk(story.pages[pageIndex].imagePrompt)) {
      issues.push({
        severity: "warning",
        code: "readable_text_risk",
        message: "imagePrompt に読める文字やラベルの生成を誘発しうる要素があります。",
        pageIndex,
      });
    }
    if (hasBrandOrLogoRisk(story.pages[pageIndex].imagePrompt)) {
      issues.push({
        severity: "warning",
        code: "brand_or_logo_risk",
        message: "imagePrompt にロゴやブランド表現を誘発しうる要素があります。",
        pageIndex,
      });
    }
    if (hasUnsafeSceneObject(story.pages[pageIndex].imagePrompt)) {
      issues.push({
        severity: "warning",
        code: "unsafe_scene_object",
        message: "imagePrompt に年齢不相応または危険になりうる要素があります。",
        pageIndex,
      });
    }

    if (readingProfile.ageBand !== "baby_toddler") {
      const isOpening = pageIndex === 0;
      const isClosing = pageIndex === pageCount - 1;
      const heuristics = analyzeJapaneseTextHeuristics(story.pages[pageIndex].text, {
        ageBand: readingProfile.ageBand,
        isOpening,
        isClosing,
      });

      if (isOpening && heuristics.missingSceneDetail) {
        issues.push({
          severity: "warning",
          code: "opening.missing_scene_detail",
          message: "冒頭ページに場所や情景の描写が不足しており、唐突に始まる印象を与える可能性があります。",
          pageIndex,
        });
      }

      if (isClosing && !heuristics.hasClosingTone) {
        issues.push({
          severity: "warning",
          code: "closing.missing_warmth",
          message: "結末ページに余韻や安心感のある描写が不足しており、唐突に終わる印象を与える可能性があります。",
          pageIndex,
        });
      }

      if (heuristics.tooManySoundWords) {
        issues.push({
          severity: readingProfile.ageBand === "preschool_3_4" ? "error" : "warning",
          code: "too_many_sound_words",
          message: "擬音や音遊びが多すぎて、物語としての読みごたえが弱くなっています。",
          pageIndex,
        });
      }
      if (heuristics.textTooChildish) {
        issues.push({
          severity: readingProfile.ageBand === "preschool_3_4" ? "error" : "warning",
          code: "text_too_childish",
          message: "本文が音遊びに寄りすぎており、意味の通る物語文としては弱い可能性があります。",
          pageIndex,
        });
      }
      if (heuristics.missingSceneDetail) {
        issues.push({
          severity: "warning",
          code: "missing_scene_detail",
          message: "場所や情景を示す情報が少なく、場面が想像しにくい可能性があります。",
          pageIndex,
        });
      }
      if (heuristics.missingActionOrEmotion) {
        issues.push({
          severity: "warning",
          code: "missing_action_or_emotion",
          message: "行動または感情の情報が少なく、物語の動きが弱い可能性があります。",
          pageIndex,
        });
      }
      if (heuristics.unnaturalJapaneseRisk) {
        issues.push({
          severity: "warning",
          code: "unnatural_japanese_risk",
          message: "不自然な造語や同音反復が多く、日本語として読みづらい可能性があります。",
          pageIndex,
        });
      }
      if (heuristics.textTooGeneric) {
        issues.push({
          severity: "warning",
          code: "text_too_generic",
          message: "本文が短く抽象的で、場面や出来事の情報量が不足している可能性があります。",
          pageIndex,
        });
      }
      if (heuristics.sentenceTooShortForAge) {
        issues.push({
          severity: "warning",
          code: "sentence_too_short_for_age",
          message: "対象年齢に対して文が短すぎ、読みごたえが不足している可能性があります。",
          pageIndex,
        });
      }
      if (heuristics.monotonousSentenceEndings) {
        issues.push({
          severity: "warning",
          code: "monotonous_sentence_endings",
          message: "文末の表現が連続して単調になっています。語尾を工夫してリズムを整えてください。",
          pageIndex,
        });
      }
    }
  });

  addStoryGoalConsistencyIssues({
    story: params.story,
    readingProfile,
    issues,
    productPlan: params.productPlan,
  });

  const averageCharsPerPage = Math.round(
    perPageStats.reduce((sum, stats) => sum + stats.chars, 0) / pageCount
  );
  const averageSentencesPerPage = Number(
    (perPageStats.reduce((sum, stats) => sum + stats.sentences, 0) / pageCount).toFixed(2)
  );
  const actualMinCharsPerPage = Math.min(...perPageStats.map((stats) => stats.chars));
  const actualMinSentencesPerPage = Math.min(...perPageStats.map((stats) => stats.sentences));

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
      const uniqueHints = new Set(normalizedHints);
      const roles = story.pages.map((p) => p.pageVisualRole).filter(Boolean) as string[];
      const uniqueRoles = new Set(roles);

      if (uniqueHints.size === 1 || uniqueRoles.size === 1) {
        issues.push({
          severity: "warning",
          code: "composition_hint.monotone",
          message: "構図指定または役割（pageVisualRole）が全ページで同じです。絵のリズムが単調になる可能性があります。",
        });
      }

      // Variety check for longer books
      const minUniqueRoles = pageCount >= 8 ? 5 : pageCount >= 4 ? 3 : 2;
      if (uniqueRoles.size < minUniqueRoles) {
        issues.push({
          severity: "warning",
          code: "image_composition.low_variety",
          message: `構図のバリエーションが不足しています。${pageCount}ページの構成では、少なくとも${minUniqueRoles}種類以上の異なる役割（pageVisualRole）を使用することを推奨します。`,
          actual: uniqueRoles.size,
          expected: `>= ${minUniqueRoles}`,
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

  // P5-fix: Regression guard — detect duplicate imagePrompt values across pages.
  // Identical imagePrompts cause the image model to generate near-identical images,
  // leading to "all pages same image" reports in 竹-plan (guided_ai) books.
  if (pageCount >= 2) {
    const trimmedPrompts = story.pages.map((p) => p.imagePrompt.trim().toLowerCase());
    const promptCounts = new Map<string, number>();
    for (const p of trimmedPrompts) {
      promptCounts.set(p, (promptCounts.get(p) ?? 0) + 1);
    }
    const maxDuplicateCount = Math.max(...promptCounts.values());
    if (maxDuplicateCount === pageCount) {
      // Every page has the same imagePrompt — definite error
      issues.push({
        severity: "error",
        code: "image_prompt.all_identical",
        message: "全ページの imagePrompt が同じです。ページ固有の場面描写を生成してください。",
        actual: maxDuplicateCount,
        expected: `all ${pageCount} pages distinct`,
      });
    } else if (maxDuplicateCount >= Math.ceil(pageCount / 2)) {
      // Half or more pages share the same imagePrompt — warning to trigger rewrite
      issues.push({
        severity: "warning",
        code: "image_prompt.low_diversity",
        message: "半数以上のページで imagePrompt が重複しています。場面ごとの描写を多様にしてください。",
        actual: maxDuplicateCount,
        expected: `< ${Math.ceil(pageCount / 2)} duplicates`,
      });
    }
  }

  addCastConsistencyIssues({
    story,
    issues,
    recurringCastIds,
  });

  return {
    ok: !issues.some((issue) => issue.severity === "error"),
    issues,
    summary: {
      pageCount,
      averageCharsPerPage,
      averageSentencesPerPage,
      minCharsPerPage: actualMinCharsPerPage,
      minSentencesPerPage: actualMinSentencesPerPage,
    },
  };
}

function getEffectiveThreshold(ageBand: AgeBand, productPlan?: ProductPlan): StoryQualityThreshold {
  const base = STORY_QUALITY_THRESHOLDS[ageBand];
  if (productPlan !== "premium_paid") {
    return base;
  }

  if (ageBand === "preschool_3_4" || ageBand === "general_child") {
    return {
      ...base,
      minCharsPerPage: Math.max(base.minCharsPerPage, 45),
      minSentencesPerPage: Math.max(base.minSentencesPerPage, 3),
    };
  }

  return base;
}

/**
 * 否定・禁止の節を取り除く。画像プロンプトには安全層として "no signage, no
 * labels, no letters, ..." といった「文字を描くな」という指示が大量に含まれる。
 * これらを単純部分一致で拾うと自分自身の安全指示を「文字描画リスク」と誤検出して
 * しまうため、否定節を除去してから走査する（再キャリブレーション 2026-06 / #566）。
 */
function stripNegatedClauses(prompt: string): string {
  // 文単位（ピリオド/句点）で判定する。"no diploma, banner, labels, posters" の
  // ような列挙否定はカンマで切ると先頭の "no" から各項目が切り離されて誤検出する
  // ため、文に否定の手がかりがあれば列挙項目ごと文全体を除外する。
  return prompt
    .split(/[.!?。！？]/)
    .filter((sentence) => {
      const s = sentence.toLowerCase();
      return !(
        /\bno\b/.test(s) ||
        /\b(without|never|must be plain|must remain|stays? (plain|natural)|unmarked|unlabel|purely visual|visual[- ]only|only visual|avoid|free of|plain[- ]color|plain solid|remain plain)/.test(
          s
        )
      );
    })
    .join(". ");
}

// 文字描画を「肯定的に」要求する表現のみを単語境界付きで検出する。
// 単語境界により "signature" / "design" などの部分一致誤検出を防ぐ。
const TEXT_RISK_PATTERNS: RegExp[] = [
  /\btext:/,
  /\bcaption\b/,
  /\bspeech bubble\b/,
  /\blabel(s|ed|led|ing)?\b/,
  /\bsign(s|age|board|post|posts)?\b/,
  /\bletters?\b/,
  /\bwritten\b/,
  /\bwriting\b/,
  /\btitle on\b/,
  /\bwords?\b/,
  /\bquote\b/,
  /\bphrase\b/,
  // imagination / fantasy text-bearing elements that correlate with E005 on flux-2-pro
  /\brune(s)?\b/,
  /\bglyph(s)?\b/,
  /\binscription(s)?\b/,
  /\bstar chart\b/,
  /\btreasure map\b/,
  /\bcelestial map\b/,
  /\bmagical text\b/,
  /\bglowing text\b/,
  /\benchanted mark\b/,
  /\bconstellation name\b/,
  /\bcompass direction\b/,
];

function hasImagePromptTextRisk(imagePrompt: string): boolean {
  if (/[「」『』]/.test(imagePrompt)) {
    return true;
  }
  const normalized = stripNegatedClauses(imagePrompt).toLowerCase();
  return TEXT_RISK_PATTERNS.some((re) => re.test(normalized));
}

function hasSceneConstraintConflict(imagePrompt: string): boolean {
  const normalized = imagePrompt.toLowerCase();
  return (
    normalized.includes("do not include playground equipment") &&
    /(slide|swing|jungle gym|climbing frame|playground equipment)/.test(normalized)
  );
}

function hasReadableTextRisk(imagePrompt: string): boolean {
  const normalized = stripNegatedClauses(imagePrompt).toLowerCase();
  return /(\blabel(s|ed|led|ing)?\b|\bsign(s|age|board|post)?\b|\bletters?\b|\bwritten\b|\bwriting\b|\bcaption\b|\bspeech bubble\b|\breadable text\b)/.test(
    normalized
  );
}

function hasBrandOrLogoRisk(imagePrompt: string): boolean {
  const normalized = stripNegatedClauses(imagePrompt).toLowerCase();
  return /(\blogo(s)?\b|\bbrand mark\b|\bbrand name(s)?\b|\btrademark\b|\bcompany mark\b)/.test(
    normalized
  );
}

function hasUnsafeSceneObject(imagePrompt: string): boolean {
  const normalized = imagePrompt.toLowerCase();
  return /(gun|knife|weapon|alcohol|cigarette|traffic|car lane|busy road)/.test(normalized);
}

type JapaneseTextHeuristics = {
  tooManySoundWords: boolean;
  textTooChildish: boolean;
  missingSceneDetail: boolean;
  missingActionOrEmotion: boolean;
  unnaturalJapaneseRisk: boolean;
  textTooGeneric: boolean;
  sentenceTooShortForAge: boolean;
  monotonousSentenceEndings: boolean;
  hasClosingTone: boolean;
};

function analyzeJapaneseTextHeuristics(
  text: string,
  options?: { ageBand?: AgeBand; isOpening?: boolean; isClosing?: boolean }
): JapaneseTextHeuristics {
  const normalized = text.replace(/\s+/g, "");
  const commonSoundWords =
    normalized.match(
      /(ころころ|わくわく|どきどき|きらきら|ふわふわ|さらさら|ぴかぴか|ぐるぐる|ごろごろ|ぺたぺた|しゃかしゃか|こしこし|にこにこ|ふんわり|どっしり|すたすた|ぴょんぴょん|すやすや|ぱくぱく|もぐもぐ|ぴょんと)/g
    ) ?? [];
  const placeWords = /(おへや|へや|まど|そら|こうえん|もり|みち|すなば|すなのなか|すなのうえ|てのなか|てのひら|ゆびさき|うみ|かわ|やま|にわ|キッチン|テーブル|ベッド|どうぶつえん|みずうみ|くも)/;
  const actionWords = /(ある|はし|みつけ|あつめ|つく|のぼ|すべ|ひろ|みつめ|さわ|のぞ|えら|あけ|もっ|ぎゅっ|ふり|わら|みた|きい|のった|とんだ|ひらいた|ひろが|ならべ|おいた|みせた|つたえ|かんがえ|みつめた)/;
  const emotionOrDiscoveryWords = /(うれ|かなし|ほっ|びっくり|わくわく|どきどき|にっこり|わら|えがお|みつけ|きづ|ふしぎ|あんしん|こわ|たのし)/;
  const coinedPatterns =
    /(こりころ|ふわりん|ころころこりころ|まきまきまきば|ぴかりん|きらりん|ぽよん|ぷよん|ぽよよん|ぴょんたん|りるりん|ぱぱる|ぴぴる|ぷるるん|おめめ|おてて|あんよ|おくち|おみみ)/;
  const hiraganaRatio =
    normalized.length > 0 ? (normalized.match(/[ぁ-ん]/g) ?? []).length / normalized.length : 0;

  const sentences = text.split(/[。！？!?]+/).map((s) => s.trim()).filter(Boolean);
  const endings = sentences.map((s) => {
    if (s.endsWith("しました")) return "mashita";
    if (s.endsWith("ました")) return "mashita";
    if (s.endsWith("でした")) return "deshita";
    if (s.endsWith("した")) return "shita";
    if (s.endsWith("だった")) return "datta";
    if (s.endsWith("です")) return "desu";
    if (s.endsWith("ます")) return "masu";
    return "other";
  });

  let monotonousSentenceEndings = false;
  if (endings.length >= 3) {
    for (let i = 0; i <= endings.length - 3; i++) {
      if (endings[i] !== "other" && endings[i] === endings[i + 1] && endings[i] === endings[i + 2]) {
        monotonousSentenceEndings = true;
        break;
      }
    }
  }

  const hasClosingTone = /(あした|おやすみ|わらって|しあわせ|きもち|ずっと|これから|おしまい|またね|ありがとう|にっこり|ほっと|あんしん|ゆめ|ねむ|おうちに)/.test(text);
  const isOlderChild =
    options?.ageBand === "early_reader_5_6" ||
    options?.ageBand === "early_elementary_7_8" ||
    options?.ageBand === "general_child";
  // 再キャリブレーション（2026-06）: 場所語/動作・感情語の allowlist は絵本本文を
  // 網羅できず、絵が情景を担う充実したページにも無差別発火していた（実データで
  // missing_scene_detail=98.9%, missing_action_or_emotion=90.4% の book 発火率）。
  // 「薄いページ（THIN_PAGE_CHARS 未満）」に限定することで、本当に空疎な短いページ
  // だけを検出する判別力のある指標にする（両者とも book 発火率 ~42.6% に低下）。
  const THIN_PAGE_CHARS = 35;
  const charCount = countJapaneseTextChars(text);
  const missingSceneDetail =
    (!placeWords.test(text) && charCount < THIN_PAGE_CHARS) ||
    (!!options?.isOpening && charCount < 25);

  return {
    tooManySoundWords: commonSoundWords.length >= (isOlderChild ? 2 : 3),
    textTooChildish:
      (commonSoundWords.length >= (isOlderChild ? 1 : 2) && countJapaneseTextChars(text) < 80) ||
      coinedPatterns.test(text),
    missingSceneDetail,
    missingActionOrEmotion:
      !(actionWords.test(text) || emotionOrDiscoveryWords.test(text)) && charCount < THIN_PAGE_CHARS,
    unnaturalJapaneseRisk:
      coinedPatterns.test(text) || (hiraganaRatio > 0.9 && commonSoundWords.length >= 2),
    textTooGeneric:
      countJapaneseTextChars(text) < 45 &&
      countSentences(text) <= 3 &&
      (!actionWords.test(text) || !emotionOrDiscoveryWords.test(text)),
    sentenceTooShortForAge:
      countJapaneseTextChars(text) < 40 || countSentences(text) <= 2,
    monotonousSentenceEndings,
    hasClosingTone,
  };
}

function isStarLikeQuest(value?: string): boolean {
  if (!value) return false;
  return /(星|ほし|ひかり|光|キラキラ|きらきら)/.test(value);
}

function isForbiddenObjectUsedAsGoal(text: string, forbiddenToken: string): boolean {
  const normalized = normalizeJapanese(text);
  const escaped = escapeRegExp(normalizeJapanese(forbiddenToken));
  if (!escaped) return false;

  return (
    new RegExp(`${escaped}.{0,6}(どこ|さが|探|見つ|みつ|あった|なくし|ほしい|たいせつ)`).test(normalized) ||
    new RegExp(`(どこ|さが|探|見つ|みつ|あった|なくし|ほしい|たいせつ).{0,6}${escaped}`).test(normalized)
  );
}

function hasPersistentPageSequence(pageIndexes: number[]): boolean {
  if (pageIndexes.length < 2) return false;
  const sorted = [...new Set(pageIndexes)].sort((a, b) => a - b);
  let consecutive = 1;
  for (let index = 1; index < sorted.length; index += 1) {
    if (sorted[index] === sorted[index - 1] + 1) {
      consecutive += 1;
      if (consecutive >= 2) return true;
    } else {
      consecutive = 1;
    }
  }
  return false;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function addStoryGoalConsistencyIssues(params: {
  story: GeneratedStory;
  readingProfile: AgeReadingProfile;
  issues: StoryQualityIssue[];
  productPlan?: ProductPlan;
}): void {
  const { story, readingProfile, issues } = params;
  const isThreePlus = readingProfile.ageBand !== "baby_toddler";
  const isPremium = params.productPlan === "premium_paid";
  if (!isThreePlus) {
    return;
  }

  if (!story.storyGoal?.trim()) {
    issues.push({
      severity: "warning",
      code: "missing_story_goal",
      message: "物語全体の目的 storyGoal が不足しています。",
    });
  }

  if (!story.mainQuestObject?.trim()) {
    issues.push({
      severity: "warning",
      code: "missing_main_quest_object",
      message: "探すものや向かう目的を示す mainQuestObject が不足しています。",
    });
    return;
  }

  const mainQuestAliasTokens = buildQuestTokens([story.mainQuestObject], {
    includeStarAliases: isStarLikeQuest(story.mainQuestObject),
  });
  const storyGoalTokens = buildQuestTokens([story.storyGoal]);
  const forbiddenTokens = (story.forbiddenQuestObjects ?? []).flatMap((value) =>
    buildQuestTokens([value], { includeStarAliases: false })
  );
  const hiddenDetailTokens = [
    ...(story.narrativeDevice?.hiddenDetails ?? []),
    ...story.pages.map((page) => page.hiddenDetail ?? ""),
  ].flatMap((value) => buildQuestTokens([value], { includeStarAliases: false }));
  const visualMotifTokens = buildQuestTokens([
    story.narrativeDevice?.visualMotif,
    story.narrativeDevice?.repeatedPhrase,
    story.storyGoal,
  ]);
  const forbiddenGoalPages: number[] = [];
  const driftPages: number[] = [];

  story.pages.forEach((page, pageIndex) => {
    const text = page.text ?? "";
    const normalized = normalizeJapanese(text);
    const hasMainQuestSignal =
      mainQuestAliasTokens.length === 0 ||
      mainQuestAliasTokens.some((token) => normalized.includes(normalizeJapanese(token)));
    const hasStoryGoalSignal =
      storyGoalTokens.length === 0 ||
      storyGoalTokens.some((token) => normalized.includes(normalizeJapanese(token)));
    const forbiddenHits = forbiddenTokens.filter(
      (token) => token && normalized.includes(normalizeJapanese(token))
    );
    const forbiddenGoalHits = forbiddenTokens.filter((token) =>
      token ? isForbiddenObjectUsedAsGoal(text, token) : false
    );
    const hiddenHits = hiddenDetailTokens.filter(
      (token) => token && normalized.includes(normalizeJapanese(token))
    );
    const motifHits = visualMotifTokens.filter(
      (token) => token && normalized.includes(normalizeJapanese(token))
    );

    if (!hasMainQuestSignal && !hasStoryGoalSignal && countJapaneseTextChars(text) >= 20) {
      issues.push({
        severity: "warning",
        code: "page_text_not_connected_to_story_goal",
        message: "本文が storyGoal や mainQuestObject につながっていない可能性があります。",
        pageIndex,
      });
    }

    if (forbiddenGoalHits.length > 0) {
      issues.push({
        severity: "warning",
        code: "forbidden_object_became_goal",
        message: "除外対象の小物や背景要素が、本文の主目的として扱われています。",
        pageIndex,
        actual: forbiddenGoalHits.join(", "),
      });
      forbiddenGoalPages.push(pageIndex);
    } else if (forbiddenHits.length > 0) {
      issues.push({
        severity: "warning",
        code: "forbidden_object_mentioned",
        message: "forbiddenQuestObjects が本文に登場していますが、主目的化はしていません。",
        pageIndex,
        actual: forbiddenHits.join(", "),
      });
    }

    if (!hasMainQuestSignal && !hasStoryGoalSignal && forbiddenGoalHits.length > 0) {
      issues.push({
        severity: "warning",
        code: "main_quest_drift",
        message: "物語の主目的が途中で別の対象にずれている可能性があります。",
        pageIndex,
      });
      driftPages.push(pageIndex);
    }

    if (hiddenHits.length > 0 || (forbiddenGoalHits.length > 0 && Boolean(page.hiddenDetail?.trim()))) {
      const isProminent = !hasMainQuestSignal || forbiddenGoalHits.length > 0;
      issues.push({
        severity: "warning",
        code: isProminent ? "hidden_detail_used_as_main_goal" : "hidden_detail_mentioned_in_text",
        message: isProminent
          ? "hiddenDetail が本文の主筋として使われている可能性があります。"
          : "hiddenDetail が本文（text）で言及されています。hiddenDetail は原則として本文に出さず、絵だけの要素にしてください。",
        pageIndex,
        actual: hiddenHits.join(", ") || page.hiddenDetail,
      });
      if (isProminent) {
        issues.push({
          severity: "warning",
          code: "hidden_detail_too_prominent",
          message: "hiddenDetail が目立ちすぎて、主筋より前に出ている可能性があります。",
          pageIndex,
        });
      }
    }

    if (
      page.pageVisualRole !== "opening_establishing" &&
      visualMotifTokens.length > 0 &&
      motifHits.length === 0 &&
      !forbiddenHits.length
    ) {
      issues.push({
        severity: "warning",
        code: "missing_visual_motif_in_text",
        message: "本文に visualMotif や主目的の手がかりが十分反映されていない可能性があります。",
        pageIndex,
      });
    }

    if (
      isPremium &&
      page.pageVisualRole === "opening_establishing" &&
      !hasMainQuestSignal &&
      !hasStoryGoalSignal
    ) {
      issues.push({
        severity: "error",
        code: "missing_opening_hook",
        message: "冒頭ページに storyGoal へつながる発見や導入フックが不足しています。",
        pageIndex,
      });
    }

    if (
      isPremium &&
      pageIndex === story.pages.length - 1 &&
      !hasFinalPageResolution({
        page,
        text,
        mainQuestTokens: mainQuestAliasTokens,
        visualMotifTokens,
      })
    ) {
      const promptHasQuestSignal =
        mainQuestAliasTokens.some((token) =>
          normalizeJapanese(page.imagePrompt ?? "").includes(normalizeJapanese(token))
        ) ||
        visualMotifTokens.some((token) =>
          normalizeJapanese(page.imagePrompt ?? "").includes(normalizeJapanese(token))
        );
      issues.push({
        severity:
          promptHasQuestSignal &&
          (page.pageVisualRole === "payoff" || page.pageVisualRole === "quiet_ending")
            ? "warning"
            : "error",
        code: !hasMainQuestSignal ? "missing_quest_object_resolution" : "missing_story_resolution",
        message: !hasMainQuestSignal
          ? "最終ページで mainQuestObject の解決が明示されていません。"
          : "最終ページで解決や安心感が十分に書かれていません。",
        pageIndex,
      });
    }
  });

  if (hasPersistentPageSequence(forbiddenGoalPages)) {
    issues.push({
      severity: "error",
      code: "forbidden_object_became_goal_persistent",
      message: "forbiddenQuestObjects が複数ページで主目的化しています。",
      actual: forbiddenGoalPages.map((pageIndex) => pageIndex + 1).join(", "),
    });
  }

  if (hasPersistentPageSequence(driftPages)) {
    issues.push({
      severity: "error",
      code: "main_quest_drift_persistent",
      message: "物語の主目的が複数ページ連続でずれています。",
      actual: driftPages.map((pageIndex) => pageIndex + 1).join(", "),
    });
  }
}

function hasFinalPageResolution(params: {
  page: GeneratedStory["pages"][number];
  text: string;
  mainQuestTokens: string[];
  visualMotifTokens: string[];
}): boolean {
  const normalizedText = normalizeJapanese(params.text);
  const hasMainQuestSignal =
    params.mainQuestTokens.length === 0 ||
    params.mainQuestTokens.some((token) => normalizedText.includes(normalizeJapanese(token)));
  const hasMotifSignal = params.visualMotifTokens.some((token) =>
    normalizedText.includes(normalizeJapanese(token))
  );
  const hasResolutionVerb =
    /(あった|みつかった|見つかった|ありがとう|にっこり|ほっと|あんしん|うれしく|もどった|ひかった|かがやいた)/.test(
      params.text
    );

  return (hasMainQuestSignal || hasMotifSignal) && hasResolutionVerb;
}

function buildQuestTokens(
  values: Array<string | undefined>,
  options?: { includeStarAliases?: boolean }
): string[] {
  const tokens = new Set<string>();
  for (const value of values) {
    if (!value) continue;
    const normalized = value.replace(/[「」『』\s、。,.!！?？]/g, "");
    if (!normalized) continue;
    tokens.add(normalized);
    for (const part of value.split(/[\s、。,.!！?？・]/)) {
      const token = part.trim();
      if (!token) continue;
      if (token.length >= 2) {
        tokens.add(token);
      }
    }
    if ((options?.includeStarAliases ?? true) && value.includes("星")) {
      ["星", "ほし", "ほしのこ", "ひかり", "光", "キラキラ", "きらきら", "星のかけら", "ほしのかけら", "かけら"].forEach((token) => tokens.add(token));
    }
  }
  return [...tokens];
}

function addCastConsistencyIssues(params: {
  story: GeneratedStory;
  issues: StoryQualityIssue[];
  recurringCastIds: Map<string, number>;
}): void {
  const cast = params.story.cast ?? [];
  const castIds = new Set(cast.map((character) => character.characterId));
  const recurringCharacterHints = params.story.pages.filter((page) =>
    /buddy|friend|animal|magical/i.test(page.imagePrompt)
  ).length;

  if (cast.length === 0 && recurringCharacterHints >= 2) {
    params.issues.push({
      severity: "warning",
      code: "cast_missing_for_recurring_character",
      message: "繰り返し登場しそうな相棒・動物・魔法キャラがあるのに cast が定義されていません。",
    });
  }

  if (cast.length > 0) {
    const pagesWithoutAppearingIds = params.story.pages.filter(
      (page) => /buddy|friend|animal|magical|ほしのこ|ともだち/i.test(page.imagePrompt) &&
        (!page.appearingCharacterIds || page.appearingCharacterIds.length === 0)
    ).length;
    if (pagesWithoutAppearingIds > 0) {
      params.issues.push({
        severity: "warning",
        code: "missing_appearing_character_ids",
        message: "cast はあるのに pages[].appearingCharacterIds が不足しているページがあります。",
        actual: pagesWithoutAppearingIds,
      });
    }
  }

  for (const [characterId, count] of params.recurringCastIds.entries()) {
    if (characterId === "child_protagonist") {
      continue;
    }
    if (!castIds.has(characterId)) {
      params.issues.push({
        severity: "warning",
        code: "cast_unknown_character_id",
        message: "pages[].appearingCharacterIds に cast 未定義の characterId があります。",
        actual: characterId,
        expected: "cast に同じ characterId を定義",
      });
    }

    if (count >= 2) {
      const character = cast.find((entry) => entry.characterId === characterId);
      if (character && (!character.visualBible || (!character.signatureItems?.length && !character.doNotChange?.length))) {
        params.issues.push({
          severity: "warning",
          code: "cast_missing_identity_anchors",
          message: "繰り返し登場するキャラクターに visualBible / signatureItems / doNotChange が不足しています。",
          actual: characterId,
        });
      }
    }
  }

  const normalizedNames = new Map<string, StoryCharacter[]>();
  for (const character of cast) {
    const key = character.displayName.replace(/\s+/g, "").toLowerCase();
    const existing = normalizedNames.get(key) ?? [];
    existing.push(character);
    normalizedNames.set(key, existing);
  }
  for (const characters of normalizedNames.values()) {
    const uniqueIds = new Set(characters.map((character) => character.characterId));
    if (characters.length > 1 && uniqueIds.size > 1) {
      params.issues.push({
        severity: "warning",
        code: "cast_duplicate_like_character",
        message: "似た displayName のキャラクターが複数の characterId で作られています。",
      });
    }
  }

  // Heuristic for unintended characters in imagePrompt
  params.story.pages.forEach((page, index) => {
    const prompt = page.imagePrompt.toLowerCase();
    const appearingIds = new Set(page.appearingCharacterIds ?? []);

    // 1. Unrequested humans (if child_protagonist or human cast not specified)
    const hasHumanInPrompt = /\b(child|boy|girl|person|human|man|woman|people|crowd)\b/i.test(prompt);
    if (hasHumanInPrompt) {
      const isHumanAuthorized = appearingIds.has("child_protagonist") ||
        Array.from(appearingIds).some(id => {
          const c = cast.find(char => char.characterId === id);
          return c?.characterKind === "human_child" || c?.characterKind === "human_adult" ||
                 /\b(child|boy|girl|person|human|man|woman)\b/i.test(c?.visualBible ?? "");
        });
      if (!isHumanAuthorized) {
        params.issues.push({
          severity: "warning",
          code: "unauthorized_human_in_prompt",
          message: "登場人物に指定されていない人間が imagePrompt に含まれている可能性があります。",
          pageIndex: index,
        });
      }
    }

    // 2. Unrequested animals
    const animalMatch = prompt.match(/\b(dog|cat|bear|rabbit|fox|bird|panda|penguin|hamster|mouse|lion|tiger|elephant|monkey|squirrel|koala|sheep|horse|cow|pig|chicken|duck)\b/i);
    if (animalMatch) {
      const foundToken = animalMatch[0].toLowerCase();
      const isAnimalAuthorized = Array.from(appearingIds).some(id => {
        const c = cast.find(char => char.characterId === id);
        return c && (
          c.characterId.toLowerCase().includes(foundToken) ||
          c.displayName.toLowerCase().includes(foundToken) ||
          c.visualBible?.toLowerCase().includes(foundToken) ||
          c.characterKind === "animal"
        );
      });
      if (!isAnimalAuthorized) {
        params.issues.push({
          severity: "warning",
          code: "unauthorized_animal_in_prompt",
          message: `登場人物に指定されていない動物（${foundToken}）が imagePrompt に含まれている可能性があります。`,
          pageIndex: index,
        });
      }
    }
  });
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

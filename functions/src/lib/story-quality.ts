import type {
  GeneratedStory,
  AgeBand,
  CreationMode,
  StoryQualityReportData,
  StoryCharacter,
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

    if (readingProfile.ageBand !== "baby_toddler") {
      const heuristics = analyzeJapaneseTextHeuristics(story.pages[pageIndex].text);
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
    }
  });

  addStoryGoalConsistencyIssues({
    story: params.story,
    readingProfile,
    issues,
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
      minCharsPerPage: threshold.minCharsPerPage,
      minSentencesPerPage: threshold.minSentencesPerPage,
    },
  };
}

function hasImagePromptTextRisk(imagePrompt: string): boolean {
  const normalized = imagePrompt.toLowerCase();
  if (/[「」『』]/.test(imagePrompt)) {
    return true;
  }

  return [
    "text:",
    "caption",
    "speech bubble",
    "label",
    "sign",
    "letters",
    "written",
    "writing",
    "title on",
    "words",
    "quote",
    "phrase",
  ].some((token) => normalized.includes(token));
}

type JapaneseTextHeuristics = {
  tooManySoundWords: boolean;
  textTooChildish: boolean;
  missingSceneDetail: boolean;
  missingActionOrEmotion: boolean;
  unnaturalJapaneseRisk: boolean;
  textTooGeneric: boolean;
  sentenceTooShortForAge: boolean;
};

function analyzeJapaneseTextHeuristics(text: string): JapaneseTextHeuristics {
  const normalized = text.replace(/\s+/g, "");
  const commonSoundWords = normalized.match(
    /(ころころ|わくわく|どきどき|きらきら|ふわふわ|さらさら|ぴかぴか|ぐるぐる|ごろごろ|ぺたぺた|しゃかしゃか|こしこし|にこにこ)/g
  ) ?? [];
  const placeWords = /(おへや|へや|まど|そら|こうえん|もり|みち|すなば|うみ|かわ|やま|にわ|キッチン|テーブル|ベッド|どうぶつえん|みずうみ|くも)/;
  const actionWords = /(ある|はし|みつけ|あつめ|つく|のぼ|すべ|ひろ|みつめ|さわ|のぞ|えら|あけ|もっ|ぎゅっ|ふり|わら|みた|きい|のった|とんだ|ひらいた|ひろが|ならべ|おいた|みせた|つたえ|かんがえ|みつめた)/;
  const emotionOrDiscoveryWords = /(うれ|かなし|ほっ|びっくり|わくわく|どきどき|にっこり|わら|えがお|みつけ|きづ|ふしぎ|あんしん|こわ|たのし)/;
  const coinedPatterns = /(こりころ|ふわりん|ころころこりころ|まきまきまきば|ぴかりん|きらりん)/;
  const hiraganaRatio = normalized.length > 0
    ? ((normalized.match(/[ぁ-ん]/g) ?? []).length / normalized.length)
    : 0;

  return {
    tooManySoundWords: commonSoundWords.length >= 3,
    textTooChildish: (commonSoundWords.length >= 2 && countJapaneseTextChars(text) < 80) || coinedPatterns.test(text),
    missingSceneDetail: !placeWords.test(text),
    missingActionOrEmotion: !(actionWords.test(text) || emotionOrDiscoveryWords.test(text)),
    unnaturalJapaneseRisk: coinedPatterns.test(text) || (hiraganaRatio > 0.92 && commonSoundWords.length >= 2),
    textTooGeneric:
      countJapaneseTextChars(text) < 45 &&
      countSentences(text) <= 3 &&
      (!actionWords.test(text) || !emotionOrDiscoveryWords.test(text)),
    sentenceTooShortForAge:
      countJapaneseTextChars(text) < 40 || countSentences(text) <= 2,
  };
}

function addStoryGoalConsistencyIssues(params: {
  story: GeneratedStory;
  readingProfile: AgeReadingProfile;
  issues: StoryQualityIssue[];
}): void {
  const { story, readingProfile, issues } = params;
  const isThreePlus = readingProfile.ageBand !== "baby_toddler";
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

  const mainQuestTokens = buildQuestTokens([story.mainQuestObject], { includeStarAliases: false });
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

  story.pages.forEach((page, pageIndex) => {
    const text = page.text ?? "";
    const normalized = text.replace(/\s+/g, "");
    const hasMainQuestSignal =
      mainQuestTokens.length === 0 || mainQuestTokens.some((token) => normalized.includes(token));
    const hasStoryGoalSignal =
      storyGoalTokens.length === 0 || storyGoalTokens.some((token) => normalized.includes(token));
    const forbiddenHits = forbiddenTokens.filter((token) => token && normalized.includes(token));
    const hiddenHits = hiddenDetailTokens.filter((token) => token && normalized.includes(token));
    const motifHits = visualMotifTokens.filter((token) => token && normalized.includes(token));

    if (!hasMainQuestSignal && !hasStoryGoalSignal && countJapaneseTextChars(text) >= 20) {
      issues.push({
        severity: pageIndex === 0 ? "warning" : "error",
        code: "page_text_not_connected_to_story_goal",
        message: "本文が storyGoal や mainQuestObject につながっていない可能性があります。",
        pageIndex,
      });
    }

    if (forbiddenHits.length > 0) {
      issues.push({
        severity: "error",
        code: "forbidden_object_became_goal",
        message: "除外対象の小物や背景要素が、本文の主目的として扱われています。",
        pageIndex,
        actual: forbiddenHits.join(", "),
      });
    }

    if (!hasMainQuestSignal && forbiddenHits.length > 0) {
      issues.push({
        severity: "error",
        code: "main_quest_drift",
        message: "物語の主目的が途中で別の対象にずれている可能性があります。",
        pageIndex,
      });
    }

    if ((hiddenHits.length > 0 || (forbiddenHits.length > 0 && Boolean(page.hiddenDetail?.trim()))) && !hasMainQuestSignal) {
      issues.push({
        severity: "warning",
        code: "hidden_detail_used_as_main_goal",
        message: "hiddenDetail が本文の主筋として使われている可能性があります。",
        pageIndex,
        actual: hiddenHits.join(", ") || page.hiddenDetail,
      });
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
  });
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
      ["星", "ほし", "ほしのこ", "ひかり", "キラキラ", "きらきら", "星のかけら"].forEach((token) => tokens.add(token));
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
        code: "cast_missing_page_linkage",
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

import type {
  BookInput,
  ContentModerationResult,
  ViolationCategory,
  UserAbuseStatus,
} from "./types";

const NG_WORDS: string[] = [
  "殺す",
  "ころす",
  "殺し",
  "死ね",
  "しね",
  "死ぬ",
  "しぬ",
  "セクシー",
  "エロ",
  "ヌード",
  "裸",
  "暴力",
  "ぼうりょく",
  "虐待",
  "いじめ",
  "麻薬",
  "まやく",
  "ドラッグ",
  "爆弾",
  "ばくだん",
  "kill",
  "murder",
  "sex",
  "nude",
  "violence",
  "drug",
  "bomb",
  "hate",
  "racist",
];

const MAX_NAME_LENGTH = 50;
const MAX_TEXT_LENGTH = 200;

export interface NGWordResult {
  safe: boolean;
  matchedWords: string[];
}

export interface SanitizeResult {
  valid: boolean;
  reason?: string;
}

export function containsNGWords(text: string): NGWordResult {
  if (!text) return { safe: true, matchedWords: [] };

  const matched = NG_WORDS.filter((word) => {
    const isEnglish = /^[a-z]+$/i.test(word);
    if (isEnglish) {
      const wordBoundaryRegex = new RegExp(`\\b${word}\\b`, "i");
      return wordBoundaryRegex.test(text);
    }
    // 日本語はそのまま includes（境界概念なし）
    return text.toLowerCase().includes(word.toLowerCase());
  });

  return { safe: matched.length === 0, matchedWords: matched };
}

export function sanitizeInput(input: BookInput): SanitizeResult {
  if (!input.childName || input.childName.trim().length === 0) {
    return { valid: false, reason: "子どもの名前は必須です" };
  }

  if (input.childName.length > MAX_NAME_LENGTH) {
    return { valid: false, reason: "名前が長すぎます" };
  }

  const fieldsToCheck = [
    input.childName,
    input.favorites,
    input.lessonToTeach,
    input.memoryToRecreate,
    input.characterLook,
    input.signatureItem,
    input.colorMood,
    input.place,
    input.familyMembers,
    input.season,
    input.parentMessage,
  ].filter((f): f is string => typeof f === "string");

  for (const field of fieldsToCheck) {
    if (field.length > MAX_TEXT_LENGTH) {
      return { valid: false, reason: "入力テキストが長すぎます" };
    }

    const ngResult = containsNGWords(field);
    if (!ngResult.safe) {
      return {
        valid: false,
        reason: `不適切な表現が含まれています: ${ngResult.matchedWords.join(", ")}`,
      };
    }
  }

  return { valid: true };
}

/**
 * Placeholder for LLM-based intent detection.
 * Analyzes the user's input for malicious intent, prompt injection, or policy violations.
 */
export async function detectAbusiveIntent(
  input: BookInput,
  options?: { apiKey: string }
): Promise<ContentModerationResult> {
  // TODO: Implement actual LLM call for intent detection.
  // For now, return a default safe result.
  return {
    status: "safe",
    categories: [],
    scoredBy: "llm",
    timestampMs: Date.now(),
  };
}

/**
 * Placeholder for evaluating user abuse status.
 * Determines if a user should be warned, restricted, or blocked based on their violation history.
 */
export function evaluateUserAbuseStatus(params: {
  currentStatus: UserAbuseStatus;
  violationCount: number;
  newViolation: ViolationCategory | null;
}): { nextStatus: UserAbuseStatus; shouldBlock: boolean } {
  // TODO: Implement actual logic for transitioning abuse status.
  return {
    nextStatus: params.currentStatus,
    shouldBlock: params.currentStatus === "blocked",
  };
}

import type { BookInput } from "./types";

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
// characterLook はユーザーの自由入力ではなく、アプリが生成する構造化ビジュアル記述
// （例: なかよしキャラ主人公時の visualDescription、~250字）が入るため、自由入力より
// 緩い上限にする。これを 200 字で弾くと、選択肢が多い相棒で生成が失敗していた。
const MAX_VISUAL_DESCRIPTION_LENGTH = 600;
// storyRequest（AIブリーフ+承認済みあらすじ）用の緩い上限。
const MAX_STORY_REQUEST_LENGTH = 2000;

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

  // characterLook は構造化ビジュアル記述なので別枠（緩い上限）で検証する。
  if (typeof input.characterLook === "string") {
    if (input.characterLook.length > MAX_VISUAL_DESCRIPTION_LENGTH) {
      return { valid: false, reason: "入力テキストが長すぎます" };
    }
    const ngLook = containsNGWords(input.characterLook);
    if (!ngLook.safe) {
      return {
        valid: false,
        reason: `不適切な表現が含まれています: ${ngLook.matchedWords.join(", ")}`,
      };
    }
  }

  const fieldsToCheck = [
    input.childName,
    input.favorites,
    input.lessonToTeach,
    input.memoryToRecreate,
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

  // storyRequest は AIブリーフ（あらすじピッチ承認後の起承転結全文）を含む
  // アプリ生成の長文フィールドのため、自由入力より緩い上限で検査する。
  // freeInput（UI 上限200字）も NG ワード検査の対象に含める。
  const longTextFields = [input.storyRequest, input.freeInput].filter(
    (f): f is string => typeof f === "string"
  );
  for (const field of longTextFields) {
    if (field.length > MAX_STORY_REQUEST_LENGTH) {
      return { valid: false, reason: "おはなしのリクエストが長すぎます" };
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

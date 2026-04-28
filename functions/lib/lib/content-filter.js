"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.containsNGWords = containsNGWords;
exports.sanitizeInput = sanitizeInput;
const NG_WORDS = [
    "殺す",
    "殺し",
    "死ね",
    "死ぬ",
    "セクシー",
    "エロ",
    "ヌード",
    "裸",
    "暴力",
    "虐待",
    "いじめ",
    "麻薬",
    "ドラッグ",
    "kill",
    "murder",
    "sex",
    "nude",
    "violence",
    "drug",
];
const MAX_NAME_LENGTH = 50;
const MAX_TEXT_LENGTH = 200;
function containsNGWords(text) {
    if (!text)
        return { safe: true, matchedWords: [] };
    const lower = text.toLowerCase();
    const matched = NG_WORDS.filter((word) => lower.includes(word.toLowerCase()));
    return { safe: matched.length === 0, matchedWords: matched };
}
function sanitizeInput(input) {
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
    ].filter((f) => typeof f === "string");
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
//# sourceMappingURL=content-filter.js.map
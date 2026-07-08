/**
 * 作成フローで「つくる」を押す前に入力長を検証し、サーバーの content-filter で
 * 弾かれる前にユーザーへ知らせる（"入力テキストが長すぎます" を生成後ではなく決定時に表示）。
 * サーバー側 (functions/src/lib/content-filter.ts) の上限とそろえる。
 */
const MAX_NAME_LENGTH = 50;
const MAX_TEXT_LENGTH = 200;
const MAX_VISUAL_DESCRIPTION_LENGTH = 600;
// storyRequest は AIブリーフ（あらすじピッチ承認後の「起承転結」全文）を含む
// アプリ生成の長文フィールド。200字制限だとおまかせ生成がほぼ必ず弾かれる。
const MAX_STORY_REQUEST_LENGTH = 2000;

// アプリが自動生成する構造化ビジュアル記述は自由入力より長くなるため緩い上限。
const LONG_FIELDS = new Set(["characterLook", "companionVisualDescription"]);

export interface InputValidationResult {
  valid: boolean;
  message?: string;
}

export function validateBookInputLengths(
  input: Record<string, unknown> | undefined | null
): InputValidationResult {
  if (!input) return { valid: true };
  for (const [key, value] of Object.entries(input)) {
    if (typeof value !== "string") continue;
    if (key === "childName") {
      if (value.length > MAX_NAME_LENGTH) {
        return { valid: false, message: `お名前は${MAX_NAME_LENGTH}文字以内で入力してください。` };
      }
    } else if (key === "storyRequest") {
      if (value.length > MAX_STORY_REQUEST_LENGTH) {
        return {
          valid: false,
          message: "おはなしのリクエストが長すぎます。内容を少し短くしてください。",
        };
      }
    } else if (LONG_FIELDS.has(key)) {
      if (value.length > MAX_VISUAL_DESCRIPTION_LENGTH) {
        return { valid: false, message: "キャラクターの説明が長すぎます。短くしてください。" };
      }
    } else if (value.length > MAX_TEXT_LENGTH) {
      return {
        valid: false,
        message: `入力が長すぎます（${MAX_TEXT_LENGTH}文字以内）。短くしてからもう一度おためしください。`,
      };
    }
  }
  return { valid: true };
}

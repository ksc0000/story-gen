import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { extractJsonFromLLMResponse } from "./lib/llm-json-repair";
import { isRateLimited } from "./lib/rate-limit";

const geminiApiKey = defineSecret("GEMINI_API_KEY");

const RATE_LIMIT_ANALYZE_PHOTO = {
  maxRequests: 15,
  windowSeconds: 300, // 5 minutes
};

// 送信画像の上限（base64 文字列長）。クライアントで縮小して送る前提の保険。
const MAX_IMAGE_BASE64_LENGTH = 8_000_000; // ~6MB decoded

export type GenderExpression = "boy" | "girl" | "neutral" | "unspecified";

export interface AnalyzeChildPhotoInput {
  /** 縮小済み画像の base64（data URL 接頭辞なし） */
  imageBase64: string;
  /** 例: "image/jpeg" | "image/png" | "image/webp" */
  mimeType: string;
}

/** 写真から起こした、絵本キャラ用プロフィールの下書き。 */
export interface ChildProfileDraft {
  characterLook: string;
  outfit: string;
  colorMood: string;
  ageGuess: number | null;
  genderExpression: GenderExpression;
}

const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);
const ALLOWED_GENDER: GenderExpression[] = ["boy", "girl", "neutral", "unspecified"];

function buildSystemPrompt(): string {
  return [
    "あなたは子ども向け絵本のキャラクターデザイナーです。",
    "保護者がアップロードした写真を見て、その人を『やさしい絵本の子どもキャラクター』として描くための、見た目の下書きメモを作ります。",
    "",
    "【重要な安全・プライバシー原則】",
    "- 写真の人物を特定・実名化しないでください。個人を認識・照合しないでください。",
    "- 人種・民族・国籍・健康状態などのセンシティブ属性は推測・記載しないでください。",
    "- 写真をそっくり再現するのではなく、あくまで『イラストの子どもキャラ』に変換する前提の、一般的な特徴のみを記述してください。",
    "- 写真に大人が写っている場合は、その人が子どもだった頃をやさしく想像して、子どものキャラクターとして記述してください。",
    "- すべて子どもに安全で、あたたかい絵本のトーンにしてください。",
    "",
    "【記述する内容】",
    "- characterLook: 髪型・髪色の方向性・顔の輪郭の印象・目もとの雰囲気・メガネの有無など、イラスト化に役立つやさしい日本語の短い描写（例: 『短い黒髪、丸いほっぺ、にこにこした目もと』）。",
    "- outfit: よく似合いそうな普段着の印象（例: 『青いオーバーオール』）。写真の服を厳密にコピーしない。",
    "- colorMood: 全体の色や雰囲気（例: 『やさしいパステル』）。",
    "- ageGuess: 見た目のおおよその年齢（1〜10の整数）。分からなければ null。",
    "- genderExpression: 見た目の性別表現。断定できない場合は必ず 'unspecified'。値は boy / girl / neutral / unspecified のいずれか。",
    "",
    "JSONのみで回答してください（前後の説明文は不要）。",
  ].join("\n");
}

function buildUserPrompt(): string {
  return [
    "この写真をもとに、絵本キャラ用プロフィールの下書きを作ってください。",
    "以下のJSON形式のみで回答してください：",
    "```json",
    JSON.stringify(
      {
        characterLook: "髪型・顔立ち・特徴をやさしい日本語で短く",
        outfit: "似合いそうな普段着の印象",
        colorMood: "全体の色や雰囲気",
        ageGuess: 4,
        genderExpression: "unspecified",
      },
      null,
      2
    ),
    "```",
  ].join("\n");
}

export function validateInput(data: AnalyzeChildPhotoInput): void {
  if (!data?.imageBase64 || typeof data.imageBase64 !== "string") {
    throw new HttpsError("invalid-argument", "imageBase64 is required");
  }
  if (data.imageBase64.length > MAX_IMAGE_BASE64_LENGTH) {
    throw new HttpsError("invalid-argument", "画像サイズが大きすぎます。もう少し小さい写真でお試しください。");
  }
  if (!data.mimeType || !ALLOWED_MIME.has(data.mimeType)) {
    throw new HttpsError("invalid-argument", "対応していない画像形式です（JPEG / PNG / WebP のみ）。");
  }
}

export function coerceAge(value: unknown): number | null {
  if (typeof value !== "number" && typeof value !== "string") return null;
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return null;
  const rounded = Math.round(n);
  if (rounded < 0 || rounded > 12) return null;
  return rounded;
}

export function coerceGender(value: unknown): GenderExpression {
  return ALLOWED_GENDER.includes(value as GenderExpression)
    ? (value as GenderExpression)
    : "unspecified";
}

export const analyzeChildPhoto = onCall(
  {
    region: "asia-northeast1",
    timeoutSeconds: 40,
    secrets: [geminiApiKey],
  },
  async (request): Promise<ChildProfileDraft> => {
    const uid = request.auth?.uid;
    if (!uid) {
      throw new HttpsError("unauthenticated", "Authentication required");
    }

    const data = request.data as AnalyzeChildPhotoInput;
    validateInput(data);

    const isAdmin = request.auth?.token.admin === true;
    const limited = await isRateLimited(
      admin.firestore(),
      uid,
      "analyze_child_photo",
      RATE_LIMIT_ANALYZE_PHOTO,
      isAdmin
    );
    if (limited) {
      logger.warn("analyzeChildPhoto: rate limited", { uid });
      throw new HttpsError(
        "resource-exhausted",
        "リクエストが多すぎます。少し時間をおいてから、もう一度お試しください。"
      );
    }

    const apiKey = geminiApiKey.value();
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      systemInstruction: buildSystemPrompt(),
    });

    try {
      const result = await model.generateContent([
        { inlineData: { mimeType: data.mimeType, data: data.imageBase64 } },
        { text: buildUserPrompt() },
      ]);
      const text = result.response.text();
      const repair = extractJsonFromLLMResponse(text);

      if (repair.status === "unrepairable" || !repair.parsed) {
        logger.warn("analyzeChildPhoto: could not extract JSON", { status: repair.status });
        throw new HttpsError(
          "internal",
          "写真の解析結果を取得できませんでした。もう一度お試しください。"
        );
      }

      const parsed = repair.parsed as Record<string, unknown>;
      return {
        characterLook: String(parsed.characterLook ?? "").slice(0, 200),
        outfit: String(parsed.outfit ?? "").slice(0, 100),
        colorMood: String(parsed.colorMood ?? "").slice(0, 100),
        ageGuess: coerceAge(parsed.ageGuess),
        genderExpression: coerceGender(parsed.genderExpression),
      };
    } catch (err) {
      if (err instanceof HttpsError) throw err;
      logger.error("analyzeChildPhoto: unexpected error", { error: String(err) });
      throw new HttpsError(
        "internal",
        "写真の解析に失敗しました。もう一度お試しください。"
      );
    }
  }
);

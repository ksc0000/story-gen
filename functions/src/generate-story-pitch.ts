import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { extractJsonFromLLMResponse } from "./lib/llm-json-repair";
import { isRateLimited } from "./lib/rate-limit";

const geminiApiKey = defineSecret("GEMINI_API_KEY");

const RATE_LIMIT_STORY_PITCH = {
  maxRequests: 10,
  windowSeconds: 300, // 5 minutes
};

export interface StoryPitch {
  title: string;
  intro: string;      // 起
  rising: string;     // 承
  climax: string;     // 転
  resolution: string; // 結
}

export interface GenerateStoryPitchInput {
  protagonistName: string;
  storyBrief: string;
  pageCount: number;
  protagonistType: "child" | "original_character" | "companion";
  /** 「もう少し変えたい」で使う修正要望（省略可）*/
  refinementRequest?: string;
  /** 相棒キャラクターの情報 */
  companionName?: string;
  companionVisualDescription?: string;
}

// ---------------------------------------------------------------------------
// Prompt builders
// ---------------------------------------------------------------------------

function buildPitchSystemPrompt(): string {
  return [
    "あなたはプロの絵本作家です。与えられたアイデアをもとに、子ども向け絵本のあらすじを考えます。",
    "ルール：",
    "- 子ども向けの安全で温かいストーリー",
    "- 起承転結がはっきりしている",
    "- 読み応えがあり、大人が読み聞かせても楽しい",
    "- 架空のキャラクターの場合は動物や魔法の生き物でもOK",
    "- JSONのみで回答する（前後の説明文不要）",
  ].join("\n");
}

function buildPitchUserPrompt(input: GenerateStoryPitchInput): string {
  const {
    protagonistName,
    storyBrief,
    pageCount,
    protagonistType,
    refinementRequest,
    companionName,
    companionVisualDescription,
  } = input;
  const protagonistDesc =
    protagonistType === "child"
      ? `${protagonistName}（実在の子どもを主人公にした絵本）`
      : protagonistType === "companion"
        ? `${protagonistName}（なかよしキャラ・動物や生き物が主人公の絵本。子どもは登場しない）`
        : `${protagonistName}（架空のキャラクター）`;

  const lines = [
    `主人公: ${protagonistDesc}`,
    companionName && companionVisualDescription
      ? `相棒キャラクター: ${companionName}（${companionVisualDescription}）。必ず物語に登場させ、主人公と一緒に活動させてください。`
      : "",
    `ページ数: ${pageCount}ページ`,
    `アイデア: ${storyBrief}`,
  ].filter(Boolean);

  if (refinementRequest?.trim()) {
    lines.push(`\n修正要望: ${refinementRequest.trim()}`);
  }

  lines.push(
    "",
    "以下のJSON形式のみで回答してください：",
    "```json",
    JSON.stringify(
      {
        title: "絵本のタイトル（ひらがな・カタカナ多め）",
        intro: "起：物語の始まりを1〜2文で",
        rising: "承：展開・変化を1〜2文で",
        climax: "転：クライマックスや転換点を1〜2文で",
        resolution: "結：解決と余韻を1〜2文で",
      },
      null,
      2
    ),
    "```"
  );

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

function validateInput(data: GenerateStoryPitchInput): void {
  if (!data.protagonistName?.trim()) {
    throw new HttpsError("invalid-argument", "protagonistName is required");
  }
  if (data.protagonistName.length > 50) {
    throw new HttpsError("invalid-argument", "protagonistName too long");
  }
  if (!data.storyBrief?.trim() || data.storyBrief.trim().length < 5) {
    throw new HttpsError("invalid-argument", "storyBrief is required");
  }
  if (data.storyBrief.length > 800) {
    throw new HttpsError("invalid-argument", "storyBrief too long");
  }
  if (data.refinementRequest && data.refinementRequest.length > 400) {
    throw new HttpsError("invalid-argument", "refinementRequest too long");
  }
}

// ---------------------------------------------------------------------------
// Callable function
// ---------------------------------------------------------------------------

export const generateStoryPitch = onCall(
  {
    region: "asia-northeast1",
    timeoutSeconds: 30,
    secrets: [geminiApiKey],
    enforceAppCheck: true,
  },
  async (request): Promise<StoryPitch> => {
    const uid = request.auth?.uid;
    if (!uid) {
      throw new HttpsError("unauthenticated", "Authentication required");
    }

    const data = request.data as GenerateStoryPitchInput;
    validateInput(data);

    // Rate limiting
    const isAdmin = request.auth?.token.admin === true;
    const limited = await isRateLimited(
      admin.firestore(),
      uid,
      "generate_story_pitch",
      RATE_LIMIT_STORY_PITCH,
      isAdmin
    );

    if (limited) {
      logger.warn("generateStoryPitch: rate limited", { uid });
      throw new HttpsError(
        "resource-exhausted",
        "リクエストが多すぎます。少し時間をおいてから、もう一度お試しください。"
      );
    }

    const apiKey = geminiApiKey.value();
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash-lite",
      systemInstruction: buildPitchSystemPrompt(),
    });

    const prompt = buildPitchUserPrompt(data);

    try {
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      const repairResult = extractJsonFromLLMResponse(text);

      if (repairResult.status === "unrepairable" || !repairResult.parsed) {
        logger.warn("generateStoryPitch: could not extract JSON from response", {
          status: repairResult.status,
        });
        throw new HttpsError(
          "internal",
          "ストーリーの提案を取得できませんでした。もう一度お試しください。"
        );
      }

      const parsed = repairResult.parsed as Record<string, unknown>;
      if (
        !parsed.title ||
        !parsed.intro ||
        !parsed.rising ||
        !parsed.climax ||
        !parsed.resolution
      ) {
        throw new HttpsError(
          "internal",
          "ストーリーの提案を取得できませんでした。もう一度お試しください。"
        );
      }

      return {
        title: String(parsed.title).slice(0, 100),
        intro: String(parsed.intro).slice(0, 300),
        rising: String(parsed.rising).slice(0, 300),
        climax: String(parsed.climax).slice(0, 300),
        resolution: String(parsed.resolution).slice(0, 300),
      };
    } catch (err) {
      if (err instanceof HttpsError) throw err;
      logger.error("generateStoryPitch: unexpected error", { error: String(err) });
      throw new HttpsError(
        "internal",
        "ストーリーの提案生成に失敗しました。もう一度お試しください。"
      );
    }
  }
);

import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";
import type {
  GeneratedStory,
  LLMClient,
  PageCount,
  IllustrationStyle,
  PageVisualRole,
} from "./types";
import { PAGE_VISUAL_ROLES } from "./types";

const DEFAULT_STORY_MODEL_PRIMARY = "gemini-2.5-flash-lite";
const DEFAULT_STORY_MODEL_FALLBACKS = ["gemini-2.5-flash", "gemini-2.0-flash"];
const GEMINI_MAX_RETRIES = 3;
const GEMINI_BASE_DELAY_MS = 1_000;
const GEMINI_JITTER_MS = 500;

const SAFETY_SETTINGS = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE },
];

export class GeminiServiceUnavailableError extends Error {
  retryable = true;
  reason: "service_unavailable" | "rate_limited" | "overloaded" | "unknown";
  modelNamesTried: string[];
  totalAttempts: number;
  technicalMessage: string;

  constructor(params: {
    message: string;
    reason: "service_unavailable" | "rate_limited" | "overloaded" | "unknown";
    modelNamesTried: string[];
    totalAttempts: number;
    technicalMessage: string;
  }) {
    super(params.message);
    this.name = "GeminiServiceUnavailableError";
    this.reason = params.reason;
    this.modelNamesTried = params.modelNamesTried;
    this.totalAttempts = params.totalAttempts;
    this.technicalMessage = params.technicalMessage;
  }
}

function extractJSON(text: string): string {
  const codeBlockMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (codeBlockMatch) return codeBlockMatch[1].trim();
  return text.trim();
}

function shouldDelayGeminiRetries(): boolean {
  return process.env.NODE_ENV !== "test";
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getStoryModelCandidates(): string[] {
  const primary = process.env.GEMINI_STORY_MODEL_PRIMARY?.trim() || DEFAULT_STORY_MODEL_PRIMARY;
  const fallbackCsv = process.env.GEMINI_STORY_MODEL_FALLBACKS?.trim();
  const fallbacks = fallbackCsv
    ? fallbackCsv.split(",").map((value) => value.trim()).filter(Boolean)
    : DEFAULT_STORY_MODEL_FALLBACKS;
  return [...new Set([primary, ...fallbacks])];
}

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) {
    return err.message;
  }

  if (typeof err === "string") {
    return err;
  }

  return JSON.stringify(err);
}

function getRetryableGeminiReason(
  err: unknown
): "service_unavailable" | "rate_limited" | "overloaded" | "unknown" | null {
  const message = getErrorMessage(err).toLowerCase();
  const status = typeof err === "object" && err !== null ? String((err as { status?: unknown }).status ?? "") : "";

  if (
    status === "429" ||
    message.includes("[429") ||
    message.includes("rate limit") ||
    message.includes("too many requests")
  ) {
    return "rate_limited";
  }

  if (
    status === "503" ||
    message.includes("[503") ||
    message.includes("service unavailable") ||
    message.includes("high demand") ||
    message.includes("unavailable")
  ) {
    return message.includes("high demand") || message.includes("overloaded")
      ? "overloaded"
      : "service_unavailable";
  }

  if (
    ["500", "502", "504"].includes(status) ||
    message.includes("[500") ||
    message.includes("[502") ||
    message.includes("[504")
  ) {
    return "service_unavailable";
  }

  if (message.includes("overloaded")) {
    return "overloaded";
  }

  return null;
}

export function defaultPageVisualRole(
  pageIndex: number,
  totalPages: number
): PageVisualRole {
  if (pageIndex === 0) return "opening_establishing";
  if (pageIndex === totalPages - 1) return "quiet_ending";
  if (totalPages >= 4 && pageIndex === totalPages - 2) return "payoff";
  if (pageIndex === 1) return "discovery";
  return "action";
}

export function normalizePageVisualRole(
  value: unknown,
  pageIndex: number,
  totalPages: number
): PageVisualRole {
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();

    if (PAGE_VISUAL_ROLES.includes(normalized as PageVisualRole)) {
      return normalized as PageVisualRole;
    }

    const aliasMap: Record<string, PageVisualRole> = {
      opening: "opening_establishing",
      establishing: "opening_establishing",
      establishing_shot: "opening_establishing",
      wide_shot: "opening_establishing",
      wide: "opening_establishing",
      intro: "opening_establishing",
      discover: "discovery",
      finding: "discovery",
      find: "discovery",
      action_scene: "action",
      movement: "action",
      play: "action",
      closeup: "emotional_closeup",
      close_up: "emotional_closeup",
      emotional: "emotional_closeup",
      emotion_closeup: "emotional_closeup",
      object: "object_detail",
      detail: "object_detail",
      detail_shot: "object_detail",
      hands: "object_detail",
      question: "setback_or_question",
      setback: "setback_or_question",
      conflict: "setback_or_question",
      challenge: "setback_or_question",
      ending: "quiet_ending",
      quiet_end: "quiet_ending",
      final: "quiet_ending",
      resolution: "payoff",
      payoff_scene: "payoff",
    };

    if (aliasMap[normalized]) {
      return aliasMap[normalized];
    }

    console.warn(`Unknown pageVisualRole '${value}' on page ${pageIndex + 1}; using default.`);
  }

  return defaultPageVisualRole(pageIndex, totalPages);
}

function validateStory(data: unknown): GeneratedStory {
  if (typeof data !== "object" || data === null) throw new Error("LLM response is not an object");
  const obj = data as Record<string, unknown>;
  if (typeof obj.title !== "string") throw new Error("LLM response missing 'title' string");
  if (typeof obj.characterBible !== "string") throw new Error("LLM response missing 'characterBible' string");
  if (typeof obj.styleBible !== "string") throw new Error("LLM response missing 'styleBible' string");
  if (!Array.isArray(obj.pages) || obj.pages.length === 0) throw new Error("LLM response missing 'pages' array");

  const pages = obj.pages as unknown[];
  const normalizedPages = pages.map((page, index) => {
    if (typeof page !== "object" || page === null) {
      throw new Error("Each page must be an object");
    }

    const pageObj = page as Record<string, unknown>;
    if (typeof pageObj.text !== "string" || typeof pageObj.imagePrompt !== "string") {
      throw new Error("Each page must have 'text' and 'imagePrompt' strings");
    }
    if (pageObj.compositionHint !== undefined && typeof pageObj.compositionHint !== "string") {
      throw new Error("Page 'compositionHint' must be a string when provided");
    }
    if (pageObj.visualMotifUsage !== undefined && typeof pageObj.visualMotifUsage !== "string") {
      throw new Error("Page 'visualMotifUsage' must be a string when provided");
    }
    if (pageObj.hiddenDetail !== undefined && typeof pageObj.hiddenDetail !== "string") {
      throw new Error("Page 'hiddenDetail' must be a string when provided");
    }
    if (pageObj.pageVisualRole !== undefined && typeof pageObj.pageVisualRole !== "string") {
      throw new Error("Page 'pageVisualRole' must be a string when provided");
    }

    return {
      text: pageObj.text,
      imagePrompt: pageObj.imagePrompt,
      compositionHint: pageObj.compositionHint,
      visualMotifUsage: pageObj.visualMotifUsage,
      hiddenDetail: pageObj.hiddenDetail,
      pageVisualRole: normalizePageVisualRole(pageObj.pageVisualRole, index, pages.length),
    };
  });

  let narrativeDevice = undefined;
  if (obj.narrativeDevice !== undefined) {
    if (typeof obj.narrativeDevice !== "object" || obj.narrativeDevice === null) {
      throw new Error("'narrativeDevice' must be an object when provided");
    }
    const device = obj.narrativeDevice as Record<string, unknown>;
    if (device.repeatedPhrase !== undefined && typeof device.repeatedPhrase !== "string") {
      throw new Error("'narrativeDevice.repeatedPhrase' must be a string when provided");
    }
    if (device.visualMotif !== undefined && typeof device.visualMotif !== "string") {
      throw new Error("'narrativeDevice.visualMotif' must be a string when provided");
    }
    if (device.setup !== undefined && typeof device.setup !== "string") {
      throw new Error("'narrativeDevice.setup' must be a string when provided");
    }
    if (device.payoff !== undefined && typeof device.payoff !== "string") {
      throw new Error("'narrativeDevice.payoff' must be a string when provided");
    }
    if (
      device.hiddenDetails !== undefined &&
      (!Array.isArray(device.hiddenDetails) || !device.hiddenDetails.every((item) => typeof item === "string"))
    ) {
      throw new Error("'narrativeDevice.hiddenDetails' must be a string array when provided");
    }
    narrativeDevice = device;
  }

  return {
    title: obj.title,
    characterBible: obj.characterBible,
    styleBible: obj.styleBible,
    narrativeDevice: narrativeDevice as GeneratedStory["narrativeDevice"],
    storyModel: typeof obj.storyModel === "string" ? obj.storyModel : undefined,
    storyModelFallbackUsed:
      typeof obj.storyModelFallbackUsed === "boolean" ? obj.storyModelFallbackUsed : undefined,
    storyGenerationAttempts:
      typeof obj.storyGenerationAttempts === "number" ? obj.storyGenerationAttempts : undefined,
    pages: normalizedPages,
  };
}

async function generateContentWithRetry(params: {
  generateContent: (request: {
    contents: Array<{ role: "user"; parts: Array<{ text: string }> }>;
    systemInstruction: { role: "system"; parts: Array<{ text: string }> };
    generationConfig: { responseMimeType: "application/json" };
  }) => Promise<{ response: { text: () => string } }>;
  request: {
    contents: Array<{ role: "user"; parts: Array<{ text: string }> }>;
    systemInstruction: { role: "system"; parts: Array<{ text: string }> };
    generationConfig: { responseMimeType: "application/json" };
  };
  modelName: string;
}): Promise<{ response: { text: () => string }; attempts: number }> {
  let attempt = 0;

  while (true) {
    attempt += 1;
    try {
      const result = await params.generateContent(params.request);
      return {
        response: result.response,
        attempts: attempt,
      };
    } catch (err) {
      const retryReason = getRetryableGeminiReason(err);
      const canRetry = retryReason !== null && attempt <= GEMINI_MAX_RETRIES;

      console.warn("Gemini story generation attempt failed", {
        model: params.modelName,
        attempt,
        retryable: retryReason !== null,
        error: getErrorMessage(err),
      });

      if (!canRetry) {
        throw err;
      }

      if (shouldDelayGeminiRetries()) {
        const jitter = Math.floor(Math.random() * GEMINI_JITTER_MS);
        const delayMs = GEMINI_BASE_DELAY_MS * 2 ** (attempt - 1) + jitter;
        await sleep(delayMs);
      }
    }
  }
}

export class GeminiClient implements LLMClient {
  private genAI: GoogleGenerativeAI;

  constructor(apiKey: string) {
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  async generateStory(params: {
    systemPrompt: string; childName: string; childAge?: number; favorites?: string;
    lessonToTeach?: string; memoryToRecreate?: string; characterLook?: string;
    signatureItem?: string; colorMood?: string; place?: string; familyMembers?: string;
    season?: string; parentMessage?: string; storyRequest?: string; pageCount: PageCount; style: IllustrationStyle;
  }): Promise<GeneratedStory> {
    const userParts: string[] = [`主人公の名前: ${params.childName}`];
    if (params.storyRequest) userParts.push(`今回の絵本で描きたいこと: ${params.storyRequest}`);
    if (params.childAge !== undefined) userParts.push(`年齢: ${params.childAge}歳`);
    if (params.favorites) userParts.push(`好きなもの: ${params.favorites}`);
    if (params.lessonToTeach) userParts.push(`教えたいこと: ${params.lessonToTeach}`);
    if (params.memoryToRecreate) userParts.push(`再現したい思い出: ${params.memoryToRecreate}`);
    if (params.characterLook) userParts.push(`主人公の見た目: ${params.characterLook}`);
    if (params.signatureItem) userParts.push(`毎ページに出したい持ち物・服装: ${params.signatureItem}`);
    if (params.colorMood) userParts.push(`色や雰囲気: ${params.colorMood}`);
    if (params.place) userParts.push(`場所: ${params.place}`);
    if (params.familyMembers) userParts.push(`一緒に登場させたい人: ${params.familyMembers}`);
    if (params.season) userParts.push(`季節・時期: ${params.season}`);
    if (params.parentMessage) userParts.push(`最後に伝えたい言葉: ${params.parentMessage}`);
    userParts.push(`ページ数: ${params.pageCount}ページ`);

    const request = {
      contents: [{ role: "user" as const, parts: [{ text: userParts.join("\n") }] }],
      systemInstruction: { role: "system" as const, parts: [{ text: params.systemPrompt }] },
      generationConfig: { responseMimeType: "application/json" as const },
    };

    const modelCandidates = getStoryModelCandidates();
    const modelNamesTried: string[] = [];
    let totalAttempts = 0;
    let lastRetryableReason: "service_unavailable" | "rate_limited" | "overloaded" | "unknown" =
      "unknown";
    let lastRetryableMessage = "";

    for (const [index, modelName] of modelCandidates.entries()) {
      modelNamesTried.push(modelName);
      const model = this.genAI.getGenerativeModel({ model: modelName, safetySettings: SAFETY_SETTINGS });

      try {
        const result = await generateContentWithRetry({
          generateContent: model.generateContent.bind(model),
          request,
          modelName,
        });

        totalAttempts += result.attempts;
        const rawText = result.response.text();
        const jsonStr = extractJSON(rawText);
        let parsed: unknown;
        try {
          parsed = JSON.parse(jsonStr);
        } catch {
          throw new Error(`Failed to parse LLM JSON response: ${rawText.slice(0, 200)}`);
        }

        const validated = validateStory(parsed);
        return {
          ...validated,
          storyModel: modelName,
          storyModelFallbackUsed: index > 0,
          storyGenerationAttempts: totalAttempts,
        };
      } catch (err) {
        const retryReason = getRetryableGeminiReason(err);
        const message = getErrorMessage(err);
        const lastAttemptCount = retryReason !== null ? GEMINI_MAX_RETRIES + 1 : 1;
        totalAttempts += lastAttemptCount;

        if (retryReason !== null) {
          lastRetryableReason = retryReason;
          lastRetryableMessage = message;
          if (index < modelCandidates.length - 1) {
            console.warn("Switching Gemini story model after retryable failure", {
              fromModel: modelName,
              nextModel: modelCandidates[index + 1],
              reason: retryReason,
              error: message,
            });
            continue;
          }

          throw new GeminiServiceUnavailableError({
            message:
              "現在、ストーリー生成AIが混み合っています。少し時間をおいて、同じ内容で再作成してください。",
            reason: lastRetryableReason,
            modelNamesTried,
            totalAttempts,
            technicalMessage: lastRetryableMessage,
          });
        }

        throw err;
      }
    }

    throw new GeminiServiceUnavailableError({
      message:
        "現在、ストーリー生成AIが混み合っています。少し時間をおいて、同じ内容で再作成してください。",
      reason: lastRetryableReason,
      modelNamesTried,
      totalAttempts,
      technicalMessage: lastRetryableMessage || "Unknown Gemini story generation failure",
    });
  }
}

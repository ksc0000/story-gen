import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";
import type { ResponseSchema } from "@google/generative-ai";
import { extractJsonFromLLMResponse } from "./llm-json-repair";
import { STORY_RESPONSE_SCHEMA } from "./story-response-schema";
import type {
  GeneratedStory,
  LLMClient,
  PageCount,
  IllustrationStyle,
  PageVisualRole,
  ProductPlan,
  CreationMode,
  StoryCharacter,
  StoryCharacterRole,
  StoryCharacterKind,
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

type GeminiRetryReason = "service_unavailable" | "rate_limited" | "overloaded" | "unknown";

export class GeminiServiceUnavailableError extends Error {
  retryable = true;
  reason: GeminiRetryReason;
  modelNamesTried: string[];
  totalAttempts: number;
  technicalMessage: string;

  constructor(params: {
    message: string;
    reason: GeminiRetryReason;
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

/**
 * P4-5: Feature flag — enables the enhanced extractJsonFromLLMResponse() parser
 * and the one-shot schema repair retry in generate-book.ts.
 * Default: off. Enable via ENABLE_SCHEMA_REPAIR_RETRY=true env var.
 */
function isSchemaRepairEnabled(): boolean {
  return process.env.ENABLE_SCHEMA_REPAIR_RETRY === "true";
}

/**
 * P4-11: Feature flag — includes STORY_RESPONSE_SCHEMA in Gemini generationConfig.
 * When enabled, Gemini's structured output API enforces the JSON schema at the
 * model output layer. validateStory() remains the runtime source of truth.
 * Default: off. Enable via ENABLE_RESPONSE_SCHEMA=true env var.
 */
export function isResponseSchemaEnabled(): boolean {
  return process.env.ENABLE_RESPONSE_SCHEMA === "true";
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getStoryModelCandidatesFromEnv(): string[] {
  const primary = process.env.GEMINI_STORY_MODEL_PRIMARY?.trim() || DEFAULT_STORY_MODEL_PRIMARY;
  const fallbackCsv = process.env.GEMINI_STORY_MODEL_FALLBACKS?.trim();
  const fallbacks = fallbackCsv
    ? fallbackCsv.split(",").map((value) => value.trim()).filter(Boolean)
    : DEFAULT_STORY_MODEL_FALLBACKS;
  return [...new Set([primary, ...fallbacks])];
}

export function resolveStoryModelCandidates(params: {
  productPlan?: ProductPlan;
  creationMode?: CreationMode;
  theme?: string;
  categoryGroupId?: string;
}): string[] {
  const isMemory = params.theme === "memory" || params.categoryGroupId === "memories";

  if (params.creationMode === "original_ai" || params.productPlan === "premium_paid" || isMemory) {
    return ["gemini-2.5-pro", "gemini-2.5-flash"];
  }

  if (params.productPlan === "standard_paid") {
    return ["gemini-2.5-flash", "gemini-2.5-pro"];
  }

  return ["gemini-2.5-flash", "gemini-2.0-flash"];
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

function getRetryableGeminiReason(err: unknown): GeminiRetryReason | null {
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

function normalizeStoryCharacterRole(value: unknown): StoryCharacterRole {
  if (typeof value !== "string") {
    return "buddy";
  }

  const normalized = value.trim().toLowerCase();
  const allowed: StoryCharacterRole[] = [
    "protagonist",
    "buddy",
    "parent",
    "sibling",
    "animal",
    "magical_friend",
    "object_character",
    "background_recurring",
  ];

  if (allowed.includes(normalized as StoryCharacterRole)) {
    return normalized as StoryCharacterRole;
  }

  if (normalized.includes("animal")) return "animal";
  if (normalized.includes("magic")) return "magical_friend";
  if (normalized.includes("object")) return "object_character";
  if (normalized.includes("background")) return "background_recurring";

  return "buddy";
}

function normalizeStoryCharacterKind(
  value: unknown,
  role: StoryCharacterRole
): StoryCharacterKind | undefined {
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    const allowed: StoryCharacterKind[] = [
      "human_child",
      "human_adult",
      "animal",
      "magical_creature",
      "object_character",
      "background",
    ];
    if (allowed.includes(normalized as StoryCharacterKind)) {
      return normalized as StoryCharacterKind;
    }
  }

  if (role === "protagonist") return "human_child";
  if (role === "parent") return "human_adult";
  if (role === "animal") return "animal";
  if (role === "object_character") return "object_character";
  if (role === "background_recurring") return "background";
  if (role === "magical_friend" || role === "buddy") return "magical_creature";
  return undefined;
}

/**
 * P4-12a: Coerce explicit null (from Gemini responseSchema structured output)
 * to undefined so optional nullable fields pass existing type checks.
 */
function nullToUndefined<T>(value: T | null | undefined): T | undefined {
  return value === null ? undefined : value;
}

function validateStringArray(
  value: unknown,
  errorLabel: string
): string[] | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }
  if (!Array.isArray(value) || !value.every((item) => typeof item === "string")) {
    throw new Error(`${errorLabel} must be a string array when provided`);
  }
  return value as string[];
}

function isKnownCharacterId(id: string, castIds: Set<string>) {
  return id === "child_protagonist" || castIds.has(id);
}

export function normalizeAppearingCharacterIds(
  value: unknown,
  castIds: Set<string>,
  pageIndex: number
): string[] | undefined {
  const rawValues = Array.isArray(value) ? value : typeof value === "string" ? [value] : [];
  const normalized = rawValues
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean)
    .filter((item, index, array) => array.indexOf(item) === index)
    .filter((item) => {
      if (isKnownCharacterId(item, castIds)) {
        return true;
      }
      console.warn(
        `Unknown appearingCharacterId '${item}' on page ${pageIndex + 1}; keeping page data and ignoring for cast consistency.`
      );
      return false;
    });

  return normalized.length > 0 ? normalized : undefined;
}

export function normalizeFocusCharacterId(params: {
  value: unknown;
  appearingCharacterIds?: string[];
  castIds: Set<string>;
  pageIndex: number;
}): string | undefined {
  const { value, appearingCharacterIds, castIds, pageIndex } = params;

  const normalizeCandidate = (candidate: unknown): string | undefined => {
    if (typeof candidate !== "string") return undefined;
    const trimmed = candidate.trim();
    if (!trimmed) return undefined;
    if (isKnownCharacterId(trimmed, castIds)) return trimmed;

    console.warn(
      `Unknown focusCharacterId '${trimmed}' on page ${pageIndex + 1}; using fallback.`
    );
    return undefined;
  };

  const direct = normalizeCandidate(value);
  if (direct) return direct;

  if (Array.isArray(value)) {
    for (const item of value) {
      const normalized = normalizeCandidate(item);
      if (normalized) return normalized;
    }
  }

  if (typeof value === "object" && value !== null) {
    const obj = value as Record<string, unknown>;
    const fromObject =
      normalizeCandidate(obj.characterId) ??
      normalizeCandidate(obj.id) ??
      normalizeCandidate(obj.focusCharacterId);
    if (fromObject) return fromObject;
  }

  for (const id of appearingCharacterIds ?? []) {
    const normalized = normalizeCandidate(id);
    if (normalized) return normalized;
  }

  return undefined;
}

function validateStoryCast(data: unknown): StoryCharacter[] | undefined {
  if (data === undefined || data === null) {
    return undefined;
  }

  if (!Array.isArray(data)) {
    throw new Error("'cast' must be an array when provided");
  }

  return data.map((entry, index) => {
    if (typeof entry !== "object" || entry === null) {
      throw new Error(`cast[${index}] must be an object`);
    }

    const obj = entry as Record<string, unknown>;
    if (typeof obj.characterId !== "string") {
      throw new Error(`cast[${index}].characterId must be a string`);
    }
    if (typeof obj.displayName !== "string") {
      throw new Error(`cast[${index}].displayName must be a string`);
    }
    if (typeof obj.visualBible !== "string") {
      throw new Error(`cast[${index}].visualBible must be a string`);
    }

    const role = normalizeStoryCharacterRole(obj.role);

    return {
      characterId: obj.characterId,
      displayName: obj.displayName,
      role,
      visualBible: obj.visualBible,
      characterKind: normalizeStoryCharacterKind(obj.characterKind, role),
      nonHuman: typeof obj.nonHuman === "boolean" ? obj.nonHuman : undefined,
      noHumanFace: typeof obj.noHumanFace === "boolean" ? obj.noHumanFace : undefined,
      noHumanBody: typeof obj.noHumanBody === "boolean" ? obj.noHumanBody : undefined,
      scaleHint: typeof obj.scaleHint === "string" ? obj.scaleHint : undefined,
      silhouette: typeof obj.silhouette === "string" ? obj.silhouette : undefined,
      colorPalette: validateStringArray(obj.colorPalette, `cast[${index}].colorPalette`),
      signatureItems: validateStringArray(obj.signatureItems, `cast[${index}].signatureItems`),
      doNotChange: validateStringArray(obj.doNotChange, `cast[${index}].doNotChange`),
      negativeCharacterRules: validateStringArray(
        obj.negativeCharacterRules,
        `cast[${index}].negativeCharacterRules`
      ),
      canChangeByScene: validateStringArray(obj.canChangeByScene, `cast[${index}].canChangeByScene`),
      referenceImageUrl: typeof obj.referenceImageUrl === "string" ? obj.referenceImageUrl : undefined,
      approvedImageUrl: typeof obj.approvedImageUrl === "string" ? obj.approvedImageUrl : undefined,
    } satisfies StoryCharacter;
  });
}

/** @internal Exported for testing (P4-12a null coercion). */
export function validateStory(data: unknown): GeneratedStory {
  if (typeof data !== "object" || data === null) throw new Error("LLM response is not an object");
  const obj = data as Record<string, unknown>;
  if (typeof obj.title !== "string") throw new Error("LLM response missing 'title' string");
  if (typeof obj.characterBible !== "string") throw new Error("LLM response missing 'characterBible' string");
  if (typeof obj.styleBible !== "string") throw new Error("LLM response missing 'styleBible' string");
  if (!Array.isArray(obj.pages) || obj.pages.length === 0) throw new Error("LLM response missing 'pages' array");

  const cast = validateStoryCast(obj.cast);
  const castIds = new Set((cast ?? []).map((character) => character.characterId));
  const pages = obj.pages as unknown[];
  const normalizedPages = pages.map((page, index) => {
    if (typeof page !== "object" || page === null) {
      throw new Error("Each page must be an object");
    }

    const pageObj = page as Record<string, unknown>;
    if (typeof pageObj.text !== "string" || typeof pageObj.imagePrompt !== "string") {
      throw new Error("Each page must have 'text' and 'imagePrompt' strings");
    }
    // P4-12a: Coerce null → undefined for optional nullable page fields
    const compositionHint = nullToUndefined(pageObj.compositionHint);
    const visualMotifUsage = nullToUndefined(pageObj.visualMotifUsage);
    const hiddenDetail = nullToUndefined(pageObj.hiddenDetail);
    const rawPageVisualRole = nullToUndefined(pageObj.pageVisualRole);
    const rawAppearingCharacterIds = nullToUndefined(pageObj.appearingCharacterIds);
    const rawFocusCharacterId = nullToUndefined(pageObj.focusCharacterId);

    if (compositionHint !== undefined && typeof compositionHint !== "string") {
      throw new Error("Page 'compositionHint' must be a string when provided");
    }
    if (visualMotifUsage !== undefined && typeof visualMotifUsage !== "string") {
      throw new Error("Page 'visualMotifUsage' must be a string when provided");
    }
    if (hiddenDetail !== undefined && typeof hiddenDetail !== "string") {
      throw new Error("Page 'hiddenDetail' must be a string when provided");
    }
    if (rawPageVisualRole !== undefined && typeof rawPageVisualRole !== "string") {
      throw new Error("Page 'pageVisualRole' must be a string when provided");
    }
    const appearingCharacterIds = normalizeAppearingCharacterIds(
      rawAppearingCharacterIds,
      castIds,
      index
    );
    const focusCharacterId = normalizeFocusCharacterId({
      value: rawFocusCharacterId,
      appearingCharacterIds,
      castIds,
      pageIndex: index,
    });

    return {
      text: pageObj.text,
      imagePrompt: pageObj.imagePrompt,
      compositionHint,
      visualMotifUsage,
      hiddenDetail,
      pageVisualRole: normalizePageVisualRole(rawPageVisualRole, index, pages.length),
      appearingCharacterIds,
      focusCharacterId,
    };
  });

  // P4-12a: Coerce null → undefined for narrativeDevice (nullable object)
  const rawNarrativeDevice = nullToUndefined(obj.narrativeDevice);
  let narrativeDevice = undefined;
  if (rawNarrativeDevice !== undefined) {
    if (typeof rawNarrativeDevice !== "object") {
      throw new Error("'narrativeDevice' must be an object when provided");
    }
    const device = rawNarrativeDevice as Record<string, unknown>;
    // P4-12a: Coerce null → undefined for narrativeDevice subfields
    const repeatedPhrase = nullToUndefined(device.repeatedPhrase);
    const visualMotif = nullToUndefined(device.visualMotif);
    const setup = nullToUndefined(device.setup);
    const payoff = nullToUndefined(device.payoff);
    const hiddenDetails = nullToUndefined(device.hiddenDetails);
    if (repeatedPhrase !== undefined && typeof repeatedPhrase !== "string") {
      throw new Error("'narrativeDevice.repeatedPhrase' must be a string when provided");
    }
    if (visualMotif !== undefined && typeof visualMotif !== "string") {
      throw new Error("'narrativeDevice.visualMotif' must be a string when provided");
    }
    if (setup !== undefined && typeof setup !== "string") {
      throw new Error("'narrativeDevice.setup' must be a string when provided");
    }
    if (payoff !== undefined && typeof payoff !== "string") {
      throw new Error("'narrativeDevice.payoff' must be a string when provided");
    }
    if (
      hiddenDetails !== undefined &&
      (!Array.isArray(hiddenDetails) || !hiddenDetails.every((item) => typeof item === "string"))
    ) {
      throw new Error("'narrativeDevice.hiddenDetails' must be a string array when provided");
    }
    narrativeDevice = {
      ...device,
      repeatedPhrase,
      visualMotif,
      setup,
      payoff,
      hiddenDetails,
    };
  }

  // P4-12a: Coerce null → undefined for optional nullable root fields
  const storyGoal = nullToUndefined(obj.storyGoal);
  const mainQuestObject = nullToUndefined(obj.mainQuestObject);
  const forbiddenQuestObjects = nullToUndefined(obj.forbiddenQuestObjects);
  const titleSpreadText = nullToUndefined(obj.titleSpreadText);
  const openingNarration = nullToUndefined(obj.openingNarration);
  const coverImagePrompt = nullToUndefined(obj.coverImagePrompt);

  if (storyGoal !== undefined && typeof storyGoal !== "string") {
    throw new Error("'storyGoal' must be a string when provided");
  }
  if (mainQuestObject !== undefined && typeof mainQuestObject !== "string") {
    throw new Error("'mainQuestObject' must be a string when provided");
  }
  if (
    forbiddenQuestObjects !== undefined &&
    (!Array.isArray(forbiddenQuestObjects) ||
      !forbiddenQuestObjects.every((item) => typeof item === "string"))
  ) {
    throw new Error("'forbiddenQuestObjects' must be a string array when provided");
  }
  if (titleSpreadText !== undefined && typeof titleSpreadText !== "string") {
    throw new Error("'titleSpreadText' must be a string when provided");
  }
  if (openingNarration !== undefined && typeof openingNarration !== "string") {
    throw new Error("'openingNarration' must be a string when provided");
  }
  if (coverImagePrompt !== undefined && typeof coverImagePrompt !== "string") {
    throw new Error("'coverImagePrompt' must be a string when provided");
  }

  return {
    title: obj.title,
    characterBible: obj.characterBible,
    styleBible: obj.styleBible,
    storyGoal: typeof storyGoal === "string" ? storyGoal : undefined,
    mainQuestObject: typeof mainQuestObject === "string" ? mainQuestObject : undefined,
    forbiddenQuestObjects: forbiddenQuestObjects as string[] | undefined,
    titleSpreadText: typeof titleSpreadText === "string" ? titleSpreadText : undefined,
    openingNarration: typeof openingNarration === "string" ? openingNarration : undefined,
    coverImagePrompt: typeof coverImagePrompt === "string" ? coverImagePrompt : undefined,
    cast,
    narrativeDevice: narrativeDevice as GeneratedStory["narrativeDevice"],
    storyModel: typeof obj.storyModel === "string" ? obj.storyModel : undefined,
    storyModelFallbackUsed:
      typeof obj.storyModelFallbackUsed === "boolean" ? obj.storyModelFallbackUsed : undefined,
    storyGenerationAttempts:
      typeof obj.storyGenerationAttempts === "number" ? obj.storyGenerationAttempts : undefined,
    pages: normalizedPages,
  };
}

/** Gemini generationConfig shape — optionally includes responseSchema when flag is ON. */
type StoryGenerationConfig = {
  responseMimeType: "application/json";
  responseSchema?: ResponseSchema;
};

async function generateContentWithRetry(params: {
  generateContent: (request: {
    contents: Array<{ role: "user"; parts: Array<{ text: string }> }>;
    systemInstruction: { role: "system"; parts: Array<{ text: string }> };
    generationConfig: StoryGenerationConfig;
  }) => Promise<{ response: { text: () => string } }>;
  request: {
    contents: Array<{ role: "user"; parts: Array<{ text: string }> }>;
    systemInstruction: { role: "system"; parts: Array<{ text: string }> };
    generationConfig: StoryGenerationConfig;
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

async function runJsonGeneration(params: {
  client: GoogleGenerativeAI;
  request: {
    contents: Array<{ role: "user"; parts: Array<{ text: string }> }>;
    systemInstruction: { role: "system"; parts: Array<{ text: string }> };
    generationConfig: StoryGenerationConfig;
  };
  modelCandidates: string[];
}): Promise<{ text: string; modelName: string; fallbackUsed: boolean; totalAttempts: number }> {
  const modelNamesTried: string[] = [];
  let totalAttempts = 0;
  let lastRetryableReason: GeminiRetryReason = "unknown";
  let lastRetryableMessage = "";

  for (const [index, modelName] of params.modelCandidates.entries()) {
    modelNamesTried.push(modelName);
    const model = params.client.getGenerativeModel({ model: modelName, safetySettings: SAFETY_SETTINGS });

    try {
      const result = await generateContentWithRetry({
        generateContent: model.generateContent.bind(model),
        request: params.request,
        modelName,
      });

      totalAttempts += result.attempts;
      return {
        text: result.response.text(),
        modelName,
        fallbackUsed: index > 0,
        totalAttempts,
      };
    } catch (err) {
      const retryReason = getRetryableGeminiReason(err);
      const message = getErrorMessage(err);
      const lastAttemptCount = retryReason !== null ? GEMINI_MAX_RETRIES + 1 : 1;
      totalAttempts += lastAttemptCount;

      if (retryReason !== null) {
        lastRetryableReason = retryReason;
        lastRetryableMessage = message;
        if (index < params.modelCandidates.length - 1) {
          console.warn("Switching Gemini story model after retryable failure", {
            fromModel: modelName,
            nextModel: params.modelCandidates[index + 1],
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
    technicalMessage: lastRetryableMessage || "Unknown Gemini generation failure",
  });
}

export class GeminiClient implements LLMClient {
  private genAI: GoogleGenerativeAI;

  constructor(apiKey: string) {
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  async generateStory(params: {
    systemPrompt: string;
    childName: string;
    childAge?: number;
    favorites?: string;
    lessonToTeach?: string;
    memoryToRecreate?: string;
    characterLook?: string;
    signatureItem?: string;
    colorMood?: string;
    place?: string;
    familyMembers?: string;
    season?: string;
    parentMessage?: string;
    storyRequest?: string;
    pageCount: PageCount;
    style: IllustrationStyle;
    productPlan?: ProductPlan;
    creationMode?: CreationMode;
    theme?: string;
    categoryGroupId?: string;
    storyModelCandidates?: string[];
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
      generationConfig: isResponseSchemaEnabled()
        ? {
            responseMimeType: "application/json" as const,
            responseSchema: STORY_RESPONSE_SCHEMA as unknown as ResponseSchema,
          }
        : { responseMimeType: "application/json" as const },
    };

    const modelCandidates =
      params.storyModelCandidates && params.storyModelCandidates.length > 0
        ? params.storyModelCandidates
        : resolveStoryModelCandidates({
            productPlan: params.productPlan,
            creationMode: params.creationMode,
            theme: params.theme,
            categoryGroupId: params.categoryGroupId,
          }) ?? getStoryModelCandidatesFromEnv();

    const result = await runJsonGeneration({
      client: this.genAI,
      request,
      modelCandidates,
    });

    let parsed: unknown;
    try {
      if (isSchemaRepairEnabled()) {
        // P4-5: Use enhanced extractor that handles markdown fences and outer delimiters.
        const repairResult = extractJsonFromLLMResponse(result.text);
        if (repairResult.status !== "unrepairable" && repairResult.parsed !== undefined) {
          parsed = repairResult.parsed;
        } else {
          throw new Error("LLM response could not be extracted");
        }
      } else {
        parsed = JSON.parse(extractJSON(result.text));
      }
    } catch {
      throw new Error(`Failed to parse LLM JSON response: ${result.text.slice(0, 200)}`);
    }

    const validated = validateStory(parsed);
    return {
      ...validated,
      storyModel: result.modelName,
      storyModelFallbackUsed: result.fallbackUsed,
      storyGenerationAttempts: result.totalAttempts,
    };
  }

  async rewriteStoryText(params: {
    story: GeneratedStory;
    systemPrompt: string;
    childName: string;
    childAge?: number;
    style: IllustrationStyle;
    productPlan?: ProductPlan;
    creationMode?: CreationMode;
    storyModelCandidates?: string[];
  }): Promise<{
    pages: Array<{ text: string }>;
    storyTextRewriteModel?: string;
    storyTextRewriteAttempts?: number;
  }> {
    const modelCandidates =
      params.storyModelCandidates && params.storyModelCandidates.length > 0
        ? params.storyModelCandidates
        : resolveStoryModelCandidates({
            productPlan: params.productPlan,
            creationMode: params.creationMode,
          });

    const rewriteInstruction = [
      params.systemPrompt,
      "## Rewrite task",
      "Rewrite only pages[].text in natural Japanese picture-book prose.",
      "Keep title, characterBible, styleBible, cast, narrativeDevice, titleSpreadText, openingNarration, coverImagePrompt, imagePrompt, compositionHint, pageVisualRole, appearingCharacterIds, and focusCharacterId unchanged.",
      "Keep storyGoal, mainQuestObject, forbiddenQuestObjects, titleSpreadText, openingNarration, and coverImagePrompt unchanged.",
      "pages[].text only. Do not modify imagePrompt, pageVisualRole, cast, appearingCharacterIds, or focusCharacterId.",
      "For ages 3+, avoid sound-play-only text and meaningless invented words.",
      "For ages 3+, each page should usually have 3 to 5 sentences and around 80 to 140 Japanese characters when natural.",
      "Add natural scene detail, action, emotion, and small discovery.",
      "On discovery pages, include where the character found something or what the hands / sand / nearby place looked like.",
      "Reduce excessive onomatopoeia and unclear repeated sounds.",
      "Keep the main quest object consistent across all pages. Do not replace it with another object.",
      "hiddenDetail is for visual background fun only. Do not turn hiddenDetail into the main story goal.",
      "If imagePrompt shows a clear action or recurring motif, reflect that naturally in pages[].text.",
      "On the final page, clearly write the quest resolution or emotional resolution.",
      "Do not turn the text into dry explanation. Keep it warm and story-like.",
      "Return JSON only in this shape: {\"pages\":[{\"text\":\"...\"}]}",
    ].join("\n");

    const request = {
      contents: [{
        role: "user" as const,
        parts: [{
          text: JSON.stringify({
            childName: params.childName,
            childAge: params.childAge,
            style: params.style,
            story: params.story,
          }),
        }],
      }],
      systemInstruction: { role: "system" as const, parts: [{ text: rewriteInstruction }] },
      generationConfig: { responseMimeType: "application/json" as const },
    };

    const result = await runJsonGeneration({
      client: this.genAI,
      request,
      modelCandidates,
    });

    const parsed = JSON.parse(extractJSON(result.text)) as { pages?: Array<{ text?: string }> };
    if (!Array.isArray(parsed.pages) || parsed.pages.length !== params.story.pages.length) {
      throw new Error("Rewrite response pages are missing or have different length");
    }

    return {
      pages: parsed.pages.map((page, pageIndex) => ({
        text: typeof page?.text === "string" ? page.text : params.story.pages[pageIndex].text,
      })),
      storyTextRewriteModel: result.modelName,
      storyTextRewriteAttempts: result.totalAttempts,
    };
  }
}

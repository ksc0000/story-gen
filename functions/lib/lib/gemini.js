"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GeminiClient = exports.GeminiServiceUnavailableError = void 0;
exports.resolveStoryModelCandidates = resolveStoryModelCandidates;
exports.defaultPageVisualRole = defaultPageVisualRole;
exports.normalizePageVisualRole = normalizePageVisualRole;
exports.normalizeAppearingCharacterIds = normalizeAppearingCharacterIds;
exports.normalizeFocusCharacterId = normalizeFocusCharacterId;
const generative_ai_1 = require("@google/generative-ai");
const types_1 = require("./types");
const DEFAULT_STORY_MODEL_PRIMARY = "gemini-2.5-flash-lite";
const DEFAULT_STORY_MODEL_FALLBACKS = ["gemini-2.5-flash", "gemini-2.0-flash"];
const GEMINI_MAX_RETRIES = 3;
const GEMINI_BASE_DELAY_MS = 1_000;
const GEMINI_JITTER_MS = 500;
const SAFETY_SETTINGS = [
    { category: generative_ai_1.HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: generative_ai_1.HarmBlockThreshold.BLOCK_LOW_AND_ABOVE },
    { category: generative_ai_1.HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: generative_ai_1.HarmBlockThreshold.BLOCK_LOW_AND_ABOVE },
    { category: generative_ai_1.HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: generative_ai_1.HarmBlockThreshold.BLOCK_LOW_AND_ABOVE },
    { category: generative_ai_1.HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: generative_ai_1.HarmBlockThreshold.BLOCK_LOW_AND_ABOVE },
];
class GeminiServiceUnavailableError extends Error {
    retryable = true;
    reason;
    modelNamesTried;
    totalAttempts;
    technicalMessage;
    constructor(params) {
        super(params.message);
        this.name = "GeminiServiceUnavailableError";
        this.reason = params.reason;
        this.modelNamesTried = params.modelNamesTried;
        this.totalAttempts = params.totalAttempts;
        this.technicalMessage = params.technicalMessage;
    }
}
exports.GeminiServiceUnavailableError = GeminiServiceUnavailableError;
function extractJSON(text) {
    const codeBlockMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
    if (codeBlockMatch)
        return codeBlockMatch[1].trim();
    return text.trim();
}
function shouldDelayGeminiRetries() {
    return process.env.NODE_ENV !== "test";
}
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
function getStoryModelCandidatesFromEnv() {
    const primary = process.env.GEMINI_STORY_MODEL_PRIMARY?.trim() || DEFAULT_STORY_MODEL_PRIMARY;
    const fallbackCsv = process.env.GEMINI_STORY_MODEL_FALLBACKS?.trim();
    const fallbacks = fallbackCsv
        ? fallbackCsv.split(",").map((value) => value.trim()).filter(Boolean)
        : DEFAULT_STORY_MODEL_FALLBACKS;
    return [...new Set([primary, ...fallbacks])];
}
function resolveStoryModelCandidates(params) {
    const isMemory = params.theme === "memory" || params.categoryGroupId === "memories";
    if (params.creationMode === "original_ai" || params.productPlan === "premium_paid" || isMemory) {
        return ["gemini-2.5-pro", "gemini-2.5-flash"];
    }
    if (params.productPlan === "standard_paid") {
        return ["gemini-2.5-flash", "gemini-2.5-pro"];
    }
    return ["gemini-2.5-flash", "gemini-2.0-flash"];
}
function getErrorMessage(err) {
    if (err instanceof Error) {
        return err.message;
    }
    if (typeof err === "string") {
        return err;
    }
    return JSON.stringify(err);
}
function getRetryableGeminiReason(err) {
    const message = getErrorMessage(err).toLowerCase();
    const status = typeof err === "object" && err !== null ? String(err.status ?? "") : "";
    if (status === "429" ||
        message.includes("[429") ||
        message.includes("rate limit") ||
        message.includes("too many requests")) {
        return "rate_limited";
    }
    if (status === "503" ||
        message.includes("[503") ||
        message.includes("service unavailable") ||
        message.includes("high demand") ||
        message.includes("unavailable")) {
        return message.includes("high demand") || message.includes("overloaded")
            ? "overloaded"
            : "service_unavailable";
    }
    if (["500", "502", "504"].includes(status) ||
        message.includes("[500") ||
        message.includes("[502") ||
        message.includes("[504")) {
        return "service_unavailable";
    }
    if (message.includes("overloaded")) {
        return "overloaded";
    }
    return null;
}
function defaultPageVisualRole(pageIndex, totalPages) {
    if (pageIndex === 0)
        return "opening_establishing";
    if (pageIndex === totalPages - 1)
        return "quiet_ending";
    if (totalPages >= 4 && pageIndex === totalPages - 2)
        return "payoff";
    if (pageIndex === 1)
        return "discovery";
    return "action";
}
function normalizePageVisualRole(value, pageIndex, totalPages) {
    if (typeof value === "string") {
        const normalized = value.trim().toLowerCase();
        if (types_1.PAGE_VISUAL_ROLES.includes(normalized)) {
            return normalized;
        }
        const aliasMap = {
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
function normalizeStoryCharacterRole(value) {
    if (typeof value !== "string") {
        return "buddy";
    }
    const normalized = value.trim().toLowerCase();
    const allowed = [
        "protagonist",
        "buddy",
        "parent",
        "sibling",
        "animal",
        "magical_friend",
        "object_character",
        "background_recurring",
    ];
    if (allowed.includes(normalized)) {
        return normalized;
    }
    if (normalized.includes("animal"))
        return "animal";
    if (normalized.includes("magic"))
        return "magical_friend";
    if (normalized.includes("object"))
        return "object_character";
    if (normalized.includes("background"))
        return "background_recurring";
    return "buddy";
}
function validateStringArray(value, errorLabel) {
    if (value === undefined) {
        return undefined;
    }
    if (!Array.isArray(value) || !value.every((item) => typeof item === "string")) {
        throw new Error(`${errorLabel} must be a string array when provided`);
    }
    return value;
}
function isKnownCharacterId(id, castIds) {
    return id === "child_protagonist" || castIds.has(id);
}
function normalizeAppearingCharacterIds(value, castIds, pageIndex) {
    const rawValues = Array.isArray(value) ? value : typeof value === "string" ? [value] : [];
    const normalized = rawValues
        .filter((item) => typeof item === "string")
        .map((item) => item.trim())
        .filter(Boolean)
        .filter((item, index, array) => array.indexOf(item) === index)
        .filter((item) => {
        if (isKnownCharacterId(item, castIds)) {
            return true;
        }
        console.warn(`Unknown appearingCharacterId '${item}' on page ${pageIndex + 1}; keeping page data and ignoring for cast consistency.`);
        return false;
    });
    return normalized.length > 0 ? normalized : undefined;
}
function normalizeFocusCharacterId(params) {
    const { value, appearingCharacterIds, castIds, pageIndex } = params;
    const normalizeCandidate = (candidate) => {
        if (typeof candidate !== "string")
            return undefined;
        const trimmed = candidate.trim();
        if (!trimmed)
            return undefined;
        if (isKnownCharacterId(trimmed, castIds))
            return trimmed;
        console.warn(`Unknown focusCharacterId '${trimmed}' on page ${pageIndex + 1}; using fallback.`);
        return undefined;
    };
    const direct = normalizeCandidate(value);
    if (direct)
        return direct;
    if (Array.isArray(value)) {
        for (const item of value) {
            const normalized = normalizeCandidate(item);
            if (normalized)
                return normalized;
        }
    }
    if (typeof value === "object" && value !== null) {
        const obj = value;
        const fromObject = normalizeCandidate(obj.characterId) ??
            normalizeCandidate(obj.id) ??
            normalizeCandidate(obj.focusCharacterId);
        if (fromObject)
            return fromObject;
    }
    for (const id of appearingCharacterIds ?? []) {
        const normalized = normalizeCandidate(id);
        if (normalized)
            return normalized;
    }
    return undefined;
}
function validateStoryCast(data) {
    if (data === undefined) {
        return undefined;
    }
    if (!Array.isArray(data)) {
        throw new Error("'cast' must be an array when provided");
    }
    return data.map((entry, index) => {
        if (typeof entry !== "object" || entry === null) {
            throw new Error(`cast[${index}] must be an object`);
        }
        const obj = entry;
        if (typeof obj.characterId !== "string") {
            throw new Error(`cast[${index}].characterId must be a string`);
        }
        if (typeof obj.displayName !== "string") {
            throw new Error(`cast[${index}].displayName must be a string`);
        }
        if (typeof obj.visualBible !== "string") {
            throw new Error(`cast[${index}].visualBible must be a string`);
        }
        return {
            characterId: obj.characterId,
            displayName: obj.displayName,
            role: normalizeStoryCharacterRole(obj.role),
            visualBible: obj.visualBible,
            silhouette: typeof obj.silhouette === "string" ? obj.silhouette : undefined,
            colorPalette: validateStringArray(obj.colorPalette, `cast[${index}].colorPalette`),
            signatureItems: validateStringArray(obj.signatureItems, `cast[${index}].signatureItems`),
            doNotChange: validateStringArray(obj.doNotChange, `cast[${index}].doNotChange`),
            canChangeByScene: validateStringArray(obj.canChangeByScene, `cast[${index}].canChangeByScene`),
            referenceImageUrl: typeof obj.referenceImageUrl === "string" ? obj.referenceImageUrl : undefined,
            approvedImageUrl: typeof obj.approvedImageUrl === "string" ? obj.approvedImageUrl : undefined,
        };
    });
}
function validateStory(data) {
    if (typeof data !== "object" || data === null)
        throw new Error("LLM response is not an object");
    const obj = data;
    if (typeof obj.title !== "string")
        throw new Error("LLM response missing 'title' string");
    if (typeof obj.characterBible !== "string")
        throw new Error("LLM response missing 'characterBible' string");
    if (typeof obj.styleBible !== "string")
        throw new Error("LLM response missing 'styleBible' string");
    if (!Array.isArray(obj.pages) || obj.pages.length === 0)
        throw new Error("LLM response missing 'pages' array");
    const cast = validateStoryCast(obj.cast);
    const castIds = new Set((cast ?? []).map((character) => character.characterId));
    const pages = obj.pages;
    const normalizedPages = pages.map((page, index) => {
        if (typeof page !== "object" || page === null) {
            throw new Error("Each page must be an object");
        }
        const pageObj = page;
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
        const appearingCharacterIds = normalizeAppearingCharacterIds(pageObj.appearingCharacterIds, castIds, index);
        const focusCharacterId = normalizeFocusCharacterId({
            value: pageObj.focusCharacterId,
            appearingCharacterIds,
            castIds,
            pageIndex: index,
        });
        return {
            text: pageObj.text,
            imagePrompt: pageObj.imagePrompt,
            compositionHint: pageObj.compositionHint,
            visualMotifUsage: pageObj.visualMotifUsage,
            hiddenDetail: pageObj.hiddenDetail,
            pageVisualRole: normalizePageVisualRole(pageObj.pageVisualRole, index, pages.length),
            appearingCharacterIds,
            focusCharacterId,
        };
    });
    let narrativeDevice = undefined;
    if (obj.narrativeDevice !== undefined) {
        if (typeof obj.narrativeDevice !== "object" || obj.narrativeDevice === null) {
            throw new Error("'narrativeDevice' must be an object when provided");
        }
        const device = obj.narrativeDevice;
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
        if (device.hiddenDetails !== undefined &&
            (!Array.isArray(device.hiddenDetails) || !device.hiddenDetails.every((item) => typeof item === "string"))) {
            throw new Error("'narrativeDevice.hiddenDetails' must be a string array when provided");
        }
        narrativeDevice = device;
    }
    if (obj.storyGoal !== undefined && typeof obj.storyGoal !== "string") {
        throw new Error("'storyGoal' must be a string when provided");
    }
    if (obj.mainQuestObject !== undefined && typeof obj.mainQuestObject !== "string") {
        throw new Error("'mainQuestObject' must be a string when provided");
    }
    if (obj.forbiddenQuestObjects !== undefined &&
        (!Array.isArray(obj.forbiddenQuestObjects) ||
            !obj.forbiddenQuestObjects.every((item) => typeof item === "string"))) {
        throw new Error("'forbiddenQuestObjects' must be a string array when provided");
    }
    return {
        title: obj.title,
        characterBible: obj.characterBible,
        styleBible: obj.styleBible,
        storyGoal: typeof obj.storyGoal === "string" ? obj.storyGoal : undefined,
        mainQuestObject: typeof obj.mainQuestObject === "string" ? obj.mainQuestObject : undefined,
        forbiddenQuestObjects: obj.forbiddenQuestObjects,
        cast,
        narrativeDevice: narrativeDevice,
        storyModel: typeof obj.storyModel === "string" ? obj.storyModel : undefined,
        storyModelFallbackUsed: typeof obj.storyModelFallbackUsed === "boolean" ? obj.storyModelFallbackUsed : undefined,
        storyGenerationAttempts: typeof obj.storyGenerationAttempts === "number" ? obj.storyGenerationAttempts : undefined,
        pages: normalizedPages,
    };
}
async function generateContentWithRetry(params) {
    let attempt = 0;
    while (true) {
        attempt += 1;
        try {
            const result = await params.generateContent(params.request);
            return {
                response: result.response,
                attempts: attempt,
            };
        }
        catch (err) {
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
async function runJsonGeneration(params) {
    const modelNamesTried = [];
    let totalAttempts = 0;
    let lastRetryableReason = "unknown";
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
        }
        catch (err) {
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
                    message: "現在、ストーリー生成AIが混み合っています。少し時間をおいて、同じ内容で再作成してください。",
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
        message: "現在、ストーリー生成AIが混み合っています。少し時間をおいて、同じ内容で再作成してください。",
        reason: lastRetryableReason,
        modelNamesTried,
        totalAttempts,
        technicalMessage: lastRetryableMessage || "Unknown Gemini generation failure",
    });
}
class GeminiClient {
    genAI;
    constructor(apiKey) {
        this.genAI = new generative_ai_1.GoogleGenerativeAI(apiKey);
    }
    async generateStory(params) {
        const userParts = [`主人公の名前: ${params.childName}`];
        if (params.storyRequest)
            userParts.push(`今回の絵本で描きたいこと: ${params.storyRequest}`);
        if (params.childAge !== undefined)
            userParts.push(`年齢: ${params.childAge}歳`);
        if (params.favorites)
            userParts.push(`好きなもの: ${params.favorites}`);
        if (params.lessonToTeach)
            userParts.push(`教えたいこと: ${params.lessonToTeach}`);
        if (params.memoryToRecreate)
            userParts.push(`再現したい思い出: ${params.memoryToRecreate}`);
        if (params.characterLook)
            userParts.push(`主人公の見た目: ${params.characterLook}`);
        if (params.signatureItem)
            userParts.push(`毎ページに出したい持ち物・服装: ${params.signatureItem}`);
        if (params.colorMood)
            userParts.push(`色や雰囲気: ${params.colorMood}`);
        if (params.place)
            userParts.push(`場所: ${params.place}`);
        if (params.familyMembers)
            userParts.push(`一緒に登場させたい人: ${params.familyMembers}`);
        if (params.season)
            userParts.push(`季節・時期: ${params.season}`);
        if (params.parentMessage)
            userParts.push(`最後に伝えたい言葉: ${params.parentMessage}`);
        userParts.push(`ページ数: ${params.pageCount}ページ`);
        const request = {
            contents: [{ role: "user", parts: [{ text: userParts.join("\n") }] }],
            systemInstruction: { role: "system", parts: [{ text: params.systemPrompt }] },
            generationConfig: { responseMimeType: "application/json" },
        };
        const modelCandidates = params.storyModelCandidates && params.storyModelCandidates.length > 0
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
        let parsed;
        try {
            parsed = JSON.parse(extractJSON(result.text));
        }
        catch {
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
    async rewriteStoryText(params) {
        const modelCandidates = params.storyModelCandidates && params.storyModelCandidates.length > 0
            ? params.storyModelCandidates
            : resolveStoryModelCandidates({
                productPlan: params.productPlan,
                creationMode: params.creationMode,
            });
        const rewriteInstruction = [
            params.systemPrompt,
            "## Rewrite task",
            "Rewrite only pages[].text in natural Japanese picture-book prose.",
            "Keep title, characterBible, styleBible, cast, narrativeDevice, imagePrompt, compositionHint, pageVisualRole, appearingCharacterIds, and focusCharacterId unchanged.",
            "Keep storyGoal, mainQuestObject, and forbiddenQuestObjects unchanged.",
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
                    role: "user",
                    parts: [{
                            text: JSON.stringify({
                                childName: params.childName,
                                childAge: params.childAge,
                                style: params.style,
                                story: params.story,
                            }),
                        }],
                }],
            systemInstruction: { role: "system", parts: [{ text: rewriteInstruction }] },
            generationConfig: { responseMimeType: "application/json" },
        };
        const result = await runJsonGeneration({
            client: this.genAI,
            request,
            modelCandidates,
        });
        const parsed = JSON.parse(extractJSON(result.text));
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
exports.GeminiClient = GeminiClient;
//# sourceMappingURL=gemini.js.map
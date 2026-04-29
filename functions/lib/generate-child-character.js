"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateChildCharacter = void 0;
const https_1 = require("firebase-functions/v2/https");
const params_1 = require("firebase-functions/params");
const admin = __importStar(require("firebase-admin"));
const crypto_1 = require("crypto");
const replicate_1 = require("./lib/replicate");
const replicateApiToken = (0, params_1.defineSecret)("REPLICATE_API_TOKEN");
const MAX_ATTEMPTS_PER_CHILD = 5;
const AVATAR_VARIANTS = [
    { style: "soft_watercolor", label: "やさしい水彩" },
    { style: "fluffy_pastel", label: "ふんわりパステル" },
    { style: "flat_illustration", label: "シンプルフラット" },
];
exports.generateChildCharacter = (0, https_1.onCall)({
    region: "asia-northeast1",
    secrets: [replicateApiToken],
    memory: "1GiB",
    timeoutSeconds: 300,
}, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "ログインが必要です");
    }
    const data = request.data;
    if (!data.childId || typeof data.childId !== "string") {
        throw new https_1.HttpsError("invalid-argument", "childId is required");
    }
    const uid = request.auth.uid;
    const db = admin.firestore();
    const storage = admin.storage();
    const childRef = db.collection("users").doc(uid).collection("children").doc(data.childId);
    const childSnap = await childRef.get();
    if (!childSnap.exists) {
        throw new https_1.HttpsError("not-found", "子どもプロフィールが見つかりません");
    }
    const child = childSnap.data();
    const avatarHistory = await childRef.collection("avatarGenerations").get();
    const currentAttempt = avatarHistory.docs.reduce((max, doc) => {
        const value = doc.data().attemptNumber;
        return typeof value === "number" ? Math.max(max, value) : max;
    }, 0);
    if (currentAttempt >= MAX_ATTEMPTS_PER_CHILD) {
        throw new https_1.HttpsError("resource-exhausted", `このキャラクターの生成は${MAX_ATTEMPTS_PER_CHILD}回までです。別の子ども登録か既存画像の採用をご検討ください。`);
    }
    const nextAttempt = currentAttempt + 1;
    const batchId = db.collection("_").doc().id;
    const previousPrompt = child.visualProfile?.basePrompt;
    const imageClient = new replicate_1.ReplicateImageClient(replicateApiToken.value());
    const structuredCorrectionText = buildStructuredCorrectionText(data.revisionRequest);
    const finalCorrectionText = structuredCorrectionText;
    const characterBible = buildCharacterBible(child, finalCorrectionText);
    const candidates = [];
    try {
        for (const variant of AVATAR_VARIANTS) {
            const prompt = buildChildCharacterPrompt(child, variant.style, finalCorrectionText, previousPrompt);
            const imageBuffer = await imageClient.generateImage(prompt, {
                purpose: structuredCorrectionText ? "child_avatar_revision" : "child_avatar",
                inputImageUrls: child.visualProfile?.approvedImageUrl ? [child.visualProfile.approvedImageUrl] : [],
            });
            const generationId = db.collection("_").doc().id;
            const imageUrl = await uploadAvatarImage(storage, uid, data.childId, generationId, imageBuffer);
            await childRef.collection("avatarGenerations").doc(generationId).set({
                batchId,
                attemptNumber: nextAttempt,
                imageUrl,
                prompt,
                correctionText: finalCorrectionText || null,
                revisionRequest: data.revisionRequest || null,
                style: variant.style,
                styleLabel: variant.label,
                status: "draft",
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            candidates.push({
                generationId,
                imageUrl,
                style: variant.style,
                styleLabel: variant.label,
                prompt,
            });
        }
    }
    catch (err) {
        const message = normalizeSensitiveError(err);
        throw new https_1.HttpsError("internal", `キャラクター画像生成に失敗しました: ${message}`);
    }
    return {
        batchId,
        attemptNumber: nextAttempt,
        maxAttempts: MAX_ATTEMPTS_PER_CHILD,
        remainingAttempts: MAX_ATTEMPTS_PER_CHILD - nextAttempt,
        characterBible,
        candidates,
    };
});
async function uploadAvatarImage(storage, uid, childId, generationId, imageBuffer) {
    const bucket = storage.bucket("story-gen-8a769.firebasestorage.app");
    const filename = `users/${uid}/children/${childId}/avatars/${generationId}.png`;
    const token = (0, crypto_1.randomUUID)();
    await bucket.file(filename).save(imageBuffer, {
        contentType: "image/png",
        metadata: {
            metadata: {
                firebaseStorageDownloadTokens: token,
            },
        },
    });
    return `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(filename)}?alt=media&token=${token}`;
}
function buildChildCharacterPrompt(child, style, correctionText, previousPrompt) {
    const personality = [
        ...(child.personality?.traits ?? []),
        child.personality?.favoritePlay ? `favorite play: ${child.personality.favoritePlay}` : "",
    ]
        .filter(Boolean)
        .join(", ");
    const favorites = child.personality?.favoriteThings?.join(", ");
    const visual = child.visualProfile ?? { version: 1 };
    return [
        "Create a non-photorealistic Japanese storybook illustration of a preschool protagonist.",
        "The image must be safe, gentle, warm, and clearly fictional.",
        fixedSandboxBackgroundPrompt(),
        "Use a clean scene with no signs, no posters, no books, no toys with branding, no text, no letters, no numbers, no watermark, and no Chinese characters.",
        "Keep the composition simple and repeatable so the character can be reused consistently in future storybook pages.",
        `Illustration style: ${styleInstruction(style)}.`,
        `Name or nickname: ${child.nickname || child.displayName}`,
        child.age ? `Age impression: about ${child.age} years old` : "",
        child.genderExpression && child.genderExpression !== "unspecified" ? `Gender expression: ${child.genderExpression}` : "",
        personality ? `Personality: ${personality}` : "",
        favorites ? `Favorite things: ${favorites}` : "",
        visual.characterLook ? `Appearance: ${visual.characterLook}` : "",
        visual.outfit ? `Usual outfit: ${visual.outfit}` : "",
        visual.signatureItem ? `Signature item: ${visual.signatureItem}` : "",
        visual.colorMood ? `Color mood: ${visual.colorMood}` : "",
        previousPrompt ? `Keep continuity with this approved character direction: ${previousPrompt}` : "",
        correctionText ? `Latest user correction request: ${correctionText}` : "",
        correctionText
            ? "Preserve all aspects that were not explicitly requested to change. Do not change the child's core identity, overall face structure, default outfit, or signature item unless the user specifically requested it."
            : "",
    ]
        .filter(Boolean)
        .join("\n");
}
function buildCharacterBible(child, correctionText) {
    const visual = child.visualProfile ?? { version: 1 };
    return [
        `${child.nickname || child.displayName} is a gentle Japanese picture book protagonist.`,
        child.age ? `Age impression: about ${child.age} years old.` : "",
        visual.characterLook ? `Core appearance: ${visual.characterLook}.` : "",
        visual.outfit ? `Default outfit: ${visual.outfit}.` : "",
        visual.signatureItem ? `Signature item: ${visual.signatureItem}.` : "",
        child.personality?.traits?.length ? `Personality: ${child.personality.traits.join(", ")}.` : "",
        correctionText ? `Latest visual adjustment: ${correctionText}.` : "",
        "Keep the same face, age impression, warmth, and child-safe storybook charm across all images.",
    ]
        .filter(Boolean)
        .join(" ");
}
function buildStructuredCorrectionText(revisionRequest) {
    if (!revisionRequest)
        return "";
    const instructions = [
        revisionRequest.ageFeel ? `Age impression: ${mapRevisionValue("ageFeel", revisionRequest.ageFeel)}.` : "",
        revisionRequest.hairStyle ? `Hair: ${mapRevisionValue("hairStyle", revisionRequest.hairStyle)}.` : "",
        revisionRequest.faceMood ? `Face mood: ${mapRevisionValue("faceMood", revisionRequest.faceMood)}.` : "",
        revisionRequest.expression ? `Expression: ${mapRevisionValue("expression", revisionRequest.expression)}.` : "",
        revisionRequest.outfit ? `Outfit: ${mapRevisionValue("outfit", revisionRequest.outfit)}.` : "",
        revisionRequest.signatureItem ? `Signature item: ${mapRevisionValue("signatureItem", revisionRequest.signatureItem)}.` : "",
        revisionRequest.colorTone ? `Color tone: ${mapRevisionValue("colorTone", revisionRequest.colorTone)}.` : "",
        revisionRequest.likeness ? `Likeness: ${mapRevisionValue("likeness", revisionRequest.likeness)}.` : "",
        revisionRequest.notes?.trim() ? `Additional parent note: ${revisionRequest.notes.trim()}.` : "",
    ]
        .filter(Boolean)
        .join(" ");
    return instructions;
}
function fixedSandboxBackgroundPrompt() {
    return [
        "Background must always be a quiet Japanese neighborhood park.",
        "Include a square sandbox with a low wooden frame and beige sand.",
        "The child must be inside the sandbox, not beside it.",
        "The sandbox must occupy the lower half of the image.",
        "The wooden sandbox border must be clearly visible.",
        "Place simple green hedges and a few plain trees in the distance.",
        "Do not replace the sandbox with grass, pavement, classroom, indoor room, or playground.",
        "Do not include playground equipment, buildings, roads, or signs.",
        "Use a front-facing, eye-level, medium-distance, almost full-body composition.",
    ].join(" ");
}
function styleInstruction(style) {
    switch (style) {
        case "soft_watercolor":
            return "soft watercolor, pale hand-painted colors, airy edges, calm picture book finish";
        case "fluffy_pastel":
            return "fluffy pastel, rounded shapes, soft colors, sweet and cozy picture book finish";
        case "flat_illustration":
            return "simple flat illustration, clear shapes, clean shadows, modern friendly picture book finish";
        default:
            return "gentle Japanese picture book style";
    }
}
function normalizeSensitiveError(err) {
    const message = err instanceof Error ? err.message : "Replicate image generation failed";
    if (/flagged as sensitive|E005/i.test(message)) {
        return "画像の安全判定に引っかかりました。よりやさしい表現に調整して再試行してください。";
    }
    return message;
}
function mapRevisionValue(field, value) {
    const map = {
        ageFeel: {
            younger: "make the child look clearly younger",
            slightly_younger: "make the child look slightly younger",
            slightly_older: "make the child look slightly older",
            older: "make the child look clearly older",
        },
        hairStyle: {
            shorter: "shorter and tidier hair",
            longer: "slightly longer hair",
            straighter: "straighter hair shape",
            curlier: "softer and curlier hair",
            neater: "a neater overall hairstyle",
        },
        faceMood: {
            gentler: "a gentler and softer face",
            brighter: "a brighter and more lively face",
            calmer: "a calmer and more relaxed face",
            more_expressive: "slightly more expressive facial features",
        },
        expression: {
            bigger_smile: "a bigger smile",
            soft_smile: "a softer smile",
            calm_expression: "a calm neutral expression",
            more_playful: "a more playful expression",
        },
        outfit: {
            more_casual: "more casual everyday clothing",
            more_colorful: "a slightly more colorful outfit",
            simpler: "a simpler outfit with fewer details",
            more_storybook_like: "a cuter and more storybook-like outfit",
        },
        signatureItem: {
            more_visible: "make the signature item more visible",
            smaller: "make the signature item slightly smaller",
            better_positioned: "place the signature item in a clearer position",
            less_emphasized: "make the signature item more subtle",
        },
        colorTone: {
            warmer: "warmer overall colors",
            softer: "softer and gentler colors",
            brighter: "slightly brighter colors",
            less_saturated: "less saturated colors",
        },
        likeness: {
            closer_to_child: "bring the character closer to the real child",
            keep_storybook_but_closer: "keep the storybook charm but increase resemblance",
            more_distinctive_features: "make the child's distinctive features clearer",
            more_natural_balance: "aim for a more natural and balanced likeness",
        },
    };
    return map[field]?.[value] ?? value;
}
//# sourceMappingURL=generate-child-character.js.map
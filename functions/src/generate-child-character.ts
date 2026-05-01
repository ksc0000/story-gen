import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import * as admin from "firebase-admin";
import { randomUUID } from "crypto";
import type { AvatarRevisionRequest, ChildProfileData, IllustrationStyle } from "./lib/types";
import { getStyleReferenceImagePath } from "./lib/prompt-builder";
import { ReplicateImageClient } from "./lib/replicate";

const replicateApiToken = defineSecret("REPLICATE_API_TOKEN");
const MAX_ATTEMPTS_PER_CHILD = 5;
const PUBLIC_SITE_URL = "https://story-gen-8a769.web.app";
const AVATAR_VARIANTS: Array<{ style: IllustrationStyle; label: string }> = [
  { style: "soft_watercolor", label: "やさしい水彩" },
  { style: "fluffy_pastel", label: "ふんわりパステル" },
  { style: "flat_illustration", label: "シンプルフラット" },
];

type ReferenceImageRole = "base_generation" | "approved_child" | "style_reference";

type ReferenceImageDescriptor = {
  role: ReferenceImageRole;
  url: string;
};

type GenerateChildCharacterRequest = {
  childId: string;
  revisionRequest?: AvatarRevisionRequest;
  baseGenerationId?: string;
  variantStyle?: IllustrationStyle;
};

type AvatarCandidate = {
  generationId: string;
  imageUrl: string;
  style: IllustrationStyle;
  styleLabel: string;
  prompt: string;
};

export const generateChildCharacter = onCall(
  {
    region: "asia-northeast1",
    secrets: [replicateApiToken],
    memory: "1GiB",
    timeoutSeconds: 300,
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "ログインが必要です");
    }

    const data = request.data as GenerateChildCharacterRequest;
    if (!data.childId || typeof data.childId !== "string") {
      throw new HttpsError("invalid-argument", "childId is required");
    }

    const uid = request.auth.uid;
    const db = admin.firestore();
    const storage = admin.storage();
    const childRef = db.collection("users").doc(uid).collection("children").doc(data.childId);
    const childSnap = await childRef.get();

    if (!childSnap.exists) {
      throw new HttpsError("not-found", "子どもプロフィールが見つかりません");
    }

    const child = childSnap.data() as ChildProfileData;
    const avatarHistory = await childRef.collection("avatarGenerations").get();
    const currentAttempt = avatarHistory.docs.reduce((max, doc) => {
      const value = doc.data().attemptNumber;
      return typeof value === "number" ? Math.max(max, value) : max;
    }, 0);

    if (currentAttempt >= MAX_ATTEMPTS_PER_CHILD) {
      throw new HttpsError(
        "resource-exhausted",
        `このキャラクターの生成は${MAX_ATTEMPTS_PER_CHILD}回までです。別の子ども登録か既存画像の採用をご検討ください。`
      );
    }

    const nextAttempt = currentAttempt + 1;
    const batchId = db.collection("_").doc().id;
    const previousPrompt = child.visualProfile?.basePrompt;
    const imageClient = new ReplicateImageClient(replicateApiToken.value());
    const structuredCorrectionText = buildStructuredCorrectionText(data.revisionRequest);
    const finalCorrectionText = structuredCorrectionText;
    const characterBible = buildCharacterBible(child, finalCorrectionText);
    const baseGenerationImageUrl = await getBaseGenerationImageUrl(childRef, data.baseGenerationId);
    const selectedVariant = selectAvatarVariant(data.variantStyle);

    const candidates: AvatarCandidate[] = [];
    try {
      // TODO: Move avatar generation to an async childAvatarGenerationJobs flow.
      // The callable should return a jobId quickly, then the frontend can watch
      // status/progress/candidates with onSnapshot. Store Replicate prediction IDs
      // to support delayed completion, retries, and later webhook or polling-based recovery.
      const styleReferenceImageUrl = toPublicUrl(getStyleReferenceImagePath(selectedVariant.style));
      const referenceImageRoles = buildReferenceImageRoles({
        baseGenerationImageUrl,
        approvedImageUrl: child.visualProfile?.approvedImageUrl,
        styleReferenceImageUrl,
      });
      const inputImageUrls = referenceImageRoles.map((item) => item.url);
      const prompt = buildChildCharacterPrompt(
        child,
        selectedVariant.style,
        finalCorrectionText,
        previousPrompt,
        buildReferenceImageInstruction(referenceImageRoles)
      );

      const imageBuffer = await imageClient.generateImage(prompt, {
        purpose: structuredCorrectionText ? "child_avatar_revision" : "child_avatar",
        inputImageUrls,
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
        baseGenerationId: data.baseGenerationId || null,
        referenceImageRoles,
        style: selectedVariant.style,
        styleLabel: selectedVariant.label,
        status: "draft",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      candidates.push({
        generationId,
        imageUrl,
        style: selectedVariant.style,
        styleLabel: selectedVariant.label,
        prompt,
      });
    } catch (err) {
      const message = normalizeSensitiveError(err);
      throw new HttpsError("internal", `キャラクター画像生成に失敗しました: ${message}`);
    }

    return {
      batchId,
      attemptNumber: nextAttempt,
      maxAttempts: MAX_ATTEMPTS_PER_CHILD,
      remainingAttempts: MAX_ATTEMPTS_PER_CHILD - nextAttempt,
      characterBible,
      candidates,
    };
  }
);

async function getBaseGenerationImageUrl(
  childRef: FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData>,
  baseGenerationId: string | undefined
): Promise<string | undefined> {
  if (!baseGenerationId) return undefined;

  const generationSnap = await childRef.collection("avatarGenerations").doc(baseGenerationId).get();
  if (!generationSnap.exists) {
    throw new HttpsError("invalid-argument", "baseGenerationId に対応する生成履歴が見つかりません");
  }

  const imageUrl = generationSnap.data()?.imageUrl;
  if (typeof imageUrl !== "string" || imageUrl.trim().length === 0) {
    throw new HttpsError("invalid-argument", "baseGenerationId に有効な画像がありません");
  }

  return imageUrl;
}

export function selectAvatarVariant(variantStyle?: IllustrationStyle): { style: IllustrationStyle; label: string } {
  return AVATAR_VARIANTS.find((variant) => variant.style === variantStyle) ?? AVATAR_VARIANTS[0];
}

async function uploadAvatarImage(
  storage: admin.storage.Storage,
  uid: string,
  childId: string,
  generationId: string,
  imageBuffer: Buffer
): Promise<string> {
  const bucket = storage.bucket("story-gen-8a769.firebasestorage.app");
  const filename = `users/${uid}/children/${childId}/avatars/${generationId}.png`;
  const token = randomUUID();
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

function buildChildCharacterPrompt(
  child: ChildProfileData,
  style: IllustrationStyle,
  correctionText?: string,
  previousPrompt?: string,
  referenceImageInstruction?: string
): string {
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
    referenceImageInstruction ?? "",
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

function buildCharacterBible(child: ChildProfileData, correctionText?: string): string {
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

function buildStructuredCorrectionText(revisionRequest: AvatarRevisionRequest | undefined): string {
  if (!revisionRequest) return "";

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

function fixedSandboxBackgroundPrompt(): string {
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

function buildReferenceImageRoles(params: {
  baseGenerationImageUrl?: string;
  approvedImageUrl?: string;
  styleReferenceImageUrl?: string;
}): ReferenceImageDescriptor[] {
  const descriptors: ReferenceImageDescriptor[] = [];

  if (params.baseGenerationImageUrl) {
    descriptors.push({
      role: "base_generation",
      url: params.baseGenerationImageUrl,
    });
  }

  if (params.approvedImageUrl) {
    descriptors.push({
      role: "approved_child",
      url: params.approvedImageUrl,
    });
  }

  if (params.styleReferenceImageUrl) {
    descriptors.push({
      role: "style_reference",
      url: params.styleReferenceImageUrl,
    });
  }

  const seen = new Set<string>();
  return descriptors.filter((descriptor) => {
    if (seen.has(descriptor.url)) return false;
    seen.add(descriptor.url);
    return true;
  });
}

function buildReferenceImageInstruction(referenceImageRoles: ReferenceImageDescriptor[]): string {
  if (referenceImageRoles.length === 0) return "";

  const lines: string[] = [
    "Reference image usage rules:",
    "The input reference images are ordered and must be used with different roles.",
  ];

  referenceImageRoles.forEach((descriptor, index) => {
    const imageNumber = index + 1;

    if (descriptor.role === "base_generation") {
      lines.push(
        `Reference image ${imageNumber}: use this as the primary base child character. Preserve the child's face shape, hairstyle, age impression, gentle expression, overall identity, and storybook charm. Adjust only the aspects requested by the parent.`
      );
    }

    if (descriptor.role === "approved_child") {
      lines.push(
        `Reference image ${imageNumber}: use this as the approved child identity reference. Keep the same child identity, age impression, hairstyle direction, warmth, and recognizable features. Use it as secondary identity guidance if another base child image is provided.`
      );
    }

    if (descriptor.role === "style_reference") {
      lines.push(
        `Reference image ${imageNumber}: use this only as the visual style reference for texture, line quality, brushwork, color mood, lighting softness, and picture book rendering. Do not copy any character, face, pose, object, background, text, letters, numbers, signs, layout, or scene content from this style reference image.`
      );
    }
  });

  lines.push(
    "If child identity and style reference conflict, child identity has priority for the character, and the style reference should affect only rendering style.",
    "Do not merge different characters from reference images. The protagonist must be the child described in the profile and identity references."
  );

  return lines.join("\n");
}

function toPublicUrl(pathOrUrl: string | undefined): string | undefined {
  if (!pathOrUrl) return undefined;
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  return `${PUBLIC_SITE_URL}${pathOrUrl.startsWith("/") ? "" : "/"}${pathOrUrl}`;
}

function styleInstruction(style: IllustrationStyle): string {
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

export function normalizeSensitiveError(err: unknown): string {
  const message = err instanceof Error ? err.message : "Replicate image generation failed";
  if (/flagged as sensitive|E005/i.test(message)) {
    return "画像の安全判定に引っかかりました。よりやさしい表現に調整して再試行してください。";
  }
  if (/deadline-exceeded|deadline exceeded|timeout|timed out|ETIMEDOUT|ESOCKETTIMEDOUT/i.test(message)) {
    return "画像生成に時間がかかっています。生成結果が保存されている場合があります。少し待ってから候補一覧を再読み込みしてください。";
  }
  return message;
}

function mapRevisionValue(field: keyof AvatarRevisionRequest, value: string): string {
  const map: Record<string, Record<string, string>> = {
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

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { logger } from "firebase-functions/v2";
import { defineSecret } from "firebase-functions/params";
import * as admin from "firebase-admin";
import { OpenAIImageClient, OPENAI_GPT_IMAGE_2_PROFILE } from "./lib/openai-image";
import { ILLUSTRATION_STYLE_PROFILES } from "./lib/illustration-styles";
import type { IllustrationStyle } from "./lib/types";

const openaiApiKey = defineSecret("OPENAI_API_KEY");

const BUCKET = "story-gen-8a769.firebasestorage.app";
/** 固定 download token。再生成しても previewImageUrl が変わらないようにする。 */
export const STYLE_PREVIEW_TOKEN = "stylepreview-gptimage2-v1";
const STORAGE_DIR = "style-previews";

/** 全スタイル共通の見本シーン（スタイルだけが違う比較可能なプレビュー集にする）。 */
const PREVIEW_SCENE =
  "A gentle preschool child with a small friendly puppy in a sunny park with soft trees and flowers, warm tender child-friendly mood, full scene, 4:3 composition";

/** スタイルIDから安定した公開プレビューURLを返す（illustration-styles と共有）。 */
export function stylePreviewPublicUrl(styleId: string): string {
  const path = encodeURIComponent(`${STORAGE_DIR}/${styleId}.png`);
  return `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/${path}?alt=media&token=${STYLE_PREVIEW_TOKEN}`;
}

/** previewImageUrl が重複するスタイルは1回だけ生成する（soft_watercolor/watercolor 等のエイリアス対策）。 */
function uniqueStyleTargets(): Array<{ id: IllustrationStyle; styleBible: string; negative: string[] }> {
  const seen = new Set<string>();
  const targets: Array<{ id: IllustrationStyle; styleBible: string; negative: string[] }> = [];
  for (const profile of ILLUSTRATION_STYLE_PROFILES) {
    const key = profile.previewImageUrl; // エイリアスは同じ previewImageUrl を指す
    if (seen.has(key)) continue;
    seen.add(key);
    targets.push({
      id: profile.id,
      styleBible: profile.styleBible,
      negative: profile.negativeStyleRules ?? [],
    });
  }
  return targets;
}

export const regenerateStylePreviews = onCall(
  {
    region: "asia-northeast1",
    secrets: [openaiApiKey],
    memory: "1GiB",
    timeoutSeconds: 900,
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "ログインが必要です");
    }
    if (request.auth.token.admin !== true) {
      throw new HttpsError("permission-denied", "管理者のみ利用できます");
    }

    const requestedIds = (request.data?.styleIds as string[] | undefined) ?? undefined;
    const targets = uniqueStyleTargets().filter(
      (t) => !requestedIds || requestedIds.includes(t.id)
    );

    const bucket = admin.storage().bucket(BUCKET);
    const client = new OpenAIImageClient(openaiApiKey.value(), OPENAI_GPT_IMAGE_2_PROFILE);

    const results: Array<{ styleId: string; url?: string; error?: string }> = [];

    const generateOne = async (target: { id: IllustrationStyle; styleBible: string; negative: string[] }) => {
      try {
        const prompt = [
          `${PREVIEW_SCENE}.`,
          `Illustration style: ${target.styleBible}`,
          ...target.negative,
          "no text, no letters, no Japanese characters, no signage, no logo, no watermark.",
        ].join(" ");

        const buffer = await client.generateImage(prompt, { purpose: "book_page" });
        const filename = `${STORAGE_DIR}/${target.id}.png`;
        await bucket.file(filename).save(buffer, {
          contentType: "image/png",
          metadata: { metadata: { firebaseStorageDownloadTokens: STYLE_PREVIEW_TOKEN } },
        });
        results.push({ styleId: target.id, url: stylePreviewPublicUrl(target.id) });
        logger.info("regenerateStylePreviews: generated", { styleId: target.id });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        logger.error("regenerateStylePreviews: failed", { styleId: target.id, message });
        results.push({ styleId: target.id, error: message });
      }
    };

    // 同時実行プール（gpt-image-2 high は重く、逐次だと 540s を超えるため並列化。
    // OpenAI レート制限を避けるため同時 CONCURRENCY 本に制限）。
    const CONCURRENCY = 4;
    let cursor = 0;
    const workers = Array.from({ length: Math.min(CONCURRENCY, targets.length) }, async () => {
      while (cursor < targets.length) {
        const target = targets[cursor++];
        await generateOne(target);
      }
    });
    await Promise.all(workers);

    return { count: results.length, results };
  }
);

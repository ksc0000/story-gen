import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";
import { randomUUID } from "crypto";
import { synthesizeSpeech } from "./lib/elevenlabs";

const elevenLabsApiKey = defineSecret("ELEVENLABS_API_KEY");

const PAID_PLANS = new Set(["standard_paid", "premium_paid"]);
const STORAGE_BUCKET = "story-gen-8a769.firebasestorage.app";

/**
 * 絵本の本文を ElevenLabs で音声化し、Storage に保存して各ページに audioUrl を記録する。
 * 既に音声がある場合はスキップ（キャッシュ）。読み上げは有料プラン限定。
 */
export const generateBookNarration = onCall(
  {
    region: "asia-northeast1",
    secrets: [elevenLabsApiKey],
    timeoutSeconds: 300,
    memory: "512MiB",
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "ログインが必要です");
    }
    const uid = request.auth.uid;
    const isAdmin = request.auth.token.admin === true;
    const { bookId } = request.data as { bookId?: string };
    if (!bookId) {
      throw new HttpsError("invalid-argument", "bookId が必要です");
    }

    const db = admin.firestore();

    // プラン確認（有料限定）
    const userSnap = await db.collection("users").doc(uid).get();
    const productPlan = (userSnap.data()?.productPlan as string | undefined) ?? "free";
    if (!isAdmin && !PAID_PLANS.has(productPlan)) {
      throw new HttpsError("permission-denied", "読み上げは有料プラン限定の機能です");
    }

    // 所有者確認
    const bookRef = db.collection("books").doc(bookId);
    const bookSnap = await bookRef.get();
    if (!bookSnap.exists) {
      throw new HttpsError("not-found", "絵本が見つかりません");
    }
    const bookData = bookSnap.data() as { userId?: string };
    if (!isAdmin && bookData.userId !== uid) {
      throw new HttpsError("permission-denied", "この絵本の読み上げを生成する権限がありません");
    }

    const apiKey = elevenLabsApiKey.value();
    if (!apiKey) {
      throw new HttpsError("failed-precondition", "音声生成が設定されていません（ELEVENLABS_API_KEY 未設定）");
    }

    const bucket = admin.storage().bucket(STORAGE_BUCKET);
    const pagesSnap = await bookRef.collection("pages").orderBy("pageNumber", "asc").get();

    let generated = 0;
    let cached = 0;
    let failed = 0;

    // 1ページずつ順次処理（レート制限・コスト制御のため）
    for (const pageDoc of pagesSnap.docs) {
      const page = pageDoc.data() as { text?: string; audioUrl?: string; pageNumber?: number };
      const text = (page.text ?? "").trim();
      if (!text) continue;
      if (page.audioUrl) {
        cached += 1;
        continue;
      }

      try {
        await pageDoc.ref.update({ audioStatus: "generating" });
        const audioBuffer = await synthesizeSpeech({ apiKey, text });

        const filename = `bookAudio/${bookId}/page-${pageDoc.id}.mp3`;
        const token = randomUUID();
        await bucket.file(filename).save(audioBuffer, {
          contentType: "audio/mpeg",
          metadata: { metadata: { firebaseStorageDownloadTokens: token } },
        });
        const audioUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(
          filename
        )}?alt=media&token=${token}`;

        await pageDoc.ref.update({ audioUrl, audioStatus: "ready" });
        generated += 1;
      } catch (err) {
        logger.error("Narration generation failed", { bookId, pageId: pageDoc.id, error: String(err) });
        await pageDoc.ref.update({ audioStatus: "failed" }).catch(() => undefined);
        failed += 1;
      }
    }

    await bookRef
      .update({ narrationStatus: failed > 0 ? "partial" : "ready", narrationUpdatedAtMs: Date.now() })
      .catch(() => undefined);

    logger.info("Book narration complete", { bookId, generated, cached, failed });
    return { ok: true, generated, cached, failed };
  }
);

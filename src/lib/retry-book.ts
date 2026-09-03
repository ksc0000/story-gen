import { addDoc, collection, serverTimestamp, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { BookDoc } from "@/lib/types";

/**
 * 失敗した絵本と同じ設定で新しい生成を開始する。生成系のフィールド（storyCast や
 * coverImagePrompt 等）はコピーせず、作成時の入力・設定だけを引き継ぐ。
 * generateBook トリガーが新規 books ドキュメントの作成で発火する。
 */
const CREATION_FIELDS = [
  "childId",
  "childProfileSnapshot",
  "characterUsage",
  "theme",
  "categoryGroupId",
  "templateId",
  "sourcePhotos",
  "creationMode",
  "isSinglePurchase",
  "singlePurchaseType",
  "priceTier",
  "storyCostLevel",
  "productPlan",
  "imageQualityTier",
  "characterConsistencyMode",
  "imageModelProfile",
  "style",
  "selectedStyleId",
  "selectedStyleName",
  "styleBible",
  "stylePreviewImageUrl",
  "stylePreviewUsedAsReference",
  "pageCount",
  "input",
  "protagonistType",
  "generationOverride",
] as const;

const RETENTION_DAYS = 30;

export async function createRetryBook(
  book: BookDoc & { id: string },
  userId: string
): Promise<string> {
  const source = book as unknown as Record<string, unknown>;
  const payload: Record<string, unknown> = { userId };
  for (const key of CREATION_FIELDS) {
    if (source[key] !== undefined && source[key] !== null) {
      payload[key] = source[key];
    }
  }
  const nowMs = Date.now();
  const ref = await addDoc(collection(db, "books"), {
    ...payload,
    title: "",
    status: "generating",
    progress: 0,
    createdAt: serverTimestamp(),
    createdAtMs: nowMs,
    updatedAt: serverTimestamp(),
    updatedAtMs: nowMs,
    // 他の作成経路と同じ 30 日。null だと期限切れ削除（cleanupExpired）の対象にならず永久に残る
    expiresAt: Timestamp.fromMillis(nowMs + RETENTION_DAYS * 24 * 60 * 60 * 1000),
    retriedFromBookId: book.id,
  });
  return ref.id;
}

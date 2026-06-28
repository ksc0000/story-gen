import { addDoc, collection, serverTimestamp } from "firebase/firestore";
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
    expiresAt: null,
    retriedFromBookId: book.id,
  });
  return ref.id;
}

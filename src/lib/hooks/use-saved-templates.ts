"use client";

import { useEffect, useState } from "react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { BookDoc, SavedTemplateDoc } from "@/lib/types";

export type SavedTemplateWithId = SavedTemplateDoc & { id: string };

/** ユーザーの保存済み生成設定テンプレートをリアルタイム購読する。 */
export function useSavedTemplates(userId: string | undefined) {
  const [templates, setTemplates] = useState<SavedTemplateWithId[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setTemplates([]);
      setLoading(false);
      return;
    }
    const q = query(
      collection(db, "users", userId, "savedTemplates"),
      orderBy("createdAtMs", "desc")
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        setTemplates(
          snap.docs.map((d) => ({ id: d.id, ...(d.data() as SavedTemplateDoc) }))
        );
        setLoading(false);
      },
      () => setLoading(false)
    );
    return unsub;
  }, [userId]);

  return { templates, loading };
}

function stripUndefined<T extends Record<string, unknown>>(obj: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined && v !== null)
  ) as Partial<T>;
}

/** 既存の絵本（BookDoc）から保存テンプレートのペイロードを組み立てる。 */
export function buildSavedTemplatePayload(
  book: BookDoc & { id: string },
  name: string
) {
  return stripUndefined({
    name: name.trim(),
    creationMode: book.creationMode ?? "guided_ai",
    theme: book.theme ?? "",
    templateId: book.templateId,
    selectedStyleId: book.selectedStyleId,
    selectedStyleName: book.selectedStyleName,
    pageCount: book.pageCount,
    outfitMode: book.characterUsage?.outfitMode,
    customOutfit: book.characterUsage?.customOutfit ?? undefined,
    keepSignatureItem: book.characterUsage?.keepSignatureItem,
    companionId: book.input?.companionId,
    companionName: book.input?.companionName,
    companionVisualDescription: book.input?.companionVisualDescription,
    coverImageUrl: book.coverImageUrl,
    sourceBookId: book.id,
  });
}

/** 保存テンプレートを作成する。 */
export async function saveTemplate(
  userId: string,
  book: BookDoc & { id: string },
  name: string
): Promise<string> {
  const payload = buildSavedTemplatePayload(book, name);
  const ref = await addDoc(collection(db, "users", userId, "savedTemplates"), {
    ...payload,
    createdAt: serverTimestamp(),
    createdAtMs: Date.now(),
  });
  return ref.id;
}

export async function deleteTemplate(userId: string, templateId: string): Promise<void> {
  await deleteDoc(doc(db, "users", userId, "savedTemplates", templateId));
}

/**
 * 保存テンプレートから作成フローの入口URL（主人公選択）を組み立てる。
 * mode/theme/style/ページ数/服装/なかよしキャラを引き継ぎ、tpl=1 で
 * 「テンプレ起点」であることを示す（select-child が直接プリフィル先へ遷移する）。
 */
export function buildCreateUrlFromTemplate(t: SavedTemplateWithId): string {
  const p = new URLSearchParams();
  p.set("tpl", "1");
  if (t.name) p.set("tplName", t.name);
  p.set("mode", t.creationMode);
  if (t.theme) p.set("theme", t.theme);
  if (t.selectedStyleId) p.set("selectedStyleId", t.selectedStyleId);
  if (t.pageCount) p.set("pageCount", String(t.pageCount));
  if (t.outfitMode) p.set("outfitMode", t.outfitMode);
  if (t.customOutfit) p.set("customOutfit", t.customOutfit);
  if (t.keepSignatureItem != null) p.set("keepSignatureItem", String(t.keepSignatureItem));
  if (t.companionId) p.set("companionId", t.companionId);
  if (t.companionName) p.set("companionName", t.companionName);
  if (t.companionVisualDescription)
    p.set("companionVisualDescription", t.companionVisualDescription);
  return `/create/select-child?${p.toString()}`;
}

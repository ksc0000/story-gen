"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { doc, updateDoc } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2 } from "lucide-react";
import { PageTransition } from "@/components/page-transition";
import { ChildProfileForm, type ChildProfileFormValues } from "@/components/child-profile-form";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/hooks/use-auth";
import { useChildren } from "@/lib/hooks/use-children";
import { db, storage } from "@/lib/firebase";
import { buildChildProfilePayload } from "@/lib/child-profile";
import type { ChildProfileDoc } from "@/lib/types";
import { useAvatarGenerationJob } from "@/lib/hooks/use-avatar-generation-job";

function ChildEditPageContent() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const childId = searchParams.get("childId");
  const { children, loading } = useChildren(user?.uid);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const child = useMemo(() => children.find((item) => item.id === childId) ?? null, [childId, children]);
  const { startJob } = useAvatarGenerationJob(null);

  useEffect(() => {
    if (!loading && !childId) {
      router.replace("/children");
    }
  }, [childId, loading, router]);

  const handleSubmit = async (values: ChildProfileFormValues) => {
    if (!user || !childId || !child) return;
    setSaving(true);
    try {
      const payload = buildChildProfilePayload(values, child.visualProfile);

      if (values.photoFile) {
        const storageRef = ref(storage, `childPhotos/${user.uid}/${childId}/original.jpg`);
        const snapshot = await uploadBytes(storageRef, values.photoFile);
        const photoUrl = await getDownloadURL(snapshot.ref);
        payload.photoUrl = photoUrl;
      }

      // 追加の参考写真（Phase 4）: 保持URL＋新規アップロードをまとめて反映。
      const finalExtraUrls: string[] = [...values.extraKeptUrls];
      for (let i = 0; i < values.extraNewFiles.length; i++) {
        const extraRef = ref(storage, `childPhotos/${user.uid}/${childId}/extra_${Date.now()}_${i}.jpg`);
        const snap = await uploadBytes(extraRef, values.extraNewFiles[i]);
        finalExtraUrls.push(await getDownloadURL(snap.ref));
      }
      const prevExtras = child.photoUrls ?? [];
      const extrasChanged =
        finalExtraUrls.length !== prevExtras.length ||
        finalExtraUrls.some((u, i) => u !== prevExtras[i]);
      (payload as { photoUrls?: string[] }).photoUrls = finalExtraUrls;

      const needsAvatarRefresh = hasAvatarAffectingChanges(child, payload);
      await updateDoc(doc(db, "users", user.uid, "children", childId), payload);
      if (needsAvatarRefresh || values.photoFile || extrasChanged) {
        const regenerate = window.confirm("この内容でキャラクター画像を生成しなおしますか？");
        if (regenerate) {
          const jobId = await startJob({
            userId: user.uid,
            childId,
          });
          router.push(`/onboarding/child/avatar?childId=${childId}&reason=profile_updated&jobId=${jobId}`);
        } else {
          setSaved(true);
        }
        return;
      }
      setSaved(true);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-violet-400">読み込み中...</div>;
  }

  if (!child) {
    return (
      <PageTransition className="mx-auto max-w-2xl px-4 py-8 text-center">
        <p className="text-violet-500">プロフィールが見つかりませんでした。</p>
        <Button className="mt-4" onClick={() => router.push("/children")}>一覧へ戻る</Button>
      </PageTransition>
    );
  }

  return (
    <PageTransition className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-purple-900">プロフィールを編集</h1>
        <p className="mt-3 text-sm text-violet-500">今後作る絵本に使う主人公情報を更新します。</p>
      </div>
      <ChildProfileForm initialChild={child} submitLabel="保存する" saving={saving} onSubmit={handleSubmit} />

      <AnimatePresence>
        {saved && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative z-10 w-full max-w-sm overflow-hidden rounded-3xl bg-white p-8 shadow-2xl"
            >
              <div className="flex flex-col items-center text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-50 text-green-500">
                  <CheckCircle2 className="size-10" />
                </div>
                <h2 className="text-xl font-bold text-purple-900">子どものプロフィールを登録しました！</h2>
                <p className="mt-3 text-sm leading-relaxed text-violet-500">
                  プロフィールの変更を保存しました。
                </p>
                <Button
                  size="lg"
                  className="mt-8 w-full"
                  onClick={() => router.push("/children")}
                >
                  一覧に戻る
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </PageTransition>
  );
}

function hasAvatarAffectingChanges(child: ChildProfileDoc, payload: Record<string, unknown>): boolean {
  const personality = (payload.personality as Record<string, unknown> | undefined) ?? {};
  const visualProfile = (payload.visualProfile as Record<string, unknown> | undefined) ?? {};

  return (
    normalizeNumber(child.age) !== normalizeNumber(payload.age) ||
    (child.genderExpression ?? "unspecified") !== (payload.genderExpression ?? "unspecified") ||
    normalizeStringArray(child.personality.traits) !== normalizeStringArray(personality.traits) ||
    normalizeStringArray(child.personality.favoriteThings) !== normalizeStringArray(personality.favoriteThings) ||
    normalizeString(child.visualProfile.characterLook) !== normalizeString(visualProfile.characterLook) ||
    normalizeString(child.visualProfile.outfit) !== normalizeString(visualProfile.outfit) ||
    normalizeString(child.visualProfile.signatureItem) !== normalizeString(visualProfile.signatureItem) ||
    normalizeString(child.visualProfile.colorMood) !== normalizeString(visualProfile.colorMood)
  );
}

function normalizeString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeStringArray(value: unknown): string {
  if (!Array.isArray(value)) return "";
  return value.map((item) => normalizeString(item)).filter(Boolean).join("|");
}

function normalizeNumber(value: unknown): number | null {
  return typeof value === "number" ? value : null;
}

export default function ChildEditPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-violet-400">読み込み中...</div>}>
      <ChildEditPageContent />
    </Suspense>
  );
}

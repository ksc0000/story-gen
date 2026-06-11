"use client";

import { Suspense, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ChevronLeft, Trash2, Loader2, Wand2, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageTransition } from "@/components/page-transition";
import { useAuth } from "@/lib/hooks/use-auth";
import { useCompanions } from "../use-companions-hook";
import {
  getSpeciesEmoji,
  getSpeciesLabel,
  getPersonalityLabels,
  SIZE_OPTIONS,
  COLOR_OPTIONS,
} from "../companions-utils";

function CompanionProfileContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id") ?? "";
  const router = useRouter();
  const { user } = useAuth();
  const { companions, loading, error, deleteCompanion } = useCompanions(user?.uid);
  const [deleting, setDeleting] = useState(false);
  const [generatingImage, setGeneratingImage] = useState(false);

  const companion = companions.find((c) => c.id === id);

  const handleDelete = async () => {
    if (!window.confirm(`「${companion?.name}」を削除しますか？`)) return;
    setDeleting(true);
    try {
      await deleteCompanion(id);
      router.replace("/companions");
    } catch (err) {
      console.error(err);
      alert("削除に失敗しました");
      setDeleting(false);
    }
  };

  const handleGenerateImage = async () => {
    if (!user) return;
    setGeneratingImage(true);
    try {
      const { db } = await import("@/lib/firebase");
      const { collection, addDoc, serverTimestamp } = await import("firebase/firestore");
      // onCompanionImageJobCreated Firestore トリガーを起動する
      await addDoc(collection(db, "companionImageJobs"), {
        userId: user.uid,
        companionId: id,
        status: "pending",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      // useCompanions の onSnapshot が companions/{id}.generatedImageUrl を自動更新する
    } catch (err) {
      console.error(err);
      alert("画像生成に失敗しました");
    } finally {
      setGeneratingImage(false);
    }
  };

  if (!id) {
    return (
      <PageTransition className="mx-auto max-w-lg px-4 py-8 text-center">
        <p className="text-violet-500">キャラクターが見つかりません</p>
        <Link href="/companions" className="mt-4 inline-block text-sm text-violet-500 hover:underline">
          ← なかよし一覧に戻る
        </Link>
      </PageTransition>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-violet-400" />
      </div>
    );
  }

  if (error) {
    return (
      <PageTransition className="mx-auto max-w-lg px-4 py-8 text-center">
        <p className="text-red-500">読み込みに失敗しました</p>
        <Link href="/companions" className="mt-4 inline-block text-sm text-violet-500 hover:underline">
          ← なかよし一覧に戻る
        </Link>
      </PageTransition>
    );
  }

  if (!companion) {
    return (
      <PageTransition className="mx-auto max-w-lg px-4 py-8 text-center">
        <p className="text-violet-500">キャラクターが見つかりません</p>
        <Link href="/companions" className="mt-4 inline-block text-sm text-violet-500 hover:underline">
          ← なかよし一覧に戻る
        </Link>
      </PageTransition>
    );
  }

  const personalityLabels = getPersonalityLabels(companion.personality ?? []);
  const sizeLabel = SIZE_OPTIONS.find((o) => o.value === companion.size)?.label ?? companion.size;
  const colorLabel = COLOR_OPTIONS.find((o) => o.value === companion.colorMain)?.label ?? companion.colorMain;
  const speciesEmoji = getSpeciesEmoji(companion.species);
  const speciesLabel = getSpeciesLabel(companion.species);

  return (
    <PageTransition className="mx-auto max-w-lg px-4 py-8">
      {/* 戻るリンク */}
      <Link
        href="/companions"
        className="inline-flex items-center gap-1 text-sm text-violet-500 hover:text-violet-700 hover:underline"
      >
        <ChevronLeft className="size-4" />
        なかよし一覧
      </Link>

      {/* ヒーロー画像またはアイコン */}
      <div className="mt-4 flex flex-col items-center gap-4">
        {companion.generatedImageUrl ? (
          <div className="relative h-52 w-52 overflow-hidden rounded-3xl shadow-lg ring-4 ring-purple-100">
            <Image
              src={companion.generatedImageUrl}
              alt={companion.name}
              fill
              className="object-cover"
              unoptimized
            />
          </div>
        ) : (
          <div className="flex h-52 w-52 items-center justify-center rounded-3xl bg-gradient-to-br from-violet-100 to-purple-50 shadow-lg ring-4 ring-purple-100 text-[80px]">
            {speciesEmoji}
          </div>
        )}

        {/* 画像生成ボタン */}
        {!companion.generatedImageUrl ? (
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 border-violet-200 text-violet-600 hover:bg-violet-50"
            onClick={handleGenerateImage}
            disabled={generatingImage}
          >
            {generatingImage ? <Loader2 className="size-4 animate-spin" /> : <Wand2 className="size-4" />}
            {generatingImage ? "絵を描いています…" : "絵を作る ✨"}
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-violet-400 hover:text-violet-600"
            onClick={handleGenerateImage}
            disabled={generatingImage}
          >
            {generatingImage ? <Loader2 className="size-4 animate-spin" /> : <Wand2 className="size-4" />}
            {generatingImage ? "描き直しています…" : "描き直す"}
          </Button>
        )}
      </div>

      {/* 名前 */}
      <h1 className="mt-5 text-center text-3xl font-bold text-purple-900">{companion.name}</h1>
      <p className="mt-1 text-center text-sm text-violet-400">
        {sizeLabel}の{colorLabel}{speciesLabel}
      </p>

      {/* 性格バッジ */}
      {personalityLabels.length > 0 && (
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {personalityLabels.map((label) => (
            <Badge
              key={label}
              variant="secondary"
              className="bg-violet-50 text-violet-600 border-none px-3 py-1"
            >
              {label}
            </Badge>
          ))}
        </div>
      )}

      {/* とくいなこと */}
      {companion.specialAbility && (
        <div className="mt-5 rounded-2xl bg-gradient-to-br from-purple-50 to-violet-50 px-4 py-3 text-center">
          <p className="text-xs font-semibold uppercase tracking-wide text-violet-400">とくいなこと</p>
          <p className="mt-1 text-base font-medium text-purple-800">{companion.specialAbility}</p>
        </div>
      )}

      {/* 絵本に登場させる CTA */}
      <div className="mt-6">
        <Link
          href={`/create/select-child?companionId=${id}&companionName=${encodeURIComponent(companion.name)}&companionVisualDescription=${encodeURIComponent(companion.visualDescription)}`}
        >
          <Button size="lg" className="w-full gap-2">
            <BookOpen className="size-5" />
            {companion.name}を絵本に登場させる
          </Button>
        </Link>
      </div>

      {/* 削除 */}
      <div className="mt-4 flex justify-center">
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 text-violet-300 hover:bg-red-50 hover:text-red-500"
          onClick={handleDelete}
          disabled={deleting}
        >
          {deleting ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
          削除する
        </Button>
      </div>
    </PageTransition>
  );
}

export default function CompanionProfilePage() {
  return (
    <Suspense fallback={<div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="size-8 animate-spin text-violet-400" /></div>}>
      <CompanionProfileContent />
    </Suspense>
  );
}

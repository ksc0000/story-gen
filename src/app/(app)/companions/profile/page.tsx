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
  getAbilityLabel,
  getColorLabel,
  getColorDepthLabel,
  getBodyTypeLabel,
  getSizeLabel,
} from "../companions-utils";

function CompanionProfileContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id") ?? "";
  const router = useRouter();
  const { user } = useAuth();
  const { companions, loading, error, deleteCompanion } = useCompanions(user?.uid);
  const [deleting, setDeleting] = useState(false);

  const companion = companions.find((c) => c.id === id);

  // Firestore onSnapshot 経由でリアルタイム更新される生成ステータス
  const genStatus = companion?.imageGenerationStatus;
  const isGenerating = genStatus === "pending" || genStatus === "generating";
  const hasFailed = genStatus === "failed";

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
    if (!user || isGenerating) return;
    try {
      const { db } = await import("@/lib/firebase");
      const { collection, addDoc, doc, updateDoc, serverTimestamp, writeBatch } = await import("firebase/firestore");
      // 楽観的更新: companion の status を即時 pending に（ボタンをすぐ無効化）
      const batch = writeBatch(db);
      const jobRef = doc(collection(db, "companionImageJobs"));
      batch.set(jobRef, {
        userId: user.uid,
        companionId: id,
        status: "pending",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      batch.update(doc(db, "companions", id), {
        imageGenerationStatus: "pending",
      });
      await batch.commit();
    } catch (err) {
      console.error(err);
      alert("画像生成を開始できませんでした");
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
  const sizeLabel = getSizeLabel(companion.size);
  const colorLabel = getColorLabel(companion.colorMain);
  const colorDepthLabel = getColorDepthLabel(companion.colorDepth);
  const bodyTypeLabel = getBodyTypeLabel(companion.bodyType);
  const speciesEmoji = getSpeciesEmoji(companion.species);
  const speciesLabel = getSpeciesLabel(companion.species);
  const abilityLabel = getAbilityLabel(companion.specialAbility);
  // 種族・サイズ・色などの「作成時の入力内容」をプロフィール風に整理（システム文言・HEXは出さない）
  const profileFacts: { label: string; value: string }[] = [
    { label: "しゅるい", value: speciesLabel },
    { label: "おおきさ", value: sizeLabel },
    { label: "いろ", value: [colorDepthLabel, colorLabel].filter(Boolean).join("") },
    { label: "からだつき", value: bodyTypeLabel },
  ].filter((f) => f.value);

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
        <div className="relative h-52 w-52">
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
          {/* 生成中オーバーレイ */}
          {isGenerating && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-3xl bg-white/80 backdrop-blur-sm">
              <Loader2 className="size-8 animate-spin text-purple-400" />
              <p className="text-xs font-medium text-purple-500">
                {genStatus === "generating" ? "絵を描いています…" : "生成待機中…"}
              </p>
            </div>
          )}
        </div>

        {/* 画像生成ボタン */}
        {hasFailed && (
          <p className="text-xs text-red-400">生成に失敗しました</p>
        )}
        {!companion.generatedImageUrl && !isGenerating ? (
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 border-violet-200 text-violet-600 hover:bg-violet-50"
            onClick={handleGenerateImage}
          >
            <Wand2 className="size-4" />
            {hasFailed ? "もう一度試す" : "絵を作る ✨"}
          </Button>
        ) : companion.generatedImageUrl && !isGenerating ? (
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-violet-400 hover:text-violet-600"
            onClick={handleGenerateImage}
          >
            <Wand2 className="size-4" />
            描き直す
          </Button>
        ) : null}
      </div>

      {/* 名前 */}
      <h1 className="mt-5 text-center text-3xl font-bold text-purple-900">{companion.name}</h1>
      <p className="mt-1 text-center text-sm text-violet-400">
        {[sizeLabel, `${colorDepthLabel}${colorLabel}`, speciesLabel].filter(Boolean).join("　")}
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

      {/* プロフィール（作成時の入力内容を整理して表示） */}
      {profileFacts.length > 0 && (
        <div className="mt-5 overflow-hidden rounded-2xl border border-violet-100 bg-white">
          <p className="border-b border-violet-50 px-4 py-2 text-xs font-semibold text-violet-400">プロフィール</p>
          <dl className="divide-y divide-violet-50">
            {profileFacts.map((fact) => (
              <div key={fact.label} className="flex items-center justify-between px-4 py-2.5 text-sm">
                <dt className="text-violet-400">{fact.label}</dt>
                <dd className="font-medium text-purple-800">{fact.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      {/* とくいなこと */}
      {abilityLabel && abilityLabel !== "ひみつ" && (
        <div className="mt-5 rounded-2xl bg-gradient-to-br from-purple-50 to-violet-50 px-4 py-3 text-center">
          <p className="text-xs font-semibold uppercase tracking-wide text-violet-400">とくいなこと</p>
          <p className="mt-1 text-base font-medium text-purple-800">{abilityLabel}</p>
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

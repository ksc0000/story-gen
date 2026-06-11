"use client";

import Image from "next/image";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { doc, serverTimestamp, writeBatch } from "firebase/firestore";
import { motion, useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AvatarRevisionForm } from "@/components/avatar-revision-form";
import { PageTransition } from "@/components/page-transition";
import { useAuth } from "@/lib/hooks/use-auth";
import { useChildren } from "@/lib/hooks/use-children";
import { db } from "@/lib/firebase";
import type { AvatarRevisionRequest, AvatarCandidate } from "@/lib/types";
import { useAvatarGenerationJob } from "@/lib/hooks/use-avatar-generation-job";
import { useAvatarCandidates } from "@/lib/hooks/use-avatar-candidates";

const LEAVE_MESSAGE = "キャラクターが保存されていません。生成結果が消えてしまいます。本当に別の画面に移動してよいですか？";

function ChildAvatarPageContent() {
  const shouldReduceMotion = useReducedMotion();
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const childId = searchParams.get("childId");
  const initialJobId = searchParams.get("jobId");
  const reason = searchParams.get("reason");
  const { children, loading: loadingChildren } = useChildren(user?.uid);
  const child = useMemo(() => children.find((item) => item.id === childId) ?? null, [childId, children]);

  const [currentJobId, setCurrentJobId] = useState<string | null>(initialJobId);
  const {
    job,
    loading: loadingJob,
    isInitialLoading,
    error: jobError,
    startJob,
  } = useAvatarGenerationJob(currentJobId);
  const { candidates, loading: loadingCandidates } = useAvatarCandidates(user?.uid, childId ?? undefined);

  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);
  const [characterBible, setCharacterBible] = useState<string | null>(null);
  const [revisionRequest, setRevisionRequest] = useState<AvatarRevisionRequest>({});
  const [attemptNumber, setAttemptNumber] = useState<number | null>(null);
  const [maxAttempts, setMaxAttempts] = useState(5);
  const [remainingAttempts, setRemainingAttempts] = useState<number | null>(null);
  const [hasUnsavedGeneration, setHasUnsavedGeneration] = useState(false);
  const [allowNavigation, setAllowNavigation] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedCandidate = candidates.find((candidate) => candidate.generationId === selectedCandidateId) ?? null;
  const revisionSummary = useMemo(() => buildRevisionSummary(revisionRequest), [revisionRequest]);

  useEffect(() => {
    if (!child) return;
    if (characterBible === null) {
      setCharacterBible(child.visualProfile?.characterBible ?? null);
    }
  }, [child, characterBible]);

  useEffect(() => {
    if (candidates.length > 0 && !selectedCandidateId) {
      setSelectedCandidateId(candidates[0].generationId);
    }
  }, [candidates, selectedCandidateId]);

  useEffect(() => {
    if (!job) return;

    if (job.status === "completed") {
      if (job.result) {
        setAttemptNumber(job.result.attemptNumber);
        setRemainingAttempts(maxAttempts - job.result.attemptNumber);
      }
      setHasUnsavedGeneration(true);
      setGenerating(false);
    } else if (job.status === "failed") {
      setError(job.error?.message || "生成に失敗しました");
      setGenerating(false);
    } else if (job.status === "generating" || job.status === "pending") {
      setGenerating(true);
    }
  }, [job, maxAttempts]);

  useEffect(() => {
    if (jobError) {
      setError(jobError.message);
      setGenerating(false);
    }
  }, [jobError]);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!hasUnsavedGeneration || allowNavigation) return;
      event.preventDefault();
      event.returnValue = LEAVE_MESSAGE;
    };

    const handleDocumentClick = (event: MouseEvent) => {
      if (!hasUnsavedGeneration || allowNavigation) return;
      const target = event.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest("a");
      if (!anchor) return;
      if (window.confirm(LEAVE_MESSAGE)) {
        setAllowNavigation(true);
        return;
      }
      event.preventDefault();
      event.stopPropagation();
    };

    const handlePopState = () => {
      if (!hasUnsavedGeneration || allowNavigation) return;
      if (window.confirm(LEAVE_MESSAGE)) {
        setAllowNavigation(true);
        return;
      }
      window.history.pushState(null, "", window.location.href);
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("click", handleDocumentClick, true);
    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("click", handleDocumentClick, true);
      window.removeEventListener("popstate", handlePopState);
    };
  }, [allowNavigation, hasUnsavedGeneration]);

  const confirmAndNavigate = (href: string) => {
    if (hasUnsavedGeneration && !allowNavigation) {
      const accepted = window.confirm(LEAVE_MESSAGE);
      if (!accepted) return;
    }
    setAllowNavigation(true);
    router.replace(href);
  };

  const generate = async (options?: { requestOverride?: AvatarRevisionRequest; useBaseGeneration?: boolean }) => {
    if (!childId || !user) return;
    setGenerating(true);
    setError(null);
    try {
      const request = options?.requestOverride ?? revisionRequest;
      const jobId = await startJob({
        userId: user.uid,
        childId,
        revisionRequest: request,
        ...(options?.useBaseGeneration && selectedCandidate?.generationId ? { baseGenerationId: selectedCandidate.generationId } : {}),
      });
      setCurrentJobId(jobId);
      setHasUnsavedGeneration(true);
      setAllowNavigation(false);
      setRevisionRequest({});
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(`キャラクター生成に失敗しました: ${message}`);
      setGenerating(false);
    }
  };

  const approve = async () => {
    if (!user || !childId || !selectedCandidate) return;
    setSaving(true);
    setError(null);
    try {
      const batch = writeBatch(db);
      batch.update(doc(db, "users", user.uid, "children", childId), {
        "visualProfile.approvedImageUrl": selectedCandidate.imageUrl,
        "visualProfile.referenceImageUrl": selectedCandidate.imageUrl,
        "visualProfile.characterBible": characterBible,
        "visualProfile.basePrompt": selectedCandidate.prompt,
        "visualProfile.version": (child?.visualProfile?.version ?? 1) + 1,
        updatedAt: serverTimestamp(),
      });
      for (const candidate of candidates) {
        batch.update(doc(db, "users", user.uid, "children", childId, "avatarGenerations", candidate.generationId), {
          status: candidate.generationId === selectedCandidate.generationId ? "approved" : "rejected",
        });
      }
      await batch.commit();
      setHasUnsavedGeneration(false);
      setAllowNavigation(true);
      router.replace("/home");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(`保存に失敗しました: ${message}`);
    } finally {
      setSaving(false);
    }
  };

  if (loadingChildren || (currentJobId && isInitialLoading)) {
    return (
      <div className="flex min-h-screen items-center justify-center p-8 text-center text-violet-400">
        <motion.div
          className="h-8 w-8 rounded-full border-2 border-violet-200 border-t-violet-500"
          animate={shouldReduceMotion ? undefined : { rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        />
        <span className="ml-3">読み込み中...</span>
      </div>
    );
  }

  if (!child || !childId) {
    return (
      <PageTransition className="mx-auto max-w-2xl px-4 py-8 text-center">
        <p className="text-violet-500">子どもプロフィールが見つかりませんでした。</p>
        <Button className="mt-4" onClick={() => router.replace("/children")}>一覧へ戻る</Button>
      </PageTransition>
    );
  }

  return (
    <PageTransition className="mx-auto max-w-5xl px-4 pb-28 pt-8">
      <div className="mb-6 text-center">
        <p className="text-sm font-semibold text-violet-500">キャラクター生成</p>
        <h1 className="mt-2 text-2xl font-bold text-purple-900">{child.nickname || child.displayName}の絵本キャラクター</h1>
        <p className="mt-3 text-sm leading-relaxed text-violet-500">
          公園の砂場を背景に、絵本本編と同じ画風参照を使って候補を生成します。1人あたり最大{maxAttempts}回まで試せます。
        </p>
        {reason === "profile_updated" ? (
          <p className="mt-2 text-xs text-violet-500">プロフィール変更を反映したキャラクター画像の再生成です。</p>
        ) : null}
        {attemptNumber ? (
          <p className="mt-2 text-xs text-violet-500">
            生成 {attemptNumber}/{maxAttempts} 回目{remainingAttempts !== null ? ` ・ 残り${remainingAttempts}回` : ""}
          </p>
        ) : null}
      </div>

      {child.visualProfile?.approvedImageUrl && (
        <div className="mx-auto mb-8 max-w-md text-center">
          <p className="mb-3 text-xs font-bold text-violet-500 uppercase tracking-wider">現在のキャラクター</p>
          <div className="relative mx-auto aspect-[3/4] w-48 overflow-hidden rounded-3xl border-4 border-white shadow-xl ring-1 ring-purple-100">
            <Image
              src={child.visualProfile.approvedImageUrl}
              alt="現在のキャラクター"
              fill
              className="object-cover"
              unoptimized
            />
          </div>
          <p className="mt-3 text-xs text-violet-400">※ この画像が絵本の生成に使用されます</p>
        </div>
      )}

      <Card>
        <CardContent className="space-y-5 p-6">
          {error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
          ) : null}

          {generating ? (
            <div className="flex min-h-80 flex-col items-center justify-center rounded-[28px] border border-[rgba(240,171,252,0.35)] bg-purple-50/50 px-6 text-center">
              <div className="relative mb-6">
                <motion.div
                  className="h-16 w-16 rounded-full border-4 border-purple-100 border-t-purple-500"
                  animate={shouldReduceMotion ? undefined : { rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                />
                <motion.div
                  className="absolute inset-0 flex items-center justify-center text-2xl"
                  animate={shouldReduceMotion ? undefined : { scale: [1, 1.2, 1] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                >
                  🎨
                </motion.div>
              </div>
              <motion.p
                className="font-semibold text-purple-900"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                key={job?.status}
              >
                {job?.status === "pending" ? "順番を待っています..." : "キャラクターを一生懸命描いています..."}
              </motion.p>
              <p className="mt-2 text-sm text-violet-500">
                AIがあなたのリクエストに合わせて特別な1枚を制作中です。<br />30秒〜1分ほどかかることがあります。
              </p>
            </div>
          ) : candidates.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-3">
              {candidates.map((candidate) => (
                <button
                  key={candidate.generationId}
                  type="button"
                  onClick={() => setSelectedCandidateId(candidate.generationId)}
                  className="text-left"
                >
                  <div className={`overflow-hidden rounded-[28px] border bg-purple-50/50 transition ${selectedCandidateId === candidate.generationId ? "border-purple-400 ring-2 ring-purple-200" : "border-[rgba(240,171,252,0.35)] hover:border-purple-300"}`}>
                    <Image src={candidate.imageUrl} alt={`${candidate.styleLabel}の候補`} width={768} height={1024} className="h-auto w-full object-cover" unoptimized />
                    <div className="p-4">
                      <p className="font-semibold text-purple-900">{candidate.styleLabel}</p>
                      <p className="mt-1 text-xs text-violet-500">この絵柄を採用する</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="flex min-h-80 items-center justify-center rounded-[28px] border border-[rgba(240,171,252,0.35)] bg-purple-50/50 px-6 text-center text-sm text-violet-500">
              まだキャラクター画像がありません。「候補を生成する」を押してください。
            </div>
          )}


          {candidates.length > 0 ? (
            <div className="space-y-3">
              <p className="rounded-2xl bg-purple-50 p-4 text-sm text-violet-600">
                選択中の候補を本人らしさのベースにし、絵本のタッチを参考にしながら、気になるところだけ直します
              </p>
              <AvatarRevisionForm value={revisionRequest} onChange={setRevisionRequest} summary={revisionSummary} />
              <Button
                type="button"
                variant="outline"
                onClick={() => generate({ useBaseGeneration: true })}
                disabled={isRevisionEmpty(revisionRequest) || generating || saving || remainingAttempts === 0}
                className="w-full"
              >
                選択内容で再生成
              </Button>
            </div>
          ) : null}

          <button type="button" onClick={() => confirmAndNavigate("/home")} className="block w-full text-center text-sm text-violet-500 hover:underline">
            あとで設定する
          </button>
        </CardContent>
      </Card>

      <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-purple-100 bg-white/95 backdrop-blur-sm px-4 pb-[env(safe-area-inset-bottom,16px)] pt-3">
        <div className="mx-auto max-w-lg">
          <div className="grid gap-3 sm:grid-cols-2">
            <Button
              type="button"
              variant={candidates.length > 0 ? "outline" : "default"}
              className="w-full"
              onClick={() => generate({ useBaseGeneration: false })}
              disabled={generating || saving || remainingAttempts === 0}
            >
              {generating ? "生成中..." : candidates.length > 0 ? "別案を生成" : "候補を生成する"}
            </Button>
            {candidates.length > 0 ? (
              <Button
                type="button"
                className="w-full"
                onClick={approve}
                disabled={!selectedCandidate || generating || saving}
              >
                {saving ? "保存中..." : "選んだキャラクターを保存"}
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </PageTransition>
  );
}

function isRevisionEmpty(value: AvatarRevisionRequest): boolean {
  return !Object.values(value).some((entry) => typeof entry === "string" && entry.trim().length > 0);
}

function buildRevisionSummary(value: AvatarRevisionRequest): string[] {
  const summary: string[] = [];

  if (value.ageFeel === "younger") summary.push("もっと幼くする");
  if (value.ageFeel === "slightly_younger") summary.push("少し幼くする");
  if (value.ageFeel === "slightly_older") summary.push("少し年上に見せる");
  if (value.ageFeel === "older") summary.push("もっと成長した印象にする");

  if (value.hairStyle === "shorter") summary.push("髪を短めにする");
  if (value.hairStyle === "longer") summary.push("髪を長めにする");
  if (value.hairStyle === "straighter") summary.push("髪をまっすぐめにする");
  if (value.hairStyle === "curlier") summary.push("髪をふんわりさせる");
  if (value.hairStyle === "neater") summary.push("髪型を整える");

  if (value.faceMood === "gentler") summary.push("顔立ちをやさしくする");
  if (value.faceMood === "brighter") summary.push("顔の印象を明るくする");
  if (value.faceMood === "calmer") summary.push("顔の印象を落ち着かせる");
  if (value.faceMood === "more_expressive") summary.push("顔の印象を少しはっきりさせる");

  if (value.expression === "bigger_smile") summary.push("笑顔を大きくする");
  if (value.expression === "soft_smile") summary.push("やさしい笑顔にする");
  if (value.expression === "calm_expression") summary.push("穏やかな表情にする");
  if (value.expression === "more_playful") summary.push("元気な表情にする");

  if (value.outfit === "more_casual") summary.push("服装をもっと普段着っぽくする");
  if (value.outfit === "more_colorful") summary.push("服装の色味を少し増やす");
  if (value.outfit === "simpler") summary.push("服装をシンプルにする");
  if (value.outfit === "more_storybook_like") summary.push("服装を絵本らしくかわいくする");

  if (value.signatureItem === "more_visible") summary.push("固定アイテムを目立たせる");
  if (value.signatureItem === "smaller") summary.push("固定アイテムを少し小さくする");
  if (value.signatureItem === "better_positioned") summary.push("固定アイテムを見えやすい位置にする");
  if (value.signatureItem === "less_emphasized") summary.push("固定アイテムを控えめにする");

  if (value.colorTone === "warmer") summary.push("色味をあたたかくする");
  if (value.colorTone === "softer") summary.push("色味をやさしくする");
  if (value.colorTone === "brighter") summary.push("色味を少し明るくする");
  if (value.colorTone === "less_saturated") summary.push("色味を落ち着かせる");

  if (value.likeness === "closer_to_child") summary.push("もっと本人らしくする");
  if (value.likeness === "keep_storybook_but_closer") summary.push("絵本らしさを残して本人に近づける");
  if (value.likeness === "more_distinctive_features") summary.push("特徴をもう少しはっきりさせる");
  if (value.likeness === "more_natural_balance") summary.push("全体の自然さを優先する");

  if (value.notes?.trim()) summary.push(`補足: ${value.notes.trim()}`);

  return summary;
}

export default function ChildAvatarPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-violet-400">読み込み中...</div>}>
      <ChildAvatarPageContent />
    </Suspense>
  );
}

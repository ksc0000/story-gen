"use client";

import Image from "next/image";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { doc, serverTimestamp, writeBatch } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AvatarRevisionForm } from "@/components/avatar-revision-form";
import { PageTransition } from "@/components/page-transition";
import { useAuth } from "@/lib/hooks/use-auth";
import { useChildren } from "@/lib/hooks/use-children";
import { db } from "@/lib/firebase";
import { generateChildCharacterCallable } from "@/lib/functions";
import type { AvatarRevisionRequest } from "@/lib/types";

type Candidate = {
  generationId: string;
  imageUrl: string;
  style: string;
  styleLabel: string;
  prompt: string;
};

const LEAVE_MESSAGE = "キャラクターが保存されていません。生成結果が消えてしまいます。本当に別の画面に移動してよいですか？";

function ChildAvatarPageContent() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const childId = searchParams.get("childId");
  const reason = searchParams.get("reason");
  const { children, loading } = useChildren(user?.uid);
  const child = useMemo(() => children.find((item) => item.id === childId) ?? null, [childId, children]);

  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);
  const [characterBible, setCharacterBible] = useState<string | null>(child?.visualProfile?.characterBible ?? null);
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

  useEffect(() => {
    if (!child) return;
    setCharacterBible(child.visualProfile?.characterBible ?? null);
  }, [child]);

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

  const generate = async (requestOverride?: AvatarRevisionRequest) => {
    if (!childId) return;
    setGenerating(true);
    setError(null);
    try {
      const request = requestOverride ?? revisionRequest;
      const result = await generateChildCharacterCallable({
        childId,
        correctionText: request.notes?.trim() || undefined,
        revisionRequest: request,
      });
      setCandidates(result.data.candidates);
      setSelectedCandidateId(result.data.candidates[0]?.generationId ?? null);
      setCharacterBible(result.data.characterBible);
      setAttemptNumber(result.data.attemptNumber);
      setMaxAttempts(result.data.maxAttempts);
      setRemainingAttempts(result.data.remainingAttempts);
      setHasUnsavedGeneration(true);
      setAllowNavigation(false);
      setRevisionRequest({});
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(`キャラクター生成に失敗しました: ${message}`);
    } finally {
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

  if (loading) {
    return <div className="p-8 text-center text-violet-400">読み込み中...</div>;
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
    <PageTransition className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6 text-center">
        <p className="text-sm font-semibold text-violet-500">キャラクター生成</p>
        <h1 className="mt-2 text-2xl font-bold text-purple-900">{child.nickname || child.displayName}の絵本キャラクター</h1>
        <p className="mt-3 text-sm leading-relaxed text-violet-500">
          公園の砂場を背景に、3つのタッチで同時生成します。1人あたり最大{maxAttempts}回まで試せます。
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

      <Card>
        <CardContent className="space-y-5 p-6">
          {error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
          ) : null}

          {candidates.length > 0 ? (
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
              まだキャラクター画像がありません。「3パターン生成する」を押してください。
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <Button type="button" onClick={() => generate()} disabled={generating || saving || remainingAttempts === 0}>
              {generating ? "生成中..." : "3パターン生成する"}
            </Button>
            <Button type="button" onClick={approve} disabled={!selectedCandidate || generating || saving}>
              {saving ? "保存中..." : "選んだキャラクターを保存"}
            </Button>
          </div>

          <div className="space-y-3">
            <AvatarRevisionForm value={revisionRequest} onChange={setRevisionRequest} />
            <Button
              type="button"
              variant="outline"
              onClick={() => generate()}
              disabled={isRevisionEmpty(revisionRequest) || generating || saving || remainingAttempts === 0}
              className="w-full"
            >
              選択内容で3パターン再生成
            </Button>
          </div>

          <button type="button" onClick={() => confirmAndNavigate("/home")} className="block w-full text-center text-sm text-violet-500 hover:underline">
            あとで設定する
          </button>
        </CardContent>
      </Card>
    </PageTransition>
  );
}

function isRevisionEmpty(value: AvatarRevisionRequest): boolean {
  return !Object.values(value).some((entry) => typeof entry === "string" && entry.trim().length > 0);
}

export default function ChildAvatarPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-violet-400">読み込み中...</div>}>
      <ChildAvatarPageContent />
    </Suspense>
  );
}

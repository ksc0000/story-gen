"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, doc, updateDoc } from "firebase/firestore";
import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageTransition } from "@/components/page-transition";
import { useAuth } from "@/lib/hooks/use-auth";
import { db } from "@/lib/firebase";
import type { CompanionDoc, CompanionImageJob } from "@/lib/types";

type CompanionWithId = CompanionDoc & { id: string };

export default function CompanionsPage() {
  const { user } = useAuth();
  const [companions, setCompanions] = useState<CompanionWithId[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingIds, setGeneratingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user) return;

    const companionsRef = collection(db, "companions");
    const q = query(companionsRef, where("userId", "==", user.uid));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as CompanionDoc),
      }));
      setCompanions(docs);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  // Also listen to pending/generating jobs to update UI state
  useEffect(() => {
    if (!user) return;

    const jobsRef = collection(db, "companionImageJobs");
    const q = query(
      jobsRef,
      where("userId", "==", user.uid),
      where("status", "in", ["pending", "generating"])
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const activeCompanionIds = new Set<string>();
      snapshot.docs.forEach((doc) => {
        const data = doc.data() as CompanionImageJob;
        activeCompanionIds.add(data.companionId);
      });
      setGeneratingIds(activeCompanionIds);
    });

    return () => unsubscribe();
  }, [user]);

  const handleGenerateImage = async (companionId: string) => {
    if (!user) return;

    try {
      await addDoc(collection(db, "companionImageJobs"), {
        userId: user.uid,
        companionId: companionId,
        status: "pending",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      console.error("Failed to trigger image generation:", err);
    }
  };

  return (
    <PageTransition className="mx-auto max-w-4xl px-4 py-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-purple-900">ふしぎな相棒たち</h1>
          <p className="mt-2 text-sm text-violet-500">絵本に登場する相棒キャラクターを管理します。</p>
        </div>
      </div>

      {loading ? (
        <p className="mt-8 text-center text-violet-400">読み込み中...</p>
      ) : companions.length === 0 ? (
        <Card className="mt-8">
          <CardContent className="p-8 text-center">
            <p className="text-violet-500">まだ相棒がいません。相棒作成ウィザードから作成してください。</p>
          </CardContent>
        </Card>
      ) : (
        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          {companions.map((companion) => (
            <CompanionCard
              key={companion.id}
              companion={companion}
              isGenerating={generatingIds.has(companion.id)}
              onGenerate={() => handleGenerateImage(companion.id)}
            />
          ))}
        </div>
      )}
    </PageTransition>
  );
}

function CompanionCard({
  companion,
  isGenerating,
  onGenerate
}: {
  companion: CompanionWithId;
  isGenerating: boolean;
  onGenerate: () => void;
}) {
  const hasImage = !!companion.generatedImageUrl;

  return (
    <Card className="overflow-hidden flex flex-col h-full">
      <div className="relative aspect-square w-full bg-violet-50 flex items-center justify-center border-b">
        {isGenerating ? (
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-10 w-10 animate-spin text-purple-400" />
            <p className="text-xs font-medium text-purple-400">イラストを生成中...</p>
          </div>
        ) : hasImage ? (
          <Image
            src={companion.generatedImageUrl!}
            alt={companion.name}
            fill
            className="object-cover"
          />
        ) : (
          <div className="flex flex-col items-center gap-3 p-6 text-center">
            <div className="h-20 w-20 rounded-full bg-violet-100 flex items-center justify-center">
              <Sparkles className="h-10 w-10 text-violet-300" />
            </div>
            <p className="text-sm text-violet-400">まだイラストがありません</p>
          </div>
        )}
      </div>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg text-purple-900">{companion.name}</CardTitle>
        <div className="flex flex-wrap gap-1 mt-1">
          <span className="px-2 py-0.5 rounded-full bg-purple-50 text-[10px] font-medium text-purple-600 border border-purple-100">
            {companion.visualDescription.species}
          </span>
          <span className="px-2 py-0.5 rounded-full bg-violet-50 text-[10px] font-medium text-violet-600 border border-violet-100">
            {companion.visualDescription.color}
          </span>
          <span className="px-2 py-0.5 rounded-full bg-pink-50 text-[10px] font-medium text-pink-600 border border-pink-100">
            {companion.visualDescription.personality}
          </span>
        </div>
      </CardHeader>
      <CardContent className="flex-grow flex flex-col justify-between pt-0">
        <p className="text-sm text-violet-500 line-clamp-2 mt-2 italic">
          「{companion.visualDescription.specialAbility}」
        </p>

        <div className="mt-4 pt-4 border-t">
          {!hasImage ? (
            <Button
              onClick={onGenerate}
              disabled={isGenerating}
              className="w-full"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  生成中...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  イラストを生成する
                </>
              )}
            </Button>
          ) : (
            <p className="text-center text-xs text-violet-400 font-medium">
              イラスト生成済み ✨
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

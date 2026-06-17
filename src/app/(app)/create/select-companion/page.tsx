"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { PageTransition } from "@/components/page-transition";
import { BackButton } from "@/components/back-button";
import { StepIndicator } from "@/components/step-indicator";
import { useAuth } from "@/lib/hooks/use-auth";
import { useCompanions } from "@/app/(app)/companions/use-companions-hook";
import { getSpeciesEmoji, getSpeciesLabel } from "@/app/(app)/companions/companions-utils";
import { cn } from "@/lib/utils";
import type { CreationMode } from "@/lib/types";

function SelectCompanionContent() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { companions, loading: companionsLoading, error: companionsError } = useCompanions(user?.uid);

  const [selectedCompanionId, setSelectedCompanionId] = useState<string | null>(
    searchParams.get("companionId")
  );

  const childId = searchParams.get("childId");
  const mode = (searchParams.get("mode") as CreationMode | null) ?? "guided_ai";

  const handleNext = () => {
    const params = new URLSearchParams(searchParams.toString());

    if (selectedCompanionId) {
      const companion = companions.find((c) => c.id === selectedCompanionId);
      if (companion) {
        params.set("companionId", companion.id);
        params.set("companionName", companion.name);
        params.set("companionVisualDescription", companion.visualDescription);
      }
    } else {
      params.delete("companionId");
      params.delete("companionName");
      params.delete("companionVisualDescription");
    }

    params.set("protagonistType", childId ? "child" : "original_character");

    if (mode === "photo_story") {
      router.push(`/create/photo-upload?${params.toString()}`);
    } else if (mode === "guided_ai") {
      router.push(`/create/ai-brief?${params.toString()}`);
    } else {
      router.push(`/create/input?${params.toString()}`);
    }
  };

  return (
    <PageTransition className="mx-auto max-w-lg px-4 pb-28 pt-8">
      <BackButton className="mb-3" />
      <StepIndicator currentStep={1} />

      <div className="mt-6 text-center">
        <h1 className="text-xl font-bold text-purple-900">なかよしキャラを選びましょう</h1>
        <p className="mt-1 text-sm text-violet-500">
          登録済みのなかよしキャラを絵本に登場させることができます。
        </p>
      </div>

      {companionsLoading ? (
        <p className="mt-10 text-center text-violet-400">読み込み中...</p>
      ) : companionsError ? (
        <div className="mt-8 rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center text-rose-700">
          {companionsError.message}
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {/* なしオプション */}
          <button
            type="button"
            onClick={() => setSelectedCompanionId(null)}
            className={cn(
              "w-full flex items-center gap-4 rounded-2xl border bg-white p-4 transition-all text-left",
              selectedCompanionId === null
                ? "border-purple-400 ring-2 ring-purple-200 shadow-md"
                : "border-violet-100 hover:border-purple-300 hover:shadow-sm"
            )}
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-violet-50 text-2xl">
              🚫
            </div>
            <div>
              <p className="font-bold text-purple-900">登場させない</p>
              <p className="text-xs text-violet-400">主人公ひとりの物語にします。</p>
            </div>
          </button>

          {/* なかよしキャラリスト */}
          {companions.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-violet-200 bg-violet-50 p-6 text-center">
              <p className="text-xs text-violet-500">登録済みのなかよしキャラがいません。</p>
              <Link href="/companions/create" className="mt-2 inline-block">
                <Button variant="outline" size="sm">なかよしキャラを作成する</Button>
              </Link>
            </div>
          ) : (
            <>
              {companions.map((companion) => (
                <button
                  key={companion.id}
                  type="button"
                  onClick={() => setSelectedCompanionId(companion.id)}
                  className={cn(
                    "w-full flex items-center gap-4 rounded-2xl border bg-white p-4 transition-all text-left",
                    selectedCompanionId === companion.id
                      ? "border-purple-400 ring-2 ring-purple-200 shadow-md"
                      : "border-violet-100 hover:border-purple-300 hover:shadow-sm"
                  )}
                >
                  {companion.generatedImageUrl ? (
                    <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full border border-violet-100">
                      <Image
                        src={companion.generatedImageUrl}
                        alt={companion.name}
                        fill
                        className="object-cover"
                      />
                    </div>
                  ) : (
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-violet-50 text-2xl">
                      {getSpeciesEmoji(companion.species)}
                    </div>
                  )}
                  <div className="flex-1 overflow-hidden">
                    <p className="truncate font-bold text-purple-900">{companion.name}</p>
                    <p className="text-xs text-violet-400">{getSpeciesLabel(companion.species)}</p>
                  </div>
                </button>
              ))}
              <div className="pt-1 text-center">
                <Link href="/companions/create" className="text-xs text-violet-400 hover:text-purple-600 hover:underline">
                  ＋ 新しいなかよしキャラを登録する
                </Link>
              </div>
            </>
          )}
        </div>
      )}

      <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-purple-100 bg-white/95 backdrop-blur-sm px-4 pb-[env(safe-area-inset-bottom,16px)] pt-3">
        <div className="mx-auto max-w-lg">
          <Button
            size="lg"
            className="w-full"
            onClick={handleNext}
          >
            次へ
          </Button>
        </div>
      </div>
    </PageTransition>
  );
}

export default function SelectCompanionPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-violet-400">読み込み中...</div>}>
      <SelectCompanionContent />
    </Suspense>
  );
}

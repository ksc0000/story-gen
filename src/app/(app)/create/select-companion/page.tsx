"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageTransition } from "@/components/page-transition";
import { BackButton } from "@/components/back-button";
import { StepIndicator } from "@/components/step-indicator";
import { useAuth } from "@/lib/hooks/use-auth";
import { useCompanions } from "@/app/(app)/companions/use-companions-hook";
import {
  getSpeciesEmoji,
  getSpeciesLabel,
  COMPANION_PRESETS,
  SPECIES_OPTIONS,
  buildVisualDescription,
} from "@/app/(app)/companions/companions-utils";
import { cn } from "@/lib/utils";
import type { CreationMode } from "@/lib/types";

type SelectionType = "none" | "preset" | "my";

interface Selection {
  type: SelectionType;
  id: string;
  companionId?: string;
  companionName?: string;
  companionVisualDescription?: string;
}

function SelectCompanionContent() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { companions, loading: companionsLoading } = useCompanions(user?.uid);

  const [selection, setSelection] = useState<Selection>({ type: "none", id: "none" });

  const childId = searchParams.get("childId");
  const mode = (searchParams.get("mode") as CreationMode | null) ?? "guided_ai";

  const handleNext = () => {
    const params = new URLSearchParams(searchParams.toString());

    if (selection.type === "none") {
      params.delete("companionId");
      params.delete("companionName");
      params.delete("companionVisualDescription");
    } else {
      if (selection.companionId) params.set("companionId", selection.companionId);
      else params.delete("companionId");
      if (selection.companionName) params.set("companionName", selection.companionName);
      if (selection.companionVisualDescription) params.set("companionVisualDescription", selection.companionVisualDescription);
    }

    params.set("protagonistType", childId ? "child" : "original_character");

    if (mode === "photo_story") router.push(`/create/photo-upload?${params.toString()}`);
    else if (mode === "guided_ai") router.push(`/create/ai-brief?${params.toString()}`);
    else router.push(`/create/input?${params.toString()}`);
  };

  const isSelected = (id: string) => selection.id === id;

  return (
    <PageTransition className="mx-auto max-w-lg px-4 pb-28 pt-8">
      <BackButton className="mb-3" />
      <StepIndicator currentStep={1} />

      <div className="mt-6 text-center">
        <h1 className="text-xl font-bold text-purple-900">なかよしキャラを選びましょう</h1>
        <p className="mt-1 text-sm text-violet-500">
          登場させるなかよしキャラを選んでください。登場させなくてもOKです。
        </p>
      </div>

      {companionsLoading ? (
        <p className="mt-10 text-center text-violet-400">読み込み中...</p>
      ) : (
        <motion.div
          className="mt-6 space-y-6"
          initial="hidden"
          animate="visible"
          variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.08 } } }}
        >
          {/* なしオプション */}
          <motion.button
            variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0, transition: { duration: 0.25 } } }}
            type="button"
            onClick={() => setSelection({ type: "none", id: "none" })}
            className={cn(
              "w-full flex items-center gap-4 rounded-2xl border bg-white p-4 transition-all text-left",
              isSelected("none")
                ? "border-purple-400 ring-2 ring-purple-200 shadow-md"
                : "border-violet-100 hover:border-purple-300 hover:shadow-sm"
            )}
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-violet-50 text-2xl">🚫</div>
            <div>
              <p className="font-bold text-purple-900">登場させない</p>
              <p className="text-xs text-violet-400">主人公ひとりの物語にします。</p>
            </div>
          </motion.button>

          {/* 公式プリセット */}
          <motion.div
            className="space-y-3"
            variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0, transition: { duration: 0.25 } } }}
          >
            <h2 className="flex items-center gap-2 text-sm font-bold text-purple-900">
              <span>🐾</span> みんなのなかよしキャラ
              <Badge variant="secondary" className="bg-violet-100 text-violet-600 border-none text-xs">公式</Badge>
            </h2>
            <div className="grid grid-cols-1 gap-2">
              {COMPANION_PRESETS.map((preset) => {
                const speciesOpt = SPECIES_OPTIONS.find((o) => o.value === preset.species);
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => {
                      const vd = buildVisualDescription({
                        species: preset.species,
                        personalities: preset.personality,
                        ability: preset.ability,
                        color: preset.color,
                        bodyType: preset.bodyType,
                        colorDepth: preset.colorDepth,
                        size: preset.size,
                        pattern: preset.pattern,
                        accessories: preset.accessories,
                      });
                      setSelection({
                        type: "preset",
                        id: preset.id,
                        companionName: preset.defaultName,
                        companionVisualDescription: vd,
                      });
                    }}
                    className={cn(
                      "flex items-center gap-3 rounded-2xl border bg-white p-3 transition-all text-left",
                      isSelected(preset.id)
                        ? "border-purple-400 ring-2 ring-purple-200 shadow-md"
                        : "border-violet-100 hover:border-purple-300 hover:shadow-sm"
                    )}
                  >
                    {speciesOpt?.imageUrl ? (
                      <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-xl">
                        <Image src={speciesOpt.imageUrl} alt={preset.defaultName} fill className="object-cover" unoptimized />
                      </div>
                    ) : (
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-xl">
                        {speciesOpt?.emoji}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-purple-900 text-sm">{preset.defaultName}</p>
                      <p className="text-xs text-violet-400 truncate">{preset.tagline}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </motion.div>

          {/* マイなかよしキャラ */}
          {companions.length > 0 && (
            <motion.div
              className="space-y-3"
              variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0, transition: { duration: 0.25 } } }}
            >
              <h2 className="text-sm font-bold text-purple-900 flex items-center gap-2">
                <span>✨</span> マイなかよしキャラ
              </h2>
              <div className="grid grid-cols-1 gap-2">
                {companions.map((companion) => (
                  <button
                    key={companion.id}
                    type="button"
                    onClick={() =>
                      setSelection({
                        type: "my",
                        id: companion.id,
                        companionId: companion.id,
                        companionName: companion.name,
                        companionVisualDescription: companion.visualDescription,
                      })
                    }
                    className={cn(
                      "flex items-center gap-3 rounded-2xl border bg-white p-3 transition-all text-left",
                      isSelected(companion.id)
                        ? "border-purple-400 ring-2 ring-purple-200 shadow-md"
                        : "border-violet-100 hover:border-purple-300 hover:shadow-sm"
                    )}
                  >
                    {companion.generatedImageUrl ? (
                      <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-xl border border-violet-100">
                        <Image src={companion.generatedImageUrl} alt={companion.name} fill className="object-cover" />
                      </div>
                    ) : (
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-xl">
                        {getSpeciesEmoji(companion.species)}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-purple-900 text-sm">{companion.name}</p>
                      <p className="text-xs text-violet-400">{getSpeciesLabel(companion.species)}</p>
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          <motion.div
            className="pt-1 text-center"
            variants={{ hidden: { opacity: 0 }, visible: { opacity: 1, transition: { duration: 0.3 } } }}
          >
            <Link href="/companions/create" className="text-xs text-violet-400 hover:text-purple-600 hover:underline">
              ＋ 新しいなかよしキャラを作る
            </Link>
          </motion.div>
        </motion.div>
      )}

      <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-purple-100 bg-white/95 backdrop-blur-sm px-4 pb-[env(safe-area-inset-bottom,16px)] pt-3">
        <div className="mx-auto max-w-lg">
          <Button size="lg" className="w-full" onClick={handleNext}>
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

"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { StepIndicator } from "@/components/step-indicator";
import { ThemeCard } from "@/components/theme-card";
import { PageTransition } from "@/components/page-transition";
import { StaggerContainer } from "@/components/stagger-container";
import { StaggerItem } from "@/components/stagger-item";
import { useTemplates } from "@/lib/hooks/use-templates";

function ThemeSelectionPageContent() {
  const { templates, loading, error } = useTemplates();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const childId = searchParams.get("childId");

  return (
    <PageTransition className="mx-auto max-w-5xl px-4 py-8">
      <StepIndicator currentStep={1} />
      <h1 className="mt-6 text-center text-xl font-bold text-purple-900">絵本ジャンルを選んでね</h1>
      {loading ? (
        <p className="mt-8 text-center text-violet-400">読み込み中...</p>
      ) : error ? (
        <div className="mt-8 rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-red-700">
          <p className="font-semibold">テンプレートの読み込みに失敗しました</p>
          <p className="mt-2 text-sm">{error.message}</p>
          <p className="mt-2 text-sm">Firestore のインデックスが不足している可能性があります。</p>
        </div>
      ) : (
        <StaggerContainer className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {templates.map((t) => (
            <StaggerItem key={t.id}>
              <ThemeCard template={t} selected={selectedId === t.id} onSelect={() => setSelectedId(t.id)} />
            </StaggerItem>
          ))}
        </StaggerContainer>
      )}
      <div className="mt-8 flex justify-center">
        <Button onClick={() => selectedId && router.push(`/create/input?theme=${selectedId}${childId ? `&childId=${childId}` : ""}`)} disabled={!selectedId} className="px-8">
          次へ
        </Button>
      </div>
    </PageTransition>
  );
}

export default function ThemeSelectionPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-violet-400">読み込み中...</div>}>
      <ThemeSelectionPageContent />
    </Suspense>
  );
}

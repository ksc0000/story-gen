"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { StepIndicator } from "@/components/step-indicator";
import { ThemeCard } from "@/components/theme-card";
import { useTemplates } from "@/lib/hooks/use-templates";

export default function ThemeSelectionPage() {
  const { templates, loading } = useTemplates();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const router = useRouter();

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <StepIndicator currentStep={1} />
      <h1 className="mt-6 text-center text-xl font-bold text-amber-900">テーマを選んでね</h1>
      {loading ? <p className="mt-8 text-center text-gray-400">読み込み中...</p> : (
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {templates.map((t) => <ThemeCard key={t.id} template={t} selected={selectedId === t.id} onSelect={() => setSelectedId(t.id)} />)}
        </div>
      )}
      <div className="mt-8 flex justify-center">
        <Button onClick={() => selectedId && router.push(`/create/input?theme=${selectedId}`)} disabled={!selectedId} className="bg-amber-600 hover:bg-amber-700 text-white px-8">次へ</Button>
      </div>
    </div>
  );
}

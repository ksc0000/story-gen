"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { StepIndicator } from "@/components/step-indicator";
import { ThemeCard } from "@/components/theme-card";
import { PageTransition } from "@/components/page-transition";
import { StaggerContainer } from "@/components/stagger-container";
import { StaggerItem } from "@/components/stagger-item";
import { useTemplates } from "@/lib/hooks/use-templates";
import { useCategoryGroups } from "@/lib/hooks/use-category-groups";
import type { CreationMode } from "@/lib/types";

const MODE_OPTIONS: Array<{
  mode: CreationMode;
  label: string;
  description: string;
}> = [
  { mode: "fixed_template", label: "テンプレート", description: "早い・安い・失敗しにくい" },
  { mode: "guided_ai", label: "かんたんカスタム", description: "質問に答えてAIが作る" },
  { mode: "original_ai", label: "オリジナル", description: "自由に作る" },
];

function ThemeSelectionPageContent() {
  const { templates, loading, error } = useTemplates();
  const { categoryGroups, loading: categoryLoading } = useCategoryGroups();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const childId = searchParams.get("childId");
  const selectedMode = (searchParams.get("mode") as CreationMode | null) ?? "guided_ai";
  const selectedCategoryGroupId = searchParams.get("category") ?? "all";

  const filteredTemplates = useMemo(() => {
    return templates.filter((template) => {
      const templateMode = template.creationMode ?? "guided_ai";
      if (templateMode !== selectedMode) return false;
      if (selectedCategoryGroupId !== "all" && template.categoryGroupId !== selectedCategoryGroupId) return false;
      return true;
    });
  }, [selectedCategoryGroupId, selectedMode, templates]);

  useEffect(() => {
    if (!filteredTemplates.some((template) => template.id === selectedId)) {
      setSelectedId(filteredTemplates[0]?.id ?? null);
    }
  }, [filteredTemplates, selectedId]);

  const updateQuery = (key: "mode" | "category", value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set(key, value);
    if (key === "mode") {
      params.set("category", "all");
    }
    router.replace(`/create/theme?${params.toString()}`);
  };

  return (
    <PageTransition className="mx-auto max-w-6xl px-4 py-8">
      <StepIndicator currentStep={1} />
      <h1 className="mt-6 text-center text-xl font-bold text-purple-900">絵本の作り方を選んでね</h1>
      <p className="mt-2 text-center text-sm text-violet-500">
        まずは作り方、そのあと親の目的に合わせてテーマを選べます。
      </p>

      <div className="mt-6 grid gap-3 md:grid-cols-3">
        {MODE_OPTIONS.map((option) => {
          const active = selectedMode === option.mode;
          return (
            <button
              key={option.mode}
              type="button"
              onClick={() => updateQuery("mode", option.mode)}
              className={`rounded-3xl border p-4 text-left transition ${
                active
                  ? "border-purple-400 bg-purple-50 shadow-sm"
                  : "border-[rgba(240,171,252,0.3)] bg-white hover:border-purple-300"
              }`}
            >
              <div className="text-sm font-semibold text-purple-900">{option.label}</div>
              <div className="mt-1 text-xs leading-relaxed text-violet-500">{option.description}</div>
            </button>
          );
        })}
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => updateQuery("category", "all")}
          className={`rounded-full px-4 py-2 text-sm transition ${
            selectedCategoryGroupId === "all"
              ? "bg-purple-600 text-white"
              : "bg-violet-50 text-violet-600 hover:bg-violet-100"
          }`}
        >
          すべて
        </button>
        {categoryGroups.map((group) => (
          <button
            key={group.id}
            type="button"
            onClick={() => updateQuery("category", group.id)}
            className={`rounded-full px-4 py-2 text-sm transition ${
              selectedCategoryGroupId === group.id
                ? "bg-purple-600 text-white"
                : "bg-violet-50 text-violet-600 hover:bg-violet-100"
            }`}
          >
            {group.icon} {group.name}
          </button>
        ))}
      </div>

      {loading || categoryLoading ? (
        <p className="mt-8 text-center text-violet-400">読み込み中...</p>
      ) : error ? (
        <div className="mt-8 rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-red-700">
          <p className="font-semibold">テンプレートの読み込みに失敗しました</p>
          <p className="mt-2 text-sm">{error.message}</p>
          <p className="mt-2 text-sm">Firestore のインデックスが不足している可能性があります。</p>
        </div>
      ) : filteredTemplates.length === 0 ? (
        <div className="mt-8 rounded-3xl border border-dashed border-violet-200 bg-violet-50 p-8 text-center text-violet-600">
          <p className="font-semibold">この条件に合うテーマはまだありません</p>
          <p className="mt-2 text-sm">作り方か目的を変えると、別の絵本が選べます。</p>
        </div>
      ) : (
        <StaggerContainer className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filteredTemplates.map((template) => (
            <StaggerItem key={template.id}>
              <ThemeCard
                template={template}
                selected={selectedId === template.id}
                onSelect={() => setSelectedId(template.id)}
              />
            </StaggerItem>
          ))}
        </StaggerContainer>
      )}

      <div className="mt-8 flex justify-center">
        <Button
          onClick={() =>
            selectedId &&
            router.push(
              `/create/input?theme=${selectedId}&mode=${selectedMode}${childId ? `&childId=${childId}` : ""}`
            )
          }
          disabled={!selectedId}
          className="px-8"
        >
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

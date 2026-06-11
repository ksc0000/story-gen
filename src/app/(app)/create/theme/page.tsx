"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StepIndicator } from "@/components/step-indicator";
import { ThemeCard } from "@/components/theme-card";
import { TemplatePreviewModal } from "@/components/template-preview-modal";
import { PageTransition } from "@/components/page-transition";
import { StaggerContainer } from "@/components/stagger-container";
import { StaggerItem } from "@/components/stagger-item";
import { useTemplates } from "@/lib/hooks/use-templates";
import { useCategoryGroups } from "@/lib/hooks/use-category-groups";
import { trackAnalyticsEvent } from "@/lib/analytics";
import { cn } from "@/lib/utils";
import type { CreationMode } from "@/lib/types";

const MODE_OPTIONS: Array<{
  mode: CreationMode;
  label: string;
  description: string;
  icon: string;
  recommended?: boolean;
}> = [
  {
    mode: "fixed_template",
    label: "できあがり絵本",
    description: "ストーリーは完成済み。名前と思い出を入れるだけ。約3分でできます。",
    icon: "⚡",
    recommended: true,
  },
  {
    mode: "guided_ai",
    label: "AIにおまかせ",
    description: "テーマを教えると、AIがオリジナルストーリーを作ります。",
    icon: "✨",
  },
  {
    mode: "original_ai",
    label: "自由に作る",
    description: "詳しく指示して、思い通りの絵本に。",
    icon: "✍️",
  },
];

function ThemeSelectionPageContent() {
  const { templates, loading, error } = useTemplates();
  const { categoryGroups, loading: categoryLoading } = useCategoryGroups();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [previewTemplateId, setPreviewTemplateId] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const childId = searchParams.get("childId");
  const selectedMode = (searchParams.get("mode") as CreationMode | null) ?? "guided_ai";
  const selectedCategoryGroupId = searchParams.get("category") ?? "all";
  const categoryGroupMap = useMemo(
    () => new Map(categoryGroups.map((group) => [group.id, group])),
    [categoryGroups]
  );

  const filteredTemplates = useMemo(() => {
    const list = templates.filter((template) => {
      const templateMode = template.creationMode ?? "guided_ai";
      if (templateMode !== selectedMode) return false;
      if (selectedCategoryGroupId !== "all" && template.categoryGroupId !== selectedCategoryGroupId) return false;
      return true;
    });

    // De-duplicate by name across all modes to avoid showing multiple page-count variants.
    const uniqueMap = new Map<string, (typeof templates)[0]>();
    for (const t of list) {
      if (!uniqueMap.has(t.name)) {
        uniqueMap.set(t.name, t);
      } else {
        // Prefer 8-page variant; otherwise prefer 4-page over other counts
        const existing = uniqueMap.get(t.name)!;
        const existingPages = existing.fixedStory?.pages?.length ?? (existing as { pageCount?: number }).pageCount ?? 0;
        const currentPages = t.fixedStory?.pages?.length ?? (t as { pageCount?: number }).pageCount ?? 0;
        if (currentPages === 8 || (existingPages !== 8 && currentPages === 4)) {
          uniqueMap.set(t.name, t);
        }
      }
    }
    return Array.from(uniqueMap.values()).sort((a, b) => a.order - b.order);
  }, [selectedCategoryGroupId, selectedMode, templates]);

  useEffect(() => {
    if (!filteredTemplates.some((template) => template.id === selectedId)) {
      setSelectedId(filteredTemplates[0]?.id ?? null);
    }
  }, [filteredTemplates, selectedId]);

  const groupedFixedTemplates = useMemo(() => {
    if (selectedMode !== "fixed_template" || selectedCategoryGroupId !== "all") {
      return [] as Array<{ groupId: string; groupName: string; groupIcon: string; templates: typeof filteredTemplates }>;
    }
    const buckets = new Map<string, typeof filteredTemplates>();
    for (const template of filteredTemplates) {
      const groupId = template.categoryGroupId ?? "uncategorized";
      const current = buckets.get(groupId) ?? [];
      current.push(template);
      buckets.set(groupId, current);
    }
    return Array.from(buckets.entries())
      .sort((a, b) => {
        const ga = categoryGroupMap.get(a[0]);
        const gb = categoryGroupMap.get(b[0]);
        return (ga?.order ?? 999) - (gb?.order ?? 999);
      })
      .map(([groupId, templates]) => {
        const group = categoryGroupMap.get(groupId);
        return {
          groupId,
          groupName: group?.name ?? "未分類",
          groupIcon: group?.icon ?? "📚",
          templates,
        };
      });
  }, [categoryGroupMap, filteredTemplates, selectedCategoryGroupId, selectedMode]);

  const updateQuery = (key: "mode" | "category", value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set(key, value);
    if (key === "mode") {
      params.set("category", "all");
    }
    router.replace(`/create/theme?${params.toString()}`);
  };

  const handleNext = () => {
    if (selectedMode === "fixed_template" && !selectedId) return;
    trackAnalyticsEvent("select_story_theme", {
      templateId: selectedId || "ai_custom",
      creationMode: selectedMode,
    });
    const params = new URLSearchParams();
    params.set("theme", selectedId || "");
    params.set("mode", selectedMode);
    if (childId) params.set("childId", childId);
    // companion params をスルーパス
    const companionId = searchParams.get("companionId");
    const companionName = searchParams.get("companionName");
    const companionVisualDescription = searchParams.get("companionVisualDescription");
    if (companionId) params.set("companionId", companionId);
    if (companionName) params.set("companionName", companionName);
    if (companionVisualDescription) params.set("companionVisualDescription", companionVisualDescription);
    router.push(`/create/input?${params.toString()}`);
  };

  return (
    <PageTransition className="mx-auto max-w-6xl px-4 py-4 pb-28 md:py-8 md:pb-32">
      <StepIndicator currentStep={1} />

      <div className="mt-6 space-y-4">
        <div className="text-center">
          <h1 className="text-lg font-bold text-purple-900 md:text-xl">作り方・テーマを選ぶ</h1>
          <p className="mt-1 text-xs text-violet-500 md:text-sm">
            目的や手間、自由度に合わせて選べます。
          </p>
        </div>

        <div className="flex flex-col gap-3">
        {MODE_OPTIONS.map((option) => {
          const active = selectedMode === option.mode;
          return (
            <button
              key={option.mode}
              type="button"
              onClick={() => updateQuery("mode", option.mode)}
              className={cn(
                "group relative flex flex-col items-start rounded-2xl border p-4 text-left transition-all",
                active
                  ? "border-purple-400 ring-2 ring-purple-200 bg-purple-50 shadow-sm"
                  : "border-purple-100 bg-white hover:border-purple-300"
              )}
            >
              <div className="flex w-full items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{option.icon}</span>
                  <div className="text-sm font-bold text-purple-900 md:text-base">{option.label}</div>
                  {option.recommended && (
                    <Badge variant="default" className="bg-amber-100 text-amber-700 border-amber-200">
                      おすすめ ✨
                    </Badge>
                  )}
                </div>
              </div>
              <div className="mt-1 text-xs leading-relaxed text-violet-500 md:text-sm">
                {option.description}
              </div>
            </button>
          );
        })}
        </div>
      </div>

      <div className="mt-6 flex overflow-x-auto gap-2 pb-2 no-scrollbar">
        <button
          type="button"
          onClick={() => updateQuery("category", "all")}
          className={cn(
            "rounded-full border px-3 py-1 text-sm whitespace-nowrap transition-colors",
            selectedCategoryGroupId === "all"
              ? "bg-purple-100 border-purple-400 text-purple-700 font-medium"
              : "border-purple-100 bg-white text-purple-600 hover:border-purple-300"
          )}
        >
          すべて
        </button>
        {categoryGroups.map((group) => (
          <button
            key={group.id}
            type="button"
            onClick={() => updateQuery("category", group.id)}
            className={cn(
              "flex items-center gap-1 rounded-full border px-3 py-1 text-sm whitespace-nowrap transition-colors",
              selectedCategoryGroupId === group.id
                ? "bg-purple-100 border-purple-400 text-purple-700 font-medium"
                : "border-purple-100 bg-white text-purple-600 hover:border-purple-300"
            )}
          >
            <span>{group.icon}</span>
            <span>{group.name}</span>
          </button>
        ))}
      </div>

      {selectedMode === "fixed_template" ? (
        loading || categoryLoading ? (
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
        ) : groupedFixedTemplates.length > 0 ? (
          <div className="mt-6 space-y-6">
            {groupedFixedTemplates.map((group) => (
              <section key={group.groupId} className="space-y-3">
                <div className="flex items-center justify-between gap-3 rounded-2xl border border-violet-100 bg-violet-50/50 px-4 py-2">
                  <h2 className="text-sm font-semibold text-purple-900">{group.groupIcon} {group.groupName}</h2>
                  <span className="text-xs text-violet-500">{group.templates.length}件</span>
                </div>
                <StaggerContainer className="grid grid-cols-2 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {group.templates.map((template) => (
                    <StaggerItem key={template.id}>
                      <ThemeCard
                        template={template}
                        selected={selectedId === template.id}
                        onSelect={() => setSelectedId(template.id)}
                        onPreview={template.fixedStory ? () => setPreviewTemplateId(template.id) : undefined}
                        categoryName={group.groupName}
                      />
                    </StaggerItem>
                  ))}
                </StaggerContainer>
              </section>
            ))}
          </div>
        ) : (
          <StaggerContainer className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {filteredTemplates.map((template) => (
              <StaggerItem key={template.id}>
                <ThemeCard
                  template={template}
                  selected={selectedId === template.id}
                  onSelect={() => setSelectedId(template.id)}
                  onPreview={template.fixedStory ? () => setPreviewTemplateId(template.id) : undefined}
                  categoryName={categoryGroupMap.get(template.categoryGroupId ?? "")?.name}
                />
              </StaggerItem>
            ))}
          </StaggerContainer>
        )
      ) : (
        <div className="mt-8 text-center text-violet-500">選択したテーマをもとにAIが作ります</div>
      )}

      {/* 画面下部固定 — iPhone セーフエリア対応 */}
      <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-purple-100 bg-white/95 backdrop-blur-sm px-4 pb-[env(safe-area-inset-bottom,16px)] pt-3">
        <div className="mx-auto max-w-lg">
          <Button
            size="lg"
            className="w-full"
            disabled={selectedMode === "fixed_template" && !selectedId}
            onClick={handleNext}
          >
            次へ
          </Button>
        </div>
      </div>

      <TemplatePreviewModal
        template={previewTemplateId ? (templates.find((t) => t.id === previewTemplateId) ?? null) : null}
        isOpen={previewTemplateId !== null}
        onClose={() => setPreviewTemplateId(null)}
      />
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

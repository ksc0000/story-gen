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
import { useAuth } from "@/lib/hooks/use-auth";
import { useChildren } from "@/lib/hooks/use-children";
import { trackAnalyticsEvent } from "@/lib/analytics";
import type { CreationMode } from "@/lib/types";

const MODE_OPTIONS: Array<{
  mode: CreationMode;
  label: string;
  icon: string;
  description: string;
  shortDescription: string;
}> = [
  {
    mode: "fixed_template",
    label: "テンプレート",
    icon: "⚡️",
    description: "「すぐに作れる！約2分」早い・安い・失敗しにくい",
    shortDescription: "早い・安定",
  },
  {
    mode: "guided_ai",
    label: "かんたんカスタム",
    icon: "🎨",
    description: "「AIと一緒にお話作り」質問に答えてAIが作る",
    shortDescription: "質問に答える",
  },
  {
    mode: "original_ai",
    label: "オリジナル",
    icon: "✍️",
    description: "「自由な発想で」自由に作る",
    shortDescription: "自由に作る",
  },
];

function ThemeSelectionPageContent() {
  const { user } = useAuth();
  const { children } = useChildren(user?.uid);
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

    if (selectedMode !== "fixed_template") return list;

    const uniqueMap = new Map<string, (typeof templates)[0]>();
    for (const t of list) {
      if (!uniqueMap.has(t.name)) {
        uniqueMap.set(t.name, t);
      } else {
        const existing = uniqueMap.get(t.name)!;
        const existingPages = existing.fixedStory?.pages?.length ?? 0;
        const currentPages = t.fixedStory?.pages?.length ?? 0;
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

  const previewTemplate = useMemo(
    () => templates.find((t) => t.id === previewTemplateId) ?? null,
    [previewTemplateId, templates]
  );

  const updateQuery = (key: "mode" | "category", value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set(key, value);
    if (key === "mode") {
      params.set("category", "all");
    }
    router.replace(`/create/theme?${params.toString()}`);
  };

  const selectedChild = useMemo(() => {
    return children.find((c) => c.id === childId);
  }, [children, childId]);

  const showAvatarNudge = selectedChild && !selectedChild.visualProfile?.approvedImageUrl;

  return (
    <PageTransition className="mx-auto max-w-6xl px-4 py-4 md:py-8">
      <StepIndicator currentStep={1} />

      {showAvatarNudge && (
        <div className="mt-4 text-center">
          <p className="inline-flex items-center gap-1.5 rounded-full bg-violet-50 px-3 py-1 text-[11px] font-medium text-violet-600 border border-violet-100">
            <span>💡</span>
            アバターを設定するとキャラクターがもっと一致します
          </p>
        </div>
      )}

      <div className="mt-6 space-y-4">
        <div className="text-center">
          <h1 className="text-lg font-bold text-purple-900 md:text-xl">作り方・テーマを選ぶ</h1>
          <p className="mt-1 text-xs text-violet-500 md:text-sm">
            どんな絵本にしますか？スタイルと内容を選びましょう
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2 md:gap-3">
        {MODE_OPTIONS.map((option) => {
          const active = selectedMode === option.mode;
          return (
            <button
              key={option.mode}
              type="button"
              onClick={() => updateQuery("mode", option.mode)}
              className={`relative rounded-2xl border px-2 py-3 text-center transition md:rounded-3xl md:p-4 md:text-left ${
                active
                  ? "border-purple-400 bg-purple-50 shadow-sm"
                  : "border-[rgba(240,171,252,0.3)] bg-white hover:border-purple-300"
              }`}
            >
              {option.mode === "fixed_template" && (
                <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 md:left-4 md:translate-x-0">
                  <Badge variant="default" className="bg-amber-100 text-amber-700 border-amber-200 text-[10px] h-4.5 px-1.5 font-bold">おすすめ</Badge>
                </div>
              )}
              <div className="flex flex-col items-center md:flex-row md:items-start md:gap-2">
                <span className="text-lg md:text-xl">{option.icon}</span>
                <div className="text-xs font-bold text-purple-900 md:text-sm">{option.label}</div>
              </div>
              <div className="mt-1 hidden text-[10px] leading-tight text-violet-500 md:block md:text-xs md:leading-relaxed whitespace-pre-wrap">
                {option.description}
              </div>
              <div className="mt-0.5 block text-[9px] leading-tight text-violet-400 md:hidden">
                {option.shortDescription}
              </div>
            </button>
          );
        })}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 sm:flex sm:flex-wrap">
        <button
          type="button"
          onClick={() => updateQuery("category", "all")}
          className={`flex items-center justify-center rounded-xl px-2 py-2 text-xs transition sm:rounded-full sm:px-4 sm:py-2 sm:text-sm ${
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
            className={`flex items-center justify-center rounded-xl px-2 py-2 text-xs transition sm:rounded-full sm:px-4 sm:py-2 sm:text-sm ${
              selectedCategoryGroupId === group.id
                ? "bg-purple-600 text-white"
                : "bg-violet-50 text-violet-600 hover:bg-violet-100"
            }`}
          >
            <span className="mr-1 hidden sm:inline">{group.icon}</span>
            <span className="truncate">{group.name}</span>
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
      ) : groupedFixedTemplates.length > 0 ? (
        <div className="mt-6 space-y-6">
          {groupedFixedTemplates.map((group) => (
            <section key={group.groupId} className="space-y-3">
              <div className="flex items-center justify-between gap-3 rounded-2xl border border-violet-100 bg-violet-50/50 px-4 py-2">
                <h2 className="text-sm font-semibold text-purple-900">{group.groupIcon} {group.groupName}</h2>
                <span className="text-xs text-violet-500">{group.templates.length}件</span>
              </div>
              <StaggerContainer className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {group.templates.map((template) => (
                  <StaggerItem key={template.id}>
                    <ThemeCard
                      template={template}
                      selected={selectedId === template.id}
                      onSelect={() => setSelectedId(template.id)}
                      onPreview={() => setPreviewTemplateId(template.id)}
                      categoryName={group.groupName}
                    />
                  </StaggerItem>
                ))}
              </StaggerContainer>
            </section>
          ))}
        </div>
      ) : (
        <StaggerContainer className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filteredTemplates.map((template) => (
            <StaggerItem key={template.id}>
              <ThemeCard
                template={template}
                selected={selectedId === template.id}
                onSelect={() => setSelectedId(template.id)}
                onPreview={() => setPreviewTemplateId(template.id)}
                categoryName={categoryGroupMap.get(template.categoryGroupId ?? "")?.name}
              />
            </StaggerItem>
          ))}
        </StaggerContainer>
      )}

      <TemplatePreviewModal
        template={previewTemplate}
        isOpen={!!previewTemplateId}
        onClose={() => setPreviewTemplateId(null)}
      />

      <div className="mt-8 flex justify-center">
        <Button
          onClick={() => {
            if (!selectedId) return;
            trackAnalyticsEvent("select_story_theme", {
              templateId: selectedId,
              creationMode: selectedMode,
            });
            router.push(
              `/create/style?theme=${selectedId}&mode=${selectedMode}${childId ? `&childId=${childId}` : ""}`
            );
          }}
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

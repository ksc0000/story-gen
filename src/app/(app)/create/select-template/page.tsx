"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { StepIndicator } from "@/components/step-indicator";
import { ThemeCard } from "@/components/theme-card";
import { TemplateDetailDialog } from "@/components/template-detail-dialog";
import { PageTransition } from "@/components/page-transition";
import { BackButton } from "@/components/back-button";
import { StaggerContainer } from "@/components/stagger-container";
import { StaggerItem } from "@/components/stagger-item";
import { useTemplates } from "@/lib/hooks/use-templates";
import { useCategoryGroups } from "@/lib/hooks/use-category-groups";
import { useAuth } from "@/lib/hooks/use-auth";
import { useUserProfile } from "@/lib/hooks/use-user-profile";
import { PLAN_CONFIGS, resolveProductPlan } from "@/lib/plans";
import { trackAnalyticsEvent } from "@/lib/analytics";
import { cn } from "@/lib/utils";

function SelectTemplateContent() {
  const { user } = useAuth();
  const { profile } = useUserProfile(user?.uid);
  const { templates, loading, error } = useTemplates();
  const { categoryGroups, loading: categoryLoading } = useCategoryGroups();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailTemplateId, setDetailTemplateId] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const childId = searchParams.get("childId");
  const selectedCategoryGroupId = searchParams.get("category") ?? "all";
  const categoryGroupMap = useMemo(
    () => new Map(categoryGroups.map((group) => [group.id, group])),
    [categoryGroups]
  );

  const getTemplateBaseId = (t: { id: string; variantOf?: string }) =>
    t.variantOf ?? t.id.replace(/-\d+p$/, "");

  const templateVariantsMap = useMemo(() => {
    const map = new Map<string, (typeof templates)[0][]>();
    for (const t of templates) {
      if ((t.creationMode ?? "guided_ai") !== "fixed_template") continue;
      const baseId = getTemplateBaseId(t);
      const arr = map.get(baseId) ?? [];
      arr.push(t);
      map.set(baseId, arr);
    }
    for (const arr of map.values()) {
      arr.sort(
        (a, b) =>
          (a.fixedStory?.pages?.length ?? 4) - (b.fixedStory?.pages?.length ?? 4)
      );
    }
    return map;
  }, [templates]);

  // ストーリー（base）ごとの対応ページ数（例: [4, 8]）。カードのタグ表示に使う。
  const getAvailablePageCounts = (t: (typeof templates)[0]): number[] => {
    const variants = templateVariantsMap.get(getTemplateBaseId(t)) ?? [t];
    const counts = new Set<number>();
    for (const v of variants) counts.add(v.fixedStory?.pages?.length ?? 4);
    return Array.from(counts).sort((a, b) => a - b);
  };

  const filteredTemplates = useMemo(() => {
    const list = templates.filter((template) => {
      const templateMode = template.creationMode ?? "guided_ai";
      if (templateMode !== "fixed_template") return false;
      if (selectedCategoryGroupId !== "all" && template.categoryGroupId !== selectedCategoryGroupId) return false;
      return true;
    });

    const uniqueMap = new Map<string, (typeof templates)[0]>();
    for (const t of list) {
      const baseId = getTemplateBaseId(t);
      if (!uniqueMap.has(baseId)) {
        uniqueMap.set(baseId, t);
      } else {
        const existing = uniqueMap.get(baseId)!;
        const existingPages = existing.fixedStory?.pages?.length ?? 4;
        const currentPages = t.fixedStory?.pages?.length ?? 4;
        if (currentPages < existingPages) {
          uniqueMap.set(baseId, t);
        }
      }
    }
    return Array.from(uniqueMap.values()).sort((a, b) => a.order - b.order);
  }, [selectedCategoryGroupId, templates]);

  useEffect(() => {
    if (!filteredTemplates.some((template) => template.id === selectedId)) {
      setSelectedId(filteredTemplates[0]?.id ?? null);
    }
  }, [filteredTemplates, selectedId]);

  const groupedFixedTemplates = useMemo(() => {
    if (selectedCategoryGroupId !== "all") {
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
  }, [categoryGroupMap, filteredTemplates, selectedCategoryGroupId]);

  const updateCategory = (category: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("category", category);
    router.replace(`/create/select-template?${params.toString()}`);
  };

  const handleNext = (overrideId?: string) => {
    const effectiveId = overrideId ?? selectedId;
    if (!effectiveId) return;
    trackAnalyticsEvent("select_story_theme", {
      templateId: effectiveId,
      creationMode: "fixed_template",
    });
    // Preserve all incoming params (companionId, protagonistType, etc.)
    const params = new URLSearchParams(searchParams.toString());
    params.set("mode", "fixed_template");
    params.set("theme", effectiveId);
    // Remove category filter — not relevant downstream
    params.delete("category");

    router.push(`/create/select-companion?${params.toString()}`);
  };

  return (
    <PageTransition className="mx-auto max-w-6xl px-4 py-4 pb-28 md:py-8 md:pb-32">
      <BackButton className="mb-3" />
      <StepIndicator currentStep={1} />

      <div className="mt-6">
        <div className="text-center mb-4">
          <h1 className="text-lg font-bold text-purple-900 md:text-xl">テーマを選ぶ</h1>
          <p className="mt-1 text-xs text-violet-500 md:text-sm">
            読み聞かせしたいシーンや季節に合わせて選べます。
          </p>
        </div>

        {/* カテゴリフィルター */}
        <div className="flex overflow-x-auto gap-2 pb-2 no-scrollbar">
          <button
            type="button"
            onClick={() => updateCategory("all")}
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
              onClick={() => updateCategory(group.id)}
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
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={selectedCategoryGroupId}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
        >
          {loading || categoryLoading ? (
            <p className="mt-8 text-center text-violet-400">読み込み中...</p>
          ) : error ? (
            <div className="mt-8 rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-red-700">
              <p className="font-semibold">テンプレートの読み込みに失敗しました</p>
              <p className="mt-2 text-sm">{error.message}</p>
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div className="mt-8 rounded-3xl border border-dashed border-violet-200 bg-violet-50 p-8 text-center text-violet-600">
              <p className="font-semibold">この条件に合うテーマはまだありません</p>
              <p className="mt-2 text-sm">別のカテゴリを選んでみてください。</p>
            </div>
          ) : groupedFixedTemplates.length > 0 ? (
            <div className="mt-6 space-y-6">
              {groupedFixedTemplates.map((group) => (
                <section key={group.groupId} className="space-y-3">
                  <div className="flex items-center justify-between gap-3 rounded-2xl border border-violet-100 bg-violet-50/50 px-4 py-2">
                    <h2 className="text-sm font-semibold text-purple-900">{group.groupIcon} {group.groupName}</h2>
                    <span className="text-xs text-violet-500">{group.templates.length}件</span>
                  </div>
                  <StaggerContainer className="grid grid-cols-3 gap-2 sm:grid-cols-3 xl:grid-cols-4">
                    {group.templates.map((template) => (
                      <StaggerItem key={template.id}>
                        <ThemeCard
                          template={template}
                          selected={selectedId === template.id}
                          onSelect={() => setDetailTemplateId(template.id)}
                          availablePageCounts={getAvailablePageCounts(template)}
                          categoryName={group.groupName}
                        />
                      </StaggerItem>
                    ))}
                  </StaggerContainer>
                </section>
              ))}
            </div>
          ) : (
            <StaggerContainer className="mt-6 grid grid-cols-3 gap-2 sm:grid-cols-3 xl:grid-cols-4">
              {filteredTemplates.map((template) => (
                <StaggerItem key={template.id}>
                  <ThemeCard
                    template={template}
                    selected={selectedId === template.id}
                    onSelect={() => setDetailTemplateId(template.id)}
                    availablePageCounts={getAvailablePageCounts(template)}
                    categoryName={categoryGroupMap.get(template.categoryGroupId ?? "")?.name}
                  />
                </StaggerItem>
              ))}
            </StaggerContainer>
          )}
        </motion.div>
      </AnimatePresence>

      {/* 画面下部固定 */}
      <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-purple-100 bg-white/95 backdrop-blur-sm px-4 pb-[env(safe-area-inset-bottom,16px)] pt-3">
        <div className="mx-auto max-w-lg">
          <Button
            size="lg"
            className="w-full"
            disabled={!selectedId}
            onClick={() => handleNext()}
          >
            次へ
          </Button>
        </div>
      </div>

      <TemplateDetailDialog
        template={detailTemplateId ? (templates.find((t) => t.id === detailTemplateId) ?? null) : null}
        variants={detailTemplateId ? (() => {
          const t = templates.find((t) => t.id === detailTemplateId);
          return t ? (templateVariantsMap.get(getTemplateBaseId(t)) ?? []) : [];
        })() : []}
        allowedPageCounts={
          PLAN_CONFIGS[
            resolveProductPlan(profile)
          ]?.allowedPageCounts
        }
        isOpen={detailTemplateId !== null}
        onClose={() => setDetailTemplateId(null)}
        onConfirm={(confirmedId) => {
          setSelectedId(confirmedId);
          setDetailTemplateId(null);
          handleNext(confirmedId);
        }}
      />
    </PageTransition>
  );
}

export default function SelectTemplatePage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-violet-400">読み込み中...</div>}>
      <SelectTemplateContent />
    </Suspense>
  );
}

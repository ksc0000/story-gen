"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { PLAN_CONFIGS } from "@/lib/plans";
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
    mode: "photo_story",
    label: "写真から作る",
    description: "3〜5枚の写真から、AIが思い出を絵本に描き直します。",
    icon: "📸",
  },
];

function ThemeSelectionPageContent() {
  const { user } = useAuth();
  const { profile } = useUserProfile(user?.uid);
  const { templates, loading, error } = useTemplates();
  const { categoryGroups, loading: categoryLoading } = useCategoryGroups();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailTemplateId, setDetailTemplateId] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const childId = searchParams.get("childId");
  const selectedMode = (searchParams.get("mode") as CreationMode | null) ?? "guided_ai";
  const selectedCategoryGroupId = searchParams.get("category") ?? "all";
  const categoryGroupMap = useMemo(
    () => new Map(categoryGroups.map((group) => [group.id, group])),
    [categoryGroups]
  );

  /** baseId → all page-count variants of that template, sorted by page count asc */
  const templateVariantsMap = useMemo(() => {
    const map = new Map<string, (typeof templates)[0][]>();
    for (const t of templates) {
      if ((t.creationMode ?? "guided_ai") !== selectedMode) continue;
      const baseId = t.id.replace(/-8p$/, "");
      const arr = map.get(baseId) ?? [];
      arr.push(t);
      map.set(baseId, arr);
    }
    // Sort each group by page count ascending (4p before 8p)
    for (const arr of map.values()) {
      arr.sort(
        (a, b) =>
          (a.fixedStory?.pages?.length ?? 4) - (b.fixedStory?.pages?.length ?? 4)
      );
    }
    return map;
  }, [selectedMode, templates]);

  const filteredTemplates = useMemo(() => {
    const list = templates.filter((template) => {
      const templateMode = template.creationMode ?? "guided_ai";
      if (templateMode !== selectedMode) return false;
      if (selectedCategoryGroupId !== "all" && template.categoryGroupId !== selectedCategoryGroupId) return false;
      return true;
    });

    // De-duplicate by base ID (strip -8p suffix) — show one card per template group.
    // Prefer the 4p variant as the primary display card.
    const uniqueMap = new Map<string, (typeof templates)[0]>();
    for (const t of list) {
      const baseId = t.id.replace(/-8p$/, "");
      if (!uniqueMap.has(baseId)) {
        uniqueMap.set(baseId, t);
      } else {
        const existing = uniqueMap.get(baseId)!;
        const existingPages = existing.fixedStory?.pages?.length ?? 4;
        const currentPages = t.fixedStory?.pages?.length ?? 4;
        // Prefer 4-page as primary (smallest count wins)
        if (currentPages < existingPages) {
          uniqueMap.set(baseId, t);
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

  const handleNext = (overrideId?: string) => {
    const effectiveId = overrideId ?? selectedId;
    if (selectedMode === "fixed_template" && !effectiveId) return;
    trackAnalyticsEvent("select_story_theme", {
      templateId: effectiveId || "ai_custom",
      creationMode: selectedMode,
    });
    // companion params をスルーパス
    const companionId = searchParams.get("companionId");
    const companionName = searchParams.get("companionName");
    const companionVisualDescription = searchParams.get("companionVisualDescription");

    const params = new URLSearchParams();
    if (childId) params.set("childId", childId);
    if (companionId) params.set("companionId", companionId);
    if (companionName) params.set("companionName", companionName);
    if (companionVisualDescription) params.set("companionVisualDescription", companionVisualDescription);

    if (selectedMode === "photo_story") {
      params.set("mode", selectedMode);
      router.push(`/create/photo-upload?${params.toString()}`);
      return;
    }

    if (selectedMode === "guided_ai") {
      // 新フロー: AIにおまかせ → ai-brief 入力ページへ
      params.set("mode", selectedMode);
      if (effectiveId) params.set("theme", effectiveId); // ベーステンプレートID
      router.push(`/create/ai-brief?${params.toString()}`);
      return;
    }

    // fixed_template / original_ai は既存の入力ページへ
    params.set("theme", effectiveId || "");
    params.set("mode", selectedMode);
    router.push(`/create/input?${params.toString()}`);
  };

  return (
    <PageTransition className="mx-auto max-w-6xl px-4 py-4 pb-28 md:py-8 md:pb-32">
      <BackButton className="mb-3" />
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
          const currentPlan = profile?.productPlan ?? (profile?.plan === "premium" ? "standard_paid" : "free");
          const planConfig = PLAN_CONFIGS[currentPlan];
          const isAllowed = planConfig?.allowedCreationModes.includes(option.mode);

          return (
            <div key={option.mode} className="relative">
              <button
                type="button"
                onClick={() => updateQuery("mode", option.mode)}
                className={cn(
                  "group relative flex w-full flex-col items-start rounded-2xl border p-4 text-left transition-all",
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
                    {!isAllowed && (
                      <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700">
                        プレミアムプラン限定
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="mt-1 text-xs leading-relaxed text-violet-500 md:text-sm">
                  {option.description}
                </div>
              </button>
              {!isAllowed && (
                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                  <Link
                    href="/pricing"
                    className="text-xs font-bold text-purple-600 hover:underline"
                  >
                    アップグレード
                  </Link>
                </div>
              )}
            </div>
          );
        })}
        </div>
      </div>

      {/* カテゴリフィルター: fixed_template のみ表示 */}
      {selectedMode === "fixed_template" && (
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
      )}

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
                <StaggerContainer className="grid grid-cols-3 gap-2 sm:grid-cols-3 xl:grid-cols-4">
                  {group.templates.map((template) => (
                    <StaggerItem key={template.id}>
                      <ThemeCard
                        template={template}
                        selected={selectedId === template.id}
                        onSelect={() => setDetailTemplateId(template.id)}
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
                  categoryName={categoryGroupMap.get(template.categoryGroupId ?? "")?.name}
                />
              </StaggerItem>
            ))}
          </StaggerContainer>
        )
      ) : selectedMode === "photo_story" ? (
        /* Photo Story: 期待値調整カード */
        <div className="mt-6 rounded-2xl border border-purple-100 bg-gradient-to-b from-purple-50 to-violet-50 p-6">
          <div className="text-center">
            <p className="text-4xl">📸</p>
            <h2 className="mt-2 text-lg font-bold text-purple-900">
              写真から作る（Photo Story）
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-violet-600">
              AIがあなたの写真の「瞬間」をもとに、絵本の世界に描き直します。
              <br />
              写真の忠実なコピーではなく、絵本ならではの温かいタッチでお届けします。
            </p>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            {[
              { icon: "🖼️", text: "3〜5枚の写真を\nアップロード" },
              { icon: "✨", text: "AIがストーリーを\n再構築" },
              { icon: "🎨", text: "絵本風のイラストで\nお届け" },
            ].map((item) => (
              <div
                key={item.icon}
                className="rounded-xl bg-white/70 px-2 py-3 text-center"
              >
                <p className="text-xl">{item.icon}</p>
                <p className="mt-1 whitespace-pre-line text-[10px] leading-tight text-violet-600">
                  {item.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      ) : selectedMode === "guided_ai" ? (
        /* AIにおまかせ: 新フロー紹介カード */
        <div className="mt-6 rounded-2xl border border-purple-100 bg-gradient-to-b from-purple-50 to-violet-50 p-6">
          <div className="text-center">
            <p className="text-4xl">✨</p>
            <h2 className="mt-2 text-lg font-bold text-purple-900">
              AIと一緒に作るオリジナル絵本
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-violet-600">
              主人公とストーリーのアイデアを入力するだけ。
              <br />
              AIが起承転結のある読み応えのある絵本を作ります。
            </p>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            {[
              { icon: "👶", text: "子どもが主人公の成長・冒険の話" },
              { icon: "🌟", text: "架空キャラの本格ファンタジー" },
              { icon: "📖", text: "しっかりした起承転結の物語" },
            ].map((item) => (
              <div
                key={item.icon}
                className="rounded-xl bg-white/70 px-2 py-3 text-center"
              >
                <p className="text-xl">{item.icon}</p>
                <p className="mt-1 text-xs leading-tight text-violet-600">
                  {item.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* original_ai: 詳細説明カード */
        <div className="mt-6 rounded-2xl border border-violet-100 bg-gradient-to-b from-violet-50 to-white p-6">
          <div className="text-center">
            <p className="text-4xl">✍️</p>
            <h2 className="mt-2 text-lg font-bold text-purple-900">
              思い通りの絵本を自由に作る
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-violet-600">
              登場人物・場所・伝えたいことを詳しく入力するほど、
              <br />
              AIがあなたのイメージに近いストーリーを生成します。
            </p>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            {[
              { icon: "💬", text: "細かく自由に\n指定できる" },
              { icon: "🎨", text: "世界観や雰囲気を\n自分で設定" },
              { icon: "📝", text: "思い出や教えたいことも\n自由に入力" },
            ].map((item) => (
              <div key={item.icon} className="rounded-xl bg-white/70 px-2 py-3 text-center">
                <p className="text-xl">{item.icon}</p>
                <p className="mt-1 whitespace-pre-line text-xs leading-tight text-violet-600">
                  {item.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 画面下部固定 — iPhone セーフエリア対応 */}
      <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-purple-100 bg-white/95 backdrop-blur-sm px-4 pb-[env(safe-area-inset-bottom,16px)] pt-3">
        <div className="mx-auto max-w-lg">
          {(() => {
            const currentPlan = profile?.productPlan ?? (profile?.plan === "premium" ? "standard_paid" : "free");
            const planConfig = PLAN_CONFIGS[currentPlan];
            const isAllowed = planConfig?.allowedCreationModes.includes(selectedMode);

            if (!isAllowed) {
              return (
                <Link href="/pricing" className="block w-full">
                  <Button size="lg" className="w-full">
                    アップグレードして作る
                  </Button>
                </Link>
              );
            }

            return (
              <Button
                size="lg"
                className="w-full"
                disabled={selectedMode === "fixed_template" && !selectedId}
                onClick={() => handleNext()}
              >
                次へ
              </Button>
            );
          })()}
        </div>
      </div>

      <TemplateDetailDialog
        template={detailTemplateId ? (templates.find((t) => t.id === detailTemplateId) ?? null) : null}
        variants={detailTemplateId ? (templateVariantsMap.get(detailTemplateId.replace(/-8p$/, "")) ?? []) : []}
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

export default function ThemeSelectionPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-violet-400">読み込み中...</div>}>
      <ThemeSelectionPageContent />
    </Suspense>
  );
}

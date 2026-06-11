"use client";

import Image from "next/image";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { AnimatedCard } from "@/components/animated-card";
import { Button } from "@/components/ui/button";
import { trackAnalyticsEvent } from "@/lib/analytics";
import type { PriceTier, StoryCostLevel, TemplateDoc } from "@/lib/types";

const ICON_MAP: Record<string, string> = {
  "🎂": "🎂",
  "🌙": "🌙",
  "⛰️": "⛰️",
  "🌸": "🌸",
  "🐾": "🐾",
  "🍳": "🍳",
  "⭐": "⭐",
  "🏠": "🏠",
  "🪄": "🪄",
  "🪥": "🪥",
  "🔤": "🔤",
  "🤖": "🤖",
};

interface ThemeCardProps {
  template: TemplateDoc & { id: string };
  selected: boolean;
  onSelect: () => void;
  onPreview?: () => void;
  categoryName?: string;
}

const PRICE_TIER_LABELS: Record<PriceTier, string> = {
  ume: "軽量",
  take: "おすすめ",
  matsu: "自由に作れる",
};

const STORY_COST_LABELS: Record<StoryCostLevel, string> = {
  none: "すぐ作れる",
  low: "かんたん調整",
  standard: "しっかり生成",
};

function getModeSummary(template: TemplateDoc): string {
  if (template.creationMode === "fixed_template") {
    return "早い・安定・迷いにくい";
  }
  if (template.creationMode === "original_ai") {
    return "自由度高め";
  }
  return "質問に答えて作る";
}

function getModeSupportText(template: TemplateDoc): string | null {
  if (template.creationMode === "fixed_template") {
    return "4ページ構成 / ストーリー確認済み / 早く作れる";
  }
  return null;
}

function getAgeLabel(template: TemplateDoc): string | null {
  if (template.recommendedAgeMin == null && template.recommendedAgeMax == null) return null;
  if (template.recommendedAgeMin != null && template.recommendedAgeMax != null) {
    return `${template.recommendedAgeMin}-${template.recommendedAgeMax}歳`;
  }
  if (template.recommendedAgeMin != null) return `${template.recommendedAgeMin}歳+`;
  return `~${template.recommendedAgeMax}歳`;
}

export function ThemeCard({ template, selected, onSelect, onPreview, categoryName }: ThemeCardProps) {
  const iconSrc = ICON_MAP[template.icon];
  const [showSamples, setShowSamples] = useState(false);
  const hasQualitySamples = Boolean(template.sampleImages?.light || template.sampleImages?.premium);
  const ageLabel = getAgeLabel(template);
  const previewImageUrl = template.fixedStory?.previewImageUrl || template.sampleImageUrl;

  return (
    <AnimatedCard onClick={onSelect}>
      <Card className={`h-full cursor-pointer overflow-hidden transition ${selected ? "ring-2 ring-purple-500 border-purple-400" : ""}`}>
        <CardContent className="flex h-full flex-col p-0 text-center">
          {previewImageUrl ? (
            <div className="relative aspect-square w-full overflow-hidden bg-violet-50 sm:aspect-[3/4]">
              <Image
                src={previewImageUrl}
                alt={template.sampleImageAlt ?? template.name}
                fill
                sizes="(min-width: 640px) 180px, 45vw"
                className="object-cover transition duration-300 hover:scale-105"
              />
              <div className="absolute left-2 top-2 rounded-full bg-white/85 px-1.5 py-0.5 text-base shadow-sm sm:px-2 sm:py-1 sm:text-lg">{iconSrc || template.icon}</div>
            </div>
          ) : (
            <div className="flex aspect-square w-full items-center justify-center bg-violet-50 text-3xl sm:aspect-[3/4] sm:text-5xl">{iconSrc || template.icon}</div>
          )}
          <div className="flex flex-1 flex-col p-2.5 sm:p-3">
            <h3 className="text-xs font-bold text-purple-900 sm:text-sm sm:font-semibold">{template.name}</h3>
            <p className="mt-1 text-[10px] leading-tight text-violet-500 sm:text-xs sm:leading-relaxed">{template.description}</p>
            <p className="mt-1.5 text-[10px] font-medium text-purple-700 sm:mt-2 sm:text-[11px]">{getModeSummary(template)}</p>
            {getModeSupportText(template) ? (
              <p className="mt-0.5 text-[10px] leading-tight text-violet-400 sm:mt-1 sm:text-[11px] sm:leading-relaxed">{getModeSupportText(template)}</p>
            ) : null}
            {template.parentIntent ? (
              <p className="mt-1 text-[10px] leading-tight text-violet-400 sm:mt-2 sm:text-[11px] sm:leading-relaxed">{template.parentIntent}</p>
            ) : null}
            <div className="mt-2.5 flex flex-wrap gap-1.5 text-[10px] text-violet-500 sm:mt-3 sm:gap-2 sm:text-[11px]">
              {categoryName ? (
                <span className="rounded-full bg-slate-100 px-1.5 py-0.5 font-medium text-slate-700 sm:px-2 sm:py-1">{categoryName}</span>
              ) : null}
              <span className="rounded-full bg-indigo-100 px-1.5 py-0.5 font-medium text-indigo-700 sm:px-2 sm:py-1">{template.fixedStory?.pages?.length ?? 4}ページ</span>
              {ageLabel ? (
                <span className="rounded-full bg-amber-100 px-1.5 py-0.5 font-medium text-amber-700 sm:px-2 sm:py-1">{ageLabel}</span>
              ) : null}
            </div>
            <div className="mt-2 flex flex-wrap gap-1 sm:mt-3 sm:gap-2">
              {template.priceTier ? (
                <span className="rounded-full bg-violet-100 px-1.5 py-0.5 text-[10px] font-medium text-violet-700 sm:px-2 sm:py-1 sm:text-[11px]">
                  {PRICE_TIER_LABELS[template.priceTier]}
                </span>
              ) : null}
              {template.storyCostLevel ? (
                <span className="rounded-full bg-pink-100 px-1.5 py-0.5 text-[10px] font-medium text-pink-700 sm:px-2 sm:py-1 sm:text-[11px]">
                  {STORY_COST_LABELS[template.storyCostLevel]}
                </span>
              ) : null}
              {template.creationMode === "fixed_template" ? (
                <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 sm:px-2 sm:py-1 sm:text-[11px]">安定</span>
              ) : null}
            </div>
            {template.creationMode === "fixed_template" && onPreview && (
              <div className="mt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full text-[10px] sm:text-xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    onPreview();
                  }}
                >
                  ストーリーを見る
                </Button>
              </div>
            )}
            {hasQualitySamples ? (
              <div className="mt-4 rounded-2xl bg-violet-50/80 p-3 text-left">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={(event) => {
                    event.stopPropagation();
                    const next = !showSamples;
                    setShowSamples(next);
                    if (next) {
                      trackAnalyticsEvent("view_quality_sample", {
                        templateId: template.id,
                        creationMode: template.creationMode ?? "guided_ai",
                      });
                    }
                  }}
                >
                  {showSamples ? "サンプルを閉じる" : "仕上がりサンプルを見る"}
                </Button>
                {showSamples ? (
                  <div className="mt-3 space-y-3">
                    <p className="text-[11px] leading-relaxed text-violet-500">
                      高精細生成では、色や質感がよりきれいに仕上がります。
                    </p>
                    <div
                      className={`grid gap-3 ${
                        template.sampleImages?.light && template.sampleImages?.premium
                          ? "grid-cols-2"
                          : "grid-cols-1"
                      }`}
                    >
                      {template.sampleImages?.light ? (
                        <SampleImageCard
                          label="標準生成"
                          imageUrl={template.sampleImages.light}
                          alt={template.sampleImageAlt ?? `${template.name} 標準生成サンプル`}
                        />
                      ) : null}
                      {template.sampleImages?.premium ? (
                        <SampleImageCard
                          label="高精細生成"
                          imageUrl={template.sampleImages.premium}
                          alt={template.sampleImageAlt ?? `${template.name} 高精細生成サンプル`}
                        />
                      ) : null}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </AnimatedCard>
  );
}

function SampleImageCard({
  label,
  imageUrl,
  alt,
}: {
  label: string;
  imageUrl: string;
  alt: string;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-[rgba(240,171,252,0.25)] bg-white">
      <div className="relative aspect-[3/4] w-full">
        <Image src={imageUrl} alt={alt} fill sizes="(min-width: 640px) 180px, 45vw" className="object-cover" />
      </div>
      <p className="px-3 py-2 text-center text-[11px] font-medium text-purple-700">{label}</p>
    </div>
  );
}

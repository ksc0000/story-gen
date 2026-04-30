import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { AnimatedCard } from "@/components/animated-card";
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

interface ThemeCardProps { template: TemplateDoc & { id: string }; selected: boolean; onSelect: () => void; }

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

export function ThemeCard({ template, selected, onSelect }: ThemeCardProps) {
  const iconSrc = ICON_MAP[template.icon];
  return (
    <AnimatedCard onClick={onSelect}>
      <Card className={`h-full cursor-pointer overflow-hidden transition ${selected ? "ring-2 ring-purple-500 border-purple-400" : ""}`}>
        <CardContent className="flex h-full flex-col p-0 text-center">
          {template.sampleImageUrl ? (
            <div className="relative aspect-[3/4] w-full overflow-hidden bg-violet-50">
              <Image
                src={template.sampleImageUrl}
                alt={template.sampleImageAlt ?? template.name}
                fill
                sizes="(min-width: 640px) 180px, 45vw"
                className="object-cover transition duration-300 hover:scale-105"
              />
              <div className="absolute left-2 top-2 rounded-full bg-white/85 px-2 py-1 text-lg shadow-sm">{iconSrc || template.icon}</div>
            </div>
          ) : (
            <div className="flex aspect-[3/4] w-full items-center justify-center bg-violet-50 text-5xl">{iconSrc || template.icon}</div>
          )}
          <div className="flex flex-1 flex-col p-3">
            <h3 className="text-sm font-semibold text-purple-900">{template.name}</h3>
            <p className="mt-1 text-xs leading-relaxed text-violet-500">{template.description}</p>
            <p className="mt-2 text-[11px] font-medium text-purple-700">{getModeSummary(template)}</p>
            {getModeSupportText(template) ? (
              <p className="mt-1 text-[11px] leading-relaxed text-violet-400">{getModeSupportText(template)}</p>
            ) : null}
            {template.parentIntent ? (
              <p className="mt-2 text-[11px] leading-relaxed text-violet-400">{template.parentIntent}</p>
            ) : null}
            <div className="mt-3 flex flex-wrap gap-2">
              {template.priceTier ? (
                <span className="rounded-full bg-violet-100 px-2 py-1 text-[11px] font-medium text-violet-700">
                  {PRICE_TIER_LABELS[template.priceTier]}
                </span>
              ) : null}
              {template.storyCostLevel ? (
                <span className="rounded-full bg-pink-100 px-2 py-1 text-[11px] font-medium text-pink-700">
                  {STORY_COST_LABELS[template.storyCostLevel]}
                </span>
              ) : null}
            </div>
          </div>
        </CardContent>
      </Card>
    </AnimatedCard>
  );
}

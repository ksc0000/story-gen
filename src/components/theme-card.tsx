"use client";

import Image from "next/image";
import { AnimatedCard } from "@/components/animated-card";
import type { TemplateDoc } from "@/lib/types";
import { cn } from "@/lib/utils";

interface ThemeCardProps {
  template: TemplateDoc & { id: string };
  selected: boolean;
  onSelect: () => void;
  /** このストーリーが対応するページ数（例: [4, 8]）。カードに「4P」「8P」タグで表示する。 */
  availablePageCounts?: number[];
  /** @deprecated No longer used — kept for API compatibility */
  onPreview?: () => void;
  /** @deprecated No longer used — kept for API compatibility */
  categoryName?: string;
}

export function ThemeCard({ template, selected, onSelect, availablePageCounts }: ThemeCardProps) {
  const previewImageUrl = template.fixedStory?.previewImageUrl || template.sampleImageUrl;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onSelect();
    }
  };

  return (
    <AnimatedCard onClick={onSelect}>
      <div
        role="radio"
        aria-checked={selected}
        aria-label={`${template.name}${selected ? " (選択中)" : ""}`}
        tabIndex={0}
        onKeyDown={handleKeyDown}
        className={cn(
          "relative aspect-[3/4] w-full overflow-hidden rounded-2xl cursor-pointer transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-600 focus-visible:ring-offset-2",
          selected
            ? "ring-2 ring-purple-600 ring-offset-2 shadow-md"
            : "ring-1 ring-violet-200 hover:ring-purple-400 hover:shadow-sm"
        )}
      >
        {previewImageUrl ? (
          <Image
            src={previewImageUrl}
            alt={template.sampleImageAlt ?? template.name}
            fill
            sizes="(min-width: 640px) 180px, 45vw"
            className="object-cover transition duration-300 hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-violet-50 text-4xl">
            {template.icon}
          </div>
        )}

        {/* Gradient overlay + title */}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent px-2 pb-2.5 pt-10">
          <p className="text-center text-xs font-semibold leading-tight text-white drop-shadow">
            {template.name}
          </p>
        </div>

        {/* 穴埋めテンプレート badge */}
        {template.isBlankTemplate && !selected && (
          <div className="absolute left-1.5 top-1.5 rounded-full bg-amber-500 px-2 py-0.5 text-xs font-bold leading-none text-white shadow-sm">
            ✏️ 穴埋め
          </div>
        )}

        {/* 対応ページ数タグ（4P / 8P / 12P） */}
        {availablePageCounts && availablePageCounts.length > 0 && (
          <div
            className={cn(
              "absolute left-1.5 flex gap-1",
              template.isBlankTemplate && !selected ? "top-7" : "top-1.5"
            )}
          >
            {availablePageCounts.map((n) => (
              <span
                key={n}
                className="rounded-full bg-white/90 px-1.5 py-0.5 text-xs font-bold leading-none text-purple-900 shadow-sm backdrop-blur-sm"
              >
                {n}P
              </span>
            ))}
          </div>
        )}

        {/* Selected check badge + text label for a11y & non-color sensory indicator */}
        {selected && (
          <div className="absolute right-1.5 top-1.5 flex items-center gap-1 rounded-full bg-purple-600 px-2 py-0.5 text-xs font-bold text-white shadow-md">
            <svg className="h-3.5 w-3.5 shrink-0 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            <span className="hidden sm:inline">選択中</span>
          </div>
        )}
      </div>
    </AnimatedCard>
  );
}

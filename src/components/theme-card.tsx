"use client";

import Image from "next/image";
import { AnimatedCard } from "@/components/animated-card";
import type { TemplateDoc } from "@/lib/types";
import { cn } from "@/lib/utils";

interface ThemeCardProps {
  template: TemplateDoc & { id: string };
  selected: boolean;
  onSelect: () => void;
  /** @deprecated No longer used — kept for API compatibility */
  onPreview?: () => void;
  /** @deprecated No longer used — kept for API compatibility */
  categoryName?: string;
}

export function ThemeCard({ template, selected, onSelect }: ThemeCardProps) {
  const previewImageUrl = template.fixedStory?.previewImageUrl || template.sampleImageUrl;

  return (
    <AnimatedCard onClick={onSelect}>
      <div
        className={cn(
          "relative aspect-[3/4] w-full overflow-hidden rounded-2xl cursor-pointer transition-all",
          selected
            ? "ring-2 ring-purple-500 ring-offset-2 shadow-md"
            : "ring-1 ring-violet-100 hover:ring-purple-300 hover:shadow-sm"
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
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent px-2 pb-2.5 pt-10">
          <p className="text-center text-[11px] font-semibold leading-tight text-white drop-shadow sm:text-xs">
            {template.name}
          </p>
        </div>

        {/* Selected check badge */}
        {selected && (
          <div className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-purple-500 shadow-sm sm:h-6 sm:w-6">
            <svg className="h-3 w-3 text-white sm:h-3.5 sm:w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
        )}
      </div>
    </AnimatedCard>
  );
}

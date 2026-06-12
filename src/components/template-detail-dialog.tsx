"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { useEffect, useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import type { TemplateDoc } from "@/lib/types";
import { cn } from "@/lib/utils";

interface TemplateVariant {
  id: string;
  pageCount: number;
}

interface TemplateDetailDialogProps {
  template: (TemplateDoc & { id: string }) | null;
  /** All page-count variants of this template, sorted by page count asc */
  variants?: (TemplateDoc & { id: string })[];
  isOpen: boolean;
  onClose: () => void;
  /** Called with the confirmed template ID (may be a variant) */
  onConfirm: (selectedId: string) => void;
}

function getAgeLabel(template: TemplateDoc): string | null {
  if (template.recommendedAgeMin == null && template.recommendedAgeMax == null) return null;
  if (template.recommendedAgeMin != null && template.recommendedAgeMax != null) {
    return `${template.recommendedAgeMin}〜${template.recommendedAgeMax}歳`;
  }
  if (template.recommendedAgeMin != null) return `${template.recommendedAgeMin}歳以上`;
  return `${template.recommendedAgeMax}歳まで`;
}

export function TemplateDetailDialog({
  template,
  variants = [],
  isOpen,
  onClose,
  onConfirm,
}: TemplateDetailDialogProps) {
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);

  // Reset variant selection when dialog opens
  useEffect(() => {
    if (isOpen && template) {
      // Default to the template itself (4p primary)
      setSelectedVariantId(template.id);
    }
  }, [isOpen, template]);

  // Prevent body scroll when dialog is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!template) return null;

  const previewImageUrl = template.fixedStory?.previewImageUrl || template.sampleImageUrl;
  const ageLabel = getAgeLabel(template);

  // Build variant list (deduplicated, sorted by page count)
  const variantOptions: TemplateVariant[] = variants.length > 0
    ? variants.map((v) => ({
        id: v.id,
        pageCount: v.fixedStory?.pages?.length ?? 4,
      }))
    : [{ id: template.id, pageCount: template.fixedStory?.pages?.length ?? 4 }];

  const hasMultipleVariants = variantOptions.length > 1;
  const effectiveVariantId = selectedVariantId ?? template.id;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          />

          {/* Dialog panel — sheet on mobile, centered on desktop */}
          <motion.div
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 60 }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            className="relative z-10 flex w-full max-w-sm flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl"
            style={{ maxHeight: "90dvh" }}
          >
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/80 text-violet-500 shadow-sm transition hover:bg-white hover:text-purple-700"
            >
              <X className="size-4" />
            </button>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto">
              {/* Cover image */}
              <div className="relative aspect-[3/4] w-full bg-violet-50">
                {previewImageUrl ? (
                  <Image
                    src={previewImageUrl}
                    alt={template.sampleImageAlt ?? template.name}
                    fill
                    sizes="(min-width: 640px) 384px, 100vw"
                    className="object-cover"
                    priority
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-6xl">
                    {template.icon}
                  </div>
                )}
              </div>

              {/* Info area */}
              <div className="px-5 pb-4 pt-4">
                {/* Title row */}
                <div className="flex items-start gap-2">
                  <span className="mt-0.5 text-2xl">{template.icon}</span>
                  <h2 className="text-lg font-bold leading-tight text-purple-900">{template.name}</h2>
                </div>

                {/* Description */}
                {template.description && (
                  <p className="mt-2 text-sm leading-relaxed text-violet-600">{template.description}</p>
                )}

                {/* Parent intent */}
                {template.parentIntent && (
                  <p className="mt-2 text-xs leading-relaxed text-violet-400">{template.parentIntent}</p>
                )}

                {/* Page count selector */}
                {hasMultipleVariants && (
                  <div className="mt-4">
                    <p className="mb-2 text-xs font-medium text-violet-500">ページ数を選ぶ</p>
                    <div className="flex gap-2">
                      {variantOptions.map((v) => (
                        <button
                          key={v.id}
                          type="button"
                          onClick={() => setSelectedVariantId(v.id)}
                          className={cn(
                            "flex-1 rounded-xl border py-2.5 text-sm font-semibold transition-all",
                            effectiveVariantId === v.id
                              ? "border-purple-400 bg-purple-50 text-purple-700 ring-2 ring-purple-200"
                              : "border-violet-100 bg-white text-violet-500 hover:border-purple-300"
                          )}
                        >
                          {v.pageCount}ページ
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tags (show only if single variant) */}
                {!hasMultipleVariants && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-medium text-indigo-700">
                      {variantOptions[0]?.pageCount ?? 4}ページ
                    </span>
                    {ageLabel && (
                      <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                        {ageLabel}
                      </span>
                    )}
                    {template.creationMode === "fixed_template" && (
                      <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                        早い・安定
                      </span>
                    )}
                  </div>
                )}

                {/* Tags row (when multiple variants — show age only) */}
                {hasMultipleVariants && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {ageLabel && (
                      <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                        {ageLabel}
                      </span>
                    )}
                    {template.creationMode === "fixed_template" && (
                      <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                        早い・安定
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Action buttons */}
            <div className="border-t border-violet-100 px-5 pb-[max(16px,env(safe-area-inset-bottom))] pt-3">
              <Button
                size="lg"
                className="w-full"
                onClick={() => {
                  onConfirm(effectiveVariantId);
                }}
              >
                このテンプレートで作る
              </Button>
              <button
                type="button"
                onClick={onClose}
                className="mt-2 w-full rounded-xl py-2 text-sm font-medium text-violet-400 transition hover:text-violet-600"
              >
                やめる
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

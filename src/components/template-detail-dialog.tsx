"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Lock } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
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
  /** Page counts the current plan can generate. Variants outside this are locked. */
  allowedPageCounts?: number[];
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
  allowedPageCounts,
  isOpen,
  onClose,
  onConfirm,
}: TemplateDetailDialogProps) {
  const router = useRouter();
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  // Portal to document.body so the fixed overlay escapes any transform ancestor
  // (e.g. PageTransition), which would otherwise mis-position the centered
  // desktop dialog. See confirmation-dialog.tsx for the full explanation.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  // A page-count variant is locked when the current plan can't generate it.
  const isPageCountLocked = (pageCount: number) =>
    Array.isArray(allowedPageCounts) && !allowedPageCounts.includes(pageCount);

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

  if (!template || !mounted) return null;

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
  const effectiveVariantPageCount =
    variantOptions.find((v) => v.id === effectiveVariantId)?.pageCount ??
    template.fixedStory?.pages?.length ??
    4;

  return createPortal(
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

                {/* Blank template hint */}
                {template.isBlankTemplate && template.blankLabel && (
                  <div className="mt-3 rounded-xl bg-amber-50 px-3 py-2.5 text-sm text-amber-800">
                    <span className="font-medium">入力するのは「{template.blankLabel}」のみ。</span>
                    <span className="text-amber-600"> {template.blankExample}</span>
                  </div>
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
                      {variantOptions.map((v) => {
                        const locked = isPageCountLocked(v.pageCount);
                        return (
                          <button
                            key={v.id}
                            type="button"
                            onClick={() => {
                              if (locked) {
                                router.push("/pricing");
                              } else {
                                setSelectedVariantId(v.id);
                              }
                            }}
                            aria-disabled={locked}
                            className={cn(
                              "relative flex-1 rounded-xl border py-2.5 text-sm font-semibold transition-all",
                              locked
                                ? "border-violet-100 bg-violet-50/40 text-violet-300"
                                : effectiveVariantId === v.id
                                  ? "border-purple-400 bg-purple-50 text-purple-700 ring-2 ring-purple-200"
                                  : "border-violet-100 bg-white text-violet-500 hover:border-purple-300"
                            )}
                          >
                            <span className="inline-flex items-center justify-center gap-1">
                              {locked && <Lock className="h-3 w-3" />}
                              {v.pageCount}ページ
                            </span>
                          </button>
                        );
                      })}
                    </div>
                    {variantOptions.some((v) => isPageCountLocked(v.pageCount)) && (
                      <p className="mt-2 text-xs text-amber-600">
                        🔒 ページ数の多い絵本は上位プランで作成できます。
                      </p>
                    )}
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
                    {template.isBlankTemplate && (
                      <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                        ✏️ 穴埋めテンプレート
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
                    {template.isBlankTemplate && (
                      <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                        ✏️ 穴埋めテンプレート
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
              {isPageCountLocked(effectiveVariantPageCount) ? (
                <Button size="lg" className="w-full" onClick={() => router.push("/pricing")}>
                  アップグレードして作る
                </Button>
              ) : (
                <Button
                  size="lg"
                  className="w-full"
                  onClick={() => {
                    onConfirm(effectiveVariantId);
                  }}
                >
                  このテンプレートで作る
                </Button>
              )}
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
    </AnimatePresence>,
    document.body
  );
}

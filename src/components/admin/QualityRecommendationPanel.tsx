"use client";

import type { BookDoc } from "@/lib/types";
import type { QualityRecommendation } from "@/lib/quality-review";
import { buildQualityRecommendations } from "@/lib/quality-review";
import { useMemo } from "react";

const ACTION_LABELS: Record<QualityRecommendation["action"], string> = {
  rewrite_story: "Rewrite Story",
  regenerate_images: "Regenerate Images",
  fix_character_consistency: "Fix Character Consistency",
  improve_personalization: "Improve Personalization",
  human_review_required: "Human Review Required",
  approve: "Approved ✓",
};

const SEVERITY_CLASSES: Record<QualityRecommendation["severity"], string> = {
  high: "border-rose-300 bg-rose-50 text-rose-800",
  medium: "border-amber-300 bg-amber-50 text-amber-800",
  low: "border-emerald-300 bg-emerald-50 text-emerald-800",
};

const SEVERITY_BADGE_CLASSES: Record<QualityRecommendation["severity"], string> = {
  high: "bg-rose-200 text-rose-900",
  medium: "bg-amber-200 text-amber-900",
  low: "bg-emerald-200 text-emerald-900",
};

interface QualityRecommendationPanelProps {
  book: BookDoc & { id: string };
}

export function QualityRecommendationPanel({ book }: QualityRecommendationPanelProps) {
  const recommendations = useMemo(() => buildQualityRecommendations(book), [book]);
  const isNeedsFix = book.qualityReviewStatus === "needs_fix";
  const hasHigh = recommendations.some((r) => r.severity === "high");

  if (recommendations.length === 0) {
    return (
      <div className="rounded-xl border border-violet-100 bg-violet-50/30 p-4">
        <p className="text-xs font-semibold text-violet-700">Recommended Actions</p>
        <p className="mt-1 text-xs text-violet-500">No recommendations yet</p>
      </div>
    );
  }

  const borderClass = isNeedsFix || hasHigh
    ? "border-rose-300 bg-rose-50/30"
    : "border-violet-200 bg-violet-50/30";

  return (
    <div className={`rounded-xl border p-4 ${borderClass}`}>
      <p className={`text-xs font-semibold ${isNeedsFix || hasHigh ? "text-rose-800" : "text-violet-700"}`}>
        {isNeedsFix ? "⚠️ Recommended Actions (needs_fix)" : "Recommended Actions"}
        <span className="ml-2 font-normal text-violet-500">{recommendations.length}件</span>
      </p>
      <div className="mt-2 space-y-2">
        {recommendations.map((rec) => (
          <div
            key={rec.action}
            className={`flex items-start gap-2 rounded-lg border px-3 py-2 ${SEVERITY_CLASSES[rec.severity]}`}
          >
            <span className={`mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${SEVERITY_BADGE_CLASSES[rec.severity]}`}>
              {rec.severity}
            </span>
            <div className="min-w-0">
              <p className="text-xs font-semibold">{ACTION_LABELS[rec.action]}</p>
              <p className="text-xs opacity-80">{rec.reason}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Compact inline badge for book list items.
 * Shows recommendation count + high severity indicator.
 */
export function QualityRecommendationBadge({ book }: { book: BookDoc }) {
  const recommendations = useMemo(() => buildQualityRecommendations(book), [book]);
  if (recommendations.length === 0) return null;

  const hasHigh = recommendations.some((r) => r.severity === "high");

  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
        hasHigh
          ? "bg-rose-200 text-rose-900"
          : "bg-amber-100 text-amber-800"
      }`}
    >
      {hasHigh ? "⚠" : "💡"} {recommendations.length}
    </span>
  );
}

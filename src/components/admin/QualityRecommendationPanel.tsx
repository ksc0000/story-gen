"use client";

import type { BookDoc } from "@/lib/types";
import type { QualityRecommendation, QualityRecommendationIntent } from "@/lib/quality-review";
import {
  buildQualityRecommendations,
  RECOMMENDATION_INTENT_MAP,
  RECOMMENDATION_INTENT_LABELS,
  RECOMMENDATION_INTENT_DESCRIPTIONS,
} from "@/lib/quality-review";
import { useMemo, useState } from "react";

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

const INTENT_BUTTON_CLASSES: Record<QualityRecommendation["severity"], string> = {
  high: "border-rose-400 bg-rose-100 text-rose-800 hover:bg-rose-200",
  medium: "border-amber-400 bg-amber-100 text-amber-800 hover:bg-amber-200",
  low: "border-emerald-400 bg-emerald-100 text-emerald-800 hover:bg-emerald-200",
};

interface QualityRecommendationPanelProps {
  book: BookDoc & { id: string };
  onIntentAction?: (intent: QualityRecommendationIntent, book: BookDoc & { id: string }) => void;
}

export function QualityRecommendationPanel({ book, onIntentAction }: QualityRecommendationPanelProps) {
  const recommendations = useMemo(() => buildQualityRecommendations(book), [book]);
  const isNeedsFix = book.qualityReviewStatus === "needs_fix";
  const hasHigh = recommendations.some((r) => r.severity === "high");
  const [expandedIntent, setExpandedIntent] = useState<QualityRecommendationIntent | null>(null);

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
        {recommendations.map((rec) => {
          const intent = RECOMMENDATION_INTENT_MAP[rec.action];
          const isExpanded = expandedIntent === intent;
          return (
            <div
              key={rec.action}
              className={`rounded-lg border ${SEVERITY_CLASSES[rec.severity]}`}
            >
              <div className="flex items-start gap-2 px-3 py-2">
                <span className={`mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${SEVERITY_BADGE_CLASSES[rec.severity]}`}>
                  {rec.severity}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold">{ACTION_LABELS[rec.action]}</p>
                  <p className="text-xs opacity-80">{rec.reason}</p>
                  {rec.details && rec.details.length > 0 && (
                    <ul className="mt-1 space-y-0.5">
                      {rec.details.map((detail, i) => (
                        <li key={i} className="text-[10px] opacity-70 list-disc ml-3">
                          {detail}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                {rec.action !== "approve" && (
                  <button
                    type="button"
                    onClick={() => setExpandedIntent(isExpanded ? null : intent)}
                    className={`shrink-0 rounded border px-2 py-1 text-[10px] font-bold ${INTENT_BUTTON_CLASSES[rec.severity]}`}
                  >
                    {RECOMMENDATION_INTENT_LABELS[intent]}
                  </button>
                )}
              </div>
              {isExpanded && (
                <div className="border-t border-current/10 px-3 py-2">
                  <p className="text-xs opacity-70">{RECOMMENDATION_INTENT_DESCRIPTIONS[intent]}</p>
                  <div className="flex gap-2">
                    {onIntentAction && (
                      <button
                        type="button"
                        onClick={() => onIntentAction(intent, book)}
                        className={`mt-2 rounded border px-3 py-1 text-xs font-semibold ${INTENT_BUTTON_CLASSES[rec.severity]}`}
                      >
                        確認を開始 →
                      </button>
                    )}
                    {intent === "review_character_consistency" && (
                      <button
                        type="button"
                        onClick={() => {
                          const el = document.getElementById("character-diagnostics");
                          if (el) el.scrollIntoView({ behavior: "smooth" });
                        }}
                        className="mt-2 rounded border border-indigo-300 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-100"
                      >
                        診断パネルへ ↓
                      </button>
                    )}
                  </div>
                  {!onIntentAction && (
                    <p className="mt-1 text-[10px] italic opacity-50">（アクション実行は今後実装予定）</p>
                  )}
                </div>
              )}
            </div>
          );
        })}
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

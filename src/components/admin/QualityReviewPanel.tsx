"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { QualityReviewScore, QualityReviewStatus } from "@/lib/types";
import type { QualityReviewForm, QualityReviewWithId } from "@/lib/quality-review";
import {
  formatQualityScore,
  getQualityReviewStatusLabel,
  getQualityReviewStatusBadgeClass,
  calculateOverallQualityScore,
  parseQualityScore,
  calculateCategoryScoreFromAxes,
  STORY_AXIS_WEIGHTS,
  ILLUSTRATION_AXIS_WEIGHTS,
  CHARACTER_AXIS_WEIGHTS,
  PERSONALIZATION_AXIS_WEIGHTS,
  SAFETY_AXIS_WEIGHTS,
} from "@/lib/quality-review";

type QualityReviewPanelProps = {
  qualityReviews: QualityReviewWithId[];
  loading: boolean;
  error: string | null;
  saving: boolean;
  message: string | null;
  form: QualityReviewForm;
  onFormChange: (form: QualityReviewForm) => void;
  onSave: () => void;
};

const LLM_CATEGORY_FIELDS = [
  { key: "storyScore" as const, label: "Story" },
  { key: "illustrationScore" as const, label: "Illustration" },
  { key: "characterConsistencyScore" as const, label: "Character" },
  { key: "personalizationScore" as const, label: "Personalization" },
  { key: "safetyScore" as const, label: "Safety" },
];

const CATEGORY_FIELDS = [
  {
    key: "storyScore" as const,
    label: "Story Score",
    axes: [
      { key: "story_childPersonalization" as const, label: "child personalization", weight: STORY_AXIS_WEIGHTS.childPersonalization },
      { key: "story_storyCoherence" as const, label: "story coherence", weight: STORY_AXIS_WEIGHTS.storyCoherence },
      { key: "story_ageAppropriateness" as const, label: "age appropriateness", weight: STORY_AXIS_WEIGHTS.ageAppropriateness },
      { key: "story_emotionalSatisfaction" as const, label: "emotional satisfaction", weight: STORY_AXIS_WEIGHTS.emotionalSatisfaction },
      { key: "story_pageLengthBalance" as const, label: "page length balance", weight: STORY_AXIS_WEIGHTS.pageLengthBalance },
      { key: "story_characterConsistency" as const, label: "character consistency", weight: STORY_AXIS_WEIGHTS.characterConsistency },
      { key: "story_endingSatisfaction" as const, label: "ending satisfaction", weight: STORY_AXIS_WEIGHTS.endingSatisfaction },
    ],
    weights: STORY_AXIS_WEIGHTS,
  },
  {
    key: "illustrationScore" as const,
    label: "Illustration Score",
    axes: [
      { key: "illust_promptCompleteness" as const, label: "prompt completeness", weight: ILLUSTRATION_AXIS_WEIGHTS.promptCompleteness },
      { key: "illust_visualConsistency" as const, label: "visual consistency", weight: ILLUSTRATION_AXIS_WEIGHTS.visualConsistency },
      { key: "illust_characterConsistency" as const, label: "character consistency", weight: ILLUSTRATION_AXIS_WEIGHTS.characterConsistency },
      { key: "illust_sceneRelevance" as const, label: "scene relevance", weight: ILLUSTRATION_AXIS_WEIGHTS.sceneRelevance },
      { key: "illust_styleConsistency" as const, label: "style consistency", weight: ILLUSTRATION_AXIS_WEIGHTS.styleConsistency },
      { key: "illust_artifactAvoidance" as const, label: "artifact avoidance", weight: ILLUSTRATION_AXIS_WEIGHTS.artifactAvoidance },
    ],
    weights: ILLUSTRATION_AXIS_WEIGHTS,
  },
  {
    key: "characterConsistencyScore" as const,
    label: "Character Consistency Score",
    axes: [
      { key: "char_visualBibleReflected" as const, label: "visual bible reflected", weight: CHARACTER_AXIS_WEIGHTS.visualBibleReflected },
      { key: "char_characterIdConsistency" as const, label: "characterId consistency", weight: CHARACTER_AXIS_WEIGHTS.characterIdConsistency },
      { key: "char_appearingCharacterConsistency" as const, label: "appearingCharacterIds consistency", weight: CHARACTER_AXIS_WEIGHTS.appearingCharacterConsistency },
      { key: "char_focusCharacterConsistency" as const, label: "focusCharacterId consistency", weight: CHARACTER_AXIS_WEIGHTS.focusCharacterConsistency },
      { key: "char_pageLevelCharacterLinkage" as const, label: "page-level linkage", weight: CHARACTER_AXIS_WEIGHTS.pageLevelCharacterLinkage },
      { key: "char_outfitHairstyleConsistency" as const, label: "outfit / hairstyle consistency", weight: CHARACTER_AXIS_WEIGHTS.outfitHairstyleConsistency },
      { key: "char_colorPaletteConsistency" as const, label: "color palette consistency", weight: CHARACTER_AXIS_WEIGHTS.colorPaletteConsistency },
    ],
    weights: CHARACTER_AXIS_WEIGHTS,
  },
  {
    key: "personalizationScore" as const,
    label: "Personalization Score",
    axes: [
      { key: "pers_childProfileUsage" as const, label: "child profile usage", weight: PERSONALIZATION_AXIS_WEIGHTS.childProfileUsage },
      { key: "pers_nameNicknameUsage" as const, label: "name / nickname usage", weight: PERSONALIZATION_AXIS_WEIGHTS.nameNicknameUsage },
      { key: "pers_favoriteThings" as const, label: "favorite things", weight: PERSONALIZATION_AXIS_WEIGHTS.favoriteThings },
      { key: "pers_familyContext" as const, label: "family context", weight: PERSONALIZATION_AXIS_WEIGHTS.familyContext },
      { key: "pers_memoryEventContext" as const, label: "memory / event context", weight: PERSONALIZATION_AXIS_WEIGHTS.memoryEventContext },
      { key: "pers_overPersonalizationRisk" as const, label: "over-personalization risk", weight: PERSONALIZATION_AXIS_WEIGHTS.overPersonalizationRisk },
    ],
    weights: PERSONALIZATION_AXIS_WEIGHTS,
  },
  {
    key: "safetyScore" as const,
    label: "Safety Score",
    axes: [
      { key: "safe_ageAppropriateVocabulary" as const, label: "age appropriate vocabulary", weight: SAFETY_AXIS_WEIGHTS.ageAppropriateVocabulary },
      { key: "safe_notTooScary" as const, label: "not too scary", weight: SAFETY_AXIS_WEIGHTS.notTooScary },
      { key: "safe_dangerAvoidance" as const, label: "danger avoidance", weight: SAFETY_AXIS_WEIGHTS.dangerAvoidance },
      { key: "safe_familyFriendlyPeace" as const, label: "family-friendly / peace", weight: SAFETY_AXIS_WEIGHTS.familyFriendlyPeace },
      { key: "safe_privacyConsideration" as const, label: "privacy consideration", weight: SAFETY_AXIS_WEIGHTS.privacyConsideration },
    ],
    weights: SAFETY_AXIS_WEIGHTS,
  },
];

const STATUS_OPTIONS: { value: QualityReviewStatus; label: string }[] = [
  { value: "human_reviewed", label: "Reviewed" },
  { value: "needs_fix", label: "Needs fix" },
  { value: "approved", label: "Approved" },
];

function computeCategoryAxesScore(form: QualityReviewForm, axes: { key: keyof QualityReviewForm; weight: number }[], weights: Record<string, number>): number | null {
  const axisScores: Record<string, QualityReviewScore | null> = {};
  let anyScored = false;
  for (const axis of axes) {
    const score = parseQualityScore(form[axis.key] as string);
    // Key in weights doesn't have the prefix
    const weightKey = (axis.key as string).split("_")[1];
    axisScores[weightKey] = score;
    if (score !== null) anyScored = true;
  }
  if (!anyScored) return null;
  return calculateCategoryScoreFromAxes(axisScores, weights);
}

function computePreviewScore(form: QualityReviewForm): string {
  const storyScore = parseQualityScore(form.storyScore);
  const illustrationScore = parseQualityScore(form.illustrationScore);
  const characterConsistencyScore = parseQualityScore(form.characterConsistencyScore);
  const personalizationScore = parseQualityScore(form.personalizationScore);
  const safetyScore = parseQualityScore(form.safetyScore);

  if (
    storyScore === null ||
    illustrationScore === null ||
    characterConsistencyScore === null ||
    personalizationScore === null ||
    safetyScore === null
  ) {
    return "—";
  }

  const overall = calculateOverallQualityScore({
    storyScore,
    illustrationScore,
    characterConsistencyScore,
    personalizationScore,
    safetyScore,
  });
  return String(overall);
}

export function QualityReviewPanel({
  qualityReviews,
  loading,
  error,
  saving,
  message,
  form,
  onFormChange,
  onSave,
}: QualityReviewPanelProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [expandedHistory, setExpandedHistory] = useState<Set<string>>(new Set());

  const latestLLMReview = qualityReviews.find((r) => r.reviewerType === "llm");

  const handleFieldChange = (key: keyof QualityReviewForm, value: string) => {
    onFormChange({ ...form, [key]: value });
  };

  const toggleCategory = (key: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleHistoryExpansion = (id: string) => {
    setExpandedHistory((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleApplyCalculated = (categoryKey: keyof QualityReviewForm, score100: number) => {
    // 0-100 to 1-5
    const score5 = Math.max(1, Math.min(5, Math.round(score100 / 20)));
    handleFieldChange(categoryKey, String(score5));
  };

  return (
    <Card>
      <CardContent className="space-y-6 p-6">
        <h3 className="text-lg font-semibold text-purple-900">Quality Review (Phase 2)</h3>

        {/* LLM Auto Review Result (Read-only) */}
        {latestLLMReview && (
          <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                🤖 LLM Auto Review Result
                <Badge variant="outline" className="bg-white text-slate-600 border-slate-200 text-[10px]">
                  Latest
                </Badge>
              </h4>
              <span className="text-xs text-slate-500">
                {latestLLMReview.createdAtMs
                  ? new Date(latestLLMReview.createdAtMs).toLocaleString("ja-JP")
                  : "—"}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
              <div className="rounded-lg border border-slate-200 bg-white p-2 text-center">
                <p className="text-[10px] text-slate-500">Overall</p>
                <p className="text-lg font-bold text-slate-800">{formatQualityScore(latestLLMReview.overallScore)}</p>
              </div>
              {LLM_CATEGORY_FIELDS.map((cat) => (
                <div key={cat.key} className="rounded-lg border border-slate-200 bg-white p-2 text-center">
                  <p className="text-[10px] text-slate-500">{cat.label}</p>
                  <p className="text-sm font-semibold text-slate-700">{latestLLMReview[cat.key as keyof QualityReviewWithId] as number}</p>
                </div>
              ))}
            </div>

            {latestLLMReview.reviewReason && (
              <div className="space-y-1">
                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Review Reason</p>
                <p className="text-xs text-slate-700 leading-relaxed">{latestLLMReview.reviewReason}</p>
              </div>
            )}

            {latestLLMReview.flaggedIssues.length > 0 && (
              <div className="space-y-1">
                <p className="text-[10px] font-semibold text-rose-600 uppercase tracking-wider">Flagged Issues</p>
                <ul className="space-y-1">
                  {latestLLMReview.flaggedIssues.map((issue, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-rose-700">
                      <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-rose-400" />
                      <span>
                        <span className="font-semibold">[{issue.severity}]</span> {issue.message}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Score inputs */}
        <div className="space-y-4">
          {CATEGORY_FIELDS.map((cat) => {
            const isExpanded = expandedCategories.has(cat.key);
            const score100 = computeCategoryAxesScore(form, cat.axes, cat.weights);

            return (
              <div key={cat.key} className="rounded-xl border border-violet-100 bg-white overflow-hidden">
                <div className="flex items-center justify-between bg-violet-50/50 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => toggleCategory(cat.key)}
                      className="flex items-center gap-1 text-sm font-medium text-purple-900 hover:text-purple-700"
                    >
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      {cat.label}
                    </button>
                    <select
                      id={`qr-${cat.key}`}
                      value={form[cat.key]}
                      onChange={(e) => handleFieldChange(cat.key, e.target.value)}
                      className="rounded-lg border border-input bg-background px-2 py-1 text-xs font-semibold"
                    >
                      <option value="">未設定</option>
                      {[1, 2, 3, 4, 5].map((score) => (
                        <option key={score} value={score}>
                          {score}
                        </option>
                      ))}
                    </select>
                  </div>
                  {score100 !== null && (
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold text-violet-600">Calculated: {score100}/100</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-[10px] text-violet-500 hover:bg-violet-100"
                        onClick={() => handleApplyCalculated(cat.key, score100)}
                      >
                        Apply to Summary
                      </Button>
                    </div>
                  )}
                </div>

                {isExpanded && (
                  <div className="grid gap-x-6 gap-y-4 p-4 sm:grid-cols-2 lg:grid-cols-3">
                    {cat.axes.map((axis) => (
                      <div key={axis.key} className="space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <Label htmlFor={`qr-${axis.key}`} className="text-[11px] text-violet-700 leading-tight">
                            {axis.label}
                          </Label>
                          <span className="text-[10px] font-medium text-violet-400">w:{axis.weight}</span>
                        </div>
                        <select
                          id={`qr-${axis.key}`}
                          value={form[axis.key] as string}
                          onChange={(e) => handleFieldChange(axis.key, e.target.value)}
                          className="w-full rounded-lg border border-input bg-background px-2 py-1 text-xs"
                        >
                          <option value="">—</option>
                          {[1, 2, 3, 4, 5].map((score) => (
                            <option key={score} value={score}>
                              {score}
                            </option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Overall score preview */}
        <div className="rounded-lg bg-violet-50 px-4 py-3">
          <p className="text-sm text-violet-700">
            <span className="font-medium">Overall Score (preview):</span>{" "}
            {computePreviewScore(form)}
          </p>
        </div>

        {/* Status */}
        <div className="space-y-2">
          <Label htmlFor="qr-status">Status</Label>
          <select
            id="qr-status"
            value={form.status}
            onChange={(e) => handleFieldChange("status", e.target.value)}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Review Reason */}
        <div className="space-y-2">
          <Label htmlFor="qr-reviewReason">Review Reason</Label>
          <textarea
            id="qr-reviewReason"
            value={form.reviewReason}
            onChange={(e) => handleFieldChange("reviewReason", e.target.value)}
            rows={3}
            maxLength={1000}
            className="w-full rounded-2xl border border-input bg-background px-4 py-3 text-sm"
            placeholder="レビューの理由やコメントを記入"
          />
          <p className="text-xs text-violet-400">{form.reviewReason.length}/1000</p>
        </div>

        {/* Flagged Issues */}
        <div className="space-y-2">
          <Label htmlFor="qr-flaggedIssues">Flagged Issues (1行に1件)</Label>
          <textarea
            id="qr-flaggedIssues"
            value={form.flaggedIssues}
            onChange={(e) => handleFieldChange("flaggedIssues", e.target.value)}
            rows={3}
            className="w-full rounded-2xl border border-input bg-background px-4 py-3 text-sm"
            placeholder="問題点を1行に1つずつ記入"
          />
        </div>

        {/* Recommended Fixes */}
        <div className="space-y-2">
          <Label htmlFor="qr-recommendedFixes">Recommended Fixes (1行に1件)</Label>
          <textarea
            id="qr-recommendedFixes"
            value={form.recommendedFixes}
            onChange={(e) => handleFieldChange("recommendedFixes", e.target.value)}
            rows={3}
            className="w-full rounded-2xl border border-input bg-background px-4 py-3 text-sm"
            placeholder="推奨修正を1行に1つずつ記入"
          />
        </div>

        {/* Save button */}
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={onSave} disabled={saving}>
            {saving ? "保存中..." : "Save quality review"}
          </Button>
          {message ? <p className="text-sm text-violet-600">{message}</p> : null}
        </div>

        {/* Quality Review History */}
        <div className="space-y-3 border-t border-violet-100 pt-4">
          <h4 className="text-sm font-semibold text-purple-900">Quality Review History</h4>
          {loading ? (
            <p className="text-sm text-violet-500">読み込み中...</p>
          ) : error ? (
            <p className="text-sm text-rose-600">{error}</p>
          ) : qualityReviews.length === 0 ? (
            <p className="text-sm text-violet-500">No quality reviews yet</p>
          ) : (
            <div className="space-y-3">
              {qualityReviews.map((review) => {
                const isExpanded = expandedHistory.has(review.id);
                const hasAnyGranular = !!(
                  review.storyAxes ||
                  review.illustrationAxes ||
                  review.characterAxes ||
                  review.personalizationAxes ||
                  review.safetyAxes
                );

                return (
                  <div
                    key={review.id}
                    className="rounded-xl border border-violet-100 bg-white p-4 text-sm"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge
                          className={getQualityReviewStatusBadgeClass(review.status)}
                          variant="secondary"
                        >
                          {getQualityReviewStatusLabel(review.status)}
                        </Badge>
                        <span className="text-xs font-medium text-violet-600">
                          {review.reviewerType === "llm" ? "🤖 AI" : `👤 ${review.reviewerId.slice(0, 8)}`}
                        </span>
                        <span className="text-xs text-violet-500">
                          overall: {formatQualityScore(review.overallScore)}
                        </span>
                        <span className="text-xs text-violet-400">
                          {review.createdAtMs
                            ? new Date(review.createdAtMs).toLocaleString("ja-JP")
                            : "—"}
                        </span>
                      </div>
                      {hasAnyGranular && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs text-violet-500 hover:bg-violet-50"
                          onClick={() => toggleHistoryExpansion(review.id)}
                        >
                          {isExpanded ? (
                            <span className="flex items-center gap-1">
                              <ChevronUp size={14} /> Hide Granular
                            </span>
                          ) : (
                            <span className="flex items-center gap-1">
                              <ChevronDown size={14} /> View Granular
                            </span>
                          )}
                        </Button>
                      )}
                    </div>
                    <div className="mt-2 grid gap-1 text-xs text-violet-700 sm:grid-cols-3">
                      <p>Story: {review.storyScore} {review.storyAxes && <span className="text-[10px] opacity-60">(granular ✓)</span>}</p>
                      <p>Illustration: {review.illustrationScore} {review.illustrationAxes && <span className="text-[10px] opacity-60">(granular ✓)</span>}</p>
                      <p>Character: {review.characterConsistencyScore} {review.characterAxes && <span className="text-[10px] opacity-60">(granular ✓)</span>}</p>
                      <p>Personalization: {review.personalizationScore} {review.personalizationAxes && <span className="text-[10px] opacity-60">(granular ✓)</span>}</p>
                      <p>Safety: {review.safetyScore} {review.safetyAxes && <span className="text-[10px] opacity-60">(granular ✓)</span>}</p>
                    </div>

                    {isExpanded && (
                      <div className="mt-4 space-y-4 rounded-lg bg-violet-50/50 p-3">
                        {CATEGORY_FIELDS.map((cat) => {
                          // Get the axes object from the review
                          // storyScore -> storyAxes, illustrationScore -> illustrationAxes, etc.
                          // special case: characterConsistencyScore -> characterAxes
                          const axesObjKey =
                            cat.key === "characterConsistencyScore"
                              ? "characterAxes"
                              : (cat.key.replace("Score", "Axes") as keyof typeof review);
                          const axesData = review[axesObjKey] as Record<string, number> | undefined;

                          if (!axesData) return null;

                          return (
                            <div key={cat.key} className="space-y-1.5">
                              <p className="text-[10px] font-bold uppercase tracking-wider text-violet-500">
                                {cat.label} breakdown
                              </p>
                              <div className="grid gap-x-4 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
                                {cat.axes.map((axis) => {
                                  const propName = axis.key.split("_")[1];
                                  const axisScore = axesData[propName];
                                  if (axisScore === undefined) return null;

                                  return (
                                    <div
                                      key={axis.key}
                                      className="flex items-center justify-between gap-2 border-b border-violet-100/50 pb-1"
                                    >
                                      <span className="text-[11px] text-violet-600">{axis.label}</span>
                                      <span className="font-semibold text-violet-800">{axisScore}</span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {review.reviewReason && (
                    <p className="mt-2 text-xs text-violet-600">{review.reviewReason}</p>
                  )}
                  {review.flaggedIssues.length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs font-medium text-rose-700">Flagged:</p>
                      <ul className="list-inside list-disc text-xs text-rose-600">
                        {review.flaggedIssues.map((issue, i) => (
                          <li key={i}>[{issue.severity}] {issue.message}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              );
            })}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

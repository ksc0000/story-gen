"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import type { QualityReviewStatus } from "@/lib/types";
import type { QualityReviewForm, QualityReviewWithId } from "@/lib/quality-review";
import {
  formatQualityScore,
  getQualityReviewStatusLabel,
  getQualityReviewStatusBadgeClass,
  calculateOverallQualityScore,
  parseQualityScore,
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

const SCORE_FIELDS = [
  { key: "storyScore" as const, label: "Story Score" },
  { key: "illustrationScore" as const, label: "Illustration Score" },
  { key: "characterConsistencyScore" as const, label: "Character Consistency Score" },
  { key: "personalizationScore" as const, label: "Personalization Score" },
  { key: "safetyScore" as const, label: "Safety Score" },
];

const STATUS_OPTIONS: { value: QualityReviewStatus; label: string }[] = [
  { value: "human_reviewed", label: "Reviewed" },
  { value: "needs_fix", label: "Needs fix" },
  { value: "approved", label: "Approved" },
];

function computePreviewScore(form: QualityReviewForm): string {
  const scores = SCORE_FIELDS.map((f) => parseQualityScore(form[f.key]));
  if (scores.some((s) => s === null)) return "—";
  const overall = calculateOverallQualityScore({
    storyScore: scores[0]!,
    illustrationScore: scores[1]!,
    characterConsistencyScore: scores[2]!,
    personalizationScore: scores[3]!,
    safetyScore: scores[4]!,
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
  const handleFieldChange = (key: keyof QualityReviewForm, value: string) => {
    onFormChange({ ...form, [key]: value });
  };

  return (
    <Card>
      <CardContent className="space-y-6 p-6">
        <h3 className="text-lg font-semibold text-purple-900">Quality Review (Phase 2)</h3>

        {/* Score inputs */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SCORE_FIELDS.map((field) => (
            <div key={field.key} className="space-y-2">
              <Label htmlFor={`qr-${field.key}`}>{field.label}</Label>
              <select
                id={`qr-${field.key}`}
                value={form[field.key]}
                onChange={(e) => handleFieldChange(field.key, e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">未設定</option>
                {[1, 2, 3, 4, 5].map((score) => (
                  <option key={score} value={score}>
                    {score}
                  </option>
                ))}
              </select>
            </div>
          ))}
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
              {qualityReviews.map((review) => (
                <div
                  key={review.id}
                  className="rounded-xl border border-violet-100 bg-white p-4 text-sm"
                >
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
                  <div className="mt-2 grid gap-1 text-xs text-violet-700 sm:grid-cols-3">
                    <p>Story: {review.storyScore}</p>
                    <p>Illustration: {review.illustrationScore}</p>
                    <p>Character: {review.characterConsistencyScore}</p>
                    <p>Personalization: {review.personalizationScore}</p>
                    <p>Safety: {review.safetyScore}</p>
                  </div>
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
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

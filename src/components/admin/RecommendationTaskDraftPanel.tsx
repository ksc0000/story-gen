"use client";

import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { BookDoc, PageDoc } from "@/lib/types";
import type { QualityRecommendationIntent } from "@/lib/quality-review";
import { buildTaskDraft, RECOMMENDATION_INTENT_LABELS } from "@/lib/quality-review";

interface RecommendationTaskDraftPanelProps {
  intent: QualityRecommendationIntent;
  book: BookDoc & { id: string };
  pages: PageDoc[];
}

export function RecommendationTaskDraftPanel({
  intent,
  book,
  pages,
}: RecommendationTaskDraftPanelProps) {
  const [copyMessage, setCopyMessage] = useState<string | null>(null);

  const draft = useMemo(() => buildTaskDraft(intent, book, pages), [intent, book, pages]);

  if (intent === "confirm_approval") {
    return null;
  }

  const copyText = [
    `## ${draft.title}`,
    "",
    `Book: ${book.id}`,
    `Intent: ${RECOMMENDATION_INTENT_LABELS[intent]}`,
    "",
    "### チェックリスト",
    ...draft.checklist.map((item) => `- [ ] ${item.label}: ${item.detail}`),
    "",
    `### サマリー`,
    draft.summary,
  ].join("\n");

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(copyText);
      setCopyMessage("コピーしました");
    } catch {
      setCopyMessage("コピーに失敗しました");
    }
    setTimeout(() => setCopyMessage(null), 2000);
  };

  return (
    <Card className="border-amber-200 bg-amber-50/30">
      <CardContent className="space-y-3 p-4">
        <div className="flex items-center justify-between gap-3">
          <h4 className="text-sm font-semibold text-amber-900">📋 {draft.title}</h4>
          <div className="flex items-center gap-2">
            {copyMessage && (
              <span className="text-xs text-amber-700">{copyMessage}</span>
            )}
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleCopy}
              className="text-xs"
            >
              タスクをコピー
            </Button>
          </div>
        </div>

        <ul className="space-y-1.5">
          {draft.checklist.map((item) => (
            <li key={item.label} className="flex gap-2 text-xs">
              <span className="shrink-0 text-amber-600">☐</span>
              <span>
                <span className="font-medium text-amber-900">{item.label}:</span>{" "}
                <span className="text-amber-800">{item.detail}</span>
              </span>
            </li>
          ))}
        </ul>

        <p className="text-xs text-amber-700">{draft.summary}</p>
      </CardContent>
    </Card>
  );
}

"use client";

import { useState, useMemo } from "react";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/firebase";
import type { BookDoc, PageDoc } from "@/lib/types";
import type { QualityRecommendationIntent } from "@/lib/quality-review";
import {
  buildTaskDraft,
  buildQualityTaskPayload,
  RECOMMENDATION_INTENT_LABELS,
} from "@/lib/quality-review";

interface RecommendationTaskDraftPanelProps {
  intent: QualityRecommendationIntent;
  book: BookDoc & { id: string };
  pages: PageDoc[];
  adminUid?: string;
}

export function RecommendationTaskDraftPanel({
  intent,
  book,
  pages,
  adminUid,
}: RecommendationTaskDraftPanelProps) {
  const [copyMessage, setCopyMessage] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [saveError, setSaveError] = useState<string | null>(null);

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

  const handleSave = async () => {
    if (!adminUid) return;
    setSaveStatus("saving");
    setSaveError(null);
    try {
      const payload = buildQualityTaskPayload(intent, book, pages, adminUid);
      await addDoc(collection(db, "qualityTasks"), {
        ...payload,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setSaveStatus("saved");
    } catch (err) {
      setSaveStatus("error");
      setSaveError(err instanceof Error ? err.message : "保存に失敗しました");
    }
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
            {saveStatus === "saved" && (
              <span className="text-xs text-emerald-700">保存しました</span>
            )}
            {saveStatus === "error" && (
              <span className="text-xs text-rose-600">{saveError}</span>
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
            {adminUid && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleSave}
                disabled={saveStatus === "saving" || saveStatus === "saved"}
                className="text-xs"
              >
                {saveStatus === "saving" ? "保存中..." : saveStatus === "saved" ? "保存済み" : "タスクとして保存"}
              </Button>
            )}
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

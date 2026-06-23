"use client";

import { useState, useMemo } from "react";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/firebase";
import { logAdminOperation } from "@/lib/admin-audit-logger";
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
  onApproveBook?: () => Promise<void>;
  onRegenerateFlaggedPages?: () => Promise<void>;
  isExecuting?: boolean;
}

export function RecommendationTaskDraftPanel({
  intent,
  book,
  pages,
  adminUid,
  onApproveBook,
  onRegenerateFlaggedPages,
  isExecuting = false,
}: RecommendationTaskDraftPanelProps) {
  const [copyMessage, setCopyMessage] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [confirmChecks, setConfirmChecks] = useState<Record<string, boolean>>({});

  const draft = useMemo(() => buildTaskDraft(intent, book, pages), [intent, book, pages]);

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
      const docRef = await addDoc(collection(db, "qualityTasks"), {
        ...payload,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      await logAdminOperation({
        operation: "create_quality_task",
        adminUid,
        targetId: docRef.id,
        targetType: "task",
        payload: {
          bookId: book.id,
          intent,
        },
      });

      setSaveStatus("saved");
    } catch (err) {
      setSaveStatus("error");
      setSaveError(err instanceof Error ? err.message : "保存に失敗しました");
    }
  };

  if (intent === "confirm_approval") {
    const allChecked = draft.checklist.every((item) => confirmChecks[item.label]);
    return (
      <Card className="border-emerald-200 bg-emerald-50/30">
        <CardContent className="space-y-4 p-4">
          <div className="flex items-center justify-between gap-3">
            <h4 className="text-sm font-semibold text-emerald-900">✅ {draft.title}</h4>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="border-emerald-300 text-emerald-700 hover:bg-emerald-100"
                onClick={onApproveBook}
                disabled={!allChecked || isExecuting}
              >
                {isExecuting ? "実行中..." : "Book を承認する"}
              </Button>
            </div>
          </div>

          <p className="text-xs text-emerald-800">{draft.summary}</p>

          <div className="space-y-2 rounded-lg border border-emerald-100 bg-white/50 p-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">承認前チェックリスト</p>
            <ul className="space-y-2">
              {draft.checklist.map((item) => (
                <li key={item.label} className="flex items-start gap-2 text-xs">
                  <input
                    type="checkbox"
                    id={`check-${item.label}`}
                    checked={!!confirmChecks[item.label]}
                    onChange={(e) => setConfirmChecks(prev => ({ ...prev, [item.label]: e.target.checked }))}
                    className="mt-0.5 shrink-0"
                  />
                  <label htmlFor={`check-${item.label}`} className="cursor-pointer select-none">
                    <span className="font-semibold text-emerald-950">{item.label}:</span>{" "}
                    <span className="text-emerald-800">{item.detail}</span>
                  </label>
                </li>
              ))}
            </ul>
          </div>
          {!allChecked && (
            <p className="text-[10px] text-emerald-600">※ すべての項目を確認すると承認ボタンが有効になります</p>
          )}
        </CardContent>
      </Card>
    );
  }

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
            {intent === "review_image_regeneration" && onRegenerateFlaggedPages && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={onRegenerateFlaggedPages}
                disabled={isExecuting}
                className="border-rose-300 text-rose-700 hover:bg-rose-100 text-xs"
              >
                {isExecuting ? "実行中..." : "対象ページを再生成"}
              </Button>
            )}
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

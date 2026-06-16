"use client";

import { useState } from "react";
import { doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { Library, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/firebase";
import { useSeries } from "@/lib/hooks/use-series";
import { cn } from "@/lib/utils";

interface BookSeriesControlProps {
  bookId: string;
  userId: string;
  seriesId?: string;
}

export function BookSeriesControl({ bookId, userId, seriesId }: BookSeriesControlProps) {
  const { series, createSeries } = useSeries(userId);
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [newSeriesName, setNewSeriesName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const currentSeries = series.find((s) => s.id === seriesId);

  async function applySeriesId(nextSeriesId: string | null) {
    setIsSaving(true);
    setError(null);
    try {
      await updateDoc(doc(db, "books", bookId), {
        seriesId: nextSeriesId ?? null,
        updatedAt: serverTimestamp(),
      });
      setIsOpen(false);
      setNewSeriesName("");
    } catch (err) {
      console.error("Failed to update book series:", err);
      setError("更新に失敗しました。もう一度お試しください。");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleCreateAndAssign() {
    const name = newSeriesName.trim();
    if (!name) return;
    setIsSaving(true);
    setError(null);
    try {
      const newSeriesId = await createSeries(name, userId);
      await applySeriesId(newSeriesId);
    } catch (err) {
      console.error("Failed to create series:", err);
      setError("シリーズの作成に失敗しました。もう一度お試しください。");
      setIsSaving(false);
    }
  }

  return (
    <div className="relative">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen((v) => !v)}
        className={cn("rounded-full px-4", currentSeries && "border-purple-200 text-purple-700")}
      >
        <Library className="mr-2 h-4 w-4" />
        {currentSeries ? currentSeries.name : "シリーズに追加"}
      </Button>

      {isOpen && (
        <div className="absolute left-0 top-full z-20 mt-2 w-72 rounded-xl border border-purple-100 bg-white p-3 shadow-lg">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-semibold text-purple-900">シリーズに追加</p>
            <button onClick={() => setIsOpen(false)} className="text-violet-400 hover:text-violet-600">
              <X className="h-4 w-4" />
            </button>
          </div>

          {error && <p className="mb-2 text-xs text-rose-500">{error}</p>}

          {seriesId && (
            <button
              onClick={() => applySeriesId(null)}
              disabled={isSaving}
              className="mb-2 w-full rounded-lg border border-rose-100 px-3 py-1.5 text-left text-sm text-rose-600 hover:bg-rose-50 disabled:opacity-50"
            >
              シリーズから外す
            </button>
          )}

          {series.length > 0 && (
            <div className="mb-2 max-h-40 space-y-1 overflow-y-auto">
              {series.map((s) => (
                <button
                  key={s.id}
                  onClick={() => applySeriesId(s.id)}
                  disabled={isSaving || s.id === seriesId}
                  className={cn(
                    "w-full rounded-lg px-3 py-1.5 text-left text-sm hover:bg-purple-50 disabled:opacity-50",
                    s.id === seriesId ? "bg-purple-50 font-semibold text-purple-700" : "text-violet-700"
                  )}
                >
                  {s.name}
                </button>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2 border-t border-purple-100 pt-2">
            <input
              type="text"
              value={newSeriesName}
              onChange={(e) => setNewSeriesName(e.target.value)}
              placeholder="新しいシリーズ名"
              disabled={isSaving}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreateAndAssign();
              }}
              className="w-full rounded-lg border border-purple-200 px-2 py-1.5 text-sm focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400/50"
            />
            <Button
              size="sm"
              onClick={handleCreateAndAssign}
              disabled={isSaving || !newSeriesName.trim()}
              className="shrink-0 bg-purple-600 hover:bg-purple-700"
            >
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "作成"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

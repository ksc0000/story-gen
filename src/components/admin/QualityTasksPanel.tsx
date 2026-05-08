"use client";

import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { QualityTaskDoc, QualityTaskStatus } from "@/lib/types";

type TaskWithId = QualityTaskDoc & { id: string };

type StatusFilter = "all" | QualityTaskStatus;

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "open", label: "open" },
  { value: "in_progress", label: "in_progress" },
  { value: "resolved", label: "resolved" },
  { value: "wont_fix", label: "wont_fix" },
];

function statusBadgeClass(status: QualityTaskStatus): string {
  switch (status) {
    case "open":
      return "bg-amber-100 text-amber-800 border-amber-300";
    case "in_progress":
      return "bg-blue-100 text-blue-800 border-blue-300";
    case "resolved":
      return "bg-green-100 text-green-800 border-green-300";
    case "wont_fix":
      return "bg-gray-100 text-gray-600 border-gray-300";
  }
}

function formatTimestamp(ms: unknown): string {
  if (typeof ms !== "number" || !Number.isFinite(ms)) return "—";
  return new Date(ms).toLocaleString("ja-JP", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function QualityTasksPanel() {
  const [tasks, setTasks] = useState<TaskWithId[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  useEffect(() => {
    let cancelled = false;

    async function fetchTasks() {
      setLoading(true);
      setError(null);
      try {
        const q = query(
          collection(db, "qualityTasks"),
          orderBy("createdAtMs", "desc"),
          limit(20)
        );
        const snap = await getDocs(q);
        if (cancelled) return;
        const docs = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as QualityTaskDoc),
        }));
        setTasks(docs);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to load quality tasks");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchTasks();
    return () => { cancelled = true; };
  }, []);

  const filteredTasks =
    statusFilter === "all"
      ? tasks
      : tasks.filter((t) => t.status === statusFilter);

  return (
    <Card>
      <CardContent className="space-y-4 p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-purple-900">
            Quality Tasks
          </h2>
          <span className="text-xs text-violet-500">
            {filteredTasks.length}/{tasks.length} 件
          </span>
        </div>

        {/* Status filter */}
        <div className="flex flex-wrap gap-2">
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setStatusFilter(opt.value)}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                statusFilter === opt.value
                  ? "border-purple-400 bg-purple-100 text-purple-800"
                  : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Loading */}
        {loading && (
          <p className="text-sm text-violet-500">Loading quality tasks...</p>
        )}

        {/* Error */}
        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}

        {/* Empty */}
        {!loading && !error && filteredTasks.length === 0 && (
          <p className="text-sm text-violet-400">No quality tasks yet</p>
        )}

        {/* Task list */}
        {!loading && filteredTasks.length > 0 && (
          <div className="space-y-3">
            {filteredTasks.map((task) => {
              const checklist = Array.isArray(task.checklist) ? task.checklist : [];
              const checkedCount = checklist.filter((c) => c.checked).length;
              const totalCount = checklist.length;
              return (
                <div
                  key={task.id}
                  className="rounded-lg border border-violet-100 bg-violet-50/30 p-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-purple-900 truncate">
                        {task.title}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-violet-600">
                        <span className="font-mono">{task.bookId.slice(0, 8)}…</span>
                        <span>•</span>
                        <span>{task.intent}</span>
                        {task.sourceOverallScore != null && (
                          <>
                            <span>•</span>
                            <span>score: {task.sourceOverallScore}</span>
                          </>
                        )}
                        {task.sourceQualityReviewStatus && (
                          <>
                            <span>•</span>
                            <span>{task.sourceQualityReviewStatus}</span>
                          </>
                        )}
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-xs text-violet-500">
                        <span>
                          checklist: {checkedCount}/{totalCount}
                        </span>
                        <span>•</span>
                        <span>{formatTimestamp(task.createdAtMs)}</span>
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className={`shrink-0 text-xs ${statusBadgeClass(task.status)}`}
                    >
                      {task.status}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

"use client";

import { useEffect, useState } from "react";
import {
  collection,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
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

const TASK_STATUS_OPTIONS: QualityTaskStatus[] = [
  "open",
  "in_progress",
  "resolved",
  "wont_fix",
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

interface QualityTasksPanelProps {
  adminUid?: string;
}

export function QualityTasksPanel({ adminUid }: QualityTasksPanelProps) {
  const [tasks, setTasks] = useState<TaskWithId[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

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

  // --- Update helpers ---

  async function updateTask(taskId: string, updates: Partial<QualityTaskDoc>) {
    setSaving(taskId);
    try {
      const ref = doc(db, "qualityTasks", taskId);
      await updateDoc(ref, {
        ...updates,
        updatedAt: serverTimestamp(),
        updatedAtMs: Date.now(),
      });
      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId ? { ...t, ...updates, updatedAtMs: Date.now() } : t
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update task");
    } finally {
      setSaving(null);
    }
  }

  function handleChecklistToggle(task: TaskWithId, index: number) {
    const checklist = Array.isArray(task.checklist) ? [...task.checklist] : [];
    if (!checklist[index]) return;
    checklist[index] = { ...checklist[index], checked: !checklist[index].checked };
    updateTask(task.id, { checklist });
  }

  function handleStatusChange(task: TaskWithId, newStatus: QualityTaskStatus) {
    if ((newStatus === "resolved" || newStatus === "wont_fix") && !adminUid) {
      setError("Admin user is not ready.");
      return;
    }
    const updates: Partial<QualityTaskDoc> = { status: newStatus };
    if ((newStatus === "resolved" || newStatus === "wont_fix") && adminUid) {
      updates.resolvedBy = adminUid;
      updates.resolvedAtMs = Date.now();
    }
    if (newStatus === "open" || newStatus === "in_progress") {
      updates.resolvedBy = null;
      updates.resolvedAtMs = null;
    }
    updateTask(task.id, updates);
  }

  function handleResolutionNoteChange(task: TaskWithId, note: string) {
    updateTask(task.id, { resolutionNote: note });
  }

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
              const isExpanded = expandedTaskId === task.id;
              const isSaving = saving === task.id;
              return (
                <div
                  key={task.id}
                  className={`rounded-lg border p-3 transition-colors ${
                    isExpanded
                      ? "border-purple-300 bg-purple-50/40"
                      : "border-violet-100 bg-violet-50/30"
                  }`}
                >
                  {/* Summary row */}
                  <button
                    type="button"
                    onClick={() => setExpandedTaskId(isExpanded ? null : task.id)}
                    className="flex w-full items-start justify-between gap-2 text-left"
                  >
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
                        {isSaving && (
                          <>
                            <span>•</span>
                            <span className="text-blue-600">saving…</span>
                          </>
                        )}
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className={`shrink-0 text-xs ${statusBadgeClass(task.status)}`}
                    >
                      {task.status}
                    </Badge>
                  </button>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div className="mt-3 space-y-3 border-t border-violet-100 pt-3">
                      {/* Status change */}
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-medium text-violet-700">Status:</span>
                        {TASK_STATUS_OPTIONS.map((s) => (
                          <button
                            key={s}
                            type="button"
                            disabled={isSaving || task.status === s}
                            onClick={() => handleStatusChange(task, s)}
                            className={`rounded border px-2 py-0.5 text-xs transition-colors disabled:opacity-40 ${
                              task.status === s
                                ? "border-purple-400 bg-purple-100 text-purple-800"
                                : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                            }`}
                          >
                            {s}
                          </button>
                        ))}
                      </div>

                      {/* Checklist */}
                      {checklist.length > 0 && (
                        <div className="space-y-1">
                          <span className="text-xs font-medium text-violet-700">Checklist:</span>
                          {checklist.map((item, idx) => (
                            <label
                              key={idx}
                              className="flex items-start gap-2 rounded px-1 py-0.5 text-xs text-violet-800 hover:bg-violet-50"
                            >
                              <input
                                type="checkbox"
                                checked={item.checked}
                                disabled={isSaving}
                                onChange={() => handleChecklistToggle(task, idx)}
                                className="mt-0.5 rounded border-gray-300"
                              />
                              <span className={item.checked ? "line-through opacity-60" : ""}>
                                {item.label}
                              </span>
                            </label>
                          ))}
                        </div>
                      )}

                      {/* Resolution note */}
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-violet-700">
                          Resolution note:
                        </label>
                        <textarea
                          value={task.resolutionNote ?? ""}
                          disabled={isSaving}
                          onChange={(e) => {
                            // Optimistic local update
                            setTasks((prev) =>
                              prev.map((t) =>
                                t.id === task.id ? { ...t, resolutionNote: e.target.value } : t
                              )
                            );
                          }}
                          onBlur={(e) => {
                            if (e.target.value !== (task.resolutionNote ?? "")) {
                              handleResolutionNoteChange(task, e.target.value);
                            }
                          }}
                          rows={2}
                          className="w-full rounded border border-violet-200 bg-white px-2 py-1 text-xs text-violet-800 placeholder:text-violet-300 focus:border-purple-400 focus:outline-none focus:ring-1 focus:ring-purple-300"
                          placeholder="解決時のメモ…"
                        />
                      </div>

                      {/* Metadata */}
                      <div className="flex flex-wrap gap-3 text-xs text-violet-500">
                        <span>id: {task.id.slice(0, 8)}…</span>
                        {task.resolvedBy && <span>resolved by: {task.resolvedBy.slice(0, 8)}…</span>}
                        {task.resolvedAtMs && <span>resolved: {formatTimestamp(task.resolvedAtMs)}</span>}
                        <span>updated: {formatTimestamp(task.updatedAtMs)}</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

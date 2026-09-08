/**
 * 読了・アクティブの記録（KGI「定着家庭数」の分子・分母）。
 * - 読了: ビューアが最終ページに到達したとき、所有者の場合だけ books に記録する（1 セッション 1 回）
 * - アクティブ: users.lastActiveAtMs をセッションごとに 1 回だけ更新する（書き込み節約）
 */
import { doc, increment, serverTimestamp, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export const ACTIVITY_PING_INTERVAL_MS = 6 * 60 * 60 * 1000;

/** 前回の記録から一定時間経っていれば true（テスト可能な純関数） */
export function shouldPingActivity(lastPingMs: number | null, nowMs: number, intervalMs = ACTIVITY_PING_INTERVAL_MS): boolean {
  if (lastPingMs == null || !Number.isFinite(lastPingMs)) return true;
  return nowMs - lastPingMs >= intervalMs;
}

export async function recordBookOpened(bookId: string): Promise<void> {
  const nowMs = Date.now();
  await updateDoc(doc(db, "books", bookId), {
    lastReadAt: serverTimestamp(),
    lastReadAtMs: nowMs,
    updatedAt: serverTimestamp(),
    updatedAtMs: nowMs,
  });
}

export async function recordReadingCompleted(bookId: string): Promise<void> {
  const nowMs = Date.now();
  await updateDoc(doc(db, "books", bookId), {
    readCompletedAt: serverTimestamp(),
    readCompletedAtMs: nowMs,
    readCompletedCount: increment(1),
    updatedAt: serverTimestamp(),
    updatedAtMs: nowMs,
  });
}

export async function recordUserActivity(uid: string): Promise<void> {
  const key = `ehoria-activity-ping:${uid}`;
  let last: number | null = null;
  try {
    const raw = localStorage.getItem(key);
    last = raw ? Number(raw) : null;
  } catch {
    last = null;
  }
  const nowMs = Date.now();
  if (!shouldPingActivity(last, nowMs)) return;
  await updateDoc(doc(db, "users", uid), { lastActiveAt: serverTimestamp(), lastActiveAtMs: nowMs });
  try {
    localStorage.setItem(key, String(nowMs));
  } catch {
    // 保存できなくても次回また書くだけ
  }
}

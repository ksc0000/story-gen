"use client";

/**
 * 月次生成回数の「本当の値」を読む。
 *
 * サーバ（functions/src/generate-book.ts の getUserMonthlyCount / incrementMonthlyCount）は
 * `users/{uid}/usage/{YYYY-MM}.count` を数えて上限判定する。一方、画面はこれまで
 * `users/{uid}.monthlyGenerationCount` を見ていたが、この値は初期化時の 0 と月初リセットの 0 以外
 * 誰も書かないため、常に「あと3冊」と表示され、上限到達は生成失敗で初めて分かる状態だった。
 *
 * キーはサーバと同じ計算（Cloud Functions は UTC で動くので UTC の年月）にする。
 */
import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { isDemoMode } from "@/lib/demo";

/** サーバ側 `${now.getFullYear()}-${MM}`（UTC）と同じキー */
export function currentUsageYearMonth(now: Date = new Date()): string {
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}

export interface MonthlyUsage {
  /** 今月の生成回数（サーバが数えている値） */
  consumed: number;
  loading: boolean;
}

export function useMonthlyUsage(userId: string | undefined): MonthlyUsage {
  const [consumed, setConsumed] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isDemoMode) {
      setConsumed(1);
      setLoading(false);
      return;
    }
    if (!userId) {
      setConsumed(0);
      setLoading(false);
      return;
    }
    const ref = doc(db, "users", userId, "usage", currentUsageYearMonth());
    const unsubscribe = onSnapshot(
      ref,
      (snap) => {
        const count = snap.exists() ? Number(snap.data()?.count ?? 0) : 0;
        setConsumed(Number.isFinite(count) ? count : 0);
        setLoading(false);
      },
      (err) => {
        console.warn("Failed to read monthly usage", err);
        setLoading(false);
      }
    );
    return unsubscribe;
  }, [userId]);

  return { consumed, loading };
}

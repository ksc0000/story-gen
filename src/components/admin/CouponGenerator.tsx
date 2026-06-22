"use client";

import { useState } from "react";
import { RefreshCw, Ticket } from "lucide-react";
import { createCouponCallable } from "@/lib/functions";

/** 管理者用：テスター向けクーポンを生成する小パネル。 */
export function CouponGenerator() {
  const [credits, setCredits] = useState(3);
  const [maxRedemptions, setMaxRedemptions] = useState(1);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [created, setCreated] = useState<{ code: string; creditsGranted: number; maxRedemptions: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const generate = async () => {
    setLoading(true);
    setError(null);
    setCreated(null);
    try {
      const res = await createCouponCallable({
        creditsGranted: credits,
        maxRedemptions,
        ...(note.trim() ? { note: note.trim() } : {}),
      });
      setCreated({ code: res.code, creditsGranted: res.creditsGranted, maxRedemptions: res.maxRedemptions });
    } catch (err: unknown) {
      const msg = typeof err === "object" && err && "message" in err ? String((err as { message?: string }).message) : "生成に失敗しました。";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-violet-100 bg-white p-4 shadow-sm">
      <h3 className="mb-1 flex items-center gap-2 text-sm font-bold text-purple-900">
        <Ticket className="size-4" /> クーポン生成（テスター向け）
      </h3>
      <p className="mb-3 text-xs text-violet-400">引き換えで生成クレジット（singleBookCredits）を付与するコードを発行します。</p>
      <div className="grid grid-cols-2 gap-2">
        <label className="text-xs text-violet-500">
          付与クレジット
          <input
            type="number"
            min={1}
            max={100}
            value={credits}
            onChange={(e) => setCredits(Math.max(1, Number(e.target.value)))}
            className="mt-1 w-full rounded-lg border border-violet-200 px-2 py-1.5 text-sm text-purple-900"
          />
        </label>
        <label className="text-xs text-violet-500">
          利用上限（人数）
          <input
            type="number"
            min={1}
            value={maxRedemptions}
            onChange={(e) => setMaxRedemptions(Math.max(1, Number(e.target.value)))}
            className="mt-1 w-full rounded-lg border border-violet-200 px-2 py-1.5 text-sm text-purple-900"
          />
        </label>
      </div>
      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="メモ（任意・例: 6月テスター）"
        className="mt-2 w-full rounded-lg border border-violet-200 px-2 py-1.5 text-sm text-purple-900"
      />
      <button
        onClick={generate}
        disabled={loading}
        className="mt-3 inline-flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-bold text-white hover:bg-purple-700 disabled:opacity-50"
      >
        {loading && <RefreshCw className="size-4 animate-spin" />}
        コードを生成
      </button>
      {created && (
        <div className="mt-3 rounded-lg bg-violet-50 p-3 text-sm">
          <p className="text-violet-600">発行コード：</p>
          <p className="mt-1 font-mono text-lg font-bold tracking-widest text-purple-900">{created.code}</p>
          <p className="mt-1 text-xs text-violet-400">
            {created.creditsGranted} クレジット / {created.maxRedemptions} 人まで利用可。テスターに共有してください。
          </p>
        </div>
      )}
      {error && <p className="mt-2 text-xs text-rose-500">{error}</p>}
    </div>
  );
}

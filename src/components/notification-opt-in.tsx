"use client";

import { useEffect, useState } from "react";
import { Bell, BellRing, Share } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/lib/hooks/use-auth";
import {
  enableBookCompletionPush,
  getPushSupportState,
  isPushPermissionDenied,
  isPushPermissionGranted,
  type PushSupportState,
} from "@/lib/push";

/**
 * 生成待ち画面の通知オプトインカード。
 * - 未許可: 「完成したらお知らせ」ボタンを表示（ユーザー操作起点で許可要求）
 * - 許可済み: 「閉じても大丈夫」メッセージ＋トークンを静かに最新化
 * - iOS 未インストール: ホーム画面追加の案内
 * - 非対応/デモ/拒否済み: 何も表示しない（既存動作を邪魔しない）
 */
export function NotificationOptIn() {
  const { user } = useAuth();
  const toast = useToast();
  const [support, setSupport] = useState<PushSupportState | null>(null);
  const [granted, setGranted] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getPushSupportState().then((state) => {
      if (cancelled) return;
      setSupport(state);
      if (state === "supported" && isPushPermissionGranted()) {
        setGranted(true);
        // 許可済み端末はトークンを静かに最新化（失効対策）。
        // 失敗したら「閉じても大丈夫」を出し続けるのは嘘になるため表示を戻す。
        if (user?.uid) {
          void enableBookCompletionPush(user.uid).then((result) => {
            if (!result.token) {
              console.warn("push token refresh failed:", result.reason);
              setGranted(false);
            }
          });
        }
      }
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid]);

  if (!user || support === null || support === "unsupported") return null;
  if (support === "supported" && isPushPermissionDenied()) return null;

  if (granted) {
    return (
      <div className="mx-auto mt-4 flex max-w-md items-center gap-3 rounded-2xl border border-emerald-100 bg-emerald-50/70 px-4 py-3">
        <BellRing className="size-5 shrink-0 text-emerald-500" />
        <p className="text-sm text-emerald-700">
          このページを閉じても大丈夫。絵本ができたら通知でお知らせします。
        </p>
      </div>
    );
  }

  if (support === "needs-install") {
    return (
      <div className="mx-auto mt-4 flex max-w-md items-start gap-3 rounded-2xl border border-violet-100 bg-white/80 px-4 py-3">
        <Share className="mt-0.5 size-5 shrink-0 text-violet-400" />
        <p className="text-sm leading-relaxed text-violet-600">
          完成を通知で受け取るには、共有メニューから
          <span className="font-semibold">「ホーム画面に追加」</span>
          でアプリとして開いてください。
        </p>
      </div>
    );
  }

  const handleEnable = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const result = await enableBookCompletionPush(user.uid);
      if (result.token) {
        setGranted(true);
        toast.success("完成したら通知でお知らせします");
      } else if (isPushPermissionDenied()) {
        toast.info("通知はブラウザの設定からいつでも有効にできます");
      } else {
        // 診断しやすいよう失敗理由の要約を添える（例: AbortError 等）
        const hint = result.reason ? `（${result.reason.slice(0, 60)}）` : "";
        toast.error(`通知の設定に失敗しました${hint}`);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto mt-4 flex max-w-md items-center justify-between gap-3 rounded-2xl border border-violet-100 bg-white/80 px-4 py-3">
      <div className="flex items-center gap-3">
        <Bell className="size-5 shrink-0 text-violet-400" />
        <p className="text-sm text-violet-600">できあがったら お知らせしますか？</p>
      </div>
      <Button size="sm" onClick={handleEnable} disabled={busy} className="shrink-0">
        通知を受け取る
      </Button>
    </div>
  );
}

"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast";
import { getPushSupportState, isPushPermissionGranted } from "@/lib/push";

/**
 * アプリを開いたまま生成が完了した場合のフォアグラウンド FCM メッセージを
 * トーストで表示する（OS 通知はバックグラウンド時のみ SW が担当）。
 * 許可済みユーザーにのみ購読を張る。UI は持たない。
 */
export function PushForegroundListener() {
  const toast = useToast();
  const router = useRouter();

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    let cancelled = false;

    (async () => {
      const state = await getPushSupportState();
      if (cancelled || state !== "supported" || !isPushPermissionGranted()) return;
      try {
        const { getMessaging, onMessage } = await import("firebase/messaging");
        const { getApps } = await import("firebase/app");
        if (getApps().length === 0) return;
        const messaging = getMessaging(getApps()[0]);
        unsubscribe = onMessage(messaging, (payload) => {
          const data = payload.data ?? {};
          const title = data.title ?? "お知らせ";
          toast.info(title);
          // 完了通知なら該当絵本へ誘導しやすいよう、リンク先があれば遷移は任意。
          // 自動遷移はしない（作成中の別作業を邪魔しない）。
          void router; // 将来のタップ遷移拡張用に保持
        });
      } catch {
        // messaging 未対応環境では静かに諦める
      }
    })();

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}

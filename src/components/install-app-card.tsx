"use client";

import { useEffect, useState } from "react";
import { Smartphone, Share, PlusSquare } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { isStandalone } from "@/lib/push";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/**
 * 「アプリとして使う」案内カード（設定画面用）。
 * - Android/Chrome: beforeinstallprompt を捕捉してワンタップインストール
 * - iOS Safari: 共有 →「ホーム画面に追加」の手順を案内
 * - すでにスタンドアロン起動中なら何も表示しない
 */
export function InstallAppCard() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [ios, setIos] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || isStandalone()) return;
    const isIosDevice = /iphone|ipad|ipod/i.test(navigator.userAgent);
    setIos(isIosDevice);
    setVisible(true);

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (!visible) return null;

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === "accepted") setVisible(false);
    setDeferredPrompt(null);
  };

  return (
    <Card className="border-violet-100 shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Smartphone className="mt-0.5 size-5 shrink-0 text-violet-400" />
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-purple-900">アプリとして使う</p>
            <p className="mt-1 text-sm leading-relaxed text-violet-500">
              ホーム画面に追加すると、アプリのように起動でき、
              絵本の完成を通知で受け取れます。
            </p>
            {ios ? (
              <div className="mt-3 space-y-1.5 rounded-xl bg-violet-50/70 px-3 py-2.5 text-sm text-violet-600">
                <p className="flex items-center gap-1.5">
                  <Share className="size-4 shrink-0" />
                  1. 下の<span className="font-semibold">共有ボタン</span>をタップ
                </p>
                <p className="flex items-center gap-1.5">
                  <PlusSquare className="size-4 shrink-0" />
                  2. <span className="font-semibold">「ホーム画面に追加」</span>を選択
                </p>
              </div>
            ) : deferredPrompt ? (
              <Button size="sm" className="mt-3" onClick={handleInstall}>
                ホーム画面に追加
              </Button>
            ) : (
              <p className="mt-2 text-xs text-violet-400">
                ブラウザのメニューから「アプリをインストール」を選んでください。
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

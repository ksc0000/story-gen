"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { ChevronRight } from "lucide-react";

interface AvatarNudgeBannerProps {
  childId: string;
}

export function AvatarNudgeBanner({ childId }: AvatarNudgeBannerProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const isDismissed = sessionStorage.getItem(`avatar-nudge-dismissed-${childId}`);
    if (!isDismissed) {
      setIsVisible(true);
    }
  }, [childId]);

  const handleDismiss = () => {
    sessionStorage.setItem(`avatar-nudge-dismissed-${childId}`, "true");
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-purple-50 to-violet-50 border border-purple-100 p-4 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white text-xl shadow-sm">
            ✨
          </div>
          <div>
            <p className="text-sm font-bold text-purple-900">
              アバターを設定するともっとそっくりに！
            </p>
            <p className="text-xs text-violet-500">
              お子さんの写真からAIがキャラクターを生成します。
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4 self-end sm:self-auto">
          <button
            onClick={handleDismiss}
            className="text-xs font-medium text-violet-400 hover:text-violet-600 transition-colors"
          >
            後で
          </button>
          <Link
            href={`/onboarding/child/avatar?childId=${childId}`}
            className="flex items-center gap-1 rounded-full bg-purple-600 px-4 py-1.5 text-sm font-bold text-white shadow-md transition hover:bg-purple-700 active:scale-95"
          >
            設定する
            <ChevronRight className="size-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}

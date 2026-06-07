"use client";

import { useEffect } from "react";
import { ErrorFallback } from "@/components/ui/error-fallback";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // 開発環境やログ収集サービスのためにエラーをコンソールに出力
    console.error("Application Error:", error);
  }, [error]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background p-6">
      <ErrorFallback error={error} reset={reset} />
    </main>
  );
}

"use client";

import { AlertCircle, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface ErrorFallbackProps {
  error: Error & { digest?: string };
  reset: () => void;
  title?: string;
  message?: string;
}

export function ErrorFallback({
  error,
  reset,
  title = "エラーが発生しました",
  message = "一時的な問題が発生したか、ネットワークが不安定な可能性があります。時間をおいて再度お試しください。",
}: ErrorFallbackProps) {
  return (
    <div className="flex min-h-[400px] w-full items-center justify-center p-4">
      <Card className="w-full max-w-md border-destructive/20 shadow-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <AlertCircle className="size-6" />
          </div>
          <CardTitle className="text-xl text-foreground font-heading">{title}</CardTitle>
          <CardDescription className="text-muted-foreground mt-2">
            {message}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/*
            開発中やデバッグ用に digest がある場合は表示するが、
            生の error.message はセキュリティ上の理由でユーザーには直接表示しない。
          */}
          {error.digest && (
            <div className="mt-2 text-center">
              <span className="text-[10px] text-muted-foreground/50 font-mono">
                Error ID: {error.digest}
              </span>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-center bg-transparent border-t-0 pb-6">
          <Button
            onClick={reset}
            variant="default"
            size="lg"
            className="w-full sm:w-auto px-8"
          >
            <RefreshCcw className="mr-2 size-4" />
            再試行する
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

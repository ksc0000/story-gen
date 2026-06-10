"use client";

import Link from "next/link";
import { Share2, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { BookDoc } from "@/lib/types";

interface BookNextActionsProps {
  bookId: string;
  book: BookDoc;
  isDemoMode: boolean;
  onToggleShare: () => void;
  isSharing: boolean;
}

export function BookNextActions({
  book,
  isDemoMode,
  onToggleShare,
  isSharing,
}: BookNextActionsProps) {
  const handleComingSoon = () => {
    window.alert("近日公開予定です");
  };

  return (
    <Card className="mt-8 border-purple-200 bg-purple-50/50">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-purple-900">
          <span role="img" aria-label="book">📖</span> 絵本が完成しました！
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="mb-4 text-sm text-violet-600">
          感動が冷めないうちに、次のおすすめアクションはいかがですか？
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {/* 共有する */}
          <Button
            variant={book.public ? "outline" : "default"}
            onClick={onToggleShare}
            disabled={isSharing || isDemoMode}
            className={cn(
              "h-12 w-full justify-start rounded-2xl px-4",
              book.public && "border-purple-200 bg-white text-purple-700"
            )}
          >
            {isSharing ? (
              <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : (
              <Share2 className="mr-2 h-4 w-4" />
            )}
            共有する
          </Button>

          {/* もう1冊作る */}
          <Link
            href={isDemoMode ? "#" : `/create/select-child?childId=${book.childId || ""}`}
            className={cn("block w-full", isDemoMode && "pointer-events-none")}
          >
            <Button
              variant="default"
              className="h-12 w-full justify-start rounded-2xl px-4"
              disabled={isDemoMode}
            >
              <Sparkles className="mr-2 h-4 w-4" />
              もう1冊作る
            </Button>
          </Link>

          {/* 印刷する (Coming Soon) */}
          <Button
            variant="outline"
            className="h-12 w-full justify-start rounded-2xl border-dashed border-purple-200 bg-white/50 px-4 text-violet-400"
            onClick={handleComingSoon}
          >
            <span className="mr-2 text-lg">🖨</span>
            印刷する
            <Badge
              variant="default"
              className="ml-auto h-5 bg-violet-100 text-[10px] text-violet-500 border-none"
            >
              準備中
            </Badge>
          </Button>

          {/* PDF保存 (Coming Soon) */}
          <Button
            variant="outline"
            className="h-12 w-full justify-start rounded-2xl border-dashed border-purple-200 bg-white/50 px-4 text-violet-400"
            onClick={handleComingSoon}
          >
            <span className="mr-2 text-lg">📄</span>
            PDF保存
            <Badge
              variant="default"
              className="ml-auto h-5 bg-violet-100 text-[10px] text-violet-500 border-none"
            >
              準備中
            </Badge>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

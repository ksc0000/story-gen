"use client";

import Link from "next/link";
import { Share2, Sparkles, FileText, Download, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import type { BookDoc } from "@/lib/types";

interface BookNextActionsProps {
  bookId: string;
  book: BookDoc;
  isDemoMode: boolean;
  onToggleShare: () => void;
  isSharing: boolean;
  onGeneratePdf?: () => void;
  isGeneratingPdf?: boolean;
}

export function BookNextActions({
  book,
  isDemoMode,
  onToggleShare,
  isSharing,
  onGeneratePdf,
  isGeneratingPdf,
}: BookNextActionsProps) {
  const toast = useToast();
  const handleComingSoon = () => {
    toast.info("近日公開予定です");
  };

  const isPaidPlan =
    book.productPlan === "standard_paid" ||
    book.productPlan === "premium_paid" ||
    book.isSinglePurchase;

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

          {/* PDF保存 */}
          {!isPaidPlan ? (
            <Link href="/pricing" className="block w-full">
              <Button
                variant="outline"
                className="h-12 w-full justify-start rounded-2xl border-dashed border-amber-200 bg-amber-50/50 px-4 text-amber-600 hover:bg-amber-100/50"
              >
                <FileText className="mr-2 h-4 w-4" />
                PDF保存
                <Badge
                  variant="default"
                  className="ml-auto h-5 bg-amber-100 text-[10px] text-amber-600 border-none"
                >
                  アップグレード
                </Badge>
              </Button>
            </Link>
          ) : book.pdfStatus === "completed" && book.pdfUrl ? (
            <Button
              variant="outline"
              className="h-12 w-full justify-start rounded-2xl border-purple-200 bg-white px-4 text-purple-700 hover:bg-purple-50"
              onClick={() => window.open(book.pdfUrl, "_blank")}
            >
              <Download className="mr-2 h-4 w-4" />
              PDFをダウンロード
            </Button>
          ) : book.pdfStatus === "processing" || isGeneratingPdf ? (
            <Button
              variant="outline"
              disabled
              className="h-12 w-full justify-start rounded-2xl border-purple-200 bg-purple-50 px-4 text-purple-400"
            >
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              PDFを作成中...
            </Button>
          ) : (
            <Button
              variant="outline"
              className="h-12 w-full justify-start rounded-2xl border-purple-200 bg-white px-4 text-purple-700 hover:bg-purple-50"
              onClick={onGeneratePdf}
              disabled={isDemoMode || !onGeneratePdf}
            >
              <FileText className="mr-2 h-4 w-4" />
              PDF保存
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

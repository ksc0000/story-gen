import Link from "next/link";
import Image from "next/image";
import { Trash2, Loader2, FileText } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AnimatedCard } from "@/components/animated-card";
import { formatDateSafe, toMillisSafe } from "@/lib/date-utils";
import type { BookDoc } from "@/lib/types";

interface BookCardProps {
  book: BookDoc & { id: string };
  onDelete?: (e: React.MouseEvent) => void;
  isDeleting?: boolean;
  /** 指定時はリンク遷移せず、カードタップで選択コールバックを呼ぶ（表紙ポップアップ用） */
  onSelect?: (book: BookDoc & { id: string }) => void;
}

export function BookCard({ book, onDelete, isDeleting, onSelect }: BookCardProps) {
  const href = book.status === "generating" ? `/generating?id=${book.id}` : `/book?id=${book.id}`;
  // Prefer createdAtMs (always a clean number); createdAt may be an unresolved
  // serverTimestamp sentinel on legacy books, which toMillisSafe treats as null.
  const createdMillis = toMillisSafe(book.createdAtMs ?? book.createdAt);

  const cardContent = (
    <AnimatedCard>
      <Card className="relative overflow-hidden">
        <div className="relative aspect-[3/4] overflow-hidden bg-gradient-to-br from-[#f3e8ff] to-[#e0f2fe] flex items-center justify-center">
          {book.status === "completed" && book.coverImageUrl ? (
            <>
              <Image src={book.coverImageUrl} alt={book.title || "絵本の表紙"} fill className="object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-[rgba(46,16,101,0.38)] via-transparent to-transparent" />
            </>
          ) : book.status === "completed" ? (
            <Image src="/images/icons/book.webp" alt="完成" width={64} height={64} />
          ) : book.status === "generating" ? (
            <div className="animate-pulse">
              <Image src="/images/icons/star.webp" alt="生成中" width={48} height={48} />
            </div>
          ) : (
            <div className="text-violet-300 text-4xl">×</div>
          )}
        </div>
        <CardContent className="p-3">
          <h3 className="truncate text-sm font-medium text-purple-900">{book.title || "生成中..."}</h3>
          {createdMillis !== null && (
            <p className="text-xs text-violet-400">{formatDateSafe(createdMillis)}</p>
          )}
          {book.status === "generating" && <Badge variant="secondary" className="mt-1 text-xs">生成中</Badge>}
          {book.pdfStatus === "completed" && (
            <Badge variant="outline" className="mt-1 border-purple-100 bg-purple-50/50 text-[10px] text-purple-600">
              <FileText className="mr-1 h-2.5 w-2.5" />
              PDF
            </Badge>
          )}
        </CardContent>
      </Card>
    </AnimatedCard>
  );

  return (
    <div className="group relative block">
      {/* 削除ボタンはカード本体（button/Link）の外に置き、button のネストを避ける */}
      {onDelete && (
        <Button
          variant="destructive"
          size="icon-xs"
          className="absolute right-2 top-2 z-20 h-7 w-7 rounded-full bg-white/80 transition-opacity hover:bg-white [@media(hover:hover)]:opacity-0 group-hover:opacity-100 disabled:opacity-100 sm:h-8 sm:w-8"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onDelete(e);
          }}
          disabled={isDeleting}
          aria-label="絵本を削除"
        >
          {isDeleting ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin sm:h-4 sm:w-4" />
          ) : (
            <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          )}
        </Button>
      )}
      {onSelect ? (
        <button
          type="button"
          onClick={() => onSelect(book)}
          className="block w-full touch-manipulation text-left"
          aria-label={`${book.title || "無題の絵本"}を開く`}
        >
          {cardContent}
        </button>
      ) : (
        <Link href={href} className="block touch-manipulation">
          {cardContent}
        </Link>
      )}
    </div>
  );
}

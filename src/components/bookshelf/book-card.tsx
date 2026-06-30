import Link from "next/link";
import Image from "next/image";
import { FileText, Star } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AnimatedCard } from "@/components/animated-card";
import { formatDateSafe, toMillisSafe } from "@/lib/date-utils";
import { cn } from "@/lib/utils";
import type { BookDoc } from "@/lib/types";

interface BookCardProps {
  book: BookDoc & { id: string };
  onToggleFavorite?: (book: BookDoc & { id: string }) => void;
}

export function BookCard({ book, onToggleFavorite }: BookCardProps) {
  const href = book.status === "generating" ? `/generating?id=${book.id}` : `/book?id=${book.id}`;
  // Prefer createdAtMs; createdAt may be an unresolved serverTimestamp sentinel
  // on legacy books, which toMillisSafe treats as null.
  const createdMillis = toMillisSafe(book.createdAtMs ?? book.createdAt);

  return (
    <Link href={href} className="group relative block">
      <AnimatedCard>
        <Card className="relative overflow-hidden transition-all hover:shadow-md">
          {book.status === "partial_completed" && (
            <div className="absolute left-2 top-2 z-20">
              <Badge variant="outline" className="bg-amber-50/90 text-amber-600 border-amber-200 backdrop-blur-sm">
                一部未完成
              </Badge>
            </div>
          )}
          {onToggleFavorite && (
            <button
              type="button"
              aria-label={book.favorite ? "お気に入りを解除" : "お気に入りに追加"}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onToggleFavorite(book);
              }}
              className={cn(
                "absolute right-2 top-2 z-20 flex h-8 w-8 items-center justify-center rounded-full backdrop-blur-sm transition",
                book.favorite
                  ? "bg-amber-400/90 text-white"
                  : "bg-white/70 text-violet-400 opacity-0 hover:bg-white group-hover:opacity-100"
              )}
            >
              <Star className={cn("h-4 w-4", book.favorite && "fill-current")} />
            </button>
          )}
          <div className="relative aspect-[3/4] overflow-hidden bg-gradient-to-br from-violet-50 to-purple-100 flex items-center justify-center">
            {book.coverImageUrl ? (
              <>
                <Image
                  src={book.coverImageUrl}
                  alt={book.title || "絵本の表紙"}
                  fill
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
              </>
            ) : (
              <div className="flex flex-col items-center gap-2 text-violet-300">
                <Image src="/images/icons/book.webp" alt="" width={64} height={64} className="opacity-50" />
                {book.status === "generating" && (
                  <span className="text-xs font-medium text-violet-400 animate-pulse">生成中...</span>
                )}
              </div>
            )}
          </div>
          <CardContent className="p-3">
            <h3 className="truncate text-sm font-semibold text-purple-900">
              {book.title || (book.status === "generating" ? "生成中..." : "無題の絵本")}
            </h3>
            {createdMillis !== null && (
              <p className="mt-1 text-[10px] text-violet-400">
                {formatDateSafe(createdMillis)}
              </p>
            )}
            {book.pdfStatus === "completed" && (
              <Badge variant="outline" className="mt-1 border-purple-100 bg-purple-50/50 text-[9px] text-purple-600 h-4 px-1.5">
                <FileText className="mr-1 h-2 w-2" />
                PDF
              </Badge>
            )}
          </CardContent>
        </Card>
      </AnimatedCard>
    </Link>
  );
}

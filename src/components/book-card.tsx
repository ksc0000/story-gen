import Link from "next/link";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AnimatedCard } from "@/components/animated-card";
import type { BookDoc } from "@/lib/types";
import { Timestamp } from "firebase/firestore";

interface BookCardProps { book: BookDoc & { id: string }; }

function getRemainingDays(expiresAt: Timestamp | null): number | null {
  if (!expiresAt) return null;
  const days = Math.ceil((expiresAt.toMillis() - Date.now()) / (1000 * 60 * 60 * 24));
  return Math.max(0, days);
}

function formatDate(ts: Timestamp): string {
  const d = ts.toDate();
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
}

export function BookCard({ book }: BookCardProps) {
  const remaining = getRemainingDays(book.expiresAt);
  const href = book.status === "generating" ? `/generating?id=${book.id}` : `/book?id=${book.id}`;
  return (
    <Link href={href}>
      <AnimatedCard>
        <Card>
          <div className="aspect-[3/4] bg-gradient-to-br from-[#f3e8ff] to-[#e0f2fe] flex items-center justify-center">
            {book.status === "completed" ? (
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
            <p className="text-xs text-violet-400">{formatDate(book.createdAt)}</p>
            {remaining !== null && remaining <= 7 && <Badge variant="destructive" className="mt-1 text-xs">あと{remaining}日</Badge>}
            {book.status === "generating" && <Badge variant="secondary" className="mt-1 text-xs">生成中</Badge>}
          </CardContent>
        </Card>
      </AnimatedCard>
    </Link>
  );
}

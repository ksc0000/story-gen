import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  const href = book.status === "generating" ? `/generating/${book.id}` : `/book/${book.id}`;
  return (
    <Link href={href}>
      <Card className="overflow-hidden border-amber-200 transition hover:shadow-md">
        <div className="aspect-[3/4] bg-amber-100 flex items-center justify-center">
          {book.status === "completed" ? <span className="text-6xl">📖</span> : book.status === "generating" ? <span className="text-4xl animate-pulse">⏳</span> : <span className="text-4xl">❌</span>}
        </div>
        <CardContent className="p-3">
          <h3 className="truncate text-sm font-medium text-amber-900">{book.title || "生成中..."}</h3>
          <p className="text-xs text-gray-400">{formatDate(book.createdAt)}</p>
          {remaining !== null && remaining <= 7 && <Badge variant="destructive" className="mt-1 text-xs">あと{remaining}日</Badge>}
          {book.status === "generating" && <Badge variant="secondary" className="mt-1 text-xs">生成中</Badge>}
        </CardContent>
      </Card>
    </Link>
  );
}

import { Progress } from "@/components/ui/progress";
import type { BookDoc, PageDoc } from "@/lib/types";

interface GenerationProgressProps { book: BookDoc; pages: PageDoc[]; }

export function GenerationProgress({ book, pages }: GenerationProgressProps) {
  const total = book.pageCount;
  const completed = pages.filter((p) => p.status === "completed").length;
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="space-y-6">
      <div>
        <div className="flex justify-between text-sm text-amber-800"><span>生成中...</span><span>{completed} / {total} ページ</span></div>
        <Progress value={percent} className="mt-2 h-3" />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: total }, (_, i) => {
          const page = pages.find((p) => p.pageNumber === i);
          return (
            <div key={i} className="aspect-[3/4] rounded-lg border border-amber-200 bg-white flex items-center justify-center overflow-hidden">
              {page?.status === "completed" && page.imageUrl ? (
                <img src={page.imageUrl} alt={`ページ ${i + 1}`} className="h-full w-full object-cover" />
              ) : page?.status === "generating" ? (
                <div className="text-center"><span className="text-2xl animate-pulse">🎨</span><p className="mt-1 text-xs text-gray-400">描いています...</p></div>
              ) : page?.status === "failed" ? (
                <div className="text-center"><span className="text-2xl">❌</span><p className="mt-1 text-xs text-gray-400">失敗</p></div>
              ) : (
                <div className="text-center"><span className="text-2xl text-gray-300">📄</span><p className="mt-1 text-xs text-gray-300">{i + 1}</p></div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

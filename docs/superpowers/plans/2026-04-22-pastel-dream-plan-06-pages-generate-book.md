# Plan Part 6: Generating & Book Pages + Final Verification (Tasks 22-25)

## Task 22: GenerationProgress コンポーネント改修

**Files:**
- Modify: `src/components/generation-progress.tsx`

- [ ] **Step 1: generation-progress.tsx を完全置換**

```tsx
"use client";

import { motion } from "framer-motion";
import { Progress } from "@/components/ui/progress";
import { pulseVariants } from "@/lib/motion";
import type { BookDoc, PageDoc } from "@/lib/types";

interface GenerationProgressProps { book: BookDoc; pages: PageDoc[]; }

export function GenerationProgress({ book, pages }: GenerationProgressProps) {
  const total = book.pageCount;
  const completed = pages.filter((p) => p.status === "completed").length;
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="space-y-6">
      <div>
        <div className="flex justify-between text-sm text-purple-800">
          <span>生成中...</span>
          <span>{completed} / {total} ページ</span>
        </div>
        <Progress value={percent} className="mt-2 h-3" />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: total }, (_, i) => {
          const page = pages.find((p) => p.pageNumber === i);
          return (
            <motion.div
              key={i}
              className="aspect-[3/4] rounded-[20px] border border-[rgba(240,171,252,0.3)] bg-white flex items-center justify-center overflow-hidden"
              variants={page?.status === "generating" ? pulseVariants : undefined}
              animate={page?.status === "generating" ? "pulse" : undefined}
            >
              {page?.status === "completed" && page.imageUrl ? (
                <img src={page.imageUrl} alt={`ページ ${i + 1}`} className="h-full w-full object-cover" />
              ) : page?.status === "generating" ? (
                <div className="text-center">
                  <motion.div
                    className="mx-auto h-8 w-8 rounded-full border-2 border-purple-300 border-t-purple-500"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                  />
                  <p className="mt-2 text-xs text-violet-400">描いています...</p>
                </div>
              ) : page?.status === "failed" ? (
                <div className="text-center">
                  <div className="text-2xl text-red-300">×</div>
                  <p className="mt-1 text-xs text-red-400">失敗</p>
                </div>
              ) : (
                <div className="text-center">
                  <div className="text-2xl text-violet-200">○</div>
                  <p className="mt-1 text-xs text-violet-300">{i + 1}</p>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/generation-progress.tsx
git commit -m "feat: update GenerationProgress with pulse animations and pastel dream colors"
```

---

## Task 23: 生成中ページ改修

**Files:**
- Modify: `src/app/(app)/generating/page.tsx`

- [ ] **Step 1: generating/page.tsx を完全置換**

```tsx
"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { GenerationProgress } from "@/components/generation-progress";
import { FloatingParticles } from "@/components/floating-particles";
import { PageTransition } from "@/components/page-transition";
import { useGenerationProgress } from "@/lib/hooks/use-generation-progress";
import { springBouncy } from "@/lib/motion";

function GeneratingContent() {
  const searchParams = useSearchParams();
  const bookId = searchParams.get("id") ?? "";
  const router = useRouter();
  const { book, pages, loading } = useGenerationProgress(bookId);

  useEffect(() => {
    if (book?.status === "completed") router.push(`/book?id=${bookId}`);
  }, [book?.status, bookId, router]);

  if (!bookId || loading) return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <p className="text-violet-500">読み込み中...</p>
    </div>
  );

  if (!book) return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center">
      <p className="text-violet-500">絵本が見つかりません</p>
      <Link href="/home" className="mt-4 inline-block"><Button variant="outline">本棚に戻る</Button></Link>
    </div>
  );

  if (book.status === "failed") return (
    <PageTransition className="mx-auto max-w-lg px-4 py-16 text-center">
      <Image src="/images/illustrations/generating.webp" alt="失敗" width={120} height={90} className="mx-auto rounded-xl opacity-50" />
      <h2 className="mt-4 text-lg font-bold text-purple-900">絵本の生成に失敗しました</h2>
      <p className="mt-2 text-sm text-violet-500">申し訳ありません。もう一度お試しください。</p>
      <div className="mt-6 flex justify-center gap-3">
        <Link href="/create/theme"><Button>もう一度試す</Button></Link>
        <Link href="/home"><Button variant="outline">本棚に戻る</Button></Link>
      </div>
    </PageTransition>
  );

  return (
    <PageTransition className="relative mx-auto max-w-2xl px-4 py-8">
      <FloatingParticles />
      <div className="relative z-10">
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <motion.div
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              >
                <Image src="/images/illustrations/generating.webp" alt="生成中" width={120} height={90} className="mx-auto rounded-xl" />
              </motion.div>
              <h1 className="mt-3 text-xl font-bold text-purple-900">絵本を作っています</h1>
              <p className="mt-1 text-sm text-violet-500">しばらくお待ちください...</p>
            </div>
            <div className="mt-6"><GenerationProgress book={book} pages={pages} /></div>
          </CardContent>
        </Card>
        <div className="mt-4 text-center">
          <Link href="/home" className="text-sm text-violet-500 hover:underline">本棚に戻る</Link>
        </div>
      </div>
    </PageTransition>
  );
}

export default function GeneratingPage() {
  return (
    <Suspense fallback={<div className="flex min-h-[60vh] items-center justify-center"><p className="text-violet-500">読み込み中...</p></div>}>
      <GeneratingContent />
    </Suspense>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add "src/app/(app)/generating/page.tsx"
git commit -m "feat: update generating page with floating illustration and pastel dream theme"
```

---

## Task 24: BookViewer コンポーネント + 絵本閲覧ページ改修

**Files:**
- Modify: `src/components/book-viewer.tsx`
- Modify: `src/app/(app)/book/page.tsx`

- [ ] **Step 1: book-viewer.tsx を完全置換**

```tsx
"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import type { PageDoc } from "@/lib/types";

interface BookViewerProps { pages: PageDoc[]; title: string; }

const pageFlip = {
  initial: { opacity: 0, x: 50 },
  animate: { opacity: 1, x: 0, transition: { duration: 0.4, ease: [0.4, 0, 0.2, 1] } },
  exit: { opacity: 0, x: -50, transition: { duration: 0.3 } },
};

export function BookViewer({ pages, title }: BookViewerProps) {
  const [currentPage, setCurrentPage] = useState(0);
  const totalPages = pages.length;
  const goNext = () => setCurrentPage((p) => Math.min(p + 1, totalPages - 1));
  const goPrev = () => setCurrentPage((p) => Math.max(p - 1, 0));
  const page = pages[currentPage];
  if (!page) return null;

  return (
    <div>
      {/* Desktop: spread view */}
      <div className="hidden md:block">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentPage}
            variants={pageFlip}
            initial="initial"
            animate="animate"
            exit="exit"
            className="grid grid-cols-2 gap-0 overflow-hidden rounded-[20px] border border-[rgba(240,171,252,0.3)] bg-white shadow-[0_8px_32px_rgba(167,139,250,0.15)]"
          >
            <div className="aspect-[3/4] bg-gradient-to-br from-[#f3e8ff] to-[#e0f2fe]">
              {page.imageUrl ? (
                <img src={page.imageUrl} alt={`${title} - ページ${currentPage + 1}`} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center text-violet-200">
                  <div className="text-6xl">○</div>
                </div>
              )}
            </div>
            <div className="flex flex-col justify-center p-8">
              <p className="text-lg leading-relaxed text-purple-900">{page.text}</p>
              <p className="mt-4 text-sm text-violet-400">{currentPage + 1} / {totalPages}</p>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
      {/* Mobile: single page */}
      <div className="md:hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentPage}
            variants={pageFlip}
            initial="initial"
            animate="animate"
            exit="exit"
            className="overflow-hidden rounded-[20px] border border-[rgba(240,171,252,0.3)] bg-white shadow-[0_8px_32px_rgba(167,139,250,0.15)]"
          >
            <div className="aspect-[3/4] bg-gradient-to-br from-[#f3e8ff] to-[#e0f2fe]">
              {page.imageUrl ? (
                <img src={page.imageUrl} alt={`${title} - ページ${currentPage + 1}`} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center text-violet-200">
                  <div className="text-6xl">○</div>
                </div>
              )}
            </div>
            <div className="p-4">
              <p className="text-base leading-relaxed text-purple-900">{page.text}</p>
              <p className="mt-2 text-sm text-violet-400">{currentPage + 1} / {totalPages}</p>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
      {/* Navigation */}
      <div className="mt-4 flex items-center justify-center gap-4">
        <Button variant="outline" onClick={goPrev} disabled={currentPage === 0} className="px-6">← 前</Button>
        <span className="text-sm text-violet-500">{currentPage + 1} / {totalPages}</span>
        <Button variant="outline" onClick={goNext} disabled={currentPage >= totalPages - 1} className="px-6">次 →</Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: book/page.tsx を完全置換**

```tsx
"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { BookViewer } from "@/components/book-viewer";
import { PageTransition } from "@/components/page-transition";
import { useGenerationProgress } from "@/lib/hooks/use-generation-progress";

function BookContent() {
  const searchParams = useSearchParams();
  const bookId = searchParams.get("id") ?? "";
  const { book, pages, loading } = useGenerationProgress(bookId);

  if (!bookId || loading) return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <p className="text-violet-500">読み込み中...</p>
    </div>
  );

  if (!book) return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center">
      <p className="text-violet-500">絵本が見つかりません</p>
      <Link href="/home" className="mt-4 inline-block"><Button variant="outline">本棚に戻る</Button></Link>
    </div>
  );

  const completedPages = pages.filter((p) => p.status === "completed").sort((a, b) => a.pageNumber - b.pageNumber);

  return (
    <PageTransition className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-center text-2xl font-bold text-purple-900">{book.title}</h1>
      <div className="mt-6"><BookViewer pages={completedPages} title={book.title} /></div>
      <div className="mt-8 flex justify-center gap-4">
        <Link href="/home"><Button variant="outline">本棚に戻る</Button></Link>
        <Link href="/create/theme"><Button>もう一冊作る</Button></Link>
      </div>
    </PageTransition>
  );
}

export default function BookPage() {
  return (
    <Suspense fallback={<div className="flex min-h-[60vh] items-center justify-center"><p className="text-violet-500">読み込み中...</p></div>}>
      <BookContent />
    </Suspense>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/book-viewer.tsx "src/app/(app)/book/page.tsx"
git commit -m "feat: update BookViewer with page-flip animations and book page with pastel dream theme"
```

---

## Task 25: 最終ビルド検証

- [ ] **Step 1: フルビルド**

Run:
```bash
npm run build
```

Expected: ビルド成功（エラーなし）。画像アセットが未配置の場合、ビルド自体は成功し、表示時にaltテキストのみ表示される。

- [ ] **Step 2: 未使用importチェック**

Run:
```bash
npx tsc --noEmit
```

Expected: 型エラーなし

- [ ] **Step 3: 全変更を最終コミット（必要に応じて）**

もしここまでの過程でコミット漏れがあれば:

```bash
git add -A
git commit -m "chore: final cleanup for pastel dream design overhaul"
```

- [ ] **Step 4: 目視確認チェックリスト**

`npm run dev` でローカルサーバーを起動し、以下を確認:

1. ランディングページ: パステルグラデーション背景、浮遊パーティクル、スタガー登場アニメーション
2. ログインページ: 浮遊パーティクル、カード入場アニメーション
3. ホームページ: 本棚のカードがstagger表示、hover時にspring物理
4. テーマ選択: StepIndicatorにアニメーション、テーマカードにhover効果
5. 入力フォーム: パステルカラーのフォーム、角丸ボタン
6. スタイル選択: 3Dアイコン画像（またはaltテキスト）、hover効果
7. 生成中: パルスアニメーション、浮遊イラスト、スピナー
8. 絵本閲覧: ページめくりアニメーション（AnimatePresence）
9. 全ページ: Zen Maru Gothicフォント、紫系カラー統一
10. ボタン: pill型（rounded-full）、グラデーション

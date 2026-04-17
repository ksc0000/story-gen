# EhoNAI Web MVP - Plan 3c: Generation Progress & Book Viewer

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the generation progress screen with real-time updates and the responsive book viewer.

**Architecture:** Generation page uses Firestore real-time listener to monitor book/page status. Book viewer switches between desktop spread view (2-page) and mobile single-page view at the md breakpoint (768px).

**Tech Stack:** Next.js 15, React, Tailwind CSS, shadcn/ui, Firebase Firestore

**Depends on:** Plan 3a (hooks: useGenerationProgress), Plan 3b (creation wizard creates book doc)

---

## File Structure

```
src/
├── components/
│   ├── generation-progress.tsx    # Real-time progress display
│   └── book-viewer.tsx            # Responsive book reader
├── app/(app)/
│   ├── generating/
│   │   └── [bookId]/page.tsx      # ⑦ Generation progress page
│   └── book/
│       └── [bookId]/page.tsx      # ⑧ Book viewer page
```

---

### Task 1: Generation Progress (Screen ⑦)

**Files:**
- Create: `src/components/generation-progress.tsx`
- Create: `src/app/(app)/generating/[bookId]/page.tsx`

- [ ] **Step 1: Create GenerationProgress component**

Create `src/components/generation-progress.tsx`:

```tsx
import { Progress } from "@/components/ui/progress";
import type { BookDoc, PageDoc } from "@/lib/types";

interface GenerationProgressProps {
  book: BookDoc;
  pages: PageDoc[];
}

export function GenerationProgress({ book, pages }: GenerationProgressProps) {
  const total = book.pageCount;
  const completed = pages.filter((p) => p.status === "completed").length;
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Progress bar */}
      <div>
        <div className="flex justify-between text-sm text-amber-800">
          <span>生成中...</span>
          <span>{completed} / {total} ページ</span>
        </div>
        <Progress value={percent} className="mt-2 h-3" />
      </div>

      {/* Page previews */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: total }, (_, i) => {
          const page = pages.find((p) => p.pageNumber === i);
          return (
            <div
              key={i}
              className="aspect-[3/4] rounded-lg border border-amber-200 bg-white flex items-center justify-center overflow-hidden"
            >
              {page?.status === "completed" && page.imageUrl ? (
                <img
                  src={page.imageUrl}
                  alt={`ページ ${i + 1}`}
                  className="h-full w-full object-cover"
                />
              ) : page?.status === "generating" ? (
                <div className="text-center">
                  <span className="text-2xl animate-pulse">🎨</span>
                  <p className="mt-1 text-xs text-gray-400">描いています...</p>
                </div>
              ) : page?.status === "failed" ? (
                <div className="text-center">
                  <span className="text-2xl">❌</span>
                  <p className="mt-1 text-xs text-gray-400">失敗</p>
                </div>
              ) : (
                <div className="text-center">
                  <span className="text-2xl text-gray-300">📄</span>
                  <p className="mt-1 text-xs text-gray-300">{i + 1}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create generation progress page**

Create `src/app/(app)/generating/[bookId]/page.tsx`:

```tsx
"use client";

import { useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { GenerationProgress } from "@/components/generation-progress";
import { useGenerationProgress } from "@/lib/hooks/use-generation-progress";

export default function GeneratingPage() {
  const params = useParams();
  const bookId = params.bookId as string;
  const router = useRouter();
  const { book, pages, loading } = useGenerationProgress(bookId);

  // Auto-navigate on completion
  useEffect(() => {
    if (book?.status === "completed") {
      router.push(`/book/${bookId}`);
    }
  }, [book?.status, bookId, router]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-amber-700">読み込み中...</p>
      </div>
    );
  }

  if (!book) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <p className="text-gray-500">絵本が見つかりません</p>
        <Link href="/home" className="mt-4 inline-block">
          <Button variant="outline">本棚に戻る</Button>
        </Link>
      </div>
    );
  }

  if (book.status === "failed") {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <span className="text-5xl">😢</span>
        <h2 className="mt-4 text-lg font-bold text-amber-900">
          絵本の生成に失敗しました
        </h2>
        <p className="mt-2 text-sm text-gray-500">
          申し訳ありません。もう一度お試しください。
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link href="/create/theme">
            <Button className="bg-amber-600 hover:bg-amber-700 text-white">
              もう一度試す
            </Button>
          </Link>
          <Link href="/home">
            <Button variant="outline">本棚に戻る</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <Card className="border-amber-200">
        <CardContent className="p-6">
          <div className="text-center">
            <span className="text-4xl animate-bounce">📖</span>
            <h1 className="mt-3 text-xl font-bold text-amber-900">
              絵本を作っています
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              しばらくお待ちください...
            </p>
          </div>

          <div className="mt-6">
            <GenerationProgress book={book} pages={pages} />
          </div>
        </CardContent>
      </Card>

      <div className="mt-4 text-center">
        <Link href="/home" className="text-sm text-amber-600 hover:underline">
          本棚に戻る
        </Link>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verify build**

```bash
npm run build
```

Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/components/generation-progress.tsx src/app/(app)/generating/[bookId]/page.tsx
git commit -m "feat: add generation progress page with real-time updates"
```

---

### Task 2: Book Viewer (Screen ⑧)

**Files:**
- Create: `src/components/book-viewer.tsx`
- Create: `src/app/(app)/book/[bookId]/page.tsx`

- [ ] **Step 1: Create BookViewer component**

Create `src/components/book-viewer.tsx`:

```tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { PageDoc } from "@/lib/types";

interface BookViewerProps {
  pages: PageDoc[];
  title: string;
}

export function BookViewer({ pages, title }: BookViewerProps) {
  const [currentPage, setCurrentPage] = useState(0);
  const totalPages = pages.length;

  const goNext = () => setCurrentPage((p) => Math.min(p + 1, totalPages - 1));
  const goPrev = () => setCurrentPage((p) => Math.max(p - 1, 0));

  const page = pages[currentPage];
  const nextPage = currentPage + 1 < totalPages ? pages[currentPage + 1] : null;

  if (!page) return null;

  return (
    <div>
      {/* Desktop: spread view */}
      <div className="hidden md:block">
        <div className="grid grid-cols-2 gap-0 overflow-hidden rounded-xl border border-amber-200 bg-white shadow-lg">
          {/* Left: illustration */}
          <div className="aspect-[3/4] bg-amber-50">
            {page.imageUrl ? (
              <img
                src={page.imageUrl}
                alt={`${title} - ページ${currentPage + 1}`}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-gray-300">
                <span className="text-6xl">🖼️</span>
              </div>
            )}
          </div>
          {/* Right: text */}
          <div className="flex flex-col justify-center p-8">
            <p className="text-lg leading-relaxed text-gray-800">{page.text}</p>
            <p className="mt-4 text-sm text-gray-400">
              {currentPage + 1} / {totalPages}
            </p>
          </div>
        </div>
      </div>

      {/* Mobile: single page */}
      <div className="md:hidden">
        <div className="overflow-hidden rounded-xl border border-amber-200 bg-white shadow-lg">
          <div className="aspect-[3/4] bg-amber-50">
            {page.imageUrl ? (
              <img
                src={page.imageUrl}
                alt={`${title} - ページ${currentPage + 1}`}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-gray-300">
                <span className="text-6xl">🖼️</span>
              </div>
            )}
          </div>
          <div className="p-4">
            <p className="text-base leading-relaxed text-gray-800">{page.text}</p>
            <p className="mt-2 text-sm text-gray-400">
              {currentPage + 1} / {totalPages}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="mt-4 flex items-center justify-center gap-4">
        <Button
          variant="outline"
          onClick={goPrev}
          disabled={currentPage === 0}
          className="px-6"
        >
          ← 前
        </Button>
        <span className="text-sm text-gray-500">
          {currentPage + 1} / {totalPages}
        </span>
        <Button
          variant="outline"
          onClick={goNext}
          disabled={currentPage >= totalPages - 1}
          className="px-6"
        >
          次 →
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create book viewer page**

Create `src/app/(app)/book/[bookId]/page.tsx`:

```tsx
"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { BookViewer } from "@/components/book-viewer";
import { useGenerationProgress } from "@/lib/hooks/use-generation-progress";

export default function BookPage() {
  const params = useParams();
  const bookId = params.bookId as string;
  const { book, pages, loading } = useGenerationProgress(bookId);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-amber-700">読み込み中...</p>
      </div>
    );
  }

  if (!book) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <p className="text-gray-500">絵本が見つかりません</p>
        <Link href="/home" className="mt-4 inline-block">
          <Button variant="outline">本棚に戻る</Button>
        </Link>
      </div>
    );
  }

  const completedPages = pages
    .filter((p) => p.status === "completed")
    .sort((a, b) => a.pageNumber - b.pageNumber);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-center text-2xl font-bold text-amber-900">
        {book.title}
      </h1>

      <div className="mt-6">
        <BookViewer pages={completedPages} title={book.title} />
      </div>

      <div className="mt-8 flex justify-center gap-4">
        <Link href="/home">
          <Button variant="outline">本棚に戻る</Button>
        </Link>
        <Link href="/create/theme">
          <Button className="bg-amber-600 hover:bg-amber-700 text-white">
            もう一冊作る
          </Button>
        </Link>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verify build**

```bash
npm run build
```

Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/components/book-viewer.tsx src/app/(app)/book/[bookId]/page.tsx
git commit -m "feat: add responsive book viewer with desktop spread and mobile single-page views"
```

---

## Self-Review

1. **Spec coverage:** Generation progress (progress bar, page previews, real-time via Firestore) ✓, Auto-navigate on completion ✓, Failed state with retry ✓, Book viewer desktop (見開き2ページ: left image / right text) ✓, Book viewer mobile (1ページ + prev/next) ✓, Breakpoint at md/768px ✓, "本棚に戻る" + "もう一冊作る" buttons ✓.
2. **Placeholder scan:** No TBD/TODO. ✓
3. **Type consistency:** Uses `BookDoc`, `PageDoc` from `@/lib/types`. `useGenerationProgress` hook from Plan 3a. ✓

---

## All Frontend Plans Complete

All 8 screens are now covered:
- ① Landing (Plan 3a, Task 2)
- ② Login (Plan 3a, Task 3)
- ③ Bookshelf (Plan 3b, Task 2)
- ④ Theme Selection (Plan 3b, Task 3)
- ⑤ Basic Input (Plan 3b, Task 4)
- ⑥ Style Selection (Plan 3b, Task 5)
- ⑦ Generation Progress (Plan 3c, Task 1)
- ⑧ Book Viewer (Plan 3c, Task 2)

Proceed to **Plan 4: Operations & Deploy** (already written) for security rules, scheduled functions, and CI/CD.

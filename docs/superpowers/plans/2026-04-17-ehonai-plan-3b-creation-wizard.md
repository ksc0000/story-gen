# EhoNAI Web MVP - Plan 3b: Creation Wizard

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the 3-step creation wizard (theme → input → style) with step indicator, bookshelf home page, and book creation flow.

**Architecture:** Wizard state flows via URL search params between pages. Book document is created in Firestore on the final step, triggering the Cloud Function.

**Tech Stack:** Next.js 15, React, Tailwind CSS, shadcn/ui, Firebase Firestore

**Depends on:** Plan 3a (hooks, layout, auth)

---

## File Structure

```
src/
├── components/
│   ├── step-indicator.tsx
│   ├── book-card.tsx
│   ├── theme-card.tsx
│   └── style-picker.tsx
├── app/(app)/
│   ├── home/page.tsx            # ③ Bookshelf (rewrite)
│   └── create/
│       ├── theme/page.tsx       # ④ Theme selection
│       ├── input/page.tsx       # ⑤ Basic input
│       └── style/page.tsx       # ⑥ Style selection
```

---

### Task 1: StepIndicator Component

**Files:**
- Create: `src/components/step-indicator.tsx`

- [ ] **Step 1: Create step indicator**

Create `src/components/step-indicator.tsx`:

```tsx
interface StepIndicatorProps {
  currentStep: 1 | 2 | 3;
}

const steps = ["テーマ", "入力", "スタイル"];

export function StepIndicator({ currentStep }: StepIndicatorProps) {
  return (
    <div className="flex items-center justify-center gap-2">
      {steps.map((label, i) => {
        const stepNum = i + 1;
        const isActive = stepNum === currentStep;
        const isDone = stepNum < currentStep;

        return (
          <div key={label} className="flex items-center gap-2">
            {i > 0 && (
              <div
                className={`h-0.5 w-8 ${isDone ? "bg-amber-500" : "bg-gray-200"}`}
              />
            )}
            <div className="flex flex-col items-center">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
                  isActive
                    ? "bg-amber-500 text-white"
                    : isDone
                      ? "bg-amber-200 text-amber-800"
                      : "bg-gray-200 text-gray-400"
                }`}
              >
                {stepNum}
              </div>
              <span
                className={`mt-1 text-xs ${isActive ? "text-amber-700 font-medium" : "text-gray-400"}`}
              >
                {label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```

Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/components/step-indicator.tsx
git commit -m "feat: add step indicator component for creation wizard"
```

---

### Task 2: BookCard & Bookshelf Home Page (Screen ③)

**Files:**
- Create: `src/components/book-card.tsx`
- Modify: `src/app/(app)/home/page.tsx`

- [ ] **Step 1: Create BookCard component**

Create `src/components/book-card.tsx`:

```tsx
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { BookDoc } from "@/lib/types";
import { Timestamp } from "firebase/firestore";

interface BookCardProps {
  book: BookDoc & { id: string };
}

function getRemainingDays(expiresAt: Timestamp | null): number | null {
  if (!expiresAt) return null;
  const now = Date.now();
  const expires = expiresAt.toMillis();
  const days = Math.ceil((expires - now) / (1000 * 60 * 60 * 24));
  return Math.max(0, days);
}

function formatDate(ts: Timestamp): string {
  const d = ts.toDate();
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
}

export function BookCard({ book }: BookCardProps) {
  const remaining = getRemainingDays(book.expiresAt);
  const href =
    book.status === "generating"
      ? `/generating/${book.id}`
      : `/book/${book.id}`;

  return (
    <Link href={href}>
      <Card className="overflow-hidden border-amber-200 transition hover:shadow-md">
        <div className="aspect-[3/4] bg-amber-100 flex items-center justify-center">
          {book.status === "completed" ? (
            <span className="text-6xl">📖</span>
          ) : book.status === "generating" ? (
            <span className="text-4xl animate-pulse">⏳</span>
          ) : (
            <span className="text-4xl">❌</span>
          )}
        </div>
        <CardContent className="p-3">
          <h3 className="truncate text-sm font-medium text-amber-900">
            {book.title || "生成中..."}
          </h3>
          <p className="text-xs text-gray-400">{formatDate(book.createdAt)}</p>
          {remaining !== null && remaining <= 7 && (
            <Badge variant="destructive" className="mt-1 text-xs">
              あと{remaining}日
            </Badge>
          )}
          {book.status === "generating" && (
            <Badge variant="secondary" className="mt-1 text-xs">
              生成中
            </Badge>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
```

- [ ] **Step 2: Rewrite home page**

Replace `src/app/(app)/home/page.tsx`:

```tsx
"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BookCard } from "@/components/book-card";
import { useAuth } from "@/lib/hooks/use-auth";
import { useBooks } from "@/lib/hooks/use-books";
import { useUserProfile } from "@/lib/hooks/use-user-profile";

const FREE_MONTHLY_LIMIT = 3;

export default function HomePage() {
  const { user } = useAuth();
  const { books, loading } = useBooks(user?.uid);
  const { profile } = useUserProfile(user?.uid);

  const remaining = FREE_MONTHLY_LIMIT - (profile?.monthlyGenerationCount ?? 0);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-amber-900">あなたの本棚</h1>
        <Badge variant="outline" className="text-amber-700 border-amber-300">
          今月あと{Math.max(0, remaining)}冊作れます
        </Badge>
      </div>

      <div className="mt-6">
        <Link href="/create/theme">
          <Button className="bg-amber-600 hover:bg-amber-700 text-white">
            新しい絵本を作る
          </Button>
        </Link>
      </div>

      {loading ? (
        <p className="mt-8 text-center text-gray-400">読み込み中...</p>
      ) : books.length === 0 ? (
        <div className="mt-16 text-center">
          <span className="text-6xl">📚</span>
          <p className="mt-4 text-gray-500">
            まだ絵本がありません。最初の一冊を作りましょう！
          </p>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {books.map((book) => (
            <BookCard key={book.id} book={book} />
          ))}
        </div>
      )}
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
git add src/components/book-card.tsx src/app/(app)/home/page.tsx
git commit -m "feat: add bookshelf home page with BookCard and quota display"
```

---

### Task 3: ThemeCard & Theme Selection (Screen ④)

**Files:**
- Create: `src/components/theme-card.tsx`
- Create: `src/app/(app)/create/theme/page.tsx`

- [ ] **Step 1: Create ThemeCard component**

Create `src/components/theme-card.tsx`:

```tsx
import { Card, CardContent } from "@/components/ui/card";
import type { TemplateDoc } from "@/lib/types";

interface ThemeCardProps {
  template: TemplateDoc & { id: string };
  selected: boolean;
  onSelect: () => void;
}

export function ThemeCard({ template, selected, onSelect }: ThemeCardProps) {
  return (
    <Card
      onClick={onSelect}
      className={`cursor-pointer transition hover:shadow-md ${
        selected ? "ring-2 ring-amber-500 border-amber-500" : "border-amber-200"
      }`}
    >
      <CardContent className="flex flex-col items-center p-4 text-center">
        <span className="text-4xl">{template.icon}</span>
        <h3 className="mt-2 text-sm font-semibold text-amber-900">
          {template.name}
        </h3>
        <p className="mt-1 text-xs text-gray-500">{template.description}</p>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Create theme selection page**

Create `src/app/(app)/create/theme/page.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { StepIndicator } from "@/components/step-indicator";
import { ThemeCard } from "@/components/theme-card";
import { useTemplates } from "@/lib/hooks/use-templates";

export default function ThemeSelectionPage() {
  const { templates, loading } = useTemplates();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const router = useRouter();

  const handleNext = () => {
    if (selectedId) {
      router.push(`/create/input?theme=${selectedId}`);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <StepIndicator currentStep={1} />

      <h1 className="mt-6 text-center text-xl font-bold text-amber-900">
        テーマを選んでね
      </h1>

      {loading ? (
        <p className="mt-8 text-center text-gray-400">読み込み中...</p>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {templates.map((t) => (
            <ThemeCard
              key={t.id}
              template={t}
              selected={selectedId === t.id}
              onSelect={() => setSelectedId(t.id)}
            />
          ))}
        </div>
      )}

      <div className="mt-8 flex justify-center">
        <Button
          onClick={handleNext}
          disabled={!selectedId}
          className="bg-amber-600 hover:bg-amber-700 text-white px-8"
        >
          次へ
        </Button>
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
git add src/components/theme-card.tsx src/app/(app)/create/theme/page.tsx
git commit -m "feat: add theme selection page with ThemeCard grid"
```

---

### Task 4: Basic Input Page (Screen ⑤)

**Files:**
- Create: `src/app/(app)/create/input/page.tsx`

- [ ] **Step 1: Create input page**

Create `src/app/(app)/create/input/page.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { StepIndicator } from "@/components/step-indicator";

const PAGE_COUNT_OPTIONS = [
  { value: 4, label: "短い（4ページ）" },
  { value: 8, label: "ふつう（8ページ）" },
  { value: 12, label: "長い（12ページ）" },
] as const;

export default function InputPage() {
  const searchParams = useSearchParams();
  const theme = searchParams.get("theme") ?? "";
  const router = useRouter();

  const [childName, setChildName] = useState("");
  const [childAge, setChildAge] = useState("");
  const [favorites, setFavorites] = useState("");
  const [pageCount, setPageCount] = useState<number>(8);
  const [lessonToTeach, setLessonToTeach] = useState("");
  const [memoryToRecreate, setMemoryToRecreate] = useState("");
  const [showOptional, setShowOptional] = useState(false);

  const handleNext = () => {
    const params = new URLSearchParams();
    params.set("theme", theme);
    params.set("childName", childName);
    params.set("pageCount", String(pageCount));
    if (childAge) params.set("childAge", childAge);
    if (favorites) params.set("favorites", favorites);
    if (lessonToTeach) params.set("lessonToTeach", lessonToTeach);
    if (memoryToRecreate) params.set("memoryToRecreate", memoryToRecreate);
    router.push(`/create/style?${params.toString()}`);
  };

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <StepIndicator currentStep={2} />

      <h1 className="mt-6 text-center text-xl font-bold text-amber-900">
        おしえてね
      </h1>

      <Card className="mt-6 border-amber-200">
        <CardContent className="space-y-4 p-6">
          {/* Required */}
          <div>
            <Label htmlFor="childName" className="text-amber-800">
              子どもの名前 <span className="text-red-500">*</span>
            </Label>
            <Input
              id="childName"
              value={childName}
              onChange={(e) => setChildName(e.target.value)}
              placeholder="例：ゆうた"
              className="mt-1"
              maxLength={50}
            />
          </div>

          {/* Toggle optional */}
          <button
            type="button"
            onClick={() => setShowOptional(!showOptional)}
            className="text-sm text-amber-600 hover:underline"
          >
            {showOptional ? "▲ シンプルに戻す" : "▼ もっとカスタマイズ"}
          </button>

          {showOptional && (
            <div className="space-y-4 border-t border-amber-100 pt-4">
              <div>
                <Label htmlFor="childAge" className="text-amber-800">年齢</Label>
                <Input
                  id="childAge"
                  type="number"
                  min={0}
                  max={12}
                  value={childAge}
                  onChange={(e) => setChildAge(e.target.value)}
                  placeholder="例：3"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="favorites" className="text-amber-800">好きなもの</Label>
                <Input
                  id="favorites"
                  value={favorites}
                  onChange={(e) => setFavorites(e.target.value)}
                  placeholder="例：きょうりゅう、でんしゃ"
                  className="mt-1"
                  maxLength={200}
                />
              </div>

              <div>
                <Label className="text-amber-800">ページ数</Label>
                <div className="mt-1 flex gap-2">
                  {PAGE_COUNT_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setPageCount(opt.value)}
                      className={`flex-1 rounded-md border px-2 py-2 text-xs transition ${
                        pageCount === opt.value
                          ? "border-amber-500 bg-amber-50 text-amber-800 font-medium"
                          : "border-gray-200 text-gray-500 hover:border-amber-300"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <Label htmlFor="lesson" className="text-amber-800">教えたいこと</Label>
                <Input
                  id="lesson"
                  value={lessonToTeach}
                  onChange={(e) => setLessonToTeach(e.target.value)}
                  placeholder="例：はみがきをがんばる"
                  className="mt-1"
                  maxLength={200}
                />
              </div>

              <div>
                <Label htmlFor="memory" className="text-amber-800">再現したい思い出</Label>
                <textarea
                  id="memory"
                  value={memoryToRecreate}
                  onChange={(e) => setMemoryToRecreate(e.target.value)}
                  placeholder="例：おばあちゃんの家に遊びに行った"
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  rows={3}
                  maxLength={200}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="mt-8 flex justify-center">
        <Button
          onClick={handleNext}
          disabled={!childName.trim()}
          className="bg-amber-600 hover:bg-amber-700 text-white px-8"
        >
          次へ
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```

Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/app/(app)/create/input/page.tsx
git commit -m "feat: add basic input page with required and optional fields"
```

---

### Task 5: StylePicker & Style Selection (Screen ⑥)

**Files:**
- Create: `src/components/style-picker.tsx`
- Create: `src/app/(app)/create/style/page.tsx`

- [ ] **Step 1: Create StylePicker component**

Create `src/components/style-picker.tsx`:

```tsx
import { Card, CardContent } from "@/components/ui/card";
import type { IllustrationStyle } from "@/lib/types";

interface StyleOption {
  id: IllustrationStyle;
  name: string;
  description: string;
  examples: string;
  colors: string[];
}

const styles: StyleOption[] = [
  {
    id: "watercolor",
    name: "水彩画風",
    description: "柔らかく温かみのあるタッチ",
    examples: "いわさきちひろ、ぐりとぐら風",
    colors: ["bg-blue-200", "bg-pink-200", "bg-yellow-100", "bg-green-200"],
  },
  {
    id: "flat",
    name: "フラットイラスト風",
    description: "明るくシンプルなタッチ",
    examples: "ミッフィー、しろくまちゃん風",
    colors: ["bg-red-400", "bg-yellow-400", "bg-blue-400", "bg-green-400"],
  },
  {
    id: "crayon",
    name: "クレヨン/パステル風",
    description: "手描き感のあるカラフルなタッチ",
    examples: "はらぺこあおむし、ノンタン風",
    colors: ["bg-orange-300", "bg-purple-300", "bg-lime-300", "bg-rose-300"],
  },
];

interface StylePickerProps {
  selected: IllustrationStyle | null;
  onSelect: (style: IllustrationStyle) => void;
}

export function StylePicker({ selected, onSelect }: StylePickerProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {styles.map((s) => (
        <Card
          key={s.id}
          onClick={() => onSelect(s.id)}
          className={`cursor-pointer transition hover:shadow-md ${
            selected === s.id
              ? "ring-2 ring-amber-500 border-amber-500"
              : "border-amber-200"
          }`}
        >
          <CardContent className="p-4 text-center">
            <div className="flex justify-center gap-1">
              {s.colors.map((c, i) => (
                <div key={i} className={`h-6 w-6 rounded-full ${c}`} />
              ))}
            </div>
            <h3 className="mt-3 text-sm font-semibold text-amber-900">{s.name}</h3>
            <p className="mt-1 text-xs text-gray-500">{s.description}</p>
            <p className="mt-1 text-xs text-gray-400">{s.examples}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Create style selection page with book creation**

Create `src/app/(app)/create/style/page.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { collection, addDoc, serverTimestamp, Timestamp } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { StepIndicator } from "@/components/step-indicator";
import { StylePicker } from "@/components/style-picker";
import { useAuth } from "@/lib/hooks/use-auth";
import { db } from "@/lib/firebase";
import type { IllustrationStyle, PageCount } from "@/lib/types";

export default function StyleSelectionPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const [selected, setSelected] = useState<IllustrationStyle | null>(null);
  const [creating, setCreating] = useState(false);

  const theme = searchParams.get("theme") ?? "";
  const childName = searchParams.get("childName") ?? "";
  const pageCount = Number(searchParams.get("pageCount") ?? "8") as PageCount;
  const childAge = searchParams.get("childAge");
  const favorites = searchParams.get("favorites");
  const lessonToTeach = searchParams.get("lessonToTeach");
  const memoryToRecreate = searchParams.get("memoryToRecreate");

  const handleCreate = async () => {
    if (!selected || !user) return;
    setCreating(true);

    try {
      const now = Timestamp.now();
      const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
      const expiresAt = Timestamp.fromMillis(now.toMillis() + thirtyDaysMs);

      const bookRef = await addDoc(collection(db, "books"), {
        userId: user.uid,
        title: "",
        theme,
        style: selected,
        pageCount,
        status: "generating",
        progress: 0,
        input: {
          childName,
          ...(childAge ? { childAge: Number(childAge) } : {}),
          ...(favorites ? { favorites } : {}),
          ...(lessonToTeach ? { lessonToTeach } : {}),
          ...(memoryToRecreate ? { memoryToRecreate } : {}),
        },
        createdAt: serverTimestamp(),
        expiresAt,
      });

      router.push(`/generating/${bookRef.id}`);
    } catch (err) {
      console.error("Failed to create book:", err);
      setCreating(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <StepIndicator currentStep={3} />

      <h1 className="mt-6 text-center text-xl font-bold text-amber-900">
        イラストのスタイルを選んでね
      </h1>

      <div className="mt-6">
        <StylePicker selected={selected} onSelect={setSelected} />
      </div>

      <div className="mt-8 flex justify-center">
        <Button
          onClick={handleCreate}
          disabled={!selected || creating}
          className="bg-amber-600 hover:bg-amber-700 text-white px-8 text-lg py-6"
        >
          {creating ? "絵本を作っています..." : "絵本を作る！"}
        </Button>
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
git add src/components/style-picker.tsx src/app/(app)/create/style/page.tsx
git commit -m "feat: add style selection page with book creation trigger"
```

---

## Self-Review

1. **Spec coverage:** StepIndicator (1/3, 2/3, 3/3) ✓, BookCard (thumbnail placeholder, title, date, remaining days badge) ✓, Home page (bookshelf grid, quota display, empty state, "新しい絵本を作る") ✓, Theme selection (8 template cards, selectable) ✓, Input page (required childName, collapsible optional fields, pageCount radio) ✓, Style selection (3 styles: watercolor/flat/crayon) ✓, Book creation (Firestore addDoc with all fields, navigate to generating) ✓, expiresAt (30 days for free) ✓.
2. **Placeholder scan:** No TBD/TODO. BookCard uses emoji placeholder for cover image (actual image thumbnails will come from generated pages). ✓
3. **Type consistency:** Uses `IllustrationStyle`, `PageCount`, `BookDoc`, `TemplateDoc` from `@/lib/types`. URL search params pass theme/childName/pageCount/etc. between pages. ✓

---

## Next Plan

Proceed to **Plan 3c: Generation Progress & Book Viewer** (screens ⑦ and ⑧).

# Plan Part 5: Home & Create Wizard Pages (Tasks 16-21)

## Task 16: BookCard コンポーネント改修

**Files:**
- Modify: `src/components/book-card.tsx`

- [ ] **Step 1: book-card.tsx を完全置換**

```tsx
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
```

- [ ] **Step 2: Commit**

```bash
git add src/components/book-card.tsx
git commit -m "feat: update BookCard with AnimatedCard and pastel dream colors"
```

---

## Task 17: ThemeCard コンポーネント改修

**Files:**
- Modify: `src/components/theme-card.tsx`

- [ ] **Step 1: theme-card.tsx を完全置換**

```tsx
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { AnimatedCard } from "@/components/animated-card";
import type { TemplateDoc } from "@/lib/types";

const ICON_MAP: Record<string, string> = {
  "🎂": "/images/icons/cake.webp",
  "🌙": "/images/icons/moon.webp",
  "⛰️": "/images/icons/mountain.webp",
  "🌸": "/images/icons/sakura.webp",
  "🐾": "/images/icons/paw.webp",
  "🍳": "/images/icons/pan.webp",
  "⭐": "/images/icons/star.webp",
  "🏠": "/images/icons/house.webp",
};

interface ThemeCardProps { template: TemplateDoc & { id: string }; selected: boolean; onSelect: () => void; }

export function ThemeCard({ template, selected, onSelect }: ThemeCardProps) {
  const iconSrc = ICON_MAP[template.icon];
  return (
    <AnimatedCard onClick={onSelect}>
      <Card className={`cursor-pointer transition ${selected ? "ring-2 ring-purple-500 border-purple-400" : ""}`}>
        <CardContent className="flex flex-col items-center p-4 text-center">
          {iconSrc ? (
            <Image src={iconSrc} alt={template.name} width={48} height={48} className="rounded-lg" />
          ) : (
            <span className="text-4xl">{template.icon}</span>
          )}
          <h3 className="mt-2 text-sm font-semibold text-purple-900">{template.name}</h3>
          <p className="mt-1 text-xs text-violet-500">{template.description}</p>
        </CardContent>
      </Card>
    </AnimatedCard>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/theme-card.tsx
git commit -m "feat: update ThemeCard with AnimatedCard and 3D icon images"
```

---

## Task 18: StylePicker コンポーネント改修

**Files:**
- Modify: `src/components/style-picker.tsx`

- [ ] **Step 1: style-picker.tsx を完全置換**

```tsx
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { AnimatedCard } from "@/components/animated-card";
import type { IllustrationStyle } from "@/lib/types";

const styles = [
  {
    id: "watercolor" as IllustrationStyle,
    name: "水彩画風",
    description: "柔らかく温かみのあるタッチ",
    examples: "いわさきちひろ、ぐりとぐら風",
    icon: "/images/icons/watercolor-brush.webp",
  },
  {
    id: "flat" as IllustrationStyle,
    name: "フラットイラスト風",
    description: "明るくシンプルなタッチ",
    examples: "ミッフィー、しろくまちゃん風",
    icon: "/images/icons/digital-pen.webp",
  },
  {
    id: "crayon" as IllustrationStyle,
    name: "クレヨン/パステル風",
    description: "手描き感のあるカラフルなタッチ",
    examples: "はらぺこあおむし、ノンタン風",
    icon: "/images/icons/crayon.webp",
  },
];

interface StylePickerProps { selected: IllustrationStyle | null; onSelect: (style: IllustrationStyle) => void; }

export function StylePicker({ selected, onSelect }: StylePickerProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {styles.map((s) => (
        <AnimatedCard key={s.id} onClick={() => onSelect(s.id)}>
          <Card className={`cursor-pointer transition ${selected === s.id ? "ring-2 ring-purple-500 border-purple-400" : ""}`}>
            <CardContent className="p-4 text-center">
              <div className="flex justify-center">
                <Image src={s.icon} alt={s.name} width={48} height={48} className="rounded-lg" />
              </div>
              <h3 className="mt-3 text-sm font-semibold text-purple-900">{s.name}</h3>
              <p className="mt-1 text-xs text-violet-500">{s.description}</p>
              <p className="mt-1 text-xs text-violet-400">{s.examples}</p>
            </CardContent>
          </Card>
        </AnimatedCard>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/style-picker.tsx
git commit -m "feat: update StylePicker with AnimatedCard and 3D icon images"
```

---

## Task 19: StepIndicator コンポーネント改修

**Files:**
- Modify: `src/components/step-indicator.tsx`

- [ ] **Step 1: step-indicator.tsx を完全置換**

```tsx
"use client";

import { motion } from "framer-motion";
import { springDefault } from "@/lib/motion";

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
              <div className="relative h-0.5 w-8 bg-violet-100 overflow-hidden rounded-full">
                {isDone && (
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-purple-400 to-violet-400"
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={springDefault}
                    style={{ transformOrigin: "left" }}
                  />
                )}
              </div>
            )}
            <div className="flex flex-col items-center">
              <motion.div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
                  isActive
                    ? "bg-gradient-to-r from-purple-400 to-violet-400 text-white shadow-[0_2px_8px_rgba(167,139,250,0.4)]"
                    : isDone
                    ? "bg-violet-100 text-violet-600"
                    : "bg-gray-100 text-gray-400"
                }`}
                animate={isActive ? { scale: [1, 1.1, 1] } : {}}
                transition={isActive ? { duration: 0.5, ease: "easeOut" } : {}}
              >
                {stepNum}
              </motion.div>
              <span className={`mt-1 text-xs ${isActive ? "text-purple-700 font-medium" : "text-violet-400"}`}>
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

- [ ] **Step 2: Commit**

```bash
git add src/components/step-indicator.tsx
git commit -m "feat: update StepIndicator with gradient steps and spring animations"
```

---

## Task 20: ホームページ改修

**Files:**
- Modify: `src/app/(app)/home/page.tsx`

- [ ] **Step 1: home/page.tsx を完全置換**

```tsx
"use client";

import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BookCard } from "@/components/book-card";
import { FloatingParticles } from "@/components/floating-particles";
import { PageTransition } from "@/components/page-transition";
import { StaggerContainer } from "@/components/stagger-container";
import { StaggerItem } from "@/components/stagger-item";
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
    <PageTransition className="relative mx-auto max-w-4xl px-4 py-8">
      <FloatingParticles />
      <div className="relative z-10">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-purple-900">あなたの本棚</h1>
          <Badge variant="outline">今月あと{Math.max(0, remaining)}冊作れます</Badge>
        </div>
        <div className="mt-6">
          <Link href="/create/theme">
            <Button size="lg" className="text-base px-6">新しい絵本を作る</Button>
          </Link>
        </div>
        {loading ? (
          <p className="mt-8 text-center text-violet-400">読み込み中...</p>
        ) : books.length === 0 ? (
          <div className="mt-16 text-center">
            <Image
              src="/images/illustrations/empty-shelf.webp"
              alt="空の本棚"
              width={200}
              height={150}
              className="mx-auto rounded-xl"
            />
            <p className="mt-4 text-violet-500">まだ絵本がありません。最初の一冊を作りましょう！</p>
          </div>
        ) : (
          <StaggerContainer className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            {books.map((book) => (
              <StaggerItem key={book.id}>
                <BookCard book={book} />
              </StaggerItem>
            ))}
          </StaggerContainer>
        )}
      </div>
    </PageTransition>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add "src/app/(app)/home/page.tsx"
git commit -m "feat: update home page with pastel dream theme, stagger animations, and illustration"
```

---

## Task 21: 作成ウィザード3ページ改修

**Files:**
- Modify: `src/app/(app)/create/theme/page.tsx`
- Modify: `src/app/(app)/create/input/page.tsx`
- Modify: `src/app/(app)/create/style/page.tsx`

- [ ] **Step 1: theme/page.tsx を完全置換**

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { StepIndicator } from "@/components/step-indicator";
import { ThemeCard } from "@/components/theme-card";
import { PageTransition } from "@/components/page-transition";
import { StaggerContainer } from "@/components/stagger-container";
import { StaggerItem } from "@/components/stagger-item";
import { useTemplates } from "@/lib/hooks/use-templates";

export default function ThemeSelectionPage() {
  const { templates, loading } = useTemplates();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const router = useRouter();

  return (
    <PageTransition className="mx-auto max-w-2xl px-4 py-8">
      <StepIndicator currentStep={1} />
      <h1 className="mt-6 text-center text-xl font-bold text-purple-900">テーマを選んでね</h1>
      {loading ? (
        <p className="mt-8 text-center text-violet-400">読み込み中...</p>
      ) : (
        <StaggerContainer className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {templates.map((t) => (
            <StaggerItem key={t.id}>
              <ThemeCard template={t} selected={selectedId === t.id} onSelect={() => setSelectedId(t.id)} />
            </StaggerItem>
          ))}
        </StaggerContainer>
      )}
      <div className="mt-8 flex justify-center">
        <Button onClick={() => selectedId && router.push(`/create/input?theme=${selectedId}`)} disabled={!selectedId} className="px-8">
          次へ
        </Button>
      </div>
    </PageTransition>
  );
}
```

- [ ] **Step 2: input/page.tsx を完全置換**

```tsx
"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { StepIndicator } from "@/components/step-indicator";
import { PageTransition } from "@/components/page-transition";

const PAGE_COUNT_OPTIONS = [
  { value: 4, label: "短い（4ページ）" },
  { value: 8, label: "ふつう（8ページ）" },
  { value: 12, label: "長い（12ページ）" },
] as const;

function InputPageContent() {
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
    <PageTransition className="mx-auto max-w-lg px-4 py-8">
      <StepIndicator currentStep={2} />
      <h1 className="mt-6 text-center text-xl font-bold text-purple-900">おしえてね</h1>
      <Card className="mt-6">
        <CardContent className="space-y-4 p-6">
          <div>
            <Label htmlFor="childName" className="text-purple-800">子どもの名前 <span className="text-red-500">*</span></Label>
            <Input id="childName" value={childName} onChange={(e) => setChildName(e.target.value)} placeholder="例：ゆうた" className="mt-1" maxLength={50} />
          </div>
          <button type="button" onClick={() => setShowOptional(!showOptional)} className="text-sm text-violet-600 hover:underline">
            {showOptional ? "▲ シンプルに戻す" : "▼ もっとカスタマイズ"}
          </button>
          {showOptional && (
            <div className="space-y-4 border-t border-[rgba(240,171,252,0.3)] pt-4">
              <div>
                <Label htmlFor="childAge" className="text-purple-800">年齢</Label>
                <Input id="childAge" type="number" min={0} max={12} value={childAge} onChange={(e) => setChildAge(e.target.value)} placeholder="例：3" className="mt-1" />
              </div>
              <div>
                <Label htmlFor="favorites" className="text-purple-800">好きなもの</Label>
                <Input id="favorites" value={favorites} onChange={(e) => setFavorites(e.target.value)} placeholder="例：きょうりゅう、でんしゃ" className="mt-1" maxLength={200} />
              </div>
              <div>
                <Label className="text-purple-800">ページ数</Label>
                <div className="mt-1 flex gap-2">
                  {PAGE_COUNT_OPTIONS.map((opt) => (
                    <button key={opt.value} type="button" onClick={() => setPageCount(opt.value)}
                      className={`flex-1 rounded-full border px-2 py-2 text-xs transition ${pageCount === opt.value ? "border-purple-400 bg-[rgba(167,139,250,0.1)] text-purple-700 font-medium" : "border-[rgba(240,171,252,0.3)] text-violet-400 hover:border-purple-300"}`}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Label htmlFor="lesson" className="text-purple-800">教えたいこと</Label>
                <Input id="lesson" value={lessonToTeach} onChange={(e) => setLessonToTeach(e.target.value)} placeholder="例：はみがきをがんばる" className="mt-1" maxLength={200} />
              </div>
              <div>
                <Label htmlFor="memory" className="text-purple-800">再現したい思い出</Label>
                <textarea id="memory" value={memoryToRecreate} onChange={(e) => setMemoryToRecreate(e.target.value)} placeholder="例：おばあちゃんの家に遊びに行った" className="mt-1 w-full rounded-[20px] border border-[rgba(240,171,252,0.3)] bg-background px-3 py-2 text-sm focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400/50" rows={3} maxLength={200} />
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      <div className="mt-8 flex justify-center">
        <Button onClick={handleNext} disabled={!childName.trim()} className="px-8">次へ</Button>
      </div>
    </PageTransition>
  );
}

export default function InputPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-violet-400">読み込み中...</div>}>
      <InputPageContent />
    </Suspense>
  );
}
```

- [ ] **Step 3: style/page.tsx を完全置換**

```tsx
"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { collection, addDoc, serverTimestamp, Timestamp } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { StepIndicator } from "@/components/step-indicator";
import { StylePicker } from "@/components/style-picker";
import { PageTransition } from "@/components/page-transition";
import { useAuth } from "@/lib/hooks/use-auth";
import { db } from "@/lib/firebase";
import type { IllustrationStyle, PageCount } from "@/lib/types";

function StyleSelectionPageContent() {
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
      const expiresAt = Timestamp.fromMillis(now.toMillis() + 30 * 24 * 60 * 60 * 1000);
      const bookRef = await addDoc(collection(db, "books"), {
        userId: user.uid, title: "", theme, style: selected, pageCount, status: "generating", progress: 0,
        input: {
          childName,
          ...(childAge ? { childAge: Number(childAge) } : {}),
          ...(favorites ? { favorites } : {}),
          ...(lessonToTeach ? { lessonToTeach } : {}),
          ...(memoryToRecreate ? { memoryToRecreate } : {}),
        },
        createdAt: serverTimestamp(), expiresAt,
      });
      router.push(`/generating?id=${bookRef.id}`);
    } catch (err) { console.error("Failed to create book:", err); setCreating(false); }
  };

  return (
    <PageTransition className="mx-auto max-w-2xl px-4 py-8">
      <StepIndicator currentStep={3} />
      <h1 className="mt-6 text-center text-xl font-bold text-purple-900">イラストのスタイルを選んでね</h1>
      <div className="mt-6"><StylePicker selected={selected} onSelect={setSelected} /></div>
      <div className="mt-8 flex justify-center">
        <Button onClick={handleCreate} disabled={!selected || creating} size="lg" className="px-8 text-lg py-6">
          {creating ? "絵本を作っています..." : "絵本を作る！"}
        </Button>
      </div>
    </PageTransition>
  );
}

export default function StyleSelectionPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-violet-400">読み込み中...</div>}>
      <StyleSelectionPageContent />
    </Suspense>
  );
}
```

- [ ] **Step 4: ビルド確認**

Run: `npm run build`
Expected: ビルド成功

- [ ] **Step 5: Commit**

```bash
git add "src/app/(app)/create/theme/page.tsx" "src/app/(app)/create/input/page.tsx" "src/app/(app)/create/style/page.tsx"
git commit -m "feat: update create wizard pages with pastel dream theme and page transitions"
```

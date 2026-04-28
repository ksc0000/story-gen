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
import { isDemoMode, saveDemoBook, loadDemoBook, updateDemoBook, type DemoBook } from "@/lib/demo";
import type { IllustrationStyle, PageCount } from "@/lib/types";

function StyleSelectionPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const [selected, setSelected] = useState<IllustrationStyle | null>("soft_watercolor");
  const [creating, setCreating] = useState(false);

  const theme = searchParams.get("theme") ?? "";
  const childName = searchParams.get("childName") ?? "";
  const pageCount = Number(searchParams.get("pageCount") ?? "8") as PageCount;
  const childAge = searchParams.get("childAge");
  const favorites = searchParams.get("favorites");
  const lessonToTeach = searchParams.get("lessonToTeach");
  const memoryToRecreate = searchParams.get("memoryToRecreate");
  const characterLook = searchParams.get("characterLook");
  const signatureItem = searchParams.get("signatureItem");
  const colorMood = searchParams.get("colorMood");

  const simulateDemoGeneration = async (bookId: string) => {
    const titles: Record<string, string> = {
      animals: `${childName}くんのどうぶつのおはなし`,
      adventure: `${childName}くんのわくわく冒険`,
      fantasy: `${childName}くんのまほうの世界`,
      bedtime: `${childName}くんのおやすみ前のおはなし`,
      "emotional-growth": `${childName}くんのこころを育てるおはなし`,
      "daily-habits": `${childName}くんの生活習慣をまなぶおはなし`,
      educational: `${childName}くんのたのしく学ぶおはなし`,
      food: `${childName}くんのおいしいおはなし`,
      seasonal: `${childName}くんの季節とイベント`,
      "vehicles-robots": `${childName}くんののりもの・ロボット`,
    };

    const demoPages = [
      { text: "むかしむかし、あるところに。", imagePrompt: "A magical storybook opening" },
      { text: `${childName}がいました。`, imagePrompt: "A happy child" },
      { text: "きょうはとくべつな日。", imagePrompt: "A special moment" },
      { text: "すべてが新しくはじまります。", imagePrompt: "A new beginning" },
    ];

    for (let i = 0; i < demoPages.length; i++) {
      const page = {
        id: `page-${i}`,
        pageNumber: i,
        text: demoPages[i].text,
        imageUrl: `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300'%3E%3Crect fill='%23f3e8ff' width='400' height='300'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-size='24' fill='%23a78bfa'%3EDemo Image %23${i + 1}%3C/text%3E%3C/svg%3E`,
        imagePrompt: demoPages[i].imagePrompt,
        status: "completed" as const,
      };

      updateDemoBook(bookId, {
        pages: [...(loadDemoBook(bookId)?.pages ?? []), page],
        progress: Math.round(((i + 1) / demoPages.length) * 100),
      });

      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    updateDemoBook(bookId, {
      title: titles[theme] || `${childName}の絵本`,
      status: "completed",
      progress: 100,
    });
  };

  const handleCreate = async () => {
    if (!selected || !user) return;
    setCreating(true);
    try {
      const now = Timestamp.now();
      const expiresAt = Timestamp.fromMillis(now.toMillis() + 30 * 24 * 60 * 60 * 1000);
      let bookId: string;

      if (isDemoMode) {
        bookId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
        const demoBook: DemoBook = {
          id: bookId,
          title: "",
          theme,
          style: selected,
          pageCount,
          status: "generating",
          progress: 0,
          pages: [],
        };
        saveDemoBook(demoBook);
        simulateDemoGeneration(bookId).catch(console.error);
      } else {
        const bookRef = await addDoc(collection(db, "books"), {
          userId: user.uid, title: "", theme, style: selected, pageCount, status: "generating", progress: 0,
          input: {
            childName,
            ...(childAge ? { childAge: Number(childAge) } : {}),
            ...(favorites ? { favorites } : {}),
            ...(lessonToTeach ? { lessonToTeach } : {}),
            ...(memoryToRecreate ? { memoryToRecreate } : {}),
            ...(characterLook ? { characterLook } : {}),
            ...(signatureItem ? { signatureItem } : {}),
            ...(colorMood ? { colorMood } : {}),
          },
          createdAt: serverTimestamp(), expiresAt,
        });
        bookId = bookRef.id;
      }

      router.push(`/generating?id=${bookId}`);
    } catch (err) { console.error("Failed to create book:", err); setCreating(false); }
  };

  return (
    <PageTransition className="mx-auto max-w-5xl px-4 py-8">
      <StepIndicator currentStep={3} />
      <h1 className="mt-6 text-center text-xl font-bold text-purple-900">絵のタッチを選んでね</h1>
      <p className="mt-2 text-center text-sm text-violet-500">迷ったら「やさしい水彩」のままで大丈夫です。</p>
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

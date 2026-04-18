"use client";

import { useState, Suspense } from "react";
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
    <div className="mx-auto max-w-lg px-4 py-8">
      <StepIndicator currentStep={2} />
      <h1 className="mt-6 text-center text-xl font-bold text-amber-900">おしえてね</h1>
      <Card className="mt-6 border-amber-200">
        <CardContent className="space-y-4 p-6">
          <div>
            <Label htmlFor="childName" className="text-amber-800">子どもの名前 <span className="text-red-500">*</span></Label>
            <Input id="childName" value={childName} onChange={(e) => setChildName(e.target.value)} placeholder="例：ゆうた" className="mt-1" maxLength={50} />
          </div>
          <button type="button" onClick={() => setShowOptional(!showOptional)} className="text-sm text-amber-600 hover:underline">
            {showOptional ? "▲ シンプルに戻す" : "▼ もっとカスタマイズ"}
          </button>
          {showOptional && (
            <div className="space-y-4 border-t border-amber-100 pt-4">
              <div><Label htmlFor="childAge" className="text-amber-800">年齢</Label><Input id="childAge" type="number" min={0} max={12} value={childAge} onChange={(e) => setChildAge(e.target.value)} placeholder="例：3" className="mt-1" /></div>
              <div><Label htmlFor="favorites" className="text-amber-800">好きなもの</Label><Input id="favorites" value={favorites} onChange={(e) => setFavorites(e.target.value)} placeholder="例：きょうりゅう、でんしゃ" className="mt-1" maxLength={200} /></div>
              <div>
                <Label className="text-amber-800">ページ数</Label>
                <div className="mt-1 flex gap-2">
                  {PAGE_COUNT_OPTIONS.map((opt) => (
                    <button key={opt.value} type="button" onClick={() => setPageCount(opt.value)}
                      className={`flex-1 rounded-md border px-2 py-2 text-xs transition ${pageCount === opt.value ? "border-amber-500 bg-amber-50 text-amber-800 font-medium" : "border-gray-200 text-gray-500 hover:border-amber-300"}`}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              <div><Label htmlFor="lesson" className="text-amber-800">教えたいこと</Label><Input id="lesson" value={lessonToTeach} onChange={(e) => setLessonToTeach(e.target.value)} placeholder="例：はみがきをがんばる" className="mt-1" maxLength={200} /></div>
              <div><Label htmlFor="memory" className="text-amber-800">再現したい思い出</Label><textarea id="memory" value={memoryToRecreate} onChange={(e) => setMemoryToRecreate(e.target.value)} placeholder="例：おばあちゃんの家に遊びに行った" className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" rows={3} maxLength={200} /></div>
            </div>
          )}
        </CardContent>
      </Card>
      <div className="mt-8 flex justify-center">
        <Button onClick={handleNext} disabled={!childName.trim()} className="bg-amber-600 hover:bg-amber-700 text-white px-8">次へ</Button>
      </div>
    </div>
  );
}

export default function InputPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-gray-400">読み込み中...</div>}>
      <InputPageContent />
    </Suspense>
  );
}

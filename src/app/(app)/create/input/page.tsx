"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { StepIndicator } from "@/components/step-indicator";
import { PageTransition } from "@/components/page-transition";
import { useAuth } from "@/lib/hooks/use-auth";
import { useChildren } from "@/lib/hooks/use-children";
import type { OutfitMode } from "@/lib/types";

const PAGE_COUNT_OPTIONS = [
  { value: 4, label: "短い（4ページ）" },
  { value: 8, label: "ふつう（8ページ）" },
  { value: 12, label: "長い（12ページ）" },
] as const;

function InputPageContent() {
  const searchParams = useSearchParams();
  const theme = searchParams.get("theme") ?? "";
  const childId = searchParams.get("childId") ?? "";
  const router = useRouter();
  const { user } = useAuth();
  const { children, loading: childrenLoading } = useChildren(user?.uid);
  const child = children.find((item) => item.id === childId) ?? null;
  const [pageCount, setPageCount] = useState<number>(8);
  const [storyRequest, setStoryRequest] = useState("");
  const [lessonToTeach, setLessonToTeach] = useState("");
  const [memoryToRecreate, setMemoryToRecreate] = useState("");
  const [familyMembers, setFamilyMembers] = useState("");
  const [place, setPlace] = useState("");
  const [parentMessage, setParentMessage] = useState("");
  const [outfitMode, setOutfitMode] = useState<OutfitMode>("profile_default");
  const [customOutfit, setCustomOutfit] = useState("");
  const [keepSignatureItem, setKeepSignatureItem] = useState(true);
  const [showOptional, setShowOptional] = useState(false);

  const handleNext = () => {
    const params = new URLSearchParams();
    params.set("theme", theme);
    params.set("childId", childId);
    params.set("pageCount", String(pageCount));
    params.set("outfitMode", outfitMode);
    params.set("keepSignatureItem", String(keepSignatureItem));
    if (storyRequest) params.set("storyRequest", storyRequest);
    if (lessonToTeach) params.set("lessonToTeach", lessonToTeach);
    if (memoryToRecreate) params.set("memoryToRecreate", memoryToRecreate);
    if (familyMembers) params.set("familyMembers", familyMembers);
    if (place) params.set("place", place);
    if (parentMessage) params.set("parentMessage", parentMessage);
    if (customOutfit) params.set("customOutfit", customOutfit);
    router.push(`/create/style?${params.toString()}`);
  };

  return (
    <PageTransition className="mx-auto max-w-lg px-4 py-8">
      <StepIndicator currentStep={2} />
      <h1 className="mt-6 text-center text-xl font-bold text-purple-900">おしえてね</h1>
      <Card className="mt-6">
        <CardContent className="space-y-4 p-6">
          <div className="rounded-2xl bg-purple-50 p-4 text-sm text-violet-600">
            {childrenLoading ? "主人公を確認中..." : child ? `主人公: ${child.nickname || child.displayName}${child.age ? `（${child.age}歳）` : ""}` : "主人公が選択されていません。戻って選択してください。"}
          </div>
          <div>
            <Label htmlFor="storyRequest" className="text-purple-800">今回の絵本で描きたいこと</Label>
            <Input id="storyRequest" value={storyRequest} onChange={(e) => setStoryRequest(e.target.value)} placeholder="例：初めて動物園に行った日のこと" className="mt-1" maxLength={200} />
          </div>
          <button type="button" onClick={() => setShowOptional(!showOptional)} className="text-sm text-violet-600 hover:underline">
            {showOptional ? "▲ シンプルに戻す" : "▼ もっとカスタマイズ"}
          </button>
          {showOptional && (
            <div className="space-y-4 border-t border-[rgba(240,171,252,0.3)] pt-4">
              <div className="space-y-2">
                <Label className="text-purple-800">服装をどうしますか？</Label>
                <div className="grid gap-2">
                  {[
                    { value: "profile_default", label: "いつもの服装を使う" },
                    { value: "theme_auto", label: "絵本テーマに合わせてAIにおまかせ" },
                    { value: "user_custom", label: "自分で指定する" },
                  ].map((option) => (
                    <button key={option.value} type="button" onClick={() => setOutfitMode(option.value as OutfitMode)}
                      className={`rounded-2xl border px-3 py-3 text-left text-sm transition ${outfitMode === option.value ? "border-purple-400 bg-purple-50 text-purple-700" : "border-[rgba(240,171,252,0.3)] text-violet-500"}`}>
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
              {outfitMode === "user_custom" ? (
                <div>
                  <Label htmlFor="customOutfit" className="text-purple-800">指定したい服装</Label>
                  <Input id="customOutfit" value={customOutfit} onChange={(e) => setCustomOutfit(e.target.value)} placeholder="例：赤いパーカー、黄色い長靴、白いリュック" className="mt-1" maxLength={200} />
                </div>
              ) : null}
              <label className="flex items-center gap-2 rounded-2xl bg-purple-50 p-3 text-sm text-violet-600">
                <input type="checkbox" checked={keepSignatureItem} onChange={(e) => setKeepSignatureItem(e.target.checked)} />
                固定アイテムをできるだけ出す
              </label>
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
                <Label htmlFor="place" className="text-purple-800">場所</Label>
                <Input id="place" value={place} onChange={(e) => setPlace(e.target.value)} placeholder="例：上野動物園、近所の公園" className="mt-1" maxLength={200} />
              </div>
              <div>
                <Label htmlFor="familyMembers" className="text-purple-800">一緒に登場させたい人</Label>
                <Input id="familyMembers" value={familyMembers} onChange={(e) => setFamilyMembers(e.target.value)} placeholder="例：ママ、パパ、おばあちゃん" className="mt-1" maxLength={200} />
              </div>
              <div>
                <Label htmlFor="memory" className="text-purple-800">再現したい思い出</Label>
                <textarea id="memory" value={memoryToRecreate} onChange={(e) => setMemoryToRecreate(e.target.value)} placeholder="例：おばあちゃんの家に遊びに行った" className="mt-1 w-full rounded-[20px] border border-[rgba(240,171,252,0.3)] bg-background px-3 py-2 text-sm focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400/50" rows={3} maxLength={200} />
              </div>
              <div>
                <Label htmlFor="parentMessage" className="text-purple-800">最後に伝えたい言葉</Label>
                <textarea id="parentMessage" value={parentMessage} onChange={(e) => setParentMessage(e.target.value)} placeholder="例：これからもたくさん一緒に冒険しようね" className="mt-1 w-full rounded-[20px] border border-[rgba(240,171,252,0.3)] bg-background px-3 py-2 text-sm focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400/50" rows={3} maxLength={200} />
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      <div className="mt-8 flex justify-center">
        <Button onClick={handleNext} disabled={!childId || !child} className="px-8">次へ</Button>
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

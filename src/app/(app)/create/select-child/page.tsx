"use client";

import Link from "next/link";
import Image from "next/image";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageTransition } from "@/components/page-transition";
import { StepIndicator } from "@/components/step-indicator";
import { AvatarNudgeBanner } from "@/components/avatar-nudge-banner";
import { useAuth } from "@/lib/hooks/use-auth";
import { useChildren } from "@/lib/hooks/use-children";
import { childProfileToSummary } from "@/lib/child-profile";

function SelectChildContent() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { children, loading, error } = useChildren(user?.uid);
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);

  // companion params をスルーパスするためのクエリ文字列を構築
  const companionQuery = (() => {
    const companionId = searchParams.get("companionId");
    const companionName = searchParams.get("companionName");
    const companionVisualDescription = searchParams.get("companionVisualDescription");
    const params = new URLSearchParams();
    if (companionId) params.set("companionId", companionId);
    if (companionName) params.set("companionName", companionName);
    if (companionVisualDescription) params.set("companionVisualDescription", companionVisualDescription);
    const qs = params.toString();
    return qs ? `&${qs}` : "";
  })();

  return (
    <PageTransition className="mx-auto max-w-4xl px-4 pb-28 pt-8">
      <StepIndicator currentStep={1} />
      <div className="mt-6 text-center">
        <h1 className="text-xl font-bold text-purple-900">誰を主人公にしますか？</h1>
        <p className="mt-2 text-sm text-violet-500">登録済みの子どもキャラクターを絵本に起用します。</p>
      </div>

      {loading ? (
        <p className="mt-8 text-center text-violet-400">読み込み中...</p>
      ) : error ? (
        <div className="mt-8 rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-red-700">{error.message}</div>
      ) : children.length === 0 ? (
        <Card className="mt-8">
          <CardContent className="p-8 text-center">
            <p className="text-violet-500">先に子どもプロフィールを登録しましょう。</p>
            <Link href="/onboarding/child" className="mt-4 inline-block">
              <Button>子どもを登録する</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {children.map((child) => (
            <button key={child.id} type="button" onClick={() => setSelectedChildId(child.id)} className="text-left">
              <Card className={`h-full transition ${selectedChildId === child.id ? "border-purple-400 ring-2 ring-purple-200" : "hover:border-purple-300"}`}>
                <CardHeader>
                  {child.visualProfile?.approvedImageUrl ? (
                    <Image
                      src={child.visualProfile.approvedImageUrl}
                      alt={`${child.nickname || child.displayName}のキャラクター`}
                      width={400}
                      height={300}
                      className="mb-3 aspect-[4/3] w-full rounded-2xl object-cover"
                    />
                  ) : null}
                  <CardTitle>{child.nickname || child.displayName}</CardTitle>
                  <p className="text-sm text-violet-500">
                    {child.displayName}{child.age ? ` / ${child.age}歳` : ""}
                  </p>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-relaxed text-violet-500">
                    {childProfileToSummary(child) || "この子を主人公にして絵本を作ります。"}
                  </p>
                </CardContent>
              </Card>
            </button>
          ))}
        </div>
      )}

      {selectedChildId &&
        !children.find((c) => c.id === selectedChildId)?.visualProfile?.approvedImageUrl && (
          <div className="mt-8">
            <AvatarNudgeBanner childId={selectedChildId} />
          </div>
        )}

      <div className="mt-8 flex justify-center">
        <Link href="/onboarding/child">
          <Button variant="outline">新しい子を登録</Button>
        </Link>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-purple-100 bg-white/95 backdrop-blur-sm px-4 pb-[env(safe-area-inset-bottom,16px)] pt-3">
        <div className="mx-auto max-w-lg">
          <Button
            size="lg"
            className="w-full"
            disabled={!selectedChildId}
            onClick={() => selectedChildId && router.push(`/create/theme?childId=${selectedChildId}${companionQuery}`)}
          >
            この子で作る
          </Button>
        </div>
      </div>
    </PageTransition>
  );
}

export default function SelectChildPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-violet-400">読み込み中...</div>}>
      <SelectChildContent />
    </Suspense>
  );
}

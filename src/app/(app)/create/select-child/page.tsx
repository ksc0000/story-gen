"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageTransition } from "@/components/page-transition";
import { StepIndicator } from "@/components/step-indicator";
import { useAuth } from "@/lib/hooks/use-auth";
import { useChildren } from "@/lib/hooks/use-children";
import { childProfileToSummary } from "@/lib/child-profile";

export default function SelectChildPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { children, loading, error } = useChildren(user?.uid);
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);

  return (
    <PageTransition className="mx-auto max-w-4xl px-4 py-8">
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
                    <img
                      src={child.visualProfile.approvedImageUrl}
                      alt={`${child.nickname || child.displayName}のキャラクター`}
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

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href="/onboarding/child">
          <Button variant="outline">新しい子を登録</Button>
        </Link>
        <Button onClick={() => selectedChildId && router.push(`/create/theme?childId=${selectedChildId}`)} disabled={!selectedChildId} className="px-8">
          この子で作る
        </Button>
      </div>
    </PageTransition>
  );
}

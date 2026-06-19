"use client";

import Link from "next/link";
import { useState } from "react";
import { httpsCallable } from "firebase/functions";
import { PageTransition } from "@/components/page-transition";
import { AdminNav } from "@/components/admin/AdminNav";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { functions } from "@/lib/firebase";
import { useAdminClaim } from "@/lib/hooks/use-admin-claim";
import { useAuth } from "@/lib/hooks/use-auth";
import { Loader2 } from "lucide-react";

export default function AdminTemplateGeneratorPage() {
  const { user, loading: authLoading } = useAuth();
  const { checkingAdmin, isAdmin } = useAdminClaim();

  const [theme, setTheme] = useState("");
  const [categoryGroupId, setCategoryGroupId] = useState("growth-support");
  const [pageCount, setPageCount] = useState<number>(4);
  const [targetAge, setTargetAge] = useState("3-5歳");
  const [additionalPrompt, setAdditionalPrompt] = useState("");

  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedId, setGeneratedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!theme) {
      setError("テーマを入力してください。");
      return;
    }

    setIsGenerating(true);
    setError(null);
    setGeneratedId(null);

    try {
      const generateTemplate = httpsCallable(functions, "generateTemplate");
      const result = await generateTemplate({
        theme,
        categoryGroupId,
        pageCount,
        targetAge,
        additionalPrompt,
      });

      const data = result.data as { templateId: string };
      setGeneratedId(data.templateId);
    } catch (err: unknown) {
      console.error("Failed to generate template:", err);
      const message = err instanceof Error ? err.message : "生成に失敗しました。";
      setError(message);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <>
      <AdminNav />
      <PageTransition className="mx-auto max-w-4xl px-4 py-8">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-purple-900">テンプレート生成</h1>
        </div>

        <Card>
          <CardContent className="p-6">
            {authLoading || checkingAdmin ? (
              <p className="text-sm text-violet-500">権限を確認中...</p>
            ) : !user ? (
              <div className="space-y-3">
                <p className="text-sm text-rose-600">ログインが必要です</p>
                <Link href="/admin/login">
                  <Button>管理者ログインへ</Button>
                </Link>
              </div>
            ) : !isAdmin ? (
              <div className="space-y-3 text-sm text-rose-600">
                <p>管理者権限が必要です。</p>
                <Link href="/admin/login">
                  <Button>管理者ログインへ</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="theme">テーマ (例: 冒険, 歯みがき, 宇宙)</Label>
                    <Input
                      id="theme"
                      value={theme}
                      onChange={(e) => setTheme(e.target.value)}
                      placeholder="テーマを入力"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="category">カテゴリ</Label>
                    <select
                      id="category"
                      value={categoryGroupId}
                      onChange={(e) => setCategoryGroupId(e.target.value)}
                      className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="growth-support">成長を応援</option>
                      <option value="emotional-growth">こころを育てる</option>
                      <option value="bedtime">寝る前に安心する</option>
                      <option value="memories">思い出を残す</option>
                      <option value="daily-life">毎日のくらし</option>
                      <option value="favorite-worlds">好きな世界に入る</option>
                      <option value="imagination">想像の世界で遊ぶ</option>
                      <option value="learning">楽しく学ぶ</option>
                      <option value="seasonal-events">季節とイベント</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pageCount">ページ数</Label>
                    <select
                      id="pageCount"
                      value={pageCount}
                      onChange={(e) => setPageCount(Number(e.target.value))}
                      className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value={4}>4ページ</option>
                      <option value={8}>8ページ</option>
                      <option value={12}>12ページ</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="targetAge">対象年齢</Label>
                    <Input
                      id="targetAge"
                      value={targetAge}
                      onChange={(e) => setTargetAge(e.target.value)}
                      placeholder="例: 3-5歳"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="additionalPrompt">追加の指示 (任意)</Label>
                  <textarea
                    id="additionalPrompt"
                    value={additionalPrompt}
                    onChange={(e) => setAdditionalPrompt(e.target.value)}
                    placeholder="特定のプロットや、避けたい要素があれば入力してください"
                    rows={4}
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>

                <div className="flex items-center gap-4">
                  <Button
                    onClick={handleGenerate}
                    disabled={isGenerating || !theme}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    {isGenerating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    生成する
                  </Button>
                  {isGenerating && (
                    <span className="text-sm text-violet-500 animate-pulse">
                      Gemini がテンプレートを執筆中です...
                    </span>
                  )}
                </div>

                {error && (
                  <div className="rounded-lg bg-rose-50 p-4 text-sm text-rose-600">
                    {error}
                  </div>
                )}

                {generatedId && (
                  <div className="rounded-lg bg-emerald-50 p-6 space-y-4">
                    <h3 className="text-lg font-semibold text-emerald-900">
                      テンプレートが生成されました！
                    </h3>
                    <p className="text-sm text-emerald-700">
                      ID: <code className="font-mono bg-emerald-100 px-1 rounded">{generatedId}</code>
                    </p>
                    <p className="text-xs text-emerald-600">
                      ※ active: false で保存されています。内容を Firestore コンソールで確認・調整した後、有効化してください。
                    </p>
                    <div className="flex gap-3">
                      <a
                        href={`https://console.firebase.google.com/project/${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}/firestore/data/~2Ftemplates~2F${generatedId}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm text-emerald-700 underline hover:text-emerald-800"
                      >
                        Firestore コンソールで開く
                      </a>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      </PageTransition>
    </>
  );
}

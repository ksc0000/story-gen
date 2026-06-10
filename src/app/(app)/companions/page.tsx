"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageTransition } from "@/components/page-transition";
import { useAuth } from "@/lib/hooks/use-auth";
import { useCompanions } from "./use-companions-hook";
import { getSpeciesEmoji, getPersonalityLabels } from "./companions-utils";
import { Badge } from "@/components/ui/badge";
import { Loader2, Trash2, Plus } from "lucide-react";

export default function CompanionsPage() {
  const { user } = useAuth();
  const { companions, loading, error, deleteCompanion } = useCompanions(user?.uid);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    if (!window.confirm("本当にこの相棒を削除しますか？")) return;

    setDeletingId(id);
    try {
      await deleteCompanion(id);
    } catch (err) {
      console.error(err);
      alert("削除に失敗しました");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <PageTransition className="mx-auto max-w-4xl px-4 py-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-purple-900">相棒キャラクター</h1>
          <p className="mt-2 text-sm text-violet-500">絵本に登場するオリジナルの相棒を管理します。</p>
        </div>
        <Link href="/companions/create">
          <Button className="gap-2">
            <Plus className="size-4" />
            新しい相棒を作る
          </Button>
        </Link>
      </div>

      {loading ? (
        <div className="mt-20 flex justify-center">
          <Loader2 className="size-8 animate-spin text-violet-400" />
        </div>
      ) : error ? (
        <div className="mt-8 rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
          エラーが発生しました: {error.message}
        </div>
      ) : companions.length === 0 ? (
        <Card className="mt-8">
          <CardContent className="p-12 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-violet-100 text-3xl">
              🐾
            </div>
            <p className="text-lg font-medium text-purple-900">まだ相棒がいません</p>
            <p className="mt-1 text-sm text-violet-500">
              最初の相棒を作って、物語を賑やかにしましょう！
            </p>
            <Link href="/companions/create" className="mt-6 inline-block">
              <Button size="lg">相棒を作る</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {companions.map((companion) => (
            <Card key={companion.id} className="overflow-hidden transition-all hover:shadow-md">
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-50 text-3xl shadow-sm">
                    {getSpeciesEmoji(companion.species)}
                  </div>
                  <div>
                    <CardTitle className="text-xl text-purple-900">{companion.name}</CardTitle>
                    <p className="text-xs text-violet-400">
                      {companion.size === "small" ? "ちっちゃい" : companion.size === "large" ? "おおきい" : "ふつうサイズ"}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => handleDelete(companion.id)}
                  disabled={deletingId === companion.id}
                  className="text-violet-300 hover:bg-red-50 hover:text-red-500"
                >
                  {deletingId === companion.id ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Trash2 className="size-4" />
                  )}
                </Button>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-1.5">
                  {getPersonalityLabels(companion.personality).map((label) => (
                    <Badge key={label} variant="secondary" className="bg-violet-50 text-violet-600 border-none">
                      {label}
                    </Badge>
                  ))}
                </div>
                <p className="mt-4 text-sm leading-relaxed text-violet-600">
                  <span className="font-semibold text-violet-400">とくいなこと:</span>{" "}
                  {companion.specialAbility || "ひみつ"}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </PageTransition>
  );
}

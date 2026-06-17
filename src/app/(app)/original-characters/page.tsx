"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageTransition } from "@/components/page-transition";
import { BackButton } from "@/components/back-button";
import { useAuth } from "@/lib/hooks/use-auth";
import { useOriginalCharacters } from "@/lib/hooks/use-original-characters";
import { Badge } from "@/components/ui/badge";
import { Loader2, Trash2, Plus, Sparkles } from "lucide-react";

export default function OriginalCharactersPage() {
  const { user } = useAuth();
  const { characters, loading, error, deleteCharacter } = useOriginalCharacters(user?.uid);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    if (!window.confirm("本当にこのキャラクターを削除しますか？")) return;

    setDeletingId(id);
    try {
      await deleteCharacter(id);
    } catch (err) {
      console.error(err);
      alert("削除に失敗しました");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <PageTransition className="mx-auto max-w-4xl px-4 py-8">
      <BackButton className="mb-4" />
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-purple-900">オリジナル相棒</h1>
          <p className="mt-2 text-sm text-violet-500">あなただけの特別なキャラクターを管理します。</p>
        </div>
        <Link href="/original-characters/new">
          <Button className="gap-2 bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700">
            <Plus className="size-4" />
            新しい相棒をつくる
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
      ) : characters.length === 0 ? (
        <Card className="mt-8 border-dashed">
          <CardContent className="p-12 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-violet-100 text-3xl">
              ✨
            </div>
            <p className="text-lg font-medium text-purple-900">まだオリジナル相棒がいません</p>
            <p className="mt-1 text-sm text-violet-500">
              「ふしぎな相棒をつくろう」から、世界にひとりだけのキャラクターを作成しましょう！
            </p>
            <Link href="/original-characters/new" className="mt-6 inline-block">
              <Button size="lg" className="bg-gradient-to-r from-purple-600 to-violet-600">相棒をつくる</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {characters.map((character) => (
            <Card key={character.id} className="overflow-hidden transition-all hover:shadow-md border-purple-100">
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                <Link href={`/original-characters/${character.id}`} className="flex items-center gap-3 hover:opacity-80">
                  {character.visualProfile.approvedImageUrl ? (
                    <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-2xl shadow-sm border border-purple-50">
                      <Image
                        src={character.visualProfile.approvedImageUrl}
                        alt={character.name}
                        fill
                        className="object-cover"
                      />
                    </div>
                  ) : (
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-50 to-violet-100 text-2xl shadow-sm border border-purple-50">
                      <Sparkles className="size-6 text-purple-300" />
                    </div>
                  )}
                  <div>
                    <CardTitle className="text-xl text-purple-900">{character.name}</CardTitle>
                    <p className="text-xs text-violet-400">
                      {character.species}
                    </p>
                  </div>
                </Link>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => handleDelete(character.id)}
                  disabled={deletingId === character.id}
                  className="text-violet-300 hover:bg-red-50 hover:text-red-500"
                >
                  {deletingId === character.id ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Trash2 className="size-4" />
                  )}
                </Button>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-1.5">
                  {character.personalityTraits.map((trait) => (
                    <Badge key={trait} variant="secondary" className="bg-purple-50 text-purple-600 border-none">
                      {trait}
                    </Badge>
                  ))}
                  <Badge variant="outline" className="border-violet-100 text-violet-500">
                    {character.role === "hero" ? "主人公" :
                     character.role === "buddy" ? "相棒" :
                     character.role === "guide" ? "導き手" :
                     character.role === "guardian" ? "守護者" : "ムードメーカー"}
                  </Badge>
                </div>
                <p className="mt-4 text-sm leading-relaxed text-violet-600 line-clamp-2">
                  <span className="font-semibold text-violet-400">とくべつな力:</span>{" "}
                  {character.specialPower}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </PageTransition>
  );
}

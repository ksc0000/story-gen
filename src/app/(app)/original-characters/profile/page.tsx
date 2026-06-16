"use client";

import { use, useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageTransition } from "@/components/page-transition";
import { BackButton } from "@/components/back-button";
import { useAuth } from "@/lib/hooks/use-auth";
import { useOriginalCharacters } from "@/lib/hooks/use-original-characters";
import { Badge } from "@/components/ui/badge";
import { Loader2, Trash2, Sparkles, BookOpen, Edit } from "lucide-react";

export default function CharacterProfilePage({ params: paramsPromise }: { params: Promise<{ id: string }> }) {
  const params = use(paramsPromise);
  const router = useRouter();
  const { user } = useAuth();
  const { characters, loading, error, deleteCharacter } = useOriginalCharacters(user?.uid);
  const [isDeleting, setIsDeleting] = useState(false);

  const character = characters.find((c) => c.id === params.id);

  const handleDelete = async () => {
    if (!window.confirm("本当にこのキャラクターを削除しますか？")) return;

    setIsDeleting(true);
    try {
      await deleteCharacter(params.id);
      router.push("/original-characters");
    } catch (err) {
      console.error(err);
      alert("削除に失敗しました");
      setIsDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-violet-400" />
      </div>
    );
  }

  if (!character) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12 text-center">
        <h1 className="text-2xl font-bold text-purple-900">キャラクターが見つかりません</h1>
        <Button className="mt-4" onClick={() => router.push("/original-characters")}>一覧に戻る</Button>
      </div>
    );
  }

  return (
    <PageTransition className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <BackButton />
        <div className="flex gap-2">
          <Button variant="ghost" size="icon" onClick={() => {}} disabled className="text-violet-300">
            <Edit className="size-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleDelete}
            disabled={isDeleting}
            className="text-violet-300 hover:bg-red-50 hover:text-red-500"
          >
            {isDeleting ? <Loader2 className="size-5 animate-spin" /> : <Trash2 className="size-5" />}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Left Column: Visual */}
        <div className="md:col-span-1">
          <Card className="overflow-hidden border-purple-100 shadow-sm">
            <div className="relative aspect-square w-full bg-gradient-to-br from-purple-50 to-violet-100">
              {character.visualProfile.approvedImageUrl ? (
                <Image
                  src={character.visualProfile.approvedImageUrl}
                  alt={character.name}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center text-purple-200">
                  <Sparkles className="size-16 mb-2" />
                  <p className="text-xs font-medium text-purple-300">画像はまだありません</p>
                </div>
              )}
            </div>
            <CardContent className="p-4 text-center">
              <h1 className="text-2xl font-bold text-purple-900">{character.name}</h1>
              <p className="text-sm text-violet-500">{character.species}</p>
              <div className="mt-4 flex justify-center">
                <Badge variant="outline" className="border-purple-200 text-purple-600 bg-purple-50">
                  {character.role === "hero" ? "主人公" :
                   character.role === "buddy" ? "相棒" :
                   character.role === "guide" ? "導き手" :
                   character.role === "guardian" ? "守護者" : "ムードメーカー"}
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Button
            className="mt-4 w-full gap-2 bg-gradient-to-r from-purple-600 to-violet-600"
            onClick={() => router.push(`/create/theme?mode=original_ai&originalCharacterId=${character.id}`)}
          >
            <BookOpen className="size-4" />
            この相棒で絵本を作る
          </Button>
        </div>

        {/* Right Column: Details */}
        <div className="md:col-span-2 space-y-6">
          <Card className="border-purple-50 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg text-purple-900">プロフィール</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-violet-300">性格</label>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {character.personalityTraits.map((trait) => (
                      <Badge key={trait} variant="secondary" className="bg-violet-50 text-violet-600 border-none">
                        {trait}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-violet-300">メインカラー</label>
                  <p className="mt-1 text-sm font-medium text-purple-700">{character.visualProfile.mainColor}</p>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-violet-300">とくべつな力</label>
                <p className="mt-1 text-sm text-purple-700 leading-relaxed">{character.specialPower}</p>
              </div>

              <div>
                <label className="text-xs font-semibold text-violet-300">ちょっとしたクセ</label>
                <p className="mt-1 text-sm text-purple-700 leading-relaxed">{character.weaknessOrQuirk || "なし"}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-purple-50 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg text-purple-900">キャラクターBible</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="whitespace-pre-wrap rounded-xl bg-violet-50/50 p-4 text-xs text-violet-600 font-sans leading-relaxed">
                {character.visualProfile.characterBible}
              </pre>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageTransition>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageTransition } from "@/components/page-transition";
import { BackButton } from "@/components/back-button";
import { useAuth } from "@/lib/hooks/use-auth";
import { useCompanions } from "./use-companions-hook";
import {
  getSpeciesEmoji,
  getPersonalityLabels,
  getAbilityLabel,
  COMPANION_PRESETS,
  SPECIES_OPTIONS,
} from "./companions-utils";
import { Badge } from "@/components/ui/badge";
import { Loader2, Trash2, Plus } from "lucide-react";

export default function CompanionsPage() {
  const { user } = useAuth();
  const { companions, loading, error, deleteCompanion } = useCompanions(user?.uid);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    if (!window.confirm("本当にこのなかよしキャラを削除しますか？")) return;
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
      <BackButton className="mb-4" />
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-purple-900">なかよしキャラ</h1>
          <p className="mt-2 text-sm text-violet-500">絵本に登場させるなかよしキャラを選んだり、新しく作れます。</p>
        </div>
        <Link href="/companions/create">
          <Button className="gap-2">
            <Plus className="size-4" />
            新しいなかよしキャラを作る
          </Button>
        </Link>
      </div>

      {/* 公式プリセットキャラ */}
      <div className="mt-8">
        <div className="mb-3 flex items-center gap-2">
          <span className="text-base font-bold text-purple-900">みんなのなかよしキャラ</span>
          <Badge variant="secondary" className="bg-violet-100 text-violet-600 border-none text-xs">公式</Badge>
        </div>
        <p className="mb-4 text-xs text-violet-400">絵本作成のときにそのまま使えます。自分でカスタム作成も可能です。</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {COMPANION_PRESETS.map((preset) => {
            const speciesOpt = SPECIES_OPTIONS.find((o) => o.value === preset.species);
            return (
              <div
                key={preset.id}
                className="flex flex-col items-center gap-2 rounded-2xl border border-violet-100 bg-white p-3 shadow-sm text-center"
              >
                {speciesOpt?.imageUrl ? (
                  <div className="relative h-14 w-14 overflow-hidden rounded-xl">
                    <Image src={speciesOpt.imageUrl} alt={speciesOpt.label} fill className="object-cover" unoptimized />
                  </div>
                ) : (
                  <span className="text-4xl leading-none py-1">{speciesOpt?.emoji}</span>
                )}
                <div>
                  <p className="text-sm font-bold text-purple-900">{preset.defaultName}</p>
                  <p className="text-xs text-violet-400 leading-tight mt-0.5">{preset.tagline}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* マイなかよしキャラ */}
      <div className="mt-10">
        <div className="mb-3">
          <span className="text-base font-bold text-purple-900">マイなかよしキャラ</span>
        </div>

        {loading ? (
          <div className="mt-8 flex justify-center">
            <Loader2 className="size-8 animate-spin text-violet-400" />
          </div>
        ) : error ? (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
            エラーが発生しました: {error.message}
          </div>
        ) : companions.length === 0 ? (
          <Card className="mt-2">
            <CardContent className="p-10 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-violet-100 text-2xl">
                🐾
              </div>
              <p className="text-base font-medium text-purple-900">まだマイキャラがいません</p>
              <p className="mt-1 text-sm text-violet-500">
                自分だけのなかよしキャラを作って、物語を賑やかにしましょう！
              </p>
              <Link href="/companions/create" className="mt-5 inline-block">
                <Button size="lg">なかよしキャラを作る</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {companions.map((companion) => (
              <Card key={companion.id} className="overflow-hidden transition-all hover:shadow-md">
                <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                  <Link href={`/companions/profile?id=${companion.id}`} className="flex items-center gap-3 hover:opacity-80">
                    {companion.generatedImageUrl ? (
                      <Image
                        src={companion.generatedImageUrl}
                        alt={companion.name}
                        width={48}
                        height={48}
                        className="h-12 w-12 shrink-0 rounded-2xl object-cover shadow-sm"
                      />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-50 text-3xl shadow-sm">
                        {getSpeciesEmoji(companion.species)}
                      </div>
                    )}
                    <div>
                      <CardTitle className="text-xl text-purple-900">{companion.name}</CardTitle>
                      <p className="text-xs text-violet-400">
                        {companion.size === "small" ? "ちっちゃい" : companion.size === "large" ? "おおきい" : "ふつうサイズ"}
                      </p>
                    </div>
                  </Link>
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
                    {getAbilityLabel(companion.specialAbility)}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </PageTransition>
  );
}

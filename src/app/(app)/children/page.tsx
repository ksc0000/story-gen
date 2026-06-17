"use client";

import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2, UserMinus } from "lucide-react";
import { PageTransition } from "@/components/page-transition";
import { BackButton } from "@/components/back-button";
import { useAuth } from "@/lib/hooks/use-auth";
import { useChildren } from "@/lib/hooks/use-children";
import { useUserProfile } from "@/lib/hooks/use-user-profile";
import { childProfileToSummary } from "@/lib/child-profile";
import { PLAN_CONFIGS } from "@/lib/plans";
import { useState } from "react";
import { ConfirmationDialog } from "@/components/confirmation-dialog";
import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";

export default function ChildrenPage() {
  const { user } = useAuth();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [childToDelete, setChildToDelete] = useState<{ id: string; name: string } | null>(null);
  const { profile, loading: loadingProfile } = useUserProfile(user?.uid);
  const { children, loading: loadingChildren, error } = useChildren(user?.uid);

  const loading = loadingProfile || loadingChildren;

  const planConfig = PLAN_CONFIGS[profile?.productPlan || "free"];
  const isLimitReached = children.length >= planConfig.maxChildren;

  const handleDeleteClick = (childId: string, name: string) => {
    setChildToDelete({ id: childId, name });
  };

  const handleConfirmDelete = async () => {
    if (!user || !childToDelete) return;

    setDeletingId(childToDelete.id);
    try {
      const deleteChild = httpsCallable(functions, "deleteChildProfile");
      await deleteChild({ childId: childToDelete.id });
      setChildToDelete(null);
    } catch (err) {
      console.error("Failed to delete child profile:", err);
      alert("削除に失敗しました。もう一度お試しください。");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <PageTransition className="mx-auto max-w-4xl px-4 py-8">
      <BackButton className="mb-4" />
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-purple-900">子どもプロフィール</h1>
          <p className="mt-2 text-sm text-violet-500">絵本の主人公になるお子さんの情報を管理します。</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          {isLimitReached ? (
            <div className="flex flex-col items-end gap-1">
              <Button disabled variant="outline">子どもを追加</Button>
              <p className="text-xs text-violet-400">プランをアップグレードすると追加できます</p>
            </div>
          ) : (
            <Link href="/onboarding/child">
              <Button>子どもを追加</Button>
            </Link>
          )}
        </div>
      </div>

      {loading ? (
        <p className="mt-8 text-center text-violet-400">読み込み中...</p>
      ) : error ? (
        <div className="mt-8 rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">{error.message}</div>
      ) : children.length === 0 ? (
        <Card className="mt-8">
          <CardContent className="p-8 text-center">
            <p className="text-violet-500">まだ子どもプロフィールがありません。</p>
            <Link href="/onboarding/child" className="mt-4 inline-block">
              <Button disabled={isLimitReached}>最初のプロフィールを登録</Button>
            </Link>
            {isLimitReached && (
              <p className="mt-2 text-xs text-violet-400">プランをアップグレードすると追加できます</p>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {children.map((child) => (
            <Card key={child.id}>
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
                <p className="min-h-10 text-sm leading-relaxed text-violet-500">
                  {childProfileToSummary(child) || "好きなものや見た目を登録しておくと、絵本に反映しやすくなります。"}
                </p>
                <div className="mt-4 flex gap-2">
                  <Link href={`/children/edit?childId=${child.id}`}>
                    <Button variant="outline" size="sm">編集</Button>
                  </Link>
                  <Link href={`/onboarding/child/avatar?childId=${child.id}`}>
                    <Button variant="outline" size="sm">キャラ再生成</Button>
                  </Link>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="ml-auto text-violet-400 hover:bg-red-50 hover:text-red-500"
                    onClick={() => handleDeleteClick(child.id, child.nickname || child.displayName)}
                    disabled={deletingId === child.id}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ConfirmationDialog
        isOpen={!!childToDelete}
        onClose={() => setChildToDelete(null)}
        onConfirm={handleConfirmDelete}
        variant="destructive"
        icon={<UserMinus className="size-7" />}
        title="プロフィールの削除"
        description={
          <div className="space-y-3">
            <p>
              <span className="font-bold text-purple-900">{childToDelete?.name}</span> さんのプロフィールを削除しますか？
            </p>
            <p>
              削除すると、このお子さんに関連するすべてのデータ（作成した絵本、アバター画像など）が完全に消去され、復元することはできません。
            </p>
          </div>
        }
        confirmLabel="プロフィールを削除"
        confirmPhrase="プロフィールを削除"
        isLoading={!!deletingId}
      />
    </PageTransition>
  );
}

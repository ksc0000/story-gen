"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { doc, updateDoc } from "firebase/firestore";
import { PageTransition } from "@/components/page-transition";
import { ChildProfileForm, type ChildProfileFormValues } from "@/components/child-profile-form";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/hooks/use-auth";
import { useChildren } from "@/lib/hooks/use-children";
import { db } from "@/lib/firebase";
import { buildChildProfilePayload } from "@/lib/child-profile";

function ChildEditPageContent() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const childId = searchParams.get("childId");
  const { children, loading } = useChildren(user?.uid);
  const [saving, setSaving] = useState(false);
  const child = useMemo(() => children.find((item) => item.id === childId) ?? null, [childId, children]);

  useEffect(() => {
    if (!loading && !childId) {
      router.replace("/children");
    }
  }, [childId, loading, router]);

  const handleSubmit = async (values: ChildProfileFormValues) => {
    if (!user || !childId || !child) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, "users", user.uid, "children", childId), buildChildProfilePayload(values, child.visualProfile));
      router.push("/children");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-violet-400">読み込み中...</div>;
  }

  if (!child) {
    return (
      <PageTransition className="mx-auto max-w-2xl px-4 py-8 text-center">
        <p className="text-violet-500">プロフィールが見つかりませんでした。</p>
        <Button className="mt-4" onClick={() => router.push("/children")}>一覧へ戻る</Button>
      </PageTransition>
    );
  }

  return (
    <PageTransition className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-purple-900">プロフィールを編集</h1>
        <p className="mt-3 text-sm text-violet-500">今後作る絵本に使う主人公情報を更新します。</p>
      </div>
      <ChildProfileForm initialChild={child} submitLabel="保存する" saving={saving} onSubmit={handleSubmit} />
    </PageTransition>
  );
}

export default function ChildEditPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-violet-400">読み込み中...</div>}>
      <ChildEditPageContent />
    </Suspense>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { addDoc, collection, doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { PageTransition } from "@/components/page-transition";
import { ChildProfileForm, type ChildProfileFormValues } from "@/components/child-profile-form";
import { useAuth } from "@/lib/hooks/use-auth";
import { db } from "@/lib/firebase";
import { buildChildProfilePayload } from "@/lib/child-profile";

export default function ChildOnboardingPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (values: ChildProfileFormValues) => {
    if (!user) return;
    setSaving(true);
    try {
      const childRef = await addDoc(collection(db, "users", user.uid, "children"), {
        ...buildChildProfilePayload(values),
        createdAt: serverTimestamp(),
      });
      await updateDoc(doc(db, "users", user.uid), { activeChildId: childRef.id });
      router.replace(`/onboarding/child/avatar?childId=${childRef.id}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageTransition className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-8 text-center">
        <p className="text-sm font-semibold text-violet-500">はじめに</p>
        <h1 className="mt-2 text-2xl font-bold text-purple-900">主人公になるお子さんを登録しましょう</h1>
        <p className="mt-3 text-sm leading-relaxed text-violet-500">
          一度登録すると、毎回名前や見た目を入力しなくても、その子らしい絵本を作りやすくなります。
        </p>
      </div>
      <ChildProfileForm submitLabel="登録して本棚へ" saving={saving} onSubmit={handleSubmit} />
    </PageTransition>
  );
}

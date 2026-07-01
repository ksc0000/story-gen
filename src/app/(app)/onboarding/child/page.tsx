"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { addDoc, collection, doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2 } from "lucide-react";
import { PageTransition } from "@/components/page-transition";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ChildProfileForm, type ChildProfileFormValues } from "@/components/child-profile-form";
import { useAuth } from "@/lib/hooks/use-auth";
import { db, storage } from "@/lib/firebase";
import { buildChildProfilePayload } from "@/lib/child-profile";
import { useAvatarGenerationJob } from "@/lib/hooks/use-avatar-generation-job";

export default function ChildOnboardingPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [registeredChildId, setRegisteredChildId] = useState<string | null>(null);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const { startJob } = useAvatarGenerationJob(null);

  const handleSubmit = async (values: ChildProfileFormValues) => {
    if (!user) return;
    setSaving(true);
    try {
      const childRef = await addDoc(collection(db, "users", user.uid, "children"), {
        ...buildChildProfilePayload(values),
        createdAt: serverTimestamp(),
      });
      await updateDoc(doc(db, "users", user.uid), { activeChildId: childRef.id });

      // 追加の参考写真（Phase 4）をアップロード。
      const extraUrls: string[] = [...values.extraKeptUrls];
      for (let i = 0; i < values.extraNewFiles.length; i++) {
        const extraRef = ref(storage, `childPhotos/${user.uid}/${childRef.id}/extra_${Date.now()}_${i}.jpg`);
        const snap = await uploadBytes(extraRef, values.extraNewFiles[i]);
        extraUrls.push(await getDownloadURL(snap.ref));
      }
      if (extraUrls.length > 0) {
        await updateDoc(childRef, { photoUrls: extraUrls });
      }

      if (values.photoFile) {
        const storageRef = ref(storage, `childPhotos/${user.uid}/${childRef.id}/original.jpg`);
        const snapshot = await uploadBytes(storageRef, values.photoFile);
        const photoUrl = await getDownloadURL(snapshot.ref);
        await updateDoc(childRef, { photoUrl });

        // Trigger async avatar generation
        const jobId = await startJob({
          userId: user.uid,
          childId: childRef.id,
        });
        setActiveJobId(jobId);

        setRegisteredChildId(childRef.id);
      } else {
        setRegisteredChildId(childRef.id);
      }
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
      <ChildProfileForm submitLabel="登録" saving={saving} onSubmit={handleSubmit} />

      <AnimatePresence>
        {registeredChildId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative z-10 w-full max-w-sm overflow-hidden rounded-3xl bg-white p-8 shadow-2xl"
            >
              <div className="flex flex-col items-center text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-50 text-green-500">
                  <CheckCircle2 className="size-10" />
                </div>
                <h2 className="text-xl font-bold text-purple-900">子どものプロフィールを登録しました！</h2>
                <p className="mt-3 text-sm leading-relaxed text-violet-500">
                  このまま子どものAIイラスト生成に進みますか？
                </p>

                <div className="mt-8 flex w-full flex-col gap-3">
                  <Button
                    size="lg"
                    className="w-full"
                    onClick={() => {
                      const url = `/onboarding/child/avatar?childId=${registeredChildId}${activeJobId ? `&jobId=${activeJobId}` : ""}`;
                      router.push(url);
                    }}
                  >
                    AIイラスト生成に進む
                  </Button>
                  <Button
                    variant="outline"
                    size="lg"
                    className="w-full"
                    onClick={() => router.push("/home")}
                  >
                    本棚に戻る
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </PageTransition>
  );
}

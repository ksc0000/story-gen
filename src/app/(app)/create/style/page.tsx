"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { collection, addDoc, serverTimestamp, Timestamp } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { StepIndicator } from "@/components/step-indicator";
import { StylePicker } from "@/components/style-picker";
import { useAuth } from "@/lib/hooks/use-auth";
import { db } from "@/lib/firebase";
import type { IllustrationStyle, PageCount } from "@/lib/types";

export default function StyleSelectionPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const [selected, setSelected] = useState<IllustrationStyle | null>(null);
  const [creating, setCreating] = useState(false);

  const theme = searchParams.get("theme") ?? "";
  const childName = searchParams.get("childName") ?? "";
  const pageCount = Number(searchParams.get("pageCount") ?? "8") as PageCount;
  const childAge = searchParams.get("childAge");
  const favorites = searchParams.get("favorites");
  const lessonToTeach = searchParams.get("lessonToTeach");
  const memoryToRecreate = searchParams.get("memoryToRecreate");

  const handleCreate = async () => {
    if (!selected || !user) return;
    setCreating(true);
    try {
      const now = Timestamp.now();
      const expiresAt = Timestamp.fromMillis(now.toMillis() + 30 * 24 * 60 * 60 * 1000);
      const bookRef = await addDoc(collection(db, "books"), {
        userId: user.uid, title: "", theme, style: selected, pageCount, status: "generating", progress: 0,
        input: {
          childName,
          ...(childAge ? { childAge: Number(childAge) } : {}),
          ...(favorites ? { favorites } : {}),
          ...(lessonToTeach ? { lessonToTeach } : {}),
          ...(memoryToRecreate ? { memoryToRecreate } : {}),
        },
        createdAt: serverTimestamp(), expiresAt,
      });
      router.push(`/generating/${bookRef.id}`);
    } catch (err) { console.error("Failed to create book:", err); setCreating(false); }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <StepIndicator currentStep={3} />
      <h1 className="mt-6 text-center text-xl font-bold text-amber-900">イラストのスタイルを選んでね</h1>
      <div className="mt-6"><StylePicker selected={selected} onSelect={setSelected} /></div>
      <div className="mt-8 flex justify-center">
        <Button onClick={handleCreate} disabled={!selected || creating} className="bg-amber-600 hover:bg-amber-700 text-white px-8 text-lg py-6">
          {creating ? "絵本を作っています..." : "絵本を作る！"}
        </Button>
      </div>
    </div>
  );
}

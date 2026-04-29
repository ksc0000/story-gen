"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, orderBy, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { isDemoMode } from "@/lib/demo";
import type { CategoryGroupDoc } from "@/lib/types";

interface UseCategoryGroupsResult {
  categoryGroups: (CategoryGroupDoc & { id: string })[];
  loading: boolean;
  error: Error | null;
}

export function useCategoryGroups(): UseCategoryGroupsResult {
  const [categoryGroups, setCategoryGroups] = useState<(CategoryGroupDoc & { id: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (isDemoMode) {
      setCategoryGroups([
        { id: "memories", name: "思い出を残す", description: "", icon: "📷", parentIntent: "この瞬間を残したい", order: 1, active: true },
        { id: "growth-support", name: "成長を応援", description: "", icon: "🌱", parentIntent: "できるようになってほしい", order: 2, active: true },
        { id: "emotional-growth", name: "こころを育てる", description: "", icon: "⭐", parentIntent: "自信を育てたい", order: 3, active: true },
        { id: "bedtime", name: "寝る前に安心する", description: "", icon: "🌙", parentIntent: "今日も安心して眠ってほしい", order: 4, active: true },
        { id: "favorite-worlds", name: "好きな世界に入る", description: "", icon: "💛", parentIntent: "好きなものを伸ばしたい", order: 5, active: true },
        { id: "imagination", name: "想像の世界で遊ぶ", description: "", icon: "🪄", parentIntent: "自由に想像してほしい", order: 6, active: true },
        { id: "learning", name: "楽しく学ぶ", description: "", icon: "🔤", parentIntent: "自然に学んでほしい", order: 7, active: true },
        { id: "seasonal-events", name: "季節とイベント", description: "", icon: "🌸", parentIntent: "季節の体験を残したい", order: 8, active: true },
      ]);
      setLoading(false);
      return;
    }

    const q = query(collection(db, "categoryGroups"), where("active", "==", true), orderBy("order", "asc"));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setCategoryGroups(snapshot.docs.map((doc) => ({ id: doc.id, ...(doc.data() as CategoryGroupDoc) })));
        setLoading(false);
      },
      (err) => {
        console.error("Failed to load category groups:", err);
        setError(err as Error);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, []);

  return { categoryGroups, loading, error };
}

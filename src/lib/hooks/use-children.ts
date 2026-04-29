"use client";

import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { isDemoMode } from "@/lib/demo";
import type { ChildProfileDoc } from "@/lib/types";

export type ChildProfileWithId = ChildProfileDoc & { id: string };

const demoChild = {
  id: "demo-child-001",
  displayName: "はると",
  nickname: "はるくん",
  age: 4,
  birthYearMonth: "2021-06",
  personality: {
    traits: ["やさしい", "好奇心旺盛"],
    favoritePlay: "電車ごっこ",
    favoriteThings: ["恐竜", "新幹線", "いちご"],
    currentChallenge: "歯みがきを自分でする",
  },
  visualProfile: {
    characterLook: "短い黒髪、丸いほっぺ、明るい表情",
    signatureItem: "黄色い帽子",
    outfit: "青いオーバーオール",
    colorMood: "やさしいパステル",
    version: 1,
  },
  generationSettings: {
    defaultStyle: "soft_watercolor",
    defaultPageCount: 8,
    allowedPersonalization: true,
  },
  active: true,
} as ChildProfileWithId;

export function useChildren(userId: string | undefined) {
  const [children, setChildren] = useState<ChildProfileWithId[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (isDemoMode) {
      setChildren([demoChild]);
      setLoading(false);
      return;
    }

    if (!userId) {
      setChildren([]);
      setLoading(false);
      return;
    }

    const childrenRef = collection(db, "users", userId, "children");
    const unsubscribe = onSnapshot(
      childrenRef,
      (snapshot) => {
        const docs = snapshot.docs
          .map((doc) => ({ id: doc.id, ...(doc.data() as ChildProfileDoc) }))
          .filter((child) => child.active !== false)
          .sort((a, b) => {
            const aMillis = a.createdAt && "toMillis" in a.createdAt ? a.createdAt.toMillis() : 0;
            const bMillis = b.createdAt && "toMillis" in b.createdAt ? b.createdAt.toMillis() : 0;
            return aMillis - bMillis;
          });
        setChildren(docs);
        setLoading(false);
      },
      (err) => {
        console.error("Failed to load children:", err);
        setError(err as Error);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [userId]);

  const activeChild = useMemo(() => children[0] ?? null, [children]);

  return { children, activeChild, loading, error };
}

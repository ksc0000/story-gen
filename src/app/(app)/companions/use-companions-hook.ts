"use client";

import { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
  query,
  where,
  orderBy,
  addDoc,
  deleteDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { CompanionData } from "@/lib/types";

export type CompanionWithId = CompanionData & { id: string };

export function useCompanions(userId: string | undefined) {
  const [companions, setCompanions] = useState<CompanionWithId[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!userId) {
      setCompanions([]);
      setLoading(false);
      return;
    }

    const companionsRef = collection(db, "companions");
    const q = query(
      companionsRef,
      where("userId", "==", userId),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const docs = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...(doc.data() as CompanionData),
        }));
        setCompanions(docs);
        setLoading(false);
      },
      (err) => {
        console.error("Failed to load companions:", err);
        setError(err as Error);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [userId]);

  const addCompanion = async (data: Omit<CompanionData, "userId" | "createdAt">) => {
    if (!userId) throw new Error("User not authenticated");
    const companionsRef = collection(db, "companions");
    await addDoc(companionsRef, {
      ...data,
      userId,
      createdAt: serverTimestamp(),
    });
  };

  const deleteCompanion = async (companionId: string) => {
    const companionRef = doc(db, "companions", companionId);
    await deleteDoc(companionRef);
  };

  return { companions, loading, error, addCompanion, deleteCompanion };
}

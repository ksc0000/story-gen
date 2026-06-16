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
  updateDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { OriginalCharacterDoc } from "@/lib/types";

export type OriginalCharacterWithId = OriginalCharacterDoc & { id: string };

export function useOriginalCharacters(userId: string | undefined) {
  const [characters, setCharacters] = useState<OriginalCharacterWithId[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!userId) {
      setCharacters([]);
      setLoading(false);
      return;
    }

    const charactersRef = collection(db, "users", userId, "originalCharacters");
    const q = query(
      charactersRef,
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const docs = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...(doc.data() as OriginalCharacterDoc),
        }));
        setCharacters(docs);
        setLoading(false);
      },
      (err) => {
        console.error("Failed to load original characters:", err);
        setError(err as Error);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [userId]);

  const addCharacter = async (data: Omit<OriginalCharacterDoc, "userId" | "createdAt" | "updatedAt">): Promise<string> => {
    if (!userId) throw new Error("User not authenticated");
    const charactersRef = collection(db, "users", userId, "originalCharacters");
    const docRef = await addDoc(charactersRef, {
      ...data,
      userId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return docRef.id;
  };

  const updateCharacter = async (characterId: string, data: Partial<OriginalCharacterDoc>) => {
    if (!userId) throw new Error("User not authenticated");
    const characterRef = doc(db, "users", userId, "originalCharacters", characterId);
    await updateDoc(characterRef, {
      ...data,
      updatedAt: serverTimestamp(),
    });
  };

  const deleteCharacter = async (characterId: string) => {
    if (!userId) throw new Error("User not authenticated");
    const characterRef = doc(db, "users", userId, "originalCharacters", characterId);
    await deleteDoc(characterRef);
  };

  return { characters, loading, error, addCharacter, updateCharacter, deleteCharacter };
}

import { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { AvatarCandidate } from "@/lib/types";

export function useAvatarCandidates(userId: string | undefined, childId: string | undefined) {
  const [candidates, setCandidates] = useState<AvatarCandidate[]>([]);
  const [loading, setLoading] = useState(!!userId && !!childId);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!userId || !childId) {
      setCandidates([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    let unsubscribe: Unsubscribe;

    try {
      const candidatesQuery = query(
        collection(db, "users", userId, "children", childId, "avatarGenerations"),
        orderBy("createdAt", "desc")
      );

      unsubscribe = onSnapshot(
        candidatesQuery,
        (snapshot) => {
          const newCandidates = snapshot.docs.map((doc) => ({
            generationId: doc.id,
            ...doc.data(),
          })) as AvatarCandidate[];
          setCandidates(newCandidates);
          setLoading(false);
        },
        (err) => {
          console.error("Error watching avatar candidates:", err);
          setError(err);
          setLoading(false);
        }
      );
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Unknown error"));
      setLoading(false);
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [userId, childId]);

  return {
    candidates,
    loading,
    error,
  };
}

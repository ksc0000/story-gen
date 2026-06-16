"use client";

import { useEffect, useState } from "react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { isDemoMode } from "@/lib/demo";
import type { SeriesDoc } from "@/lib/types";

interface UseSeriesResult {
  series: (SeriesDoc & { id: string })[];
  loading: boolean;
  error: Error | null;
  createSeries: (name: string, userId: string) => Promise<string>;
  renameSeries: (seriesId: string, name: string) => Promise<void>;
  deleteSeries: (seriesId: string) => Promise<void>;
}

export function useSeries(userId: string | undefined): UseSeriesResult {
  const [series, setSeries] = useState<(SeriesDoc & { id: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (isDemoMode || !userId) {
      setSeries([]);
      setLoading(false);
      return;
    }

    const q = query(collection(db, "series"), where("userId", "==", userId), orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setSeries(snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...(docSnap.data() as SeriesDoc) })));
        setLoading(false);
      },
      (err) => {
        console.error("Failed to watch series", err);
        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [userId]);

  async function createSeries(name: string, ownerId: string): Promise<string> {
    const docRef = await addDoc(collection(db, "series"), {
      userId: ownerId,
      name,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return docRef.id;
  }

  async function renameSeries(seriesId: string, name: string): Promise<void> {
    await updateDoc(doc(db, "series", seriesId), {
      name,
      updatedAt: serverTimestamp(),
    });
  }

  async function deleteSeries(seriesId: string): Promise<void> {
    await deleteDoc(doc(db, "series", seriesId));
  }

  return { series, loading, error, createSeries, renameSeries, deleteSeries };
}

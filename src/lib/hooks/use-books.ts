"use client";

import { useEffect, useState } from "react";
import { collection, query, where, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { BookDoc } from "@/lib/types";

interface UseBooksResult {
  books: (BookDoc & { id: string })[];
  loading: boolean;
  error: Error | null;
}

export function useBooks(userId: string | undefined): UseBooksResult {
  const [books, setBooks] = useState<(BookDoc & { id: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!userId) { setBooks([]); setLoading(false); return; }
    const q = query(collection(db, "books"), where("userId", "==", userId), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q,
      (snapshot) => {
        setBooks(snapshot.docs.map((doc) => ({ id: doc.id, ...(doc.data() as BookDoc) })));
        setLoading(false);
      },
      (err) => { setError(err); setLoading(false); }
    );
    return unsubscribe;
  }, [userId]);

  return { books, loading, error };
}

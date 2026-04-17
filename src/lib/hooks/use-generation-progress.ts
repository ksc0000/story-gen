"use client";

import { useEffect, useState } from "react";
import { doc, collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { BookDoc, PageDoc } from "@/lib/types";

interface UseGenerationProgressResult {
  book: (BookDoc & { id: string }) | null;
  pages: (PageDoc & { id: string })[];
  loading: boolean;
}

export function useGenerationProgress(bookId: string): UseGenerationProgressResult {
  const [book, setBook] = useState<(BookDoc & { id: string }) | null>(null);
  const [pages, setPages] = useState<(PageDoc & { id: string })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!bookId) return;
    const bookUnsub = onSnapshot(doc(db, "books", bookId), (snap) => {
      if (snap.exists()) setBook({ id: snap.id, ...(snap.data() as BookDoc) });
      setLoading(false);
    });
    const pagesQuery = query(collection(db, "books", bookId, "pages"), orderBy("pageNumber", "asc"));
    const pagesUnsub = onSnapshot(pagesQuery, (snapshot) => {
      setPages(snapshot.docs.map((d) => ({ id: d.id, ...(d.data() as PageDoc) })));
    });
    return () => { bookUnsub(); pagesUnsub(); };
  }, [bookId]);

  return { book, pages, loading };
}

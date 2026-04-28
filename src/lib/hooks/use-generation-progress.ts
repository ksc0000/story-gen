"use client";

import { useEffect, useState } from "react";
import { doc, collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { isDemoMode, loadDemoBook } from "@/lib/demo";
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
    if (!bookId) {
      setBook(null);
      setPages([]);
      setLoading(false);
      return;
    }
    if (isDemoMode) {
      const syncDemo = () => {
        const demoBook = loadDemoBook(bookId);
        if (demoBook) {
          const { pages: demoPages } = demoBook;
          setBook(demoBook as unknown as BookDoc & { id: string });
          setPages(demoPages.map((page) => {
            const { id, ...rest } = page;
            return { id, ...rest } as PageDoc & { id: string };
          }));
          setLoading(false);
        } else {
          setLoading(false);
        }
      };
      syncDemo();
      const interval = window.setInterval(syncDemo, 300);
      return () => window.clearInterval(interval);
    }

    const bookUnsub = onSnapshot(
      doc(db, "books", bookId),
      (snap) => {
        if (snap.exists()) {
          setBook({ id: snap.id, ...(snap.data() as BookDoc) });
        } else {
          setBook(null);
        }
        setLoading(false);
      },
      (err) => {
        console.error("Failed to load book progress:", err);
        setBook(null);
        setLoading(false);
      }
    );

    const pagesQuery = query(collection(db, "books", bookId, "pages"), orderBy("pageNumber", "asc"));
    const pagesUnsub = onSnapshot(
      pagesQuery,
      (snapshot) => {
        setPages(snapshot.docs.map((d) => ({ id: d.id, ...(d.data() as PageDoc) })));
      },
      (err) => {
        console.error("Failed to load book pages:", err);
        setPages([]);
      }
    );

    return () => { bookUnsub(); pagesUnsub(); };
  }, [bookId]);

  return { book, pages, loading };
}

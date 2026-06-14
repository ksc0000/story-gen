"use client";

import { useEffect, useState } from "react";
import { collection, doc, getDoc, onSnapshot, orderBy, query, where, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { isDemoMode, loadAllDemoBooks } from "@/lib/demo";
import type { BookDoc } from "@/lib/types";

interface UsePublicBooksResult {
  books: (BookDoc & { id: string })[];
  loading: boolean;
  error: Error | null;
}

export function usePublicBooks(maxCount: number = 20): UsePublicBooksResult {
  const [books, setBooks] = useState<(BookDoc & { id: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (isDemoMode) {
      const demoBooks = loadAllDemoBooks().map((book) => ({
        ...book,
        coverImageUrl: book.pages[0]?.imageUrl,
      })) as unknown as (BookDoc & { id: string })[];

      // In demo mode, we just return all books as "public" samples
      setBooks(demoBooks.slice(0, maxCount));
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, "books"),
      where("public", "==", true),
      orderBy("createdAt", "desc"),
      limit(maxCount)
    );

    const fetchedPageZeroIds = new Set<string>();

    const unsubscribe = onSnapshot(q,
      (snapshot) => {
        const nextBooks = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...(docSnap.data() as BookDoc)
        }));
        setBooks(nextBooks);

        for (const book of nextBooks) {
          if (book.coverImageUrl || book.status !== "completed" || fetchedPageZeroIds.has(book.id)) {
            continue;
          }

          fetchedPageZeroIds.add(book.id);
          const pageRef = doc(db, "books", book.id, "pages", "page-0");
          getDoc(pageRef).then((pageSnap) => {
            const imageUrl = pageSnap.exists() ? (pageSnap.data().imageUrl as string | undefined) : undefined;
            if (!imageUrl) return;
            setBooks((current) =>
              current.map((currentBook) =>
                currentBook.id === book.id ? { ...currentBook, coverImageUrl: imageUrl } : currentBook
              )
            );
          }).catch((err) => {
            console.error("Failed to fetch page-0 for book", book.id, err);
          });
        }

        setLoading(false);
      },
      (err) => {
        console.error("Error fetching public books:", err);
        setError(err);
        setLoading(false);
      }
    );

    return () => {
      unsubscribe();
      fetchedPageZeroIds.clear();
    };
  }, [maxCount]);

  return { books, loading, error };
}

"use client";

import { useEffect, useState } from "react";
import { doc, collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { isDemoMode, loadDemoBook } from "@/lib/demo";
import { getOfflineBook } from "@/lib/offline-book-storage";
import type { BookDoc, PageDoc } from "@/lib/types";

interface UseGenerationProgressResult {
  book: (BookDoc & { id: string }) | null;
  pages: (PageDoc & { id: string })[];
  loading: boolean;
  isOfflineUnavailable: boolean;
  isOffline: boolean;
}

export function useGenerationProgress(bookId: string): UseGenerationProgressResult {
  const [book, setBook] = useState<(BookDoc & { id: string }) | null>(null);
  const [pages, setPages] = useState<(PageDoc & { id: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOfflineUnavailable, setIsOfflineUnavailable] = useState(false);
  const [isOffline, setIsOffline] = useState(
    typeof navigator !== "undefined" ? !navigator.onLine : false
  );

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    if (typeof window !== "undefined") {
      window.addEventListener("online", handleOnline);
      window.addEventListener("offline", handleOffline);
    }

    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("online", handleOnline);
        window.removeEventListener("offline", handleOffline);
      }
    };
  }, []);

  useEffect(() => {
    if (!bookId) {
      setBook(null);
      setPages([]);
      setLoading(false);
      setIsOfflineUnavailable(false);
      return;
    }

    if (isDemoMode) {
      const syncDemo = () => {
        const demoBook = loadDemoBook(bookId);
        if (demoBook) {
          const { pages: demoPages } = demoBook;
          setBook(demoBook as unknown as BookDoc & { id: string });
          setPages(
            demoPages.map((page) => {
              const { id, ...rest } = page;
              return { id, ...rest } as PageDoc & { id: string };
            })
          );
          setLoading(false);
          setIsOfflineUnavailable(false);
        } else {
          setLoading(false);
        }
      };
      syncDemo();
      const interval = window.setInterval(syncDemo, 1000);
      return () => window.clearInterval(interval);
    }

    if (isOffline) {
      getOfflineBook(bookId).then((offlineRecord) => {
        if (offlineRecord) {
          setBook(offlineRecord.book);
          setPages(offlineRecord.pages);
          setIsOfflineUnavailable(false);
        } else {
          setBook(null);
          setPages([]);
          setIsOfflineUnavailable(true);
        }
        setLoading(false);
      });
      return;
    }

    let isSubscribed = true;

    const bookUnsub = onSnapshot(
      doc(db, "books", bookId),
      (snap) => {
        if (!isSubscribed) return;
        if (snap.exists()) {
          setBook({ id: snap.id, ...(snap.data() as BookDoc) });
          setIsOfflineUnavailable(false);
        } else {
          setBook(null);
        }
        setLoading(false);
      },
      (err) => {
        console.error("Failed to load book progress:", err);
        // Fallback to offline record if network error occurs
        getOfflineBook(bookId).then((offlineRecord) => {
          if (!isSubscribed) return;
          if (offlineRecord) {
            setBook(offlineRecord.book);
            setPages(offlineRecord.pages);
            setIsOfflineUnavailable(false);
          } else {
            setBook(null);
            setIsOfflineUnavailable(true);
          }
          setLoading(false);
        });
      }
    );

    const pagesQuery = query(collection(db, "books", bookId, "pages"), orderBy("pageNumber", "asc"));
    const pagesUnsub = onSnapshot(
      pagesQuery,
      (snapshot) => {
        if (!isSubscribed) return;
        setPages(snapshot.docs.map((d) => ({ id: d.id, ...(d.data() as PageDoc) })));
      },
      (err) => {
        console.error("Failed to load book pages:", err);
      }
    );

    return () => {
      isSubscribed = false;
      bookUnsub();
      pagesUnsub();
    };
  }, [bookId, isOffline]);

  return { book, pages, loading, isOfflineUnavailable, isOffline };
}

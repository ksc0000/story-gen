"use client";

import { useAuth } from "@/lib/hooks/use-auth";
import { useUserProfile } from "@/lib/hooks/use-user-profile";
import { useBooks } from "@/lib/hooks/use-books";
import { useChildren } from "@/lib/hooks/use-children";
import { isFirstRun } from "@/lib/first-run";

export interface UseFirstRunResult {
  isFirstRun: boolean;
  loading: boolean;
  isOffline: boolean;
  booksCount: number;
  childrenCount: number;
}

export function useFirstRun(userIdOverride?: string): UseFirstRunResult {
  const { user } = useAuth();
  const userId = userIdOverride ?? user?.uid;

  const { profile, loading: profileLoading } = useUserProfile(userId);
  const { books, loading: booksLoading, isOffline } = useBooks(userId);
  const { children, loading: childrenLoading } = useChildren(userId);

  const loading = profileLoading || booksLoading || childrenLoading;

  const firstRun = isFirstRun(books.length, children.length, {
    isOffline,
    loading,
    userProfile: profile,
  });

  return {
    isFirstRun: firstRun,
    loading,
    isOffline,
    booksCount: books.length,
    childrenCount: children.length,
  };
}

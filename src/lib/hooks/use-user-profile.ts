"use client";

import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { UserDoc } from "@/lib/types";

interface UseUserProfileResult {
  profile: UserDoc | null;
  loading: boolean;
}

export function useUserProfile(userId: string | undefined): UseUserProfileResult {
  const [profile, setProfile] = useState<UserDoc | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) { setProfile(null); setLoading(false); return; }
    const unsubscribe = onSnapshot(doc(db, "users", userId), (snap) => {
      setProfile(snap.exists() ? (snap.data() as UserDoc) : null);
      setLoading(false);
    });
    return unsubscribe;
  }, [userId]);

  return { profile, loading };
}

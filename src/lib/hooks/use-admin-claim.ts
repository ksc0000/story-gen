"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/hooks/use-auth";

export function useAdminClaim() {
  const { user, loading } = useAuth();
  const [checkingAdmin, setCheckingAdmin] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminError, setAdminError] = useState<string | null>(null);

  const checkClaim = useCallback(
    async (forceRefresh = false): Promise<boolean> => {
      if (!user) {
        setIsAdmin(false);
        setAdminError(null);
        setCheckingAdmin(false);
        return false;
      }

      setCheckingAdmin(true);
      setAdminError(null);

      try {
        if (forceRefresh) {
          await user.getIdToken(true);
        }
        const tokenResult = await user.getIdTokenResult();
        const nextIsAdmin = tokenResult.claims.admin === true;
        setIsAdmin(nextIsAdmin);
        return nextIsAdmin;
      } catch (err) {
        console.error("Failed to read admin claim:", err);
        const message = err instanceof Error ? err.message : "Unknown error";
        setIsAdmin(false);
        setAdminError(message);
        return false;
      } finally {
        setCheckingAdmin(false);
      }
    },
    [user]
  );

  useEffect(() => {
    if (loading) return;
    void checkClaim(false);
  }, [checkClaim, loading]);

  const refreshAdminClaim = useCallback(async () => checkClaim(true), [checkClaim]);

  return {
    checkingAdmin,
    isAdmin,
    adminError,
    refreshAdminClaim,
  };
}

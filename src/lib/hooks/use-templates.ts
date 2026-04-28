"use client";

import { useEffect, useState } from "react";
import { collection, query, where, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { isDemoMode, DEMO_TEMPLATES } from "@/lib/demo";
import type { TemplateDoc } from "@/lib/types";

interface UseTemplatesResult {
  templates: (TemplateDoc & { id: string })[];
  loading: boolean;
  error: Error | null;
}

export function useTemplates(): UseTemplatesResult {
  const [templates, setTemplates] = useState<(TemplateDoc & { id: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (isDemoMode) {
      setTemplates(DEMO_TEMPLATES);
      setLoading(false);
      return;
    }

    const q = query(collection(db, "templates"), where("active", "==", true), orderBy("order", "asc"));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setTemplates(snapshot.docs.map((d) => ({ id: d.id, ...(d.data() as TemplateDoc) })));
        setLoading(false);
      },
      (err) => {
        console.error("Failed to load templates:", err);
        setError(err as Error);
        setLoading(false);
      }
    );
    return unsubscribe;
  }, []);

  return { templates, loading, error };
}

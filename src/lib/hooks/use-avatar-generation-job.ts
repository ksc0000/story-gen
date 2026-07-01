import { useCallback, useEffect, useState } from "react";
import {
  collection,
  doc,
  onSnapshot,
  addDoc,
  serverTimestamp,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { ChildAvatarGenerationJob, IllustrationStyle, AvatarRevisionRequest, LikenessStrength } from "@/lib/types";

export function useAvatarGenerationJob(jobId: string | null) {
  const [job, setJob] = useState<ChildAvatarGenerationJob | null>(null);
  const [loading, setLoading] = useState(!!jobId);
  const [isInitialLoading, setIsInitialLoading] = useState(!!jobId);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    setJob(null);
    if (!jobId) {
      setLoading(false);
      setIsInitialLoading(false);
      return;
    }

    setLoading(true);
    setIsInitialLoading(true);
    let unsubscribe: Unsubscribe;

    try {
      unsubscribe = onSnapshot(
        doc(db, "childAvatarGenerationJobs", jobId),
        (snapshot) => {
          if (snapshot.exists()) {
            setJob({ id: snapshot.id, ...snapshot.data() } as ChildAvatarGenerationJob);
          } else {
            setError(new Error("Job not found"));
          }
          setLoading(false);
          setIsInitialLoading(false);
        },
        (err) => {
          console.error("Error watching avatar job:", err);
          setError(err);
          setLoading(false);
          setIsInitialLoading(false);
        }
      );
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Unknown error"));
      setLoading(false);
      return;
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [jobId]);

  const startJob = useCallback(
    async (params: {
      userId: string;
      childId: string;
      revisionRequest?: AvatarRevisionRequest;
      baseGenerationId?: string;
      variantStyle?: IllustrationStyle;
      usePhoto?: boolean;
      likenessStrength?: LikenessStrength;
    }) => {
      try {
        const sanitizedRevisionRequest = params.revisionRequest
          ? Object.fromEntries(
              Object.entries(params.revisionRequest).filter(([, v]) => v !== undefined && v !== "")
            )
          : null;
        const jobData = {
          userId: params.userId,
          childId: params.childId,
          status: "pending",
          request: {
            revisionRequest: sanitizedRevisionRequest && Object.keys(sanitizedRevisionRequest).length > 0
              ? sanitizedRevisionRequest
              : null,
            baseGenerationId: params.baseGenerationId || null,
            variantStyle: params.variantStyle || null,
            usePhoto: params.usePhoto ?? false,
            likenessStrength: params.likenessStrength || null,
          },
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };

        const docRef = await addDoc(collection(db, "childAvatarGenerationJobs"), jobData);
        return docRef.id;
      } catch (err) {
        console.error("Error starting avatar job:", err);
        throw err;
      }
    },
    []
  );

  return {
    job,
    loading,
    isInitialLoading,
    error,
    startJob,
  };
}

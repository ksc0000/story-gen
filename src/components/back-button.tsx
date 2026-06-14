"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

/**
 * Universal back control. Uses browser history when possible so the user can
 * always step back one screen. Falls back to `fallbackHref` (or /home) when
 * there is no in-app history to return to (e.g. opened via a deep link).
 */
export function BackButton({
  fallbackHref = "/home",
  label = "戻る",
  className = "",
}: {
  fallbackHref?: string;
  label?: string;
  className?: string;
}) {
  const router = useRouter();

  const handleBack = () => {
    // history.length <= 1 means there is no prior in-app entry to go back to.
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push(fallbackHref);
    }
  };

  return (
    <button
      type="button"
      onClick={handleBack}
      aria-label={label}
      className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-sm font-semibold text-violet-500 transition hover:bg-violet-100/60 hover:text-purple-700 ${className}`}
    >
      <ArrowLeft size={16} />
      {label}
    </button>
  );
}

"use client";

import { useState, useEffect, useRef } from "react";
import { RefreshCcw, Sparkles, ImageOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, type HTMLMotionProps } from "framer-motion";

export interface ViewerImageProps {
  src: string;
  alt: string;
  className?: string;
  dark?: boolean;
  isCinematic?: boolean;
  motionProps?: HTMLMotionProps<"img">;
}

export function ViewerImage({
  src,
  alt,
  className = "h-full w-full object-cover",
  dark = false,
  isCinematic = false,
  motionProps,
}: ViewerImageProps) {
  const [status, setStatus] = useState<"loading" | "loaded" | "error">("loading");
  const [retryKey, setRetryKey] = useState(0);
  const imgRef = useRef<HTMLImageElement | null>(null);

  // Reset status when src or retryKey changes
  useEffect(() => {
    setStatus("loading");
  }, [src, retryKey]);

  // Handle cached image when mounted or changed
  useEffect(() => {
    if (imgRef.current && imgRef.current.complete) {
      if (imgRef.current.naturalWidth !== 0) {
        setStatus("loaded");
      } else {
        setStatus("error");
      }
    }
  }, [src, retryKey]);

  const handleRetry = (e: React.MouseEvent) => {
    e.stopPropagation();
    setRetryKey((k) => k + 1);
    setStatus("loading");
  };

  const currentSrc =
    retryKey > 0 ? `${src}${src.includes("?") ? "&" : "?"}_retry=${retryKey}` : src;

  return (
    <div
      className={`relative h-full w-full overflow-hidden ${
        dark
          ? "bg-gradient-to-br from-[#1a102f] via-[#0f172a] to-[#1e1b4b]"
          : "bg-gradient-to-br from-[#f3e8ff] to-[#e0f2fe]"
      }`}
    >
      {/* Skeleton / Loading indicator */}
      {status === "loading" && (
        <div
          role="status"
          aria-label="絵を準備中"
          className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 p-4"
        >
          <div
            className={`absolute inset-0 animate-pulse ${
              dark ? "bg-purple-900/20" : "bg-purple-200/40"
            }`}
          />
          <div
            className={`relative flex items-center gap-2 rounded-full px-4 py-2 shadow-sm ${
              dark
                ? "bg-black/60 text-purple-200 border border-purple-500/20"
                : "bg-white/80 text-purple-900 border border-purple-100"
            }`}
          >
            <Sparkles className={`size-4 animate-spin ${dark ? "text-purple-300" : "text-purple-600"}`} />
            <span className="text-xs font-semibold tracking-wide">絵を準備中...</span>
          </div>
        </div>
      )}

      {/* Error fallback */}
      {status === "error" && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 p-4 text-center">
          <div
            className={`flex flex-col items-center gap-2 rounded-2xl p-5 backdrop-blur-sm ${
              dark
                ? "bg-black/70 text-purple-100 border border-purple-900/40"
                : "bg-white/90 text-purple-900 shadow-md border border-purple-100"
            }`}
          >
            <ImageOff className={`size-8 ${dark ? "text-purple-400" : "text-purple-500"}`} />
            <p className="text-xs font-medium">画像を読み込めませんでした</p>
            <Button
              type="button"
              variant={dark ? "outline" : "default"}
              size="sm"
              onClick={handleRetry}
              className={`mt-1 flex items-center gap-1.5 rounded-full text-xs font-semibold ${
                dark
                  ? "border-purple-500/40 bg-purple-950/60 text-purple-200 hover:bg-purple-900/80"
                  : "bg-purple-600 text-white hover:bg-purple-700"
              }`}
            >
              <RefreshCcw className="size-3.5" />
              再試行
            </Button>
          </div>
        </div>
      )}

      {/* Image tag */}
      {isCinematic ? (
        <motion.img
          ref={imgRef}
          src={currentSrc}
          alt={alt}
          decoding="async"
          onLoad={() => setStatus("loaded")}
          onError={() => setStatus("error")}
          className={`${className} transition-opacity duration-300 ${
            status === "loaded" ? "opacity-100" : "opacity-0"
          }`}
          {...motionProps}
        />
      ) : (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          ref={imgRef}
          src={currentSrc}
          alt={alt}
          decoding="async"
          onLoad={() => setStatus("loaded")}
          onError={() => setStatus("error")}
          className={`${className} transition-opacity duration-300 ${
            status === "loaded" ? "opacity-100" : "opacity-0"
          }`}
        />
      )}
    </div>
  );
}

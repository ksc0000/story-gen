"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface HelpContent {
  emoji: string;
  title: string;
  subtitle?: string;
  points: string[];
  note?: string;
}

interface HelpModalProps {
  open: boolean;
  onClose: () => void;
  content: HelpContent;
}

export function HelpModal({ open, onClose, content }: HelpModalProps) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/40"
            onClick={onClose}
          />
          {/* Sheet */}
          <motion.div
            key="sheet"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 32 }}
            className="fixed bottom-0 left-0 right-0 z-50 mx-auto max-w-lg rounded-t-3xl bg-white pb-[calc(env(safe-area-inset-bottom,0px)+12px)] shadow-xl"
          >
            {/* Header bar */}
            <div className="flex items-center justify-between px-5 pb-2 pt-4">
              <div className="h-1 w-10 rounded-full bg-slate-200 mx-auto absolute left-1/2 -translate-x-1/2 top-2.5" />
              <div />
              <button
                type="button"
                onClick={onClose}
                className="ml-auto rounded-full p-1.5 text-slate-400 hover:bg-slate-100"
                aria-label="閉じる"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Content */}
            <div className="px-6 pb-6 pt-2">
              <div className="text-center">
                <span className="text-5xl" role="img">{content.emoji}</span>
                <h2 className="mt-3 text-lg font-bold text-purple-900">{content.title}</h2>
                {content.subtitle && (
                  <p className="mt-1 text-sm text-violet-500">{content.subtitle}</p>
                )}
              </div>

              <ul className="mt-5 space-y-3">
                {content.points.map((point, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-slate-600">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-violet-100 text-[10px] font-bold text-violet-600">
                      {i + 1}
                    </span>
                    <span>{point}</span>
                  </li>
                ))}
              </ul>

              {content.note && (
                <div className="mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-xs text-amber-700">
                  {content.note}
                </div>
              )}

              <Button
                variant="ghost"
                className="mt-5 w-full text-violet-500"
                onClick={onClose}
              >
                閉じる
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

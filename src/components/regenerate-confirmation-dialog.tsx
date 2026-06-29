"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, RefreshCcw } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";

interface RegenerateConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isLoading?: boolean;
}

export function RegenerateConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  isLoading = false,
}: RegenerateConfirmationDialogProps) {
  // Portal to document.body so the fixed overlay escapes any transform ancestor
  // (e.g. PageTransition), which would otherwise mis-position the centered
  // desktop dialog. See confirmation-dialog.tsx for the full explanation.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  // Prevent body scroll when dialog is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center sm:p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          />

          {/* Dialog panel */}
          <motion.div
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 60 }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            className="relative z-10 w-full max-w-sm overflow-hidden rounded-t-3xl bg-white p-6 shadow-2xl sm:rounded-3xl"
          >
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full text-violet-400 transition hover:bg-violet-50 hover:text-purple-700"
            >
              <X className="size-4" />
            </button>

            <div className="flex flex-col items-center text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-purple-50 text-purple-600">
                <RefreshCcw className="size-7" />
              </div>

              <h2 className="text-xl font-bold text-purple-900">イラストの再生成</h2>
              <p className="mt-3 text-sm leading-relaxed text-violet-600">
                このページのイラストを再生成しますか？<br />
                （1〜2分かかる場合があります）
              </p>

              <div className="mt-8 flex w-full flex-col gap-2">
                <Button
                  size="lg"
                  className="w-full"
                  onClick={() => {
                    onConfirm();
                    onClose();
                  }}
                  disabled={isLoading}
                >
                  {isLoading ? "送信中..." : "再生成する"}
                </Button>
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full rounded-xl py-3 text-sm font-medium text-violet-400 transition hover:text-violet-600"
                >
                  キャンセル
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}

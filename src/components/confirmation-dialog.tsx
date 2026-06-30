"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, AlertTriangle, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string | React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmPhrase?: string;
  confirmPhrasePlaceholder?: string;
  isLoading?: boolean;
  variant?: "destructive" | "default";
  icon?: React.ReactNode;
}

export function ConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "確認",
  cancelLabel = "キャンセル",
  confirmPhrase,
  confirmPhrasePlaceholder = "こちらに入力してください",
  isLoading = false,
  variant = "default",
  icon,
}: ConfirmationDialogProps) {
  const [inputValue, setInputValue] = useState("");
  // Portal target. Rendering into document.body escapes any ancestor with a
  // `transform` (e.g. PageTransition's framer-motion translate), which would
  // otherwise become the containing block for our `position: fixed` overlay and
  // push the centered desktop dialog off to the side. Mobile bottom-sheet layout
  // hid the bug because it is full-width.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  // Reset input when dialog opens/closes
  useEffect(() => {
    if (!isOpen) {
      setInputValue("");
    }
  }, [isOpen]);

  // Prevent body scroll when dialog is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  const isConfirmDisabled = isLoading || (confirmPhrase ? inputValue !== confirmPhrase : false);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center sm:p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={isLoading ? undefined : onClose}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
          />

          {/* Dialog panel */}
          <motion.div
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 60 }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            className="relative z-10 w-full max-w-md overflow-y-auto rounded-t-[32px] bg-white p-6 shadow-2xl sm:rounded-[32px]" style={{ maxHeight: "90svh" }}
          >
            {/* Close button */}
            {!isLoading && (
              <button
                onClick={onClose}
                className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-violet-400 transition hover:bg-violet-50 hover:text-purple-700"
              >
                <X className="size-5" />
              </button>
            )}

            <div className="flex flex-col items-center text-center">
              <div
                className={`mb-4 flex h-14 w-14 items-center justify-center rounded-full ${
                  variant === "destructive" ? "bg-rose-50 text-rose-500" : "bg-violet-50 text-violet-500"
                }`}
              >
                {icon || <AlertTriangle className="size-7" />}
              </div>

              <h2 className="text-xl font-bold text-purple-900">{title}</h2>
              <div className="mt-3 text-sm leading-relaxed text-violet-600">
                {description}
              </div>

              {confirmPhrase && (
                <div className="mt-6 w-full space-y-3">
                  <p className="text-xs font-medium text-violet-400">
                    確認のため、以下のフレーズを入力してください：
                    <br />
                    <span className="mt-1 inline-block rounded bg-violet-50 px-2 py-0.5 font-bold text-violet-600">
                      {confirmPhrase}
                    </span>
                  </p>
                  <Input
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder={confirmPhrasePlaceholder}
                    className="text-center"
                    disabled={isLoading}
                    autoFocus
                  />
                </div>
              )}

              <div className="mt-8 flex w-full flex-col gap-2 sm:flex-row sm:gap-3">
                <Button
                  variant={variant === "destructive" ? "destructive" : "default"}
                  size="lg"
                  className="order-1 w-full sm:order-2"
                  onClick={onConfirm}
                  disabled={isConfirmDisabled}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 size-4 animate-spin" />
                      実行中...
                    </>
                  ) : (
                    confirmLabel
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="lg"
                  className="order-2 w-full text-violet-400 hover:text-violet-600 sm:order-1"
                  onClick={onClose}
                  disabled={isLoading}
                >
                  {cancelLabel}
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}

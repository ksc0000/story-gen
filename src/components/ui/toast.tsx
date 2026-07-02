"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, XCircle, Info } from "lucide-react";

type ToastType = "success" | "error" | "info";
interface ToastItem {
  id: number;
  type: ToastType;
  message: string;
}

interface ToastApi {
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

const ICONS: Record<ToastType, ReactNode> = {
  success: <CheckCircle2 className="size-5 text-emerald-500" />,
  error: <XCircle className="size-5 text-red-500" />,
  info: <Info className="size-5 text-violet-500" />,
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const push = useCallback((type: ToastType, message: string) => {
    const id = Date.now() + Math.random();
    setToasts((cur) => [...cur, { id, type, message }]);
    setTimeout(() => setToasts((cur) => cur.filter((t) => t.id !== id)), 3200);
  }, []);

  const api: ToastApi = {
    success: (m) => push("success", m),
    error: (m) => push("error", m),
    info: (m) => push("info", m),
  };

  return (
    <ToastContext.Provider value={api}>
      {children}
      {mounted
        ? createPortal(
            <div className="pointer-events-none fixed inset-x-0 bottom-[max(1rem,env(safe-area-inset-bottom))] z-[200] flex flex-col items-center gap-2 px-4">
              <AnimatePresence>
                {toasts.map((t) => (
                  <motion.div
                    key={t.id}
                    initial={{ opacity: 0, y: 16, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.98 }}
                    transition={{ duration: 0.2 }}
                    className="pointer-events-auto flex max-w-sm items-center gap-3 rounded-2xl border border-violet-100 bg-white px-4 py-3 shadow-lg"
                  >
                    {ICONS[t.type]}
                    <span className="text-sm font-medium text-purple-900">{t.message}</span>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>,
            document.body
          )
        : null}
    </ToastContext.Provider>
  );
}

/** グローバルなトースト通知。成功/失敗/情報を統一表示する。 */
export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    // Provider外での呼び出しは無害な no-op（SSR/テスト保険）。
    return { success: () => {}, error: () => {}, info: () => {} };
  }
  return ctx;
}

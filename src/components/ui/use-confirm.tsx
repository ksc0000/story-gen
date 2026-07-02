"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";
import type { ReactNode } from "react";
import { ConfirmationDialog } from "@/components/confirmation-dialog";

export interface ConfirmOptions {
  title: string;
  description: string | ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmPhrase?: string;
  confirmPhrasePlaceholder?: string;
  variant?: "destructive" | "default";
  icon?: ReactNode;
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolveRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback<ConfirmFn>((opts) => {
    setOptions(opts);
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
    });
  }, []);

  const settle = useCallback((value: boolean) => {
    resolveRef.current?.(value);
    resolveRef.current = null;
    setOptions(null);
  }, []);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <ConfirmationDialog
        isOpen={options !== null}
        onClose={() => settle(false)}
        onConfirm={() => settle(true)}
        title={options?.title ?? ""}
        description={options?.description ?? ""}
        confirmLabel={options?.confirmLabel}
        cancelLabel={options?.cancelLabel}
        confirmPhrase={options?.confirmPhrase}
        confirmPhrasePlaceholder={options?.confirmPhrasePlaceholder}
        variant={options?.variant}
        icon={options?.icon}
      />
    </ConfirmContext.Provider>
  );
}

/**
 * Promise ベースの確認ダイアログ。ネイティブ window.confirm の置き換え。
 * 使い方: `if (await confirm({ title, description, variant: "destructive" })) { ... }`
 */
export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (!ctx) {
    throw new Error("useConfirm must be used within a ConfirmProvider");
  }
  return ctx;
}

"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import type { TemplateDoc } from "@/lib/types";

interface TemplatePreviewModalProps {
  template: (TemplateDoc & { id: string }) | null;
  isOpen: boolean;
  onClose: () => void;
}

export function TemplatePreviewModal({ template, isOpen, onClose }: TemplatePreviewModalProps) {
  // Prevent body scroll when modal is open
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

  if (!template) return null;

  const pages = template.fixedStory?.pages ?? [];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative z-10 flex h-full max-h-[80vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl bg-white shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-violet-100 px-6 py-4">
              <div className="flex items-center gap-2">
                <span className="text-xl">{template.icon}</span>
                <h2 className="text-lg font-bold text-purple-900">{template.name} のお話内容</h2>
              </div>
              <button
                onClick={onClose}
                className="rounded-full p-2 text-violet-400 transition hover:bg-violet-50 hover:text-purple-600"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-violet-100">
              {pages.length > 0 ? (
                <div className="space-y-6">
                  {pages.map((page, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-bold text-purple-600">
                          Page {index + 1}
                        </span>
                      </div>
                      <div className="rounded-2xl border border-violet-100 bg-violet-50/50 p-4 text-sm leading-relaxed text-purple-900">
                        {page.textTemplate}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex h-full flex-col items-center justify-center py-12 text-center">
                  <p className="text-sm text-violet-400">お話の内容が登録されていません</p>
                </div>
              )}
            </div>

            <div className="border-t border-violet-100 p-4">
              <Button onClick={onClose} className="w-full">
                とじる
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

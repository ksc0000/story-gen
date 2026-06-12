"use client";

import { motion } from "framer-motion";
import { springDefault } from "@/lib/motion";

interface StepIndicatorProps {
  currentStep: 1 | 2 | 3;
}

const steps = ["テーマ", "内容", "スタイル"];

export function StepIndicator({ currentStep }: StepIndicatorProps) {
  return (
    <div className="flex items-center justify-center gap-2">
      {steps.map((label, i) => {
        const stepNum = i + 1;
        const isActive = stepNum === currentStep;
        const isDone = stepNum < currentStep;
        return (
          <div key={label} className="flex items-center gap-2">
            {i > 0 && (
              <div className="relative h-0.5 w-8 bg-violet-100 overflow-hidden rounded-full">
                {isDone && (
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-purple-400 to-violet-400"
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={springDefault}
                    style={{ transformOrigin: "left" }}
                  />
                )}
              </div>
            )}
            <div className="flex flex-col items-center">
              <motion.div
                className={`flex items-center justify-center rounded-full transition-all ${
                  isActive
                    ? "h-10 w-10 bg-gradient-to-r from-purple-400 to-violet-400 text-white shadow-[0_2px_8px_rgba(167,139,250,0.4)] text-base font-bold"
                    : isDone
                    ? "h-8 w-8 bg-violet-100 text-violet-600 text-sm font-medium"
                    : "h-8 w-8 bg-gray-100 text-gray-400 text-sm font-medium"
                }`}
                animate={isActive ? { scale: [1, 1.05, 1] } : {}}
                transition={isActive ? { duration: 0.5, ease: "easeOut" } : {}}
              >
                {stepNum}
              </motion.div>
              <span className={`mt-1 transition-all ${isActive ? "text-sm text-purple-700 font-bold" : "text-xs text-violet-400"}`}>
                {label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

"use client";

import { motion } from "framer-motion";
import { springDefault } from "@/lib/motion";

interface StepIndicatorProps {
  currentStep: number;
  totalSteps?: number;
}

const DEFAULT_STEP_LABELS_6 = ["主人公", "作り方", "テーマ", "キャラ", "内容", "スタイル"];
const DEFAULT_STEP_LABELS_5 = ["主人公", "作り方", "キャラ", "内容", "スタイル"];
const DEFAULT_STEP_LABELS_3 = ["テーマ", "内容", "スタイル"];

export function StepIndicator({ currentStep, totalSteps = 6 }: StepIndicatorProps) {
  const steps =
    totalSteps === 5
      ? DEFAULT_STEP_LABELS_5
      : totalSteps === 3
      ? DEFAULT_STEP_LABELS_3
      : DEFAULT_STEP_LABELS_6;

  return (
    <div className="flex flex-col items-center gap-2">
      <span className="inline-block rounded-full border border-purple-200 bg-purple-50 px-3 py-0.5 text-xs font-bold text-purple-700">
        全{totalSteps}ステップ中{currentStep}
      </span>
      <div className="flex items-center justify-center gap-1 sm:gap-2">
        {steps.map((label, i) => {
          const stepNum = i + 1;
          const isActive = stepNum === currentStep;
          const isDone = stepNum < currentStep;
          return (
            <div key={label} className="flex items-center gap-1 sm:gap-2">
              {i > 0 && (
                <div className="relative h-0.5 w-3 bg-violet-100 overflow-hidden rounded-full sm:w-6">
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
                  className={`flex h-8 w-8 items-center justify-center rounded-full transition-all sm:h-10 sm:w-10 ${
                    isActive
                      ? "bg-gradient-to-r from-purple-400 to-violet-400 text-white shadow-[0_2px_8px_rgba(167,139,250,0.4)] text-xs font-bold sm:text-base"
                      : isDone
                      ? "bg-violet-100 text-violet-600 text-xs font-semibold sm:text-sm"
                      : "bg-gray-100 text-gray-400 text-xs font-semibold sm:text-sm"
                  }`}
                  animate={isActive ? { scale: [1, 1.05, 1] } : {}}
                  transition={isActive ? { duration: 0.5, ease: "easeOut" } : {}}
                >
                  {stepNum}
                </motion.div>
                <span
                  className={`mt-0.5 transition-all sm:mt-1 ${
                    isActive
                      ? "text-[10px] font-bold text-purple-700 sm:text-xs"
                      : "text-[10px] text-violet-400 sm:text-xs"
                  }`}
                >
                  {label}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

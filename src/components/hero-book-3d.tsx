"use client";

import { motion } from "framer-motion";

export function HeroBook3D() {
  return (
    <div className="flex items-center justify-center p-10" style={{ perspective: "1200px" }}>
      <motion.div
        className="relative h-64 w-48 bg-white shadow-2xl"
        style={{
          transformStyle: "preserve-3d",
          borderRadius: "4px 12px 12px 4px",
        }}
        initial={{ rotateY: -30, rotateX: 10 }}
        animate={{
          rotateY: [-30, -10, -30],
          rotateX: [10, 15, 10],
        }}
        transition={{
          duration: 6,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      >
        {/* Cover */}
        <div
          className="absolute inset-0 z-20 flex flex-col items-center justify-center border-r-4 border-purple-200 bg-gradient-to-br from-purple-500 to-indigo-600 p-4 text-white"
          style={{
            backfaceVisibility: "hidden",
            borderRadius: "4px 12px 12px 4px",
          }}
        >
          <div className="text-4xl mb-2">✨</div>
          <div className="text-xl font-bold text-center">Ehoria</div>
          <div className="mt-4 h-1 w-12 bg-white/30 rounded" />
        </div>

        {/* Back Cover */}
        <div
          className="absolute inset-0 bg-indigo-800"
          style={{
            transform: "rotateY(180deg)",
            borderRadius: "12px 4px 4px 12px",
          }}
        />

        {/* Pages (Stacked) */}
        <div className="absolute inset-y-1 right-0 w-2 bg-slate-100 shadow-inner" style={{ transform: "translateX(2px) rotateY(90deg)" }} />
        <div className="absolute inset-y-1 left-0 w-2 bg-slate-200" style={{ transform: "translateX(-2px) rotateY(-90deg)" }} />
      </motion.div>
    </div>
  );
}

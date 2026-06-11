"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { floatingTransition } from "@/lib/motion";

const PARTICLES = [
  { color: "rgba(253, 224, 71, 0.3)", size: 50, top: "10%", left: "10%" },
  { color: "rgba(240, 171, 252, 0.25)", size: 70, top: "20%", right: "15%" },
  { color: "rgba(103, 232, 249, 0.25)", size: 45, bottom: "25%", left: "25%" },
  { color: "rgba(167, 139, 250, 0.3)", size: 35, top: "50%", right: "25%" },
  { color: "rgba(244, 114, 182, 0.2)", size: 55, bottom: "15%", right: "10%" },
  { color: "rgba(253, 224, 71, 0.2)", size: 40, top: "70%", left: "60%" },
];

/**
 * FloatingParticles
 * デスクトップ専用の装飾アニメーション。
 * タッチデバイス（スマホ）や prefers-reduced-motion 環境では描画スキップ。
 * JS駆動アニメーション(framer-motion)はメインスレッドで動くため、モバイルでは発熱の原因になる。
 */
export function FloatingParticles() {
  const shouldReduceMotion = useReducedMotion();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // タッチデバイス (pointer: coarse) ではスキップして発熱・消費電力を抑える
    const isCoarsePointer = window.matchMedia("(pointer: coarse)").matches;
    if (!isCoarsePointer && !shouldReduceMotion) {
      setIsVisible(true);
    }
  }, [shouldReduceMotion]);

  if (!isVisible) return null;

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {PARTICLES.map((p, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            width: p.size,
            height: p.size,
            background: p.color,
            // blur フィルターは GPU コンポジット操作が重いため除去
            top: p.top,
            left: p.left,
            right: p.right,
            bottom: p.bottom,
          }}
          animate={{
            y: [0, -15, 0],
            rotate: [0, 5, 0],
            scale: [1, 1.05, 1],
          }}
          transition={floatingTransition(i)}
        />
      ))}
    </div>
  );
}

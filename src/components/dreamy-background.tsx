"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";

/**
 * DreamyBackground
 * 夢のような演出を行う背景コンポーネント。
 * AmbientOrbs, FloatingBooks, MagicSparkles で構成。
 *
 * パフォーマンス方針:
 * - タッチデバイス(スマホ)では全アニメーションを無効化（発熱・バッテリー消費対策）
 * - prefers-reduced-motion ユーザーでも削減
 */
export function DreamyBackground() {
  const shouldReduceMotion = useReducedMotion();
  const [isMounted, setIsMounted] = useState(false);
  const [isCoarsePointer, setIsCoarsePointer] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    // pointer: coarse = タッチデバイス（スマホ・タブレット）
    setIsCoarsePointer(window.matchMedia("(pointer: coarse)").matches);
  }, []);

  if (!isMounted) return null;

  // モバイル端末ではアニメーション全停止（発熱・バッテリー消費対策）
  const isMobile = isCoarsePointer;

  return (
    <div className="em-bg" aria-hidden="true">
      <div className="em-bg__gradient" />

      {/* 1. Ambient Orbs: ぼんやりとした光の球体 */}
      <AmbientOrbs count={isMobile ? 0 : shouldReduceMotion ? 2 : 4} />

      {/* 2. Floating Books: 浮遊するミニ絵本 */}
      <FloatingBooks count={isMobile ? 0 : shouldReduceMotion ? 0 : 5} />

      {/* 3. Magic Sparkles: キラキラ */}
      <MagicSparkles count={isMobile ? 0 : shouldReduceMotion ? 5 : 15} />
    </div>
  );
}

function AmbientOrbs({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={`orb-${i}`}
          className="absolute rounded-full"
          style={{
            width: 300 + Math.random() * 200,
            height: 300 + Math.random() * 200,
            background: "radial-gradient(circle, var(--em-glow-color) 0%, transparent 70%)",
            filter: "blur(50px)",
            top: `${Math.random() * 100}%`,
            left: `${Math.random() * 100}%`,
            opacity: 0.2 + Math.random() * 0.3,
          }}
          animate={{
            x: [0, 50, -50, 0],
            y: [0, -30, 30, 0],
            scale: [1, 1.1, 0.9, 1],
          }}
          transition={{
            duration: 15 + i * 5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}
    </>
  );
}

function FloatingBooks({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={`book-${i}`}
          className="absolute flex items-center justify-center text-4xl opacity-20"
          style={{
            top: `${Math.random() * 100}%`,
            left: `${Math.random() * 100}%`,
          }}
          animate={{
            y: [0, -40, 0],
            rotate: [0, 10, -10, 0],
          }}
          transition={{
            duration: 8 + i * 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          📖
        </motion.div>
      ))}
    </>
  );
}

function MagicSparkles({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={`sparkle-${i}`}
          className="absolute rounded-full bg-white shadow-lg"
          style={{
            width: 2 + Math.random() * 4,
            height: 2 + Math.random() * 4,
            top: `${Math.random() * 100}%`,
            left: `${Math.random() * 100}%`,
            boxShadow: "0 0 10px 2px white",
          }}
          animate={{
            opacity: [0, 1, 0],
            scale: [0, 1.5, 0],
          }}
          transition={{
            duration: 2 + Math.random() * 3,
            repeat: Infinity,
            delay: Math.random() * 5,
            ease: "easeInOut",
          }}
        />
      ))}
    </>
  );
}

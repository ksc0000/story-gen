"use client";

import { motion, useMotionValue, useTransform, useSpring } from "framer-motion";
import { cardHover, cardTap, springDefault } from "@/lib/motion";
import { useState } from "react";

interface AnimatedCardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  enable3D?: boolean;
}

export function AnimatedCard({ children, className, onClick, enable3D = true }: AnimatedCardProps) {
  const x = useMotionValue(0.5);
  const y = useMotionValue(0.5);

  const rotateX = useSpring(useTransform(y, [0, 1], [10, -10]), springDefault);
  const rotateY = useSpring(useTransform(x, [0, 1], [-10, 10]), springDefault);

  const glareOpacity = useSpring(useTransform(y, [0, 1], [0.3, 0]), springDefault);
  const glareX = useTransform(x, [0, 1], ["0%", "100%"]);
  const glareY = useTransform(y, [0, 1], ["0%", "100%"]);

  const [isHovered, setIsHovered] = useState(false);

  function onMouseMove(event: React.MouseEvent<HTMLDivElement>) {
    if (!enable3D) return;
    const rect = event.currentTarget.getBoundingClientRect();
    x.set((event.clientX - rect.left) / rect.width);
    y.set((event.clientY - rect.top) / rect.height);
  }

  function onMouseLeave() {
    setIsHovered(false);
    x.set(0.5);
    y.set(0.5);
  }

  return (
    <motion.div
      onMouseMove={onMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={onMouseLeave}
      whileHover={cardHover}
      whileTap={cardTap}
      style={{
        perspective: 1000,
        rotateX: isHovered ? rotateX : 0,
        rotateY: isHovered ? rotateY : 0,
      }}
      className={`relative overflow-hidden transition-shadow duration-300 ${className}`}
      onClick={onClick}
    >
      {/* Glare effect */}
      {enable3D && isHovered && (
        <motion.div
          className="pointer-events-none absolute inset-0 z-10"
          style={{
            background: `radial-gradient(circle at ${glareX} ${glareY}, rgba(255,255,255,0.4) 0%, transparent 80%)`,
            opacity: glareOpacity,
          }}
        />
      )}
      {children}
    </motion.div>
  );
}

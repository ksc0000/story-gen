"use client";

import { motion } from "framer-motion";
import { cardHover, cardTap, springDefault } from "@/lib/motion";

interface AnimatedCardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export function AnimatedCard({ children, className, onClick }: AnimatedCardProps) {
  return (
    <motion.div
      whileHover={cardHover}
      whileTap={cardTap}
      transition={springDefault}
      className={className}
      onClick={onClick}
    >
      {children}
    </motion.div>
  );
}

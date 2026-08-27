"use client";

import { motion } from "framer-motion";
import { staggerContainer } from "@/lib/motion";

interface StaggerContainerProps {
  children: React.ReactNode;
  className?: string;
  role?: string;
  "aria-label"?: string;
}

export function StaggerContainer({ children, className, role, "aria-label": ariaLabel }: StaggerContainerProps) {
  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className={className}
      role={role}
      aria-label={ariaLabel}
    >
      {children}
    </motion.div>
  );
}

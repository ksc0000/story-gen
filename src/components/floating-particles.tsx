"use client";

import { motion } from "framer-motion";
import { floatingTransition } from "@/lib/motion";

const PARTICLES = [
  { color: "rgba(253, 224, 71, 0.3)", size: 50, top: "10%", left: "10%" },
  { color: "rgba(240, 171, 252, 0.25)", size: 70, top: "20%", right: "15%" },
  { color: "rgba(103, 232, 249, 0.25)", size: 45, bottom: "25%", left: "25%" },
  { color: "rgba(167, 139, 250, 0.3)", size: 35, top: "50%", right: "25%" },
  { color: "rgba(244, 114, 182, 0.2)", size: 55, bottom: "15%", right: "10%" },
  { color: "rgba(253, 224, 71, 0.2)", size: 40, top: "70%", left: "60%" },
];

export function FloatingParticles() {
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
            filter: "blur(2px)",
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

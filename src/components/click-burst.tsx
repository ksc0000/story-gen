"use client";

import { motion, AnimatePresence } from "framer-motion";

export interface Burst {
  id: number;
  x: number;
  y: number;
}

const COLORS = ["#A78BFA", "#F0ABFC", "#67E8F9", "#FDE047"];

export function ClickBurst({ bursts }: { bursts: Burst[] }) {
  return (
    <AnimatePresence>
      {bursts.map((burst) => (
        <BurstGroup key={burst.id} burst={burst} />
      ))}
    </AnimatePresence>
  );
}

function BurstGroup({ burst }: { burst: Burst }) {
  return (
    <>
      {Array.from({ length: 8 }).map((_, i) => {
        const angle = (i * 45 * Math.PI) / 180;
        const velocity = 40 + (i % 3) * 20;
        return (
          <motion.div
            key={i}
            initial={{ scale: 0, x: burst.x, y: burst.y, opacity: 1 }}
            animate={{
              x: burst.x + Math.cos(angle) * velocity,
              y: burst.y + Math.sin(angle) * velocity,
              scale: [0, 1, 0.5],
              opacity: 0,
            }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="pointer-events-none absolute h-1.5 w-1.5 rounded-full z-50"
            style={{ backgroundColor: COLORS[i % COLORS.length] }}
          />
        );
      })}
    </>
  );
}

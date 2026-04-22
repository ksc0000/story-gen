import type { Variants, Transition } from "framer-motion";

// --- Spring configs ---
export const springDefault: Transition = { type: "spring", stiffness: 300, damping: 20 };
export const springBouncy: Transition = { type: "spring", stiffness: 400, damping: 15 };

// --- Stagger ---
export const STAGGER_DELAY = 0.1;

export const staggerContainer: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: STAGGER_DELAY },
  },
};

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: "easeOut" },
  },
};

// --- Card interaction ---
export const cardHover = {
  scale: 1.03,
  boxShadow: "0 8px 32px rgba(167,139,250,0.2)",
};

export const cardTap = { scale: 0.97 };

// --- Page transition ---
export const pageVariants: Variants = {
  initial: { opacity: 0, y: 10 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: [0.4, 0, 0.2, 1] },
  },
  exit: {
    opacity: 0,
    y: -10,
    transition: { duration: 0.2 },
  },
};

// --- Floating particles ---
export function floatingTransition(index: number): Transition {
  return {
    duration: 5 + index * 0.5,
    repeat: Infinity,
    ease: "easeInOut",
    delay: index * 0.8,
  };
}

// --- Generation pulse ---
export const pulseVariants: Variants = {
  pulse: {
    scale: [1, 1.05, 1],
    borderColor: ["#c084fc", "#f0abfc", "#c084fc"],
    transition: { duration: 2, repeat: Infinity, ease: "easeInOut" },
  },
};

export const spinVariants: Variants = {
  spin: {
    rotate: 360,
    transition: { duration: 2, repeat: Infinity, ease: "linear" },
  },
};

export const popIn: Variants = {
  hidden: { scale: 0.8, opacity: 0 },
  visible: {
    scale: 1,
    opacity: 1,
    transition: { type: "spring", stiffness: 400, damping: 15 },
  },
};

// --- Reduced motion ---
export const fadeOnly: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.3 } },
};

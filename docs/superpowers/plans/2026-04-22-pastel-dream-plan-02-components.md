# Plan Part 2: New Shared Components (Tasks 4-9)

## Task 4: FloatingParticles コンポーネント

**Files:**
- Create: `src/components/floating-particles.tsx`

- [ ] **Step 1: floating-particles.tsx を作成**

```tsx
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
```

- [ ] **Step 2: ビルド確認**

Run: `npx tsc --noEmit`
Expected: 型エラーなし

- [ ] **Step 3: Commit**

```bash
git add src/components/floating-particles.tsx
git commit -m "feat: add FloatingParticles background decoration component"
```

---

## Task 5: AnimatedCard コンポーネント

**Files:**
- Create: `src/components/animated-card.tsx`

- [ ] **Step 1: animated-card.tsx を作成**

```tsx
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
```

- [ ] **Step 2: Commit**

```bash
git add src/components/animated-card.tsx
git commit -m "feat: add AnimatedCard with hover/tap spring physics"
```

---

## Task 6: StaggerContainer + StaggerItem コンポーネント

**Files:**
- Create: `src/components/stagger-container.tsx`
- Create: `src/components/stagger-item.tsx`

- [ ] **Step 1: stagger-container.tsx を作成**

```tsx
"use client";

import { motion } from "framer-motion";
import { staggerContainer } from "@/lib/motion";

interface StaggerContainerProps {
  children: React.ReactNode;
  className?: string;
}

export function StaggerContainer({ children, className }: StaggerContainerProps) {
  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className={className}
    >
      {children}
    </motion.div>
  );
}
```

- [ ] **Step 2: stagger-item.tsx を作成**

```tsx
"use client";

import { motion } from "framer-motion";
import { fadeUp } from "@/lib/motion";

interface StaggerItemProps {
  children: React.ReactNode;
  className?: string;
}

export function StaggerItem({ children, className }: StaggerItemProps) {
  return (
    <motion.div variants={fadeUp} className={className}>
      {children}
    </motion.div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/stagger-container.tsx src/components/stagger-item.tsx
git commit -m "feat: add StaggerContainer and StaggerItem for entrance animations"
```

---

## Task 7: PageTransition コンポーネント

**Files:**
- Create: `src/components/page-transition.tsx`

- [ ] **Step 1: page-transition.tsx を作成**

```tsx
"use client";

import { motion } from "framer-motion";
import { pageVariants } from "@/lib/motion";

interface PageTransitionProps {
  children: React.ReactNode;
  className?: string;
}

export function PageTransition({ children, className }: PageTransitionProps) {
  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className={className}
    >
      {children}
    </motion.div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/page-transition.tsx
git commit -m "feat: add PageTransition wrapper for page-level fade animations"
```

---

## Task 8: LottieAnimation コンポーネント

**Files:**
- Create: `src/components/lottie-animation.tsx`

- [ ] **Step 1: lottie-animation.tsx を作成**

```tsx
"use client";

import dynamic from "next/dynamic";
import type { LottieComponentProps } from "lottie-react";

const Lottie = dynamic(() => import("lottie-react"), { ssr: false });

interface LottieAnimationProps {
  path: string;
  loop?: boolean;
  autoplay?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export function LottieAnimation({
  path,
  loop = true,
  autoplay = true,
  className,
  style,
}: LottieAnimationProps) {
  return (
    <Lottie
      path={path}
      loop={loop}
      autoplay={autoplay}
      className={className}
      style={style}
    />
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/lottie-animation.tsx
git commit -m "feat: add LottieAnimation wrapper with lazy loading"
```

---

## Task 9: アセットプレースホルダーディレクトリ作成

**Files:**
- Create: `public/images/icons/.gitkeep`
- Create: `public/images/illustrations/.gitkeep`
- Create: `public/animations/.gitkeep`

- [ ] **Step 1: ディレクトリを作成**

Run:
```bash
mkdir -p public/images/icons public/images/illustrations public/animations
touch public/images/icons/.gitkeep public/images/illustrations/.gitkeep public/animations/.gitkeep
```

- [ ] **Step 2: Commit**

```bash
git add public/images public/animations
git commit -m "feat: add asset directories for 3D icons, illustrations, and Lottie animations"
```

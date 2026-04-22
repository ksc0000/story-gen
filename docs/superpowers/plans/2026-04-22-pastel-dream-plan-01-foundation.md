# Plan Part 1: Foundation (Tasks 1-3)

## Task 1: パッケージ追加

**Files:**
- Modify: `package.json`

- [ ] **Step 1: framer-motion と lottie-react をインストール**

Run:
```bash
cd C:/Users/CN63738/story-gen && npm install framer-motion lottie-react
```

Expected: package.json に `framer-motion` と `lottie-react` が追加される。

- [ ] **Step 2: ビルド確認**

Run:
```bash
npm run build
```

Expected: ビルド成功（エラーなし）

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "feat: add framer-motion and lottie-react dependencies"
```

---

## Task 2: CSS変数・フォント・Tailwind設定の書き換え

**Files:**
- Modify: `src/app/globals.css`
- Modify: `src/app/layout.tsx`
- Modify: `tailwind.config.ts`

- [ ] **Step 1: globals.css のCSS変数をパステルドリームカラーに書き換え**

`src/app/globals.css` を以下に完全置換:

```css
@import "tw-animate-css";
@tailwind base;
@tailwind components;
@tailwind utilities;

a {
  color: inherit;
  text-decoration: none;
}

* {
  box-sizing: border-box;
  padding: 0;
  margin: 0;
}

html,
body {
  max-width: 100vw;
  overflow-x: hidden;
}

@layer base {
  :root {
    --background: #fdf2f8;
    --foreground: #581c87;
    --card: #ffffff;
    --card-foreground: #581c87;
    --popover: #ffffff;
    --popover-foreground: #581c87;
    --primary: #a78bfa;
    --primary-foreground: #ffffff;
    --secondary: #67e8f9;
    --secondary-foreground: #581c87;
    --muted: #f3e8ff;
    --muted-foreground: #7c3aed;
    --accent: #f0abfc;
    --accent-foreground: #581c87;
    --destructive: #ef4444;
    --destructive-foreground: #ffffff;
    --border: rgba(240, 171, 252, 0.3);
    --input: rgba(167, 139, 250, 0.2);
    --ring: #a78bfa;
    --radius: 1.25rem;
  }
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
  }
}
```

- [ ] **Step 2: tailwind.config.ts のカラー参照を直接CSS変数参照に変更**

`tailwind.config.ts` を以下に完全置換:

```ts
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        border: "var(--border)",
        input: "var(--input)",
        ring: "var(--ring)",
        background: "var(--background)",
        foreground: "var(--foreground)",
        primary: {
          DEFAULT: "var(--primary)",
          foreground: "var(--primary-foreground)",
        },
        secondary: {
          DEFAULT: "var(--secondary)",
          foreground: "var(--secondary-foreground)",
        },
        destructive: {
          DEFAULT: "var(--destructive)",
          foreground: "var(--destructive-foreground)",
        },
        muted: {
          DEFAULT: "var(--muted)",
          foreground: "var(--muted-foreground)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          foreground: "var(--accent-foreground)",
        },
        popover: {
          DEFAULT: "var(--popover)",
          foreground: "var(--popover-foreground)",
        },
        card: {
          DEFAULT: "var(--card)",
          foreground: "var(--card-foreground)",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [],
};
export default config;
```

- [ ] **Step 3: layout.tsx のフォントを Inter → Zen Maru Gothic に変更**

`src/app/layout.tsx` を以下に完全置換:

```tsx
import type { Metadata } from "next";
import { Zen_Maru_Gothic } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const zenMaru = Zen_Maru_Gothic({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "EhoNAI - AIで絵本を作ろう",
  description: "我が子が主人公になれる絵本を、誰でも5分で作れる。AIが紡ぐ物語と挿絵で、世界にひとつだけの思い出を。",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body className={zenMaru.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

- [ ] **Step 4: ビルド確認**

Run:
```bash
npm run build
```

Expected: ビルド成功。フォントとカラーが変わる。

- [ ] **Step 5: Commit**

```bash
git add src/app/globals.css src/app/layout.tsx tailwind.config.ts
git commit -m "feat: apply pastel dream color system, Zen Maru Gothic font, and updated Tailwind config"
```

---

## Task 3: アニメーション定数ファイル (lib/motion.ts)

**Files:**
- Create: `src/lib/motion.ts`

- [ ] **Step 1: lib/motion.ts を作成**

```tsx
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
```

- [ ] **Step 2: ビルド確認**

Run:
```bash
npx tsc --noEmit
```

Expected: 型エラーなし

- [ ] **Step 3: Commit**

```bash
git add src/lib/motion.ts
git commit -m "feat: add centralized motion constants and animation variants"
```

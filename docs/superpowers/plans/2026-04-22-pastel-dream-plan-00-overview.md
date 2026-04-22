# パステルドリーム デザイン改善 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** EhoNAIの全UIを「パステルドリーム」コンセプトで刷新し、ワクワクするリッチなアニメーション体験を提供する。

**Architecture:** CSS変数でパステルカラー体系を定義し、framer-motionで全ページにスタガー登場・浮遊パーティクル・spring物理カードインタラクションを適用。絵文字を全廃しカスタムアセット（3Dプリレンダーwebp + AI生成イラストwebp + Lottie JSON）に置換。

**Tech Stack:** Next.js 15, React 18, Tailwind CSS 3, shadcn/ui, framer-motion, lottie-react, Zen Maru Gothic

---

## 計画ファイル一覧

| ファイル | 内容 |
|---------|------|
| `plan-00-overview.md` | この概要ファイル |
| `plan-01-foundation.md` | Task 1-3: パッケージ追加、CSS変数、フォント、motion定数 |
| `plan-02-components.md` | Task 4-9: 新規共通コンポーネント6個 |
| `plan-03-ui-theme.md` | Task 10-12: 既存UIコンポーネント（button/card/badge）テーマ更新 |
| `plan-04-pages-landing-auth.md` | Task 13-15: ランディング、ログイン、アプリレイアウト |
| `plan-05-pages-home-create.md` | Task 16-21: ホーム、作成ウィザード3ステップ、コンポーネント改修 |
| `plan-06-pages-generate-book.md` | Task 22-25: 生成中、絵本閲覧、最終検証 |

## 前提: アセット準備（実装前に手動で完了させる）

以下のアセットは外部ツール（Spline, FLUX/Midjourney, LottieFiles）で作成し、実装前に配置する。

```
public/
├── images/
│   ├── icons/          # 3Dプリレンダー webp (14点)
│   │   ├── book.webp
│   │   ├── palette.webp
│   │   ├── shield.webp
│   │   ├── cake.webp
│   │   ├── moon.webp
│   │   ├── mountain.webp
│   │   ├── sakura.webp
│   │   ├── paw.webp
│   │   ├── pan.webp
│   │   ├── star.webp
│   │   ├── house.webp
│   │   ├── watercolor-brush.webp
│   │   ├── digital-pen.webp
│   │   └── crayon.webp
│   └── illustrations/  # AI生成イラスト webp (4点)
│       ├── hero.webp
│       ├── empty-shelf.webp
│       ├── generating.webp
│       └── login-door.webp
└── animations/         # Lottie JSON (3点)
    ├── book-flip.json
    ├── confetti.json
    └── sparkle.json
```

**アセットが未準備の場合**: プレースホルダー（カラー付きdiv）で実装し、アセット到着後に差し替え可能な設計にする。

## ファイル構成マップ

### 新規作成ファイル
| ファイル | 役割 |
|---------|------|
| `src/lib/motion.ts` | アニメーション定数・variants・reduced-motion対応 |
| `src/components/floating-particles.tsx` | 背景浮遊パーティクル |
| `src/components/animated-card.tsx` | hover/tap物理付きカードラッパー |
| `src/components/page-transition.tsx` | AnimatePresenceページ遷移ラッパー |
| `src/components/stagger-container.tsx` | stagger登場の親コンテナ |
| `src/components/stagger-item.tsx` | stagger登場の子アイテム |
| `src/components/lottie-animation.tsx` | Lottie再生ラッパー |

### 改修ファイル
| ファイル | 変更内容 |
|---------|---------|
| `package.json` | framer-motion, lottie-react 追加 |
| `src/app/globals.css` | CSS変数全面書き換え |
| `src/app/layout.tsx` | Inter → Zen Maru Gothic |
| `tailwind.config.ts` | oklch対応に色参照修正 |
| `src/components/ui/button.tsx` | pill型、グラデーション追加 |
| `src/components/ui/card.tsx` | 角丸20px、ソフトシャドウ |
| `src/components/ui/badge.tsx` | パステルカラー化 |
| `src/app/page.tsx` | ランディング全面改修 |
| `src/app/(auth)/login/page.tsx` | パステルデザイン化 |
| `src/app/(app)/layout.tsx` | ヘッダーパステル化 |
| `src/app/(app)/home/page.tsx` | カラー・アニメ改修 |
| `src/app/(app)/create/theme/page.tsx` | カラー・アニメ改修 |
| `src/app/(app)/create/input/page.tsx` | フォーム改修 |
| `src/app/(app)/create/style/page.tsx` | カラー・アニメ改修 |
| `src/app/(app)/generating/page.tsx` | 生成演出改修 |
| `src/app/(app)/book/page.tsx` | 閲覧体験改修 |
| `src/components/book-card.tsx` | AnimatedCard適用 |
| `src/components/theme-card.tsx` | AnimatedCard + アイコン画像化 |
| `src/components/style-picker.tsx` | AnimatedCard + アイコン画像化 |
| `src/components/step-indicator.tsx` | アニメーション追加 |
| `src/components/generation-progress.tsx` | パルス・Lottie追加 |
| `src/components/book-viewer.tsx` | ページ遷移アニメ |

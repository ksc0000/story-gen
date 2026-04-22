# EhoNAI デザイン改善仕様 — パステルドリーム

## 概要

EhoNAI（AI絵本生成アプリ）の全ページUIを「パステルドリーム」コンセプトで刷新する。温かみがあり手作り感のある、ほんわかしたデザインで、ワクワクするリッチなアニメーション体験を提供する。

**コンセプト**: 「雲の上のお部屋」— ふんわりパステルカラー、大きな角丸、柔らかいシャドウ、浮遊感のあるアニメーション。

## 技術スタック変更

| 項目 | Before | After |
|------|--------|-------|
| フォント | Inter | Zen Maru Gothic (Google Fonts) |
| アニメーション | tw-animate-css のみ | framer-motion + tw-animate-css |
| カラー体系 | グレースケール oklch | パステルドリーム CSS変数 |
| UIコンポーネント | shadcn/ui (デフォルト) | shadcn/ui (カスタムテーマ) |

| アイコン | 絵文字ハードコード | カスタムアセット (3Dプリレンダー + AI生成イラスト + Lottie) |

**追加パッケージ**: `framer-motion`, `lottie-react`

## カラーシステム

### メインパレット

| 用途 | カラー | 値 |
|------|--------|-----|
| Background | pink-50 | #fdf2f8 |
| BG Gradient | pink→lavender→sky | linear-gradient(180deg, #fdf2f8, #ede9fe, #e0f2fe) |
| Primary | violet-400 | #a78bfa |
| Accent | fuchsia-300 | #f0abfc |
| Secondary | cyan-300 | #67e8f9 |
| Joy | yellow-300 | #fde047 |
| Card BG | white | #ffffff |
| Card Border | fuchsia-300/30% | rgba(240, 171, 252, 0.3) |

### テキストカラー

| 用途 | カラー | 値 |
|------|--------|-----|
| 見出し | purple-900 | #581c87 |
| サブ見出し/装飾 | violet-600 | #7c3aed |
| 本文 | gray-600 | #4b5563 |
| 補足 | gray-400 | #9ca3af |

### CSS変数マッピング

globals.css の `:root` を以下に書き換え：

```css
:root {
  --background: oklch(0.98 0.01 330);      /* #fdf2f8 */
  --foreground: oklch(0.25 0.05 300);      /* #581c87 近似 */
  --card: oklch(1 0 0);                     /* white */
  --card-foreground: oklch(0.25 0.05 300);
  --primary: oklch(0.65 0.15 290);          /* #a78bfa 近似 */
  --primary-foreground: oklch(1 0 0);
  --secondary: oklch(0.85 0.1 200);         /* #67e8f9 近似 */
  --secondary-foreground: oklch(0.25 0.05 300);
  --accent: oklch(0.78 0.15 320);           /* #f0abfc 近似 */
  --accent-foreground: oklch(0.25 0.05 300);
  --muted: oklch(0.95 0.02 290);
  --muted-foreground: oklch(0.55 0.03 290);
  --destructive: oklch(0.577 0.245 27.325);
  --border: oklch(0.9 0.03 320);
  --input: oklch(0.92 0.02 320);
  --ring: oklch(0.65 0.15 290);
  --radius: 1.25rem;
}
```

## タイポグラフィ

- **フォント**: Zen Maru Gothic（Google Fonts、next/font/google で読み込み）
- **ウェイト**: 400 (本文), 500 (装飾), 700 (見出し)
- **サブセット**: latin, japanese（`subsets: ["latin"]` + `preload` で日本語対応）

```tsx
import { Zen_Maru_Gothic } from "next/font/google";
const zenMaru = Zen_Maru_Gothic({ subsets: ["latin"], weight: ["400", "500", "700"] });
```

## ビジュアルアセット

絵文字を全廃し、カスタムアセットに置き換える。

### アセット種別

| 種別 | 用途 | フォーマット | 配置先 | サイズ目安 |
|------|------|------------|--------|----------|
| 3Dプリレンダー | アイコン・UI要素 | `.webp` | `public/images/icons/` | 各50-100KB |
| AI生成イラスト | 背景・装飾・空状態 | `.webp` | `public/images/illustrations/` | 各100-200KB |
| Lottie | アニメーション要素 | `.json` | `public/animations/` | 各20-50KB |

### 3Dプリレンダーアイコン（Spline等で作成 → webpエクスポート）

**質感**: クレイ（粘土）/ マシュマロ風ソフトマテリアル。パステルドリームカラーで統一。

**必要アイコン一覧:**

| アイコン | 用途 | 説明 |
|---------|------|------|
| 本 | フィーチャーカード「AIが物語を紡ぐ」 | 開いた絵本、柔らかい質感 |
| パレット | フィーチャーカード「プロ品質の挿絵」 | 絵の具パレット+筆 |
| 盾 | フィーチャーカード「安心の安全設計」 | 丸みのある盾、ハートマーク付き |
| ケーキ | テーマ「お誕生日」 | ろうそく付きケーキ |
| 月 | テーマ「おやすみ」 | 三日月+星 |
| 山 | テーマ「冒険」 | 丸い山+旗 |
| 桜 | テーマ「季節のおはなし」 | 桜の花びら |
| 肉球 | テーマ「どうぶつ」 | 猫の肉球 |
| フライパン | テーマ「たべもの」 | 目玉焼き付き |
| 星 | テーマ「がんばったこと」 | キラキラ星メダル |
| 家 | テーマ「かぞく」 | 温かい家+煙突 |
| 水彩筆 | スタイル「水彩画風」 | 水彩筆+水滴 |
| ペン | スタイル「フラット」 | デジタルペン |
| クレヨン | スタイル「クレヨン風」 | カラフルクレヨンセット |

### AI生成イラスト（FLUX / Midjourney で一括生成）

**スタイル統一プロンプトテンプレート:**

```
soft pastel watercolor illustration, dreamy atmosphere,
rounded shapes, gentle lighting, cotton candy color palette
(pink, lavender, mint, soft yellow), white background,
children's book style, kawaii aesthetic, no text,
simple composition, [対象物]
```

**必要イラスト一覧:**

| イラスト | 用途 | プロンプト対象物 |
|---------|------|----------------|
| ヒーローイラスト | ランディングページ上部 | a child reading a magical glowing picture book, surrounded by floating stars and clouds |
| 空の本棚 | ホーム画面の空状態 | an empty cozy bookshelf with a small rabbit peeking out, inviting atmosphere |
| 生成中 | 生成待ち画面の装飾 | magical sparkles forming into a book, whimsical fairy tale creation scene |
| ログイン装飾 | ログイン画面の背景 | a dreamy doorway made of clouds and rainbow light, welcoming entrance |

### Lottieアニメーション

| アニメーション | 用途 | 説明 |
|-------------|------|------|
| 本めくり | ローディング | 本のページがぱらぱらめくれる |
| 紙吹雪 | 生成完了の祝福 | パステルカラーの紙吹雪 |
| キラキラ星 | 生成中の演出 | 小さな星が輝く |

**取得方法**: LottieFiles（既製素材をパステルカラーに調整）or カスタム制作

### 画像最適化

- `next/image` コンポーネントで配信（lazy load, レスポンシブ, webp自動変換）
- アイコン: `width={64} height={64}` 基本、Retina対応で2x素材準備
- イラスト: `width={400} height={300}` 程度、`priority` はヒーローのみ
- Lottie: `lottie-react` で描画、`autoplay` + `loop` 制御

## コンポーネントスタイル

### 共通ルール

- **角丸**: カード 20px / ボタン 9999px (pill) / インプット 12px / バッジ 9999px
- **シャドウ**: カラフルソフトシャドウ `0 4px 20px rgba(色, 0.1)`
- **ボーダー**: `1px solid` + パステルカラー半透明
- **ボタン**: グラデーション背景 `linear-gradient(135deg, #c084fc, #a78bfa)` + white text + pill形状
- **バッジ**: パステル背景 + pill形状

### Card

```
背景: white
角丸: 20px
ボーダー: 1px solid rgba(240, 171, 252, 0.3)
シャドウ: 0 4px 20px rgba(167, 139, 250, 0.1)
```

### Button (Primary)

```
背景: linear-gradient(135deg, #c084fc, #a78bfa)
テキスト: white
角丸: 9999px (pill)
シャドウ: 0 4px 16px rgba(167, 139, 250, 0.4)
ホバー: 明度+5%, シャドウ強化
```

### Badge

```
背景: rgba(167, 139, 250, 0.1)
テキスト: #7c3aed
角丸: 9999px
ボーダー: 1px solid rgba(167, 139, 250, 0.2)
```

## アニメーション設計

### 依存

```json
{ "framer-motion": "^11.x" }
```

### 1. ページ読み込み — スタガー登場

```tsx
const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } }
};
const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } }
};
```

全ページの主要セクションに適用。子要素が0.1秒間隔で下からフェードイン。

### 2. 背景浮遊パーティクル

共通コンポーネント `FloatingParticles` を作成：

- 5〜7個のパステルカラー円（blur付き）
- 各パーティクルが独立タイミングでゆっくり上下移動 + 微回転
- `duration: 5-8s, repeat: Infinity, ease: "easeInOut"`
- ランディングページ・ログイン・作成ウィザードの背景に配置

```tsx
animate={{ y: [0, -15, 0], rotate: [0, 5, 0], scale: [1, 1.05, 1] }}
transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: index * 0.8 }}
```

### 3. カードインタラクション

```tsx
<motion.div
  whileHover={{ scale: 1.03, boxShadow: "0 8px 32px rgba(167,139,250,0.2)" }}
  whileTap={{ scale: 0.97 }}
  transition={{ type: "spring", stiffness: 300, damping: 20 }}
>
```

BookCard, ThemeCard, StylePicker の各カードに適用。

### 4. ページ遷移

`AnimatePresence` + layout wrapper で全ページ共通遷移：

```tsx
const pageVariants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.4, 0, 0.2, 1] } },
  exit: { opacity: 0, y: -10, transition: { duration: 0.2 } }
};
```

### 5. 生成中ページの演出

- 現在生成中のカード: `scale: [1, 1.05, 1]` パルス + ボーダー色アニメ
- 完了カード: `scale: [0.8, 1.1, 1]` のポップイン
- 星アイコン: `rotate: 360` 回転（2秒周期）
- プログレスバー: グラデーション `violet→fuchsia→cyan` アニメーション

### 6. ステップインジケーター

- 完了ステップ: チェックマークがポップイン（scale bounce）
- アクティブステップ: 軽い pulse 光彩
- 接続線: 左から右へ色が埋まるアニメーション

## ページ別変更詳細

### ランディングページ (`src/app/page.tsx`)

- 背景: `from-amber-50 to-orange-50` → パステルグラデ + FloatingParticles
- タイトル: amber-900 → purple-900, スタガー登場
- CTA: amber角丸ボタン → violet pill グラデボタン + シャドウ
- フィーチャーカード: 絵文字 → 3Dプリレンダーアイコン、amber-200ボーダー → パステルシャドウカード + stagger + hover

### ログインページ (`src/app/(auth)/login/page.tsx`)

- 背景: パステルグラデ + 浮遊パーティクル
- ログインカード: 白背景 + 大角丸 + ソフトシャドウ + 中央配置
- Googleボタン: hover scale アニメ

### ホームページ (`src/app/(app)/home/page.tsx`)

- 見出し: amber-900 → purple-900
- ボタン: amber → violet pill グラデ
- バッジ: amber系 → violet系
- BookCardグリッド: stagger登場
- 空状態: 絵文字 → AI生成「空の本棚」イラスト + fadeIn演出

### 作成ウィザード (`src/app/(app)/create/`)

- StepIndicator: アニメーション付き（ステップ進行時にbounce）
- ThemeCard: 絵文字 → 3Dプリレンダーアイコン、hover浮き上がり + 選択時バウンス + ring色をvioletに
- StylePicker: 絵文字 → 3Dプリレンダーアイコン（水彩筆/ペン/クレヨン）+ カラーパレットdotにhover拡大
- 入力フォーム: input角丸化 + フォーカス時glowリング

### 生成中ページ (`src/app/(app)/generating/page.tsx`)

- 背景: lavender系グラデ
- ページカードグリッド: 生成中パルス + 完了ポップイン
- Lottie「キラキラ星」アニメーション
- プログレス表示のグラデーションアニメ
- 完了時: Lottie「紙吹雪」祝福演出

### 絵本閲覧ページ (`src/app/(app)/book/page.tsx`)

- ページ画像: フェードイン表示
- ページ送り: 左右スライドアニメ（AnimatePresence）
- テキスト: stagger登場

## 新規共通コンポーネント

| コンポーネント | 配置 | 役割 |
|--------------|------|------|
| `FloatingParticles` | `src/components/floating-particles.tsx` | 背景浮遊パーティクル |
| `AnimatedCard` | `src/components/animated-card.tsx` | hover/tap物理付きカードラッパー |
| `PageTransition` | `src/components/page-transition.tsx` | AnimatePresenceページ遷移ラッパー |
| `StaggerContainer` | `src/components/stagger-container.tsx` | stagger登場の親コンテナ |
| `StaggerItem` | `src/components/stagger-item.tsx` | stagger登場の子アイテム |
| `LottieAnimation` | `src/components/lottie-animation.tsx` | Lottie再生ラッパー（lazy load対応） |

## 変更対象ファイル一覧

### アセット（実装前に作成）
- `public/images/icons/` — 3Dプリレンダーアイコン14点（webp）
- `public/images/illustrations/` — AI生成イラスト4点（webp）
- `public/animations/` — Lottieアニメーション3点（json）

### 設定・スタイル
- `package.json` — framer-motion, lottie-react 追加
- `src/app/globals.css` — CSS変数全面書き換え
- `src/app/layout.tsx` — フォント変更 (Inter → Zen Maru Gothic)

### 共通コンポーネント（新規）
- `src/components/floating-particles.tsx`
- `src/components/animated-card.tsx`
- `src/components/page-transition.tsx`
- `src/components/stagger-container.tsx`
- `src/components/stagger-item.tsx`

### 既存コンポーネント改修
- `src/components/ui/button.tsx` — スタイル変更
- `src/components/ui/card.tsx` — 角丸・シャドウ変更
- `src/components/ui/badge.tsx` — カラー変更
- `src/components/book-card.tsx` — AnimatedCard適用 + カラー変更
- `src/components/theme-card.tsx` — AnimatedCard適用 + カラー変更
- `src/components/style-picker.tsx` — AnimatedCard適用 + カラー変更
- `src/components/step-indicator.tsx` — アニメーション追加 + カラー変更
- `src/components/generation-progress.tsx` — パルス/星回転追加
- `src/components/book-viewer.tsx` — ページ遷移アニメ追加

### ページ改修
- `src/app/page.tsx` — ランディング全面改修
- `src/app/(auth)/login/page.tsx` — デザイン改修
- `src/app/(app)/home/page.tsx` — カラー・アニメ改修
- `src/app/(app)/create/theme/page.tsx` — カラー・アニメ改修
- `src/app/(app)/create/input/page.tsx` — カラー・フォーム改修
- `src/app/(app)/create/style/page.tsx` — カラー・アニメ改修
- `src/app/(app)/generating/page.tsx` — 生成演出改修
- `src/app/(app)/book/page.tsx` — 閲覧体験改修

## ロードマップ向け基盤整備

今回のデザイン改善時に、将来フェーズのために仕込んでおく項目。

### 1. アクセシビリティ: `prefers-reduced-motion` 対応

Framer Motionの `useReducedMotion` フックで一括制御。アニメーション無効時はフェードのみにフォールバック。

```tsx
// lib/motion.ts
import { useReducedMotion } from "framer-motion";
export function useMotionSafe() {
  const shouldReduce = useReducedMotion();
  return shouldReduce ? reducedVariants : fullVariants;
}
```

### 2. アニメーション定数集約 (`lib/motion.ts`)

全コンポーネントがここから参照。トーン調整が1ファイルで完結。

```tsx
export const spring = { stiffness: 300, damping: 20 };
export const stagger = 0.1;
export const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};
export const cardHover = { scale: 1.03, boxShadow: "0 8px 32px rgba(167,139,250,0.2)" };
export const cardTap = { scale: 0.97 };
```

## 実装順序

1. **アセット生成フェーズ**（実装前）
   - 3Dアイコン14点をSpline等で作成 → webpエクスポート
   - AI生成イラスト4点をFLUX/Midjourneyで作成 → webp最適化
   - Lottieアニメーション3点を取得/作成
2. **基盤フェーズ**
   - パッケージ追加 (framer-motion, lottie-react)
   - フォント変更、CSS変数書き換え、lib/motion.ts作成
3. **コンポーネントフェーズ**
   - 新規共通コンポーネント5+1個作成
   - 既存UIコンポーネント（button, card, badge）テーマ更新
4. **ページ改修フェーズ**
   - 全8ページのカラー・アイコン・アニメーション適用
5. **検証フェーズ**
   - ビルド確認、レスポンシブ確認、アニメーション動作確認

## スコープ外

- ダークモード対応（将来フェーズ、CSS変数切り替え基盤は今回整備済み）
- モバイルアプリ対応
- パフォーマンス最適化（必要に応じて後続対応）
- 新機能追加（デザインのみ変更、機能は維持）
- i18n対応（将来フェーズ）

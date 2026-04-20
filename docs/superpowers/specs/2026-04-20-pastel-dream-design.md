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

**追加パッケージ**: `framer-motion` のみ

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
- フィーチャーカード: amber-200ボーダー → パステルシャドウカード + stagger + hover

### ログインページ (`src/app/(auth)/login/page.tsx`)

- 背景: パステルグラデ + 浮遊パーティクル
- ログインカード: 白背景 + 大角丸 + ソフトシャドウ + 中央配置
- Googleボタン: hover scale アニメ

### ホームページ (`src/app/(app)/home/page.tsx`)

- 見出し: amber-900 → purple-900
- ボタン: amber → violet pill グラデ
- バッジ: amber系 → violet系
- BookCardグリッド: stagger登場
- 空状態: 絵文字→ もう少し大きく + fadeIn演出

### 作成ウィザード (`src/app/(app)/create/`)

- StepIndicator: アニメーション付き（ステップ進行時にbounce）
- ThemeCard: hover浮き上がり + 選択時バウンス + ring色をvioletに
- StylePicker: 同上 + カラーパレットdotにhover拡大
- 入力フォーム: input角丸化 + フォーカス時glowリング

### 生成中ページ (`src/app/(app)/generating/page.tsx`)

- 背景: lavender系グラデ
- ページカードグリッド: 生成中パルス + 完了ポップイン
- 星アイコン回転
- プログレス表示のグラデーションアニメ

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

## 変更対象ファイル一覧

### 設定・スタイル
- `package.json` — framer-motion 追加
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

## スコープ外

- ダークモード対応（将来フェーズ）
- モバイルアプリ対応
- パフォーマンス最適化（必要に応じて後続対応）
- 新機能追加（デザインのみ変更、機能は維持）

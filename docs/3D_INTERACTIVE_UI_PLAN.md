# 3D_INTERACTIVE_UI_PLAN.md

## 概要
ライブラリを追加せず、CSS 3D と `framer-motion` の機能のみでリッチな 3D インタラクションを実現する。

## 実装項目

### 1. AnimatedCard の 3D Tilt + Glare
- `framer-motion` の `useMotionValue`, `useTransform` を使用して、マウス位置に応じた傾きを実装。
- カード表面に光の反射（Glare）を表現するオーバーレイを追加。

### 2. HeroBook3D コンポーネント
- LP/ヒーローセクション用に、3Dに見える本のオブジェクトを作成。
- `perspective`, `rotateY` などを駆使して、本が開くようなアニメーションを実装。

### 3. CTAボタンの 3D 押し込み
- `active` 時に `translateZ` や `box-shadow` を変化させ、深く押し込まれたような感触を与える。
- クリック時にパーティクルが弾ける（burst）演出を `framer-motion` で追加。

### 4. スクロールパララックス
- `framer-motion` の `useScroll`, `useTransform` を使い、背景要素や浮遊アイテムに奥行きを感じさせる視差効果を追加。

## 注意事項
- **既存アニメーションの維持**: `StaggerContainer`, `StaggerItem`, `AnimatedCard` 等の既存の動きを壊さないよう、プロパティを拡張する。
- **パフォーマンス**: 3D変換は `will-change: transform` を適切に設定し、描画負荷を抑える。

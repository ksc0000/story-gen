# DREAMY_BACKGROUND_SPEC.md

## 概要
絵本の世界観を強化するため、従来の `FloatingParticles` を拡張し、より「夢のような」演出を行う `DreamyBackground` を導入する。

## コンポーネント構成
`src/components/dreamy-background.tsx` を新設し、以下の要素をレイヤーとして重ねる。

1. **AmbientOrbs**: ぼんやりとした光の球体。ゆっくりと浮遊・拡大縮小する。
2. **FloatingBooks**: ミニサイズの絵本アイコン。回転しながら浮遊する。
3. **MagicSparkles**: キラキラとした小さな点。点滅しながら移動する。
4. **ForegroundSparkles**: コンテンツの手前に配置する非常に薄いキラキラ（オプション）。

## 技術仕様
- **アニメーション**: `framer-motion` を使用。
- **パフォーマンス**:
  - DOM要素数は合計50個以内に抑える。
  - `transform` と `opacity` のみを使用してGPU負荷を軽減。
  - モバイル端末では `isMobile` フラグ等で要素数を30%程度に削減。
- **アクセシビリティ**:
  - `prefers-reduced-motion: reduce` の場合はアニメーションを停止、または静的な配置にフォールバックする。
- **配置**: `z-index` を調整し、コンテンツの背後に配置する。

## デザイン詳細
- カラー: テーマの `--em-particle-color` や `--em-glow-color` を参照。
- 動き: 規則的な動きではなく、`Math.random()` を活用したランダムな浮遊感。

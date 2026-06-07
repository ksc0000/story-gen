# EHON_MAGIC_CSS_REDESIGN.md

## 概要
EhoNAI / ehon-magic.css のカラースキームを刷新し、絵本らしい温かみのある世界観を実現しつつ、アクセシビリティ（コントラスト）を改善する。

## カラースキーム刷新方針
デフォルトテーマを `pastel` に変更し、既存の紫・暗色中心の表現から、明るく清潔感のある表現へ移行する。

### 新体系のCSS変数 (Design Tokens)
意味論的な命名に整理し、保守性を高める。

```css
:root {
  --em-bg-base:        #fdf2f8; /* 背景（最背面） */
  --em-bg-mid:         #ede9fe; /* 背景（中間層） */
  --em-bg-surface:     #ffffff; /* カード等の表面色 */
  --em-text-primary:   #4c1d95; /* 本文（高コントラスト） */
  --em-text-secondary: #6d28d9; /* 補助テキスト */
  --em-accent-primary: #a78bfa; /* プライマリアクセント */
  --em-glow-color:     rgba(167, 139, 250, 0.4);
  --em-particle-color: rgba(167, 139, 250, 0.6);
}
```

### テーマ定義の整理
- **pastel**: デフォルトテーマ。明るいパステルカラー基調。
- **night**: 「おやすみ絵本」テーマ。既存の `night` をベースにコントラストを調整。
- **starry**: 廃止。 `night` に統合する。

### コントラスト改善
- テキストカラーを見直し、WCAG AA (4.5:1) 以上のコントラストを確保する。
- 既存の `--em-text-secondary` や `--em-text-dim` が薄すぎる箇所を修正。

### 実装手順
1. `src/styles/ehon-magic.css` の `:root` を整理。
2. `[data-theme="pastel"]` と `[data-theme="night"]` の各変数を定義。
3. `src/app/globals.css` の shadcn/ui マッピングを更新。

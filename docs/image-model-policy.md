# 画像生成モデル方針

- `ENABLE_FLUX_KLEIN` は廃止しました。
- `light` / `standard` はどちらも `black-forest-labs/flux-2-klein-9b` を使います。
- `premium` は `black-forest-labs/flux-2-pro` を使います。
- `flux-schnell` は通常生成では使いません。
- 子どもキャラ生成 (`child_avatar` / `child_avatar_revision`) は引き続き `black-forest-labs/flux-2-pro` を使います。

補足:

- 管理者向け比較画面では `light` と `standard` が同じモデルになるため、主比較は `light or standard` と `premium` です。
- `flux-schnell` の入力 schema は緊急時の legacy fallback としてコード上に残していますが、通常ルートでは選択されません。
- ページ間の見た目の揺れを減らすため、参照画像を渡すページは `characterConsistencyMode` で制御します。
  - `cover_only`: 表紙または key image のみ
  - `key_pages`: 表紙、中盤〜後半の感情ピーク、最終ページ
  - `all_pages`: 全ページ
- 現在の品質検証フェーズでは、主人公の揺らぎを減らすために `characterConsistencyMode` を全プランで `all_pages` に寄せています。
- 原価最適化は後で `key_pages` / `cover_only` を再検討し、まずは全ページ参照画像で一貫性改善量を検証します。
- 今回の品質改善はモデル切替ではなく、story quality gate により本文量・文数・絵本らしい構成を検査する方向で進めます。

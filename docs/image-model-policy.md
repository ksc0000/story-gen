# 画像生成モデル方針

- `ENABLE_FLUX_KLEIN` は廃止しました。
- `light` / `standard` はどちらも `black-forest-labs/flux-2-klein-9b` を使います。
- `premium` は `black-forest-labs/flux-2-pro` を使います。
- `flux-schnell` は通常生成では使いません。
- 子どもキャラ生成 (`child_avatar` / `child_avatar_revision`) は引き続き `black-forest-labs/flux-2-pro` を使います。
- Gemini はページ別ではなく、**1冊分の story JSON をまとめて1回で生成** します。
- 各ページの画像生成は **ページごとに Replicate を呼ぶ** ため、ページ間の人物揺らぎは主に画像生成側の問題として扱います。

補足:

- 管理者向け比較画面では `light` と `standard` が同じモデルになるため、主比較は `light or standard` と `premium` です。
- 検証用の `ImageModelProfile` として、`klein_fast` / `klein_base` / `pro_consistent` / `kontext_reference` を扱えるようにしています。
- `klein_fast` は安価で速い反面、顔・手足・背景の破綻が出やすいため、`klein_base` / `pro_consistent` / `kontext_reference` と比較検証します。
- `flux-schnell` の入力 schema は緊急時の legacy fallback としてコード上に残していますが、通常ルートでは選択されません。
- ページ間の見た目の揺れを減らすため、参照画像を渡すページは `characterConsistencyMode` で制御します。
  - `cover_only`: 表紙または key image のみ
  - `key_pages`: 表紙、中盤〜後半の感情ピーク、最終ページ
  - `all_pages`: 全ページ
- 現在の品質検証フェーズでは、少なくとも `standard_paid` / `premium_paid` を `all_pages` に寄せ、全ページ参照画像で主人公の揺らぎがどれだけ減るかを確認します。
- `free` / `light_paid` は当面 `key_pages` を維持しつつ、管理者検証では `all_pages` や profile 比較で差分を見ます。
- 今回の品質改善はモデル切替ではなく、story quality gate により本文量・文数・絵本らしい構成を検査する方向で進めます。

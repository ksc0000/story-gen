# 画像生成モデル方針

- `ENABLE_FLUX_KLEIN` は廃止しました。
- `light` / `standard` はどちらも `black-forest-labs/flux-2-klein-9b` を使います。
- `premium` は `black-forest-labs/flux-2-pro` を使います。
- `flux-schnell` は通常生成では使いません。
- 子どもキャラ生成 (`child_avatar` / `child_avatar_revision`) は引き続き `black-forest-labs/flux-2-pro` を使います。

補足:

- 管理者向け比較画面では `light` と `standard` が同じモデルになるため、主比較は `light or standard` と `premium` です。
- `flux-schnell` の入力 schema は緊急時の legacy fallback としてコード上に残していますが、通常ルートでは選択されません。

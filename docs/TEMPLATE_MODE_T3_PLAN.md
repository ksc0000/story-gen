# Template Mode T3 Plan (Pre-implementation)

作成日: 2026-05-12  
対象リポジトリ: `ksc0000/story-gen`  
ステータス: planned (implementation pending)

---

## 0. Context

前提:

- fixed_template 10本体制は完了（T2-A / T2-B / T2-C）
- seed追加 / Firestore同期 / smoke は完了
- sync script / smoke script は fixed_template 全件追従済み
- UX-001 / ADMIN-001 / UI-002 / MSG-001 は resolved
- IMG-001 は MITIGATED_WITH_MINOR_FOLLOW_UP
- IMG-002 は VERIFIED_WITH_MINOR_FOLLOW_UP
- REF-001 は R1 Design 完了（設計のみ）

---

## 1. T3 Candidate Scope

### 1) Template selection UI 改善

- 10本テンプレートをカテゴリ別に選びやすくする
- bedtime / daily-life / imagination / growth-support などのグルーピング
- 推奨テンプレート表示
- smoke済み / stable badge 概念

### 2) 既存10テンプレート品質磨き込み

- 画像promptの scene anchor 強化
- 本文の読み聞かせ自然さ改善
- page 4 closing message の自然さ改善
- no-text artifact の minor follow-up

### 3) 8ページ / 12ページ対応

- fixed_template pageCount 拡張
- Reader UI / generation flow / smoke checklist への影響整理
- コスト / 生成時間 / 失敗率への影響評価

### 4) Admin quality review 連携強化

- templateId / source filter は実装済み
- 次段で template quality score / visual issue tags / smoke evidence link を設計

---

## 2. Recommended Order

推奨順序:

1. T3-1: Template selection UI改善
2. T3-2: 既存10本の品質磨き込み
3. T3-3: 8/12ページ対応（後続）

補足:

- T3-4（Admin連携強化）は T3-2 と並走可能だが、初手はユーザー体験改善を優先
- T3-3 は影響範囲が広いため、T3-1 / T3-2 で現行4ページ品質を固めてから着手

---

## 3. Why This Order

### T3-1 を先にやる理由

- 既存10本の価値を最短でユーザー体験に反映できる
- 失敗率に大きく触れずに改善効果を出しやすい

### T3-2 を次にやる理由

- 画像・本文品質の底上げは販売品質に直結
- IMG-001 minor follow-up を安全に継続できる

### T3-3 を後ろに置く理由

- 影響範囲が大きい（生成時間・失敗率・UI・運用チェックリスト）
- 先に4ページ運用を安定させたほうが品質評価がしやすい

---

## 4. Phase Plan (No Implementation Yet)

### Phase T3-1: Selection UX

- カテゴリグルーピング
- 推奨テンプレート導線
- stable/smoke badge 表示仕様

Definition of done:

- 10本を迷わず選べる UI 情報設計が成立
- 既存導線を壊さず適用可能

### Phase T3-2: Template Quality Polish

- scene anchor 表現の磨き込み
- closing message の自然さ確認
- no-text artifact の minor tuning 方針

Definition of done:

- 重大な可読文字混入なし（現状維持以上）
- 代表テンプレートの読み聞かせ自然さが改善

### Phase T3-3: 8/12 Page Expansion

- pageCount 拡張設計
- 生成時間/失敗率/コスト評価
- smoke checklist 拡張案

Definition of done:

- 8/12ページを段階導入できる設計が成立
- SLO 悪化リスクに対する運用策が明示される

---

## 5. Dependencies and Risks

依存:

- REF-001 の設計内容（identity-only reference）
- IMG-001/IMG-002 の follow-up 結果

主要リスク:

- UI改善だけ先行しても品質課題が見えづらくなる
- 8/12ページ導入で生成時間・失敗率が悪化する可能性
- 評価指標なしで品質磨き込みを進めると改善効果が測れない

緩和:

- T3-1 の時点で最小限の観測指標（選択率・完了率）を定義
- T3-2 で template 単位のレビュー観点を固定
- T3-3 は small rollout 前提

---

## 6. Non-goals (This Plan)

- 今回は実装しない
- provider 変更はしない
- 既存生成済み book を再生成しない
- Firestore rules や Functions 実装には入らない

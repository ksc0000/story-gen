# Character Reference Strategy (REF-001)

作成日: 2026-05-12  
対象リポジトリ: `ksc0000/story-gen`  
ステータス: design-in-progress

---

## 1. Problem Statement: Background and Composition Leakage

The current implementation of character reference images often leads to unintentional "leakage" where background elements, specific poses, or compositional biases from the reference photo are inadvertently transferred into the generated storybook illustrations. For instance, a child photographed in a sandbox or playground might cause those specific environments to appear in scenes where they don't belong, such as an animal adventure at the zoo.

This leakage is a significant issue because it:
- Compromises story consistency by introducing conflicting environmental elements.
- Reduces artistic quality by forcing the AI model to merge disparate visual contexts.
- Limits the creative flexibility of the generation pipeline by over-constraining the scene's composition.

While IMG-002 (prompt-level character reference isolation) introduced basic prompt-based mitigations to instruct the model to focus on identity, these are often insufficient to override the strong visual cues present in the reference images themselves. A more structural solution is required to truly isolate the character's visual identity.

---

## 2. Proposed Solution Overview: Identity-Only Reference Strategy

The "Identity-Only Reference Strategy" aims to decouple a character's visual identity from their environmental context, pose, and composition. By strictly separating "who" the character is from "where" they are and "what" they are doing, we can ensure consistent character representation across diverse story settings without unwanted background leakage.

The core components of this strategy include:

- **Neutral Reference Images**: Standardized, context-free images of the character. These images should ideally feature a neutral pose (e.g., standing), a plain or transparent background, and uniform lighting. Their sole purpose is to provide the AI model with a clear, unambiguous visual definition of the character's facial features, hair, and attire.
- **Character Sheets (Conceptual)**: A collection of technical directives and potentially multiple neutral reference images captured from different angles or with various expressions. This "sheet" serves as the definitive visual anchor for the character throughout the entire book generation process.

By transitioning to this identity-only approach, we expect to significantly reduce background and composition leakage, resulting in higher-quality illustrations that strictly adhere to the intended story scene while maintaining perfect character consistency.

Note that this is currently a "design-in-progress," and the subsequent sections of this document will detail the specific implementation steps and technical requirements.

---

## 3. Problem

現在の child reference image は、顔・髪型・服装だけでなく、背景・場所・構図・小物・照明までモデルに拾われる可能性がある。

- IMG-002 で、sandbox/playground 背景が `fixed-first-zoo` の動物園シーンにリークするリスクを確認
- prompt-level reference isolation により軽減済み
- ただし根本的には、入力 reference 自体を背景非依存に寄せる必要がある

---

## 4. Goal

Reference image を character identity のみに使える状態にする。

Preserve:

- face
- hairstyle
- outfit
- age impression
- body proportions
- general character identity

Do not preserve:

- background
- playground / sandbox / room
- props
- lighting
- camera angle
- pose
- composition
- text / signage

---

## 5. Neutral Reference Image Spec

推奨仕様:

- plain white / transparent / very light neutral background
- no text
- no logo
- no signage
- no props
- no playground / sandbox / room background
- full body or half body
- front-facing or slight 3/4 view
- natural standing pose
- soft even lighting
- child-safe illustration style
- consistent outfit if user selected one

補足:

- neutral reference image は「scene を説明しない素材」として扱う
- 表情差分は将来の character sheet 拡張で管理する

---

## 6. Data Model Draft

`childProfiles/{childId}`

- `referenceImageUrl`
- `neutralReferenceImageUrl`
- `referenceImageStatus`: `not_started | generating | completed | failed`
- `referenceImageVersion`
- `referenceImageGeneratedAtMs`
- `referenceImageSource`: `upload | generated | edited`
- `referenceImagePrompt`
- `referenceImageFailureReason`

BookDoc snapshot:

- `childProfileSnapshot.visualProfile.referenceImageUrl`
- `childProfileSnapshot.visualProfile.neutralReferenceImageUrl`
- `childProfileSnapshot.visualProfile.referenceImageVersion`

設計方針:

- Book 生成時は snapshot 優先で参照（生成中の profile 変化に引きずられない）
- `referenceImageVersion` で追跡し、品質差分の原因分析を可能にする

---

## 7. Generation Flow Options

### Option A: 子ども登録時に neutral reference を生成

Pros:

- 生成前に素材が揃うため runtime 分岐が単純
- 最初の book から安定した参照品質を期待できる

Cons:

- 登録導線が長くなる
- 登録離脱の可能性

### Option B: 初回絵本生成前に neutral reference を生成

Pros:

- onboarding は軽いまま維持
- 実際に生成するユーザーにだけコストを使える

Cons:

- 初回生成時間が伸びる
- 前段失敗時のリトライ導線設計が必要

### Option C: ユーザーアップロード画像を neutralization（背景除去/弱化）

Pros:

- ユーザー素材を活かしつつ背景リークを低減できる
- 補正品質が高ければ identity 維持に有利

Cons:

- 画像処理コストと失敗ケースが増える
- privacy / safety の取り扱い要件が増える

推奨:

- Phase R3 までは Option B を主軸
- Option C は補助的 fallback として検証

---

## 8. Prompt Policy

Reference image use:

- Use `neutralReferenceImageUrl` first
- Fallback to `referenceImageUrl` only if neutral is unavailable
- Always include identity-only instruction
- Always ignore reference background

Prompt guardrails:

- scene/background の主導権は template/page prompt 側に置く
- reference は identity consistency のみに使う
- no-text / no-signage policy は継続

---

## 9. Mode-specific Handling

### fixed_template

- 既存の scene lock + no-text policy を維持
- `neutralReferenceImageUrl` を優先し、未用意時のみ通常 reference fallback
- 目的は「テンプレ構図を崩さず identity だけ維持」

### guided_ai

- dynamic prompt でも identity-only 指示を固定で注入
- scene 指示はユーザー入力 + model prompt を優先

### original_ai

- 自由度は高いが、reference 利用時は同じ優先順位を適用
- creative freedom を残しつつ背景リークを抑える

---

## 10. Smoke / Quality Criteria (Acceptance)

Acceptance criteria:

- `fixed-first-zoo` で sandbox leakage が起きない
- `fixed-rainy-day-puddle` で参照背景が雨の日シーンを邪魔しない
- `fixed-cardboard-rocket` で参照背景ではなく playroom/rocket scene が優先される
- `inputReferenceCount > 0`
- `usedCharacterReference = true`
- child identity remains recognizable
- no major text/sign artifacts

判定レベル:

- pass: scene priority と identity consistency が両立
- pass with follow-up: 軽微な artifact はあるが blocking ではない
- fail: scene leakage が繰り返し再現し、品質ゲートに抵触

---

## 11. Rollout Plan

### Phase R1: Design only / docs

- 本ドキュメント確定
- 既存 policy とロードマップ整合

### Phase R2: Data model + admin diagnostics

- data model フィールド追加設計
- admin で reference source/version を可視化する診断項目を定義

### Phase R3: Neutral reference generation / upload flow

- Option B 中心で neutral reference 作成導線を追加
- fallback 設計（通常 reference / no-reference）を定義

### Phase R4: Generation pipeline integration

- neutral first / fallback second を生成パイプラインへ統合
- mode 別ルール（fixed/guided/original）を接続

### Phase R5: Smoke verification and quality review

- representative templates で leakage 再発有無を検証
- acceptance criteria を満たすまで minor tuning

---

## 12. Risks

- identity が弱くなる
- neutral reference 生成コストが増える
- processing time が増える
- privacy considerations
- bad neutral reference が全生成に影響する
- fallback 設計不足で失敗率が増える

対策メモ:

- neutral 失敗時は通常 reference へ fallback
- diagnostics で reference source/version を追跡
- rollout は small-scope smoke で段階適用

---

## 13. Non-goals

- 今回すぐ実装しない
- provider 変更しない
- ControlNet / LoRA / face embedding 等は現時点で扱わない
- 既存 book は更新しない
- 既存 seed の全面改修は行わない

# P5 Character Consistency Analysis: Cover vs. Page Prompt Architecture

> **Status**: Analysis complete — docs only. No code changes.
> **Created**: 2026-06-06
> **Related**: Issue #9, Issue #15
> **Phase**: P5 (ソフトローンチ・本番トラフィック)

---

## Summary

カバー画像プロンプトとページ画像プロンプトの間には**構造的な非対称性**がある。ページには `buildImagePrompt()` による豊富なキャラクター固定情報（characterBible、cast / visualBible、pageVisualRole、参照画像）が付与されるが、カバーはテンプレートを埋めた生テキストのみで生成される。この差がカバー/ページのキャラクター外見の不一致を引き起こしている。

Issue #9（カバーのキャラクターがページと一致しない）と Issue #15（キャラクター一貫性の改善）は同一根本原因に起因するため、**1つの実装タスクに統合することを推奨する**。

---

## 1. 現在のアーキテクチャ

### 1.1 カバー画像プロンプトの生成パス

```
fixed_template:
  coverImagePromptTemplate
    ↓ applyTemplateReplacements()  （{childName} 等のプレースホルダーを展開）
    ↓
  story.coverImagePrompt  ← 生テキスト（これ以降の加工なし）
    ↓
  generateCoverImage({ coverImagePrompt, imageModelProfile, ... })
    ↓
  Image model（最小限のキャラクター情報のみ）

guided_ai / original_ai:
  Gemini が生成した coverImagePrompt フィールドを直接使用
    ↓
  同上（generateCoverImage に直接渡す）
```

**カバープロンプトに追加される情報**: なし

---

### 1.2 ページ画像プロンプトの生成パス

```
固定テンプレート:
  imagePromptTemplate
    ↓ applyTemplateReplacements()
    ↓
  story.pages[i].imagePrompt  （ベーステキスト）
    ↓
  buildImagePrompt(
    basePrompt,
    style,
    characterBible,             ← ✅ childProfile の視覚的説明
    styleBible,
    {
      cast,                     ← ✅ 登場キャラクター × visualBible / signatureItems
      appearingCharacterIds,
      focusCharacterId,
      pageVisualRole,           ← ✅ ページ種別ごとの構図ガイド
      compositionHint,
      visualMotif,
      childProfileBasePrompt,   ← ✅ 子どもプロフィールのベースプロンプト
      ...
    }
  )
    ↓
  enriched prompt（ + キャラクター固定ルール + キャスト視覚説明 + 構図指示 ）
    ↓
  generatePageImageWithFallback(
    prompt,
    inputImageUrls,             ← ✅ 参照画像（characterConsistencyMode に応じて付与）
    stepBConfig,                ← ✅ safer_retry: 参照画像なし再試行パス
    ...
  )
```

---

### 1.3 キャラクター情報の流入経路

| 情報 | カバー | ページ |
|---|---|---|
| `characterBible`（childProfile の視覚説明） | ❌ なし | ✅ `buildImagePrompt()` で追加 |
| `cast[].visualBible`（各キャラクターの外見説明） | ❌ なし | ✅ キャスト単位で追加 |
| `cast[].signatureItems` | ❌ なし | ✅ 追加 |
| `cast[].doNotChange` | ❌ なし | ✅ 追加 |
| `childProfileSnapshot.visualProfile.basePrompt` | ❌ なし | ✅ `childProfileBasePrompt` として追加 |
| 参照画像（子どもの写真等） | ❌ 渡されない | ✅ `characterConsistencyMode` に従い付与 |
| `pageVisualRole` 構図ガイド | ❌ なし | ✅ 8種類のページロール別ガイド |
| キャラクター固定ルール（同一hairstyle/outfit等） | ❌ なし | ✅ 6ルールが固定テキストとして追加 |
| safer_retry（参照画像なし再試行）| ❌ なし（再試行なし） | ✅ `p5ModelUnification: "safer_retry"` で発動 |

---

## 2. ギャップ分析

### 2.1 カバープロンプトとページプロンプトのキャラクターアンカー差

**カバーが欠いているもの（ページには存在する）:**

1. **characterBible** — `buildFixedCharacterBible()` が生成する、子どもの外見・年齢・持ち物・キャラクター固定ルールの統合テキスト
2. **cast[].visualBible** — 各登場キャラクター（相棒の動物等）の外見説明
3. **cast[].signatureItems / doNotChange** — キャラクターの変えてはいけない要素
4. **キャラクター固定ルール 6項目** — 「同一hairstyle / age impression / face shape / outfit / body proportions」等
5. **childProfileBasePrompt** — childProfileSnapshot からの視覚ベースプロンプト
6. **入力参照画像** — 子どもの写真（style_reference / character_reference）
7. **再試行パス** — カバーは1回失敗したら即 `coverStatus=failed`。ページは `safer_retry` で参照画像を除去してリトライ可能

### 2.2 固定テンプレート vs. ガイドAI / オリジナルAI の差

| モード | カバープロンプトの起源 | 差異 |
|---|---|---|
| `fixed_template` | `coverImagePromptTemplate` → プレースホルダー展開 | キャラクター情報はプレースホルダー経由のみ |
| `guided_ai` / `original_ai` | Gemini が coverImagePrompt フィールドを生成 | Gemini 任せ。characterBible / cast を後付けしない |

**いずれのモードも** カバープロンプトは `buildImagePrompt()` を通らないため、ページと同じキャラクター固定情報が追加されない。

### 2.3 safer_retry / p5ModelUnification との関係

- `safer_retry` は**ページの安全性拒否回避**策であり、カバーには適用されない
- カバーが安全性拒否を受けた場合のフォールバックは存在しない（`P5_COVER_PAGE_MODEL_UNIFICATION_EXPERIMENT.md` §3 参照）
- 本分析の課題（キャラクター固定の弱さ）は `safer_retry` とは独立した別問題

### 2.4 テスト・フィクスチャのカバレッジ

- `characterConsistencyMode: "cover_only"` の参照画像テストは存在する（`generate-book.test.ts` line 1067）
- **カバープロンプトとページプロンプトのキャラクター内容が一致しているかを検証するテストは存在しない**
- `buildImagePrompt()` の単体テストは存在するが、カバープロンプトビルダーに相当するテストはない

---

## 3. 推奨タスク分割

### 判断: Issue #9 と #15 を統合する（推奨）

**理由:**
- 根本原因が同一（カバープロンプトが `buildImagePrompt()` を経由しない）
- 修正ファイルが同一（`generate-book.ts` のカバー生成パス + `prompt-builder.ts`）
- 分割してもスコープが重複するため、まとめて1PRで修正する方が効率的

**推奨次タスクタイトル:**
```
P5 Quality: Strengthen cover image character anchoring to match page prompt enrichment
```

**次ステップ:** 実装（docs-onlyは不要。アーキテクチャが明確なため直接実装に進める）

---

## 4. 推奨実装スコープ

### 4.1 対象ファイル

```
functions/src/generate-book.ts        — カバー生成パスの修正
functions/src/lib/prompt-builder.ts   — buildCoverImagePrompt() 追加
functions/test/generate-book.test.ts  — カバー/ページ一致テスト追加
```

### 4.2 変更禁止ファイル

```
firestore.rules
firestore.indexes.json
firebase.json
src/lib/types.ts  （型変更を伴わない場合）
ImageProvider routing
候補ゲート（allowCandidateProfile）
responseSchema 関連
Firestore 本番データ
シークレット / service account JSON
```

### 4.3 最小変更内容

**① `prompt-builder.ts` に `buildCoverImagePrompt()` を追加**

```typescript
export function buildCoverImagePrompt(
  baseCoverPrompt: string,
  style: IllustrationStyle,
  characterBible: string | undefined,
  styleBible: string | undefined,
  options: {
    cast?: CastCharacter[];
    childProfileBasePrompt?: string | undefined;
    imageModelProfile?: ImageModelProfile;
  }
): string {
  // characterBible、cast guidance、style を統合した cover 向けプロンプトを返す
  // buildImagePrompt() のサブセット（pageVisualRole・compositionHint は不要）
  // カバー固有ガイドを追加: "Book cover composition", "text-free", etc.
}
```

**② `generate-book.ts` のカバー生成呼び出し箇所を修正**

```typescript
// 変更前
const coverImagePrompt = story.coverImagePrompt ?? normalizedBookData.coverImagePrompt;

// 変更後
const rawCoverPrompt = story.coverImagePrompt ?? normalizedBookData.coverImagePrompt;
const coverImagePrompt = buildCoverImagePrompt(
  rawCoverPrompt,
  normalizedBookData.style,
  buildFinalCharacterBible(story.characterBible, normalizedBookData),
  story.styleBible,
  {
    cast: story.cast,
    childProfileBasePrompt: normalizedBookData.childProfileSnapshot?.visualProfile.basePrompt,
    imageModelProfile: normalizedBookData.imageModelProfile,
  }
);
```

### 4.4 追加・更新するテスト

```typescript
// generate-book.test.ts
it("cover prompt includes characterBible from child profile", async () => {
  // coverImagePrompt に characterBible のキーワードが含まれることを検証
});

it("cover prompt and page 0 prompt share the same character description keywords", async () => {
  // カバーとページ0の両方に同一キャラクター情報が含まれることを検証
});

// prompt-builder.test.ts
it("buildCoverImagePrompt includes character consistency rules", () => { ... });
it("buildCoverImagePrompt includes cast visualBible", () => { ... });
```

---

## 5. 受け入れ条件

- [ ] カバープロンプトに `characterBible` が含まれる（ページプロンプトと同等）
- [ ] カバープロンプトに cast の `visualBible` が含まれる（主要キャラクターのみ可）
- [ ] 固定テンプレート・guided_ai・original_ai の全モードで適用される
- [ ] テストがカバー/ページのキャラクター記述一致を検証する
- [ ] `npm run guard:hygiene` PASS
- [ ] `npm test` PASS（既存 1764 件 + 新規テスト）
- [ ] ImageProvider ルーティング変更なし
- [ ] 候補ゲート変更なし
- [ ] responseSchema 再導入なし
- [ ] 本番デプロイなし

---

## 6. リスク評価

| リスク | 深刻度 | 可能性 | 対策 |
|---|---|---|---|
| カバープロンプトが長くなり安全性拒否率が上昇する | 中 | 中 | カバー向けに cast を主要キャラのみに絞る。参照画像は当面追加しない |
| `buildCoverImagePrompt()` で既存スモーク画像のスタイルが変わる | 低 | 高（変更が意図的) | スモークチェックリストで目視確認 |
| fixed_template と guided_ai で characterBible の形式が異なる場合に不整合が出る | 低 | 低 | `buildFinalCharacterBible()` 経由で統一済み |
| カバーに参照画像を追加した場合、P5-3f と同様の E005 安全性拒否が発生する可能性 | 中 | 中 | 今回は参照画像を追加しない（プロンプト改善のみ）。参照画像追加は別 Issue で検討 |

**手動 QA が必要なもの:**
- fixed_template 書のカバー / ページキャラクターの目視一致確認
- guided_ai 書での同確認
- 参照画像あり書（childProfileSnapshot 存在時）での確認

---

## 7. Jules 向け実装プロンプト

```text
Repository: ksc0000/story-gen

Task: Strengthen cover image character anchoring to match page prompt enrichment.

Goal:
Add a buildCoverImagePrompt() function to functions/src/lib/prompt-builder.ts that
enriches the raw cover image prompt with the same characterBible and cast visual
information that page prompts already receive via buildImagePrompt().
Update generate-book.ts to use this new function for all generation modes.

Scope:
- functions/src/lib/prompt-builder.ts — add buildCoverImagePrompt()
- functions/src/generate-book.ts — use buildCoverImagePrompt() in cover generation path
- functions/test/generate-book.test.ts — add tests for cover/page character consistency
- functions/test/prompt-builder.test.ts (if exists) — add unit tests

Out of scope:
- Do NOT add input reference images to cover generation
- Do NOT change ImageProvider routing or fallback chains
- Do NOT change candidateGate behavior
- Do NOT reintroduce responseSchema
- Do NOT change Firestore production data
- Do NOT deploy
- Do NOT commit secrets, service account JSON, or raw logs

buildCoverImagePrompt() contract:
- Accept: baseCoverPrompt, style, characterBible, styleBible, { cast, childProfileBasePrompt, imageModelProfile }
- Include: characterBible, cast visualBible/signatureItems/doNotChange for recurring characters
- Include: cover-specific composition note ("Book cover: single striking scene, text-free")
- Exclude: pageVisualRole guidance, compositionHint, visualMotif (cover-specific)
- Follow the same structure as buildImagePrompt() but tailored for a cover

Acceptance criteria:
- Cover prompt includes characterBible
- Cover prompt includes cast visual descriptions
- Tests verify cover prompt contains character keywords from childProfile
- npm run guard:hygiene PASS
- npm test PASS (all existing + new tests)

Validation:
- npm run guard:hygiene
- cd functions && npm test
- npm run check:phase2
```

---

## 8. 検証コマンド

```bash
# hygiene チェック
npm run guard:hygiene

# 全テスト（既存 1764 件 + 新規）
cd functions && npm test

# Phase 2 guards
npm run check:phase2
```

---

## 9. フォローアップ Issue 候補

| ID | タイトル | 優先度 |
|---|---|---|
| P5-4b | Add reference image support to cover generation (post character-anchor fix) | P3 |
| P5-4c | Add cover generation retry/fallback chain matching page path | P3 |
| IMG-002b | Investigate reference image URL as persistent safety trigger (cover path) | P2 |

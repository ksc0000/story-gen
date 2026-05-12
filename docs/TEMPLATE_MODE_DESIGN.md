# Template Mode Design

作成日: 2026-05-08
対象リポジトリ: `ksc0000/story-gen`
関連 Issue: #5 (Template Mode), #4 (Content quality), #3 (Illustration quality)

---

## 0. 背景と目的

### 問題

現在の自由生成（`guided_ai` / `original_ai`）は以下のリスクを持つ:

- **物語構成の不安定**: LLM 依存で、テーマ逸脱・意味量不足・ending の不自然さが起きうる
- **画像構図の不安定**: imagePrompt が毎回異なり、構図品質にばらつきがある
- **キャラクター一貫性**: ページ間で主人公の見た目が揺れる
- **生成失敗リスク**: LLM 呼び出し自体のタイムアウト・スキーマバリデーション失敗
- **商品化ハードル**: 品質保証が難しく、有料販売の信頼性に直結

### 解決策: 3 段階の生成モード

| モード | `creationMode` | LLM ストーリー生成 | 画像構図 | 自由度 | リスク | 対象ユーザー |
|---|---|---|---|---|---|---|
| **テンプレート** | `fixed_template` | なし（テンプレート展開） | 固定 imagePromptTemplate | 低 | 最低 | 無料体験・初回・ライト |
| **かんたんカスタム** | `guided_ai` | あり（ガイド付き） | LLM 生成 | 中 | 中 | 一般ユーザー（主力） |
| **オリジナル** | `original_ai` | あり（自由） | LLM 生成 | 高 | 高 | ギフト・記念日・有料上位 |

本ドキュメントは **Template Mode (`fixed_template`)** の設計を詳細化する。

---

## 1. 現状分析

### 1.1 既存実装

| 項目 | 状態 |
|---|---|
| `CreationMode` 型 | `"fixed_template" \| "guided_ai" \| "original_ai"` 定義済み（両 types.ts） |
| `FixedStoryTemplate` / `FixedStoryPageTemplate` | 定義済み |
| `TemplateData.fixedStory` | 定義済み |
| `TemplateData.creationMode` | 定義済み |
| テンプレートシード | 6 本 seed 済み（`fixed-first-zoo`, `fixed-first-birthday`, `fixed-bedtime-good-day`, `fixed-brush-teeth`, `fixed-first-christmas`, `fixed-sharing-friends`） |
| `generateBook` 分岐 | `creationMode === "fixed_template" && template.fixedStory` → LLM スキップ |
| `normalizeBookForGeneration` | `fixed_template` → `free` プラン + `fixedStory.pages.length` でページ数決定 |
| `resolveScenePolicy` | `fixed_template` → `backgroundMode: "fixed"` |
| quality gate | `fixed_template` は warning のみ・失敗しない |
| `textTemplatesByAge` | `AgeBand` 別テキスト（4 テンプレートとも完備） |
| テーマ選択 UI | 3 モード選択 → テンプレートフィルタ → `/create/input` 遷移 |
| カテゴリグループ | 8 グループ seed 済み |
| PlanConfig | `free` → `allowedCreationModes: ["fixed_template"]` |

### 1.2 既存テンプレートの構造

```
templates/{templateId}
  ├── name: "はじめてのどうぶつえん"
  ├── description: "..."
  ├── icon: "🦁"
  ├── creationMode: "fixed_template"
  ├── priceTier: "ume"
  ├── storyCostLevel: "none"
  ├── categoryGroupId: "memories"
  ├── order: 100
  ├── systemPrompt: "..."
  ├── active: true
  ├── fixedStory:
  │   ├── titleTemplate: "{childName}のはじめてのどうぶつえん"
  │   └── pages: [
  │       { textTemplate, textTemplatesByAge, imagePromptTemplate },
  │       ...4 pages
  │   ]
  └── (requiredInputs / optionalInputs / themeTags / ...)
```

### 1.3 現状の課題

| # | 課題 | 影響 |
|---|---|---|
| T1 | テンプレート 4 本しかない | ユーザーの選択肢が少なすぎて、リピートにつながらない |
| T2 | `imagePromptTemplate` の構図指定が弱い | 画像品質にばらつきがある |
| T3 | cover / titleSpread / openingNarration が未対応 | Reader UI の表紙体験が v2_cover_title_story に追従していない |
| T4 | 8 ページ / 12 ページテンプレートがない | `light_paid` / `standard_paid` のテンプレートモードが使えない |
| T5 | テンプレートのプレビュー画像がない | 選択画面でイメージがわかない |
| T6 | テンプレート品質管理の仕組みがない | 悪いテンプレートが放置される |

---

## 2. Template Mode の設計方針

### 2.1 Core Principle: Reliability First

Template Mode は「**最も失敗しにくく、最も品質が安定する生成モード**」として設計する。

- LLM ストーリー生成なし → ストーリー失敗ゼロ
- 固定 imagePromptTemplate → 構図のばらつき最小
- `textTemplatesByAge` → 年齢適応テキスト保証
- `backgroundMode: "fixed"` → 背景の安定性
- quality gate は warning のみ → hard fail しない

### 2.2 テンプレートの拡充方針

#### Phase T1: 既存テンプレートの Cover 対応 + 品質改善（4 ページ × 4 本）

- 既存 4 テンプレートに `coverImagePromptTemplate`, `titleSpreadText`, `openingNarration` を追加
- `imagePromptTemplate` の構図指定を強化（`pageVisualRole` 明記）
- `sampleImageUrl` / `sampleImages` にプレビュー画像を設定

#### Phase T2: テンプレート拡充（4 ページ × 10 本 目標）

- 各カテゴリグループから 1〜2 本ずつ追加
- 合計 10 本の 4 ページテンプレートを確保

#### Phase T3: 8 / 12 ページテンプレート + Variant 対応

- 人気テンプレートの 8 ページ版を作成
- テンプレートバリアント（同じテーマで構成違い）を導入
- `light_paid` / `standard_paid` プランでの利用を開放

---

## 3. テンプレートデータ構造の拡張

### 3.1 FixedStoryTemplate の拡張

```typescript
// 既存
interface FixedStoryTemplate {
  titleTemplate: string;
  pages: FixedStoryPageTemplate[];
}

// 拡張（Phase T1 で追加するフィールド）
interface FixedStoryTemplate {
  titleTemplate: string;
  coverImagePromptTemplate?: string;    // NEW: カバー画像生成用プロンプトテンプレート
  titleSpreadTextTemplate?: string;     // NEW: タイトルスプレッド表示テキスト
  openingNarrationTemplate?: string;    // NEW: 冒頭ナレーション
  pages: FixedStoryPageTemplate[];
}
```

### 3.2 FixedStoryPageTemplate の拡張

```typescript
// 既存
interface FixedStoryPageTemplate {
  textTemplate: string;
  textTemplatesByAge?: Partial<Record<AgeBand, string>>;
  imagePromptTemplate: string;
}

// 拡張（Phase T1 で追加するフィールド）
interface FixedStoryPageTemplate {
  textTemplate: string;
  textTemplatesByAge?: Partial<Record<AgeBand, string>>;
  imagePromptTemplate: string;
  pageVisualRole?: PageVisualRole;      // NEW: 構図ロール明示
}
```

### 3.3 TemplateData の拡張

```typescript
// 新規追加フィールド
interface TemplateData {
  // ...既存フィールド...

  // Phase T2 で追加
  variantOf?: string;                   // NEW: バリアント元テンプレート ID
  variantLabel?: string;                // NEW: バリアント表示名（例: "冬バージョン"）

  // Phase T3 で追加
  availablePageCounts?: PageCount[];    // NEW: 対応ページ数リスト
}
```

### 3.4 テンプレート変数一覧

テンプレート文字列内で使用可能な変数:

| 変数 | 型 | ソース | 説明 |
|---|---|---|---|
| `{childName}` | string | `BookInput.childName` | 子どもの名前 |
| `{childAge}` | number | `BookInput.childAge` | 年齢 |
| `{favorites}` | string | `BookInput.favorites` | 好きなもの |
| `{parentMessage}` | string | `BookInput.parentMessage` | 保護者メッセージ |
| `{place}` | string | `BookInput.place` | 場所 |
| `{season}` | string | `BookInput.season` | 季節 |
| `{characterLook}` | string | `ChildVisualProfile.characterLook` | 外見 |
| `{signatureItem}` | string | `ChildVisualProfile.signatureItem` | トレードマーク |

### 3.5 coverImagePromptTemplate の設計

cover 画像は Step D で `coverImagePrompt` として Gemini が生成しているが、Template Mode では LLM を使わず `coverImagePromptTemplate` から直接展開する。

```
coverImagePromptTemplate 例:
"A cheerful picture book cover illustration. {childName}, a young child
wearing {signatureItem}, stands at the entrance of a colorful zoo.
Bright, warm colors. Soft watercolor style. No text in image."
```

生成フロー変更:
- `fixed_template` + `coverImagePromptTemplate` 存在時 → LLM による coverImagePrompt 生成をスキップ
- テンプレートなし / `guided_ai` / `original_ai` → 従来通り LLM 生成

---

## 4. 生成フローの変更点

### 4.1 現在の fixed_template フロー

```
1. BookDoc created → onDocumentCreated trigger
2. getTemplate(theme) → TemplateData 取得
3. normalizeBookForGeneration() → creationMode=fixed_template 判定
4. generateFixedTemplateStoryWithQualityReport() → LLM スキップ
5. quality gate → warning のみ（fail しない）
6. 画像生成（imagePromptTemplate 展開 → Replicate）
7. cover 生成（coverImagePrompt を Gemini 生成 → Replicate）
8. BookDoc 更新
```

### 4.2 Phase T1 後のフロー変更

```
1-5: 変更なし
6: 変更なし
7: coverImagePromptTemplate 存在時 → LLM スキップ、テンプレート変数展開
   coverImagePromptTemplate なし → 従来通り LLM 生成
8: titleSpreadText / openingNarration をテンプレートから展開して保存
```

### 4.3 変更しないもの

- pages subcollection / pageNumber の構造
- Firestore write flow の全体構造
- 画像生成パイプライン（Replicate / FLUX）
- Reader UI の cover / title / story 表示ロジック
- `readingStructureVersion` の判定ロジック

---

## 5. テンプレート品質管理

### 5.0 Image Prompt Policy（Character Reference Isolation）

Template Mode の image prompt は、character reference の利用目的を明示的に制限する。

- 基本方針: reference image は「子どもの identity（顔立ち・髪型・年齢感・体型の傾向）」にのみ使う
- 禁止方針: reference image の背景・場所・構図・小物・砂場/遊具などの環境要素をコピーしない
- scene lock: 各 `imagePromptTemplate` で scene/background を先頭で明示し、必要に応じて NOT 制約（例: NOT a sandbox）を入れる
- no-text policy: IMG-001 で導入した no-text 制約（no readable writing / no signage / no storefront signs / no text-like marks）を維持する
- avoid positive prompt words that invite rendered text: `sign`, `label`, `poster`, `banner`, `storefront sign`, `readable writing`
- prefer text-free alternatives in scene description: `entrance arch without readable text`, `decorative shape`, `blank surface`, `animal-shaped decoration`, `text-free illustration`

Preserve（保持する要素）:

- 子どもの identity（顔立ち、髪型、年齢感、体型の傾向）
- 主人公としての一貫した存在感（ページ間の同一人物性）

Do not preserve（保持しない要素）:

- 参照画像の背景（砂場、公園、室内レイアウト、壁や床の質感）
- 参照画像のカメラ構図（画角、立ち位置、アングル）
- 参照画像の場所固有オブジェクト（遊具、看板、ベンチ、地面パターン）

### 5.0.1 Future: Neutral Character Reference Images（REF-001）

中期対策として、character reference 入力自体を「背景非依存」に寄せる。

- neutral reference image: 単色または低情報背景で撮影/生成した参照画像を優先
- identity-only preprocessing: 背景情報を弱めた参照素材を用意（必要に応じて人物中心トリミング）
- character sheet: 正面/斜め/表情違いをまとめた identity 専用シートを導入し、scene 指定とは分離する
- 段階導入: prompt-level isolation（IMG-002）→ neutral reference（REF-001）→ character sheet 本格運用

詳細設計は [Character Reference Strategy (REF-001)](./CHARACTER_REFERENCE_STRATEGY.md) を参照。

### 5.1 テンプレート品質チェックリスト

新規テンプレート追加時に確認する項目:

| # | 項目 | 基準 |
|---|---|---|
| Q1 | `textTemplate` が全年齢帯で自然か | `textTemplatesByAge` 5 帯すべて記述 |
| Q2 | `imagePromptTemplate` に構図指示があるか | `pageVisualRole` と整合 |
| Q3 | `coverImagePromptTemplate` がカバーとして機能するか | テスト生成で確認 |
| Q4 | テンプレート変数が正しく展開されるか | ユニットテスト |
| Q5 | 4 ページの起承転結が成立するか | 人力レビュー |
| Q6 | 禁止表現（暴力・差別・恐怖）を含まないか | content filter |
| Q7 | `imagePromptTemplate` に文字描画指示がないか | "No text in image" 含む |

### 5.2 テンプレート品質メトリクス

テンプレートごとに以下を追跡（将来実装）:

| メトリクス | 説明 |
|---|---|
| `generationCount` | このテンプレートで生成された総数 |
| `successRate` | `completed` + `partial_completed` の率 |
| `imageFailureRate` | ページ画像失敗率 |
| `coverFailureRate` | カバー画像失敗率 |
| `averageGenerationTimeMs` | 平均生成時間 |
| `userSatisfactionScore` | ユーザーフィードバック平均 |

---

## 6. カテゴリ別テンプレート拡充計画

### 6.1 Phase T2 テンプレート候補

既存 4 本 + 新規 6 本 = 合計 10 本目標:

| # | テンプレート ID | カテゴリ | タイトル例 | Status |
|---|---|---|---|---|
| 1 | `fixed-first-zoo` | memories | はじめてのどうぶつえん | 既存 |
| 2 | `fixed-bedtime-good-day` | bedtime | きょうもいい日だったね | 既存 |
| 3 | `fixed-brush-teeth` | growth-support | はみがきできたよ | 既存 |
| 4 | `fixed-first-christmas` | seasonal-events | はじめてのクリスマス | 既存 |
| 5 | `fixed-first-birthday` | memories | はじめてのたんじょうび | **done (T2-A)** |
| 6 | `fixed-sharing-friends` | emotional-growth | おともだちとわけっこできたね | **done (T2-A)** |
| 7 | `fixed-sleepy-moon-adventure` | bedtime | おつきさまと おやすみぼうけん | **done (T2-B)** |
| 8 | `fixed-cardboard-rocket` | imagination | ダンボールロケットでしゅっぱつ | **done (T2-B)** |
| 9 | `fixed-rainy-day-puddle` | daily-life | あめの日の みずたまり | **done (T2-C)** |
| 10 | `fixed-little-helper` | growth-support | ちいさなおてつだい | **done (T2-C)** |

### 6.2 テンプレートカテゴリ分布

| カテゴリグループ | 既存 | Phase T2 追加 | 合計 |
|---|---|---|---|
| memories | 1 | 1 | 2 |
| growth-support | 1 | 1 | 2 |
| emotional-growth | 0 | 1 | 1 |
| bedtime | 1 | 1 | 2 |
| daily-life | 0 | 1 | 1 |
| imagination | 0 | 1 | 1 |
| seasonal-events | 1 | 0 | 1 |

---

## 7. 段階実装計画

### Phase T1: Cover 対応 + 品質改善（推定 4 Steps）

| Step | 内容 | 変更対象 | Status |
|---|---|---|---|
| T1-A | `FixedStoryTemplate` に cover / title / narration テンプレートフィールド追加（型のみ） | `functions/src/lib/types.ts`, `src/lib/types.ts` | **done** |
| T1-B | 既存 4 テンプレートの seed に `coverImagePromptTemplate`, `titleSpreadTextTemplate`, `openingNarrationTemplate` を追加 | `functions/src/seed-templates.ts` | **done** |
| T1-C | `generate-book.ts` で `fixed_template` の cover / title / narration をテンプレート展開 | `functions/src/generate-book.ts` | **done** |
| T1-D | 既存 4 テンプレートの `imagePromptTemplate` 強化 + `pageVisualRole` 追加 | `functions/src/seed-templates.ts` | **done** |

### Phase T2: テンプレート拡充（推定 6 Steps）

| Step | 内容 |
|---|---|
| T2-A | テンプレート 5〜6 を seed に追加（memories + emotional-growth）**（done: `fixed-first-birthday`, `fixed-sharing-friends`）** |
| T2-B | テンプレート 7〜8 を seed に追加（bedtime + imagination）**（done: `fixed-sleepy-moon-adventure`, `fixed-cardboard-rocket`）** |
| T2-C | テンプレート 9〜10 を seed に追加（daily-life + growth-support）**（done: `fixed-rainy-day-puddle`, `fixed-little-helper`）** |
| T2-D | テンプレートプレビュー画像の生成・設定 |
| T2-E | テーマ選択 UI のプレビュー画像表示 |
| T2-F | テンプレート品質のテスト生成・レビュー |

### Phase T3: 8 ページ + バリアント（推定 4 Steps）

| Step | 内容 |
|---|---|
| T3-A | `TemplateData` に `availablePageCounts` / `variantOf` / `variantLabel` 追加 |
| T3-B | 人気テンプレート 2〜3 本の 8 ページ版作成 |
| T3-C | PlanConfig 更新: `light_paid` で 8 ページ `fixed_template` 許可 |
| T3-D | テーマ選択 UI でバリアント / ページ数選択対応 |

---

## 8. 型定義変更のまとめ

### 今回追加する型（Phase T1-A）

#### `functions/src/lib/types.ts`

```typescript
// FixedStoryTemplate に追加
interface FixedStoryTemplate {
  titleTemplate: string;
  coverImagePromptTemplate?: string;
  titleSpreadTextTemplate?: string;
  openingNarrationTemplate?: string;
  pages: FixedStoryPageTemplate[];
}

// FixedStoryPageTemplate に追加
interface FixedStoryPageTemplate {
  textTemplate: string;
  textTemplatesByAge?: Partial<Record<AgeBand, string>>;
  imagePromptTemplate: string;
  pageVisualRole?: PageVisualRole;
}
```

#### `src/lib/types.ts`

同じフィールドを追加（フロントエンド側）。

### 将来追加する型（Phase T3）

```typescript
// TemplateData に追加
interface TemplateData {
  // ...既存...
  variantOf?: string;
  variantLabel?: string;
  availablePageCounts?: PageCount[];
}
```

---

## 9. Cover 生成フロー変更の詳細

### 9.1 現在の cover 生成フロー（`generate-book.ts`）

```
1. story 生成時に Gemini が coverImagePrompt を生成
2. coverImagePrompt を使って Replicate で画像生成
3. coverStatus, coverImageUrl, coverImagePrompt を BookDoc に保存
```

### 9.2 Template Mode での cover 生成フロー

```
1. template.fixedStory.coverImagePromptTemplate が存在するか判定
2. 存在する場合:
   a. テンプレート変数を展開（{childName}, {characterLook}, etc.）
   b. 展開結果を coverImagePrompt として使用
   c. 以降は通常の cover 画像生成と同じ
3. 存在しない場合:
   a. 従来通り Gemini で coverImagePrompt を生成
```

### 9.3 titleSpreadText / openingNarration のテンプレート展開

```
1. template.fixedStory.titleSpreadTextTemplate が存在する場合:
   a. テンプレート変数を展開
   b. 結果を titleSpreadText として BookDoc に保存
2. template.fixedStory.openingNarrationTemplate が存在する場合:
   a. テンプレート変数を展開
   b. 結果を openingNarration として BookDoc に保存
3. どちらも存在しない場合:
   a. titleSpreadText / openingNarration は story JSON の値を使用（現在の動作）
```

---

## 10. Reader UI への影響

Template Mode で生成された絵本は、以下の条件を満たせば Reader UI で Cover / Title Spread を表示する:

- `readingStructureVersion === "v2_cover_title_story"`
- `hasCoverPage === true`
- `coverStatus === "completed"`
- `coverImageUrl` が存在

これらの条件は `buildReadingItems()` で判定済み。Template Mode 固有の Reader UI 変更は不要。

---

## 11. テスト戦略

### 11.1 ユニットテスト

| テスト | 対象 |
|---|---|
| テンプレート変数展開 | `{childName}` → 実際の名前に置換 |
| `coverImagePromptTemplate` 展開 | cover 用プロンプトが正しく展開されるか |
| `titleSpreadTextTemplate` 展開 | title 用テキストが正しく展開されるか |
| `openingNarrationTemplate` 展開 | narration 用テキストが正しく展開されるか |
| `pageVisualRole` の型検証 | `PageVisualRole` の値が正しいか |
| seed テンプレートの構造検証 | 必須フィールドが存在するか |

### 11.2 E2E テスト（将来）

| テスト | 内容 |
|---|---|
| テンプレート生成 E2E | テンプレート選択 → 入力 → 生成 → Reader 表示 |
| cover 表示確認 | coverImagePromptTemplate → cover 画像 → Reader で表示 |

---

## 12. リスクと制約

| リスク | 影響 | 軽減策 |
|---|---|---|
| テンプレート数不足でリピート率が上がらない | ユーザー離脱 | Phase T2 で 10 本目標 |
| imagePromptTemplate の品質が低い | 画像品質低下 | テスト生成 + レビュー |
| テンプレート変数展開の不備 | 不自然なテキスト | ユニットテスト + 全変数テスト |
| 8/12 ページの物語構成が難しい | ページ水増し感 | 専門家レビュー + quality gate |

---

## 13. 既存フローへの非影響

以下は本設計で **変更しない**:

- `guided_ai` / `original_ai` の生成フロー
- pages subcollection / pageNumber の構造
- Firestore write flow（BookDoc / PageDoc の書き込み順序）
- Reader UI の `buildReadingItems()` ロジック
- `readingStructureVersion` の判定
- cover regeneration（`regenerateCoverImage`）のフロー
- swipe navigation のフロー
- LLM auto review / provider abstraction / Stripe / PDF

---

## Appendix A: 関連ドキュメント

- [EHONAI_STORY_CREATION_CONTENT_DESIGN.md](./EHONAI_STORY_CREATION_CONTENT_DESIGN.md) — CreationMode 設計の原典
- [COVER_PAGE_GENERATION_DESIGN.md](./COVER_PAGE_GENERATION_DESIGN.md) — Cover Page / Title Spread / Opening Narration 設計
- [image-model-policy.md](./image-model-policy.md) — 画像モデル選択ポリシー
- [PRODUCT_ROADMAP.md](./PRODUCT_ROADMAP.md) — 商品化ロードマップ
- [EHONAI_ORIGINAL_CHARACTER_AND_EXPANSION_PLAN.md](./EHONAI_ORIGINAL_CHARACTER_AND_EXPANSION_PLAN.md) — キャラクター設計

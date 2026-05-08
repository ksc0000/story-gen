# Cover Page / Title Spread / Opening Narration — Design

> Status: **Draft**
> Created: 2026-05-08
> Author: Admin
> Related: `docs/PRODUCT_ROADMAP.md` Phase 2 — Story & Illustration Quality

---

## 1. Overview

絵本が「急にお話が始まる」問題を解消し、読み聞かせ体験を向上させるための Cover Page / Title Spread / Opening Narration 設計。

現在の生成フローでは pageNumber=0 がいきなり本文1ページ目であり、表紙画像は pageNumber=0 の挿絵を `coverImageUrl` として流用している。本設計では、独立した Cover Image + Title Spread + Opening Narration を安全に追加する方法を定義する。

---

## 2. User Problem

ユーザーフィードバック:

> 「表紙がなくて、急にお話が始まるので読み聞かせに向かなそう」

> 「次ページに行く際、いちいちボタンを押す必要があるので、スライドだと良い」

### 問題点

1. 絵本を開くと即座に本文1ページ目が表示される
2. 「これから読み聞かせが始まる」という期待感の演出がない
3. 表紙画像は本文1ページ目の使い回し — 表紙用に構図が最適化されていない
4. タイトルと導入テキストの表示タイミングがない

---

## 3. Goals / Non-goals

### Goals

- 読み聞かせの「始まり」の体験を作る (表紙 → タイトル → 導入 → 本文)
- 既存の4ページ本文生成を壊さずに導入する
- 既存 BookDoc / PageDoc の互換性を維持する
- 段階的に実装できる設計にする

### Non-goals (今回やらないこと)

- Swipe / slide page navigation (別 Step)
- 既存 pageNumber の変更
- pageKind の導入 (将来検討)
- Ending page / Closing spread (将来検討)
- 8ページ / 12ページ向けの chapter 構造
- PDF export のカバー対応
- Stripe / 課金への影響

---

## 4. Current Generation Flow

### 構造

```
books/{bookId}
├── title: string
├── coverImageUrl?: string          ← page 0 の imageUrl を流用
├── pageCount: 4 | 8 | 12
├── status: "generating" | "completed" | "partial_completed" | "failed"
├── ...
└── pages/
    ├── page-0  { pageNumber: 0, text, imageUrl, imagePrompt, pageVisualRole: "opening_establishing", ... }
    ├── page-1  { pageNumber: 1, text, imageUrl, imagePrompt, ... }
    ├── page-2  { pageNumber: 2, text, imageUrl, imagePrompt, ... }
    └── page-3  { pageNumber: 3, text, imageUrl, imagePrompt, ... }
```

### 生成フロー

1. Gemini に1回リクエスト → story JSON (title + pages[]) を取得
2. pages を並列で image generation
3. page 0 の imageUrl を `coverImageUrl` にセット
4. 全ページ完了 → status="completed"、一部失敗 → "partial_completed"

### coverImageUrl の現在の扱い

- page 0 の挿絵画像 URL がそのまま `coverImageUrl` に設定される
- BookCard で表紙として表示
- 表紙用に最適化された画像ではない (本文1ページ目のシーン)
- page 0 が再生成されると `coverImageUrl` も更新される

### pageNumber の前提

- 0-based: page 0, 1, 2, ... N-1
- `pageCount` は 4, 8, 12 のいずれか
- Viewer は配列 index でページ送り (pageNumber 直接参照はしない)
- Admin は `orderBy("pageNumber", "asc")` でクエリ
- Regeneration は `pageNumber` を指定して実行
- page 0 の再生成時に `coverImageUrl` を更新

---

## 5. Proposed Reading Structure

### 推奨: A案 — Cover を BookDoc に持つ方式

```
books/{bookId}
├── title: string
├── coverImageUrl?: string              ← 新: 独立した Cover 画像 URL
├── coverImagePrompt?: string           ← 新: Cover 画像用プロンプト
├── coverStatus?: CoverStatus           ← 新: Cover 生成状態
├── coverGeneratedAtMs?: number         ← 新: 生成完了時刻
├── coverImageModelProfile?: string     ← 新: 使用モデル
├── coverImageDurationMs?: number       ← 新: 生成時間
├── coverImageFallbackUsed?: boolean    ← 新: フォールバック使用有無
├── coverFailureReason?: string         ← 新: 失敗理由
├── titleSpreadText?: string            ← 新: タイトル Spread テキスト
├── openingNarration?: string           ← 新: 導入ナレーション
├── hasCoverPage?: boolean              ← 新: Cover 機能有効フラグ
├── readingStructureVersion?: string    ← 新: 構造バージョン
├── ...
└── pages/
    ├── page-0  { pageNumber: 0, ... }  ← 既存本文ページ（変更なし）
    ├── page-1  { pageNumber: 1, ... }
    ├── page-2  { pageNumber: 2, ... }
    └── page-3  { pageNumber: 3, ... }
```

### メリット

- 既存 pages subcollection の pageNumber を一切変更しない
- 既存 Viewer / Admin / Regeneration の互換性が高い
- Cover は book-level asset として独立管理
- 段階的に導入しやすい (hasCoverPage フラグで feature gate)
- 失敗しても本文ページに影響しない

### 代替案 B: pages subcollection に含める方式

```
pages/
├── cover    { pageKind: "cover", readingOrder: 0, ... }
├── title    { pageKind: "title_spread", readingOrder: 1, ... }
├── page-0   { pageKind: "story_page", readingOrder: 2, pageNumber: 0, ... }
├── page-1   { pageKind: "story_page", readingOrder: 3, pageNumber: 1, ... }
...
```

### B案のデメリット

- 既存 pageNumber 前提を壊す
- Admin / Regeneration / Metrics の影響が大きい
- `orderBy("pageNumber")` が壊れる
- 移行期に2つの取得ロジックが必要

### 結論: **A案を採用**

理由:
- backward compatible
- 既存 pageNumber を壊さない
- coverImageUrl が既に BookDoc に存在している
- MVP として安全
- 将来 B案に移行する場合も、A案のデータは損失なく利用可能

---

## 6. Firestore Field Design Draft

### BookDoc 追加フィールド (すべて optional)

```typescript
// Cover generation
hasCoverPage?: boolean;
coverStatus?: "not_started" | "generating" | "completed" | "failed";
coverImageUrl?: string;                    // ← 既存フィールドを独立 Cover に昇格
coverImagePrompt?: string;
coverGeneratedAt?: Timestamp;
coverGeneratedAtMs?: number;
coverFailureReason?: string;
coverImageModelProfile?: ImageModelProfile;
coverImageDurationMs?: number;
coverImageFallbackUsed?: boolean;

// Title spread / Opening narration
titleSpreadText?: string;
openingNarration?: string;

// Version control
readingStructureVersion?: "v1_pages_only" | "v2_cover_title_story";
```

### 既存 coverImageUrl との互換方針

| ケース | coverImageUrl の値 |
|--------|-------------------|
| 従来のbook (hasCoverPage なし) | page 0 の imageUrl (既存挙動) |
| hasCoverPage=true & cover 生成成功 | 独立した Cover 画像 URL |
| hasCoverPage=true & cover 生成失敗 | page 0 の imageUrl にフォールバック |

- `readingStructureVersion` で挙動を分岐
- `v1_pages_only`: 従来どおり page 0 を表紙として使用
- `v2_cover_title_story`: 独立 Cover / Title Spread / Opening を使用

### PageDoc 変更

今回は PageDoc を変更しない。

将来検討:
- `pageKind?: "cover" | "title_spread" | "story_page" | "ending"`
- `readingOrder?: number`

---

## 7. Generation Flow Draft

### 段階実装計画

| Step | 内容 | Firestore write | 画像生成 | UI変更 |
|------|------|----------------|---------|--------|
| **A** | Design doc + types only | No | No | No |
| **B** | titleSpreadText / openingNarration を story JSON に追加 | BookDoc write | No | Admin 表示のみ |
| **C** | coverImagePrompt を生成 (画像生成なし) | BookDoc write | No | Admin 確認可能 |
| **D** | Cover image generation | BookDoc write + Storage upload | Yes | Admin 確認可能 |
| **E** | Reader UI に Cover / Title Spread 表示 | No | No | Yes |
| **F** | Cover image failed 時の再生成導線 | Yes | Yes | Admin |

### Step B 詳細: Story JSON に titleSpreadText / openingNarration を追加

Gemini prompt の出力 JSON に以下を追加:

```json
{
  "title": "...",
  "titleSpreadText": "ある日、〇〇は...",
  "openingNarration": "さあ、はじまるよ！",
  "characterBible": "...",
  "styleBible": "...",
  "pages": [...]
}
```

- Story generation 後に BookDoc へ保存
- 既存の pages 配列への影響なし
- Admin UI で確認できるようにする

### Step C 詳細: coverImagePrompt を生成

Gemini prompt に Cover 画像用の prompt 生成を依頼:

```json
{
  "title": "...",
  "coverImagePrompt": "A cheerful 3-year-old boy...",
  "titleSpreadText": "...",
  "openingNarration": "...",
  "pages": [...]
}
```

- BookDoc に `coverImagePrompt` を保存
- まだ画像生成しない
- Admin で prompt quality を確認可能

### Step D 詳細: Cover image generation

- `coverImagePrompt` を使って Replicate/FLUX で画像生成
- `coverStatus`: "not_started" → "generating" → "completed" | "failed"
- 成功: `coverImageUrl` に独立 Cover 画像を設定
- 失敗: `coverFailureReason` に理由を保存、`coverImageUrl` は page 0 にフォールバック
- metrics: `coverImageDurationMs`, `coverImageFallbackUsed`, `coverImageModelProfile`

### Step E 詳細: Reader UI 表示

```
[表紙: Cover Image + Title]
↓
[Title Spread: titleSpreadText + openingNarration]
↓
[本文 page 0]
↓
[本文 page 1]
↓
...
```

- `hasCoverPage === true` かつ `readingStructureVersion === "v2_cover_title_story"` の場合のみ表紙表示
- それ以外は従来どおり page 0 から開始
- BookViewer に reading structure 分岐を追加
- Cover が表示される場合、`titleSpreadText` / `openingNarration` が未設定でも book title のみの Title Spread を表示する（本文 page 0 に急に入らない）

### Step F 詳細: Cover 再生成

- Admin から `coverStatus === "failed"` の book に対して再生成可能
- 既存 `regeneratePageImage` とは別の Cloud Function
- または汎用化して cover / page 共用にする

---

## 8. UI / Reader Impact

### Reader UI

| 状態 | 表示順 |
|------|--------|
| `hasCoverPage=true` & `readingStructureVersion=v2` & cover 生成成功 | Cover → Title Spread → Pages |
| `hasCoverPage=true` & `readingStructureVersion` なし/v1 | Pages (従来どおり) |
| `hasCoverPage=true` & cover 未生成/失敗 | Pages (従来どおり) |
| `hasCoverPage` なし (既存 book) | Pages (従来どおり) |

- 表紙がある場合: 最初に Cover Image + Title を全画面表示
- Cover 表示時は titleSpreadText / openingNarration の有無に関わらず Title Spread を挿入する（book title のみの導入ページとして機能し、本文 page 0 に急に入らない）
- swipe / slide navigation は別 Step で実装

### Admin UI

- Book detail に Cover Summary セクションを追加:
  - `coverStatus` badge
  - `coverImagePrompt` (展開表示)
  - `coverImageUrl` (サムネイル)
  - `coverFailureReason` (failed 時)
  - `coverImageDurationMs` / `coverImageModelProfile`
  - `titleSpreadText` / `openingNarration`
- Cover regeneration button (Step F)

### Quality Metrics (将来追加候補)

- Story Quality Score: `openingSatisfaction` — 導入の質
- Story Quality Score: `coverReadiness` — Cover 画像の適切さ
- Illustration Quality Score: `coverPromptCompleteness` — Cover prompt の具体性

---

## 9. Admin Review Impact

### 既存フローへの影響

- Book Quality Review 画面: Cover フィールドの表示追加 (read-only)
- Page-level review: 影響なし (pages subcollection は変更なし)
- Regeneration: 既存 page regeneration は影響なし
- Quality Task: Cover 関連のタスクを将来追加可能

### 表示場所

Admin Book Detail の既存セクション:
1. Book Detail Card ← ここに Cover summary を追加
2. storyCast Card
3. User Feedback Card
4. Pages Card ← 影響なし
5. Admin Review Form
6. Quality Review Panel
7. Quality Recommendation Panel
8. Task Draft Panel
9. Quality Tasks Panel
10. Debug Summary

---

## 10. Backward Compatibility

### 保証事項

| 項目 | 保証内容 |
|------|---------|
| 既存 pages | pageNumber / text / imageUrl / imagePrompt 一切変更なし |
| 既存 BookDoc | 新フィールドはすべて optional |
| 既存 coverImageUrl | v1 books では page 0 から設定する既存挙動を維持 |
| 既存 Viewer | `hasCoverPage` が undefined/false なら従来動作 |
| 既存 Admin | 新フィールドが未設定なら表示しない |
| 既存 Regeneration | page regeneration は影響なし |
| 既存 Quality Review | 影響なし |
| 既存 Metrics | 影響なし |

### Feature gate

- `hasCoverPage?: boolean` — true の場合のみ新 reading structure を適用
- `readingStructureVersion?: string` — "v1_pages_only" (default) vs "v2_cover_title_story"
- 両方 undefined/false → 完全に従来動作

### Migration

- 既存 book の migration は不要
- 新 book のみ段階的に `hasCoverPage=true` で生成
- A/B テストで品質を確認してから全 book に適用

---

## 11. Implementation Steps

| Step | 内容 | Status |
|------|------|--------|
| **Step A** | Design doc + BookDoc types に optional fields 追加 | **done** |
| **Step B** | Gemini prompt に titleSpreadText / openingNarration 追加 + BookDoc 保存 | **done** |
| **Step C** | Gemini prompt に coverImagePrompt 追加 + BookDoc 保存 + Admin 表示 | **done** |
| **Step D** | Cover image generation + coverStatus + metrics | **done** |
| **Step E** | Reader UI に Cover / Title Spread 表示 | **done** |
| **Step F** | Cover image regeneration (admin) | **done** |
| **Step G** | Swipe / slide page navigation (別件) | **done** |

---

## 12. Acceptance Criteria

### Step A (今回)

- [x] Design doc 完成
- [ ] BookDoc に optional cover fields 追加 (型のみ)
- [ ] `npx tsc --noEmit` パス
- [ ] 既存テスト全パス
- [ ] 既存ページ生成フローへの影響なし

### Step B

- [ ] Gemini story JSON に `titleSpreadText` / `openingNarration` が含まれる
- [ ] BookDoc に保存される
- [ ] 既存 book (titleSpreadText なし) が正常動作
- [ ] Admin UI で確認可能

### Step C

- [ ] Gemini story JSON に `coverImagePrompt` が含まれる
- [ ] BookDoc に保存される
- [ ] Admin UI で prompt 確認可能
- [ ] 画像は未生成

### Step D

- [x] Cover 画像が生成される
- [x] `coverStatus` が正しく遷移する
- [x] 失敗時にフォールバック動作する
- [x] metrics が保存される
- [x] 既存 page 生成に影響なし

### Step E

- [x] `hasCoverPage=true` の book で Cover → Title → Pages 表示
- [x] `hasCoverPage` なし/false の book で従来表示
- [x] Mobile / Desktop 両対応
- [x] `coverStatus !== 'completed'` の場合は cover page を表示しない
- [x] `buildReadingItems` pure function テスト追加

### Step F

- [x] Admin から cover 再生成可能 (`regenerateCoverImage` callable function)
- [x] 失敗→再生成→成功のフロー動作
- [x] metrics 更新 (coverImageDurationMs, coverImageModelProfile, coverImageFallbackUsed)
- [x] 失敗時に coverImageUrl を維持、book status を failed にしない
- [x] Admin UI に「カバー画像を再生成」ボタン追加
- [x] `buildCoverRegenerationSuccessPatch` / `buildCoverRegenerationFailurePatch` テスト 7件

### Step G

- [x] Framer Motion `drag="x"` で横スワイプ対応 (Desktop / Mobile 両方)
- [x] スワイプ方向に応じたアニメーション方向 (direction-aware pageFlip)
- [x] 既存「前」「次」ボタンは維持
- [x] 画像の drag 干渉防止 (`pointer-events-none`)
- [x] swipe threshold テスト追加

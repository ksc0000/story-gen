# EhonAI Product Roadmap

作成日: 2026-05-07
対象リポジトリ: `ksc0000/story-gen`

---

## 0. 現在の到達点

### 実装済み

- `fixed_template` / `guided_ai` / `original_ai` の3モード
- 4ページ生成
- Gemini story JSON 一括生成（1冊分をまとめて生成）
- `storyQualityReport` 生成・保存
- `premium` story rewrite pass（本文磨き直し）
- `storyGoal` / `mainQuestObject` / `forbiddenQuestObjects`
- `storyCast` / `appearingCharacterIds` / `focusCharacterId`
- `styleBible` によるスタイル制御
- スタイルカード画像を通常生成の参照画像に使わない設計
- `story_flexible` 背景方針（ページ役割に応じた自然な背景変化）
- non-human magical creature 対応（characterKind / species）
- recurring character reference 生成（premium_paid / quality モードのみ）
- timeout + fallback（`pro_consistent` → `klein_fast`、120秒）
- `partial_completed` ステータス（1ページ失敗でもBook全体をfailedにしない）
- page image regeneration（失敗ページの再生成）
- admin book quality review UI（管理者レビュー画面）
- feedback 保存（管理者によるテキスト・画像・キャラ一貫性スコア）
- timestamp 保存（`createdAt` / `updatedAt`）
- Firestore rules admin 対応
- `pageVisualRole` によるページ別構図制御
- `visualMotif` / `hiddenDetail` の役割分離
- `repeatedPhrase` のアプリ側表示（画像に文字を描かせない）
- 年齢別本文基盤（`textTemplatesByAge` / `readingProfile.ageBand`）
- quality gate による本文品質検査（薄すぎる本文の再生成）
- 生成メトリクス保存（`imageDurationMs`, `imageAttemptCount`, `imageFallbackUsed` 等）
- `IMAGE_CONCURRENCY` / `IMAGE_GENERATION_TIMEOUT_MS` 環境変数

### 一部実装済み

- 管理者 analytics（レビュー画面あり、SLO ダッシュボード実装済み）
- `originalCharacters` 設計（型定義・Firestore構造設計済み、本格CRUD未実装）
- cast の `approvedImageUrl` / `referenceImageUrl` 参照（構造は準備済み、全cast対応は進行中）
- プラン別制限（`PlanConfig` に `imageModelProfile` 等あり、Stripe課金は未実装）
- content filter（基本フィルタあり、abuse detection は未実装）
- Firebase App Check（計画策定済み、enforcement 未実施）

### 未実装

- ~~SLO メトリクス集計ダッシュボード~~ → 実装済み（admin SLO Dashboard + Snapshot History）
- ~~SLO 自動スナップショット~~ → 実装済み（Daily 03:00 JST / Weekly Mon 03:15 JST、idempotent）
- ~~Stale metadata cleanup~~ → 実装済み（Daily 03:30 JST、collection group query + admin UI）
- ~~Admin Quality Review UI（Story / Illustration / Character / Personalization / Safety score）~~ → 実装済み
- ~~manual quality score 保存~~ → 実装済み
- ~~quality review history~~ → 実装済み
- ~~quality review filter / sort~~ → 実装済み
- ~~batch review workflow~~ → 実装済み
- ~~Quality Trend Dashboard / Regression Detection~~ → 実装済み
- ~~Rewrite / Regeneration Recommendation~~ → 実装済み
- ~~Recommendation Action Buttons~~ → 実装済み（導線のみ、実行なし）
- LLM auto review prototype
- provider abstraction（ImageProvider インターフェース）
- provider 比較・A/B テスト
- Stripe 決済
- PDF 出力
- 共有URL
- 音声読み聞かせ
- 印刷注文
- 本棚UI
- サンプル絵本ギャラリー
- ~~swipe / slide page navigation~~ → 実装済み（Step G: Framer Motion drag="x"）
- ~~cover page generation~~ → 実装済み（Step D: coverImagePrompt + Replicate）
- ~~title spread / opening narration flow~~ → 実装済み（Step B + E: titleSpreadText / openingNarration Reader UI 表示）
- Template Mode 拡充（cover 対応 + テンプレート 10 本 + 8/12 ページ）
- delete account / delete child profile
- admin operation audit log
- rate limit（API レベル）
- Replicate webhook / prediction ID 管理

---

## 1. Product SLO / 売り物の最低基準

### MVP販売開始の候補基準

| 指標 | 基準値 | 説明 |
|---|---|---|
| Book readable rate | >= 98% | ユーザーが少なくとも読める状態で受け取れる率 |
| Book hard failed rate | <= 2% | 完全に何も残らない失敗率 |
| Page image p95 | <= 120秒 | 画像1枚あたりの生成時間 95パーセンタイル |
| Image failed rate | <= 2% | 最終的に画像が得られなかったページの率 |
| Regeneration success rate | >= 95% | 失敗ページの再生成成功率 |

### 追加要件

- `partial_completed` は許容するが、失敗ページ再生成導線がユーザーに見える必要がある
- 管理者が failure reason / duration / fallback / timeout を確認できること
- 読み聞かせ用途として、story opening と page progression が不自然でないこと

---

## 2. Phase 1: Reliability First

### 状態

Phase 1 の実装・可視化・自動化・運用ドキュメントはほぼ完了。現在は production smoke evidence pending。

### 残タスク

- [ ] [Production smoke checklist](./PRODUCTION_SMOKE_CHECKLIST.md)
- [ ] [Production smoke results](./PRODUCTION_SMOKE_RESULTS.md)
- [ ] 実データでの Scheduler 実行確認（saveDailySloSnapshot / saveWeeklySloSnapshot / cleanupStaleGeneration）
- [ ] Firestore index / permission 確認（collection group query の composite index、runs subcollection の read 権限）

### 完了判定

Phase 1 はまだ Complete にしない。`docs/smoke-results/` に production evidence が揃い、Final Decision が更新されるまで `production smoke evidence pending` とする。

---

## 3. Phase 2: Story & Illustration Quality

### 目的

生成結果を「売り物として納得できる絵本」にする。

### 品質仕様

- [Quality Metrics / Phase 2 Review Rubric](./QUALITY_METRICS.md)
- [Manual Quality Review 実機確認チェックリスト](./PHASE2_MANUAL_QUALITY_REVIEW_CHECKLIST.md)
- [Quality Recommendation 実機確認チェックリスト](./PHASE2_QUALITY_RECOMMENDATION_CHECKLIST.md)

### 最初の実装タスク

1. Admin Quality Review UI を追加する。
2. manual quality score を Firestore に保存する。
3. quality review history を保存する。
4. Admin book list / detail で quality score を表示する。
5. quality review filter / sort を追加する。 → **done**
6. batch review workflow（Next Unreviewed / Next Needs Fix / Lowest Score / auto-next）を追加する。 → **done**
7. Quality Trend Dashboard / Regression Detection を追加する。 → **done**
8. Rewrite / Regeneration Recommendation を追加する。 → **done**
9. Recommendation Action Buttons（安全な導線のみ）を追加する。 → **done**
10. Recommendation Intent Handler（message + scroll）を接続する。 → **done**
11. Recommendation Candidate Highlighting（section / page highlight）を追加する。 → **done**
12. Recommendation Task Draft Panel（copyable task draft）を追加する。 → **done**
13. Task Draft persistence design doc を作成する。 → **done** (`docs/QUALITY_TASKS_DESIGN.md`)
14. Quality Task persistence Step 1: 型 + payload builder + tests (10/10 PASS) → **done**
15. Quality Task persistence Step 2: Firestore rules に `qualityTasks` ルール追加 → **done**
16. Quality Task persistence Step 3: 「タスクとして保存」ボタン追加 → **done**
17. Quality Task persistence Step 4: コンポーネントテスト追加 (12/12 PASS) → **done**
18. Quality Task persistence Step 5: Admin UI にタスク一覧パネル追加 → **done**
19. Quality Task persistence Step 6: Task 更新 UI (checklist toggle, status change, resolutionNote) → **done**
20. Quality Task persistence Step 7: Task count badge (未完了タスク数表示) → **done**
21. Cover Page Generation Design doc 作成 (`docs/COVER_PAGE_GENERATION_DESIGN.md`) → **done**

### 次の実装予定: Cover Page / Reading Structure

| Step | 内容 | Status |
|------|------|--------|
| A | Design doc + types | **done** |
| B | titleSpreadText / openingNarration を story JSON に追加 + BookDoc 保存 | **done** |
| C | coverImagePrompt を生成 (画像生成なし) + Admin 表示 | **done** |
| D | Cover image generation + coverStatus + metrics | **done** |
| E | Reader UI に Cover / Title Spread 表示 | **done** |
| F | Cover image regeneration (admin) | **done** |
| G | Swipe / slide page navigation | **done** |

### 含めるタスク

#### 本文品質

- [ ] 年齢別本文品質の継続改善
- [ ] 3歳以上の意味量確保（場所・行動・気持ち・発見の2つ以上）
- [ ] 幼稚すぎる擬音・造語の抑制
- [ ] 日本語の自然さ改善
- [ ] `storyGoal` の維持検証
- [ ] `hiddenDetail` の主目的化防止
- [ ] opening / ending quality 改善
- [ ] 読み聞かせ向け pacing 改善

#### キャラクター一貫性

- [ ] 主人公一貫性の改善
- [ ] 相棒キャラ一貫性の改善
- [ ] 余計な人物が増えない制御（cast 外のキャラが登場しない）
- [ ] character consistency diagnostics

#### 画像品質

- [ ] `styleBible` 改善
- [ ] `pageVisualRole` 改善（構図バリエーション）
- [ ] cover page illustration quality 改善
- [ ] prompt completeness checker
- [ ] image regeneration recommendation

#### 品質管理

- [ ] Story Quality Score rubric 導入
- [ ] Illustration Quality Score rubric 導入
- [ ] Character Consistency / Personalization / Safety score 導入
- [ ] axis-level quality metrics 保存
- [ ] quality review history 保存
- [ ] human review と LLM review の比較分析
- [ ] quality regression detection

### 完了条件

- [ ] Quality Metrics が定義され、roadmap からリンクされている
- [ ] Admin Review 1〜5 rubric が定義されている
- [ ] Future LLM auto review JSON schema が定義されている
- [ ] Firestore field draft が定義されている
- [ ] Admin Quality Review UI が manual score を保存できる
- [ ] paid books の Story Quality Score 平均 >= 80
- [ ] premium books の Story Quality Score 平均 >= 88
- [ ] swipe / slide navigation を含む reading UX が自然
- [ ] 「急に始まる感」feedback が一定以下

---

## 4. Phase 3: Template Mode — Reliability-First 生成

### 目的

最も失敗しにくく、品質が安定する生成モードとして Template Mode (`fixed_template`) を強化する。

### 設計ドキュメント

- [Template Mode Design](./TEMPLATE_MODE_DESIGN.md)

### Phase T1: 既存テンプレート Cover 対応 + 品質改善（4 ページ × 4 本）

| Step | 内容 | Status |
|------|------|--------|
| T1-A | `FixedStoryTemplate` に cover / title / narration テンプレートフィールド追加（型のみ） | **done** |
| T1-B | 既存 4 テンプレートの seed に cover / title / narration テンプレート追加 | **done** |
| T1-C | `generate-book.ts` で fixed_template の cover / title / narration をテンプレート展開 | |
| T1-D | 既存 4 テンプレートの `imagePromptTemplate` 強化 + `pageVisualRole` 追加 | |

### Phase T2: テンプレート拡充（4 ページ × 10 本目標）

| Step | 内容 | Status |
|------|------|--------|
| T2-A | テンプレート 5〜6 追加（memories + emotional-growth） | |
| T2-B | テンプレート 7〜8 追加（bedtime + imagination） | |
| T2-C | テンプレート 9〜10 追加（learning + favorite-worlds） | |
| T2-D | テンプレートプレビュー画像の生成・設定 | |
| T2-E | テーマ選択 UI のプレビュー画像表示 | |
| T2-F | テンプレート品質のテスト生成・レビュー | |

### Phase T3: 8/12 ページ + バリアント

| Step | 内容 | Status |
|------|------|--------|
| T3-A | `TemplateData` に `availablePageCounts` / `variantOf` / `variantLabel` 追加 | |
| T3-B | 人気テンプレート 2〜3 本の 8 ページ版作成 | |
| T3-C | PlanConfig 更新: `light_paid` で 8 ページ fixed_template 許可 | |
| T3-D | テーマ選択 UI でバリアント / ページ数選択対応 | |

### 完了条件

- [ ] 既存 4 テンプレートが cover / title / narration 対応済み
- [ ] 合計 10 本以上の 4 ページテンプレートが seed 済み
- [ ] テンプレート生成の成功率 >= 99%
- [ ] 8 ページテンプレートが 2 本以上利用可能
- [ ] テーマ選択画面にプレビュー画像が表示される

---

## 6. Phase 5: Monetization

(既存内容維持)

---

## 7. Phase 6: User Experience

### 目的

ユーザーが作成・閲覧・修正・共有しやすい体験にする。

### 売り物化前 必須

- [ ] 本棚UI（作成済み絵本一覧）
- [ ] 絵本閲覧UI（ページめくり）
- [x] swipe / slide page navigation
- [x] cover page / title spread / opening narration
- [ ] animated page transition
- [ ] 失敗ページ再生成導線（ユーザー向け）
- [ ] 作成履歴（作成日表示）
- [ ] feedback 送信UI
- [x] cover page / title spread 対応
- [x] opening narration flow

### 売り物化前 推奨

- [ ] 「このページだけ仕上げる」（partial_completed 時）
- [ ] 「このページだけ作り直す」（ユーザー起点の再生成）
- [ ] タイトル編集
- [ ] サンプル絵本ギャラリー
- [ ] read-aloud mode

---

## 10. 優先順位

### Now（現在着手中〜次に着手）

- [Template Mode Design](./TEMPLATE_MODE_DESIGN.md) — Phase T1 実装
- Phase T1-C: generate-book.ts で fixed_template の cover / title / narration テンプレート展開
- Phase T1-D: 既存 4 テンプレートの imagePromptTemplate 強化 + pageVisualRole 追加
- [Production smoke checklist](./PRODUCTION_SMOKE_CHECKLIST.md)
- production smoke evidence 確認

---

## 12. Codex / Claude Code への依頼単位

### Phase 2 の依頼例

```
- "Admin Quality Review UIを追加して、Story / Illustration / Personalization / Character / Safety scoreを入力できるようにして"
- "manual quality reviewをbooks/{bookId}/qualityReviews/{reviewId}に保存して"
- "books/{bookId}にquality score summaryを保存してadmin一覧に表示して"
- "LLM auto review prompt draftを追加して"
- "character consistency diagnosticsを追加して"
```

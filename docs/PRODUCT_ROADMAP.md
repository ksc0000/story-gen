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
- ~~provider abstraction（ImageProvider インターフェース）~~ → **P3-15s COMPLETE（ページ生成）**: `docs/PHASE3_IMAGE_PROVIDER_CLOSURE.md` | 残余スコープ: カバー画像・キャラ参照（P4 追跡）
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

**Complete (2026-06-12)**

Phase 1 の実装・可視化・自動化・運用ドキュメントは完了。Production smoke evidence により動作確認済み。

### 残タスク

- [x] [Production smoke checklist](./PRODUCTION_SMOKE_CHECKLIST.md)
- [x] [Production smoke results](./PRODUCTION_SMOKE_RESULTS.md)
- [x] 実データでの Scheduler 実行確認（saveDailySloSnapshot / saveWeeklySloSnapshot / cleanupStaleGeneration）
- [x] Firestore index / permission 確認（collection group query の composite index、runs subcollection の read 権限）

### 完了判定

Phase 1 は 2026-06-12 に Complete と判定。`docs/PRODUCTION_SMOKE_RESULTS.md` にて production evidence を確認済み。

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
- [Template Smoke Checklist](./TEMPLATE_SMOKE_CHECKLIST.md)
- [Character Reference Strategy (REF-001)](./CHARACTER_REFERENCE_STRATEGY.md)
- [Template Mode T3 Plan](./TEMPLATE_MODE_T3_PLAN.md)

### Quality Follow-ups（Template Mode 画像品質）

- IMG-001（短期・実施済み / minor follow-up継続）: fixed template image prompts に no-text / no-signage 制約を追加し、看板・文字混入を抑制。重大な可読文字混入は現状ブロッカーではなく、T2-B / T2-C / T3 の blocking ではない。次回 seed/prompt 更新時に sign / label / poster / banner / storefront sign など文字誘発語をさらに避ける。
- IMG-002（短期・実施済み）: prompt-level character reference isolation を追加し、参照画像の背景リーク（例: 砂場背景）を抑制
- REF-001（中長期・設計 / planned-design）: identity-only reference strategy（neutral reference image + character sheet）を設計し、参照画像の背景・構図依存を段階的に縮小。現在は design-in-progress で、T2-B / T2-C / T3 の blocking ではない。

### Phase T1: 既存テンプレート Cover 対応 + 品質改善（4 ページ × 4 本）

| Step | 内容 | Status |
|------|------|--------|
| T1-A | `FixedStoryTemplate` に cover / title / narration テンプレートフィールド追加（型のみ） | **done** |
| T1-B | 既存 4 テンプレートの seed に cover / title / narration テンプレート追加 | **done** |
| T1-C | `generate-book.ts` で fixed_template の cover / title / narration をテンプレート展開 | **done** |
| T1-D | 既存 4 テンプレートの `imagePromptTemplate` 強化 + `pageVisualRole` 追加 | **done** |
| T1-Smoke | fixed_template 6テンプレート（既存4 + T2-A追加2）の実生成 smoke checklist 実行 | |

### Phase T2: テンプレート拡充（4 ページ × 10 本目標）

| Step | 内容 | Status |
|------|------|--------|
| T2-A | テンプレート 5〜6 追加（memories + emotional-growth） | **done** |
| T2-B | テンプレート 7〜8 追加（bedtime + imagination） | **done** |
| T2-C | テンプレート 9〜10 追加（daily-life + growth-support） | **done** |
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

### T3 実装前の推奨順序（pre-implementation plan）

- T3-1: Template selection UI 改善（カテゴリ導線 / 推奨表示 / stable 概念）
- T3-2: 既存10テンプレート品質磨き込み（scene anchor / 読み聞かせ自然さ / IMG-001 minor follow-up）
- T3-3: 8/12ページ対応（後続）

T3-1 status update (2026-05-12):

- 実装: **done**（commit `6eeed5d`）
- 実装内容: fixed_template category grouping、card metadata（category/pageCount/recommendedAge/templateId）、安定テンプレート/SMOKE済み badge
- 検証: typecheck/lint/test は pass（lint は既存 warning のみ）
- 実機目視: **verified**（fixed_template 10本表示、category grouping、card metadata、badge、`/create/input` 遷移、PC/モバイル表示、guided_ai/original_ai 導線いずれも PASS）

T3-2 status update (2026-05-12):

- 棚卸し: **review-started (docs only)**
- 成果物: [Template Quality Review](./TEMPLATE_QUALITY_REVIEW.md)
- 内容: 10本を category fit / story structure / text / image prompt / visual role / smoke readiness / product value で棚卸し
- 優先度: P0=0 / P1=3観点 (`fixed-brush-teeth` の `pageVisualRole` 整合、`fixed-first-birthday` / `fixed-sleepy-moon-adventure` / `fixed-little-helper` の sampleImage 重複・カテゴリ不一致) / P2=4観点 / No action=2本
- 次アクション: P1 項目から段階適用（T3-2a〜T3-2d を docs に列挙済み）

T3-4j / T3-4k status update (2026-05-15):

- T3-4j-1: **completed** — `fixed-brush-teeth-8p` BF-4 targeted prompt cleanup（page 1, 4, 6, 7 の bathroom no-text constraints 強化）
- T3-4k: **completed (docs-only)** — fixed-template 絵本文言 Japanese Orthography Policy 策定（OR-1〜OR-8、field classification 定義）
- T3-4k-1: **completed (read-only audit)** — preschool_3_4 page 0〜6 に漢字違反を確認
- T3-4k-2: **completed** — preschool_3_4 page 0〜6 をひらがな-first に最小限 cleanup（commit `cd3c946`）
- T3-4k-3: **completed (static verification)** — 全 page の preschool_3_4 text に漢字なし・placeholder 正常を確認、Go 判定

補足:

- T3-3 は生成時間・失敗率・コスト・運用手順への影響が大きいため、4ページ運用の UX/品質を先に固めてから着手する。
- 詳細は [Template Mode T3 Plan](./TEMPLATE_MODE_T3_PLAN.md) を参照。

### 完了条件

- [x] fixed_template 6テンプレート（既存4 + T2-A追加2）が cover / title / narration 対応済み
- [ ] fixed_template 6テンプレートの smoke checklist が実行済み
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

- [Template Smoke Checklist](./TEMPLATE_SMOKE_CHECKLIST.md) — fixed_template 6テンプレートの実生成確認
- ADMIN-001（Admin discoverability）: **resolved**（commit `c4e202b`、実機確認 5/5 pass）
- IMG-002 verification（fixed_template 6本で背景リーク再発有無を継続確認）
- REF-001 design-in-progress（neutral character reference image / identity-only reference strategy の設計、[Character Reference Strategy](./CHARACTER_REFERENCE_STRATEGY.md)）
- Phase T2-C: テンプレート 9〜10 追加（learning + favorite-worlds）
- [Production smoke checklist](./PRODUCTION_SMOKE_CHECKLIST.md)
- production smoke evidence 確認

### Phase 4: Gemini JSON Hardening（現在優先）

**P4-1 設計 COMPLETE** — `docs/PHASE4_GEMINI_JSON_HARDENING_PLAN.md` 参照

Gemini story JSON 生成・スキーマ検証失敗を P3 後の最優先信頼性課題として扱う。P3-15s smoke で `schema_validation` / `Failed to parse LLM JSON response` がページ生成前に発生したことを受けて設計を策定。

#### P4 スライス

| スライス | タイトル | 優先度 | 状態 |
|---|---|---|---|
| **P4-1** | Gemini JSON hardening inventory and design | 最優先 | ✅ COMPLETE |
| **P4-2** | 構造化 story validation エラー taxonomy / logging | 高 | ✅ COMPLETE (bde7bb9) |
| **P4-3** | malformed/wrong-type Gemini レスポンス用 unit fixture | 高 | ✅ COMPLETE |
| **P4-4** | 安全な JSON extraction/repair helper（test-only first） | 中 | ✅ COMPLETE |
| **P4-5** | one-shot validation repair retry（flag 制御） | 中 | ✅ COMPLETE (d8c4bca) |
| **P4-6** | repair フローの live smoke | 中 | ✅ COMPLETE (PASS with limitation) |
| **P4-7** | メトリクスに基づくプロンプト instruction チューニング | 低 | ✅ COMPLETE |
| **P4-7s** | mainQuestObject prompt hardening targeted smoke | — | ✅ PASS (5 books, 0 recurrence) |
| **P4-8** | Gemini `response_schema` migration design | 低 | ✅ DESIGN COMPLETE |
| **P4-9** | story response schema constant（not wired） | 低 | ✅ COMPLETE |
| **P4-10** | schema compatibility tests vs validateStory() | 低 | ✅ COMPLETE |
| **P4-11** | responseSchema を flag 制御で Gemini config に接続 | 低 | ✅ COMPLETE |
| **P4-12** | responseSchema live smoke + rollback | 低 | ✅ COMPLETE (FAIL — null handling gap; rollback済み) |
| **P4-12a** | validateStory() null→undefined coercion | 低 | ✅ COMPLETE |
| **P4-12b** | responseSchema ON JSON parse hardening | 低 | ✅ COMPLETE |
| **P4-12c** | responseSchema re-smoke after P4-12a/b | 低 | ✅ COMPLETE (FAIL — 4/5 malformed_json; rollback済み) |
| **P4-12d** | responseSchema parse failure 安全診断ログ | 低 | ✅ COMPLETE |
| **P4-12e** | 診断付きライブスモーク（根本原因特定） | 低 | ✅ COMPLETE |
| **P4-12f** | 最小スキーマスパイク（714文字 = 21.5%） | 低 | ✅ COMPLETE |
| **P4-12g** | 最小スキーマモード + ライブスモーク | 低 | ✅ COMPLETE (FAIL — responseSchema断念決定) |
| **P4-14** | responseSchema rollout 断念決定記録 | — | ✅ COMPLETE — responseSchema は本番導入しない |
| **P4-15** | 永続的 story JSON SLO 監視計画 + repair retry 判断フレームワーク | — | ✅ COMPLETE |
| **P4-16-a** | SLO report `storyJsonFailureCategory` 内訳 | — | ✅ COMPLETE |
| **P4-16-b** | SLO report `storyDurationMs` パーセンタイル (p50/p95/p99) | — | ✅ COMPLETE |

#### P4 判定

**P4 クローズ済み（P4-17）。** responseSchema ロールアウトは断念。Gemini story JSON hardening の成果はプロンプト強化 + `validateStory()` + parse diagnostics として永続化。
クロージャー記録: [PHASE4_GEMINI_JSON_HARDENING_CLOSURE.md](./PHASE4_GEMINI_JSON_HARDENING_CLOSURE.md)
詳細: [PHASE4_GEMINI_JSON_HARDENING_PLAN.md](./PHASE4_GEMINI_JSON_HARDENING_PLAN.md) / [P4_RESPONSE_SCHEMA_DECISION.md](./P4_RESPONSE_SCHEMA_DECISION.md)

#### 推奨次タスク

| タスク | 内容 | 優先度 |
|--------|------|--------|
| **P4-16-a** | `report-generation-slo.mjs` に `storyJsonFailureCategory` 内訳追加 | ✅ COMPLETE (2026-05-21) |
| **P4-16-b** | `report-generation-slo.mjs` に `storyDurationMs` histogram (p50/p95/p99) 追加 | ✅ COMPLETE (2026-05-21) |
| **P4-16-baseline** | 7日間ベースライン計測: Cloud Logging export → SLO report 実行 → P4-15 §7.2 記入 | ✅ COMPLETE (2026-05-21, dev/test baseline — 本番利用開始後に再計測) |
| **P4-17** | Phase 4 クロージャー記録 | ✅ COMPLETE (2026-05-21) |

#### P4 以降の別トラックタスク（P2 SLO 自動化）

| タスク | 内容 | 優先度 |
|--------|------|--------|
| **P2-7（alert plan）** | Generation SLO Alert Automation Plan — Cloud Logging フィルター定義、アラート候補 (SJ/IM/CG/DQ)、実装スライス P2-8〜P2-12 を文書化 | ✅ COMPLETE (2026-05-21) — [P2_GENERATION_SLO_ALERT_AUTOMATION_PLAN.md](./P2_GENERATION_SLO_ALERT_AUTOMATION_PLAN.md) |
| **P2-8** | Cloud Logging 保存クエリ定義（Log Explorer 用、15 クエリ — CG/SJ/IM/LAT/OUT/DQ） | ✅ COMPLETE (docs, 2026-05-21) — [P2_GENERATION_SLO_SAVED_LOGGING_QUERIES.md](./P2_GENERATION_SLO_SAVED_LOGGING_QUERIES.md)；Cloud Console への import は手動 |
| **P2-9** | Cloud Monitoring ログベースメトリクス定義（15 metrics — YAML config + gcloud コマンド） | ✅ COMPLETE (2026-05-21) — [P2_GENERATION_SLO_LOG_BASED_METRICS.md](./P2_GENERATION_SLO_LOG_BASED_METRICS.md)；live 作成は P2-9 実装者が gcloud コマンドを実行 |
| **P2-10** | CG-1 アラートポリシー定義（YAML spec + gcloud コマンド + 初動対応ランブック） | ✅ COMPLETE (live, 2026-05-21) — [P2_CG1_CANDIDATE_GATE_ALERT_POLICY.md](./P2_CG1_CANDIDATE_GATE_ALERT_POLICY.md)；metric + policy 作成済み |
| **P2-11** | ダッシュボードパネル追加（CG/SJ/IM/LAT シグナル） | ✅ COMPLETE (live, 2026-05-21) — [P2_GENERATION_SLO_DASHBOARD_PANELS.md](./P2_GENERATION_SLO_DASHBOARD_PANELS.md)；8パネル + 2 optional；live `dashboards/39c916aa-ea17-4487-80e1-9c81e47cee3b` |
| **P2-latency-metric** | `story_duration_ms` distribution metric 作成 + LAT-1 ダッシュボードパネル p95/p99 live 化 | ✅ COMPLETE (live, 2026-05-21) — metric `logging.googleapis.com/user/generation/story_duration_ms`；LAT-1 XY chart `ALIGN_PERCENTILE_95`/`ALIGN_PERCENTILE_99`；閾値線 120 000ms/180 000ms |
| **P2-10b** | SJ/IM アラートポリシー定義（SJ-1..SJ-4, IM-1..IM-9 — 13 ポリシー） | ✅ COMPLETE (docs/config, 2026-05-21) — [P2_SJ_IM_ALERT_POLICIES.md](./P2_SJ_IM_ALERT_POLICIES.md)；全ポリシー `enabled: false`；live 作成は P2-10b-live |
| **P2-10b-live** | SJ/IM アラートポリシー live 作成（9 metrics + 13 policies disabled） | ✅ COMPLETE (live disabled, 2026-05-21) — 9 metrics live；13 policies `enabled: false`；有効化は prod-baseline 後 |
| **P2-10b-enable** | 本番 baseline ≥ 30 books 後に SJ/IM ポリシーの閾値チューニングと有効化 | ✅ COMPLETE (2026-06-09) — [P2_SJ_IM_ALERT_POLICIES.md](./P2_SJ_IM_ALERT_POLICIES.md) |
| **P2-12** | 通知チャンネル設定＋CG-1 ポリシー有効化 | ✅ COMPLETE (live, 2026-05-21) — Email チャンネル `notificationChannels/202814648286910376`（kikushun0529@gmail.com）接続済み；CG-1 ポリシー `enabled: true` |
| **prod-baseline** | 本番ユーザー 7日分データで再計測、P4-15 §7.2 更新、repair retry 判断 | ⚠️ ATTEMPTED (2026-05-21) — 19 book_outcomes（dev/test のみ、閾値 30 未満）；記録: [P4_PERMANENT_STORY_JSON_SLO_PLAN.md](./P4_PERMANENT_STORY_JSON_SLO_PLAN.md) §7.3；本番トラフィック待ち |
| — | `ENABLE_SCHEMA_REPAIR_RETRY` 本番有効化判断（prod-baseline 完了後のみ） | 低 |
| — | 新たな `field_type_mismatch` パターン発生時のプロンプト追加強化 | 低（on-demand） |

#### P5 ソフトローンチ・本番トラフィック

| タスク | 内容 | 優先度 |
|--------|------|--------|
| **P5-1** | ソフトローンチ計画 — コホート A/B/C 定義、baseline rerun トリガー、P2-10b-enable ゲート | ✅ COMPLETE (docs, 2026-05-21) — [P5_FIRST_PRODUCTION_TRAFFIC_PLAN.md](./P5_FIRST_PRODUCTION_TRAFFIC_PLAN.md) |
| **P5-2** | ソフトローンチ招待 & フィードバックキット — 日本語招待テンプレート、テスター操作ガイド、フィードバックフォーム設計、インシデント報告テンプレート、オペレーター事前チェックリスト | ✅ COMPLETE (templates, 2026-05-21) — [P5_SOFT_LAUNCH_INVITE_KIT.md](./P5_SOFT_LAUNCH_INVITE_KIT.md)；招待送付は手動・別ステップ |
| **P5-3** | Cohort A 実行チェックリスト — 招待送付手順、初回 1h 監視手順、停止条件、インシデント対応、Cohort B ゲート評価 | ✅ COMPLETE (checklist, 2026-05-21) — [P5_COHORT_A_EXECUTION_CHECKLIST.md](./P5_COHORT_A_EXECUTION_CHECKLIST.md)；招待はこのチェックリストを使用して手動送付 |
| **P5-3-execute** | Cohort A ソフトローンチ実施 — SLO（book readable 100%、p95 storyMs 108s）は合格。**ただし竹プランの画質 UX バグ（全ページ同じ絵・スタイル非反映）が判明、PM 判断により Cohort B はこのバグの修正／軽減まで保留。** P5-3c-verify PASS により解消確認済み。 | ✅ Cohort A 完了 (2026-05-22) — Cohort B: ✅ **GO (2026-05-22)** — 限定ロールアウト実施中。[P5_COHORT_B_GO_NOGO_CHECKLIST.md](./P5_COHORT_B_GO_NOGO_CHECKLIST.md) |
| **P5-3-execute-b** | Cohort B 限定ロールアウト実施 — P5-3c-verify PASS を受けた PM GO 判断。3–5 テスターへの限定招待。初回 1h monitoring window active。SJ/IM 有効化・閾値チューニング済み（2026-06-09）。招待人数上限 5 名、公開アクセス不可。 | 🟡 **実施中 (2026-06-11)** — テクニカルチェック完了、限定ロールアウト中。[P5_COHORT_B_GO_NOGO_CHECKLIST.md](./P5_COHORT_B_GO_NOGO_CHECKLIST.md) |
| **P5-3b** | 竹プラン画質 UX バグ修正 — 「全ページ同じ絵・スタイル非反映」根本対策。`buildImagePrompt` でスタイル＋シーンを先頭に移動、imagePrompt 多様性 quality check 追加、ページ別診断ログ追加。 | ✅ COMPLETE (2026-05-22) — テスト 1604 件全通過 |
| **P5-3b-verify** | 竹プラン修正後の動作確認 — 手動確認の結果 **❌ No-Go**。プロンプト順序変更だけでは不十分で、ページ画像が依然として同じ絵になる。**根本原因（P5-3c で特定）**: カバー画像生成はキャラクターバイブルなし・参照画像なしのシンプルなプロンプトで生成するが、ページ生成はキャラクター一貫性ルール（300+ 語）を含む重いプロンプトで生成するため、FLUX Pro が全ページで同一キャラクターを過度に描く。 | ❌ No-Go (2026-05-22) |
| **P5-3c** | 竹プラン画質ブロッカー ゲート付き実験 — カバー生成パスとページ生成パスの比較調査＋実験実装。`generationOverride.p5PageExperiment === "simplified_scene"` をユーザー doc に設定した管理者/QA テスターのみ有効。実験内容: キャラクターバイブルなし・参照画像なしのカバースタイル短縮プロンプトでページ画像を生成し、スタイル反映・ページ多様性・キャラクター一貫性の影響を検証。診断ログ `cover_vs_page_profile_diagnostic` / `p5_page_experiment_active` 追加。 | ✅ COMPLETE (2026-05-22) — テスト 1604 件全通過。Firebase Functions デプロイ済み (commit `53654a2`)。**P5-3c-verify PASS** |
| **P5-3c-verify** | `simplified_scene` 実験の手動 QA 確認 — 5 ケース（竹×4テーマ＋梅 regression）を生成し目視確認。スクリプト: `set-p5-page-experiment.js` → `create-p5-3c-verify-books.js` → `print-p5-3c-verify-log-queries.mjs`。**検証 Book ID**: 竹/animals `tTlbiAXfMt0FQzaJx9Fk`、竹/adventure `4bV2CgTvxGfk4wz2CE05`、竹/fantasy `Jc8SlFBhhwFLVahSpVoy`、竹/bedtime `pjZl8L8EgliaXBSlbInj`、梅/zoo `Uveaym8ATgw6z0ulMjWR`。**自動チェック結果**: 32/32 ページ completed、`p5_page_experiment_active` 32/32 発火、プロンプト 93% 削減（9100 字 → 620 字）、`duplicate_page_image_urls_detected` ゼロ、`image_prompt.all_identical` ゼロ、`book_early_failed` ゼロ。Case 4 (bedtime) は 4/8 fallback ページあり・目視で品質問題なし。**目視 QA 結果**: 4 スタイル（soft_watercolor / colorful_pop / anime_storybook / classic_picture_book）すべて反映確認。各ページで明確に異なるシーン。参照画像支配ゼロ。梅 regression 影響なし。**残存リスク（解消済み → P5-3d で対応）**: 子ども写真登録済みユーザーでのキャラクター一貫性は未検証（P5-3c では写真ありスモークテストなし）。P5-3d-verify（写真あり×4冊）にて構造的な参照画像損失を確認 → P5-3d でガード済み。 | ✅ PASS (2026-05-22) |
| **P5-3d** | `simplified_scene` ガード付き条件分岐実装 — 写真なしユーザーのみ `simplified_scene` を適用し、写真ありユーザーは従来の参照画像パスへルーティング。**PM 判断**: グローバル昇格は非承認、写真なし限定候補パスとして承認（2026-06-03）。**実装**: `generate-book.ts` に `hasReferenceImage` ガード追加、`useSimplifiedScene = p5PageExperiment === "simplified_scene" && !hasReferenceImage` ロジック。診断ログ `p5_page_experiment_active` に `hasReferenceImage` / `useSimplifiedScene` / `p5PageExperimentRequested` / `inputImageUrlsClearedCount` を追加。**検証根拠**: P5-3d-verify — 写真なし×2冊 PASS（inputImageUrlsCleared=0）、写真あり×2冊 PARTIAL（inputImageUrlsCleared=8/冊、参照画像が全ページで消去される構造的問題を確認）。 | ✅ COMPLETE (2026-06-03) — テスト 1746 件全通過。本番デフォルト変更なし。デプロイ承認待ち。 |
| **P5-3f** | Option C Safer High-Quality Retry 実装・デプロイ・スモーク PASS — `generatePageImageWithFallback` に 3 ステップリトライ（Step a: pro_consistent + 通常プロンプト、Step b: pro_consistent + 簡略プロンプト + 参照画像なし、Step c: klein_fast 最終手段）を `generationOverride.p5ModelUnification === "safer_retry"` ゲートで実装（commit `e75fc73`）。内部スモーク結果: **Step a=3 / Step b=5 / Step c=0 / fallbackPages=0/8 / book_early_failed=0**（Cohort B #2 ベースライン fallbackPages=8/8 から改善）。デプロイ時に `firebase.json` に predeploy ビルドフックが存在しないため stale `lib/` がデプロイされる問題が判明 → commit `bb1a6c2` で `npm --prefix functions run build` フックを追加し修正済み。 | ✅ IMPLEMENTED / DEPLOYED / SMOKE PASS (2026-06-03) |
| **P5-3h** | Cohort B への Safer High-Quality Retry 適用 — `generationOverride.p5ModelUnification === "safer_retry"` ゲートを Cohort B 全テスターへ適用するためのツールを準備。`pro_consistent` のデフォルト化（P5-4a）により実質的に全テスターに有効。 | ✅ COMPLETE (2026-06-12) |
| **P5-4** | prod-baseline 再計測 — ≥ 30 real `book_outcome` 蓄積後に再実行、P4_PERMANENT §7.N 更新 | ✅ COMPLETE (2026-05-23) — 35 records, real users |
| **P5-5** | P2-10b-enable — SJ/IM アラートポリシー閾値チューニング＋有効化（prod-baseline 確定後のみ） | ✅ COMPLETE (2026-06-09) — 全13ポリシー有効化済み |

> **Cohort B HOLD 解除条件（P5-3c 実験検証完了基準）** — ✅ ALL PASSED (2026-05-22)
> - ~~`simplified_scene` 実験で各ページが異なる絵になることを 2 テーマ以上で目視確認~~ ✅ 4 テーマすべて確認
> - ~~選択したスタイルが視覚的に反映されている~~ ✅ 全スタイル反映確認
> - ~~`page_image_failed = 0`（成功ケース）~~ ✅ ゼロ
> - ~~`duplicate_page_image_urls_detected` / `image_prompt.all_identical` が出ない~~ ✅ ゼロ
> - ~~ビルド・テスト全通過~~ ✅ 確認済み
>
> **→ Cohort B: ✅ GO (限定ロールアウト, 2026-05-22)** — PM GO 判断確定。3–5 テスターへの限定招待。SJ/IM は引き続き disabled。招待時に `simplified_scene` 実験フラグを付与するか、本番 default に昇格するかは引き続き PM が決定する。残存リスク: 子ども写真登録済みユーザーでのキャラクター一貫性は未検証。詳細: [P5_COHORT_B_GO_NOGO_CHECKLIST.md](./P5_COHORT_B_GO_NOGO_CHECKLIST.md)

#### P4 以降の追跡タスク（P3 Closure から）

- P4-cover: `generateCoverImage()` を `ImageProvider` adapter へ移行
- P4-ref: `ensureRecurringCharacterReferences()` を `ImageProvider` adapter へ移行（P4-cover 完了後）
- P4-logging: Cloud Logging クエリ自動化（smoke 実行の可観測性向上）
- P4-cost: provider コスト比較ダッシュボード（`imageModel` フィールド活用）

詳細: [PHASE4_GEMINI_JSON_HARDENING_CLOSURE.md](./PHASE4_GEMINI_JSON_HARDENING_CLOSURE.md) / [PHASE4_GEMINI_JSON_HARDENING_PLAN.md](./PHASE4_GEMINI_JSON_HARDENING_PLAN.md) / [PHASE3_IMAGE_PROVIDER_CLOSURE.md §10](./PHASE3_IMAGE_PROVIDER_CLOSURE.md)

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

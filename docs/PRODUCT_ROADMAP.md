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

- 管理者 analytics（レビュー画面はあるが集計ダッシュボードは未実装）
- `originalCharacters` 設計（型定義・Firestore構造設計済み、本格CRUD未実装）
- cast の `approvedImageUrl` / `referenceImageUrl` 参照（構造は準備済み、全cast対応は進行中）
- プラン別制限（`PlanConfig` に `imageModelProfile` 等あり、Stripe課金は未実装）
- content filter（基本フィルタあり、abuse detection は未実装）
- Firebase App Check（計画策定済み、enforcement 未実施）

### 未実装

- SLO メトリクス集計ダッシュボード
- provider abstraction（ImageProvider インターフェース）
- provider 比較・A/B テスト
- Stripe 決済
- PDF 出力
- 共有URL
- 音声読み聞かせ
- 印刷注文
- 本棚UI
- サンプル絵本ギャラリー
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

### SLO設計の考え方

- **「画像API失敗」と「ユーザーにとっての失敗」を分ける**
  - 画像APIが1回タイムアウトしても、fallback model で成功すればユーザーにとっては成功
  - 3回リトライして最終的に画像が残ればユーザーにとっては成功
- **ユーザーにとって最悪なのは、待った後に何も残らないこと**
  - hard failed = 完全に読めない本
  - partial_completed = 一部ページが欠けているが、残りは読める
- **`partial_completed` は、後から仕上げられる場合のみ商品UXとして許容**
  - page regeneration 導線がなければ、partial_completed は実質 failed と同じ
  - page regeneration が動いていれば、partial_completed は「まだ完成していない本」であり、ユーザーが仕上げられる

---

## 2. Phase 1: Reliability First

### 目的

生成速度と失敗率を売り物水準に近づける。

### 含めるタスク

#### 生成制御

- [ ] per-page deadline の導入（ページごとの残り時間管理）
- [ ] fallback model の安定化（`pro_consistent` → `klein_fast` の切替判定改善）
- [ ] `partial_completed` → `completed` への復旧フロー確認
- [ ] stale metadata cleanup（古い生成中データの掃除）
- [ ] regeneration history 保存（再生成の試行履歴）

#### SLO メトリクス

- [ ] image p50 / p90 / p95 の集計
- [ ] timeout 率の集計
- [ ] fallback 率の集計
- [ ] Book hard failed 率の集計
- [ ] daily / weekly での可視化

#### インフラ

- [ ] Firebase Functions `maxInstances` / `concurrency` 設計
- [ ] Replicate prediction cancel / polling 検討（Phase 3 で本格対応）

### 完了条件

- 管理者画面で直近 50〜200 ページの失敗率と p95 が見える
- `image_failed` ページを再生成できる
- `partial_completed` から `completed` へ復旧できる

---

## 3. Phase 2: Story & Illustration Quality

### 目的

生成結果を「売り物として納得できる絵本」にする。

### 含めるタスク

#### 本文品質

- [ ] 年齢別本文品質の継続改善
- [ ] 3歳以上の意味量確保（場所・行動・気持ち・発見の2つ以上）
- [ ] 幼稚すぎる擬音・造語の抑制
- [ ] 日本語の自然さ改善
- [ ] `storyGoal` の維持検証
- [ ] `hiddenDetail` の主目的化防止

#### キャラクター一貫性

- [ ] 主人公一貫性の改善
- [ ] 相棒キャラ一貫性の改善
- [ ] 余計な人物が増えない制御（cast 外のキャラが登場しない）

#### 画像品質

- [ ] `styleBible` 改善
- [ ] `pageVisualRole` 改善（構図バリエーション）

#### 品質管理

- [ ] 管理者スコア集計（adminTextQualityScore / adminImageQualityScore / adminCharacterConsistencyScore）
- [ ] feedback 分析（頻出パターンの抽出）

### 完了条件

- `adminTextQualityScore` 平均 >= 4.0
- `adminImageQualityScore` 平均 >= 4.0
- `adminCharacterConsistencyScore` 平均 >= 4.0
- 「主人公が増える」系 feedback が一定以下

---

## 4. Phase 3: Image Provider Strategy

### 目的

Replicate 固定をやめ、速度・費用・品質に応じて provider を比較・切替できるようにする。

### 含めるタスク

- [ ] ImageProvider abstraction の設計・実装
- [ ] Replicate adapter
- [ ] BFL Direct adapter
- [ ] fal.ai adapter
- [ ] Gemini Image / Nano Banana adapter（検討）
- [ ] OpenAI Image adapter（検討）
- [ ] provider 別 estimated cost の整理
- [ ] provider 別 p95 の計測
- [ ] provider 別 failure rate の計測
- [ ] provider 別 admin quality score の集計
- [ ] provider fallback chain の設計
- [ ] provider A/B testing 基盤

### 方針

- 今すぐ Replicate を捨てない
- Replicate は検証・比較のベースラインとして有効
- 本番では provider lock-in を避ける設計にする
- Replicate webhook / polling / prediction ID 管理はこのフェーズで本格対応

---

## 5. Phase 4: Admin Analytics

### 目的

感覚ではなくデータで改善できる管理画面へ進化させる。

### 含めるタスク

- [ ] daily generation count
- [ ] plan 別生成数
- [ ] status 別生成数（completed / partial_completed / failed）
- [ ] p95 image duration
- [ ] failure rate
- [ ] fallback rate
- [ ] timeout rate
- [ ] regeneration success rate
- [ ] feedback average（テキスト・画像・キャラ一貫性）
- [ ] admin score average
- [ ] cost estimate（provider × 枚数）
- [ ] provider 別比較ビュー

---

## 6. Phase 5: Monetization

### 目的

有料販売できるプラン・課金・利用制限を整える。

### 含めるタスク

#### 課金基盤

- [ ] Stripe 導入（Checkout / Customer Portal / Webhook）
- [ ] プラン設計と制限の実装

#### プラン別制限

| 項目 | free | light | standard | premium |
|---|---|---|---|---|
| 月間生成回数 | 1〜2冊 | 3〜5冊 | 10〜15冊 | 無制限候補 |
| ページ数 | 4固定 | 4 | 4〜8 | 4〜12 |
| 再生成回数 | 1回/冊 | 2回/冊 | 5回/冊 | 無制限候補 |
| 作成モード | fixed_template | fixed + guided | 全モード | 全モード |
| quality mode | reliable_fast | reliable_fast | reliable_fast | quality |
| 相棒キャラ保存 | 不可 | 1体 | 3体 | 無制限候補 |

#### 課金UX

- [ ] 失敗時 credit 返却ポリシー
- [ ] `partial_completed` 時の扱い（credit 消費しない / 消費して再生成無料）
- [ ] 領収書・決済履歴
- [ ] 返金ポリシー

---

## 7. Phase 6: User Experience

### 目的

ユーザーが作成・閲覧・修正・共有しやすい体験にする。

### 売り物化前 必須

- [ ] 本棚UI（作成済み絵本一覧）
- [ ] 絵本閲覧UI（ページめくり）
- [ ] 失敗ページ再生成導線（ユーザー向け）
- [ ] 作成履歴（作成日表示）
- [ ] feedback 送信UI

### 売り物化前 推奨

- [ ] 「このページだけ仕上げる」（partial_completed 時）
- [ ] 「このページだけ作り直す」（ユーザー起点の再生成）
- [ ] タイトル編集
- [ ] サンプル絵本ギャラリー

### 売った後でよい

- [ ] PDF 出力
- [ ] 共有URL
- [ ] 印刷注文
- [ ] 音声読み聞かせ
- [ ] シリーズ化（同じ相棒で続編）

---

## 8. Phase 7: Security / Privacy / Abuse Prevention

### 目的

子どもの情報と生成APIを安全に扱う。

### 含めるタスク

#### 認証・認可

- [ ] Firebase App Check enforcement（段階的ロールアウト）
- [ ] Firestore Rules hardening（全コレクション精査）
- [ ] Storage rules 精査

#### 監査・監視

- [ ] admin operation audit log
- [ ] rate limit（API レベル）
- [ ] abuse detection（異常な生成パターン検知）

#### コンテンツ安全

- [ ] content moderation 強化（生成結果の安全性チェック）
- [ ] provider API key protection（環境変数 / Secret Manager）

#### プライバシー

- [ ] child data retention policy
- [ ] delete account / delete child profile
- [ ] privacy policy（法的文書としての整備）

---

## 9. Phase 8: Post-MVP Growth Features

売った後で開発する拡張機能。

- [ ] 続編生成（同じ設定で新しいストーリー）
- [ ] 同じ相棒キャラでシリーズ化
- [ ] 兄弟姉妹対応（複数子どもが同時に主人公）
- [ ] 音声読み聞かせ（TTS）
- [ ] 印刷注文連携
- [ ] LINE 共有
- [ ] 保育園・幼稚園向け法人プラン
- [ ] 季節イベントテンプレート（ハロウィン、ひなまつり等）
- [ ] オリジナルキャラストア（人気キャラの共有）
- [ ] ぬりえ・壁紙出力

---

## 10. 優先順位

### Now（現在着手中〜次に着手）

- SLO 実測（p95 / failure rate / fallback rate の可視化）
- page regeneration 安定化
- stale metadata cleanup
- admin analytics 基盤
- provider abstraction 設計

### Next（売り物化前に必須）

- provider 比較（BFL Direct / fal.ai）
- 本文・画像品質改善（Phase 2 の主要タスク）
- 課金設計（Stripe 導入）
- security hardening（App Check enforcement）
- 本棚UI / 絵本閲覧UI
- feedback 送信UI

### Later（売った後でよい）

- PDF 出力
- 印刷注文
- 音声読み聞かせ
- 法人向けプラン
- シリーズ化
- オリジナルキャラストア
- LINE 共有

---

## 11. Phase と売り物化の関係

```
売り物化前に必須:
  Phase 1 (Reliability)     — 生成が安定しなければ売れない
  Phase 2 (Quality)         — 品質が低ければリピートしない
  Phase 5 (Monetization)    — 課金がなければ売上がない
  Phase 6 (UX) の一部       — 本棚・閲覧・再生成がなければ使えない
  Phase 7 (Security) の一部 — App Check / Rules がなければ危険

売り物化後に段階的に:
  Phase 3 (Provider)        — コスト最適化は売った後でもよい
  Phase 4 (Analytics)       — 全体集計は改善サイクルで
  Phase 6 (UX) の残り       — PDF / 共有 / 印刷
  Phase 7 (Security) の残り — audit log / abuse detection
  Phase 8 (Growth)          — 拡張機能
```

---

## 12. Codex / Claude Code への依頼単位

各タスクは以下の粒度で依頼可能にする。

### Phase 1 の依頼例

```
- "admin画面にimage p95 / failure rateを表示するダッシュボードを追加して"
- "stale metadata cleanup のCloud Functions scheduled jobを作って"
- "regeneration historyをbooks/{bookId}/pages/{pageId}に保存して"
- "partial_completedからcompletedへの復旧APIを作って"
```

### Phase 2 の依頼例

```
- "3歳以上のstory quality gateで意味量チェックを追加して"
- "adminスコアの集計APIを作って"
- "cast外キャラが登場した場合のwarningをstoryQualityReportに追加して"
```

### Phase 3 の依頼例

```
- "ImageProviderインターフェースを設計して、Replicate adapterを最初の実装にして"
- "BFL Direct adapterを追加して"
- "provider別のp95 / failure rate / costを比較するadmin画面を作って"
```

### Phase 5 の依頼例

```
- "Stripe Checkoutを組み込んで、free / light / standard / premiumプランを実装して"
- "月間生成回数の制限チェックをgenerate-bookに追加して"
- "失敗時のcredit返却ロジックを実装して"
```

### Phase 6 の依頼例

```
- "本棚UIを作って、ユーザーの作成済み絵本一覧を表示して"
- "絵本閲覧UIをページめくり形式で実装して"
- "ユーザー向けのページ再生成ボタンを追加して"
```

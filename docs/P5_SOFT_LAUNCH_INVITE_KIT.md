# P5-2: Soft Launch Invite and Feedback Kit

**Task**: P5-2  
**Created**: 2026-05-21  
**Status**: TEMPLATES ONLY — no invitations sent  
**Scope**: Docs/templates only. No Firebase deploy. No live generation. No users invited.

---

## 1. Purpose

This kit provides reusable templates for inviting and guiding Cohort A and Cohort B users through their first production book generation. It also defines feedback collection and incident reporting procedures.

**Goals**:
- Give first users a clear, honest invitation that sets correct expectations.
- Guide users through the generation flow without technical support overhead.
- Collect structured feedback that informs UX improvements.
- Avoid overpromising product maturity.
- Generate real `book_outcome` events that count toward the production baseline (≥ 30 events required).

**Out of scope for P5-2**:
- Sending invitations (separate manual step by operator).
- Creating user accounts or Firestore entries.
- Deploying Firebase Functions or Hosting.

---

## 2. Cohort Usage

| Cohort | Who | Size | Use this kit? |
|---|---|---|---|
| **A** | Internal / operator testers | 3–5 people | ✅ Yes — use §3 (formal) or §4 (short) |
| **B** | Trusted friendly users (non-technical) | 5–10 people | ✅ Yes — use §3 (formal) or §4 (short) |
| **C** | Broader beta | 20–30 users | ⚠️ Not yet — wait for invite gate decision (see [P5_FIRST_PRODUCTION_TRAFFIC_PLAN.md §9.2](./P5_FIRST_PRODUCTION_TRAFFIC_PLAN.md)) |

For Cohort A and B, send the invitation privately (1:1 message, email, or LINE/Slack DM). Do not post the URL in public channels.

---

## 3. 招待メッセージテンプレート（正式版）

> **使い方**: `[CONTACT_METHOD]` と `[FEEDBACK_FORM_URL]` を実際の値に置き換えてから送付する。  
> フィードバックフォームがまだ準備できていない場合は、`[FEEDBACK_FORM_URL]` 行を省略してよい。

---

こんにちは、[名前]さん。

EhonAI（えほん AI）という、お子さんのための AI 絵本生成アプリのアーリーテスターとして、ご協力いただけますか？

**アプリについて**  
お子さんの名前や好みを入力すると、AI がオリジナルの絵本を生成します。現在はベータ版のため、生成結果の品質や安定性を一緒に確認していただきたいと思っています。

**お願いしたいこと**
- 下記 URL からアプリを開き、Google アカウントでログインしてください。
- できれば 1〜3 冊、絵本を生成してみてください。
- 生成中に問題が起きた場合や、気になった点があれば教えてください。

**URL**: https://story-gen-8a769.web.app

**所要時間の目安**
- アカウント設定・操作: 5〜10 分
- 絵本 1 冊の生成: 3〜7 分（AI 処理のため待ち時間があります）

**お願いとご注意**
- 現在はベータ版です。生成結果が不完全な場合や、一部のページが表示されないことがあります。
- お子さんの本名・顔写真など、センシティブな個人情報は入力しないようにお願いします。
- 生成された絵本の内容はまだ品質保証段階ではありません。
- 生成中にブラウザを更新すると処理が途切れる可能性があるため、完了まで待ってください。

**フィードバック**  
[FEEDBACK_FORM_URL]  
または、直接 [CONTACT_METHOD] までご連絡ください。

どうぞよろしくお願いします。

---

## 4. 招待メッセージテンプレート（短縮版：LINE / Slack / DM 用）

> **使い方**: 1〜2 行でリンクを渡すシーンに使う。正式版のリンクと注意事項は別途送る。

---

AI 絵本アプリのアーリーテスト、ご協力いただけますか？ 👇  
https://story-gen-8a769.web.app  
Google ログインで使えます。1 冊生成してみて、感想を教えてもらえると嬉しいです 🙏  
（ベータ版なので生成に数分かかります。センシティブな個人情報は入れないでください）

---

## 5. テスター向け操作ガイド

テスターに送るか、招待メッセージに添付する操作説明です。

---

**EhonAI アーリーベータ — かんたん操作ガイド**

**Step 1 — アプリを開く**  
https://story-gen-8a769.web.app をブラウザで開いてください。  
PC またはタブレットを推奨します。スマートフォンでも動作しますが、一部表示が最適化されていません。

**Step 2 — Google アカウントでログイン**  
「Googleでログイン」ボタンをクリックし、お持ちの Google アカウントでサインインしてください。

**Step 3 — お子さんのプロフィールを設定**  
初回は、絵本の主人公となるお子さんの情報（ニックネーム・年齢など）を入力します。  
※ 本名の入力は任意です。ニックネームでも問題ありません。

**Step 4 — テーマ・テンプレートを選ぶ**  
作成ページでお好みのテーマや絵本の種類を選択してください。  
迷ったら「おすすめ」の選択肢を選んでいただくとスムーズです。

**Step 5 — 絵本を生成する**  
「生成する」ボタンをクリックすると、AI が絵本のストーリーとイラストを作り始めます。  
⚠️ **生成中はブラウザを更新しないでください。** 処理に 3〜7 分かかることがあります。

**Step 6 — 完成した絵本を読む**  
生成が完了すると、絵本リーダーが開きます。ページをめくりながら内容をご覧ください。  
一部のページのイラストが表示されない場合は「ページを再生成」ボタンで再試行できます（ある場合）。

**Step 7 — フィードバックを送る**  
[FEEDBACK_FORM_URL] からアンケートに答えてください。  
または [CONTACT_METHOD] まで直接ご連絡ください。  
気になった点、操作に迷った点、エラーが出た場合はスクリーンショットも歓迎です。

---

## 6. フィードバックフォーム設計

以下の質問を Google Forms / Notion / 任意のフォームツールで構成する。  
フォーム URL が決まったら `[FEEDBACK_FORM_URL]` を置き換えること。

### 6.1 必須質問

| # | 質問文 | 形式 |
|---|---|---|
| 1 | ログインはスムーズにできましたか？ | はい / いいえ / ログインできなかった |
| 2 | 絵本の生成は完了しましたか？ | 完了した / 途中で止まった / エラーになった / わからない |
| 3 | 生成にかかった時間の印象は？ | 気にならなかった / 少し長かった / 長すぎた |
| 4 | 生成されたストーリーは理解できましたか？ | わかりやすかった / やや難しかった / わかりにくかった |
| 5 | 生成されたイラストは受け入れられる品質でしたか？ | 十分 / まあまあ / 改善が必要 |
| 6 | 表示されなかったページ（イラスト欠け）はありましたか？ | なかった / 1 ページあった / 2 ページ以上あった |
| 7 | 操作中、次に何をすればいいかわかりましたか？ | わかった / 迷った部分があった / わからなかった |
| 8 | このアプリを実際に使いたいと思いますか？ | 使いたい / 条件次第で / 使わない |
| 9 | 知人に紹介したいと思いますか？ | はい / 条件次第で / いいえ |
| 10 | 自由コメント（気になった点、良かった点など） | 長文テキスト |

### 6.2 任意質問

| # | 質問文 | 形式 |
|---|---|---|
| 11 | スクリーンショット（任意） | ファイルアップロード |
| 12 | 今後もテストにご協力いただけますか？ | はい / いいえ |
| 13 | ご使用の端末・ブラウザ（任意） | 短文テキスト |

### 6.3 フォーム設計上の注意

- お子さんの本名・生年月日を入力させるフィールドは設けない。
- 生成されたストーリーのテキストをフォームに貼り付けさせない（プライバシー保護）。
- フォームの説明文に「入力いただいた内容は品質改善のみに使用し、第三者に提供しません」と明記する。

---

## 7. インシデント報告テンプレート

テスターがエラーや問題を報告する際に使うテンプレート。  
招待メッセージに添付するか、フィードバックフォームの「自由コメント」欄の記入例として案内する。

---

**問題報告テンプレート**

1. 発生時刻（おおよそ）：
2. 画面に表示されたエラーメッセージや状況：
3. 問題が起きたときの操作（どの画面でどのボタンを押したか）：
4. 生成は最後まで完了しましたか？（はい / いいえ / 途中で止まった）
5. スクリーンショット（可能であれば）：
6. ご使用の端末・ブラウザ：

※ お子さんのお名前や個人情報はここには記載しないでください。

---

## 8. 招待送付前 — オペレーターチェックリスト

Cohort A/B に招待を送る前に、このチェックリストをすべて確認する。

### 8.1 監視・状態確認

- [ ] Generation SLO Dashboard にアクセスできる:  
  https://console.cloud.google.com/monitoring/dashboards/builder/39c916aa-ea17-4487-80e1-9c81e47cee3b?project=story-gen-8a769
- [ ] ダッシュボード Panel 1 (CG-1) の値 = **0**
- [ ] SJ/IM アラートポリシーが `enabled: false` のままである:  
  `gcloud monitoring policies list --project=story-gen-8a769 --format="table(displayName,enabled)"`
- [ ] CG-1 アラートポリシーが `enabled: true` である（同コマンドで確認）
- [ ] `.env.local` に `ENABLE_RESPONSE_SCHEMA`, `RESPONSE_SCHEMA_MODE`, `ENABLE_SCHEMA_REPAIR_RETRY` が含まれていない

### 8.2 アプリ動作確認

- [ ] https://story-gen-8a769.web.app が正常に表示される
- [ ] Google ログインが動作する（自分のアカウントでテスト）
- [ ] `/create` ページが開く
- [ ] 絵本生成の happy path が完了する（自分で 1 冊生成してテスト）
- [ ] 生成後にリーダーが開き、絵本が表示される

### 8.3 サポート・体制確認

- [ ] 招待者リストが管理されており、Cohort A/B の人数が計画通りである
- [ ] 招待送付後、最初の 1 時間はダッシュボードを監視できる担当者が確保されている
- [ ] テスターからの問い合わせ先（`[CONTACT_METHOD]`）が準備されている
- [ ] フィードバックフォーム（`[FEEDBACK_FORM_URL]`）が作成され、回答を受け取れる状態になっている（またはフォームなしで直接連絡で代替する場合は明確にしている）

### 8.4 伝えるべき制限事項の確認

Cohort A/B のテスターに、以下を招待時に伝えること（§3 テンプレートに含まれているが確認）:

- [ ] ベータ版であること
- [ ] 生成に数分かかること
- [ ] 結果が不完全な場合があること
- [ ] センシティブな個人情報を入力しないこと
- [ ] 本番グレードの安定性は保証しないこと

---

## 9. プライバシーと安全に関する注意事項

- テスターにお子さんの本名・顔写真・生年月日を入力させない。ニックネームと大まかな年齢で十分。
- フィードバックフォームで生成されたストーリーのテキストを収集しない（ユーザーの子どもに関するデータが含まれる可能性がある）。
- インシデント報告では、書名は任意かつ匿名化を推奨。子どもの名前を公開チャンネルで共有させない。
- SLO 計測・ドキュメントには集計値（件数・パーセンタイル）のみを記録する。個人の UID や書籍 ID はドキュメントにコミットしない。
- 生成ログはオペレーター専用ツール（Cloud Logging / report-generation-slo.mjs）でのみ参照し、`tmp/` ディレクトリに格納して git には含めない。

---

## 11. Cohort B 固有事項（P5-3c-verify PASS 後）

> **Cohort B: ✅ GO (2026-05-22)** — P5-3c-verify PASS を受けた PM GO 判断。このセクションは Cohort B 招待時の固有チェック事項と追加フィードバック質問を定義する。詳細: [P5_COHORT_B_GO_NOGO_CHECKLIST.md](./P5_COHORT_B_GO_NOGO_CHECKLIST.md)

### 11.1 Cohort B スコープ制約

- **招待上限**: 5 名（超過には PM 承認が必要）
- **公開アクセス禁止**: アプリ URL を公開チャンネルに投稿しない
- **個別送付**: グループ送信・一括配信不可
- **SJ/IM アラート**: 引き続き disabled（変更禁止）
- **本番デフォルト**: 変更禁止（P5-3c デプロイ済みパス以外）
- **招待前チェックリスト**: §3 に加え [P5_COHORT_B_GO_NOGO_CHECKLIST.md §3](./P5_COHORT_B_GO_NOGO_CHECKLIST.md) を完了すること

### 11.2 P5-3c 固有フィードバック質問

Cohort B テスターへのフィードバック取得時、§6 の標準質問に加えて以下を確認する:

| # | 質問文 | 形式 |
|---|---|---|
| B-1 | 各ページの絵は、それぞれ違うシーンになっていましたか？（「全ページ同じ絵に見えた」という問題がなかったか確認） | 全部違った / 似ているページがあった / ほぼ同じに見えた |
| B-2 | 選んだスタイル（水彩・ポップなど）は絵に反映されていると感じましたか？ | 反映されていた / 少し感じた / 感じなかった / スタイルを選んでいない |
| B-3 | 絵のタッチや雰囲気はお子さん向けに適切でしたか？ | 適切 / やや気になる点あり / 不適切な表現があった |
| B-4 | 不自然な手や顔（指が多い、崩れた顔など）が目立ちましたか？ | なかった / 1〜2 か所あった / 複数あった |
| B-5 | 竹プラン（有料プラン）の絵本を生成しましたか？ | はい / いいえ / わからない |

### 11.3 ストップ基準（Cohort B 監視担当者向け）

以下が観測された場合は**即座に招待を停止**し、PM に報告:

| 条件 | 対応 |
|---|---|
| `duplicate_page_image_urls_detected` が Cloud Logging に出現 | 全招待停止。追加生成させない |
| `image_prompt.all_identical` が出現 | 全招待停止。`generate-book.ts` ページループを調査 |
| 複数テスターから「全ページ同じ絵」の報告 | 招待停止。book ID を収集。Cloud Logging でプロンプトを確認 |
| `book_early_failed` ≥ 2 件（監視 window 内） | 招待一時停止。`failureStage` を確認 |
| ログイン / 作成フローが 2 名以上で不通 | 全招待停止 |
| プライバシー / 参照画像流出の報告 | 全招待停止。追加生成させない。PM に即時報告 |

### 11.4 初回 1h 監視リマインダー

招待送付後 1 時間は以下を 10〜15 分ごとに確認:

1. **Dashboard Panel 1 (CG-1)** = 0 を維持
2. **Panel 2 (OUT-1)** `book_outcome_failed` = 0
3. **Cloud Logging** `p5_page_experiment_active` が竹プランの各ページで発火していること
4. **Cloud Logging** `duplicate_page_image_urls_detected` = 0
5. **Panel 7 (LAT-1)** `storyDurationMs` p95 ≤ 120,000ms

詳細な監視手順: [P5_COHORT_B_GO_NOGO_CHECKLIST.md §5](./P5_COHORT_B_GO_NOGO_CHECKLIST.md)

### 11.5 招待送付チェックリスト（Cohort B 専用）

招待送付前に §8 の標準チェックに加えて以下を確認:

- [ ] [P5_COHORT_B_GO_NOGO_CHECKLIST.md §3](./P5_COHORT_B_GO_NOGO_CHECKLIST.md) の全項目完了
- [ ] `origin/main` HEAD = `5c944c8` 以降
- [ ] Firebase Functions に P5-3c commit `53654a2` がデプロイ済み
- [ ] 招待人数が 5 名以下（現在の承認済み上限）
- [ ] 初回 1h 監視担当者が確保されている
- [ ] B-1〜B-5 フィードバック質問がフォームまたは口頭ヒアリングで準備済み

---

## 10. 参照ドキュメント

| ドキュメント | 目的 |
|---|---|
| [P5_COHORT_B_GO_NOGO_CHECKLIST.md](./P5_COHORT_B_GO_NOGO_CHECKLIST.md) | Cohort B GO/No-Go 決定記録・限定ロールアウト実行計画（P5-3-execute-b）。招待前チェックリスト・監視手順・ストップ基準・ポストセッション記録テンプレートを含む |
| [P5_COHORT_A_EXECUTION_CHECKLIST.md](./P5_COHORT_A_EXECUTION_CHECKLIST.md) | Cohort A 招待送付・初回監視・インシデント対応・ゲート評価の実行チェックリスト（P5-3）。招待はここを確認してから手動で送付する |
| [P5_FIRST_PRODUCTION_TRAFFIC_PLAN.md](./P5_FIRST_PRODUCTION_TRAFFIC_PLAN.md) | コホート定義、baseline rerun 手順、P2-10b-enable ゲート |
| [P2_PRODUCTION_MONITORING_READINESS.md](./P2_PRODUCTION_MONITORING_READINESS.md) | 監視スタック全体、ライブリソース一覧、初回トラフィック手順 |
| [GENERATION_SLO_RUNBOOK.md](./GENERATION_SLO_RUNBOOK.md) | オペレーターランブック：ログ収集、インシデント対応 |
| [P2_GENERATION_SLO_SAVED_LOGGING_QUERIES.md](./P2_GENERATION_SLO_SAVED_LOGGING_QUERIES.md) | Cloud Logging トリアージクエリ 15 件 |
| [PRODUCT_ROADMAP.md](./PRODUCT_ROADMAP.md) | ロードマップ全体：P5 タスク行 |

> **招待はまだ送付されていません。** このキット（P5-2）はテンプレートのみを提供します。実際の招待送付は [P5_COHORT_A_EXECUTION_CHECKLIST.md](./P5_COHORT_A_EXECUTION_CHECKLIST.md) の §2 事前チェックを完了してから手動で行ってください。

---

*Last updated: 2026-05-22 (§11 Cohort B 固有事項追加 — P5-3c-verify PASS / GO決定)*

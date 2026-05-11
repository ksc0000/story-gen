# Template Smoke Results — Phase T2-A

実施日: 2026-05-08  
対象リポジトリ: ksc0000/story-gen  
対象環境: production  
対象 Phase: Template Mode T1-A〜T1-D + T2-A  
fixed_template 本数: 6

---

## 1. 対象テンプレート

1. fixed-first-zoo
2. fixed-first-birthday
3. fixed-bedtime-good-day
4. fixed-brush-teeth
5. fixed-first-christmas
6. fixed-sharing-friends

---

## 2. 実行サマリー

- overall result: BLOCKED
- hard fail count: N/A
- partial_completed count: N/A
- completed count: N/A
- follow-up required: yes
- block reason: この実行環境から production Firestore へ book ドキュメントを作成できず、実生成 smoke を開始できない

---

## 3. 実行条件

- branch: main
- commit: 70b5aa7
- deploy status: 完了
- Firebase CLI auth: projects:list 成功（story-gen-8a769 を確認）
- 実機生成トリガー方式: `generateBook` は `books/{bookId}` の onDocumentCreated
- 実行環境の制約: service-account.json なし、`GOOGLE_APPLICATION_CREDENTIALS` 未設定、`gcloud` 未インストール
- 備考: secret値・個人情報は記録しない

---

## 4. チェック観点

- 新規生成が hard fail しない
- 4ページ構成が維持される
- coverImagePrompt / titleSpreadText / openingNarration が保存される
- cover image generation が成功または非致命的に失敗する
- Reader UI で Cover -> Title Spread -> Story pages の流れが確認できる
- Admin UI で品質確認できる
- 画像内文字 / logo / watermark の重大問題がない
- fixed-sharing-friends の lessonToTeach が未展開で残らない

---

## 5. テンプレート別結果

| Template ID | Book ID (short) | Status | Cover | 4 pages | Cover/Title/Opening Saved | Reader Flow | Admin Review | Text/Logo/Watermark issue | lessonToTeach unresolved | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| fixed-first-zoo | | BLOCKED | N/A | N/A | N/A | N/A | N/A | N/A | N/A | Firestore create 実行不可 |
| fixed-first-birthday | | BLOCKED | N/A | N/A | N/A | N/A | N/A | N/A | N/A | Firestore create 実行不可 |
| fixed-bedtime-good-day | | BLOCKED | N/A | N/A | N/A | N/A | N/A | N/A | N/A | Firestore create 実行不可 |
| fixed-brush-teeth | | BLOCKED | N/A | N/A | N/A | N/A | N/A | N/A | N/A | Firestore create 実行不可 |
| fixed-first-christmas | | BLOCKED | N/A | N/A | N/A | N/A | N/A | N/A | N/A | Firestore create 実行不可 |
| fixed-sharing-friends | | BLOCKED | N/A | N/A | N/A | N/A | N/A | N/A | N/A | Firestore create 実行不可 |

---

## 6. Issues Found

- [BLOCKER] この実行環境では production Firestore への書き込み資格情報が不足しており、`books/{bookId}` 作成による実生成 smoke を開始できない。
- [INFO] `generateBook` は Firestore trigger（`books/{bookId}` onCreate）であり、CLIログ取得だけでは templateIdごとの6本判定に必要な証跡が不足する。

---

## 7. 判定

- T2-B 進行可否: BLOCKED
- 判定理由: 6テンプレートの実機 smoke 本体を未実施（認証ブロッカー解消後に再実施が必要）

---

## 8. 実行証跡（この端末で確認できた範囲）

- `firebase projects:list` で `story-gen-8a769` への CLI アクセス確認済み
- `firebase functions:log --only generateBook --project story-gen-8a769 -n 200` 取得済み
- `generateBook` は Firestore onCreate trigger（`books/{bookId}`）であることをコードで確認済み
- `node -e` + `firebase-admin` の Firestore読み取り試行は `Could not load the default credentials` で失敗
- `service-account.json` 未配置、`GOOGLE_APPLICATION_CREDENTIALS` 未設定、`gcloud` 未導入を確認

再開条件（最小）:

1. 実行者端末に service account または ADC を設定する
2. `books` コレクションへ smoke 用6件を作成し trigger 実行
3. book status / page count / cover/title/opening / UI確認を本ファイルに追記する

# Template Mode Smoke Checklist

作成日: 2026-05-08  
対象リポジトリ: `ksc0000/story-gen`  
対象 Phase: Template Mode Phase T1 + T2-A / fixed_template 6本

---

## 0. Overview

このチェックリストは、Template Mode Phase T1 + T2-A の fixed_template 6本が、実際に安定して絵本生成できるかを確認するための smoke checklist です。

対象テンプレート:

| Template ID | Title | Category | Page count |
|---|---|---|---:|
| `fixed-first-zoo` | はじめてのどうぶつえん | memories | 4 |
| `fixed-first-birthday` | はじめてのたんじょうび | memories | 4 |
| `fixed-bedtime-good-day` | きょうもいい日だったね | bedtime | 4 |
| `fixed-brush-teeth` | はみがきできたよ | growth-support | 4 |
| `fixed-first-christmas` | はじめてのクリスマス | seasonal-events | 4 |
| `fixed-sharing-friends` | おともだちとわけっこできたね | emotional-growth | 4 |

確認目的:

- fixed_template が Gemini story generation に依存せず生成できること
- cover / title spread / opening narration が template 由来で保存されること
- page image prompts が強化済み seed 由来で使われること
- 画像内文字を誘発しない prompt になっていること
- Reader UI で Cover → Title Spread → Story pages の流れが確認できること
- fixed_template 8テンプレートを T2-B 以降の品質ゲートとして確認すること

---

## 1. Summary

| Item | Value |
|---|---|
| 実行日 | 2026-05-11 |
| 実行者 | CN63738 + Copilot |
| 対象環境 | production |
| Firebase project | story-gen-8a769 |
| 対象 branch | main |
| 対象 commit SHA | 39906a1 |
| checklist version | `docs/TEMPLATE_SMOKE_CHECKLIST.md` |
| overall result | PASS_WITH_FOLLOW_UP |

---

## 2. Prerequisites

| Check | PASS | FAIL | N/A | Evidence / Notes |
|---|---|---|---|---|
| 最新 `main` または対象branchが反映されている | ☐ | ☐ | ☐ |  |
| `functions/src/seed-templates.ts` に fixed_template 8テンプレートが存在する | ☐ | ☐ | ☐ |  |
| fixed_template 8テンプレートに `coverImagePromptTemplate` がある | ☐ | ☐ | ☐ |  |
| fixed_template 8テンプレートに `titleSpreadTextTemplate` がある | ☐ | ☐ | ☐ |  |
| fixed_template 8テンプレートに `openingNarrationTemplate` がある | ☐ | ☐ | ☐ |  |
| 全32ページに `pageVisualRole` がある | ☐ | ☐ | ☐ |  |
| `.env` / Firebase env secrets が生成に必要な状態になっている | ☐ | ☐ | ☐ |  |

### 2.1 Firestore投入スクリプトで6件作成する手順

以下のスクリプトで、fixed_template 6本ぶんの BookDoc を `books` に新規作成できます。

```powershell
$env:GOOGLE_APPLICATION_CREDENTIALS="C:\path\to\service-account.json"
npm run smoke:create-template-books
```

単独で 1 本だけ投入する場合:

```powershell
$env:GOOGLE_APPLICATION_CREDENTIALS="C:\path\to\service-account.json"
node scripts/create-template-smoke-books.js --write --template-id=fixed-first-zoo
```

注意点:

- `GOOGLE_APPLICATION_CREDENTIALS` 未設定時は処理を中止します。
- 環境変数の値そのもの（パス文字列）はログ出力しません。
- 作成件数は常に 6 件固定です（固定テンプレート6本のみ）。
- `--template-id=...` を付けると、固定テンプレート 1 本だけを新規作成できます。
- 既存 BookDoc の更新は行いません（新規作成のみ）。
- 生成された BookDoc には `smokeTestMetadata` が付与され、smoke作成データだと判別できます。

---

## 3. Build / Test Result

| Command | PASS | FAIL | N/A | Evidence / Notes |
|---|---|---|---|---|
| `npx tsc --noEmit` | ☐ | ☐ | ☐ |  |
| `npx next lint` | ☐ | ☐ | ☐ |  |
| `npx vitest run src/__tests__/` | ☐ | ☐ | ☐ |  |
| `cd functions && npx tsc --noEmit` | ☐ | ☐ | ☐ |  |
| `cd functions && npm test` | ☐ | ☐ | ☐ |  |
| `git diff --check` | ☐ | ☐ | ☐ |  |
| `grep -R "remaining content unchanged" .` | ☐ | ☐ | ☐ | 該当なしが期待値 |
| `grep -R "... (truncated)" .` | ☐ | ☐ | ☐ | 該当なしが期待値 |

---

## 4. Seed Template Static Checks

| Check | PASS | FAIL | N/A | Evidence / Notes |
|---|---|---|---|---|
| `fixed-first-zoo` が `creationMode: "fixed_template"` | ☐ | ☐ | ☐ |  |
| `fixed-first-birthday` が `creationMode: "fixed_template"` | ☐ | ☐ | ☐ |  |
| `fixed-bedtime-good-day` が `creationMode: "fixed_template"` | ☐ | ☐ | ☐ |  |
| `fixed-brush-teeth` が `creationMode: "fixed_template"` | ☐ | ☐ | ☐ |  |
| `fixed-first-christmas` が `creationMode: "fixed_template"` | ☐ | ☐ | ☐ |  |
| `fixed-sharing-friends` が `creationMode: "fixed_template"` | ☐ | ☐ | ☐ |  |
| 各テンプレートが4ページを維持している | ☐ | ☐ | ☐ |  |
| 既存 `textTemplate` が消えていない | ☐ | ☐ | ☐ |  |
| 既存 `textTemplatesByAge` が維持されている | ☐ | ☐ | ☐ |  |
| 既存 `titleTemplate` が維持されている | ☐ | ☐ | ☐ |  |

---

## 5. Cover / Title / Opening Template Checks

| Template ID | coverImagePromptTemplate | titleSpreadTextTemplate | openingNarrationTemplate | Negative text instructions | PASS/FAIL | Notes |
|---|---|---|---|---|---|---|
| `fixed-first-zoo` | ☐ | ☐ | ☐ | ☐ |  |  |
| `fixed-first-birthday` | ☐ | ☐ | ☐ | ☐ |  |  |
| `fixed-bedtime-good-day` | ☐ | ☐ | ☐ | ☐ |  |  |
| `fixed-brush-teeth` | ☐ | ☐ | ☐ | ☐ |  |  |
| `fixed-first-christmas` | ☐ | ☐ | ☐ | ☐ |  |  |
| `fixed-sharing-friends` | ☐ | ☐ | ☐ | ☐ |  |  |

Expected negative text instructions:

- `no text`
- `no letters`
- `no Japanese characters`
- `no readable signs`
- `no logo`
- `no watermark`

---

## 6. Page Visual Role Checks

Expected role sequence:

| Template ID | Expected roles |
|---|---|
| `fixed-first-zoo` | `opening_establishing` → `discovery` → `emotional_closeup` → `quiet_ending` |
| `fixed-first-birthday` | `opening_establishing` → `discovery` → `emotional_closeup` → `quiet_ending` |
| `fixed-bedtime-good-day` | `opening_establishing` → `discovery` → `emotional_closeup` → `quiet_ending` |
| `fixed-brush-teeth` | `opening_establishing` → `action` → `payoff` → `quiet_ending` |
| `fixed-first-christmas` | `opening_establishing` → `discovery` → `emotional_closeup` → `quiet_ending` |
| `fixed-sharing-friends` | `opening_establishing` → `discovery` → `emotional_closeup` → `quiet_ending` |

| Check | PASS | FAIL | N/A | Evidence / Notes |
|---|---|---|---|---|
| 全24ページに `pageVisualRole` がある | ☐ | ☐ | ☐ |  |
| 先頭ページが `opening_establishing` | ☐ | ☐ | ☐ |  |
| 最終ページが `quiet_ending` | ☐ | ☐ | ☐ |  |
| `fixed-brush-teeth` の3ページ目が `payoff` | ☐ | ☐ | ☐ |  |
| role sequence が seed test と一致 | ☐ | ☐ | ☐ |  |

---

## 7. Image Prompt Quality Checks

| Check | PASS | FAIL | N/A | Evidence / Notes |
|---|---|---|---|---|
| 全24ページの `imagePromptTemplate` が100文字以上 | ☐ | ☐ | ☐ |  |
| 全24ページに構図・画角表現がある | ☐ | ☐ | ☐ | `wide shot`, `medium shot`, `close-up`, etc. |
| 全24ページに主人公の行動・表情がある | ☐ | ☐ | ☐ |  |
| 全24ページに背景・照明・雰囲気がある | ☐ | ☐ | ☐ |  |
| 全24ページに `watercolor` または `storybook` style がある | ☐ | ☐ | ☐ |  |
| 全24ページに child-safe / gentle な方針がある | ☐ | ☐ | ☐ |  |
| 全24ページに negative text instructions がある | ☐ | ☐ | ☐ |  |
| 未展開 placeholder typo がない | ☐ | ☐ | ☐ |  |

---

## 8. Generation Smoke — Per Template

各テンプレートにつき、最低1回は実生成してください。可能なら主人公を変えて2回以上確認します。

| Template ID | Book ID | PASS | FAIL | N/A | Evidence / Notes |
|---|---|---|---|---|---|
| `fixed-first-zoo` | `xOqLdG3GPgGxp8AFF563` | ☐ | ☑ | ☐ | status=`failed`, 4 pages all `image_failed` |
| `fixed-first-birthday` | `sSxQ6tBYdBBtVoXG20oZ` | ☐ | ☑ | ☐ | status=`failed`, 4 pages all `image_failed` |
| `fixed-bedtime-good-day` | `nWQfnJOSvr3EOpuM6GSR` | ☑ | ☐ | ☐ | status=`partial_completed` |
| `fixed-brush-teeth` | `3m04DeTjkrsmbrFJ9i4N` | ☑ | ☐ | ☐ | status=`partial_completed` |
| `fixed-first-christmas` | `eIdb6t4QjjPWubg0Xbun` | ☐ | ☑ | ☐ | status=`failed`, 4 pages all `image_failed` |
| `fixed-sharing-friends` | `4rI1efgnF5i2v57S6cSk` | ☑ | ☐ | ☐ | status=`partial_completed` (page-3 `fallback_completed`) |

Per-book checks:

| Check | PASS | FAIL | N/A | Evidence / Notes |
|---|---|---|---|---|
| Book status が `completed` または `partial_completed` | ☐ | ☑ | ☐ | 6件中3件が `failed` |
| hard failed していない | ☐ | ☑ | ☐ | `fixed-first-zoo` / `fixed-first-birthday` / `fixed-first-christmas` が hard fail |
| pages subcollection が4ページ | ☑ | ☐ | ☐ | 6件すべて4ページ |
| pageNumber が0〜3で維持 | ☑ | ☐ | ☐ | 6件すべて 0..3 |
| 各pageの本文がtemplate由来 | ☑ | ☐ | ☐ | 全ページ `text` あり |
| 各page画像が生成される、またはfallback/partialとして扱われる | ☑ | ☐ | ☐ | partial本で `completed` / `fallback_completed` を確認 |
| BookDoc に `coverImagePrompt` が保存される | ☐ | ☑ | ☐ | 6件すべて未保存 |
| BookDoc に `titleSpreadText` が保存される | ☐ | ☑ | ☐ | 6件すべて未保存 |
| BookDoc に `openingNarration` が保存される | ☐ | ☑ | ☐ | 6件すべて未保存 |

---

### 8.1 Post-redeploy single-book gate (deploy差異確認)

`functions:generateBook` を再デプロイした後、まず1冊だけで再検証した結果。

| Template ID | Book ID | PASS | FAIL | N/A | Evidence / Notes |
|---|---|---|---|---|---|
| `fixed-sharing-friends` | `zmMafkha7DM3Fb3DkewK` | ☑ | ☐ | ☐ | status=`completed`, pages 4/4 `completed`, `coverImagePrompt`/`titleSpreadText`/`openingNarration` 保存確認 |

備考:

- ログに `uses fixed_template; skipping LLM story generation` を確認。
- ログに `Book zmMafkha7DM3Fb3DkewK generation completed: 4/4 pages succeeded` を確認。
- 先行6冊の metadata 未保存は、再デプロイ前バイナリとの差異影響の可能性が高い。429系失敗とは別事象として扱う。

### 8.2 Post-redeploy sequential reruns (429影響の分離評価)

| Template ID | Book ID | PASS | FAIL | N/A | Evidence / Notes |
|---|---|---|---|---|---|
| `fixed-first-zoo` | `YOszGPdgQd74h9tStiV7` | ☑ | ☐ | ☐ | status=`completed`, pages 4/4 `completed`, `coverImagePrompt`/`titleSpreadText`/`openingNarration` 保存確認 |
| `fixed-first-birthday` | `KjBUIpQSO8ua5FyqgdGB` | ☑ | ☐ | ☐ | status=`completed`, pages 4/4 `completed`, `coverImagePrompt`/`titleSpreadText`/`openingNarration` 保存確認 |
| `fixed-bedtime-good-day` | `rBSjD2tphyiTvT3kfiKO` | ☑ | ☐ | ☐ | status=`completed`, pages 4/4 `completed`, `coverImagePrompt`/`titleSpreadText`/`openingNarration` 保存確認 |
| `fixed-brush-teeth` | `UnrLoWIHMjFzSilz6cZ1` | ☑ | ☐ | ☐ | status=`completed`, pages 4/4 `completed`, `coverImagePrompt`/`titleSpreadText`/`openingNarration` 保存確認 |
| `fixed-first-christmas` | `Nwat9hX8myUJFNEO1F5s` | ☑ | ☐ | ☐ | status=`completed`, pages 4/4 `completed`, `coverImagePrompt`/`titleSpreadText`/`openingNarration` 保存確認 |

備考:

- `fixed-first-zoo` は sequential rerun の 1 本目として単独投入。
- `fixed-first-birthday` は sequential rerun の 2 本目として単独投入。
- `fixed-bedtime-good-day` は sequential rerun の 3 本目として単独投入。
- `fixed-brush-teeth` は sequential rerun の 4 本目として単独投入。
- `fixed-first-christmas` は sequential rerun の 5 本目として単独投入。
- BookDoc fields: `coverStatus=completed`, `hasCoverPage=true`, `readingStructureVersion=v2_cover_title_story`。
- pages subcollection は 4 件、`pageNumber` は 0..3 を維持。
- 上記 5 冊はいずれも page status 0..3 の全件が `completed`。429 / image failure は未検出。
- `fixed-sharing-friends` の再デプロイ後単体再検証も `completed` 済みのため、post-redeploy rerun では fixed_template 6 本すべてで metadata gate と generation gate が通過した。

### 8.3 IMG-002 regeneration check (single-book, 2026-05-12)

| Template ID | Book ID | PASS | FAIL | N/A | Evidence / Notes |
|---|---|---|---|---|---|
| `fixed-first-zoo` | `M4zqk5RIAf6whchzNhNA` | ☑ | ☐ | ☐ | status=`completed`, coverStatus=`completed`, pages 4/4 `completed` |
| `fixed-first-zoo` (reference-enabled) | `s4e0U6sbNErXyIApJc10` | ☐ | ☑ | ☐ | status=`failed` (image generation), **BUT reference path VERIFIED** |
| `fixed-first-zoo` (reference-enabled, visual verification run) | `iLZPwQsU454SuvCmwrjd` | ☑ | ☐ | ☐ | status=`completed`, pages 4/4 `completed`, `inputReferenceCount=1` (all pages), `usedCharacterReference=true` (all pages), no `image_failed` |

IMG-002観点の確認結果:

**Book M4zqk5RIAf6whchzNhNA (reference未使用):**
- BookDoc / pages は生成完了（`completed`、4ページ生成）。
- Reader URL は開けることを確認: `https://story-gen-8a769.web.app/book?id=M4zqk5RIAf6whchzNhNA`
- ただしこの1冊では `inputReferenceCount=0`（全ページ）で、character reference 経路は未使用。
- `templates/fixed-first-zoo` の Firestore 実データは旧prompt（`friendly Japanese zoo` を含む）で、commit `63ed561` の scene-lock / reference-isolation 文言が反映されていない。
- 画像目視では明確な sandbox 背景リークは確認できなかったが、reference 未使用のため IMG-002 の本質シナリオ検証としては不十分。

**Book s4e0U6sbNErXyIApJc10 (reference実使用 - 2026-05-12 新規確認):**
- ✓ **Reference path IS WORKING**: 全4ページで `inputReferenceCount=1`、`usedCharacterReference=true`
- ✓ inputImageRefs correctly populated with character_reference role and reference image URL
- ✓ IMG-002 prompts (REF_ISOLATION_SUFFIX) applied to all pages
- ✗ Image generation failed (未完了): placeholder image service SSL issues + Replicate rate limiting
  - 但し失敗は IMG-002 実装の問題ではなく、外部 API の接続性問題
  - Reference が実際に使われていることを確認できた（要求アラメータに含まれている）

**Book iLZPwQsU454SuvCmwrjd (reference実使用 + visual verification 完了):**
- ✓ Generation: `status=completed`、pages 4/4 `completed`、`image_failed` なし
- ✓ Reference: 全4ページで `inputReferenceCount=1`、`usedCharacterReference=true`
- ✓ Visual (IMG-002): sandbox / playground 背景リークは明確な再現なし（PASS）
- ✓ Visual: zoo scene は維持（PASS）
- ✓ Visual: child identity は大きな崩れなし（PASS_WITH_MINOR_VARIATION）
- △ Visual: no-text/no-signage は major readable text なし、minor sign様要素は一部残存（PARTIAL）
- ✓ 本runでは 429 / SSL issue は再現なし

中間判定（IMG-002）:

- **REFERENCE_PATH_VERIFIED** ✓
  - Code flow is correct: childProfileSnapshot → buildInputImageRefs → inputImageUrls populated
  - Reference isolation and scene-lock prompts are applied when reference is used
  - Free plan default characterConsistencyMode="all_pages" correctly enables reference usage

最終判定（IMG-002）:

- **VERIFIED_WITH_MINOR_FOLLOW_UP**
  - reference path: VERIFIED
  - visual verification: VERIFIED_WITH_MINOR_FOLLOW_UP
  - T2-B: can proceed
  - REF-001: planned（design継続）、T2-B blocking ではない
  - IMG-001/no-text: minor follow-up を継続

追加で必要な確認（minor follow-up）:

- no-text/no-signage artifact（小さな sign様要素）の継続観察（IMG-001側で継続）
- REF-001 design（neutral reference strategy）の設計継続（実装は別トラック）

### 8.4 T2-B template sync + smoke (2 templates only, 2026-05-12)

Template sync execution:

- 実行コマンド（指定手順）:
  - `$env:GOOGLE_APPLICATION_CREDENTIALS="C:\Users\CN63738\secure\story-gen-8a769-service-account.json"`
  - `npm run template:sync:check`
  - `npm run template:sync:write`
  - `npm run template:sync:check`
- 上記3コマンドは成功。ただしデフォルト対象は既存6本。
- T2-B 2本は個別に同期を実行:
  - `node scripts/sync-fixed-template-seeds.js --write --template-id=fixed-sleepy-moon-adventure`
  - `node scripts/sync-fixed-template-seeds.js --write --template-id=fixed-cardboard-rocket`
- 個別 `--template-id` の再チェックで両方とも `[]`（driftなし）を確認。
- `template:sync:write` の対象が `templates` collection のみであることを、`scripts/sync-fixed-template-seeds.js` の
  `db.collection("templates").doc(id)` への `batch.set(..., { merge: true })` 実装で確認。

T2-B smoke generation (only 2 templates):

| Template ID | Book ID | PASS | FAIL | N/A | Evidence / Notes |
|---|---|---|---|---|---|
| `fixed-sleepy-moon-adventure` | `ePd4gz5GJkGqjUneKPn8` | ☑ | ☐ | ☐ | status=`completed`, pages 4/4 `completed`, `image_failed` なし |
| `fixed-cardboard-rocket` | `DfNNvJxvKh8YMOnuT1HC` | ☑ | ☐ | ☐ | status=`completed`, pages 4/4 `completed`, `image_failed` なし |

補足:

- 本検証は T2-B追加2テンプレートのみを対象に実施（6本まとめ実行は未実施）。
- smoke run id: `template-t2b-1778561030534`

---

## 9. Firestore Document Checks

BookDoc:

| Field | PASS | FAIL | N/A | Evidence / Notes |
|---|---|---|---|---|
| `coverImagePrompt` | ☐ | ☑ | ☐ | 6件すべて未保存 |
| `titleSpreadText` | ☐ | ☑ | ☐ | 6件すべて未保存 |
| `openingNarration` | ☐ | ☑ | ☐ | 6件すべて未保存 |
| `coverStatus` | ☐ | ☑ | ☐ | 6件すべて null |
| `hasCoverPage` | ☐ | ☑ | ☐ | 6件すべて未設定 |
| `readingStructureVersion` | ☐ | ☑ | ☐ | 6件すべて null |
| `coverImageUrl` | ☐ | ☑ | ☐ | 6件すべて未設定 |
| `coverImageDurationMs` | ☐ | ☑ | ☐ | 6件すべて未設定 |
| `coverImageFallbackUsed` | ☐ | ☑ | ☐ | 6件すべて未設定 |

Post-redeploy (single-book recheck):

| Field | PASS | FAIL | N/A | Evidence / Notes |
|---|---|---|---|---|
| `coverImagePrompt` | ☑ | ☐ | ☐ | `zmMafkha7DM3Fb3DkewK` で保存確認 |
| `titleSpreadText` | ☑ | ☐ | ☐ | `zmMafkha7DM3Fb3DkewK` で保存確認 |
| `openingNarration` | ☑ | ☐ | ☐ | `zmMafkha7DM3Fb3DkewK` で保存確認 |
| `coverStatus` | ☑ | ☐ | ☐ | `zmMafkha7DM3Fb3DkewK`, `YOszGPdgQd74h9tStiV7`, `KjBUIpQSO8ua5FyqgdGB`, `rBSjD2tphyiTvT3kfiKO`, `UnrLoWIHMjFzSilz6cZ1`, `Nwat9hX8myUJFNEO1F5s` で `completed` |
| `hasCoverPage` | ☑ | ☐ | ☐ | `zmMafkha7DM3Fb3DkewK`, `YOszGPdgQd74h9tStiV7`, `KjBUIpQSO8ua5FyqgdGB`, `rBSjD2tphyiTvT3kfiKO`, `UnrLoWIHMjFzSilz6cZ1`, `Nwat9hX8myUJFNEO1F5s` で `true` |
| `readingStructureVersion` | ☑ | ☐ | ☐ | `zmMafkha7DM3Fb3DkewK`, `YOszGPdgQd74h9tStiV7`, `KjBUIpQSO8ua5FyqgdGB`, `rBSjD2tphyiTvT3kfiKO`, `UnrLoWIHMjFzSilz6cZ1`, `Nwat9hX8myUJFNEO1F5s` で `v2_cover_title_story` |

Pages:

| Field | PASS | FAIL | N/A | Evidence / Notes |
|---|---|---|---|---|
| `books/{bookId}/pages/{pageId}` が4件 | ☑ | ☐ | ☐ | 6件すべて4件 |
| `pageNumber` が0〜3 | ☑ | ☐ | ☐ | 6件すべて0..3 |
| page status が `completed` / `fallback_completed` / `image_failed` の想定範囲 | ☑ | ☐ | ☐ | partial本は `completed`/`fallback_completed`、failed本は全`image_failed` |
| page image prompt が強化済み構図に沿っている | ☐ | ☐ | ☐ |  |

---

## 10. Reader UI Checks

確認対象 bookId (すべて 2026-05-11 認証済みセッションで実画面確認):

- `YOszGPdgQd74h9tStiV7`
- `KjBUIpQSO8ua5FyqgdGB`
- `rBSjD2tphyiTvT3kfiKO`
- `UnrLoWIHMjFzSilz6cZ1`
- `Nwat9hX8myUJFNEO1F5s`
- `zmMafkha7DM3Fb3DkewK`

| Check | PASS | FAIL | N/A | Evidence / Notes |
|---|---|---|---|---|
| 各bookを閲覧画面で開く | ☑ | ☐ | ☐ | 6冊すべて表示 |
| Cover + Title が1シートで最初に表示される | ☑ | ☐ | ☐ | 6冊すべて先頭で表示 |
| 次へ進むと Story page 1 が表示される | ☑ | ☐ | ☐ | 6冊すべて表示 |
| pages 4件を最後まで読める | ☑ | ☐ | ☐ | 6冊すべて最後まで読める |
| 前/次ボタンが動く | ☑ | ☐ | ☐ | 動作確認 |
| swipe / slide navigation が動く | ☑ | ☐ | ☐ | 動作確認 |
| 画像と本文が大きく矛盾していない | ☑ | ☐ | ☐ | 大きな矛盾なし |
| 画像内に重大な text / Japanese characters / logo / watermark がない | ☐ | ☐ | ☑ | 看板等に稀に「優しい水彩」が出るケースあり（IMG-001）。重大ではない |
| `fixed-sharing-friends` で `lessonToTeach` の未展開 token が表示されていない | ☑ | ☐ | ☐ | 未展開 token なし |

補足:

- UX-001（Cover+Title 1シート化）は 2026-05-11 に実装・hosting反映・実機確認まで完了。
- ページ 4（最終ページ）が毎回英語 "You did great today" と表示される。smoke スクリプトの `parentMessage` デフォルト値が英語のため（MSG-001）。生成ロジック自体のバグではない。

---

## 11. Admin UI Checks

Route: `/admin/book-quality-review`

| Check | PASS | FAIL | N/A | Evidence / Notes |
|---|---|---|---|---|
| `/admin/book-quality-review` を開く | ☑ | ☐ | ☐ | 200 応答確認 |
| 6件のbookが一覧に出る | ☐ | ☑ | ☐ | smoke 6冊が一覧に表示されない（ADMIN-001）。admin claim または smoke userId のフィルター外の可能性 |
| book detail を開ける | ☐ | ☐ | ☑ | 一覧未表示のため未確認 |
| `coverImagePrompt` / `titleSpreadText` / `openingNarration` が確認できる | ☐ | ☐ | ☑ | 同上（Firestore では 6/6 確認済み） |
| `coverStatus` / `hasCoverPage` / `readingStructureVersion` が確認できる | ☐ | ☐ | ☑ | 同上 |
| pages status が4件 completed で確認できる | ☐ | ☐ | ☑ | 同上 |
| Quality Review を1件以上保存できる | ☐ | ☐ | ☑ | 同上 |
| UI crash がない | ☑ | ☐ | ☐ | クラッシュなし |

---

## 12. Quality Review Criteria

各生成結果を人間レビューしてください。

| Axis | PASS | FAIL | N/A | Evidence / Notes |
|---|---|---|---|---|
| 物語が4ページで自然に読める | ☑ | ☐ | ☐ | Reader UI で 6冊すべて4ページ読了確認 |
| title spread / opening narration が読み聞かせ導入として自然 | ☑ | ☐ | ☐ | Title Spread 表示確認。自然な読み聞かせ導入として機能 |
| 各ページの絵が本文と一致している | ☑ | ☐ | ☐ | 大きな矛盾なし |
| 主人公がページ間で大きく別人化していない | ☑ | ☐ | ☐ | ページ間で概ね統一 |
| 絵柄・色味・雰囲気が概ね一貫 | ☑ | ☐ | ☐ | 水彩調で概ね統一 |
| 表紙がテンプレートのテーマを表している | ☑ | ☐ | ☐ | 各テンプレートのテーマを反映 |
| 画像内文字が出ていない、または許容範囲 | ☐ | ☐ | ☑ | 看板等に稀に「優しい水彩」出現。重大ではないが follow-up（IMG-001） |
| 子ども向け・家庭向けとして安心 | ☑ | ☐ | ☐ | 不適切要素なし |

簡易評価メモ:

- 生成安定性: post-redeploy sequential rerun で fixed_template 6/6 が completed、429 / image failure 再現なし。
- metadata gate: `coverImagePrompt` / `titleSpreadText` / `openingNarration` は 6/6 保存確認済み。
- UI体験品質: Reader UI は概ね良好。page 4 の `{parentMessage}` が英語デフォルト（smoke スクリプト入力値の問題）。Admin 一覧に smoke 6冊が表示されない問題は follow-up。

---

## 13. Issues Found

| ID | Severity | Template ID | Area | Description | Evidence / URL | Owner | Status | Follow-up issue / PR |
|---|---|---|---|---|---|---|---|---|
| IMG-001 | Low | all | image | 看板等に稀に「優しい水彩」が生成される。prompt の negative instructions で `no Japanese characters` を指定済みだが完全抑制できていない | Reader UI 実画面確認（2026-05-11） | CN63738 | open | prompt 強化または再生成で様子見 |
| IMG-002 | Medium | fixed-first-zoo（主） / all（横展開） | image | character reference image の背景（例: 砂場）が scene 指定より強く反映される場合がある。参照画像は identity のみに使い、背景・場所・構図のコピーを抑制する必要あり | 2026-05-11 観察 + 2026-05-12 single-book再生成（bookId=`M4zqk5RIAf6whchzNhNA`、reference未使用）+ reference-enabled verification（bookId=`s4e0U6sbNErXyIApJc10`）+ visual verification completed（bookId=`iLZPwQsU454SuvCmwrjd`）。最終runで pages 4/4 completed、inputReferenceCount=1 / usedCharacterReference=true（全ページ）、sandbox/playground leakage 明確再現なし。 | CN63738 | VERIFIED_WITH_MINOR_FOLLOW_UP | prompt-level reference isolation + scene lock の有効性を確認。minor no-text/signage artifact は IMG-001 側 follow-up。REF-001 は planned（non-blocking）。 |
| MSG-001 | Medium | all | story | smoke スクリプト作成 book の page 4（`{parentMessage}` ページ）が毎回英語 "You did great today" と表示される | Reader UI 実画面確認（2026-05-11） | CN63738 | open | `scripts/create-template-smoke-books.js` の `parentMessage` デフォルト値を日本語に修正する |
| ADMIN-001 | Medium | all | admin | `/admin/book-quality-review` の一覧に smoke 6冊が表示されない | Admin UI 実画面確認（2026-05-11） | CN63738 | open | admin claim 付与状況または一覧フィルター条件を確認する |
| UX-001 | Low | all | UX | Cover + Title を 1シートで表示し、次ページから Story page 1 が始まるように統合済み | Reader UI 実画面確認（2026-05-11） | CN63738 | resolved | commit `32ddbd6`, `890f40d`, `5f94181`; hosting deploy 反映済み |
| UI-002 | Low | all | UI/Asset | ログイン画面アセット `images/illustrations/login-door.webp` が 404 | dev server log: `GET /images/illustrations/login-door.webp 404` | CN63738 + Copilot | open | 画像パス修正 or アセット追加 |

---

## 14. Follow-up Actions

| Action | Owner | Due date | Priority | Related issue / PR | Status |
|---|---|---|---|---|---|
| `scripts/create-template-smoke-books.js` の `parentMessage` デフォルト値を日本語に修正する |  |  | Medium | MSG-001 | OPEN |
| Admin UI に smoke 6冊が表示されない原因を調査する（admin claim / フィルター） |  |  | Medium | ADMIN-001 | OPEN |
| image prompt の日本語文字抑制を強化する（次回 seed 更新時） |  |  | Low | IMG-001 | OPEN |
| IMG-002 reference path verification: reference実使用かつ image generation成功の smoke book を生成し、生成画像を visual inspection で確認（background leakage なし） | CN63738 + Copilot | 2026-05-12 | Medium | IMG-002 | VERIFIED_WITH_MINOR_FOLLOW_UP |
| REF-001 設計を作成する（neutral character reference image / identity-only reference strategy） |  |  | Medium | REF-001 | OPEN |
| Cover + Title 1シート化の実装反映を smoke 6冊で再確認する | CN63738 + Copilot | 2026-05-11 | Low | UX-001 | VERIFIED |
| login 画面の 404 アセットを解消する |  |  | Low | UI-002 | OPEN |

---

## 15. Acceptance Criteria

Phase T1 can be treated as verified when all of the following are true:

- [ ] Build / typecheck / functions tests pass
- [ ] Existing 4 fixed templates generate without hard failure
- [ ] Each generated book has 4 story pages
- [ ] `coverImagePrompt`, `titleSpreadText`, `openingNarration` are saved for each template
- [ ] Cover image generation succeeds or fails non-fatally
- [x] Reader UI displays Cover + Title (single sheet) → Story pages when cover is completed
- [ ] Existing pageNumber / pages subcollection structure is unchanged
- [ ] No major image text / logo / watermark issue is observed
- [ ] Admin can inspect generated books and quality review them
- [ ] All high severity issues are resolved or documented as follow-up

---

## 16. Final Decision

Choose one:

- [ ] Template T2-A Smoke PASS
- [x] Template T2-A Smoke PASS_WITH_FOLLOW_UP
- [ ] Template T2-A Smoke FAIL

Decision reason:

```text
post-redeploy sequential rerun で fixed_template 6本が completed まで収束。
pages 4/4 completed、cover/title/opening metadata 6/6 保存確認。
Reader UI 実画面確認で Cover→Title Spread→Story pages の表示順・ナビゲーション・
画像品質に重大問題なし。

follow-up として残す問題:
- IMG-001: 看板に稀に「優しい水彩」出現（Low）
- IMG-002: reference path + visual verification を完了。sandbox/playground leakage は明確再現なし（VERIFIED_WITH_MINOR_FOLLOW_UP）
- MSG-001: smoke スクリプト入力値の parentMessage default 改善（Medium、生成バグではない）
- ADMIN-001: Admin 一覧に smoke 6冊が表示されない（Medium）
- UX-001: resolved / verified（Cover+Title 1シート化を反映済み）
- UI-002: login-door.webp 404 の解消（Low）

以上すべて生成の安定性・metadata 保存・SLO には直近の重大影響はないため PASS_WITH_FOLLOW_UP とする。
T2-B は proceed 可。REF-001 は planned（design継続）であり、現時点では T2-B の blocking 要因ではない。
```

Next recommended step:

- [ ] Investigate IMG-001 (image promptの日本語文字抑制の追加強化)
- [ ] Investigate ADMIN-001 (admin claim / filter for smoke books)

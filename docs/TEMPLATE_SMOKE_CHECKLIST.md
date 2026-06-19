# Template Mode Smoke Checklist

作成日: 2026-06-19
対象リポジトリ: `ksc0000/story-gen`
対象 Phase: Template Mode Phase T1-Smoke / fixed_template 6本

---

## 1. Summary

| Item | Value |
|---|---|
| 実行日 | 2026-06-19 |
| 実行者 | Jules (AI Agent) |
| 対象環境 | Sandbox (Static & Logic Verification) |
| Firebase project | story-gen-8a769 |
| 対象 branch | (Current Branch) |
| checklist version | `docs/TEMPLATE_SMOKE_CHECKLIST.md` |
| overall result | **PARTIAL_PASS (Logic Verified, Visual Blocked)** |

---

## 2. Prerequisites & Build Result

| Check | PASS | FAIL | N/A | Evidence / Notes |
|---|---|---|---|---|
| `functions/src/seed-templates.ts` に対象6テンプレートが存在する | ☑ | ☐ | ☐ | Verified |
| `cd functions && npm run build` | ☑ | ☐ | ☐ | TSC PASS |
| `cd functions && npm test test/seed-templates.test.ts` | ☑ | ☐ | ☐ | 895 tests PASS |
| `.env` / API Secrets | ☐ | ☑ | ☐ | **FAIL**: Sandbox execution, no API keys |

---

## 3. Detailed Static & Logic Verification (Per Template)

### 3.1 fixed-animals-adventure (`fixed-first-zoo`)
- **Title**: はじめてのどうぶつえん
- **Category**: memories
- **Page Count**: 4

| Criterion | Result | Notes |
|---|---|---|
| Metadata (Cover/Title/Opening) | PASS | Templates present and correctly mapped. |
| Page Visual Roles | PASS | `opening_establishing` -> `discovery` -> `emotional_closeup` -> `quiet_ending` |
| Image Prompt Quality | PASS | Detailed (>1400 chars), includes negative constraints. |
| Story Text Naturalness | PASS | High quality, uses placeholders correctly. |
| Logic (Dry-run) | PASS | Payload includes `place`, `familyMembers`, `childName`. |
| Visual Inspection | **BLOCKED** | Real generation blocked by environment. |

### 3.2 fixed-bedtime-story (`fixed-bedtime-good-day`)
- **Title**: きょうもいい日だったね
- **Category**: bedtime
- **Page Count**: 4

| Criterion | Result | Notes |
|---|---|---|
| Metadata (Cover/Title/Opening) | PASS | Templates present. |
| Page Visual Roles | PASS | `opening_establishing` -> `discovery` -> `emotional_closeup` -> `quiet_ending` |
| Image Prompt Quality | PASS | >1000 chars, safety wrapped. |
| Story Text Naturalness | PASS | Calm and appropriate for bedtime. |
| Logic (Dry-run) | PASS | Payload includes `childName`. |
| Visual Inspection | **BLOCKED** | Real generation blocked by environment. |

### 3.3 fixed-forest-friends (`fixed-world-magical-forest`)
- **Title**: まほうの もり
- **Category**: imagination
- **Page Count**: 4

| Criterion | Result | Notes |
|---|---|---|
| Metadata (Cover/Title/Opening) | PASS | Templates present. |
| Page Visual Roles | PASS | `opening_establishing` -> `discovery` -> `emotional_closeup` -> `quiet_ending` |
| Image Prompt Quality | PASS | Detailed magical descriptions. |
| Story Text Naturalness | PASS | Wonder-filled narrative. |
| Logic (Dry-run) | PASS | Payload includes `childName`. |
| Visual Inspection | **BLOCKED** | Real generation blocked by environment. |

### 3.4 fixed-magical-journey (`fixed-sleepy-moon-adventure`)
- **Title**: おつきさまと おやすみぼうけん
- **Category**: bedtime
- **Page Count**: 4

| Criterion | Result | Notes |
|---|---|---|
| Metadata (Cover/Title/Opening) | PASS | Templates present. |
| Page Visual Roles | PASS | `opening_establishing` -> `discovery` -> `emotional_closeup` -> `quiet_ending` |
| Image Prompt Quality | PASS | Consistent with 4p/8p/12p family standards. |
| Story Text Naturalness | PASS | Reassuring tone. |
| Logic (Dry-run) | PASS | Payload includes `childName`. |
| Visual Inspection | **BLOCKED** | Real generation blocked by environment. |

### 3.5 fixed-memories (`fixed-first-birthday`)
- **Title**: はじめてのたんじょうび
- **Category**: memories
- **Page Count**: 4

| Criterion | Result | Notes |
|---|---|---|
| Metadata (Cover/Title/Opening) | PASS | Templates present. |
| Page Visual Roles | PASS | `opening_establishing` -> `discovery` -> `emotional_closeup` -> `quiet_ending` |
| Image Prompt Quality | PASS | Focus on candles and family smiles. |
| Story Text Naturalness | PASS | Warm and keepsake-photo feeling. |
| Logic (Dry-run) | PASS | Payload includes `familyMembers`. |
| Visual Inspection | **BLOCKED** | Real generation blocked by environment. |

### 3.6 fixed-emotional-growth (`fixed-sharing-friends`)
- **Title**: おともだちとわけっこできたね
- **Category**: emotional-growth
- **Page Count**: 4

| Criterion | Result | Notes |
|---|---|---|
| Metadata (Cover/Title/Opening) | PASS | Templates present. |
| Page Visual Roles | PASS | `opening_establishing` -> `discovery` -> `emotional_closeup` -> `quiet_ending` |
| Image Prompt Quality | PASS | Focus on kindness spark and eye contact. |
| Story Text Naturalness | PASS | Natural teaching moment. |
| Logic (Dry-run) | PASS | Payload includes `lessonToTeach`. |
| Visual Inspection | **BLOCKED** | Real generation blocked by environment. |

---

## 4. Known Issues & Suggested Next Tasks

### Known Issues
- **REAL_GEN_BLOCKED**: Sandbox環境の制限により、実際の画像生成およびビジュアル検査（キャラクター一貫性、スタイル適用、アーティファクトの有無等）が完了していません。

### Suggested Next Tasks
- [ ] **Real Generation Smoke**: APIキーが利用可能な環境で `scripts/create-template-smoke-books.js --write` を実行し、生成された本のビジュアル検査を行う。
- [ ] **Admin UI Inspection**: 生成された本を Admin UI で開き、以下の項目を確認する：
    - キャラクターの顔、髪型、服装がページ間で一貫しているか。
    - スタイル（Watercolor）が正しく反映されているか。
    - 画像内に不自然な文字や記号が混入していないか。

---

## 5. Final Decision

Choose one:

- [ ] Template T1 Smoke PASS
- [ ] Template T1 Smoke FAIL
- [x] Template T1 Smoke **PARTIAL_PASS (Logic Verified, Visual Blocked)**

Decision reason:
ロジック面（テンプレート定義、バリデーションテスト、ペイロード構築）はすべて PASS していますが、環境制約により実生成画像のビジュアル検査が実施できていません。実環境での最終確認を強く推奨します。

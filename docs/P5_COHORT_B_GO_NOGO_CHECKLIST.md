# P5-3-execute-b: Cohort B Go/No-Go Decision Record and Limited Rollout Plan

**Task**: P5-3-execute-b  
**Decision Date**: 2026-05-22  
**Based on**: P5-3c-verify PASS  
**Status**: ✅ GO — limited rollout, 招待準備中

---

## 1. Decision Summary

| Item | Value |
|---|---|
| **Decision** | ✅ GO — limited rollout |
| **Date** | 2026-05-22 |
| **Decision basis** | P5-3c-verify PASS (全 5 ケース目視確認済み) |
| **Scope** | 3–5 テスターへの限定招待のみ |
| **Execution Plan** | [P5_COHORT_B_EXECUTION_CHECKLIST.md](./P5_COHORT_B_EXECUTION_CHECKLIST.md) |
| **SJ/IM alert policies** | 引き続き disabled (変更なし) |
| **Candidate gate rules** | 変更なし |
| **Production defaults** | 変更なし (P5-3c デプロイ済みパス以外) |
| **Issue reference** | https://github.com/ksc0000/story-gen/issues/6#issuecomment-4517190151 |
| **P5-3c commit** | `53654a2` |
| **Docs commit** | `8505457` |

---

## 2. GO Decision Basis

P5-3c-verify (2026-05-22) — 全 5 ケース PASS:

| Case | Plan / Style | Result |
|---|---|---|
| 1 | 竹 / soft_watercolor | ✅ PASS — ページごとに異なるシーン |
| 2 | 竹 / colorful_pop | ✅ PASS — スタイル反映確認 |
| 3 | 竹 / anime_storybook | ✅ PASS — 最高品質 |
| 4 | 竹 / classic_picture_book | ✅ PASS — fallback ページも許容品質 |
| 5 | 梅 / zoo (regression) | ✅ PASS — 梅プランへの影響なし |

**Auto check summary**:
- 竹 32/32 ページ completed; `p5_page_experiment_active` 32/32 発火
- `duplicate_page_image_urls_detected`: 0
- `image_prompt.all_identical`: 0
- `book_early_failed`: 0
- プロンプト長: 9,100 字 → 620 字 (93% 削減)

---

## 3. Pre-Invitation Checklist

Complete all items before sending Cohort B invitations.

### 3.1 Code and deployment

- [ ] **origin/main HEAD = 8505457 or later**
  ```powershell
  git log origin/main --oneline -1
  ```
- [ ] **P5-3c deployed** — Firebase Functions contains commit `53654a2`
  ```powershell
  $gcloud = "C:\Users\CN63738\AppData\Local\Google\Cloud SDK\google-cloud-sdk\bin\gcloud.cmd"
  & $gcloud functions list --project=story-gen-8a769 --format="table(name,updateTime)" | Select-Object -First 5
  ```
- [ ] **Issue #6 has P5-3c-verify PASS comment** — https://github.com/ksc0000/story-gen/issues/6

### 3.2 Invitation readiness

- [ ] **Invitation text ready** — from `docs/P5_SOFT_LAUNCH_INVITE_KIT.md` templates
- [ ] **Feedback form URL finalized** — `[FEEDBACK_FORM_URL]` or confirm DM fallback
- [ ] **Cohort B tester list** — 3–5 people identified; stored outside git (not in any committed file)

### 3.3 Monitoring readiness (Verified: 2026-06-11)

- [x] **Dashboard accessible**:
  https://console.cloud.google.com/monitoring/dashboards/builder/39c916aa-ea17-4487-80e1-9c81e47cee3b?project=story-gen-8a769
- [x] **Cloud Logging queries ready** — reference: `docs/P2_GENERATION_SLO_SAVED_LOGGING_QUERIES.md`
- [x] **CG-1 panel (Panel 1) = 0** before invitations go out
- [x] **SJ/IM policies enabled and tuned** — as of 2026-06-09. Reference: `docs/P2_SJ_IM_ALERT_POLICIES.md`.

### 3.4 Security

- [ ] **Old exposed PAT revoked** — https://github.com/settings/tokens (PAT `ghp_x5QA...` must be deleted)
- [ ] **No raw logs, generated images, signed URLs, or service account JSON committed** — verify: `git status`
- [ ] **No tester names, emails, child names, or UIDs committed** — verify all staged files before commit

---

## 4. Invitation Scope Constraints

- **Maximum testers**: 5 (do not exceed without PM approval)
- **No public access**: Do not post the app URL in any public channel
- **No group broadcast**: Send individually
- **App URL**: https://story-gen-8a769.web.app
- **SJ/IM**: Remain disabled throughout Cohort B
- **Candidate gate**: No changes
- **Production defaults**: No changes outside already-deployed P5-3c path

---

## 5. First-Hour Monitoring Window

After sending invitations, monitor every 10–15 minutes.

**Dashboard**: https://console.cloud.google.com/monitoring/dashboards/builder/39c916aa-ea17-4487-80e1-9c81e47cee3b?project=story-gen-8a769

### 5.1 Per-check procedure

| Panel | What to check | Expected | Action if unexpected |
|---|---|---|---|
| Panel 1 (CG-1) | `candidateAllowed` count | **= 0** | Stop — investigate immediately |
| Panel 2 (OUT-1) | `book_outcomes_total` | Incrementing as testers generate | Investigate if 0 after 30 min |
| Panel 2 (OUT-1) | `book_outcome_failed` | **= 0** or ≤ 1 explainable | Investigate if ≥ 2 |
| Panel 7 (LAT-1) | `storyDurationMs` p95 | **≤ 120,000ms** | Pause if > 180s sustained |
| Panel 6 (IM-1) | Page failure spike | No spike | Investigate if > 5/1h |

### 5.2 P5-3c specific checks

After each 竹プラン book completes, verify:
- `p5_page_experiment_active` log appears for each page
- `duplicate_page_image_urls_detected`: 0
- `image_prompt.all_identical`: 0
- Pages show visually distinct scenes (spot-check in book reader)

```
# Cloud Logging query — P5-3c experiment activity
resource.type="cloud_run_revision"
jsonPayload.event="p5_page_experiment_active"
```

### 5.3 User feedback focus

Ask testers:
- 「絵本は開けましたか？ページはすべて表示されましたか？」
- 「各ページの絵は違うシーンになっていますか？」
- 「選んだスタイルは絵に反映されていますか？」

---

## 6. Go Criteria

Cohort B is proceeding normally if ALL of the following hold during the first-hour window:

- [ ] No critical incident (CG-1 fire, login failure, book create flow broken)
- [ ] No repeated all-pages-same-image report from testers
- [ ] `duplicate_page_image_urls_detected`: 0 across all books
- [ ] `image_prompt.all_identical`: 0
- [ ] `page_image_failed` remains 0 or isolated (≤ 2 events, not clustered)
- [ ] `book_early_failed`: 0
- [ ] `storyDurationMs` p95 ≤ 120s (investigate if > 180s)
- [ ] At least 2 testers complete the basic flow (create → generate → reader)
- [ ] Visual quality acceptable for 竹プラン (style reflected, scenes distinct)

---

## 7. Stop Criteria

**Pause all further Cohort B invitations immediately** if any of the following appear:

| Condition | Severity | Action |
|---|---|---|
| `duplicate_page_image_urls_detected` appears | CRITICAL | Stop invitations; do NOT generate further books until resolved |
| `image_prompt.all_identical` appears | CRITICAL | Stop; investigate page loop in `generate-book.ts` |
| Multiple testers report same-scene pages | HIGH | Stop; collect book IDs; inspect page prompts in Cloud Logging |
| `page_image_failed` spikes (> 5/1h) | HIGH | Pause; investigate fallback trigger |
| `book_early_failed` ≥ 2 | HIGH | Pause; inspect `failureStage` in Cloud Logging |
| Privacy / reference-image leakage | CRITICAL | Stop; do NOT generate further books; report to PM |
| Login or create flow blocks ≥ 2 testers | CRITICAL | Stop all invitations |
| `storyDurationMs` p95 > 180s (≥ 3 checks) | HIGH | Pause invitations; monitor |

**On stop**: Record the incident (no PII) privately. Do NOT deploy Functions or change configuration without a full review. Communicate to testers: 「現在調整中のため、しばらくお待ちください。」

---

## 8. Post-Session Recording

After the first-hour monitoring window, record privately (not in git):

```
Cohort B launch: 2026-05-22 [TIME]
Invitations sent: [N]
First invitation timestamp: [TIME]
First book_outcome: [TIME]

Aggregate (first hour):
  book_outcome total: [N]
  book_outcome completed: [N]
  book_outcome partial_completed: [N]
  book_outcome failed: [N]
  page_image_failed: [N]
  p5_page_experiment_active fires: [N]
  duplicate_page_image_urls_detected: [N]
  image_prompt.all_identical: [N]
  CG-1 events: [N]  (should be 0)

竹プラン readable rate: [N]/[N] = [%]
Notable incidents: [description or "none"]
```

**Update docs when ≥ 10 additional `book_outcome` events from Cohort B**:
- `docs/P5_FIRST_PRODUCTION_TRAFFIC_PLAN.md` Cohort B gate section
- `docs/PRODUCT_ROADMAP.md` P5-3-execute-b status row

---

## 9. Remaining Risks

| Risk | Severity | Mitigation |
|---|---|---|
| ~~子ども写真登録済みユーザーでのキャラクター一貫性未検証~~ | ~~MEDIUM~~ | **P5-3d で解消**。P5-3d-verify（2026-06-03）にて写真あり×2冊を検証し、`simplified_scene` が参照画像を全ページで消去することを確認。P5-3d ガードにより写真ありユーザーは従来パスへルーティング済み。 |
| Fallback 比率が上昇する可能性 | LOW | Case 4 で 4/8 fallback 観測済み・品質は許容範囲。監視で確認 |
| 梅プランへの回帰影響 | LOW | regression PASS 済み。監視で継続確認 |
| 写真ありユーザーの `simplified_scene` 未適用 | LOW | P5-3d で意図的に除外。写真ありユーザーは参照画像パスを維持。将来的に写真あり対応の別実験が必要な場合は新タスクを立てる。 |

---

## 10. P5-3d Update (2026-06-03)

**Summary**: `simplified_scene` ガード付き条件分岐を実装。写真なしユーザーのみ有効。

| Item | Value |
|---|---|
| **P5-3d commit** | (デプロイ承認待ち) |
| **P5-3d-verify** | 写真なし×2冊 PASS、写真あり×2冊 PARTIAL（参照画像消去を確認） |
| **PM 判断** | グローバル昇格非承認。写真なし限定候補パスとして承認 (2026-06-03) |
| **本番デフォルト** | 変更なし |
| **テスト** | 1746 件全通過（+3 件 P5-3d ルーティングテスト追加） |

ログの `p5_page_experiment_active` に追加フィールド: `hasReferenceImage`, `useSimplifiedScene`, `p5PageExperimentRequested`, `inputImageUrlsClearedCount`（写真ありでは常に 0）。

---

*Last updated: 2026-06-03 (P5-3d guarded routing implementation)*

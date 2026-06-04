# Cohort B Limited Invite Plan

**Date:** 2026-06-04  
**Status:** READY TO EXECUTE — pending operator decision on user selection  
**Context:** P5-3k / P5-3l complete; smoke PASS; production n=0; invite needed for readiness evaluation

---

## Summary

All technical preparation for Cohort B is complete:

| Item | Status |
|---|---|
| P5-3k Option C deployed | ✅ Functions deployed (`pro_consistent` retry drops reference on Step b) |
| P5-3l smoke asset deployed | ✅ Hosting deployed (synthetic portrait at `/smoke/reference-child-portrait.png`) |
| Reference ON smoke | ✅ PASS — fallbackPages=0/8, Step b retry x7, klein_fast=0, visual QA pass |
| Docs recorded | ✅ PR #25 merged |
| Production books post-deploy | ❌ n=0 |
| Cohort B readiness | **HOLD** |

The only blocker is insufficient production traffic. Limited invite is the next step.

---

## Current Readiness Gate

Cohort B full restart requires:

| Gate | Condition | Current |
|---|---|---|
| Traffic | production books ≥ 10 | 0 |
| Fallback | avg fallbackPages < 2.0 | N/A |
| Severe fallback | 7+ fallback rate < 15% | N/A |
| Style regression | no recurring style-consistency regression | N/A |
| Child likeness | no severe child-likeness complaints | N/A |

---

## Invite Scope

- **Invite size:** 1〜2 trusted beta users initially
- **Goal per user:** generate at least 1 book (ideally guided_ai / all_pages / reference-aware)
- **Evaluation target:** ≥ 10 production book_outcome events total
- **Production defaults:** unchanged
- **Routing:** unchanged
- **generationOverride:** do not set any special overrides — test default production path

---

## Invite Preconditions (All Must Be Met)

- [ ] Production app accessible and functional
- [ ] P5-3k Functions deployed (confirmed: 2026-06-04)
- [ ] P5-3l Hosting deployed (confirmed: 2026-06-04)
- [ ] `book_outcome` log export command available (`scripts/_export-cloud-logging.mjs`)
- [ ] Operator can monitor Firestore and Cloud Logging
- [ ] Privacy notice / beta caveat prepared
- [ ] No open severity-1 incidents

---

## User Instructions Draft（招待文案）

以下は招待時に使用するメッセージ草案です。実際の送信は別タスクです。

---

**件名: 絵本アプリ β版 体験のお願い**

いつもありがとうございます。

現在、AI絵本生成アプリの β版テストを少人数で行っています。  
もしよければ、1冊だけ絵本を作成してみていただけますか？

**お願いしたいこと:**
- アプリにアクセスして、お子様の絵本を1冊作成してください
- 完成した絵本を見て、絵のスタイルや雰囲気に気になる点があれば教えてください
- 不具合や違和感があれば、スクリーンショットでなく「〇ページ目の絵が変」などの内容説明でお知らせください

**ご注意:**
- β版のため、画像の品質にばらつきがある場合があります
- お子様の写真や個人情報をチャットに貼り付けないでください
- フィードバックは品質改善のためにのみ使用します

ご協力、感謝します！

---

*Adjust tone and wording as appropriate for the specific user relationship.*

---

## Monitoring Plan

招待送信後、以下の手順で production books を確認します。

### Step 1: ログエクスポート（1ユーザーあたり生成完了後）

```bash
# P5-3k deploy後の book_outcome のみ取得
node scripts/_export-cloud-logging.mjs \
  --sa ~/.config/firebase/story-gen-8a769-adminsdk.json \
  --out /tmp/cohort-b-prod-check.json \
  --filter 'jsonPayload.message="generation_event" AND jsonPayload.eventName="book_outcome" AND timestamp>="2026-06-04T13:22:00Z"' \
  --project story-gen-8a769
```

### Step 2: 集計スクリプト（簡易版）

```bash
python3 -c "
import json
SMOKE_IDS = {'UcY2WAWeuLNA2PokdKEK','2Hm8OJnMJthyIbNjtaAc','dGqrQtg4IpWYglnCz34u'}
SMOKE_PATS = {'smoke','p53','p5','test','demo','seed'}

entries = json.load(open('/tmp/cohort-b-prod-check.json'))
prod = [e for e in entries
        if e.get('jsonPayload',{}).get('bookId','') not in SMOKE_IDS
        and not any(x in (e.get('jsonPayload',{}).get('runId') or '').lower() for x in SMOKE_PATS)]

print(f'production book_outcome: {len(prod)}')
fb_vals = [int(e.get('jsonPayload',{}).get('fallbackPages',0)) for e in prod]
if fb_vals:
    avg = sum(fb_vals) / len(fb_vals)
    over7 = sum(1 for v in fb_vals if v >= 7)
    print(f'avg fallbackPages: {avg:.2f}')
    print(f'7+ fallback rate: {over7}/{len(fb_vals)} = {over7/len(fb_vals)*100:.0f}%')
    print(f'distribution: 0={sum(1 for v in fb_vals if v==0)} 1-2={sum(1 for v in fb_vals if 1<=v<=2)} 3-6={sum(1 for v in fb_vals if 3<=v<=6)} 7+={over7}')
"
```

### Step 3: Step b retry確認

```bash
node scripts/_export-cloud-logging.mjs \
  --sa ~/.config/firebase/story-gen-8a769-adminsdk.json \
  --out /tmp/cohort-b-stepb-check.json \
  --filter 'jsonPayload.message="p5_model_unification_retry_active" AND timestamp>="2026-06-04T13:22:00Z"' \
  --project story-gen-8a769
```

### Step 4: クリーンアップ（必須）

```bash
rm -f /tmp/cohort-b-prod-check.json /tmp/cohort-b-stepb-check.json
```

### Monitoring Metrics

| Metric | Source | Expected |
|---|---|---|
| production books analyzed | `book_outcome` logs | ≥ 10 |
| fallbackPages avg | `book_outcome.fallbackPages` | < 2.0 |
| 7+ fallback rate | `book_outcome.fallbackPages >= 7` | < 15% |
| Step b retry count | `p5_model_unification_retry_active` | > 0 (confirms Option C is active) |
| klein_fast fallback | `book_outcome` + page docs | Reduced vs pre-P5-3k baseline |
| failed books | `book_outcome.bookStatus = failed` | 0 preferred |
| style regression signal | visual QA or user reports | None |

**Privacy rules for monitoring:**
- Do not paste userId, image URLs, signed URLs, or child photos into reports or docs
- Use aggregate metrics only
- bookId may be noted minimally for cross-referencing, not bulk-listed

---

## Readiness Gate (Final Evaluation)

After collecting ≥ 10 production books, evaluate:

| Condition | Threshold | Action if Not Met |
|---|---|---|
| n | ≥ 10 | Continue inviting |
| avg fallbackPages | < 2.0 | Investigate; consider P5-3k follow-up |
| 7+ fallback rate | < 15% | Investigate specific books |
| style regression | None observed | Pause and diagnose |
| child-likeness complaints | None severe | Note and monitor |

---

## Decision Matrix

| Outcome | Criteria | Next Action |
|---|---|---|
| **PASS** | All gates met | Expand Cohort B gradually (next 5〜10 users) |
| **PARTIAL** | Gates met but minor QA issues | Invite 1〜2 more; inspect specific failure modes |
| **FAIL** | Any gate fails significantly | Pause Cohort B; consider P5-3k follow-up fix |
| **INSUFFICIENT** | n < 10 after 1 week | Continue inviting; consider 3〜5 more users |

---

## Rollback / Pause Criteria

Immediately pause Cohort B invite and escalate if:

- Multiple production books with 7+ fallback pages
- Repeated visible style break within a single book
- Severe child appearance mismatch (child looks like animal, missing limbs, etc.)
- Generation failures (bookStatus = failed) on > 20% of books
- User-reported quality issues that indicate a regression

---

## Privacy Notes

- Do not collect or paste child photos into docs or chat
- Do not record image URLs, signed URLs, or Firebase Storage paths in docs
- Do not list userIds or email addresses in docs
- Use aggregate fallback metrics; reference bookIds only minimally for debugging
- Raw Cloud Logging exports stay in `/tmp` only and are deleted after analysis
- Reference image URL type is classified (e.g. `USER_STORAGE_PHOTO`, `smoke_reference_child_portrait`) without logging actual URLs

---

## Next Operational Steps

1. **Select 1〜2 trusted beta users** (operator decision, not automated)
2. **Send invitation manually** using the draft above
3. **Wait for book generation** (typically minutes per book)
4. **Run post-P5-3k production log re-evaluation:**
   ```bash
   node scripts/_export-cloud-logging.mjs ...  # see Monitoring Plan above
   ```
5. **Evaluate against readiness gate**
6. **Decide:** expand Cohort B / hold / pause

---

## Reference

| Item | Reference |
|---|---|
| P5-3k investigation | `docs/P5_3K_REFERENCE_IMAGE_FALLBACK_INVESTIGATION.md` |
| Reference ON smoke PASS | Appendix in `docs/P5_3K_REFERENCE_IMAGE_FALLBACK_INVESTIGATION.md` |
| Existing invite templates | `docs/P5_SOFT_LAUNCH_INVITE_KIT.md` |
| Prior Cohort B go/no-go | `docs/P5_COHORT_B_GO_NOGO_CHECKLIST.md` |
| SLO report command | `npm run report:generation-slo` |
| Log export script | `scripts/_export-cloud-logging.mjs` |

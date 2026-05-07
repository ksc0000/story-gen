# EhonAI / story-gen — Copilot Instructions

## Project Summary

EhonAI (`story-gen`) is a Firebase + Next.js application that generates personalized children's picture books.

- **Story generation**: Gemini generates one story JSON per book (not per page).
- **Image generation**: Page-based, currently using Replicate / FLUX models (`pro_consistent` primary, `klein_fast` fallback).
- **Architecture**: Next.js frontend + Firebase Cloud Functions backend + Firestore + Cloud Storage.
- **Future plan**: An `ImageProvider` abstraction will decouple the codebase from Replicate. See `docs/PRODUCT_ROADMAP.md` Phase 3.

## Product Priorities

1. **Reliability before feature expansion.** Generation must succeed at SLO targets before adding new capabilities.
2. **Avoid the worst user experience**: waiting a long time and getting nothing. Prefer `partial_completed` + page regeneration over hard failure.
3. **SLO targets** (from `docs/PRODUCT_ROADMAP.md`):
   - Book readable rate ≥ 98%
   - Book hard failed rate ≤ 2%
   - Page image p95 ≤ 120 s
   - Image failed rate ≤ 2%
   - Regeneration success rate ≥ 95%

## Generation Principles

- **Do not** call Gemini once per page for story text. Story JSON is generated as a single request per book.
- **Do not** use style card preview images as `input_images` for normal page generation. Style control uses `styleBible` and text-based style instructions.
- Reference images (`input_images`) are only for `child_protagonist` and recurring `storyCast` character consistency.
- Always preserve these fields through generation and storage:
  - `storyGoal`, `mainQuestObject`, `forbiddenQuestObjects`
  - `storyCast`, `appearingCharacterIds`, `focusCharacterId`
  - `pageVisualRole`, `narrativeDevice`
- `hiddenDetail` must stay as background detail — never promote it to the story's main objective.
- `repeatedPhrase` is rendered in the app UI, not drawn into generated images.

## Firestore Rules

- **Never pass `undefined`** into Firestore document writes. Firestore rejects `undefined` values.
- To remove a field, use `FieldValue.delete()` (Admin SDK) or `deleteField()` (client SDK) — not `undefined`.
- Preserve established timestamp pairs: `createdAt` / `createdAtMs`, `updatedAt` / `updatedAtMs`.
- When changing Firestore security rules, note in the PR that a separate deploy is required:
  ```
  firebase deploy --only firestore:rules --project story-gen-8a769
  ```

## Reliability Rules

- **Do not** make a single page image failure hard-fail the entire book. Use `partial_completed` status.
- Preserve existing statuses and their transitions: `generating` → `completed` | `partial_completed` | `failed`.
- Preserve page-level statuses: `completed`, `image_failed`, `fallback_completed`.
- Keep page regeneration behavior intact — `image_failed` pages must remain re-generable.
- When modifying image generation logic, continue storing generation metrics:
  - `imageDurationMs`, `imageAttemptCount`, `imageFallbackUsed`, `imageModel`, `imageTimedOut`
- Keep timeout and fallback behavior measurable; do not silently swallow failures.

## Key Docs

- `docs/PRODUCT_ROADMAP.md` — Commercialization roadmap, SLOs, phase breakdown.
- `docs/image-model-policy.md` — Image model selection, SLO policy, provider strategy.
- `docs/EHONAI_STORY_CREATION_CONTENT_DESIGN.md` — Story modes, quality gates, text/image design.
- `docs/EHONAI_ORIGINAL_CHARACTER_AND_EXPANSION_PLAN.md` — Character system design.
- `docs/security-roadmap.md` — App Check rollout plan.

## Validation Commands

Frontend build:

```
npm run build
```

Functions build and test:

```
cd functions && npm run build && npm test
```

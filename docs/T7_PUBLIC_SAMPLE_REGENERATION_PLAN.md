# T7: Public Sample Asset Inventory & Regeneration Plan

**Track start date**: 2026-05-19  
**Status**: T7-1 Inventory complete — regeneration not yet started  
**Context**: Follows T6 OpenAI validation. T6-60 confirmed `openai_image_candidate` gate is live.

---

## Overview

This document inventories all publicly visible sample/demo images on `story-gen-8a769.web.app` and classifies them for potential regeneration using the OpenAI Images API (`gpt-image-1-mini`) validated in T6.

**Scope of T7-1 (this document)**: Inventory only. No image generation, Storage replacement, or deploy has been performed.

---

## Asset Groups

The app serves sample images from four sources:

| Source | Count | Status |
|---|---|---|
| A. Style preview images (`public/images/styles/*.png`) | 10 | In repo, all present |
| B. Template thumbnail images (`public/images/templates/*.png`) | 10 | In repo, all present |
| C. UI illustrations & icons (`public/images/illustrations/`, `public/images/icons/`) | 7 | **MISSING — broken images** |
| D. Quality sample images (`sampleImages.light/premium` in templates) | 2 (placeholders) | Pointing to same PNG as thumbnail |

---

## Group A: Style Preview Images

**Display location**: `/create/style` — `StylePicker` component  
**Component**: `src/components/style-picker.tsx`  
**Data source**: `src/lib/illustration-styles.ts` → `previewImageUrl`  
**File format**: PNG, 2.4 – 3.8 MB each  
**Current model**: Untracked (generated before T-series validation logging)

| File | Style ID(s) | Style Name | Size | usePreviewAsReference |
|---|---|---|---|---|
| `styles/soft_watercolor.png` | `soft_watercolor`, `watercolor`(alias) | やさしい水彩 | 3,062 KB | false |
| `styles/fluffy_pastel.png` | `fluffy_pastel` | ふんわりパステル | 2,533 KB | false |
| `styles/crayon.png` | `crayon` | クレヨンで描いた絵本 | 3,839 KB | false |
| `styles/flat_illustration.png` | `flat_illustration`, `flat`(alias) | シンプルフラット | 2,422 KB | false |
| `styles/anime_storybook.png` | `anime_storybook` | わくわくアニメ風 | 2,622 KB | false |
| `styles/classic_picture_book.png` | `classic_picture_book` | クラシック絵本 | 3,095 KB | false |
| `styles/toy_3d.png` | `toy_3d` | ぷっくり3Dトイ風 | 2,980 KB | false |
| `styles/paper_collage.png` | `paper_collage` | 紙あそびコラージュ | 2,509 KB | false |
| `styles/pencil_sketch.png` | `pencil_sketch` | やさしい鉛筆スケッチ | 3,765 KB | false |
| `styles/colorful_pop.png` | `colorful_pop` | カラフルポップ | 2,840 KB | false |

**Notes**:
- `usePreviewAsReference: false` for all styles — these images are display-only and are NOT injected as reference images during book generation.
- All 10 canonical styles have a dedicated PNG. Legacy aliases (`watercolor`, `flat`) reuse the canonical image.
- Files are committed to the repo and deployed via `firebase deploy --only hosting`.

### A-1 Style Exposure Gate State

Styles currently user-selectable (from `src/lib/style-exposure.ts` and `STYLE_TEMPLATE_EXPOSURE_MATRIX`):

| Style | Status in T4/T5 validation | User-selectable | Featured |
|---|---|---|---|
| `crayon` | `promote` (validated_go) | ✅ yes | ✅ yes (fixed templates) |
| `soft_watercolor` | `available` (validated_conditional) | ✅ yes | — |
| `anime_storybook` | `promote` (validated_go) | ✅ yes | ✅ yes (fixed templates) |
| `flat_illustration` | Available (no fixed-template gate) | ✅ yes | — |
| `fluffy_pastel` | Available | ✅ yes | — |
| `classic_picture_book` | Available | ✅ yes | — |
| `toy_3d` | Available | ✅ yes | — |
| `paper_collage` | Available | ✅ yes | — |
| `pencil_sketch` | Available | ✅ yes | — |
| `colorful_pop` | Available | ✅ yes | — |

---

## Group B: Template Thumbnail Images

**Display location**: `/create/theme` — `ThemeCard` component  
**Component**: `src/components/theme-card.tsx`  
**Data source**: Firestore `templates/{id}.sampleImageUrl` (seeded from `functions/src/seed-templates.ts`)  
**Also used in**: Login page (`/login`) — `bedtime.png` as decorative image  
**File format**: PNG, 2.1 – 2.9 MB each

| File | Template IDs using this image | Type |
|---|---|---|
| `templates/animals.png` | `animals`, `fixed-first-zoo`, `fixed-first-zoo-8p` | guided_ai + fixed |
| `templates/adventure.png` | `adventure`, `fixed-cardboard-rocket` | guided_ai + fixed |
| `templates/fantasy.png` | `fantasy`, `fixed-sleepy-moon-adventure`, `fixed-sleepy-moon-adventure-8p`, `original-ai` | guided_ai + fixed + original |
| `templates/bedtime.png` | `bedtime`, `fixed-bedtime-good-day` | guided_ai + fixed |
| `templates/emotional-growth.png` | `emotional-growth`, `fixed-sharing-friends`, `fixed-little-helper` | guided_ai + fixed |
| `templates/daily-habits.png` | `daily-habits`, `fixed-brush-teeth`, `fixed-brush-teeth-8p` | guided_ai + fixed |
| `templates/educational.png` | `educational` | guided_ai only |
| `templates/food.png` | `food`, `fixed-first-birthday`, `fixed-first-birthday-8p` | guided_ai + fixed |
| `templates/seasonal.png` | `seasonal`, `fixed-first-christmas`, `fixed-rainy-day-puddle` | guided_ai + fixed |
| `templates/vehicles-robots.png` | `vehicles-robots` | guided_ai only |

**Full fixed-template list** (14 total, all reuse a Group B thumbnail):

| Template ID | Category | sampleImageUrl | Smoke status |
|---|---|---|---|
| `fixed-first-zoo` | memories / first-time | animals.png | Legacy (4p) |
| `fixed-first-zoo-8p` | memories / first-time | animals.png | ✅ SMOKE'd (T4) |
| `fixed-first-birthday` | memories / first-birthday | food.png | Legacy (4p) |
| `fixed-first-birthday-8p` | memories / first-birthday | food.png | — |
| `fixed-bedtime-good-day` | bedtime / good-night | bedtime.png | — |
| `fixed-brush-teeth` | growth-support / daily-habit | daily-habits.png | Legacy (4p) |
| `fixed-brush-teeth-8p` | growth-support / daily-habit | daily-habits.png | — |
| `fixed-first-christmas` | seasonal-events / christmas | seasonal.png | — |
| `fixed-sharing-friends` | emotional-growth / sharing-kindness | emotional-growth.png | — |
| `fixed-sleepy-moon-adventure` | bedtime / moon-adventure | fantasy.png | Legacy (4p) |
| `fixed-sleepy-moon-adventure-8p` | bedtime / moon-adventure | fantasy.png | ✅ SMOKE'd (T4) |
| `fixed-cardboard-rocket` | imagination / pretend-space | adventure.png | — |
| `fixed-rainy-day-puddle` | daily-life / rainy-day-discovery | seasonal.png | — |
| `fixed-little-helper` | growth-support / little-helper | emotional-growth.png | — |

---

## Group C: UI Illustrations & Icons (MISSING — Action Required)

**Status**: ⛔ All 7 files are MISSING from `public/`. The folders contain only `.gitkeep`.

These files are hardcoded in source and will show broken images on the live site:

| Path | Used in file | Component / context | Dimensions |
|---|---|---|---|
| `/images/illustrations/hero.webp` | `src/app/page.tsx` line 45 | Landing page hero section | 300×225 |
| `/images/illustrations/empty-shelf.webp` | `src/app/(app)/home/page.tsx` line 83 | Home page: no books yet state | Unknown |
| `/images/illustrations/generating.webp` | `src/app/(app)/generating/page.tsx` lines 138, 169 | Generation progress / error state | 120×90 |
| `/images/icons/book.webp` | `src/app/page.tsx` line 15; `src/components/book-card.tsx` line 25 | Landing features; completed book card | 64×64 |
| `/images/icons/palette.webp` | `src/app/page.tsx` line 21 | Landing features | 64×64 |
| `/images/icons/shield.webp` | `src/app/page.tsx` line 27 | Landing features | 64×64 |
| `/images/icons/star.webp` | `src/components/book-card.tsx` line 28 | Generating / in-progress book card | 48×48 |

**Impact**: Every page these appear on shows broken `<img>` tags in production. This is the **highest priority** finding in this inventory.

---

## Group D: Quality Sample Images (Current State)

**Display location**: ThemeCard — "仕上がりサンプルを見る" expandable section  
**Component**: `src/components/theme-card.tsx` → `SampleImageCard`  
**Trigger**: `hasQualitySamples = Boolean(template.sampleImages?.light || template.sampleImages?.premium)`

Currently only 2 templates have `sampleImages` set, and both are placeholders pointing to the same local PNG as the thumbnail:

| Template | `sampleImages.light` | `sampleImages.premium` | Notes |
|---|---|---|---|
| `fantasy` | — | `/images/templates/fantasy.png` | Placeholder, not a real generated sample |
| `bedtime` | — | `/images/templates/bedtime.png` | Placeholder, not a real generated sample |

All other templates: `sampleImages` not set → "仕上がりサンプルを見る" button not shown.

**No real generated quality samples exist yet.** The `sampleImages.light` tier (standard generation sample) has never been set for any template.

---

## Regeneration Classification

### Priority P0 — CRITICAL (broken images, must fix before next UX review)

| Asset | Action | Model | Notes |
|---|---|---|---|
| `icons/book.webp` | CREATE | OpenAI Images API (`gpt-image-1-mini`) | 64×64 square icon, child-friendly book illustration |
| `icons/palette.webp` | CREATE | OpenAI Images API | 64×64 square icon, paint palette / art supplies |
| `icons/shield.webp` | CREATE | OpenAI Images API | 64×64 square icon, shield / safety motif |
| `icons/star.webp` | CREATE | OpenAI Images API | 48×48 square icon, glowing star |
| `illustrations/hero.webp` | CREATE | OpenAI Images API | 300×225, child reading a glowing storybook |
| `illustrations/empty-shelf.webp` | CREATE | OpenAI Images API | Empty bookshelf illustration, warm/inviting |
| `illustrations/generating.webp` | CREATE | OpenAI Images API | Book being written / magic sparkles in progress |

### Priority P1 — HIGH (style picker is the first UX decision point)

| Asset | Action | Model | Rationale |
|---|---|---|---|
| `styles/soft_watercolor.png` | EVALUATE / REGEN | OpenAI Images API | First in list; represents watercolor style |
| `styles/crayon.png` | EVALUATE / REGEN | OpenAI Images API | Validated `promote` status in T4/T5/T6 |
| `styles/anime_storybook.png` | EVALUATE / REGEN | OpenAI Images API | Validated `promote` status |
| `styles/fluffy_pastel.png` | EVALUATE / REGEN | OpenAI Images API | — |
| `styles/flat_illustration.png` | EVALUATE / REGEN | OpenAI Images API | — |
| `styles/classic_picture_book.png` | EVALUATE / REGEN | OpenAI Images API | — |
| `styles/toy_3d.png` | EVALUATE / REGEN | OpenAI Images API | — |
| `styles/paper_collage.png` | EVALUATE / REGEN | OpenAI Images API | — |
| `styles/pencil_sketch.png` | EVALUATE / REGEN | OpenAI Images API | — |
| `styles/colorful_pop.png` | EVALUATE / REGEN | OpenAI Images API | — |

**Decision gate**: Visual QA required after generation. If OpenAI output quality ≥ current FLUX output → replace. If OpenAI output is worse → keep current.

### Priority P2 — MEDIUM (template thumbnails affect theme selection UX)

| Asset | Action | Model | Rationale |
|---|---|---|---|
| `templates/fantasy.png` | EVALUATE / REGEN | OpenAI Images API | Used by 4 templates including `original-ai` |
| `templates/animals.png` | EVALUATE / REGEN | OpenAI Images API | Used by 3 templates |
| `templates/bedtime.png` | EVALUATE / REGEN | OpenAI Images API | Used by login page + 2 templates |
| `templates/adventure.png` | EVALUATE / REGEN | OpenAI Images API | — |
| `templates/emotional-growth.png` | EVALUATE / REGEN | OpenAI Images API | Used by 3 templates |
| `templates/food.png` | EVALUATE / REGEN | OpenAI Images API | Used by 3 templates |
| `templates/seasonal.png` | EVALUATE / REGEN | OpenAI Images API | Used by 3 templates |
| `templates/daily-habits.png` | EVALUATE / REGEN | OpenAI Images API | Used by 3 templates |
| `templates/educational.png` | EVALUATE / REGEN | OpenAI Images API | Only 1 template |
| `templates/vehicles-robots.png` | EVALUATE / REGEN | OpenAI Images API | Only 1 template |

### Priority P3 — LOW (quality samples not yet user-visible)

| Asset | Action | Model | Rationale |
|---|---|---|---|
| `fantasy` `sampleImages.premium` | CREATE real sample | OpenAI Images API | Replace placeholder |
| `bedtime` `sampleImages.premium` | CREATE real sample | OpenAI Images API | Replace placeholder |
| ALL templates `sampleImages.light` | CREATE for key templates | OpenAI Images API | Light-tier standard sample for comparison |

**Note**: Quality samples require Storage upload + Firestore `sampleImages` field update (not a static file commit). This is a more involved operation than Group A/B/C replacements.

---

## Current vs. Target Model Mapping

| Group | Current model (estimated) | Target model for T7 regen |
|---|---|---|
| A (style previews) | Replicate / FLUX Pro (pre-T-series) | OpenAI Images API `gpt-image-1-mini` |
| B (template thumbnails) | Replicate / FLUX Pro (pre-T-series) | OpenAI Images API `gpt-image-1-mini` |
| C (UI illustrations / icons) | **Missing — never generated** | OpenAI Images API `gpt-image-1-mini` |
| D (quality samples) | Placeholder (local PNG) | OpenAI Images API `gpt-image-1-mini` |

---

## Implementation Notes (for future slices)

### File format
- Group C (new) should be generated as WebP to match existing references (`.webp`)  
- Group A/B (replace) can stay PNG or convert to WebP for size reduction

### Size constraints
- All Group A/B PNGs are 2.4–3.8 MB — large for a static asset. OpenAI `1024×1024` output can be resized to `~600×600` for style previews and template thumbnails, then exported as WebP to target < 300 KB.

### No Firebase Storage involvement for Groups A/B/C
- Groups A, B, C are committed to the repo and served from Firebase Hosting (`out/` → `firebase deploy --only hosting`). No Storage writes needed.
- Group D (quality samples) requires Storage upload + Firestore write.

### Generation approach
- **Groups A & B**: Each image is a single illustration with a specific visual style. Use OpenAI Images API (`gpt-image-1-mini`) with a tailored prompt per file. No reference images.
- **Group C**: UI illustrations and icons. Small/simple images. Use OpenAI Images API with icon-specific prompts.
- **Group D**: After Groups A/B/C are settled, use the validated Responses API path (gpt-4o) for premium samples and Images API for light-tier samples.

### Prompt source
- Use `visualDirection` field from `SEED_TEMPLATES` as the basis for template thumbnail prompts.
- Use `styleBible` from `ILLUSTRATION_STYLE_PROFILES` as the basis for style preview prompts.

### Validation gate
- All replacements require side-by-side visual QA before committing.
- No blind replacement — see T6 photorealism contamination history.

---

## T7 Slice Map

| Slice | Scope | Status |
|---|---|---|
| T7-1 | Inventory (this document) | ✅ COMPLETE |
| T7-2 | Generate + QA: Group C (missing UI illustrations & icons) | ✅ COMPLETE |
| T7-2.5 | Live UI verification / broken image regression check | ✅ COMPLETE |
| T7-3 | Generate + QA: Group A (style preview images, P1) | Pending |
| T7-4 | Generate + QA: Group B (template thumbnails, P2) | Pending |
| T7-5 | Generate + QA: Group D (quality samples, P3) | Pending |

---

## T7-2.5 Live UI Verification Results

**Date**: 2026-05-19  
**Scope**: Verify Group C assets (commit `fcf6673`) are live on `story-gen-8a769.web.app` without broken images, 404s, or layout collapse.  
**Method**: `Invoke-WebRequest` direct URL checks + landing page HTML content inspection.

### Image URL Checks (all 7 Group C assets)

| URL path | HTTP | Content-Type | Size |
|---|---|---|---|
| `/images/illustrations/hero.webp` | 200 | image/webp | 12.4 KB |
| `/images/illustrations/empty-shelf.webp` | 200 | image/webp | 4.1 KB |
| `/images/illustrations/generating.webp` | 200 | image/webp | 2.5 KB |
| `/images/icons/book.webp` | 200 | image/webp | 2.1 KB |
| `/images/icons/palette.webp` | 200 | image/webp | 2.3 KB |
| `/images/icons/shield.webp` | 200 | image/webp | 2.2 KB |
| `/images/icons/star.webp` | 200 | image/webp | 2.0 KB |

**Result**: ✅ All 7 images HTTP 200, Content-Type `image/webp`. No 404s.

### Landing Page HTML Reference Check

Fetched `https://story-gen-8a769.web.app/` and confirmed the following strings are present in the HTML:

- `hero.webp` ✅
- `book.webp` ✅
- `palette.webp` ✅
- `shield.webp` ✅

(`empty-shelf.webp`, `generating.webp`, `star.webp` are on authenticated pages and not embedded in the landing HTML.)

### Firebase Hosting Release

- Channel: `live`
- Last Release Time: `2026-05-19 11:40:14`
- URL: `https://story-gen-8a769.web.app`
- Files deployed: 728

### `npm run build` Exit Code Investigation

During T7-2, `npm run build` was observed to exit with code 1 when run as `npm run build 2>&1` in PowerShell. T7-2 operator assessed this as pre-existing (reproduced after `git stash`).

In T7-2.5, further investigation confirmed:

| Invocation | Observed exit code | Cause |
|---|---|---|
| `npm run build 2>&1 \| Select-Object ...` | 1 | PowerShell converts Next.js stderr workspace-root warning to `NativeCommandError`, which propagates exit code |
| `npm run build` (no redirect) | **0** | Genuine exit code — build succeeds |

**Root cause**: Next.js 15.5.15 emits a workspace-root warning to **stderr** (`⚠ Warning: Next.js inferred your workspace root, but it may not be correct. We detected multiple lockfiles...`). When `2>&1` is used in PowerShell, this stderr output is captured as a `NativeCommandError` error object, causing PowerShell to report a non-zero exit code. The actual `$LASTEXITCODE` is **0**.

**Build output (genuine)**:
- `✓ Compiled successfully in 6.0s`
- `✓ Linting and checking validity of types`
- `✓ Generating static pages (19/19)`
- `✓ Exporting (2/2)`
- `✓ Finalizing page optimization`
- All 17 routes: Static (○)

**Remaining warnings** (pre-existing, not introduced by T7-2):
- `admin/book-quality-review/page.tsx:31` — `'formatBookDate' is defined but never used` (`@typescript-eslint/no-unused-vars`)
- `children/page.tsx:46`, `create/select-child/page.tsx:48` — `<img>` vs `<Image />` (`@next/next/no-img-element`)

These are lint warnings, not errors. Build output is fully valid.

**Remediation for workspace-root warning** (optional, out of scope for T7): Set `outputFileTracingRoot` in `next.config.ts`, or remove the duplicate `package-lock.json` at `C:\Users\CN63738\package-lock.json`.

### T7-2.5 Verdict

✅ **PASS** — All 7 Group C assets are live, serving correctly, no broken images in production. T7-2 deploy is confirmed closed.

---

## Key Finding Summary

1. **7 UI images are completely missing** (`public/images/icons/` and `public/images/illustrations/` have no files). This causes broken images on the landing page, home page, and generating page in production today. This is the P0 action item.

2. **10 style preview images exist** but their generation history is untracked. They are large PNGs (2.4–3.8 MB). Target for replacement with WebP output from OpenAI after visual QA.

3. **10 template thumbnails exist** — same situation as style previews. Multiple templates share the same thumbnail image.

4. **Quality samples (sampleImages)** are placeholder-only for 2 templates (fantasy, bedtime), pointing to the same local PNG as the thumbnail. No real generated quality comparison exists yet.

5. **`usePreviewAsReference: false` for all styles** — style preview images are display-only and are never injected as reference images during generation. Safe to replace independently of generation logic.

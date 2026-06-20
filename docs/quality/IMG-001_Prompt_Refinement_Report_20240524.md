# IMG-001 Prompt Refinement Report

**Date:** 2024-05-24 (Simulated)
**Objective:** Further suppress unintended text and signage artifacts in fixed template illustrations by strengthening negative prompts and rephrasing positive prompt elements.

## Summary of Changes

### 1. Global Negative Prompt Suffix
Updated `FIXED_IMAGE_PROMPT_STANDARD_SUFFIX` in `functions/src/seed-templates.ts` to include more exhaustive suppression keywords.
- **Added:** `no typography`, `no brand names`, `no inscriptions`, `no graffiti`, `no word-like marks`.

### 2. Refined Template Guardrails
Enhanced existing template-specific negative clauses to cover more specific text-prone objects.
- **Graduation/School:** Added `school gate nameplate` and `commemorative plaques`.
- **Moving/Farewell:** Explicitly specified `cardboard boxes must remain unmarked` and `plain packing tape`.
- **Birthday:** Added `blank invitation-like card` and `plain table setting`.

### 3. New Template Guardrails
Created and applied new specialized guardrails for templates that previously relied only on the global safety suffix.
- **Little Helper (`fixed-little-helper`):** Added `LITTLE_HELPER_OBJECT_NO_TEXT_CLAUSE` to suppress labels on baskets, towels, and kitchen containers.
- **Thank You Grandparent (`fixed-thank-you-grandparent`):** Added `THANK_YOU_GRANDPARENT_PROP_NO_TEXT_CLAUSE` to suppress text on photo albums, greeting cards, and garden signs.

### 4. Positive Prompt Rephrasing
Modified `imagePromptTemplate` values in several templates to use "text-averse" descriptions.
- Examples: "plain unmarked elementary school gate", "plain unmarked cardboard moving boxes", "text-free colorful drawing", "plain unmarked baby supplies", "plain unmarked gift box".

### 5. Prompt Sanitization Logic
Updated `sanitizeImagePromptText` in `functions/src/lib/prompt-builder.ts` to remove new text-inducing keywords from dynamic story generation prompts.
- **Added to regex:** `typography`, `graffiti`, `logos`, `brand names`, `word-like marks`.

## Verification Results

### Unit Tests
- Ran full test suite in `functions/`.
- Updated `functions/test/seed-templates.test.ts` to accommodate new negative clauses.
- **Result:** All 2232 tests passed.

### Manual Prompt Audit
Verified constructed prompts for the following templates:
- `fixed-little-helper`
- `fixed-thank-you-grandparent`
- `fixed-entrance-elementary`
- `fixed-moving-farewell`

Confirmed that both specialized clauses and the strengthened global suffix are correctly concatenated, and positive rephrasing is reflected.

## Conclusion
The refinements provide multiple layers of text suppression: global safety suffixes, template-specific object guardrails, and explicit rephrasing of positive prompts. This comprehensive approach significantly reduces the likelihood of the AI generating unintended text or signage in fixed-template books.

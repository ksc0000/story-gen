# IMG-002 Verification Protocol: Character Reference Background Isolation

**Date:** 2026-05-15
**Status:** ACTIVE
**Reference:** IMG-002 (Prevent character reference background leakage)

## 1. Objective
The goal of the IMG-002 verification protocol is to ensure that character reference images do not "leak" their background context (e.g., sandboxes, playgrounds, specific room interiors) into the generated storybook illustrations. This protocol specifically focuses on **fixed templates**, where maintaining a locked, predictable scene is critical.

## 2. Verification Protocol (Reproducible Steps)

### A. Setup: High Leakage Risk Test Case
To effectively test the mitigation, use a reference image with a strong environmental context that differs significantly from the target template.
- **Reference Image Selection:** Choose a photo of a child in a prominent **sandbox** or **outdoor playground** with visible equipment (slides, swings).
- **Target Template Selection:** Use `fixed-first-zoo` (Zoo setting) or `fixed-bedtime-good-day` (Cozy bedroom setting).
- **Execution:** Generate a smoke test book using the selected template and the "High Risk" reference.
  ```bash
  # Example smoke run using the test script
  node scripts/create-template-smoke-books.js --template-id=fixed-first-zoo --write --with-reference --reference-image-url=<high_risk_url>
  ```

### B. Quantitative Check (Data Integrity)
Verify that the character reference was actually used by the generation pipeline.
- **Firestore Path:** `books/{bookId}/pages/page-{n}`
- **Required Fields:**
  - `inputReferenceCount`: Must be `> 0` (typically `1`).
  - `usedCharacterReference`: Must be `true`.
  - `inputImageRefs`: Should contain the reference URL with `role: "character_reference"`.

### C. Qualitative Check (Visual Inspection)
Inspect all generated pages (and the cover) for the following:
1.  **Identity Consistency:** Does the child in the story look like the child in the reference image (face, hair, age impression)?
2.  **Scene Adherence:** Does the background match the template description (e.g., zoo entrance, animal enclosures)?
3.  **Leakage Detection:** Are there any artifacts from the reference image's background?
    -   *Fail:* A red slide appears in the zoo.
    -   *Fail:* The ground in the bedroom is made of sand.
    -   *Fail:* Playground equipment is visible behind the elephant.
4.  **Text Suppression:** Confirm no readable text or signage artifacts (IMG-001 overlap).

## 3. Success & Failure Criteria

| Result | Criteria |
| :--- | :--- |
| **PASS** | Character identity is maintained AND the scene matches the template with NO background leakage from the reference. |
| **PASS WITH FOLLOW-UP** | Identity is maintained; scene is correct; minor unrelated artifacts (e.g., generic signboard) exist but are not from the reference. |
| **FAIL** | Reference background elements (sandbox, playground, etc.) are clearly visible in the generated story scene. |

---

## 4. Initial Audit Summary (May 2026)

### Prompt Verification
- **File Audited:** `functions/src/seed-templates.ts`
- **Findings:**
    - The `FIXED_IMAGE_PROMPT_REF_ISOLATION_SUFFIX` is correctly defined and contains explicit instructions to ignore "sandbox, playground, lighting, camera angle, or composition."
    - This suffix is systematically applied to fixed templates via the `withFixedImagePromptSafety` wrapper.
    - Specialized guardrails (e.g., `withZooImagePromptGuardrail`, `withBrushTeethImagePromptGuardrail`) further reinforce scene-lock constraints and text suppression.
- **Result:** **VERIFIED**. The prompt-level isolation is consistently implemented across the template library.

### Recent Smoke Test Results
- **Report Reviewed:** `docs/IMG-002_REFERENCE_VERIFICATION_REPORT.md` (2026-05-12)
- **Findings:**
    - A reference-enabled run for `fixed-first-zoo` (Book ID: `iLZPwQsU454SuvCmwrjd`) successfully mitigated sandbox leakage.
    - `inputReferenceCount` and `usedCharacterReference` were correctly populated.
    - Child identity consistency was maintained across 4 pages.
- **Result:** **EFFECTIVE**. The IMG-002 mitigation is functionally working in the current production environment.

## 5. Ongoing Monitoring
This protocol should be executed whenever:
1.  New fixed templates are added to the library.
2.  The underlying image generation model (e.g., FLUX) is updated.
3.  Changes are made to the `buildImagePrompt` logic in `prompt-builder.ts`.

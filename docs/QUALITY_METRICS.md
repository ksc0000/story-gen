# Quality Metrics

Purpose: define reviewable quality metrics for Phase 2 Story & Illustration Quality.

This document is designed to work first as a human review rubric, then later as the baseline for automated LLM evaluation and Admin Review UI scoring.

Related:

- [Product Roadmap](./PRODUCT_ROADMAP.md)
- [Production Smoke Checklist](./PRODUCTION_SMOKE_CHECKLIST.md)

---

## 1. Overview

Phase 2 quality work has two primary scores:

| Score | Max | Scope |
|---|---:|---|
| Story Quality Score | 100 | Text, structure, personalization, pacing, read-aloud experience |
| Illustration Quality Score | 100 | Generated images, prompts, visual consistency, composition, child friendliness |

Both scores should support:

- human review
- future LLM auto review
- Admin Review UI input
- axis-level analytics
- quality trend tracking
- rewrite / regeneration recommendation

---

## 2. Story Quality Score

Story Quality Score is a 100-point score that measures whether a generated picture book feels personal, coherent, age-appropriate, emotionally satisfying, readable aloud, and complete as a book experience.

The score should be calculated per book. Page-level observations may be recorded as review notes, but the final score represents the overall user-facing story quality.

### 2.1 Story scoring axes

| Axis | Points | What it measures |
|---|---:|---|
| Child personalization | 15 | Whether the story reflects the child profile, preferences, name, traits, and context in a meaningful way. |
| Story coherence | 18 | Whether the story has a clear beginning, development, ending, goal, and causal flow. |
| Age appropriateness | 15 | Whether vocabulary, sentence length, concept difficulty, emotional intensity, and reading load match the target age band. |
| Emotional satisfaction | 14 | Whether the story creates warmth, delight, reassurance, achievement, or a memorable parent-child reading moment. |
| Page length balance | 10 | Whether page text lengths are balanced and suitable for picture book pacing. |
| Character consistency | 12 | Whether recurring characters, relationships, traits, and story roles remain consistent across pages. |
| Reading flow / pacing | 8 | Whether the book works smoothly for read-aloud use and page transitions feel natural. |
| Opening / cover flow | 8 | Whether the book has a proper entry point, cover/title expectation, and does not start abruptly. |
| **Total** | **100** |  |

---

### 2.2 Child personalization — 15 points

| Score | Criteria |
|---:|---|
| 13-15 | The child feels clearly represented. Name, traits, interests, family context, or preferences are naturally woven into the story without feeling pasted on. |
| 9-12 | Some personalization is present, but it is shallow or appears only in isolated places. |
| 5-8 | Personalization is mostly generic. The child could be replaced with another child with little change. |
| 0-4 | Personalization is missing, contradictory, or inappropriate for the supplied profile. |

Review notes:

- Check whether personalization affects the story, not just the title or first sentence.
- Avoid overusing profile facts mechanically.
- A good story should feel like it was made for this child, not merely addressed to this child.

---

### 2.3 Story coherence — 18 points

| Score | Criteria |
|---:|---|
| 16-18 | The book has a clear setup, progression, resolution, and emotional or narrative payoff. Each page connects naturally to the next. |
| 12-15 | The story mostly makes sense, but one or two transitions are weak, abrupt, or underexplained. |
| 7-11 | The story has recognizable events, but the goal, conflict, sequence, or ending is vague. |
| 0-6 | The story feels random, contradictory, incomplete, or lacks a meaningful ending. |

Review notes:

- `storyGoal` should remain visible throughout the book.
- `hiddenDetail` and `visualMotif` should support the story, not become distracting side quests.
- The final page should usually provide closure, discovery, achievement, or emotional reassurance.

---

### 2.4 Age appropriateness — 15 points

| Score | Criteria |
|---:|---|
| 13-15 | Vocabulary, sentence length, concept complexity, and emotional tone fit the target age band. |
| 9-12 | Mostly age-appropriate, but some sentences are too abstract, too long, too childish, or too complex. |
| 5-8 | Frequently mismatched to the age band. Reading aloud may feel awkward or the meaning may be hard to follow. |
| 0-4 | Clearly unsuitable for the target age due to complexity, fear, safety, maturity, or oversimplification. |

Review notes:

- Younger children need concrete actions, clear feelings, repetition, and simple cause-effect.
- Older children need more meaning density: place, action, emotion, discovery, choice, or consequence.
- Avoid babyish nonsense words for older age bands unless intentionally used and still natural.

---

### 2.5 Emotional satisfaction — 14 points

| Score | Criteria |
|---:|---|
| 12-14 | The book leaves a warm, happy, reassuring, exciting, or proud feeling. It gives the parent and child a reason to remember or reread it. |
| 8-11 | Emotion is positive but somewhat flat, predictable, or not fully earned. |
| 4-7 | The story is readable but emotionally thin. It reports events more than it creates a feeling. |
| 0-3 | The story feels cold, confusing, scary, disappointing, or emotionally inappropriate. |

Review notes:

- Emotional satisfaction does not require drama; small discoveries can work well.
- The ending should feel like a gift to the child or parent.
- Avoid moralizing too hard. Picture books should charm first, lecture second.

---

### 2.6 Page length balance — 10 points

| Score | Criteria |
|---:|---|
| 9-10 | Page text lengths are balanced, readable aloud, and appropriate for the book format. |
| 7-8 | Mostly balanced, with minor unevenness. |
| 4-6 | One or more pages are too short, too long, or rhythmically awkward. |
| 0-3 | Page lengths are severely uneven or unsuitable for picture book pacing. |

Review notes:

- Each page should carry a meaningful beat.
- Avoid one page doing all the narrative work while others become filler.
- For 4-page books, each page should usually have one clear visual/narrative purpose.

---

### 2.7 Character consistency — 12 points

| Score | Criteria |
|---:|---|
| 10-12 | Main character, companion characters, traits, relationships, and roles are consistent across all pages. |
| 7-9 | Mostly consistent, with minor drift in role, naming, traits, or focus. |
| 4-6 | Noticeable inconsistency, such as changing traits, unclear relationships, or extra unplanned characters. |
| 0-3 | Major inconsistency, duplicated protagonist, missing main character, or contradictory character behavior. |

Review notes:

- `storyCast`, `appearingCharacterIds`, and `focusCharacterId` should match the actual page story.
- Extra characters should not appear unless the story requires them.
- For premium quality, approved/reference character images should be respected by prompt design.

---

### 2.8 Reading flow / pacing — 8 points

| Score | Criteria |
|---:|---|
| 7-8 | The story reads smoothly aloud. Page transitions feel natural and do not interrupt the read-aloud rhythm. |
| 5-6 | Mostly readable, but one or two pages feel abrupt, too dense, or too thin. |
| 2-4 | Read-aloud pacing is uneven. The reader may need to pause or explain transitions. |
| 0-1 | The book is awkward to read aloud and page progression feels broken. |

Review notes:

- This axis captures the feedback that page navigation should feel like a slide/swipe experience, not a repeated hard button interruption.
- The story text should support smooth reading even before UI improvements are implemented.
- Future UX should support swipe / slide navigation, animated page transitions, and read-aloud mode.

---

### 2.9 Opening / cover flow — 8 points

| Score | Criteria |
|---:|---|
| 7-8 | The book has a clear title/cover expectation and a gentle opening that prepares the reader for the story. |
| 5-6 | The opening is understandable, but it could better establish mood, title, setting, or read-aloud entry. |
| 2-4 | The story starts abruptly or feels like it begins in the middle. |
| 0-1 | There is no meaningful entry point; the book is not suitable for read-aloud use without extra explanation. |

Review notes:

- This axis captures the feedback that no cover page makes the story feel like it starts too suddenly.
- Future implementation should include cover page generation, title page support, and opening narration flow.
- A picture book should feel like a book before it becomes a sequence of pages.

---

## 3. Illustration Quality Score

Illustration Quality Score is a 100-point score that measures whether generated illustrations are visually coherent, child-friendly, emotionally readable, style-consistent, and aligned with the story and prompts.

The score should be calculated per book, using page-level image observations as supporting notes.

### 3.1 Illustration scoring axes

| Axis | Points | What it measures |
|---|---:|---|
| Character visual consistency | 20 | Whether the protagonist and companion characters remain visually consistent across pages. |
| Prompt-to-image alignment | 15 | Whether generated images match the page prompt, story beat, and intended visual role. |
| Composition / framing | 15 | Whether each image has clear subject placement, readable framing, and appropriate visual focus. |
| Style consistency | 15 | Whether the whole book feels like one illustrated work with consistent art direction. |
| Emotional expression | 10 | Whether character expressions and body language communicate the intended emotion. |
| Scene clarity | 10 | Whether the reader can understand what is happening without confusion. |
| Child friendliness / safety | 10 | Whether the image is safe, warm, non-frightening, and appropriate for children. |
| Text-safe layout | 5 | Whether the image leaves room for app-rendered text and avoids text-in-image problems. |
| **Total** | **100** |  |

---

### 3.2 Character visual consistency — 20 points

| Score | Criteria |
|---:|---|
| 17-20 | Characters look consistently like the same individuals across pages. Key traits, proportions, outfit cues, and companion identity remain stable. |
| 12-16 | Mostly consistent, with minor drift in face, outfit, age, or species. |
| 6-11 | Noticeable drift. The same character may look significantly different on multiple pages. |
| 0-5 | Major visual inconsistency, duplicated protagonist, missing character, or wrong species/age. |

---

### 3.3 Prompt-to-image alignment — 15 points

| Score | Criteria |
|---:|---|
| 13-15 | Image clearly follows the page prompt, page role, story beat, characters, setting, and mood. |
| 9-12 | Mostly aligned, but some details are missing or weak. |
| 5-8 | Partial alignment; the image captures general mood but misses important story details. |
| 0-4 | Image does not match the page content or prompt. |

---

### 3.4 Composition / framing — 15 points

| Score | Criteria |
|---:|---|
| 13-15 | Clear focal point, good framing, readable character placement, and strong visual hierarchy. |
| 9-12 | Generally readable, but composition could be stronger. |
| 5-8 | Cluttered, distant, cropped awkwardly, or unclear subject hierarchy. |
| 0-4 | Composition makes the scene hard to understand. |

---

### 3.5 Style consistency — 15 points

| Score | Criteria |
|---:|---|
| 13-15 | All pages feel like one coherent picture book with stable art direction and styleBible adherence. |
| 9-12 | Mostly consistent, with minor color, texture, or rendering drift. |
| 5-8 | Noticeable style drift between pages. |
| 0-4 | Pages feel like different books or different models/styles. |

---

### 3.6 Emotional expression — 10 points

| Score | Criteria |
|---:|---|
| 9-10 | Expressions and body language clearly support the page emotion. |
| 7-8 | Emotion is readable but not especially strong. |
| 4-6 | Emotion is weak, stiff, or partially mismatched. |
| 0-3 | Emotion is missing, confusing, or contradictory. |

---

### 3.7 Scene clarity — 10 points

| Score | Criteria |
|---:|---|
| 9-10 | The reader can quickly understand who is present, where they are, and what is happening. |
| 7-8 | Mostly clear, with minor ambiguity. |
| 4-6 | Important scene details are hard to understand. |
| 0-3 | Scene is confusing or visually incoherent. |

---

### 3.8 Child friendliness / safety — 10 points

| Score | Criteria |
|---:|---|
| 9-10 | Warm, safe, age-appropriate, non-frightening, and suitable for bedtime/read-aloud use. |
| 7-8 | Generally safe, with minor intensity or mood issues. |
| 4-6 | Some elements may feel too strange, intense, or unsettling for young children. |
| 0-3 | Unsafe, frightening, inappropriate, or unsuitable for children. |

---

### 3.9 Text-safe layout — 5 points

| Score | Criteria |
|---:|---|
| 5 | Image supports app-rendered text overlays and avoids generated text artifacts. |
| 3-4 | Mostly safe, but may crowd text areas or include minor artifacts. |
| 1-2 | Text overlay would likely obscure important visual content. |
| 0 | Image contains problematic generated text or unusable layout. |

Review notes:

- Repeated phrases should remain app-rendered, not drawn into the image.
- Text-safe composition matters for mobile reading UX.

---

## 4. Quality thresholds by plan

| Plan | Story minimum | Story strong | Illustration minimum | Illustration strong | Notes |
|---|---:|---:|---:|---:|---|
| free | 70 | 78 | 70 | 78 | Readable and pleasant, but can be simpler and less personalized. |
| paid | 80 | 88 | 80 | 88 | Commercially acceptable and reliably personalized. Main MVP sales quality bar. |
| premium | 88 | 94 | 88 | 94 | Highly personalized, polished, emotionally satisfying, and visually consistent. |

### Blocking guidance

| Score range | Decision |
|---:|---|
| 90-100 | Excellent. Suitable for premium examples and showcase candidates. |
| 80-89 | Good. Suitable for paid release unless there is a serious safety or consistency issue. |
| 70-79 | Acceptable for free or draft quality. Needs improvement before paid positioning. |
| 60-69 | Weak. Should trigger rewrite, prompt repair, or targeted regeneration before user delivery when possible. |
| 0-59 | Fail. Should be regenerated, rewritten, or blocked from paid delivery. |

Safety and privacy issues are hard blockers even if the numerical score is high.

---

## 5. Relationship to admin review scores

Existing admin review fields are narrower, human-entered quality signals:

- `adminTextQualityScore`
- `adminImageQualityScore`
- `adminCharacterConsistencyScore`

Story Quality Score and Illustration Quality Score should not replace these fields immediately. They should add an actionable, axis-level layer for analysis and future auto review.

### Mapping

| Quality axis | Related admin review score |
|---|---|
| Story: Child personalization | `adminTextQualityScore` |
| Story: Story coherence | `adminTextQualityScore` |
| Story: Age appropriateness | `adminTextQualityScore` |
| Story: Emotional satisfaction | `adminTextQualityScore` |
| Story: Page length balance | `adminTextQualityScore` |
| Story: Character consistency | `adminCharacterConsistencyScore` |
| Story: Reading flow / pacing | `adminTextQualityScore` |
| Story: Opening / cover flow | `adminTextQualityScore` |
| Illustration: Character visual consistency | `adminImageQualityScore` and `adminCharacterConsistencyScore` |
| Illustration: Prompt-to-image alignment | `adminImageQualityScore` |
| Illustration: Composition / framing | `adminImageQualityScore` |
| Illustration: Style consistency | `adminImageQualityScore` |
| Illustration: Child friendliness / safety | `adminImageQualityScore` |

### Recommended transition

1. Continue collecting current admin review scores.
2. Add Story Quality Score and Illustration Quality Score as detailed review layers.
3. Store axis-level scores separately when implementation begins.
4. Use current admin review scores as quick human sentiment indicators.
5. Use detailed quality scores for root-cause analysis and automated evaluation.

---

## 6. Admin Review UI field design

Future `/admin/book-quality-review` should support both human and LLM-based review fields.

### Proposed storage shape

```ts
qualityReview: {
  storyQualityScore: number;
  illustrationQualityScore: number;
  overallQualityScore?: number;
  qualityRubricVersion: string;

  storyAxes: {
    childPersonalization: number;
    storyCoherence: number;
    ageAppropriateness: number;
    emotionalSatisfaction: number;
    pageLengthBalance: number;
    characterConsistency: number;
    readingFlowPacing: number;
    openingCoverFlow: number;
  };

  illustrationAxes: {
    characterVisualConsistency: number;
    promptToImageAlignment: number;
    compositionFraming: number;
    styleConsistency: number;
    emotionalExpression: number;
    sceneClarity: number;
    childFriendlinessSafety: number;
    textSafeLayout: number;
  };

  reviewerType: 'human' | 'llm';
  reviewerId?: string;
  reviewerModel?: string;
  reviewedAtMs: number;
  confidence?: number;
  notes?: string;
  recommendedActions?: Array<
    | 'rewrite_story'
    | 'repair_prompt'
    | 'regenerate_images'
    | 'fix_character_reference'
    | 'add_cover_page'
    | 'improve_reading_ux'
    | 'human_review_required'
  >;
}
```

### Admin UI expectations

- Show total Story Quality Score and Illustration Quality Score.
- Show axis-level bars or numeric controls.
- Allow reviewer notes per book.
- Allow filtering by low score axes.
- Allow comparison between human and LLM review.
- Preserve existing admin review fields during transition.

---

## 7. Human review and future LLM evaluation

This rubric is intentionally written so that both humans and an evaluator LLM can apply it.

### Human review usage

- Review one completed book at a time.
- Score story and illustration separately.
- Score each axis independently.
- Add short notes for scores below 70% of the axis maximum.
- Record the top 1-3 improvement reasons.
- Do not rely only on gut feel; choose the closest rubric band.

### Future automated LLM evaluation input

A future evaluator LLM should receive:

- child profile summary
- selected plan / quality mode
- story JSON
- page text
- page prompts
- storyQualityReport
- cast metadata
- target age band
- generated image metadata when available
- generated image URLs or descriptions when image review is available
- optional admin feedback

### Future automated LLM evaluation output

The evaluator should return:

```ts
interface AutoQualityReviewResult {
  storyQualityScore: number;
  illustrationQualityScore: number;
  storyAxes: Record<string, number>;
  illustrationAxes: Record<string, number>;
  confidence: number;
  rationale: string;
  axisFeedback: Array<{
    axis: string;
    score: number;
    maxScore: number;
    feedback: string;
    severity: 'info' | 'minor' | 'major' | 'blocker';
  }>;
  recommendedActions: string[];
  humanReviewRequired: boolean;
}
```

### Guardrails for LLM evaluation

- LLM score should assist, not silently override, human admin judgement.
- Low confidence or contradictory evaluations should be flagged for human review.
- Safety and privacy issues should be handled as hard blockers outside the normal 100-point quality score.
- LLM image review should not be treated as authoritative until validated against human review.

---

## 8. Phase 2 backlog

Initial backlog items for Story & Illustration Quality:

- [ ] Add Story Quality Score fields to the book quality review data model.
- [ ] Add Illustration Quality Score fields to the book quality review data model.
- [ ] Add axis-level Story Quality Score input controls to the Admin Review UI.
- [ ] Add axis-level Illustration Quality Score input controls to the Admin Review UI.
- [ ] Show total Story / Illustration Quality Scores and axis breakdowns in the Admin Review UI.
- [ ] Add score-based filtering for low-quality books in admin review.
- [ ] Add quality trend aggregation by plan: free / paid / premium.
- [ ] Add age-band-specific text length validation and warnings.
- [ ] Add story coherence checks for setup, progression, resolution, and `storyGoal` continuity.
- [ ] Add child personalization depth checks beyond name insertion.
- [ ] Add character consistency warnings for cast drift, duplicated protagonist, and unexpected extra characters.
- [ ] Add illustration prompt quality checks for visual specificity, style alignment, text-in-image risk, and page role variation.
- [ ] Add illustration quality checks for character visual consistency, composition, scene clarity, and style consistency.
- [ ] Add rewrite recommendations based on the weakest story scoring axes.
- [ ] Add prompt repair / image regeneration recommendations based on the weakest illustration scoring axes.
- [ ] Prototype LLM-based evaluator using this rubric and compare it with human admin review scores.
- [ ] Add cover page generation to avoid abrupt story starts.
- [ ] Add title page / opening flow support for read-aloud use.
- [ ] Add swipe / slide page navigation for smoother reading UX.
- [ ] Add animated page transition and read-aloud mode considerations to the reader UI backlog.

---

## 9. Future UX considerations

These are not implemented in this documentation change, but they should be treated as Phase 2 / Phase 6 backlog items.

### Swipe / slide navigation

Current issue:

- Users must press a button every time they move to the next page.
- This can interrupt read-aloud rhythm.
- It feels more like a form flow than a picture book.

Future direction:

- Swipe-based page navigation.
- Slide animation between pages.
- Keyboard / touch / button fallback for accessibility.
- Optional read-aloud mode with less UI interruption.

### Cover page / opening flow

Current issue:

- The book starts directly with story content.
- There is no cover/title moment.
- This makes the experience less suitable for read-aloud use.

Future direction:

- Dedicated cover page generation.
- Title page or title spread support.
- Opening narration page or gentle first-page setup.
- Story Quality Score should penalize abrupt starts until this is improved.

---

## 10. Phase 2 completion signal

Phase 2 quality work should be considered healthy when:

- paid books consistently score >= 80 for both Story and Illustration Quality.
- premium books consistently score >= 88 for both Story and Illustration Quality.
- `adminTextQualityScore` average is >= 4.0.
- `adminImageQualityScore` average is >= 4.0.
- `adminCharacterConsistencyScore` average is >= 4.0.
- low-score root causes are visible in admin analytics.
- the team can identify whether a quality problem is caused by story generation, prompt generation, illustration generation, character consistency, or reading UX.

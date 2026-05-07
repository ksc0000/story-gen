# Quality Metrics

Purpose: define a reviewable Story Quality Score for Phase 2 Story & Illustration Quality.

This document is designed to work first as a human review rubric, then later as the baseline for automated LLM evaluation.

---

## 1. Story Quality Score

Story Quality Score is a 100-point score that measures whether a generated picture book feels personal, coherent, age-appropriate, emotionally satisfying, readable, visually consistent, and ready for illustration.

The score should be calculated per book, not per page. Page-level observations may be recorded as review notes, but the final score represents the overall user-facing quality of the book.

---

## 2. Scoring axes

| Axis | Points | What it measures |
|---|---:|---|
| Child personalization | 15 | Whether the story reflects the child profile, preferences, name, traits, and context in a meaningful way. |
| Story coherence | 20 | Whether the story has a clear beginning, development, ending, goal, and causal flow. |
| Age appropriateness | 15 | Whether vocabulary, sentence length, concept difficulty, emotional intensity, and reading load match the target age band. |
| Emotional satisfaction | 15 | Whether the story creates warmth, delight, reassurance, achievement, or a memorable parent-child reading moment. |
| Page length balance | 10 | Whether page text lengths are balanced and suitable for picture book pacing. |
| Character consistency | 15 | Whether recurring characters, relationships, traits, and visual/story roles remain consistent across pages. |
| Illustration prompt quality | 10 | Whether prompts are specific, visual, safe, style-aligned, and useful for high-quality illustration generation. |
| **Total** | **100** |  |

---

## 3. Rubric details

### 3.1 Child personalization — 15 points

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

### 3.2 Story coherence — 20 points

| Score | Criteria |
|---:|---|
| 17-20 | The book has a clear setup, progression, resolution, and emotional or narrative payoff. Each page connects naturally to the next. |
| 13-16 | The story mostly makes sense, but one or two transitions are weak, abrupt, or underexplained. |
| 8-12 | The story has recognizable events, but the goal, conflict, sequence, or ending is vague. |
| 0-7 | The story feels random, contradictory, incomplete, or lacks a meaningful ending. |

Review notes:

- `storyGoal` should remain visible throughout the book.
- `hiddenDetail` and `visualMotif` should support the story, not become distracting side quests.
- Page 4 should usually provide closure, discovery, achievement, or emotional reassurance.

### 3.3 Age appropriateness — 15 points

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

### 3.4 Emotional satisfaction — 15 points

| Score | Criteria |
|---:|---|
| 13-15 | The book leaves a warm, happy, reassuring, exciting, or proud feeling. It gives the parent and child a reason to remember or reread it. |
| 9-12 | Emotion is positive but somewhat flat, predictable, or not fully earned. |
| 5-8 | The story is readable but emotionally thin. It reports events more than it creates a feeling. |
| 0-4 | The story feels cold, confusing, scary, disappointing, or emotionally inappropriate. |

Review notes:

- Emotional satisfaction does not require drama; small discoveries can work well.
- The ending should feel like a gift to the child or parent.
- Avoid moralizing too hard. Picture books should charm first, lecture second — ideally not with a megaphone.

### 3.5 Page length balance — 10 points

| Score | Criteria |
|---:|---|
| 9-10 | Page text lengths are balanced, readable aloud, and appropriate for a 4-page picture book. |
| 7-8 | Mostly balanced, with minor unevenness. |
| 4-6 | One or more pages are too short, too long, or rhythmically awkward. |
| 0-3 | Page lengths are severely uneven or unsuitable for picture book pacing. |

Review notes:

- Each page should carry a meaningful beat.
- Avoid one page doing all the narrative work while others become filler.
- For 4-page books, each page should usually have one clear visual/narrative purpose.

### 3.6 Character consistency — 15 points

| Score | Criteria |
|---:|---|
| 13-15 | Main character, companion characters, traits, relationships, and roles are consistent across all pages. |
| 9-12 | Mostly consistent, with minor drift in role, naming, traits, or focus. |
| 5-8 | Noticeable inconsistency, such as changing traits, unclear relationships, or extra unplanned characters. |
| 0-4 | Major inconsistency, duplicated protagonist, missing main character, or contradictory character behavior. |

Review notes:

- `storyCast`, `appearingCharacterIds`, and `focusCharacterId` should match the actual page story.
- Extra characters should not appear unless the story requires them.
- For premium quality, approved/reference character images should be respected by prompt design.

### 3.7 Illustration prompt quality — 10 points

| Score | Criteria |
|---:|---|
| 9-10 | Prompts are visually specific, safe, style-aligned, character-aware, and likely to produce coherent illustrations. |
| 7-8 | Prompts are usable but could be more specific about composition, character, setting, or mood. |
| 4-6 | Prompts are vague, text-heavy, inconsistent, or missing key visual details. |
| 0-3 | Prompts are likely to generate poor, unsafe, inconsistent, or off-style images. |

Review notes:

- Prompts should describe what to draw, not explain the whole story abstractly.
- Page visual roles should create variation across pages.
- Repeated phrases should remain app-rendered text, not image text.

---

## 4. Quality thresholds by plan

| Plan | Minimum target | Strong target | Notes |
|---|---:|---:|---|
| free | 70 | 78 | Should be readable and pleasant, but can be simpler and less personalized. Used as acquisition quality. |
| paid | 80 | 88 | Should feel commercially acceptable and reliably personalized. This is the main MVP sales quality bar. |
| premium | 88 | 94 | Should feel highly personalized, polished, emotionally satisfying, and visually consistent. |

### Blocking guidance

| Score range | Decision |
|---:|---|
| 90-100 | Excellent. Suitable for premium examples and showcase candidates. |
| 80-89 | Good. Suitable for paid release unless there is a serious safety or consistency issue. |
| 70-79 | Acceptable for free or draft quality. Needs improvement before paid positioning. |
| 60-69 | Weak. Should trigger rewrite or targeted repair before user delivery when possible. |
| 0-59 | Fail. Should be regenerated, rewritten, or blocked from paid delivery. |

---

## 5. Relationship to admin review scores

Existing admin review fields are narrower, human-entered quality signals:

- `adminTextQualityScore`
- `adminImageQualityScore`
- `adminCharacterConsistencyScore`

Story Quality Score should not replace these fields immediately. Instead, it should aggregate the same review intent into a more actionable rubric.

### Mapping

| Story Quality Score axis | Related admin review score |
|---|---|
| Child personalization | `adminTextQualityScore` |
| Story coherence | `adminTextQualityScore` |
| Age appropriateness | `adminTextQualityScore` |
| Emotional satisfaction | `adminTextQualityScore` |
| Page length balance | `adminTextQualityScore` |
| Character consistency | `adminCharacterConsistencyScore` |
| Illustration prompt quality | `adminImageQualityScore` and `adminCharacterConsistencyScore` |

### Recommended transition

1. Continue collecting current admin review scores.
2. Add Story Quality Score as a detailed review layer in admin workflows.
3. Store axis-level scores separately when implementation begins.
4. Use admin review scores as quick human sentiment indicators.
5. Use Story Quality Score for root-cause analysis and automated evaluation.

Proposed future storage shape:

```ts
storyQualityScore: {
  total: number;
  childPersonalization: number;
  storyCoherence: number;
  ageAppropriateness: number;
  emotionalSatisfaction: number;
  pageLengthBalance: number;
  characterConsistency: number;
  illustrationPromptQuality: number;
  reviewerType: 'human' | 'llm';
  reviewerId?: string;
  reviewedAt: Timestamp;
  notes?: string;
}
```

---

## 6. Human review and future LLM evaluation

This rubric is intentionally written so that both humans and an evaluator LLM can apply it.

### Human review usage

- Review one completed book at a time.
- Score each axis independently.
- Add short notes for scores below 70% of the axis maximum.
- Record the top 1-3 improvement reasons.
- Do not rely only on gut feel; choose the closest rubric band.

### Future automated LLM evaluation usage

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
- optional admin feedback

The evaluator should return:

- total score
- axis-level scores
- short rationale per axis
- severity labels
- suggested repair actions
- whether rewrite is recommended

### Guardrails for LLM evaluation

- LLM score should assist, not silently override, human admin judgement.
- Low confidence or contradictory evaluations should be flagged for human review.
- Safety and privacy issues should be handled as hard blockers outside the normal 100-point quality score.

---

## 7. Phase 2 backlog

Initial backlog items for Story & Illustration Quality:

- [ ] Add Story Quality Score fields to the book quality review data model.
- [ ] Add axis-level Story Quality Score input controls to the Admin Review UI.
- [ ] Show total Story Quality Score and axis breakdown in the Admin Review UI.
- [ ] Add score-based filtering for low-quality books in admin review.
- [ ] Add quality trend aggregation by plan: free / paid / premium.
- [ ] Add age-band-specific text length validation and warnings.
- [ ] Add story coherence checks for setup, progression, resolution, and `storyGoal` continuity.
- [ ] Add child personalization depth checks beyond name insertion.
- [ ] Add character consistency warnings for cast drift, duplicated protagonist, and unexpected extra characters.
- [ ] Add illustration prompt quality checks for visual specificity, style alignment, text-in-image risk, and page role variation.
- [ ] Add rewrite recommendations based on the weakest scoring axes.
- [ ] Prototype LLM-based evaluator using this rubric and compare it with human admin review scores.

---

## 8. Phase 2 completion signal

Phase 2 quality work should be considered healthy when:

- paid books consistently score >= 80
- premium books consistently score >= 88
- `adminTextQualityScore` average is >= 4.0
- `adminImageQualityScore` average is >= 4.0
- `adminCharacterConsistencyScore` average is >= 4.0
- low-score root causes are visible in admin analytics
- the team can identify whether a quality problem is caused by story generation, prompt generation, illustration generation, or character consistency

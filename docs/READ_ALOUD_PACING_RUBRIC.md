# Read-Aloud Pacing Quality Rubric & Prompt Engineering Plan

## 1. Overview: What is Read-Aloud Pacing Quality?

Read-Aloud Pacing Quality refers to the rhythmic flow, narrative momentum, and structural balance of a storybook designed to be read aloud by a parent to a child. High-quality pacing ensures that the listener remains engaged, the reader finds a natural breath and cadence, and the transition between pages feels like a continuous journey rather than a series of disconnected snapshots.

In the context of EhonAI, "Good Pacing" means:
- The story doesn't jump abruptly between scenes.
- Each page offers a "reason to turn the page" (momentum).
- The language is rhythmic and easy to articulate.
- The climax and resolution are given appropriate weight.

---

## 2. Read-Aloud Pacing Quality Rubric (1-5)

The overall score reflects the cohesion and rhythm of the read-aloud experience.

| Score | Rating | Description |
|---|---|---|
| 5 | Masterpiece Pacing | Perfect rhythm and flow. Natural pauses, rhythmic phrasing, and seamless transitions make it a joy to read aloud. The child is hooked from start to finish. |
| 4 | Solid Flow | Good narrative momentum. Transitions are logical, and the rhythm is mostly consistent with only minor hitches. |
| 3 | Functional | Understandable progression, but may feel slightly mechanical or have one or two "abrupt" transitions. Rhythm is standard. |
| 2 | Uneven Pacing | Significant issues with flow. Some pages feel too rushed while others drag. Transitions between pages feel disconnected or jarring. |
| 1 | Incoherent/Jarring | Fails as a read-aloud story. No sense of rhythm, abrupt jumps that confuse the listener, or text that is difficult to read aloud. |

---

## 3. Evaluation Axes

### A. Narrative Flow & Transitions (起承転結のつながり)
- **High**: Each page ends with a "hook" or a logical bridge to the next. The transition (e.g., "Then...", "Suddenly...", "But...") feels natural.
- **Low**: Pages feel like isolated events. The listener asks "Wait, how did we get here?"

### B. Story Beat Distribution (展開の配分)
- **High**: Action, Discovery, and Emotion are spread across the book. The climax occurs at the right moment (usually 2/3 or 3/4 through) and the resolution isn't rushed.
- **Low**: All the action happens on one page, or the resolution is condensed into the very last sentence without breathing room.

### C. Read-Aloud Rhythm & Phrasing (読み聞かせのリズム・口調)
- **High**: Sentences have a varied but rhythmic length. Use of onomatopoeia (擬音・擬態語) is evocative and aids the oral performance. Phrasing follows natural breath patterns.
- **Low**: Sentences are either all the same length (monotonous) or overly complex/technical. Difficult to read without stumbling.

### D. Age-Appropriate Engagement (対象年齢への適合性)
- **High**: Pace matches the child's attention span. 0-2y: simple, rhythmic, repetitive. 3-4y: discovery-focused, clear causality. 5-6y: emotional depth and "why" elements.
- **Low**: Too much text for a toddler, or too simplistic/boring for an older child.

---

## 4. Illustrative Examples

### Good Pacing (Score 5)
> **Page 1**: "It was a sunny day. Hana put on her red boots. *Clomp, clomp!* Where was she going?" (Hook)
> **Page 2**: "She went to the big oak tree. There, she found a tiny, shimmering door. 'Oh!' Hana whispered." (Discovery + Suspense)
> **Page 3**: "Slowly, she opened it. Inside was a forest made of candy! Her eyes grew wide with joy." (Climax/Payoff)
> **Page 4**: "Hana took one sweet berry and headed home. The sun set, painting the sky pink. 'What a sweet day,' she thought as she drifted to sleep." (Quiet Ending + Reflection)

### Poor Pacing (Score 2)
> **Page 1**: "Hana is 3 years old. She likes red. She is in the park." (Staccato/Monotonous)
> **Page 2**: "Suddenly she is in a candy forest. She found a star." (Abrupt jump/No transition)
> **Page 3**: "The forest is big. She is happy. She goes home now." (Rushed resolution)
> **Page 4**: "She is sleeping. The end." (Abrupt stop)

---

## 5. Prompt Engineering Plan

To improve pacing, we will refine the system prompts in `functions/src/lib/prompt-builder.ts` according to these strategies:

### 5.1. Enhancing Narrative Transitions
- **Constraint**: Mandate the use of "Bridge Phrases" at the beginning or end of pages to link them.
- **Examples**: 「すると...」「ところが...」「もっと よく みてみると...」「さあ、つぎは...」
- **Action**: Update `JAPANESE_STORY_TEXT_RULES` to emphasize logical connectivity.

### 5.2. Refining Page Role Dynamics
- **Constraint**: Ensure `opening_establishing` sets a baseline that is specifically disrupted by `discovery` on Page 2.
- **Strategy**: In 4-page stories, enforce a "Set-up -> Discovery -> Action/Emotion -> Resolution" sequence.
- **Action**: Refine `PAGE_TEXT_ROLE_RULES` to include "Momentum Guidelines".

### 5.3. Rhythmic Phrasing Guidelines
- **Constraint**: For age 0-3, enforce "Call and Response" or "Rhythmic Repetition".
- **Constraint**: For age 4+, discourage "Noun-only endings" (体言止め) when they break the oral flow.
- **Action**: Add specific "Oral Rhythm Rules" to the Japanese text instructions.

### 5.4. Strategic Page-Turn Hooks
- **Instruction**: Ask the LLM to consider the physical act of "turning the page" in the narrative design.
- **Technique**: End Page 1 or 2 with a question or a "wondering" sentence to pull the reader forward.

### 5.5. Climax-to-Resolution Breathing Room
- **Instruction**: Ensure the "Payoff" page isn't just the final sentence.
- **Strategy**: In 8-page stories, use 2 pages for the climax/payoff to allow the emotional satisfaction to land.

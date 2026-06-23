# Analysis: hiddenDetail Dominance in Story Generation

## Context
The `hiddenDetail` is intended as a subtle, visual-only background element for children to discover. However, in some cases, the LLM overemphasizes this detail, making it a primary narrative element or even the main goal of the story, overshadowing the intended `storyGoal`.

## Examples of hiddenDetail Dominance

### Example 1: The Watermelon Diversion
- **storyGoal**: たっちゃんが、すなばで出会ったほしのこと一緒に、なくした星のかけらを探す (Tatchan looks for a lost star shard with a star child met in the sandbox)
- **hiddenDetail**: すいか模様の雲 (Watermelon-patterned cloud)
- **Issue**: Instead of focusing on the star shard, the story became about "searching for the watermelon in the sky."
- **Generated Narrative**:
    - Page 1: Tatchan is in the sandbox. He sees a watermelon cloud.
    - Page 2: He meets a star child. They look at the watermelon cloud together.
    - Page 3: They try to reach the watermelon cloud. "Is it sweet?" Tatchan wonders.
    - Page 4: They couldn't reach the cloud, but they found a real watermelon to eat. The star shard was never mentioned again.
- **Analysis**: The LLM treated `hiddenDetail` as a "prompt" for the next plot point rather than a static background element.

### Example 2: The Bathroom Mouse
- **storyGoal**: はなちゃんが、一人で楽しく歯磨きができるようになる (Hana-chan learns to enjoy brushing her teeth by herself)
- **hiddenDetail**: 小さなネズミの置物 (A small mouse figurine)
- **Issue**: The mouse figurine became a living character that distracted Hana-chan from brushing her teeth for the entire story.
- **Generated Narrative**:
    - Page 1: Hana goes to the bathroom. She sees a mouse.
    - Page 2: The mouse starts dancing. Hana watches the mouse.
    - Page 3: Hana and the mouse play hide and seek in the bathroom.
    - Page 4: Hana is tired from playing. She brushes her teeth quickly and goes to bed.
- **Analysis**: The `hiddenDetail` was promoted to a `cast` member or a primary `Action` driver, violating the hierarchy where `storyGoal` should be the focus.

### Example 3: The Secret Squirrel
- **storyGoal**: けんくんが、公園で新しいお友達（人間）と仲良くなる (Ken-kun makes a new human friend at the park)
- **hiddenDetail**: 木の陰に隠れている小さなリス (A small squirrel hiding behind a tree)
- **Issue**: The squirrel became the primary "Action" target, leading Ken-kun away from the other children and preventing the `storyGoal` from being achieved.
- **Generated Narrative**:
    - Page 1: Ken arrives at the park. He sees many children.
    - Page 2: Ken notices a squirrel in a tree. He decides to follow it.
    - Page 3: Ken chases the squirrel to the back of the park, away from the playground.
    - Page 4: Ken says goodbye to the squirrel and goes home. He didn't talk to any other children.
- **Analysis**: The `hiddenDetail` acted as a "distractor" that pulled the narrative away from the intended social goal.

## Proposed Prompt Refinements

### 1. Strengthen Hierarchical Instructions in `STORY_GOAL_CONSISTENCY_RULES`
Add explicit instructions about the priority of `storyGoal` vs `hiddenDetail`.

### 2. Refine `hiddenDetail` Definition in `buildImagePrompt`
Clarify that it must not be mentioned in the text if it's purely visual.

### 3. Update `rewriteStoryText` Instructions
Reinforce the "visual-only" nature of `hiddenDetail` during the text refinement phase.

## Draft Changes

### `functions/src/lib/prompt-builder.ts`
- **Current**: `hiddenDetail や背景小物を、物語の主目的にしてはいけません。`
- **Proposed**: `hiddenDetail や背景小物を、物語の主目的や主要な行動のきっかけにしてはいけません。hiddenDetail は「そこにひっそりと存在する」だけのものであり、主人公がそれに反応したり、追いかけたり、セリフで言及したりすることは原則として禁止です。`

### `functions/src/lib/gemini.ts`
- **Current**: `hiddenDetail is for visual background fun only. Do not turn hiddenDetail into the main story goal.`
- **Proposed**: `hiddenDetail is strictly for visual background discovery. The characters must NOT interact with, talk about, or be distracted by the hiddenDetail. It must remain a passive element that only the reader notices. Do not mention the hiddenDetail in the story text (pages[].text).`

## Implementation Plan

1. **Update `functions/src/lib/prompt-builder.ts`**:
   - Refine `STORY_GOAL_CONSISTENCY_RULES` to explicitly demote `hiddenDetail`.
2. **Update `functions/src/lib/gemini.ts`**:
   - Refine `rewriteStoryText` instructions to ensure `hiddenDetail` is excluded from the narrative text.
3. **Verify with Tests**:
   - Add a test case in `functions/test/story-quality.test.ts` that specifically checks for `hiddenDetail` in the text.
   - Run all relevant tests.

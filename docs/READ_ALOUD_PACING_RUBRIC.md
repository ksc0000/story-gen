# Read-Aloud Pacing Quality Rubric

This rubric defines the criteria for evaluating the story pacing and rhythm of generated books, specifically for a high-quality read-aloud experience.

## Scoring Criteria (1-5)

| Score | Rating | Description |
| :--- | :--- | :--- |
| 5 | **Excellent** | Exceptional flow and rhythm. Perfect balance of action and reflection. Transitions are seamless and enhance the narrative arc. Sentence lengths are varied to create a natural cadence. |
| 4 | **Good** | Strong narrative flow with clear progression. Good use of transition words. Rhythmic and easy to read aloud. Only minor improvements possible. |
| 3 | **Acceptable** | Generally flows well, but may have minor pacing issues (e.g., a bit rushed or slightly repetitive). Rhythm is mostly consistent but could be more dynamic. |
| 2 | **Poor** | Noticeable pacing issues. Abrupt transitions or monotonous sentence structures. Difficult to read aloud with a natural flow. |
| 1 | **Failing** | Very poor pacing. Sudden jumps in the story, disjointed sentences, or extreme repetitiveness. Not suitable for a read-aloud experience. |

## Evaluation Axes

### 1. Narrative Flow & Progression
- **Arc**: Does the story have a clear beginning (establishing), middle (discovery/action), and end (payoff/reflection)?
- **Transitions**: Are pages connected with natural Japanese connectives (e.g., 「すると」「でも」「やがて」「ところが」) for ages 5+?
- **Logic**: Does the progression feel natural and motivated by character actions or discoveries?

### 2. Beat Distribution
- **Page Content Balance**: Is the amount of information per page appropriate for the target age?
- **Role Consistency**: Does each page fulfill its assigned `pageVisualRole` (e.g., an `action` page should feel active, while a `quiet_ending` should feel peaceful)?
- **Density**: Avoid "thin" pages with too little content or "overcrowded" pages that rush the story.

### 3. Rhythm & Cadence
- **Sentence Variety**: Are sentence lengths varied to prevent a monotonous "staccato" feel?
- **Ending Variety**: Do sentence endings (語尾) avoid excessive repetition (e.g., avoiding three 「〜しました」 in a row)?
- **Spacing**: Is phrase-level spacing (分かち書き) used appropriately to help the reader find natural pauses, without breaking words unnaturally?
- **Sound & Mood**: For younger children (0-4), is there a pleasant use of onomatopoeia and rhythmic repetition?

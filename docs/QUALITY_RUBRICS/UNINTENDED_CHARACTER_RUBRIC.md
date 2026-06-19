# Unintended Character Rubric

## Purpose
This rubric is designed to detect and score the appearance of characters in illustrations that are not part of the defined story cast (`storyCast`) or the specific characters intended for a given page (`appearingCharacterIds`). It ensures that only the authorized characters appear in the story, preventing "hallucinated" companions or random extra people that detract from the narrative focus.

## Scoring Criteria (1-5)
The Unintended Character score is assigned based on the following levels:

| Score | Rating | Description |
|---|---|---|
| 5 | Perfect Control | Only the intended characters are present. No extra people, ghosts, or hallucinated companions appear. |
| 4 | Negligible Issue | Intended characters are present. A very subtle, non-human-like artifact might exist in the background that *could* be interpreted as a figure but doesn't distract. |
| 3 | Minor Distraction | An unintended background character or "crowd" figure appears where it wasn't requested, but it doesn't break the scene's logic. |
| 2 | Major Inconsistency | A character not in the `storyCast` appears prominently (e.g., a "hallucinated companion"), or a character explicitly excluded for this page appears. |
| 1 | Failure | "Character Duplication" (two of the same protagonist) or "Cast Overrun" (random strangers interacting with the protagonist as if they belong). |

## Detection Guidelines
Reviewers should use the following checks:
1. **Cast vs. Image Mismatch**: Compare the characters in the image against `appearingCharacterIds`.
2. **Character Duplication**: Check if the protagonist or a companion appears twice in the same frame (unless narratively justified, e.g., a mirror).
3. **Hallucinated Companions**: Watch for consistent "ghost" characters (like an extra dog or child) that follow the protagonist but aren't in the script.
4. **Contextual Noise**: Detect random people in scenes described as "lonely," "private," or "at home" where they shouldn't be.
5. **Prompt Bleed**: Check if elements from the `visualBible` or `styleBible` are being misinterpreted as extra characters.

## Examples

### Good (Score 5)
- A scene in a bedroom showing only the child and their teddy bear (the intended companion).
- A park scene where background people are blurred or non-existent, keeping focus on the cast.

### Poor (Score 1-2)
- **The Twin Glitch**: Two identical boys are shown playing with one ball.
- **The Mystery Friend**: A small brown dog appears in every outdoor scene, even though no dog was ever mentioned in the story or cast.
- **The Uninvited Guest**: A random adult is standing in the kitchen while the story text says "I was all alone at home."

## Relationship to Other Rubrics
- This rubric specifically targets **quantity and identity** of characters.
- For **visual stability** (hair, clothes) of intended characters, see [Character Consistency Rubric](../RUBRIC_CHARACTER_CONSISTENCY.md).
- For **overall artistic quality**, see [Illustration Quality Rubric](../RUBRIC_ILLUSTRATION_QUALITY.md).

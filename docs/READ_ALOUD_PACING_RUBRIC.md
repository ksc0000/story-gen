# Read-Aloud Pacing Quality Rubric and Prompt Engineering Plan

## 1. Overview
This document defines the quality standards for story text pacing and rhythm, specifically optimized for read-aloud functionality. It also outlines the prompt engineering strategies to ensure the LLM generates text that meets these standards.

## 2. Read-Aloud Pacing Quality Rubric (1-5 Scale)

| Score | Rating | Description |
|---|---|---|
| 5 | **Exceptional** | Perfect rhythm and flow. Varied sentence structures. Natural pauses. Highly engaging for children. |
| 4 | **Good** | Smooth flow with minor improvements possible. Good balance of short and long sentences. Natural for read-aloud. |
| 3 | **Average** | Functional but slightly repetitive or flat. Pacing is consistent but lacks emotional variety or "beats." |
| 2 | **Poor** | Repetitive sentence endings. Clunky transitions. Too many long or short sentences in a row. |
| 1 | **Unacceptable** | Jarring flow. Mid-word spacing artifacts. Incoherent rhythm. Not suitable for read-aloud. |

### 2.1. Key Evaluation Axes
- **Rhythmic Variety**: Alternating between short, punchy sentences and longer, descriptive clauses.
- **Narrative Beats**: Strategic use of pauses (punctuation) to emphasize emotional moments or discoveries.
- **Sentence Endings**: Diversity in Japanese sentence endings (avoiding continuous "〜ました").
- **Pronunciation Safety**: Avoiding complex kanji or ambiguous phrasing that might be misread by TTS.

## 3. Prompt Engineering Plan

### 3.1. Refinements to `JAPANESE_STORY_TEXT_RULES`
To improve pacing, the following instructions will be emphasized in `functions/src/lib/prompt-builder.ts`:
- **Explicit Rhythmic Guidance**: "Use a mix of short (4-10 chars) and medium (15-30 chars) sentences to create a natural storytelling rhythm."
- **Punctuation for Pacing**: "Use punctuation (、, 。) to create natural breathing points for a narrator."
- **Ending Diversity**: "Strictly avoid repeating the same sentence ending (e.g., 〜ました) more than twice in a row."

### 3.2. Refinements to `PAGE_TEXT_ROLE_RULES`
Tailoring pacing based on the `pageVisualRole`:
- **opening_establishing**: Slow, evocative pacing. Longer sentences to set the scene.
- **action**: Fast, energetic pacing. Shorter, more active sentences.
- **emotional_closeup**: Slow, thoughtful pacing. Emphasis on internal feelings.
- **payoff**: Bright, rhythmic pacing. Celebration and closure.

### 3.3. Quality Gate Heuristics
Update `functions/src/lib/story-quality.ts` to include:
- **Monotony Check**: Detect and flag three or more identical sentence endings.
- **Sentence Length Variance**: Flag pages where all sentences have nearly identical lengths.
- **Artifact Detection**: Improved detection for mid-word spacing or locale-mismatched text.

## 4. Implementation Steps
1. **Update `JAPANESE_STORY_TEXT_RULES`**: Inject new rhythmic and ending-diversity rules.
2. **Update `PAGE_TEXT_ROLE_RULES`**: Add pacing-specific guidance for each role.
3. **Enhance Heuristics**: Implement monotony and variance checks in `validateGeneratedStoryQuality`.
4. **Validation**: Run smoke tests across various age bands to ensure improved pacing.

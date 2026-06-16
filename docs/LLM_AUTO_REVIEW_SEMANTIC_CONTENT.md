# LLM Auto Review: Semantic Content Detection Strategy

## Overview
This document outlines the strategy for enhancing the LLM Auto Review system to assess the semantic richness of story text, particularly for books targeted at children aged 3 and above. The goal is to ensure that each page contains at least two of the four key semantic elements: Location (場所), Action (行動), Emotion (気持ち), and Discovery (発見).

## Semantic Elements Definition

### 1. 場所 (Location)
Indicates where the scene takes place or describes the environment. It sets the stage and helps the reader visualize the setting.
- **Examples**:
    - 「静かな森の奥深くに、小さなお家がありました。」 (Deep in a quiet forest, there was a small house.)
    - 「青い海の底で、お魚たちが泳いでいます。」 (At the bottom of the blue sea, fish are swimming.)
    - 「賑やかなお祭りの会場にやってきました。」 (We arrived at a lively festival venue.)

### 2. 行動 (Action)
Describes specific movements or activities performed by the characters. It gives the story momentum.
- **Examples**:
    - 「クマくんは、大きなお魚を一生懸命つり上げました。」 (Bear-kun worked hard to pull up a big fish.)
    - 「みんなで手をつないで、大きな円を作って踊ります。」 (Everyone holds hands and dances in a big circle.)
    - 「泥だらけになりながら、トンネルを掘り進めました。」 (While getting covered in mud, they dug the tunnel further.)

### 3. 気持ち (Emotion)
Describes the internal state, feelings, or reactions of the characters. It builds emotional connection.
- **Examples**:
    - 「初めての冒険に、心はワクワクでいっぱいです。」 (My heart is full of excitement for the first adventure.)
    - 「大切な宝物をなくして、とても悲しい気持ちになりました。」 (I felt very sad after losing a precious treasure.)
    - 「暗い夜道で、ちょっぴり心細くなってしまいました。」 (I felt a little lonely on the dark road at night.)

### 4. 発見 (Discovery)
Describes something new that the character notices, a realization, or a sudden change in the situation.
- **Examples**:
    - 「あ！草むらの中に、きらきら光る鍵を見つけたよ。」 (Oh! I found a sparkling key in the grass.)
    - 「空を見上げると、そこには大きな虹がかかっていました。」 (Looking up at the sky, there was a big rainbow.)
    - 「箱を開けてみると、中には不思議な地図が入っていました。」 (When I opened the box, there was a mysterious map inside.)

## Assessment Strategy

### LLM Prompting
The LLM will be instructed to analyze the `text` of each page and identify which of these four elements are present.
The LLM should categorize the content based on whether it explicitly mentions or strongly implies these elements.

### Gating Logic
The requirement for "at least two elements" primarily applies to books for ages 3 and above (`preschool_3_4`, `early_reader_5_6`, `early_elementary_7_8`, `general_child`). For `baby_toddler` (ages 0-2), simpler content is expected, and this strict check will be bypassed or treated as diagnostic only.

### JSON Output Structure
The LLM response schema will be extended to include `pageAssessments` under a new or existing field. To maintain backward compatibility and keep the structure clean, we will add it as part of the `LLMQualityReviewResult`.

```json
{
  "pageAssessments": [
    {
      "pageNumber": 1,
      "semanticContentDetectedElements": ["場所", "行動"],
      "hasSufficientSemanticContent": true
    }
  ]
}
```

### Flagging Issues
If `hasSufficientSemanticContent` is `false` for a page in a book targeted at age 3+:
- **Issue Type**: `insufficient_semantic_content` (categorized under `area: "story"`)
- **Severity**: `medium`
- **Message**: "ページに十分な意味内容（場所・行動・気持ち・発見のうち2つ以上）がありません。"

## Integration with Prompt Engineering
These results will be used to identify patterns where the story generation lacks detail. If many books fail this check, the story generation system prompt should be adjusted to encourage more descriptive content.

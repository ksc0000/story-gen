import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";
import type { Part } from "@google/generative-ai";
import { AUTO_REVIEW_RESPONSE_SCHEMA } from "./auto-review-schema";
import { extractJsonFromLLMResponse } from "./llm-json-repair";
import { getAgeReadingProfile } from "./age-reading-profile";
import type { BookData, PageData, LLMQualityReviewResult } from "./types";

const SAFETY_SETTINGS = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE },
];

export function buildAutoReviewPrompt(book: BookData, pages: PageData[]): string {
  const ageProfile = getAgeReadingProfile(book.input.childAge);
  const ageBand = ageProfile.ageBand;
  const isAge3Plus = ageBand !== "baby_toddler";

  const storyContext = {
    title: book.title,
    theme: book.theme,
    storyGoal: book.storyGoal,
    mainQuestObject: book.mainQuestObject,
    forbiddenQuestObjects: book.forbiddenQuestObjects,
    characterBible: book.characterBible,
    cast: book.storyCast?.map((c) => ({
      characterId: c.characterId,
      displayName: c.displayName,
      role: c.role,
      visualBible: c.visualBible,
      signatureItems: c.signatureItems,
      colorPalette: c.colorPalette,
    })),
    pages: pages.map((p) => ({
      pageNumber: p.pageNumber + 1,
      text: p.text,
      imagePrompt: p.imagePrompt,
      appearingCharacterIds: p.appearingCharacterIds,
      focusCharacterId: p.focusCharacterId,
    })),
  };

  return `
You are an expert children's book quality reviewer. Your task is to evaluate a generated picture book and provide a detailed quality assessment in JSON format.

## Evaluation Criteria
1. **Story Quality (0-100)**: Evaluate story structure, pacing, coherence, and emotional engagement. Is the story appropriate for children?
2. **Illustration Quality (0-100)**: Evaluate both the descriptive quality of the image prompts AND the actual generated images (if provided).
    - **Image Prompts**: Are they vivid and appropriate for the scene?
    - **Visual Artifacts**: Examine images for distorted limbs, unnatural faces, floating objects, or physically impossible structures.
    - **Text Artifacts**: Check for nonsensical text, gibberish characters, or pseudo-writing on signs, posters, or labels in the background.
    - **Style Consistency**: Does the visual style remain consistent across all images according to the chosen style profile?
3. **Character Consistency (0-100)**: Evaluate character consistency across pages. Use the "characterBible" and "cast" definitions as the ground truth. Check if:
    - Character descriptions (visualBible) are consistently reflected in page imagePrompts.
    - Clothing, hairstyles, and color palettes remain stable across pages for the same characterId.
    - The correct characterIds are listed in "appearingCharacterIds" based on the page text and prompt.
    - "focusCharacterId" is appropriately chosen and consistent.
    - **Unintended Characters**: Strictly check for characters NOT in the "cast" or "appearingCharacterIds". Detect "hallucinated companions" (extra pets or children that follow the protagonist) and "character duplication" (the same character appearing twice in one frame).
4. **Personalization Depth (0-100)**: Evaluate how well the story might incorporate child-specific elements (if any are apparent).
5. **Safety & Age Appropriateness (0-100)**: Check for any inappropriate content, violence, or themes unsuitable for young children.
6. **Semantic Content (Age 3+ Diagnostic)**:
    For books targeted at ages 3 and above (current age band: ${ageBand}), evaluate each page's story text for "semantic richness".
    Identify which of these four elements are present:
    - **場所 (Location)**: Setting, environment description, or situational context.
    - **行動 (Action)**: Specific character movements, activities, or sensory actions.
    - **気持ち (Emotion)**: Internal states, feelings, or emotional reactions.
    - **発見 (Discovery)**: Realizations, noticing something new, or situational changes.
    ${isAge3Plus ? "Each page MUST contain at least TWO of these elements to meet the quality standard for this age group. Missing these elements is a quality failure." : "This is diagnostic only for this age group."}

## Axis-Level Evaluation (0-100 for each)
You must also provide granular scores for the following axes:

- **Story Axes**: childPersonalization, storyCoherence, ageAppropriateness, emotionalSatisfaction, pageLengthBalance, characterConsistency, endingSatisfaction.
- **Illustration Axes**: promptCompleteness, visualConsistency, characterConsistency, sceneRelevance, styleConsistency, artifactAvoidance.
- **Character Axes**: visualBibleReflected, characterIdConsistency, appearingCharacterConsistency, focusCharacterConsistency, pageLevelCharacterLinkage, outfitHairstyleConsistency, colorPaletteConsistency.
- **Personalization Axes**: childProfileUsage, nameNicknameUsage, favoriteThings, familyContext, memoryEventContext, overPersonalizationRisk.
- **Safety Axes**: ageAppropriateVocabulary, notTooScary, dangerAvoidance, familyFriendlyPeace, privacyConsideration.

## Input Data
${JSON.stringify(storyContext, null, 2)}

## Output Format
You must output your review strictly in the following JSON format:
${JSON.stringify(AUTO_REVIEW_RESPONSE_SCHEMA, null, 2)}

Important:
- Provide all scores as integers between 0 and 100.
- "reviewReason", "flaggedIssues[].message", and "recommendedFixes[].reason" must be in Japanese.
- If you find no issues, return an empty array for "flaggedIssues" and "recommendedFixes".
- All axis objects (storyAxes, illustrationAxes, characterAxes, personalizationAxes, safetyAxes) are MANDATORY and must contain scores for all their respective sub-axes.
- For each page, fill "pageAssessments" with semantic content detection results.
- If a page in an age 3+ book (ageBand != 'baby_toddler') has fewer than 2 semantic elements, add a flaggedIssue with issueType "insufficient_semantic_content" and message "ページに十分な意味内容（場所・行動・気持ち・発見のうち2つ以上）がありません。".
- If you detect significant visual artifacts or text issues on a specific page image, add a recommendedFix with action "regenerate_page_image", that pageNumber, and a reason in Japanese.
- Return ONLY the JSON object.
`;
}

export async function runLLMAutoReview(params: {
  apiKey: string;
  book: BookData;
  pages: PageData[];
  modelName?: string;
  pageImages?: { pageNumber: number; buffer: Buffer; mimeType: string }[];
}): Promise<LLMQualityReviewResult> {
  const { apiKey, book, pages, modelName = "gemini-1.5-flash", pageImages } = params;
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: modelName,
    safetySettings: SAFETY_SETTINGS,
  });

  const prompt = buildAutoReviewPrompt(book, pages);
  const parts: Part[] = [{ text: prompt }];

  if (pageImages && pageImages.length > 0) {
    parts.push({ text: "\n\n## Provided Page Images for Visual Evaluation" });
    for (const img of pageImages) {
      parts.push({ text: `\n### Page ${img.pageNumber + 1} Image:` });
      parts.push({
        inlineData: {
          mimeType: img.mimeType,
          data: img.buffer.toString("base64"),
        },
      });
    }
  }

  const result = await model.generateContent({
    contents: [{ role: "user", parts }],
    generationConfig: {
      responseMimeType: "application/json",
    },
  });

  const responseText = result.response.text();
  const repairResult = extractJsonFromLLMResponse(responseText);

  if (repairResult.status === "unrepairable" || !repairResult.parsed) {
    throw new Error(`Failed to parse LLM auto review response: ${responseText.slice(0, 500)}`);
  }

  // Basic validation to ensure it matches LLMQualityReviewResult
  const parsed = repairResult.parsed as any;
  const requiredFields: (keyof LLMQualityReviewResult)[] = [
    "storyQualityScore",
    "illustrationQualityScore",
    "characterConsistencyScore",
    "personalizationScore",
    "safetyScore",
    "overallQualityScore",
    "confidence",
    "reviewReason",
    "flaggedIssues",
    "recommendedFixes",
    // NOTE: Specific axis objects are intentionally NOT required here. The response schema is
    // advisory (not enforced by Gemini), so the model may omit them; treating them as
    // optional keeps the overall review from failing when the axes are missing.
  ];

  for (const field of requiredFields) {
    if (parsed[field] === undefined) {
      throw new Error(`Missing required field in LLM auto review: ${field}`);
    }
  }

  return parsed as LLMQualityReviewResult;
}

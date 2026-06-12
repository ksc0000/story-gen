import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";
import { AUTO_REVIEW_RESPONSE_SCHEMA } from "./auto-review-schema";
import { extractJsonFromLLMResponse } from "./llm-json-repair";
import type { BookData, PageData, LLMQualityReviewResult } from "./types";

const SAFETY_SETTINGS = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE },
];

export function buildAutoReviewPrompt(book: BookData, pages: PageData[]): string {
  const storyContext = {
    title: book.title,
    theme: book.theme,
    storyGoal: book.storyGoal,
    mainQuestObject: book.mainQuestObject,
    forbiddenQuestObjects: book.forbiddenQuestObjects,
    pages: pages.map((p) => ({
      pageNumber: p.pageNumber + 1,
      text: p.text,
      imagePrompt: p.imagePrompt,
    })),
  };

  return `
You are an expert children's book quality reviewer. Your task is to evaluate a generated picture book and provide a detailed quality assessment in JSON format.

## Evaluation Criteria
1. **Story Quality (0-100)**: Evaluate story structure, pacing, coherence, and emotional engagement. Is the story appropriate for children?
2. **Illustration Quality (0-100)**: Evaluate the descriptive quality of the image prompts. Are they vivid and appropriate for the scene?
3. **Character Consistency (0-100)**: Evaluate the potential for character consistency based on descriptions and prompts across pages.
4. **Personalization Depth (0-100)**: Evaluate how well the story might incorporate child-specific elements (if any are apparent).
5. **Safety & Age Appropriateness (0-100)**: Check for any inappropriate content, violence, or themes unsuitable for young children.

## Input Data
${JSON.stringify(storyContext, null, 2)}

## Output Format
You must output your review strictly in the following JSON format:
${JSON.stringify(AUTO_REVIEW_RESPONSE_SCHEMA, null, 2)}

Important:
- Provide all scores as integers between 0 and 100.
- "reviewReason", "flaggedIssues[].message", and "recommendedFixes[].reason" must be in Japanese.
- If you find no issues, return an empty array for "flaggedIssues" and "recommendedFixes".
- Return ONLY the JSON object.
`;
}

export async function runLLMAutoReview(params: {
  apiKey: string;
  book: BookData;
  pages: PageData[];
  modelName?: string;
}): Promise<LLMQualityReviewResult> {
  const { apiKey, book, pages, modelName = "gemini-1.5-flash" } = params;
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: modelName,
    safetySettings: SAFETY_SETTINGS,
  });

  const prompt = buildAutoReviewPrompt(book, pages);

  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
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
  ];

  for (const field of requiredFields) {
    if (parsed[field] === undefined) {
      throw new Error(`Missing required field in LLM auto review: ${field}`);
    }
  }

  return parsed as LLMQualityReviewResult;
}

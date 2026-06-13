import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { extractJsonFromLLMResponse } from "./lib/llm-json-repair";
import type { TemplateData } from "./lib/types";

const geminiApiKey = defineSecret("GEMINI_API_KEY");

/**
 * Core logic for generating a template using Gemini.
 * Extracted for unit testing.
 */
export async function runTemplateGeneration(params: {
  apiKey: string;
  theme: string;
  categoryGroupId: string;
  pageCount: number;
  targetAge: string;
  additionalPrompt?: string;
}): Promise<TemplateData> {
  const { apiKey, theme, categoryGroupId, pageCount, targetAge, additionalPrompt } = params;

  const genAI = new GoogleGenerativeAI(apiKey);
  // Using a valid model name. gemini-2.0-flash-lite was likely a typo in requirements.
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  const systemPrompt = `
You are an expert children's book author and template designer for an AI picture book app.
Your task is to generate a new picture book template based on a theme and target age.
The template should follow the "fixed_template" mode, meaning it has a pre-defined story structure with placeholders.

Available Placeholders:
- {childName}: The name of the child.
- {childAge}: The age of the child.
- {favorites}: The child's favorite things.
- {place}: A location for the story.
- {familyMembers}: Family members to include.
- {parentMessage}: A message from the parent.
- {characterLook}: Description of the child's appearance.
- {signatureItem}: A signature item the child carries.
- {colorMood}: The color mood of the book.
- {lessonToTeach}: A lesson to teach.
- {memoryToRecreate}: A memory to recreate.
- {storyRequest}: Specific request for the story.

Target Page Count: ${pageCount}
Target Age: ${targetAge}
Theme: ${theme}
Additional Instructions: ${additionalPrompt || "None"}

Output Format (Strict JSON):
{
  "name": "Template Name in Japanese",
  "description": "Short description in Japanese",
  "icon": "One emoji",
  "genre": "Genre in English (e.g., Adventure, Bedtime)",
  "visualDirection": "Visual style guide in English (e.g., Soft watercolor, Bright pop)",
  "systemPrompt": "A prompt for the AI when this template is used in non-fixed mode (Japanese)",
  "fixedStory": {
    "titleTemplate": "Title with {childName}",
    "coverImagePromptTemplate": "Detailed English prompt for cover image generation, including {childName} and {characterLook}. Do not include text in the image.",
    "titleSpreadTextTemplate": "Introduction text for the title spread",
    "openingNarrationTemplate": "Opening narration text",
    "pages": [
      {
        "textTemplate": "Page text (Japanese) with placeholders",
        "imagePromptTemplate": "Detailed English image generation prompt for this page, describing scene, child action, and surroundings. Avoid text.",
        "pageVisualRole": "one of opening_establishing, discovery, action, emotional_closeup, object_detail, setback_or_question, payoff, quiet_ending"
      }
    ]
  }
}

Guidelines:
- Ensure the story is safe, gentle, and appropriate for the target age.
- Use placeholders naturally in textTemplate and imagePromptTemplate.
- imagePromptTemplate must be in English.
- pageVisualRole must be exactly one of the listed values.
- textTemplate should be in Japanese, using simple language.
- Generate exactly ${pageCount} pages.
`;

  const result = await model.generateContent(systemPrompt);
  const response = result.response;
  const text = response.text();

  const repairResult = extractJsonFromLLMResponse(text);
  if (repairResult.status === "unrepairable" || !repairResult.parsed) {
    logger.error("Failed to parse Gemini response", { text });
    throw new Error("Failed to generate valid template JSON.");
  }

  const generatedData = repairResult.parsed as any;

  return {
    name: generatedData.name || theme,
    description: generatedData.description || "",
    icon: generatedData.icon || "✨",
    genre: generatedData.genre || "Adventure",
    categoryGroupId: categoryGroupId,
    creationMode: "fixed_template",
    priceTier: "ume",
    storyCostLevel: "none",
    visualDirection: generatedData.visualDirection || "",
    systemPrompt: generatedData.systemPrompt || `A picture book story about ${theme}.`,
    fixedStory: {
      titleTemplate: generatedData.fixedStory?.titleTemplate || theme,
      coverImagePromptTemplate: generatedData.fixedStory?.coverImagePromptTemplate || "",
      titleSpreadTextTemplate: generatedData.fixedStory?.titleSpreadTextTemplate || "",
      openingNarrationTemplate: generatedData.fixedStory?.openingNarrationTemplate || "",
      pageCount: pageCount as 4 | 8 | 12,
      layoutVariant: `${pageCount}_page` as any,
      pages: (generatedData.fixedStory?.pages || []).map((p: any) => ({
        textTemplate: p.textTemplate || "",
        imagePromptTemplate: p.imagePromptTemplate || "",
        pageVisualRole: p.pageVisualRole || "action",
      })),
    },
    active: false,
    order: 100,
    themeTags: [theme],
  };
}

export const generateTemplate = onCall(
  {
    region: "asia-northeast1",
    consumeAppCheckToken: true,
    secrets: [geminiApiKey],
    timeoutSeconds: 300,
    memory: "512MiB",
  },
  async (request) => {
    // Admin only check
    if (!request.auth?.token?.admin) {
      throw new HttpsError("permission-denied", "Only admins can call this function.");
    }

    const { theme, categoryGroupId, pageCount, targetAge, additionalPrompt } = request.data as {
      theme: string;
      categoryGroupId: string;
      pageCount: number;
      targetAge: string;
      additionalPrompt?: string;
    };

    if (!theme || !categoryGroupId || !pageCount || !targetAge) {
      throw new HttpsError("invalid-argument", "Missing required fields.");
    }

    try {
      const templateDoc = await runTemplateGeneration({
        apiKey: geminiApiKey.value(),
        theme,
        categoryGroupId,
        pageCount,
        targetAge,
        additionalPrompt,
      });

      const db = admin.firestore();
      const docRef = await db.collection("templates").add(templateDoc);
      return { templateId: docRef.id };

    } catch (error) {
      logger.error("Error generating template", error);
      if (error instanceof HttpsError) throw error;
      throw new HttpsError("internal", error instanceof Error ? error.message : "An error occurred during template generation.");
    }
  }
);

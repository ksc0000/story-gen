import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";
import type { LLMClient, GeneratedStory, PageCount, IllustrationStyle } from "./types";

const MODEL_NAME = "gemini-2.5-flash-lite";

const SAFETY_SETTINGS = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE },
];

function extractJSON(text: string): string {
  const codeBlockMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (codeBlockMatch) return codeBlockMatch[1].trim();
  return text.trim();
}

function validateStory(data: unknown): GeneratedStory {
  if (typeof data !== "object" || data === null) throw new Error("LLM response is not an object");
  const obj = data as Record<string, unknown>;
  if (typeof obj.title !== "string") throw new Error("LLM response missing 'title' string");
  if (typeof obj.characterBible !== "string") throw new Error("LLM response missing 'characterBible' string");
  if (typeof obj.styleBible !== "string") throw new Error("LLM response missing 'styleBible' string");
  if (!Array.isArray(obj.pages) || obj.pages.length === 0) throw new Error("LLM response missing 'pages' array");
  for (const page of obj.pages) {
    if (typeof page.text !== "string" || typeof page.imagePrompt !== "string")
      throw new Error("Each page must have 'text' and 'imagePrompt' strings");
  }
  return { title: obj.title, characterBible: obj.characterBible, styleBible: obj.styleBible, pages: obj.pages };
}

export class GeminiClient implements LLMClient {
  private genAI: GoogleGenerativeAI;

  constructor(apiKey: string) {
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  async generateStory(params: {
    systemPrompt: string; childName: string; childAge?: number; favorites?: string;
    lessonToTeach?: string; memoryToRecreate?: string; characterLook?: string;
    signatureItem?: string; colorMood?: string; pageCount: PageCount; style: IllustrationStyle;
  }): Promise<GeneratedStory> {
    const model = this.genAI.getGenerativeModel({ model: MODEL_NAME, safetySettings: SAFETY_SETTINGS });
    const userParts: string[] = [`主人公の名前: ${params.childName}`];
    if (params.childAge !== undefined) userParts.push(`年齢: ${params.childAge}歳`);
    if (params.favorites) userParts.push(`好きなもの: ${params.favorites}`);
    if (params.lessonToTeach) userParts.push(`教えたいこと: ${params.lessonToTeach}`);
    if (params.memoryToRecreate) userParts.push(`再現したい思い出: ${params.memoryToRecreate}`);
    if (params.characterLook) userParts.push(`主人公の見た目: ${params.characterLook}`);
    if (params.signatureItem) userParts.push(`毎ページに出したい持ち物・服装: ${params.signatureItem}`);
    if (params.colorMood) userParts.push(`色や雰囲気: ${params.colorMood}`);
    userParts.push(`ページ数: ${params.pageCount}ページ`);

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: userParts.join("\n") }] }],
      systemInstruction: { role: "system", parts: [{ text: params.systemPrompt }] },
      generationConfig: { responseMimeType: "application/json" },
    });

    const rawText = result.response.text();
    const jsonStr = extractJSON(rawText);
    let parsed: unknown;
    try { parsed = JSON.parse(jsonStr); } catch { throw new Error(`Failed to parse LLM JSON response: ${rawText.slice(0, 200)}`); }
    return validateStory(parsed);
  }
}

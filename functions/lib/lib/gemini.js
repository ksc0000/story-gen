"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GeminiClient = void 0;
const generative_ai_1 = require("@google/generative-ai");
const MODEL_NAME = "gemini-2.0-flash";
const SAFETY_SETTINGS = [
    { category: generative_ai_1.HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: generative_ai_1.HarmBlockThreshold.BLOCK_LOW_AND_ABOVE },
    { category: generative_ai_1.HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: generative_ai_1.HarmBlockThreshold.BLOCK_LOW_AND_ABOVE },
    { category: generative_ai_1.HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: generative_ai_1.HarmBlockThreshold.BLOCK_LOW_AND_ABOVE },
    { category: generative_ai_1.HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: generative_ai_1.HarmBlockThreshold.BLOCK_LOW_AND_ABOVE },
];
function extractJSON(text) {
    const codeBlockMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
    if (codeBlockMatch)
        return codeBlockMatch[1].trim();
    return text.trim();
}
function validateStory(data) {
    if (typeof data !== "object" || data === null)
        throw new Error("LLM response is not an object");
    const obj = data;
    if (typeof obj.title !== "string")
        throw new Error("LLM response missing 'title' string");
    if (!Array.isArray(obj.pages) || obj.pages.length === 0)
        throw new Error("LLM response missing 'pages' array");
    for (const page of obj.pages) {
        if (typeof page.text !== "string" || typeof page.imagePrompt !== "string")
            throw new Error("Each page must have 'text' and 'imagePrompt' strings");
    }
    return { title: obj.title, pages: obj.pages };
}
class GeminiClient {
    genAI;
    constructor(apiKey) {
        this.genAI = new generative_ai_1.GoogleGenerativeAI(apiKey);
    }
    async generateStory(params) {
        const model = this.genAI.getGenerativeModel({ model: MODEL_NAME, safetySettings: SAFETY_SETTINGS });
        const userParts = [`主人公の名前: ${params.childName}`];
        if (params.childAge !== undefined)
            userParts.push(`年齢: ${params.childAge}歳`);
        if (params.favorites)
            userParts.push(`好きなもの: ${params.favorites}`);
        if (params.lessonToTeach)
            userParts.push(`教えたいこと: ${params.lessonToTeach}`);
        if (params.memoryToRecreate)
            userParts.push(`再現したい思い出: ${params.memoryToRecreate}`);
        userParts.push(`ページ数: ${params.pageCount}ページ`);
        const result = await model.generateContent({
            contents: [{ role: "user", parts: [{ text: userParts.join("\n") }] }],
            systemInstruction: { role: "model", parts: [{ text: params.systemPrompt }] },
        });
        const rawText = result.response.text();
        const jsonStr = extractJSON(rawText);
        let parsed;
        try {
            parsed = JSON.parse(jsonStr);
        }
        catch {
            throw new Error(`Failed to parse LLM JSON response: ${rawText.slice(0, 200)}`);
        }
        return validateStory(parsed);
    }
}
exports.GeminiClient = GeminiClient;
//# sourceMappingURL=gemini.js.map
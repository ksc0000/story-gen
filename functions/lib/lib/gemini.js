"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GeminiClient = void 0;
const generative_ai_1 = require("@google/generative-ai");
const MODEL_NAME = "gemini-2.5-flash-lite";
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
    if (typeof obj.characterBible !== "string")
        throw new Error("LLM response missing 'characterBible' string");
    if (typeof obj.styleBible !== "string")
        throw new Error("LLM response missing 'styleBible' string");
    if (!Array.isArray(obj.pages) || obj.pages.length === 0)
        throw new Error("LLM response missing 'pages' array");
    for (const page of obj.pages) {
        if (typeof page.text !== "string" || typeof page.imagePrompt !== "string")
            throw new Error("Each page must have 'text' and 'imagePrompt' strings");
    }
    return { title: obj.title, characterBible: obj.characterBible, styleBible: obj.styleBible, pages: obj.pages };
}
class GeminiClient {
    genAI;
    constructor(apiKey) {
        this.genAI = new generative_ai_1.GoogleGenerativeAI(apiKey);
    }
    async generateStory(params) {
        const model = this.genAI.getGenerativeModel({ model: MODEL_NAME, safetySettings: SAFETY_SETTINGS });
        const userParts = [`主人公の名前: ${params.childName}`];
        if (params.storyRequest)
            userParts.push(`今回の絵本で描きたいこと: ${params.storyRequest}`);
        if (params.childAge !== undefined)
            userParts.push(`年齢: ${params.childAge}歳`);
        if (params.favorites)
            userParts.push(`好きなもの: ${params.favorites}`);
        if (params.lessonToTeach)
            userParts.push(`教えたいこと: ${params.lessonToTeach}`);
        if (params.memoryToRecreate)
            userParts.push(`再現したい思い出: ${params.memoryToRecreate}`);
        if (params.characterLook)
            userParts.push(`主人公の見た目: ${params.characterLook}`);
        if (params.signatureItem)
            userParts.push(`毎ページに出したい持ち物・服装: ${params.signatureItem}`);
        if (params.colorMood)
            userParts.push(`色や雰囲気: ${params.colorMood}`);
        if (params.place)
            userParts.push(`場所: ${params.place}`);
        if (params.familyMembers)
            userParts.push(`一緒に登場させたい人: ${params.familyMembers}`);
        if (params.season)
            userParts.push(`季節・時期: ${params.season}`);
        if (params.parentMessage)
            userParts.push(`最後に伝えたい言葉: ${params.parentMessage}`);
        userParts.push(`ページ数: ${params.pageCount}ページ`);
        const result = await model.generateContent({
            contents: [{ role: "user", parts: [{ text: userParts.join("\n") }] }],
            systemInstruction: { role: "system", parts: [{ text: params.systemPrompt }] },
            generationConfig: { responseMimeType: "application/json" },
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
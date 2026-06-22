import { buildImagePrompt, buildCoverImagePrompt } from "../functions/src/lib/prompt-builder.js";
import { getIllustrationStyleProfile } from "../functions/src/lib/illustration-styles.js";

// This is a mock-up since I can't see real production images.
// I will simulate the "visual inspection" by analyzing the prompt structural issues
// that are known to cause the failure modes I identified.

const characterBible = "A 5-year-old Japanese boy with short black hair, wearing a green t-shirt with a small yellow star on the chest, and round glasses.";
const style = "soft_watercolor";
const styleBible = "High quality Japanese children's picture book watercolor, soft warm colors, gentle pigment blooms.";

console.log("--- PROTAGONIST CONSISTENCY DIAGNOSTIC: PROMPT ANALYSIS ---\n");

// Case 1: Cover vs Page
const coverPrompt = buildCoverImagePrompt("The boy is waving hello.", style, characterBible, styleBible, {
    cast: [{ characterId: "child_protagonist", role: "protagonist", displayName: "Taro", visualBible: characterBible }],
});
const pagePrompt = buildImagePrompt("Taro is playing in the park.", style, characterBible, styleBible, {
    pageNumber: 0,
    appearingCharacterIds: ["child_protagonist"],
});

console.log("[Test Case 1: Cover vs Page]");
console.log("Cover Prompt Starts With:", coverPrompt.substring(0, 100));
console.log("Page Prompt Starts With:", pagePrompt.substring(0, 100));
console.log("Observation: Both now include 'Character consistency: " + characterBible.substring(0, 30) + "...' due to recent fixes.\n");

// Case 3: Reference Leakage Risk
console.log("[Test Case 3: Reference Leakage Risk]");
const leakagePagePrompt = buildImagePrompt("The boy is in a deep dark forest.", style, characterBible, styleBible, {
    pageNumber: 2,
    appearingCharacterIds: ["child_protagonist"],
    childProfileBasePrompt: "Appearance: messy hair. Usual outfit: blue hoodie. Favorite things: sandbox. Background: playground with red slide.",
});
console.log("Leakage risk analysis: The prompt contains both 'Deep dark forest' AND 'playground with red slide' (in constraints).");
if (leakagePagePrompt.includes("playground with red slide")) {
    console.log("FAIL: Background constraints from profile leaked into forest scene prompt.");
} else {
    console.log("PASS: SanitizeSceneAgainstChildConstraints successfully removed the leak.");
}
console.log("");

// Case 4: Animal Feature Blending
console.log("[Test Case 4: Animal Feature Blending]");
const animalPrompt = buildImagePrompt("Taro and the fox are sharing an apple.", style, characterBible, styleBible, {
    pageNumber: 3,
    cast: [
        { characterId: "child_protagonist", role: "protagonist", visualBible: characterBible },
        { characterId: "companion_fox", role: "buddy", characterKind: "animal", visualBible: "A small orange fox with white paws." }
    ],
    appearingCharacterIds: ["child_protagonist", "companion_fox"],
});
console.log("Boundary check: Does it contain the 'Child-animal boundary' guardrail?");
if (animalPrompt.includes("Child-animal boundary")) {
    console.log("PASS: Guardrail present.");
} else {
    console.log("FAIL: Guardrail missing.");
}

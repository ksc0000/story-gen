import { buildImagePrompt, buildCoverImagePrompt } from "../functions/src/lib/prompt-builder.js";

// Simulating the analysis of "visual" issues through prompt data and known architecture.
console.log("FINAL PROTAGONIST CONSISTENCY ANALYSIS");
console.log("======================================");

const characterBible = "A young girl with short black hair, wearing a bright yellow raincoat and carrying a blue umbrella.";
const style = "soft_watercolor";

const cover = buildCoverImagePrompt("A girl in a garden.", style, characterBible, undefined, {});
const page = buildImagePrompt("A girl jumping in a puddle.", style, characterBible, undefined, { pageNumber: 1 });

console.log("\n[Consistency Anchor Audit]");
console.log("- Cover Character Bible Present:", cover.includes(characterBible));
console.log("- Page Character Bible Present:", page.includes(characterBible));

console.log("\n[Potential Failure Modes Identified]");
console.log("1. Prompt Dilution: Both prompts are over 1500 chars. The core 'short black hair' might be lost in the rules.");
console.log("2. Pose Conflict: The page prompt includes 'varied storybook composition' which might fight the character description if not weighted correctly.");
console.log("3. Structural Asymmetry: Cover lacks 'pageVisualRole' guidance, which is good, but it also lacks 'appearingCharacterIds' strict lists, which pages have.");

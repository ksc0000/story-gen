import { buildImagePrompt, buildCoverImagePrompt } from "../src/lib/prompt-builder";
import { getIllustrationStyleProfile } from "../src/lib/illustration-styles";

describe("Protagonist Consistency Diagnostic - Prompt Inspection", () => {
  const styles: Array<any> = ["soft_watercolor", "claymation", "vibrant_cartoon"];

  it("inspects prompt structure for potential dilution", () => {
    styles.forEach(style => {
      const prompt = buildImagePrompt("A child playing with a ball in the park.", style, "A young boy with curly hair and red glasses.", "Soft colors, hand-drawn lines.", {
        pageNumber: 1,
        appearingCharacterIds: ["child_protagonist"],
      });
      console.log(`Style: ${style}`);
      console.log(`Generated Prompt: ${prompt}\n`);
    });
  });

  it("inspects cover vs page consistency", () => {
    const characterBible = "A young girl with braided hair and a blue dress.";
    const styleBible = "Consistent watercolor style.";
    const style = "soft_watercolor";

    const coverPrompt = buildCoverImagePrompt("A girl standing in front of a house.", style, characterBible, styleBible, {
        cast: [{ characterId: "child_protagonist", role: "protagonist", displayName: "Child", visualBible: characterBible } as any],
    });
    const pagePrompt = buildImagePrompt("A girl sitting on a chair.", style, characterBible, styleBible, {
        pageNumber: 0,
        appearingCharacterIds: ["child_protagonist"],
    });

    console.log("--- Cover Prompt ---");
    console.log(coverPrompt);
    console.log("--- Page 0 Prompt ---");
    console.log(pagePrompt);
  });
});

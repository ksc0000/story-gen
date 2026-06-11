import { fixedStoryTemplates } from "./functions/src/templates/fixed-story-templates";

function applyTemplateReplacements(template: string, replacements: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => replacements[key] ?? "");
}

const replacements = {
  childName: "たろう",
  childAge: "4",
  familyMembers: "パパとママ",
  place: "こうえん",
  parentMessage: "だいすきだよ",
  lessonToTeach: "わけっこ",
};

for (const template of fixedStoryTemplates) {
  console.log(`--- Template: ${template.templateId} ---`);
  console.log(`Title: ${applyTemplateReplacements(template.fixedStory?.titleTemplate ?? "", replacements)}`);
  template.fixedStory?.pages.forEach((page, i) => {
    const text = page.textTemplatesByAge?.preschool_3_4 ?? page.textTemplate;
    console.log(`Page ${i + 1} [preschool]: ${applyTemplateReplacements(text, replacements)}`);
  });
  console.log("\n");
}

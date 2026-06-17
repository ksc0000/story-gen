import type { GeneratedStory, StoryCharacter, PageVisualRole } from "./types";

/**
 * Diagnostic information for a single page prompt.
 */
export interface PagePromptDiagnostic {
  pageNumber: number;
  characterPresence: Array<{
    characterId: string;
    displayName: string;
    present: boolean;
  }>;
  visualMotifPresent: boolean | "not_applicable";
  hiddenDetailPresent: boolean | "not_applicable";
  visualRolePresent: boolean;
  compositionHintPresent: boolean;
}

/**
 * Aggregate diagnostic information for the entire book's prompts.
 */
export interface PromptCompletenessDiagnostic {
  pages: PagePromptDiagnostic[];
  averageCompletenessScore: number;
}

/**
 * Utility to assess the completeness of generated image prompts against
 * story and visual elements.
 */
export function analyzePromptCompleteness(story: GeneratedStory): PromptCompletenessDiagnostic {
  const pages = story.pages.map((page, index) => {
    const prompt = page.imagePrompt.toLowerCase();

    // 1. Character Presence
    const characterPresence = (page.appearingCharacterIds ?? []).map((id) => {
      const char = findCharacter(story, id);
      const displayName = char?.displayName ?? id;
      const present = isCharacterPresentInPrompt(prompt, char, id);
      return { characterId: id, displayName, present };
    });

    // 2. Visual Motif
    const motif = page.visualMotifUsage || story.narrativeDevice?.visualMotif;
    const visualMotifPresent = motif
      ? prompt.includes(motif.toLowerCase())
      : ("not_applicable" as const);

    // 3. Hidden Detail
    const hidden = page.hiddenDetail;
    const hiddenDetailPresent = hidden
      ? prompt.includes(hidden.toLowerCase())
      : ("not_applicable" as const);

    // 4. Page Visual Role
    const visualRolePresent = page.pageVisualRole
      ? isVisualRolePresent(prompt, page.pageVisualRole)
      : false;

    // 5. Composition Hint
    const compositionHintPresent = page.compositionHint
      ? prompt.includes(page.compositionHint.toLowerCase())
      : false;

    return {
      pageNumber: index + 1,
      characterPresence,
      visualMotifPresent,
      hiddenDetailPresent,
      visualRolePresent,
      compositionHintPresent,
    };
  });

  const averageCompletenessScore = calculateScore(pages);

  return {
    pages,
    averageCompletenessScore,
  };
}

function findCharacter(story: GeneratedStory, id: string): StoryCharacter | undefined {
  if (id === "child_protagonist") {
    return {
      characterId: "child_protagonist",
      displayName: "child", // Default name used in prompts
      role: "protagonist",
      visualBible: "",
    };
  }
  return story.cast?.find((c) => c.characterId === id);
}

function isCharacterPresentInPrompt(prompt: string, char: StoryCharacter | undefined, id: string): boolean {
  if (!char) return prompt.includes(id.toLowerCase());

  const displayName = char.displayName.toLowerCase();
  if (prompt.includes(displayName)) return true;

  // Sometimes characters are referred to by their ID or role
  if (prompt.includes(id.toLowerCase())) return true;
  if (prompt.includes(char.role.toLowerCase())) return true;

  // Basic check for common child references if it's the protagonist
  if (id === "child_protagonist" && (prompt.includes("child") || prompt.includes("protagonist") || prompt.includes("main character"))) {
    return true;
  }

  return false;
}

function isVisualRolePresent(prompt: string, role: PageVisualRole): boolean {
  const roleKeywords: Record<PageVisualRole, string[]> = {
    opening_establishing: ["establishing", "wide", "landscape", "cinematic"],
    discovery: ["discovery", "noticed", "found", "looking", "wonder"],
    action: ["action", "movement", "doing", "running", "playing", "dynamic", "energy"],
    emotional_closeup: ["close-up", "closeup", "face", "expression", "emotion", "intimate"],
    object_detail: ["detail", "object", "focus on", "macro"],
    setback_or_question: ["uncertain", "wondering", "tension", "doubt", "reflective"],
    payoff: ["payoff", "resolution", "achieved", "success", "triumphant", "climax"],
    quiet_ending: ["ending", "final", "closure", "back view", "warm", "peaceful"],
  };

  const keywords = roleKeywords[role] || [];
  return keywords.some((k) => prompt.includes(k.toLowerCase()));
}

function calculateScore(pages: PagePromptDiagnostic[]): number {
  if (pages.length === 0) return 0;

  const totalPossiblePoints = pages.length * 5; // 5 axes per page
  let totalPoints = 0;

  pages.forEach((p) => {
    // Character Presence axis (all must be present for 1 point)
    if (p.characterPresence.length === 0 || p.characterPresence.every((cp) => cp.present)) {
      totalPoints += 1;
    }

    // Visual Motif axis
    if (p.visualMotifPresent === "not_applicable" || p.visualMotifPresent === true) {
      totalPoints += 1;
    }

    // Hidden Detail axis
    if (p.hiddenDetailPresent === "not_applicable" || p.hiddenDetailPresent === true) {
      totalPoints += 1;
    }

    // Visual Role axis
    if (p.visualRolePresent) {
      totalPoints += 1;
    }

    // Composition Hint axis
    if (p.compositionHintPresent) {
      totalPoints += 1;
    }
  });

  return (totalPoints / totalPossiblePoints) * 100;
}

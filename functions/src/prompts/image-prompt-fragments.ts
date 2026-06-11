export const FIXED_IMAGE_PROMPT_STANDARD_SUFFIX =
  "no readable writing anywhere, no signage, no storefront signs, no text-like marks, no text, no letters, no Japanese characters, no logo, no watermark";

export const FIXED_IMAGE_PROMPT_REF_ISOLATION_SUFFIX =
  "use the reference image ONLY for the child character's face, hairstyle, outfit, age, and body proportions; do NOT copy the reference image background, location, pose, lighting, camera angle, or composition; place the child naturally into the scene described here";

export function withFixedImagePromptSafety(prompt: string): string {
  let result = prompt;
  if (!result.includes(FIXED_IMAGE_PROMPT_STANDARD_SUFFIX)) {
    result = `${result}, ${FIXED_IMAGE_PROMPT_STANDARD_SUFFIX}`;
  }
  if (!result.includes(FIXED_IMAGE_PROMPT_REF_ISOLATION_SUFFIX)) {
    result = `${result}, ${FIXED_IMAGE_PROMPT_REF_ISOLATION_SUFFIX}`;
  }
  return result;
}

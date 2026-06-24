import OpenAI, { toFile } from "openai";
import type {
  ImageClient,
  ImageModelProfile,
  ImagePurpose,
  ImageQualityTier,
} from "./types";

export type OpenAIImageModelName =
  | "gpt-image-2"
  | "gpt-image-1.5"
  | "gpt-image-1"
  | "gpt-image-1-mini";

export type OpenAIImageModeration = "auto" | "low";
export type OpenAIImageQuality = "low" | "medium" | "high";

export type OpenAIImageSize =
  | "1024x1024"
  | "1536x1152"
  | "2048x1536"
  | "1024x768";

export type OpenAIClientOptions = {
  model: OpenAIImageModelName;
  /** Model for Responses API (reference images). Must support image_generation tool (e.g. gpt-4o). */
  responsesModel?: string;
  moderation: OpenAIImageModeration;
  quality: OpenAIImageQuality;
  size: OpenAIImageSize;
};

/**
 * System message for Responses API reference image calls.
 * Prevents photorealistic passthrough (T6-53 remediation: H4 fix).
 * Instructs gpt-4o to always generate a new illustration, never copy or replicate the reference photo.
 */
export const REFERENCE_IMAGE_SYSTEM_INSTRUCTION =
  "You are an expert children's book illustrator.\n" +
  "When you receive a reference photograph of a child, use ONLY their facial features " +
  "(face shape, eye color, hair color and style, skin tone) as character reference.\n" +
  "IMPORTANT RULES:\n" +
  "- ALWAYS generate a brand-new illustration from scratch in the art style described in the user message.\n" +
  "- NEVER output a photograph.\n" +
  "- NEVER copy or replicate the reference image.\n" +
  "- NEVER use the reference image's clothing, background, setting, or photographic style.\n" +
  "- The output MUST be a hand-drawn or painted illustration (crayon, watercolor, etc.) as specified.";

/**
 * Prefix prepended to the page prompt for Responses API reference image calls.
 * Reinforces illustration-only output at the start of the text instruction.
 */
export const REFERENCE_IMAGE_PROMPT_PREFIX =
  "[GENERATE ILLUSTRATION — NOT A PHOTOGRAPH]\n" +
  "This is a children's book illustration request.\n" +
  "Output: A NEW illustration in the art style below.\n" +
  "Reference image(s): Use ONLY for the child character's facial features. " +
  "Ignore the reference image's style, background, clothing, and setting.\n\n";

/**
 * Suffix appended to the page prompt for Responses API reference image calls.
 * Final reminder to produce illustration output, not a photograph.
 */
export const REFERENCE_IMAGE_PROMPT_SUFFIX =
  "\n\nREMINDER: The final output MUST be an illustration in the art style described above, " +
  "NOT a photograph. Generate a completely new scene as described. " +
  "Do NOT copy or reproduce the reference image.";

export const OPENAI_MINI_MODEL = "gpt-image-1-mini";
export const OPENAI_STANDARD_MODEL = "gpt-image-1";
export const OPENAI_GPT_IMAGE_2_MODEL = "gpt-image-2";

/** I1/I2 smoke profile: lowest cost, E005 relaxation test */
export const OPENAI_IMAGE_CANDIDATE_PROFILE: OpenAIClientOptions = {
  model: OPENAI_MINI_MODEL,
  responsesModel: "gpt-4o",
  moderation: "low",
  quality: "low",
  size: "1024x1024",
};

/** T6-62: OpenAI Mini profile (free tier, no reference images) */
export const OPENAI_MINI_PROFILE: OpenAIClientOptions = {
  model: OPENAI_MINI_MODEL,
  responsesModel: "gpt-4o",
  moderation: "low",
  quality: "low",
  size: "1024x1024",
};

/** T6-62: OpenAI Standard profile (standard tier, supports reference images) */
export const OPENAI_STANDARD_PROFILE: OpenAIClientOptions = {
  model: OPENAI_STANDARD_MODEL,
  responsesModel: "gpt-4o",
  moderation: "low",
  quality: "low",
  size: "1024x1024",
};

/**
 * GPT-image-2 eval profile. Latest OpenAI image model — strongest instruction
 * following (reliably honors "no text" / "no signage") and sharp text control.
 * Run at high quality so the comparison reflects the model's best output.
 */
export const OPENAI_GPT_IMAGE_2_PROFILE: OpenAIClientOptions = {
  model: OPENAI_GPT_IMAGE_2_MODEL,
  responsesModel: "gpt-4o",
  moderation: "low",
  quality: "high",
  size: "1024x1024",
};

/** GPT-image-2 medium — Standard / Premium サブスク向け（コスト/品質バランス）。 */
export const OPENAI_GPT_IMAGE_2_MEDIUM_PROFILE: OpenAIClientOptions = {
  model: OPENAI_GPT_IMAGE_2_MODEL,
  responsesModel: "gpt-4o",
  moderation: "low",
  quality: "medium",
  size: "1024x1024",
};

/** GPT-image-2 low — Free 向け（最安・全冊を高品質化）。 */
export const OPENAI_GPT_IMAGE_2_LOW_PROFILE: OpenAIClientOptions = {
  model: OPENAI_GPT_IMAGE_2_MODEL,
  responsesModel: "gpt-4o",
  moderation: "low",
  quality: "low",
  size: "1024x1024",
};

/**
 * プロファイルに対応する正しい OpenAI モデルラベルを返す。
 * resolveOpenAIModelLabel を opts 無しで呼ぶと既定の candidate(gpt-image-1-mini)に
 * なってしまうため、プロファイル別のラベル解決にはこちらを使う。
 */
export function resolveOpenAIModelLabelForProfile(
  profile: ImageModelProfile,
  hasReferenceImages: boolean
): string {
  const opts = resolveOpenAIProfileOptions(profile) ?? OPENAI_IMAGE_CANDIDATE_PROFILE;
  return resolveOpenAIModelLabel(hasReferenceImages, opts);
}

/**
 * Maps an OpenAI-backed ImageModelProfile to its client options.
 * Returns undefined for non-OpenAI (Replicate) profiles.
 */
export function resolveOpenAIProfileOptions(
  profile: ImageModelProfile
): OpenAIClientOptions | undefined {
  switch (profile) {
    case "openai_mini":
      return OPENAI_MINI_PROFILE;
    case "openai_standard":
      return OPENAI_STANDARD_PROFILE;
    case "openai_gpt_image_2":
      return OPENAI_GPT_IMAGE_2_PROFILE;
    case "openai_gpt_image_2_medium":
      return OPENAI_GPT_IMAGE_2_MEDIUM_PROFILE;
    case "openai_gpt_image_2_low":
      return OPENAI_GPT_IMAGE_2_LOW_PROFILE;
    case "openai_image_candidate":
      return OPENAI_IMAGE_CANDIDATE_PROFILE;
    default:
      return undefined;
  }
}

/**
 * Returns the correct imageModel label for Firestore page metadata when using OpenAI generation.
 * Two APIs are used depending on whether reference images are present:
 *   - Reference images present → Responses API / gpt-4o   → "openai/gpt-4o"
 *   - No reference images      → Images API / model name → "openai/gpt-image-1"
 * T6-58: fixes misleading "black-forest-labs/flux-2-klein-9b" label on OpenAI-generated pages.
 */
export function resolveOpenAIModelLabel(
  hasReferenceImages: boolean,
  opts: OpenAIClientOptions = OPENAI_IMAGE_CANDIDATE_PROFILE
): string {
  return hasReferenceImages
    ? `openai/${opts.responsesModel ?? "gpt-4o"}`
    : `openai/${opts.model}`;
}

export class OpenAIImageClient implements ImageClient {
  private client: OpenAI;
  private opts: OpenAIClientOptions;

  constructor(apiKey: string, opts: OpenAIClientOptions = OPENAI_IMAGE_CANDIDATE_PROFILE) {
    this.client = new OpenAI({ apiKey });
    this.opts = opts;
  }

  async generateImage(
    prompt: string,
    options?: {
      inputImageUrls?: string[];
      purpose?: ImagePurpose;
      imageQualityTier?: ImageQualityTier;
      imageModelProfile?: ImageModelProfile;
    }
  ): Promise<Buffer> {
    const inputImageUrls = options?.inputImageUrls ?? [];
    if (inputImageUrls.length > 0) {
      return this.generateWithReferenceImages(prompt, inputImageUrls);
    }
    return this.generateTextToImage(prompt);
  }

  private async generateTextToImage(prompt: string): Promise<Buffer> {
    const response = await this.client.images.generate({
      model: this.opts.model,
      prompt,
      n: 1,
      size: this.opts.size as any,
      moderation: this.opts.moderation as any,
      quality: this.opts.quality as any,
      output_format: "png",
    } as any);

    const data = response.data?.[0];
    if (!data) {
      throw new Error("No image output from OpenAI Image API");
    }

    // SDK returns b64_json when output_format is set, or url
    if ((data as any).b64_json) {
      return Buffer.from((data as any).b64_json, "base64");
    }
    if (data.url) {
      const fetchResponse = await fetch(data.url);
      if (!fetchResponse.ok) {
        throw new Error(`Failed to download OpenAI image: ${fetchResponse.status}`);
      }
      return Buffer.from(await fetchResponse.arrayBuffer());
    }

    throw new Error("Unexpected OpenAI Image API response format");
  }

  /** Models that natively accept image inputs via the Images edit endpoint. */
  private supportsNativeImageEdit(): boolean {
    return this.opts.model === "gpt-image-2" || this.opts.model === "gpt-image-1.5";
  }

  /**
   * Reference-image path for GPT-image-2 / 1.5. These models accept image inputs
   * directly on the Images edit endpoint, so we call them by name (genuinely using
   * the selected model) instead of routing through the Responses API + gpt-4o tool,
   * which cannot pin a specific gpt-image model. This is essential for character
   * consistency, the main reason to adopt gpt-image-2 for this product.
   */
  private async generateWithImageEdit(
    prompt: string,
    inputImageUrls: string[]
  ): Promise<Buffer> {
    const hardenedPrompt = REFERENCE_IMAGE_PROMPT_PREFIX + prompt + REFERENCE_IMAGE_PROMPT_SUFFIX;
    const images = await Promise.all(
      inputImageUrls.slice(0, 14).map(async (url, index) => {
        const res = await fetch(url);
        if (!res.ok) {
          throw new Error(`Failed to download reference image: ${res.status}`);
        }
        const buffer = Buffer.from(await res.arrayBuffer());
        return toFile(buffer, `reference-${index}.png`, { type: "image/png" });
      })
    );

    const response = await (this.client as any).images.edit({
      model: this.opts.model,
      image: images,
      prompt: hardenedPrompt,
      size: this.opts.size as any,
      quality: this.opts.quality as any,
    });

    const data = response.data?.[0];
    if ((data as any)?.b64_json) {
      return Buffer.from((data as any).b64_json, "base64");
    }
    if (data?.url) {
      const fetchResponse = await fetch(data.url);
      if (!fetchResponse.ok) {
        throw new Error(`Failed to download OpenAI image: ${fetchResponse.status}`);
      }
      return Buffer.from(await fetchResponse.arrayBuffer());
    }
    throw new Error("No image output from OpenAI Images edit API");
  }

  private async generateWithReferenceImages(
    prompt: string,
    inputImageUrls: string[]
  ): Promise<Buffer> {
    // GPT-image-2 / 1.5: use the Images edit endpoint so the selected model is
    // genuinely used with the character reference images.
    if (this.supportsNativeImageEdit()) {
      return this.generateWithImageEdit(prompt, inputImageUrls);
    }

    // Use Responses API for reference images.
    // gpt-image-1-mini is not available via Responses API; use responsesModel fallback.
    const model = this.opts.responsesModel ?? this.resolveResponsesModel();
    // Wrap prompt with hardening prefix/suffix to prevent photorealistic passthrough (T6-53).
    const hardenedPrompt = REFERENCE_IMAGE_PROMPT_PREFIX + prompt + REFERENCE_IMAGE_PROMPT_SUFFIX;
    const response = await (this.client as any).responses.create({
      model,
      input: [
        {
          // System message: illustrator role + anti-photo rules (T6-53 H4 fix).
          role: "system",
          content: REFERENCE_IMAGE_SYSTEM_INSTRUCTION,
        },
        {
          role: "user",
          content: [
            ...inputImageUrls.slice(0, 14).map((url: string) => ({
              type: "input_image",
              image_url: url,
            })),
            { type: "input_text", text: hardenedPrompt },
          ],
        },
      ],
      tools: [{ type: "image_generation", moderation: this.opts.moderation, size: this.opts.size, quality: this.opts.quality }],
      tool_choice: { type: "image_generation" },
    });

    // Extract image from Responses API output
    const output = response?.output;
    if (Array.isArray(output)) {
      for (const item of output) {
        if (item?.type === "image_generation_call" && item?.result) {
          return Buffer.from(item.result, "base64");
        }
      }
    }

    throw new Error("No image output from OpenAI Responses API");
  }

  /** gpt-image-1-mini and gpt-image-1 are not available via Responses API;
   * Responses API requires a model that supports the image_generation tool (e.g. gpt-4o). */
  private resolveResponsesModel(): string {
    return "gpt-4o";
  }
}

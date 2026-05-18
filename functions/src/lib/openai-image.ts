import OpenAI from "openai";
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
  moderation: OpenAIImageModeration;
  quality: OpenAIImageQuality;
  size: OpenAIImageSize;
};

/** I1 smoke profile: lowest cost, E005 relaxation test */
export const OPENAI_IMAGE_CANDIDATE_PROFILE: OpenAIClientOptions = {
  model: "gpt-image-1-mini",
  moderation: "low",
  quality: "low",
  size: "1024x1024",
};

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

  private async generateWithReferenceImages(
    prompt: string,
    inputImageUrls: string[]
  ): Promise<Buffer> {
    // Use Responses API for reference images
    const response = await (this.client as any).responses.create({
      model: this.opts.model,
      input: [
        {
          role: "user",
          content: [
            ...inputImageUrls.slice(0, 14).map((url: string) => ({
              type: "input_image",
              image_url: url,
            })),
            { type: "input_text", text: prompt },
          ],
        },
      ],
      tools: [{ type: "image_generation", moderation: this.opts.moderation, size: this.opts.size, quality: this.opts.quality }],
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
}

import Replicate from "replicate";
import type { ImageClient, ImagePurpose } from "./types";

const FLUX_SCHNELL_MODEL = "black-forest-labs/flux-schnell" as const;
const FLUX_QUALITY_MODEL = "black-forest-labs/flux-2-pro" as const;

export class ReplicateImageClient implements ImageClient {
  private replicate: Replicate;

  constructor(apiToken: string) {
    this.replicate = new Replicate({ auth: apiToken });
  }

  async generateImage(prompt: string, options?: { inputImageUrls?: string[]; purpose?: ImagePurpose }): Promise<Buffer> {
    const inputImageUrls = [...new Set(options?.inputImageUrls ?? [])].slice(0, 8);
    const model = this.getModelForPurpose(options?.purpose);
    const output = await this.replicate.run(model, {
      input: {
        prompt,
        aspect_ratio: "4:3",
        output_format: "png",
        // We choose the model by use-case, not by whether reference images happen to exist.
        ...(model === FLUX_SCHNELL_MODEL ? { num_outputs: 1 } : {}),
        ...(inputImageUrls.length > 0 ? { input_images: inputImageUrls } : {}),
      },
    });

    const outputs = this.normalizeReplicateOutput(output);
    if (!outputs || outputs.length === 0) {
      throw new Error("No image output from Replicate");
    }

    const imageUrl = this.extractUrlFromReplicateOutput(outputs[0]);
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to download image: ${response.status} ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  private extractUrlFromReplicateOutput(output: unknown): string {
    if (typeof output === "string") {
      return output;
    }

    if (output && typeof output === "object") {
      const maybeUrl = (output as any).url;
      if (typeof maybeUrl === "function") {
        return maybeUrl().toString();
      }

      if (typeof maybeUrl === "string") {
        return maybeUrl;
      }

      const toStringFn = (output as any).toString;
      if (typeof toStringFn === "function") {
        return toStringFn.call(output);
      }
    }

    throw new Error("Unsupported Replicate output format");
  }

  private normalizeReplicateOutput(output: unknown): unknown[] {
    if (Array.isArray(output)) {
      return output;
    }

    if (typeof output === "string") {
      return [output];
    }

    if (output && typeof output === "object") {
      const objectOutput = output as Record<string, unknown>;
      if (Array.isArray(objectOutput.output)) {
        return objectOutput.output;
      }
      if (typeof objectOutput.output === "string") {
        return [objectOutput.output];
      }
      if (Array.isArray(objectOutput.images)) {
        return objectOutput.images;
      }
      if (typeof objectOutput.url === "string" || typeof objectOutput.url === "function") {
        return [output];
      }
    }

    return [];
  }

  private getModelForPurpose(
    purpose: ImagePurpose | undefined
  ): typeof FLUX_SCHNELL_MODEL | typeof FLUX_QUALITY_MODEL {
    switch (purpose) {
      case "child_avatar":
      case "child_avatar_revision":
      case "book_cover":
      case "memory_key_page":
        return FLUX_QUALITY_MODEL;
      case "book_page":
      default:
        return FLUX_SCHNELL_MODEL;
    }
  }
}

import Replicate from "replicate";
import type { ImageClient } from "./types";

const FLUX_SCHNELL_MODEL = "black-forest-labs/flux-schnell" as const;
const FLUX_REFERENCE_MODEL = "black-forest-labs/flux-2-pro" as const;

export class ReplicateImageClient implements ImageClient {
  private replicate: Replicate;

  constructor(apiToken: string) {
    this.replicate = new Replicate({ auth: apiToken });
  }

  async generateImage(prompt: string, options?: { inputImageUrls?: string[] }): Promise<Buffer> {
    const inputImageUrls = [...new Set(options?.inputImageUrls ?? [])].slice(0, 8);
    const model = inputImageUrls.length > 0 ? FLUX_REFERENCE_MODEL : FLUX_SCHNELL_MODEL;
    const output = await this.replicate.run(model, {
      input: {
        prompt,
        aspect_ratio: "4:3",
        output_format: "png",
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
}

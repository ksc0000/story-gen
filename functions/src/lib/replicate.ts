import Replicate from "replicate";
import type { ImageClient, ImagePurpose, ImageQualityTier } from "./types";

// Legacy fallback only. Not used in normal generation.
const LEGACY_FLUX_SCHNELL_MODEL = "black-forest-labs/flux-schnell" as const;
const FLUX_KLEIN_MODEL = "black-forest-labs/flux-2-klein-9b" as const;
const FLUX_QUALITY_MODEL = "black-forest-labs/flux-2-pro" as const;

type ReplicateModelName =
  | typeof LEGACY_FLUX_SCHNELL_MODEL
  | typeof FLUX_KLEIN_MODEL
  | typeof FLUX_QUALITY_MODEL;

type ReplicateInputPayload = {
  prompt: string;
  aspect_ratio: "4:3";
  output_format: "png";
  num_outputs?: 1;
  images?: string[];
  input_images?: string[];
};

function resolveBookModelByTier(imageQualityTier: ImageQualityTier | undefined): ReplicateModelName {
  const tier = imageQualityTier ?? "light";
  if (tier === "premium") {
    return FLUX_QUALITY_MODEL;
  }
  return FLUX_KLEIN_MODEL;
}

export function resolveReplicateModel(params: {
  purpose?: ImagePurpose;
  imageQualityTier?: ImageQualityTier;
}): ReplicateModelName {
  switch (params.purpose) {
    case "child_avatar":
    case "child_avatar_revision":
      return FLUX_QUALITY_MODEL;
    case "book_cover":
    case "memory_key_page":
    case "book_page":
      return resolveBookModelByTier(params.imageQualityTier);
    default: {
      return resolveBookModelByTier(params.imageQualityTier);
    }
  }
}

export function buildReplicateInput(params: {
  model: ReplicateModelName;
  prompt: string;
  inputImageUrls?: string[];
}): ReplicateInputPayload {
  const dedupedInputImageUrls = [...new Set(params.inputImageUrls ?? [])];

  if (params.model === LEGACY_FLUX_SCHNELL_MODEL) {
    return {
      prompt: params.prompt,
      aspect_ratio: "4:3",
      output_format: "png",
      num_outputs: 1,
    };
  }

  if (params.model === FLUX_KLEIN_MODEL) {
    return {
      prompt: params.prompt,
      aspect_ratio: "4:3",
      output_format: "png",
      ...(dedupedInputImageUrls.length > 0 ? { images: dedupedInputImageUrls.slice(0, 5) } : {}),
    };
  }

  return {
    prompt: params.prompt,
    aspect_ratio: "4:3",
    output_format: "png",
    ...(dedupedInputImageUrls.length > 0 ? { input_images: dedupedInputImageUrls.slice(0, 4) } : {}),
  };
}

export class ReplicateImageClient implements ImageClient {
  private replicate: Replicate;

  constructor(apiToken: string) {
    this.replicate = new Replicate({ auth: apiToken });
  }

  async generateImage(
    prompt: string,
    options?: { inputImageUrls?: string[]; purpose?: ImagePurpose; imageQualityTier?: ImageQualityTier }
  ): Promise<Buffer> {
    const model = resolveReplicateModel({
      purpose: options?.purpose,
      imageQualityTier: options?.imageQualityTier,
    });
    const input = buildReplicateInput({
      model,
      prompt,
      inputImageUrls: options?.inputImageUrls,
    });
    const output = await this.replicate.run(model, {
      input,
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

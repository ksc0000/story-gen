import Replicate from "replicate";
import type {
  ImageClient,
  ImageModelProfile,
  ImagePurpose,
  ImageQualityTier,
} from "./types";
// P3-8: Policy functions extracted to image-model-policy.ts.
// Imported here for local use (generateImageWithMetadata uses resolveImageModelProfile).
// Re-exported here for backward compatibility so existing imports (generate-book.ts, tests)
// continue to work without any changes on their side.
import {
  CANDIDATE_IMAGE_PROFILES,
  isCandidateProfile,
  resolveImageModelProfile,
  resolveImageFallbackProfiles,
} from "./image-model-policy";
export {
  CANDIDATE_IMAGE_PROFILES,
  isCandidateProfile,
  resolveImageModelProfile,
  resolveImageFallbackProfiles,
};

// Legacy fallback only. Not used in normal generation.
const LEGACY_FLUX_SCHNELL_MODEL = "black-forest-labs/flux-schnell" as const;
const FLUX_KLEIN_FAST_MODEL = "black-forest-labs/flux-2-klein-9b" as const;
const FLUX_KLEIN_BASE_MODEL = "black-forest-labs/flux-2-klein-9b-base" as const;
const FLUX_PRO_MODEL = "black-forest-labs/flux-2-pro" as const;
const FLUX_KONTEXT_PRO_MODEL = "black-forest-labs/flux-kontext-pro" as const;
// T6-37: diagnostic candidate only — not exposed in production default routing
const FLUX_11_PRO_MODEL = "black-forest-labs/flux-1.1-pro" as const;

export type ReplicateModelName =
  | typeof LEGACY_FLUX_SCHNELL_MODEL
  | typeof FLUX_KLEIN_FAST_MODEL
  | typeof FLUX_KLEIN_BASE_MODEL
  | typeof FLUX_PRO_MODEL
  | typeof FLUX_KONTEXT_PRO_MODEL
  | typeof FLUX_11_PRO_MODEL;

type ReplicateInputPayload = {
  prompt: string;
  aspect_ratio: "4:3";
  output_format: "png";
  num_outputs?: 1;
  images?: string[];
  input_images?: string[];
  input_image?: string;
  image_prompt?: string;      // flux-1.1-pro: Flux Redux single-image composition reference
  megapixels?: "1";
  go_fast?: boolean;
  safety_tolerance?: number;  // flux-1.1-pro: 1=strict … 6=permissive (default 2)
  prompt_upsampling?: boolean;
};

export interface ImageGenerationMetadata {
  buffer: Buffer;
  model: ReplicateModelName;
  modelProfile: ImageModelProfile;
  durationMs: number;
  attemptCount: number;
  inputImageUrlsCount: number;
}

function isKleinBaseEnabled(): boolean {
  return process.env.ENABLE_KLEIN_BASE === "true";
}

function resolveProfileModel(imageModelProfile: ImageModelProfile): ReplicateModelName {
  switch (imageModelProfile) {
    case "klein_base":
      return FLUX_KLEIN_BASE_MODEL;
    case "pro_consistent":
      return FLUX_PRO_MODEL;
    case "kontext_reference":
      return FLUX_KONTEXT_PRO_MODEL;
    case "flux11_pro_candidate": // T6-37: diagnostic only
      return FLUX_11_PRO_MODEL;
    case "klein_fast":
    default:
      return FLUX_KLEIN_FAST_MODEL;
  }
}

function resolveBookModelByTier(
  imageQualityTier: ImageQualityTier | undefined
): ReplicateModelName {
  const tier = imageQualityTier ?? "light";

  if (tier === "premium") {
    return FLUX_PRO_MODEL;
  }

  if (tier === "standard" && isKleinBaseEnabled()) {
    return FLUX_KLEIN_BASE_MODEL;
  }

  return FLUX_KLEIN_FAST_MODEL;
}

// resolveImageFallbackProfiles, CANDIDATE_IMAGE_PROFILES, isCandidateProfile are
// now defined in image-model-policy.ts and re-exported above.

export function resolveReplicateModel(params: {
  purpose?: ImagePurpose;
  imageQualityTier?: ImageQualityTier;
  imageModelProfile?: ImageModelProfile;
}): ReplicateModelName {
  if (params.purpose === "child_avatar" || params.purpose === "child_avatar_revision") {
    return FLUX_PRO_MODEL;
  }

  if (params.imageModelProfile) {
    return resolveProfileModel(params.imageModelProfile);
  }

  return resolveBookModelByTier(params.imageQualityTier);
}

// resolveImageFallbackProfiles, CANDIDATE_IMAGE_PROFILES, isCandidateProfile are
// now defined in image-model-policy.ts and re-exported above.

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

  if (
    params.model === FLUX_KLEIN_FAST_MODEL ||
    params.model === FLUX_KLEIN_BASE_MODEL
  ) {
    return {
      prompt: params.prompt,
      aspect_ratio: "4:3",
      output_format: "png",
      megapixels: "1",
      go_fast: true,
      ...(dedupedInputImageUrls.length > 0
        ? { images: dedupedInputImageUrls.slice(0, 5) }
        : {}),
    };
  }

  if (params.model === FLUX_KONTEXT_PRO_MODEL) {
    return {
      prompt: params.prompt,
      aspect_ratio: "4:3",
      output_format: "png",
      ...(dedupedInputImageUrls.length > 0
        ? { input_image: dedupedInputImageUrls[0] }
        : {}),
    };
  }

  // T6-37: flux-1.1-pro diagnostic candidate
  // Uses safety_tolerance=5 for children's fantasy content (default is 2, scale 1-6).
  // Uses image_prompt (single URI) instead of input_images — Flux Redux composition reference.
  if (params.model === FLUX_11_PRO_MODEL) {
    return {
      prompt: params.prompt,
      aspect_ratio: "4:3",
      output_format: "png",
      safety_tolerance: 5,
      prompt_upsampling: false,
      ...(dedupedInputImageUrls.length > 0
        ? { image_prompt: dedupedInputImageUrls[0] }
        : {}),
    };
  }

  return {
    prompt: params.prompt,
    aspect_ratio: "4:3",
    output_format: "png",
    ...(dedupedInputImageUrls.length > 0
      ? { input_images: dedupedInputImageUrls.slice(0, 8) }
      : {}),
  };
}

export function withImageTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    const timer = setTimeout(() => {
      reject(new ImageTimeoutError(`Image generation timed out after ${timeoutMs}ms`));
    }, timeoutMs);
    promise.finally(() => clearTimeout(timer)).catch(() => {});
  });
  return Promise.race([promise, timeoutPromise]);
}

export class ImageTimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ImageTimeoutError";
  }
}

export class ReplicateImageClient implements ImageClient {
  private replicate: Replicate;

  constructor(apiToken: string) {
    this.replicate = new Replicate({ auth: apiToken });
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
    const { buffer } = await this.generateImageWithMetadata(prompt, options);
    return buffer;
  }

  async generateImageWithMetadata(
    prompt: string,
    options?: {
      inputImageUrls?: string[];
      purpose?: ImagePurpose;
      imageQualityTier?: ImageQualityTier;
      imageModelProfile?: ImageModelProfile;
    }
  ): Promise<ImageGenerationMetadata> {
    const startMs = Date.now();
    const modelProfile = resolveImageModelProfile({
      purpose: options?.purpose,
      imageQualityTier: options?.imageQualityTier,
      imageModelProfile: options?.imageModelProfile,
    });
    const model = resolveReplicateModel({
      purpose: options?.purpose,
      imageQualityTier: options?.imageQualityTier,
      imageModelProfile: options?.imageModelProfile,
    });
    const inputImageUrls = options?.inputImageUrls ?? [];
    const input = buildReplicateInput({
      model,
      prompt,
      inputImageUrls,
    });
    const output = await this.replicate.run(model, { input });

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
    const buffer = Buffer.from(arrayBuffer);

    return {
      buffer,
      model,
      modelProfile,
      durationMs: Date.now() - startMs,
      attemptCount: 1,
      inputImageUrlsCount: inputImageUrls.length,
    };
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

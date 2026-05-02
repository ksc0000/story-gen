"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReplicateImageClient = void 0;
exports.resolveImageModelProfile = resolveImageModelProfile;
exports.resolveReplicateModel = resolveReplicateModel;
exports.buildReplicateInput = buildReplicateInput;
const replicate_1 = __importDefault(require("replicate"));
// Legacy fallback only. Not used in normal generation.
const LEGACY_FLUX_SCHNELL_MODEL = "black-forest-labs/flux-schnell";
const FLUX_KLEIN_FAST_MODEL = "black-forest-labs/flux-2-klein-9b";
const FLUX_KLEIN_BASE_MODEL = "black-forest-labs/flux-2-klein-9b-base";
const FLUX_PRO_MODEL = "black-forest-labs/flux-2-pro";
const FLUX_KONTEXT_PRO_MODEL = "black-forest-labs/flux-kontext-pro";
function isKleinBaseEnabled() {
    return process.env.ENABLE_KLEIN_BASE === "true";
}
function resolveProfileModel(imageModelProfile) {
    switch (imageModelProfile) {
        case "klein_base":
            return FLUX_KLEIN_BASE_MODEL;
        case "pro_consistent":
            return FLUX_PRO_MODEL;
        case "kontext_reference":
            return FLUX_KONTEXT_PRO_MODEL;
        case "klein_fast":
        default:
            return FLUX_KLEIN_FAST_MODEL;
    }
}
function resolveBookModelByTier(imageQualityTier) {
    const tier = imageQualityTier ?? "light";
    if (tier === "premium") {
        return FLUX_PRO_MODEL;
    }
    if (tier === "standard" && isKleinBaseEnabled()) {
        return FLUX_KLEIN_BASE_MODEL;
    }
    return FLUX_KLEIN_FAST_MODEL;
}
function resolveImageModelProfile(params) {
    if (params.purpose === "child_avatar" || params.purpose === "child_avatar_revision") {
        return "pro_consistent";
    }
    if (params.imageModelProfile) {
        return params.imageModelProfile;
    }
    if (params.imageQualityTier === "premium") {
        return "pro_consistent";
    }
    if (params.imageQualityTier === "standard" && isKleinBaseEnabled()) {
        return "klein_base";
    }
    return "klein_fast";
}
function resolveReplicateModel(params) {
    if (params.purpose === "child_avatar" || params.purpose === "child_avatar_revision") {
        return FLUX_PRO_MODEL;
    }
    if (params.imageModelProfile) {
        return resolveProfileModel(params.imageModelProfile);
    }
    return resolveBookModelByTier(params.imageQualityTier);
}
function buildReplicateInput(params) {
    const dedupedInputImageUrls = [...new Set(params.inputImageUrls ?? [])];
    if (params.model === LEGACY_FLUX_SCHNELL_MODEL) {
        return {
            prompt: params.prompt,
            aspect_ratio: "4:3",
            output_format: "png",
            num_outputs: 1,
        };
    }
    if (params.model === FLUX_KLEIN_FAST_MODEL ||
        params.model === FLUX_KLEIN_BASE_MODEL) {
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
    return {
        prompt: params.prompt,
        aspect_ratio: "4:3",
        output_format: "png",
        ...(dedupedInputImageUrls.length > 0
            ? { input_images: dedupedInputImageUrls.slice(0, 8) }
            : {}),
    };
}
class ReplicateImageClient {
    replicate;
    constructor(apiToken) {
        this.replicate = new replicate_1.default({ auth: apiToken });
    }
    async generateImage(prompt, options) {
        const model = resolveReplicateModel({
            purpose: options?.purpose,
            imageQualityTier: options?.imageQualityTier,
            imageModelProfile: options?.imageModelProfile,
        });
        const input = buildReplicateInput({
            model,
            prompt,
            inputImageUrls: options?.inputImageUrls,
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
        return Buffer.from(arrayBuffer);
    }
    extractUrlFromReplicateOutput(output) {
        if (typeof output === "string") {
            return output;
        }
        if (output && typeof output === "object") {
            const maybeUrl = output.url;
            if (typeof maybeUrl === "function") {
                return maybeUrl().toString();
            }
            if (typeof maybeUrl === "string") {
                return maybeUrl;
            }
            const toStringFn = output.toString;
            if (typeof toStringFn === "function") {
                return toStringFn.call(output);
            }
        }
        throw new Error("Unsupported Replicate output format");
    }
    normalizeReplicateOutput(output) {
        if (Array.isArray(output)) {
            return output;
        }
        if (typeof output === "string") {
            return [output];
        }
        if (output && typeof output === "object") {
            const objectOutput = output;
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
exports.ReplicateImageClient = ReplicateImageClient;
//# sourceMappingURL=replicate.js.map
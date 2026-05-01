"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReplicateImageClient = void 0;
exports.resolveReplicateModel = resolveReplicateModel;
exports.buildReplicateInput = buildReplicateInput;
const replicate_1 = __importDefault(require("replicate"));
const FLUX_SCHNELL_MODEL = "black-forest-labs/flux-schnell";
const FLUX_KLEIN_MODEL = "black-forest-labs/flux-2-klein-9b";
const FLUX_QUALITY_MODEL = "black-forest-labs/flux-2-pro";
function isFluxKleinEnabled() {
    return String(process.env.ENABLE_FLUX_KLEIN || "").toLowerCase() === "true";
}
function resolveBookModelByTier(imageQualityTier) {
    const tier = imageQualityTier ?? "light";
    if (tier === "premium") {
        return FLUX_QUALITY_MODEL;
    }
    if (tier === "standard") {
        return isFluxKleinEnabled() ? FLUX_KLEIN_MODEL : FLUX_SCHNELL_MODEL;
    }
    return FLUX_SCHNELL_MODEL;
}
function resolveReplicateModel(params) {
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
function buildReplicateInput(params) {
    const dedupedInputImageUrls = [...new Set(params.inputImageUrls ?? [])];
    if (params.model === FLUX_SCHNELL_MODEL) {
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
class ReplicateImageClient {
    replicate;
    constructor(apiToken) {
        this.replicate = new replicate_1.default({ auth: apiToken });
    }
    async generateImage(prompt, options) {
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
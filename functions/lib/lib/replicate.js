"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReplicateImageClient = void 0;
const replicate_1 = __importDefault(require("replicate"));
const FLUX_SCHNELL_MODEL = "black-forest-labs/flux-schnell";
class ReplicateImageClient {
    replicate;
    constructor(apiToken) {
        this.replicate = new replicate_1.default({ auth: apiToken });
    }
    async generateImage(prompt) {
        const output = await this.replicate.run(FLUX_SCHNELL_MODEL, {
            input: { prompt, num_outputs: 1, aspect_ratio: "4:3", output_format: "png" },
        });
        const urls = output;
        if (!urls || urls.length === 0)
            throw new Error("No image output from Replicate");
        const imageUrl = urls[0];
        const response = await fetch(imageUrl);
        if (!response.ok)
            throw new Error(`Failed to download image: ${response.status} ${response.statusText}`);
        const arrayBuffer = await response.arrayBuffer();
        return Buffer.from(arrayBuffer);
    }
}
exports.ReplicateImageClient = ReplicateImageClient;
//# sourceMappingURL=replicate.js.map
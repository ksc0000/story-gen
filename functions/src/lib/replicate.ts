import Replicate from "replicate";
import type { ImageClient } from "./types";

const FLUX_SCHNELL_MODEL = "black-forest-labs/flux-schnell" as const;

export class ReplicateImageClient implements ImageClient {
  private replicate: Replicate;

  constructor(apiToken: string) {
    this.replicate = new Replicate({ auth: apiToken });
  }

  async generateImage(prompt: string): Promise<Buffer> {
    const output = await this.replicate.run(FLUX_SCHNELL_MODEL, {
      input: { prompt, num_outputs: 1, aspect_ratio: "4:3", output_format: "png" },
    });
    const urls = output as string[];
    if (!urls || urls.length === 0) throw new Error("No image output from Replicate");
    const imageUrl = urls[0];
    const response = await fetch(imageUrl);
    if (!response.ok) throw new Error(`Failed to download image: ${response.status} ${response.statusText}`);
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }
}

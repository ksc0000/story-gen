import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  OpenAIImageClient,
  OPENAI_IMAGE_CANDIDATE_PROFILE,
  OPENAI_MINI_PROFILE,
  OPENAI_STANDARD_PROFILE,
  OPENAI_GPT_IMAGE_2_PROFILE,
  REFERENCE_IMAGE_SYSTEM_INSTRUCTION,
  REFERENCE_IMAGE_PROMPT_PREFIX,
  REFERENCE_IMAGE_PROMPT_SUFFIX,
  resolveOpenAIModelLabel,
} from "../src/lib/openai-image";

const mockGenerate = vi.fn();
const mockResponsesCreate = vi.fn();
const mockEdit = vi.fn();

vi.mock("openai", () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      images: { generate: mockGenerate, edit: mockEdit },
      responses: { create: mockResponsesCreate },
    })),
    toFile: vi.fn(async (buffer: Buffer, name: string) => ({ name, buffer })),
  };
});

describe("OpenAIImageClient", () => {
  beforeEach(() => {
    mockGenerate.mockReset();
    mockResponsesCreate.mockReset();
    mockEdit.mockReset();
  });

  describe("Profiles (T6-62)", () => {
    it("OPENAI_IMAGE_CANDIDATE_PROFILE has expected smoke profile values", () => {
      expect(OPENAI_IMAGE_CANDIDATE_PROFILE).toEqual({
        model: "gpt-image-1-mini",
        responsesModel: "gpt-4o",
        moderation: "low",
        quality: "low",
        size: "1024x1024",
      });
    });

    it("OPENAI_MINI_PROFILE has expected values", () => {
      expect(OPENAI_MINI_PROFILE).toEqual({
        model: "gpt-image-1-mini",
        responsesModel: "gpt-4o",
        moderation: "low",
        quality: "low",
        size: "1024x1024",
      });
    });

    it("OPENAI_STANDARD_PROFILE has expected values", () => {
      expect(OPENAI_STANDARD_PROFILE).toEqual({
        model: "gpt-image-1",
        responsesModel: "gpt-4o",
        moderation: "low",
        quality: "low",
        size: "1024x1024",
      });
    });
  });

  describe("resolveOpenAIModelLabel (T6-58, T6-62)", () => {
    it("returns openai/gpt-4o when reference images are present (default profile)", () => {
      expect(resolveOpenAIModelLabel(true)).toBe("openai/gpt-4o");
    });

    it("returns openai/gpt-image-1-mini when no reference images (default profile)", () => {
      expect(resolveOpenAIModelLabel(false)).toBe("openai/gpt-image-1-mini");
    });

    it("reflects profile model when no reference images", () => {
      expect(resolveOpenAIModelLabel(false, OPENAI_STANDARD_PROFILE)).toBe("openai/gpt-image-1");
      expect(resolveOpenAIModelLabel(false, OPENAI_MINI_PROFILE)).toBe("openai/gpt-image-1-mini");
    });

    it("reflects profile responsesModel when reference images are present", () => {
      const customProfile = { ...OPENAI_STANDARD_PROFILE, responsesModel: "gpt-4o-custom" };
      expect(resolveOpenAIModelLabel(true, customProfile)).toBe("openai/gpt-4o-custom");
    });
  });

  describe("generateImage (text-to-image)", () => {
    it("calls images.generate and returns buffer from b64_json", async () => {
      const fakeB64 = Buffer.from("fake-image-data").toString("base64");
      mockGenerate.mockResolvedValue({
        data: [{ b64_json: fakeB64 }],
      });

      const client = new OpenAIImageClient("sk-test-key", OPENAI_IMAGE_CANDIDATE_PROFILE);
      const result = await client.generateImage("a crayon illustration of a cat");

      expect(result).toBeInstanceOf(Buffer);
      expect(result.toString()).toBe("fake-image-data");
      expect(mockGenerate).toHaveBeenCalledOnce();
      expect(mockGenerate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: "gpt-image-1-mini",
          prompt: "a crayon illustration of a cat",
          n: 1,
          size: "1024x1024",
          moderation: "low",
          quality: "low",
          output_format: "png",
        })
      );
    });

    it("downloads from url if b64_json is not present", async () => {
      const fakeImageBuffer = Buffer.from("downloaded-image");
      mockGenerate.mockResolvedValue({
        data: [{ url: "https://example.com/image.png" }],
      });

      // Mock global fetch
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(fakeImageBuffer.buffer.slice(
          fakeImageBuffer.byteOffset,
          fakeImageBuffer.byteOffset + fakeImageBuffer.byteLength
        )),
      });
      vi.stubGlobal("fetch", mockFetch);

      const client = new OpenAIImageClient("sk-test-key", OPENAI_IMAGE_CANDIDATE_PROFILE);
      const result = await client.generateImage("test prompt");

      expect(result).toBeInstanceOf(Buffer);
      expect(mockFetch).toHaveBeenCalledWith("https://example.com/image.png");

      vi.unstubAllGlobals();
    });

    it("throws if no data returned", async () => {
      mockGenerate.mockResolvedValue({ data: [] });

      const client = new OpenAIImageClient("sk-test-key", OPENAI_IMAGE_CANDIDATE_PROFILE);
      await expect(client.generateImage("test")).rejects.toThrow("No image output from OpenAI Image API");
    });
  });

  describe("generateImage (gpt-image-2 reference images via Images edit API)", () => {
    it("routes gpt-image-2 reference images through images.edit, not responses.create", async () => {
      const fakeB64 = Buffer.from("edit-image-data").toString("base64");
      mockEdit.mockResolvedValue({ data: [{ b64_json: fakeB64 }] });
      const fetchSpy = vi
        .fn()
        .mockResolvedValue({ ok: true, arrayBuffer: async () => new ArrayBuffer(8) });
      vi.stubGlobal("fetch", fetchSpy);

      const client = new OpenAIImageClient("sk-test-key", OPENAI_GPT_IMAGE_2_PROFILE);
      const result = await client.generateImage("a watercolor child", {
        inputImageUrls: ["https://example.com/child-ref.png"],
      });

      expect(result.toString()).toBe("edit-image-data");
      expect(mockEdit).toHaveBeenCalledOnce();
      expect(mockResponsesCreate).not.toHaveBeenCalled();

      const call = mockEdit.mock.calls[0][0];
      expect(call.model).toBe("gpt-image-2");
      expect(Array.isArray(call.image)).toBe(true);
      expect(call.image).toHaveLength(1);
      expect(call.prompt).toContain("a watercolor child");
      // reference image was downloaded before being passed to the edit endpoint
      expect(fetchSpy).toHaveBeenCalledWith("https://example.com/child-ref.png");

      vi.unstubAllGlobals();
    });
  });

  describe("generateImage (with reference images)", () => {
    it("calls responses.create when inputImageUrls are provided", async () => {
      const fakeB64 = Buffer.from("ref-image-data").toString("base64");
      mockResponsesCreate.mockResolvedValue({
        output: [{ type: "image_generation_call", result: fakeB64 }],
      });

      const client = new OpenAIImageClient("sk-test-key", OPENAI_IMAGE_CANDIDATE_PROFILE);
      const result = await client.generateImage("a cat with reference", {
        inputImageUrls: ["https://example.com/ref1.png"],
      });

      expect(result).toBeInstanceOf(Buffer);
      expect(result.toString()).toBe("ref-image-data");
      expect(mockResponsesCreate).toHaveBeenCalledOnce();

      const call = mockResponsesCreate.mock.calls[0][0];
      expect(call.model).toBe("gpt-4o");

      // system message is first (T6-53 hardening)
      expect(call.input).toHaveLength(2);
      expect(call.input[0]).toMatchObject({ role: "system" });
      expect(typeof call.input[0].content).toBe("string");
      expect(call.input[0].content).toContain("NEVER output a photograph");

      // user message is second
      expect(call.input[1]).toMatchObject({ role: "user" });
      const userContent = call.input[1].content;
      const imageInputs = userContent.filter((c: any) => c.type === "input_image");
      const textInputs = userContent.filter((c: any) => c.type === "input_text");
      expect(imageInputs).toHaveLength(1);
      expect(imageInputs[0].image_url).toBe("https://example.com/ref1.png");
      expect(textInputs).toHaveLength(1);
      // prompt is wrapped with hardening prefix/suffix
      expect(textInputs[0].text).toContain("a cat with reference");
      expect(textInputs[0].text).toContain("GENERATE ILLUSTRATION");
      expect(textInputs[0].text).toContain("REMINDER");
    });

    it("hardening: system instruction and prompt wrap are applied (T6-53)", async () => {
      const fakeB64 = Buffer.from("data").toString("base64");
      mockResponsesCreate.mockResolvedValue({
        output: [{ type: "image_generation_call", result: fakeB64 }],
      });

      const client = new OpenAIImageClient("sk-test-key", OPENAI_IMAGE_CANDIDATE_PROFILE);
      await client.generateImage("draw a forest scene", {
        inputImageUrls: ["https://example.com/child.png"],
      });

      const call = mockResponsesCreate.mock.calls[0][0];

      // system message exactly matches the exported constant
      expect(call.input[0].content).toBe(REFERENCE_IMAGE_SYSTEM_INSTRUCTION);

      // prompt text = prefix + original + suffix
      const textItem = call.input[1].content.find((c: any) => c.type === "input_text");
      expect(textItem.text).toBe(
        REFERENCE_IMAGE_PROMPT_PREFIX + "draw a forest scene" + REFERENCE_IMAGE_PROMPT_SUFFIX
      );
    });

    it("limits reference images to 14", async () => {
      const fakeB64 = Buffer.from("data").toString("base64");
      mockResponsesCreate.mockResolvedValue({
        output: [{ type: "image_generation_call", result: fakeB64 }],
      });

      const urls = Array.from({ length: 20 }, (_, i) => `https://example.com/ref${i}.png`);
      const client = new OpenAIImageClient("sk-test-key", OPENAI_IMAGE_CANDIDATE_PROFILE);
      await client.generateImage("test", { inputImageUrls: urls });

      const call = mockResponsesCreate.mock.calls[0][0];
      // user message is at input[1] (input[0] is system message)
      const imageInputs = call.input[1].content.filter((c: any) => c.type === "input_image");
      expect(imageInputs).toHaveLength(14);
    });

    it("throws if no image output from Responses API", async () => {
      mockResponsesCreate.mockResolvedValue({ output: [] });

      const client = new OpenAIImageClient("sk-test-key", OPENAI_IMAGE_CANDIDATE_PROFILE);
      await expect(
        client.generateImage("test", { inputImageUrls: ["https://example.com/ref.png"] })
      ).rejects.toThrow("No image output from OpenAI Responses API");
    });
  });

  describe("constructor", () => {
    it("uses default profile when none specified", () => {
      const client = new OpenAIImageClient("sk-test-key");
      // Client should be created without error
      expect(client).toBeDefined();
    });
  });
});

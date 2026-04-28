import { describe, it, expect, vi, beforeEach } from "vitest";
import { ReplicateImageClient } from "../src/lib/replicate";

const mockRun = vi.fn();

vi.mock("replicate", () => {
  return {
    default: vi.fn().mockImplementation(() => ({ run: mockRun })),
  };
});

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

describe("ReplicateImageClient", () => {
  let client: ReplicateImageClient;

  beforeEach(() => {
    vi.clearAllMocks();
    client = new ReplicateImageClient("fake-token");
  });

  it("calls FLUX Schnell model with the given prompt when no reference images are provided", async () => {
    const fakeImageData = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);
    mockRun.mockResolvedValue(["https://replicate.delivery/fake-image.png"]);
    mockFetch.mockResolvedValue({ ok: true, arrayBuffer: () => Promise.resolve(fakeImageData.buffer) });

    const result = await client.generateImage("A child at a birthday party");
    expect(mockRun).toHaveBeenCalledWith("black-forest-labs/flux-schnell", expect.objectContaining({
      input: expect.objectContaining({ prompt: "A child at a birthday party" }),
    }));
    expect(result).toBeInstanceOf(Buffer);
  });

  it("calls FLUX reference model with input images when provided", async () => {
    const fakeImageData = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);
    mockRun.mockResolvedValue(["https://replicate.delivery/fake-image.png"]);
    mockFetch.mockResolvedValue({ ok: true, arrayBuffer: () => Promise.resolve(fakeImageData.buffer) });

    const result = await client.generateImage("A child in a meadow", {
      inputImageUrls: ["https://example.com/style.png", "https://example.com/style.png"],
    });

    expect(mockRun).toHaveBeenCalledWith("black-forest-labs/flux-2-pro", expect.objectContaining({
      input: expect.objectContaining({
        prompt: "A child in a meadow",
        input_images: ["https://example.com/style.png"],
      }),
    }));
    expect(result).toBeInstanceOf(Buffer);
  });

  it("supports a single URI string returned by reference models", async () => {
    const fakeImageData = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);
    mockRun.mockResolvedValue("https://replicate.delivery/fake-image.png");
    mockFetch.mockResolvedValue({ ok: true, arrayBuffer: () => Promise.resolve(fakeImageData.buffer) });

    const result = await client.generateImage("A child in a meadow", {
      inputImageUrls: ["https://example.com/style.png"],
    });

    expect(result).toBeInstanceOf(Buffer);
  });

  it("supports FileOutput objects returned by Replicate", async () => {
    const fakeImageData = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);
    const fakeOutput = { url: () => "https://replicate.delivery/fake-image.png" };
    mockRun.mockResolvedValue([fakeOutput]);
    mockFetch.mockResolvedValue({ ok: true, arrayBuffer: () => Promise.resolve(fakeImageData.buffer) });

    const result = await client.generateImage("A child at a birthday party");
    expect(result).toBeInstanceOf(Buffer);
  });

  it("supports an output URI string wrapped in an object", async () => {
    const fakeImageData = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);
    mockRun.mockResolvedValue({ output: "https://replicate.delivery/fake-image.png" });
    mockFetch.mockResolvedValue({ ok: true, arrayBuffer: () => Promise.resolve(fakeImageData.buffer) });

    const result = await client.generateImage("A child at a birthday party");
    expect(result).toBeInstanceOf(Buffer);
  });

  it("throws when Replicate returns no output", async () => {
    mockRun.mockResolvedValue([]);
    await expect(client.generateImage("test prompt")).rejects.toThrow("No image output from Replicate");
  });

  it("throws when image download fails", async () => {
    mockRun.mockResolvedValue(["https://replicate.delivery/fake-image.png"]);
    mockFetch.mockResolvedValue({ ok: false, status: 500, statusText: "Internal Server Error" });
    await expect(client.generateImage("test prompt")).rejects.toThrow("Failed to download image");
  });
});

/**
 * P3-11: image-storage-uploader tests.
 *
 * Covers:
 *  1. makePageUploader — returns a function
 *  2. makePageUploader — calls uploadImage with correct bookId, pageNumber, buffer
 *  3. makePageUploader — profile argument is ignored (not forwarded to uploadImage)
 *  4. makePageUploader — closure captures bookId and pageNumber at creation time
 *  5. makePageUploader — passes return value (URL) through from uploadImage
 *  6. makePageUploader — propagates errors from uploadImage
 *  7. makePageUploader — two independent closures do not interfere
 *  8. makePageUploader — uploadImage not called during closure creation
 *  9. Type compatibility — AdapterStorageUploader matches ReplicateStorageUploader and
 *     OpenAIStorageUploader shapes (compile-time check, runtime no-op)
 *
 * Constraints:
 *  - No network calls.
 *  - No Firestore writes.
 *  - generate-book.ts not imported.
 *  - No Firebase Admin SDK.
 */

import { describe, it, expect, vi } from "vitest";
import {
  makePageUploader,
  type PageImageUploadFn,
  type AdapterStorageUploader,
} from "../src/lib/image-storage-uploader";
import type { ReplicateStorageUploader } from "../src/lib/replicate-image-adapter";
import type { OpenAIStorageUploader } from "../src/lib/openai-image-adapter";
import type { ImageModelProfile } from "../src/lib/types";

// -------------------------------------------------------------------------
// Test helpers
// -------------------------------------------------------------------------

function makeBuffer(content = "img"): Buffer {
  return Buffer.from(content);
}

// -------------------------------------------------------------------------
// 1. Returns a function
// -------------------------------------------------------------------------

describe("makePageUploader — returns a function", () => {
  it("returns an async function", () => {
    const uploadImage = vi.fn<PageImageUploadFn>().mockResolvedValue("https://example.com/a.png");
    const uploader = makePageUploader({ bookId: "book-1", pageNumber: 0, uploadImage });
    expect(typeof uploader).toBe("function");
  });
});

// -------------------------------------------------------------------------
// 2. Calls uploadImage with correct args
// -------------------------------------------------------------------------

describe("makePageUploader — delegates to uploadImage with correct args", () => {
  it("passes bookId, pageNumber, and buffer to uploadImage", async () => {
    const uploadImage = vi.fn<PageImageUploadFn>().mockResolvedValue("https://example.com/img.png");
    const buffer = makeBuffer("pixel-data");
    const uploader = makePageUploader({
      bookId: "book-abc",
      pageNumber: 3,
      uploadImage,
    });

    await uploader(buffer, "klein_fast");

    expect(uploadImage).toHaveBeenCalledOnce();
    expect(uploadImage).toHaveBeenCalledWith("book-abc", 3, buffer);
  });
});

// -------------------------------------------------------------------------
// 3. Profile argument is ignored
// -------------------------------------------------------------------------

describe("makePageUploader — profile argument is ignored", () => {
  it.each<ImageModelProfile>([
    "klein_fast",
    "pro_consistent",
    "openai_image_candidate",
    "flux11_pro_candidate",
  ])("profile %s is not forwarded to uploadImage", async (profile) => {
    const uploadImage = vi.fn<PageImageUploadFn>().mockResolvedValue("https://example.com/x.png");
    const uploader = makePageUploader({ bookId: "b1", pageNumber: 0, uploadImage });

    await uploader(makeBuffer(), profile);

    // uploadImage receives exactly 3 arguments (bookId, pageNumber, buffer) — no profile
    expect(uploadImage).toHaveBeenCalledWith("b1", 0, expect.any(Buffer));
    const [arg1, arg2, arg3] = uploadImage.mock.calls[0]!;
    expect(arg1).toBe("b1");
    expect(arg2).toBe(0);
    expect(arg3).toBeInstanceOf(Buffer);
  });
});

// -------------------------------------------------------------------------
// 4. Closure captures bookId and pageNumber at creation time
// -------------------------------------------------------------------------

describe("makePageUploader — closure captures bookId and pageNumber", () => {
  it("uses bookId and pageNumber from construction, not from call time", async () => {
    const uploadImage = vi.fn<PageImageUploadFn>().mockResolvedValue("https://example.com/z.png");
    const uploader = makePageUploader({
      bookId: "book-xyz",
      pageNumber: 7,
      uploadImage,
    });

    await uploader(makeBuffer(), "pro_consistent");

    expect(uploadImage).toHaveBeenCalledWith("book-xyz", 7, expect.any(Buffer));
  });

  it("different page numbers produce independent closures", async () => {
    const uploadImage = vi.fn<PageImageUploadFn>().mockResolvedValue("https://example.com/img.png");

    const uploader0 = makePageUploader({ bookId: "book-1", pageNumber: 0, uploadImage });
    const uploader4 = makePageUploader({ bookId: "book-1", pageNumber: 4, uploadImage });

    await uploader0(makeBuffer("a"), "klein_fast");
    await uploader4(makeBuffer("b"), "klein_fast");

    expect(uploadImage).toHaveBeenNthCalledWith(1, "book-1", 0, expect.any(Buffer));
    expect(uploadImage).toHaveBeenNthCalledWith(2, "book-1", 4, expect.any(Buffer));
  });

  it("different bookIds produce independent closures", async () => {
    const uploadImage = vi.fn<PageImageUploadFn>().mockResolvedValue("https://example.com/img.png");

    const uploaderA = makePageUploader({ bookId: "book-A", pageNumber: 0, uploadImage });
    const uploaderB = makePageUploader({ bookId: "book-B", pageNumber: 0, uploadImage });

    await uploaderA(makeBuffer(), "klein_fast");
    await uploaderB(makeBuffer(), "klein_fast");

    expect(uploadImage).toHaveBeenNthCalledWith(1, "book-A", 0, expect.any(Buffer));
    expect(uploadImage).toHaveBeenNthCalledWith(2, "book-B", 0, expect.any(Buffer));
  });
});

// -------------------------------------------------------------------------
// 5. Passes return value (URL) through
// -------------------------------------------------------------------------

describe("makePageUploader — passes URL return value through", () => {
  it("returns the URL from uploadImage", async () => {
    const expectedUrl = "https://storage.googleapis.com/bucket/books/b1/page_0.png";
    const uploadImage = vi.fn<PageImageUploadFn>().mockResolvedValue(expectedUrl);
    const uploader = makePageUploader({ bookId: "b1", pageNumber: 0, uploadImage });

    const result = await uploader(makeBuffer(), "klein_fast");

    expect(result).toBe(expectedUrl);
  });
});

// -------------------------------------------------------------------------
// 6. Propagates errors from uploadImage
// -------------------------------------------------------------------------

describe("makePageUploader — propagates errors from uploadImage", () => {
  it("rethrows errors thrown by uploadImage", async () => {
    const uploadError = new Error("Cloud Storage upload failed");
    const uploadImage = vi.fn<PageImageUploadFn>().mockRejectedValue(uploadError);
    const uploader = makePageUploader({ bookId: "b1", pageNumber: 0, uploadImage });

    await expect(uploader(makeBuffer(), "klein_fast")).rejects.toThrow(
      "Cloud Storage upload failed"
    );
  });
});

// -------------------------------------------------------------------------
// 7. Two independent closures do not interfere
// -------------------------------------------------------------------------

describe("makePageUploader — independent closures do not interfere", () => {
  it("separate upload functions each delegate to their own uploadImage", async () => {
    const uploadImageA = vi.fn<PageImageUploadFn>().mockResolvedValue("https://a.example.com/1.png");
    const uploadImageB = vi.fn<PageImageUploadFn>().mockResolvedValue("https://b.example.com/2.png");

    const uploaderA = makePageUploader({ bookId: "book-A", pageNumber: 1, uploadImage: uploadImageA });
    const uploaderB = makePageUploader({ bookId: "book-B", pageNumber: 2, uploadImage: uploadImageB });

    const urlA = await uploaderA(makeBuffer("data-a"), "pro_consistent");
    const urlB = await uploaderB(makeBuffer("data-b"), "klein_fast");

    expect(urlA).toBe("https://a.example.com/1.png");
    expect(urlB).toBe("https://b.example.com/2.png");
    expect(uploadImageA).toHaveBeenCalledWith("book-A", 1, expect.any(Buffer));
    expect(uploadImageB).toHaveBeenCalledWith("book-B", 2, expect.any(Buffer));
    expect(uploadImageA).toHaveBeenCalledOnce();
    expect(uploadImageB).toHaveBeenCalledOnce();
  });
});

// -------------------------------------------------------------------------
// 8. uploadImage not called during closure creation
// -------------------------------------------------------------------------

describe("makePageUploader — no upload call at construction time", () => {
  it("uploadImage is not called when makePageUploader is called", () => {
    const uploadImage = vi.fn<PageImageUploadFn>().mockResolvedValue("https://example.com/img.png");
    makePageUploader({ bookId: "book-1", pageNumber: 0, uploadImage });
    expect(uploadImage).not.toHaveBeenCalled();
  });
});

// -------------------------------------------------------------------------
// 9. Type compatibility checks (compile-time; runtime is a no-op)
// -------------------------------------------------------------------------

describe("type compatibility — AdapterStorageUploader matches adapter uploader types", () => {
  it("makePageUploader result is assignable to AdapterStorageUploader (explicit annotation)", () => {
    const uploadImage = vi.fn<PageImageUploadFn>().mockResolvedValue("https://example.com/img.png");
    // Explicit type annotation: if the type is wrong, TypeScript will error at build.
    const uploader: AdapterStorageUploader = makePageUploader({
      bookId: "b1",
      pageNumber: 0,
      uploadImage,
    });
    expect(typeof uploader).toBe("function");
  });

  it("AdapterStorageUploader is assignable to ReplicateStorageUploader (same shape)", () => {
    const uploadImage = vi.fn<PageImageUploadFn>().mockResolvedValue("https://example.com/img.png");
    const adapter: AdapterStorageUploader = makePageUploader({
      bookId: "b1",
      pageNumber: 0,
      uploadImage,
    });
    // If shapes differ, TypeScript will error here.
    const replicateUploader: ReplicateStorageUploader = adapter;
    expect(typeof replicateUploader).toBe("function");
  });

  it("AdapterStorageUploader is assignable to OpenAIStorageUploader (same shape)", () => {
    const uploadImage = vi.fn<PageImageUploadFn>().mockResolvedValue("https://example.com/img.png");
    const adapter: AdapterStorageUploader = makePageUploader({
      bookId: "b1",
      pageNumber: 0,
      uploadImage,
    });
    // If shapes differ, TypeScript will error here.
    const openaiUploader: OpenAIStorageUploader = adapter;
    expect(typeof openaiUploader).toBe("function");
  });
});

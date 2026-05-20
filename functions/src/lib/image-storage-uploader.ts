/**
 * P3-11: Storage uploader abstraction for ImageProvider adapters.
 *
 * This module bridges two upload signatures that exist in the codebase:
 *
 *   generate-book.ts (existing production signature):
 *     deps.uploadImage(bookId, pageNumber, buffer): Promise<string>
 *
 *   ImageProvider adapters (P3-3 / P3-4 expected uploader signature):
 *     (buffer, profile) => Promise<string>
 *
 * makePageUploader() returns a closure that binds bookId + pageNumber and
 * ignores the adapter's `profile` argument, so the adapter can call it without
 * needing to know about the generate-book.ts signature.
 *
 * Design constraints:
 *  - THIS FILE IS NOT IMPORTED FROM generate-book.ts as of P3-11.
 *    Production flow continues to call deps.uploadImage() directly.
 *  - No Firestore writes, no network calls, no environment variable reads.
 *  - No firebase-admin or cloud storage SDK imports here — purely functional glue.
 *
 * Migration status:
 *  P3-11  COMPLETE — abstraction created, NOT wired to production generation path.
 *  P3-13  FUTURE   — pass makePageUploader() result as uploader when constructing
 *                    ReplicateImageAdapter in the production path.
 *  P3-14  FUTURE   — same wiring for OpenAIImageAdapter (enrolled users only).
 */

import type { ImageModelProfile } from "./types";

// -------------------------------------------------------------------------
// Types
// -------------------------------------------------------------------------

/**
 * The upload callback signature used in generate-book.ts GenerationDeps.
 *
 *   deps.uploadImage(bookId, pageNumber, buffer): Promise<string>
 *
 * Returns the public URL of the persisted image.
 * Privacy: must never include the prompt or any PII in the URL.
 */
export type PageImageUploadFn = (
  bookId: string,
  pageNumber: number,
  buffer: Buffer
) => Promise<string>;

/**
 * The upload callback signature expected by ImageProvider adapters
 * (ReplicateStorageUploader / OpenAIStorageUploader).
 *
 *   (buffer, profile) => Promise<string>
 *
 * This type is intentionally compatible with both ReplicateStorageUploader
 * (replicate-image-adapter.ts) and OpenAIStorageUploader (openai-image-adapter.ts).
 * They share the same shape — no cast is required.
 */
export type AdapterStorageUploader = (
  buffer: Buffer,
  profile: ImageModelProfile
) => Promise<string>;

// -------------------------------------------------------------------------
// Factory
// -------------------------------------------------------------------------

/**
 * Create an AdapterStorageUploader closure that delegates to an existing
 * PageImageUploadFn with pre-bound bookId and pageNumber.
 *
 * Usage (future — P3-13+):
 * ```ts
 * const uploader = makePageUploader({
 *   bookId,
 *   pageNumber: i,
 *   uploadImage: deps.uploadImage,
 * });
 * const adapter = new ReplicateImageAdapter(replicateApiToken, uploader);
 * ```
 *
 * The `profile` argument received by the adapter uploader is intentionally ignored.
 * Profile-routing decisions are made upstream; the uploader only persists the bytes.
 *
 * NOT called from production code in P3-11.
 */
export function makePageUploader(params: {
  bookId: string;
  pageNumber: number;
  uploadImage: PageImageUploadFn;
}): AdapterStorageUploader {
  const { bookId, pageNumber, uploadImage } = params;
  return async (buffer: Buffer, _profile: ImageModelProfile): Promise<string> => {
    return uploadImage(bookId, pageNumber, buffer);
  };
}

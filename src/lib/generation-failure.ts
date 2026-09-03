/**
 * 生成失敗の分類（generating ページ / 絵本ページ共通）。
 *
 * 以前は「failureStage=validation かつ failureProvider=system」をすべて「月次クォータ超過」と見なして
 * アップグレード導線を出し、再試行ボタンを隠していた。しかし同じ組み合わせは
 * レート制限・NGワード・想定外エラー（catch-all）でも書かれるため、誤った案内になっていた。
 * サーバは 2026-09-03 以降 failureReason: "quota_exceeded" を明示する。古い絵本は errorMessage で判定する。
 */
export interface GenerationFailureLike {
  failureStage?: string;
  failureProvider?: string;
  failureReason?: string;
  errorMessage?: string | null;
}

export function isQuotaExceededFailure(book: GenerationFailureLike): boolean {
  if (book.failureReason === "quota_exceeded") return true;
  // 後方互換: failureReason を持たない古い失敗は文言で判定
  if (!book.failureReason || book.failureReason === "unknown") {
    return typeof book.errorMessage === "string" && book.errorMessage.includes("今月の");
  }
  return false;
}

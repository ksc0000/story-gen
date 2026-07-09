/**
 * 生成画像の健全性ガード。
 *
 * 背景: OpenAI 画像生成はセーフティ介入時などに「真っ黒な画像」を
 * 正常レスポンスとして返すことがある（本番事例: book j7Hfozt8SsqS3u0C9dVH の
 * 表紙が 1024x1024 の黒一色 42KB で保存された）。パイプラインは成功と
 * みなして保存してしまうため、バッファサイズで検出して失敗として投げ、
 * 既存のリトライ/フォールバック機構に載せる。
 *
 * 判定根拠: 本パイプラインの正常な 1024px 級イラスト PNG は 1.3〜2.3MB。
 * 黒・単色・ほぼ単色の画像は PNG 圧縮で数十 KB まで縮む。100KB を下回る
 * 「イラスト」は事実上あり得ないため、閾値は十分に安全側。
 */

const MIN_PLAUSIBLE_IMAGE_BYTES = 100 * 1024;

export class ImplausibleImageError extends Error {
  constructor(byteLength: number, context: string) {
    super(
      `blank_or_uniform_image_suspected: generated image is only ${byteLength} bytes (${context}); ` +
        "treating as a failed generation to trigger retry/fallback"
    );
    this.name = "ImplausibleImageError";
  }
}

export function isPlausibleImageBuffer(buffer: Buffer): boolean {
  return buffer.byteLength >= MIN_PLAUSIBLE_IMAGE_BYTES;
}

/** 疑わしい（黒/単色とみられる）画像バッファなら例外を投げる。 */
export function assertPlausibleImageBuffer(buffer: Buffer, context: string): Buffer {
  if (!isPlausibleImageBuffer(buffer)) {
    throw new ImplausibleImageError(buffer.byteLength, context);
  }
  return buffer;
}

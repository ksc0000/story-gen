/**
 * 画像（File または URL）を縮小して base64（data URL 接頭辞なし）に変換する。
 * 写真解析 callable へ送る前段。長辺を maxSize に収め、JPEG に再エンコードして軽量化する。
 */
export interface DownscaledImage {
  imageBase64: string;
  mimeType: "image/jpeg";
}

async function loadImageElement(source: File | string): Promise<{ img: HTMLImageElement; revoke?: () => void }> {
  if (typeof source === "string") {
    // Firebase Storage の download URL を CORS 込みで取得（失敗時は例外）。
    const resp = await fetch(source, { mode: "cors" });
    if (!resp.ok) throw new Error("image_fetch_failed");
    const blob = await resp.blob();
    const objectUrl = URL.createObjectURL(blob);
    const img = await decode(objectUrl);
    return { img, revoke: () => URL.revokeObjectURL(objectUrl) };
  }
  const objectUrl = URL.createObjectURL(source);
  const img = await decode(objectUrl);
  return { img, revoke: () => URL.revokeObjectURL(objectUrl) };
}

function decode(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("image_decode_failed"));
    img.src = src;
  });
}

export async function downscaleImageToBase64(
  source: File | string,
  maxSize = 1024,
  quality = 0.85
): Promise<DownscaledImage> {
  const { img, revoke } = await loadImageElement(source);
  try {
    const scale = Math.min(1, maxSize / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.max(1, Math.round(img.naturalWidth * scale));
    const h = Math.max(1, Math.round(img.naturalHeight * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("canvas_unavailable");
    ctx.drawImage(img, 0, 0, w, h);
    const dataUrl = canvas.toDataURL("image/jpeg", quality);
    const base64 = dataUrl.split(",")[1] ?? "";
    if (!base64) throw new Error("encode_failed");
    return { imageBase64: base64, mimeType: "image/jpeg" };
  } finally {
    revoke?.();
  }
}

import type { MetadataRoute } from "next";

// 静的エクスポート（output: "export"）のため明示的に静的化する。
export const dynamic = "force-static";

const SITE_URL = "https://ehoria.app";

/** 公開（非認証）ページのみを列挙。アプリ内ページは認証必須のため含めない。 */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const paths = ["/", "/login/", "/legal/terms/", "/legal/privacy/", "/legal/tokushoho/"];
  return paths.map((path) => ({
    url: `${SITE_URL}${path}`,
    lastModified: now,
    changeFrequency: path === "/" ? "weekly" : "monthly",
    priority: path === "/" ? 1 : 0.5,
  }));
}

import type { MetadataRoute } from "next";

// 静的エクスポート（output: "export"）のため明示的に静的化する。
export const dynamic = "force-static";

const SITE_URL = "https://ehoria.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // 認証必須・管理用ページはクロール対象外。
      disallow: [
        "/home/",
        "/book/",
        "/bookshelf/",
        "/children/",
        "/create/",
        "/companions/",
        "/generating/",
        "/onboarding/",
        "/settings/",
        "/admin/",
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}

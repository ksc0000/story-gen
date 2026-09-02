import { describe, it, expect } from "vitest";
import {
  escapeHtml,
  isValidBookId,
  isSafeImageUrl,
  buildOgpTags,
  injectOgpIntoShell,
} from "../src/lib/share-ogp-html";

const SHELL = `<!DOCTYPE html><html><head><title>Ehoria - AIで絵本を作ろう</title><meta name="description" content="共通説明"><meta property="og:title" content="共通OG"><meta name="twitter:card" content="summary"></head><body><div id="__next"></div></body></html>`;

describe("share-ogp-html", () => {
  describe("escapeHtml", () => {
    it("escapes html special characters", () => {
      expect(escapeHtml(`<script>"a"&'b'</script>`)).toBe(
        "&lt;script&gt;&quot;a&quot;&amp;&#39;b&#39;&lt;/script&gt;"
      );
    });
  });

  describe("isValidBookId", () => {
    it("accepts firestore-style ids", () => {
      expect(isValidBookId("Abc123-_xyz")).toBe(true);
    });
    it("rejects invalid ids", () => {
      expect(isValidBookId("")).toBe(false);
      expect(isValidBookId("ab")).toBe(false);
      expect(isValidBookId("a".repeat(41))).toBe(false);
      expect(isValidBookId("abc/def")).toBe(false);
      expect(isValidBookId(["abc12"])).toBe(false);
      expect(isValidBookId(undefined)).toBe(false);
    });
  });

  describe("isSafeImageUrl", () => {
    it("accepts https urls", () => {
      expect(isSafeImageUrl("https://firebasestorage.googleapis.com/v0/b/x/o/cover.png?alt=media")).toBe(true);
    });
    it("rejects http, javascript, and injection attempts", () => {
      expect(isSafeImageUrl("http://example.com/a.png")).toBe(false);
      expect(isSafeImageUrl("javascript:alert(1)")).toBe(false);
      expect(isSafeImageUrl('https://a.com/x.png"><script>')).toBe(false);
      expect(isSafeImageUrl(null)).toBe(false);
    });
  });

  describe("buildOgpTags", () => {
    it("builds book meta when title is present", () => {
      const { pageTitle, tags } = buildOgpTags({
        title: "たろうのぼうけん",
        coverImageUrl: "https://example.com/cover.png",
        shareUrl: "https://ehoria.app/share?id=abc12",
      });
      expect(pageTitle).toBe("たろうのぼうけん | Ehoria");
      expect(tags).toContain('og:title" content="たろうのぼうけん | Ehoria"');
      expect(tags).toContain('og:image" content="https://example.com/cover.png"');
      expect(tags).toContain('twitter:card" content="summary_large_image"');
      expect(tags).toContain('name="robots" content="noindex"');
    });

    it("falls back to site meta without title, omits image when unsafe", () => {
      const { pageTitle, tags } = buildOgpTags({
        title: null,
        coverImageUrl: "http://insecure.example/cover.png",
        shareUrl: "https://ehoria.app/share",
      });
      expect(pageTitle).toBe("Ehoria - AIで絵本を作ろう");
      expect(tags).not.toContain("og:image");
      expect(tags).toContain('twitter:card" content="summary"');
    });

    it("escapes title to prevent meta injection", () => {
      const { tags } = buildOgpTags({
        title: `"><script>x</script>`,
        coverImageUrl: null,
        shareUrl: "https://ehoria.app/share?id=abc12",
      });
      expect(tags).not.toContain("<script>");
      expect(tags).toContain("&lt;script&gt;");
    });
  });

  describe("injectOgpIntoShell", () => {
    it("replaces title, strips old meta, injects new tags before </head>", () => {
      const html = injectOgpIntoShell(SHELL, {
        title: "たろうのぼうけん",
        coverImageUrl: "https://example.com/c.png",
        shareUrl: "https://ehoria.app/share?id=abc12",
      });
      expect(html).toContain("<title>たろうのぼうけん | Ehoria</title>");
      expect(html).not.toContain("共通OG");
      expect(html).not.toContain('content="共通説明"');
      expect(html.match(/og:title/g)?.length).toBe(1);
      expect(html.indexOf("og:title")).toBeLessThan(html.indexOf("</head>"));
      expect(html).toContain('<div id="__next">');
    });

    it("returns original html when shell has no </head>", () => {
      const broken = "<html><body>no head</body></html>";
      expect(
        injectOgpIntoShell(broken, { title: "t-abc1", coverImageUrl: null, shareUrl: "https://ehoria.app/share" })
      ).toBe(broken);
    });
  });

  describe("String.replace の特殊パターンに対する耐性（回帰）", () => {
    it.each(["$'", "$&", "$`", "$1", "$$"])("タイトルに %s が含まれてもシェルを複製しない", (bad) => {
      const html = injectOgpIntoShell(SHELL, {
        title: `おはなし ${bad} ここまで`,
        coverImageUrl: null,
        shareUrl: "https://ehoria.app/share?id=abc12",
      });
      // <title> は1つ、</head> は1つ、__next は1つのまま
      expect(html.match(/<title>/g)?.length).toBe(1);
      expect(html.match(/<\/head>/g)?.length).toBe(1);
      expect(html.match(/id="__next"/g)?.length).toBe(1);
      expect(html.length).toBeLessThan(SHELL.length + 2000);
    });
  });
});

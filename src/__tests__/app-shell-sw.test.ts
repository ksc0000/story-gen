import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("PWA App Shell SW & Manifest Tests", () => {
  it("app-shell-manifest.json exists in public/ or out/ and contains expected assets", () => {
    const publicManifestPath = path.resolve(process.cwd(), "public/app-shell-manifest.json");
    const outManifestPath = path.resolve(process.cwd(), "out/app-shell-manifest.json");

    const manifestPath = fs.existsSync(outManifestPath) ? outManifestPath : publicManifestPath;
    expect(fs.existsSync(manifestPath)).toBe(true);

    const content = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
    expect(content).toHaveProperty("version");
    expect(Array.isArray(content.urls)).toBe(true);

    if (fs.existsSync(outManifestPath)) {
      expect(content.urls).toContain("/index.html");
      expect(content.urls).toContain("/book/index.html");
      expect(content.urls.some((u: string) => u.startsWith("/_next/static/"))).toBe(true);
    }
  });

  it("firebase-messaging-sw.js includes app shell precache and navigation fallback handlers", () => {
    const swPath = path.resolve(process.cwd(), "public/firebase-messaging-sw.js");
    const swCode = fs.readFileSync(swPath, "utf-8");

    expect(swCode).toContain("APP_SHELL_CACHE_PREFIX");
    expect(swCode).toContain("app-shell-manifest.json");
    expect(swCode).toContain("precacheAppShell");
    expect(swCode).toContain("/_next/static/");
    expect(swCode).toContain("request.mode === \"navigate\"");
    expect(swCode).toContain("matchAppShellHtml");
    expect(swCode).toContain("getActiveAppShellCache");
  });

  it("simulates matchAppShellHtml navigation fallback resolution logic", async () => {
    // Pure logic simulation of SW matchAppShellHtml behavior
    const mockCacheStore = new Map<string, string>();
    mockCacheStore.set("/book/index.html", "<html>Book Page Shell</html>");
    mockCacheStore.set("/index.html", "<html>Home Page Shell</html>");

    async function simulatedMatchAppShellHtml(targetHtml: string) {
      if (mockCacheStore.has(targetHtml)) return mockCacheStore.get(targetHtml);
      if (targetHtml.startsWith("/book/")) {
        if (mockCacheStore.has("/book/index.html")) return mockCacheStore.get("/book/index.html");
      }
      if (mockCacheStore.has("/index.html")) return mockCacheStore.get("/index.html");
      return null;
    }

    expect(await simulatedMatchAppShellHtml("/book/index.html")).toBe("<html>Book Page Shell</html>");
    expect(await simulatedMatchAppShellHtml("/book/123/index.html")).toBe("<html>Book Page Shell</html>");
    expect(await simulatedMatchAppShellHtml("/unknown/route/index.html")).toBe("<html>Home Page Shell</html>");
  });
});

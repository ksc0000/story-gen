import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const OUT_DIR = path.resolve(process.cwd(), "out");
const PUBLIC_DIR = path.resolve(process.cwd(), "public");

function getRelativeFiles(dir, baseDir = dir) {
  let results = [];
  if (!fs.existsSync(dir)) return results;

  const list = fs.readdirSync(dir);
  for (const file of list) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getRelativeFiles(filePath, baseDir));
    } else {
      const relPath = "/" + path.relative(baseDir, filePath).replace(/\\/g, "/");
      results.push(relPath);
    }
  }
  return results;
}

function generateManifest() {
  if (!fs.existsSync(OUT_DIR)) {
    console.warn("generate-sw-manifest: out/ directory does not exist. Skipping manifest generation.");
    return;
  }

  const allFiles = getRelativeFiles(OUT_DIR);

  // Filter relevant app shell assets
  const appShellUrls = allFiles.filter((fileUrl) => {
    // 1. Next.js static JS & CSS chunks
    if (fileUrl.startsWith("/_next/static/chunks/") || fileUrl.startsWith("/_next/static/css/")) {
      return !fileUrl.endsWith(".map");
    }
    // 2. Next.js build ID file
    if (fileUrl.startsWith("/_next/static/") && fileUrl.split("/").length === 4) {
      return true;
    }
    // 3. HTML routes
    if (fileUrl.endsWith(".html")) {
      return true;
    }
    // 4. Icons and manifest
    if (
      fileUrl.startsWith("/icons/") ||
      fileUrl === "/manifest.webmanifest" ||
      fileUrl === "/apple-icon.png" ||
      fileUrl === "/icon.png" ||
      fileUrl === "/favicon.ico"
    ) {
      return true;
    }
    return false;
  });

  // Calculate hash version based on manifest URLs and contents
  const hasher = crypto.createHash("sha256");
  for (const url of appShellUrls.sort()) {
    hasher.update(url);
    const filePath = path.join(OUT_DIR, url);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath);
      hasher.update(content);
    }
  }
  const version = hasher.digest("hex").slice(0, 12);

  const manifest = {
    version,
    urls: appShellUrls,
  };

  const manifestJson = JSON.stringify(manifest, null, 2);

  // Write to out/ for static export deployment
  fs.writeFileSync(path.join(OUT_DIR, "app-shell-manifest.json"), manifestJson);
  // Also write to public/ for local dev SW loading if public/ exists
  if (fs.existsSync(PUBLIC_DIR)) {
    fs.writeFileSync(path.join(PUBLIC_DIR, "app-shell-manifest.json"), manifestJson);
  }

  console.log(`generate-sw-manifest: Generated app-shell-manifest.json (v${version}) with ${appShellUrls.length} assets.`);
}

generateManifest();

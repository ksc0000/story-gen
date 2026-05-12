const { createRequire } = require("module");
const { resolve } = require("path");
const { existsSync, readFileSync } = require("fs");
const https = require("https");
const { execFileSync } = require("child_process");

const functionsRequire = createRequire(resolve(__dirname, "../functions/package.json"));
const { initializeApp, cert, getApps } = functionsRequire("firebase-admin/app");
const { getFirestore } = functionsRequire("firebase-admin/firestore");

const TARGET_PROJECT_ID = "story-gen-8a769";

function loadServiceAccountFromEnvPath() {
  const credentialPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!credentialPath || !existsSync(credentialPath)) {
    throw new Error("GOOGLE_APPLICATION_CREDENTIALS not set or file missing.");
  }

  const raw = readFileSync(credentialPath, "utf8");
  const parsed = JSON.parse(raw);

  const clientEmail = parsed.client_email || parsed.clientEmail;
  const privateKeyRaw = parsed.private_key || parsed.privateKey;
  const projectId = parsed.project_id || parsed.projectId;

  if (!clientEmail || !privateKeyRaw || !projectId) {
    throw new Error("Service account JSON is missing required keys.");
  }

  return { clientEmail, privateKey: privateKeyRaw, projectId };
}

function ensureAdminApp(serviceAccount) {
  if (getApps().length > 0) {
    return;
  }

  initializeApp({
    credential: cert(serviceAccount),
    projectId: serviceAccount.projectId,
  });
}

function checkUrlReachability(url) {
  return new Promise((resolve) => {
    https
      .request(url, { method: "HEAD", timeout: 5000 }, (res) => {
        resolve(res.statusCode >= 200 && res.statusCode < 400);
      })
      .on("error", () => resolve(false))
      .end();
  });
}

function checkUrlReachabilityWithPowerShell(url, timeoutSec = 8) {
  try {
    const script = `$ErrorActionPreference='Stop'; $r=Invoke-WebRequest -Uri '${String(url).replace(/'/g, "''")}' -Method Head -TimeoutSec ${timeoutSec} -UseBasicParsing; Write-Output $r.StatusCode`;
    const out = execFileSync("powershell", ["-NoProfile", "-Command", script], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      timeout: timeoutSec * 1000 + 2000,
    }).trim();
    const code = Number.parseInt(out, 10);
    return Number.isFinite(code) && code >= 200 && code < 400;
  } catch {
    return false;
  }
}

async function findOrCreateReferenceImageUrl() {
  const credentialPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!credentialPath || !existsSync(credentialPath)) {
    throw new Error("GOOGLE_APPLICATION_CREDENTIALS not set or file missing.");
  }

  const serviceAccount = loadServiceAccountFromEnvPath();
  if (serviceAccount.projectId !== TARGET_PROJECT_ID) {
    throw new Error("Service account project_id does not match target project.");
  }

  ensureAdminApp(serviceAccount);
  const db = getFirestore();

  console.log(`[setup] Looking for suitable reference image URL...`);

  // Try to find an existing profile with a reference or approved image
  console.log(`[check] Querying existing profiles...`);
  const profilesSnapshot = await db
    .collectionGroup("profiles")
    .limit(5)
    .get();

  for (const doc of profilesSnapshot.docs) {
    const data = doc.data();
    if (data.visualProfile?.referenceImageUrl) {
      const url = data.visualProfile.referenceImageUrl;
      console.log(`[found] Existing referenceImageUrl in profile`);
      const isReachable = await checkUrlReachability(url);
      if (isReachable) {
        console.log(`[check] ✓ URL is reachable`);
        return url;
      }
    }
    if (data.visualProfile?.approvedImageUrl) {
      const url = data.visualProfile.approvedImageUrl;
      console.log(`[found] Existing approvedImageUrl in profile`);
      const isReachable = await checkUrlReachability(url);
      if (isReachable) {
        console.log(`[check] ✓ URL is reachable`);
        return url;
      }
    }
  }

  // Fallback: Use a public test image URL
  console.log(`[info] No existing profile images found.`);
  console.log(`[info] Using public test image...`);
  
  // Use a reliable public image URL from deployed hosting
  const fallbackUrl = "https://story-gen-8a769.web.app/images/templates/animals.png";
  
  console.log(`[check] Verifying fallback URL reachability...`);
  let isReachable = await checkUrlReachability(fallbackUrl);
  if (!isReachable && process.platform === "win32") {
    isReachable = checkUrlReachabilityWithPowerShell(fallbackUrl);
  }
  
  if (!isReachable) {
    throw new Error("Fallback image URL is not reachable. Please provide --reference-image-url explicitly.");
  }

  console.log(`[check] ✓ Fallback URL is reachable`);
  return fallbackUrl;
}

async function main() {
  try {
    const referenceImageUrl = await findOrCreateReferenceImageUrl();

    console.log(`\n[success] Reference image URL ready!`);
    console.log(`[info] URL (redacted): ${referenceImageUrl.substring(0, 60)}...`);
    console.log(`\n[next] Use this command to create smoke book with reference:\n`);
    console.log(`node scripts/create-template-smoke-books.js --write --template-id=fixed-first-zoo --with-reference --reference-image-url="${referenceImageUrl}"\n`);
  } catch (error) {
    console.error("[error] Failed to setup reference image.");
    console.error(error instanceof Error ? error.message : "unknown error");
    process.exit(1);
  }
}

main();

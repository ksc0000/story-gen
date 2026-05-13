const { createRequire } = require("module");
const { resolve } = require("path");
const { existsSync, readFileSync } = require("fs");
const https = require("https");
const { execFileSync } = require("child_process");

const functionsRequire = createRequire(resolve(__dirname, "../functions/package.json"));
const { initializeApp, cert, getApps } = functionsRequire("firebase-admin/app");
const { FieldValue, getFirestore } = functionsRequire("firebase-admin/firestore");

const TARGET_PROJECT_ID = "story-gen-8a769";
const ALLOWED_PAGE_COUNTS = [4, 8, 12];

function getSeedTemplatesFromCompiledModule() {
  const compiled = require("../functions/lib/seed-templates.js");
  if (!compiled || typeof compiled !== "object" || !compiled.SEED_TEMPLATES) {
    throw new Error("Could not load SEED_TEMPLATES from functions/lib/seed-templates.js");
  }
  return compiled.SEED_TEMPLATES;
}

function getFixedTemplateIds(seedTemplates) {
  return Object.entries(seedTemplates)
    .filter(([, template]) => template?.creationMode === "fixed_template")
    .map(([id]) => id);
}

function buildSmokeRunId() {
  const iso = new Date().toISOString().replace(/[-:TZ.]/g, "").slice(0, 14);
  return `template-t2a-${iso}`;
}

function ensureGoogleApplicationCredentials() {
  const credentialPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!credentialPath || credentialPath.trim().length === 0) {
    throw new Error("GOOGLE_APPLICATION_CREDENTIALS is not set.");
  }

  if (!existsSync(credentialPath)) {
    throw new Error("GOOGLE_APPLICATION_CREDENTIALS points to a missing file.");
  }

  console.log("[check] GOOGLE_APPLICATION_CREDENTIALS is set.");
}

function loadServiceAccountFromEnvPath() {
  const credentialPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  const raw = readFileSync(credentialPath, "utf8");
  const parsed = JSON.parse(raw);

  const clientEmail = parsed.client_email || parsed.clientEmail;
  const privateKeyRaw = parsed.private_key || parsed.privateKey;
  const projectId = parsed.project_id || parsed.projectId;

  if (!clientEmail || !privateKeyRaw || !projectId) {
    throw new Error("Service account JSON is missing required keys.");
  }

  return {
    clientEmail,
    privateKey: String(privateKeyRaw).replace(/\\n/g, "\n"),
    projectId,
  };
}

function ensureAdminApp(serviceAccount) {
  if (getApps().length > 0) {
    return getApps()[0];
  }

  return initializeApp({
    credential: cert(serviceAccount),
    projectId: serviceAccount.projectId,
  });
}

function redactUrl(url) {
  if (!url) return "";
  try {
    const parsed = new URL(url);
    const pathParts = parsed.pathname.split("/").filter(Boolean);
    const tail = pathParts.slice(-2).join("/");
    return `${parsed.protocol}//${parsed.host}/.../${tail || "*"}`;
  } catch {
    return `${String(url).slice(0, 24)}...`;
  }
}

function checkUrlReachable(url, timeoutMs = 8000) {
  return new Promise((resolve) => {
    let timedOut = false;
    const req = https.request(url, { method: "HEAD" }, (res) => {
      if (timedOut) return;
      resolve({ ok: (res.statusCode || 0) >= 200 && (res.statusCode || 0) < 400, statusCode: res.statusCode || 0 });
    });

    req.setTimeout(timeoutMs, () => {
      timedOut = true;
      req.destroy(new Error("timeout"));
      resolve({ ok: false, statusCode: 0 });
    });

    req.on("error", () => {
      if (!timedOut) {
        resolve({ ok: false, statusCode: 0 });
      }
    });

    req.end();
  });
}

function checkUrlReachableWithPowerShell(url, timeoutSec = 8) {
  try {
    const script = `$ErrorActionPreference='Stop'; $r=Invoke-WebRequest -Uri '${String(url).replace(/'/g, "''")}' -Method Head -TimeoutSec ${timeoutSec} -UseBasicParsing; Write-Output $r.StatusCode`;
    const out = execFileSync("powershell", ["-NoProfile", "-Command", script], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      timeout: timeoutSec * 1000 + 2000,
    }).trim();
    const code = Number.parseInt(out, 10);
    return { ok: Number.isFinite(code) && code >= 200 && code < 400, statusCode: Number.isFinite(code) ? code : 0 };
  } catch {
    return { ok: false, statusCode: 0 };
  }
}

function buildInputForTemplate(templateId, index) {
  const base = {
    childName: `SmokeKid${index + 1}`,
    parentMessage: "きょうもすてきな一日だったね",
  };

  if (templateId === "fixed-first-zoo") {
    return {
      ...base,
      place: "city zoo",
      familyMembers: "family",
    };
  }

  if (templateId === "fixed-first-zoo-8p") {
    return {
      ...base,
      place: "city zoo",
      familyMembers: "family",
    };
  }

  if (templateId === "fixed-first-birthday") {
    return {
      ...base,
      familyMembers: "family",
    };
  }

  if (templateId === "fixed-first-birthday-8p") {
    return {
      ...base,
      familyMembers: "family",
    };
  }

  if (templateId === "fixed-first-christmas") {
    return {
      ...base,
      familyMembers: "family",
    };
  }

  if (templateId === "fixed-sharing-friends") {
    return {
      ...base,
      lessonToTeach: "sharing",
    };
  }

  return base;
}

function buildChildProfileSnapshot(index, referenceImageUrl) {
  // Reference image for character consistency testing
  // IMG-002 Verification: Provides childProfileSnapshot.visualProfile.referenceImageUrl
  // This enables the character reference path (inputReferenceCount > 0) to verify
  // that the IMG-002 sandbox/playground background prevention prompts are working
  // when character reference is actually used in image generation.
  // referenceImageUrl is optional and only included if provided.

  const profileData = {
    displayName: `SmokeKid${index + 1}`,
    nickname: `Kid${index + 1}`,
    age: 5,
    genderExpression: "neutral",
    personality: {
      traits: ["curious", "friendly"],
      favoriteThings: ["animals", "adventures"],
    },
    visualProfile: {
      characterLook: `A cheerful child with a unique style`,
      signatureItem: "special hat",
      colorMood: "warm and happy",
      version: 1,
    },
  };

  if (referenceImageUrl) {
    profileData.visualProfile.referenceImageUrl = referenceImageUrl;
  }

  return profileData;
}

function parseTemplateIdArg(args, fixedTemplateIds) {
  const matched = args.find((arg) => arg.startsWith("--template-id="));
  if (!matched) {
    return null;
  }

  const templateId = matched.slice("--template-id=".length).trim();
  if (!templateId) {
    throw new Error("--template-id requires a non-empty value.");
  }

  if (!fixedTemplateIds.includes(templateId)) {
    throw new Error(
      `Unknown templateId: ${templateId}. Available fixed templates: ${fixedTemplateIds.join(", ")}`
    );
  }

  return templateId;
}

function parsePageCountArg(args) {
  const matched = args.find((arg) => arg.startsWith("--page-count="));
  if (!matched) {
    return null;
  }

  const raw = matched.slice("--page-count=".length).trim();
  const pageCount = Number.parseInt(raw, 10);
  if (!Number.isFinite(pageCount) || !ALLOWED_PAGE_COUNTS.includes(pageCount)) {
    throw new Error(`--page-count must be one of 4/8/12, got ${raw}`);
  }

  return pageCount;
}

function resolveTemplatePageCount(seedTemplates, templateId) {
  const template = seedTemplates[templateId];
  const fixedStory = template?.fixedStory;

  if (!fixedStory || typeof fixedStory !== "object") {
    return 4;
  }

  if (fixedStory.pageCount !== undefined) {
    const pageCount = Number.parseInt(String(fixedStory.pageCount), 10);
    if (!ALLOWED_PAGE_COUNTS.includes(pageCount)) {
      throw new Error(
        `${templateId}: fixedStory.pageCount must be one of 4/8/12, got ${fixedStory.pageCount}`
      );
    }
    return pageCount;
  }

  const pages = Array.isArray(fixedStory.pages) ? fixedStory.pages : [];
  if (pages.length > 0) {
    if (!ALLOWED_PAGE_COUNTS.includes(pages.length)) {
      throw new Error(
        `${templateId}: fixedStory.pages.length must be one of 4/8/12, got ${pages.length}`
      );
    }
    return pages.length;
  }

  return 4;
}

function buildBookPayload({ templateId, index, smokeRunId, templateCount, referenceImageUrl, pageCount }) {
  const nowMs = Date.now();

  const payload = {
    userId: `smoke-user-${smokeRunId}-${index + 1}`,
    title: `[SMOKE] ${templateId}`,
    theme: templateId,
    templateId,
    creationMode: "fixed_template",
    productPlan: "free",
    style: "soft_watercolor",
    pageCount,
    status: "generating",
    progress: 0,
    input: buildInputForTemplate(templateId, index),
    characterConsistencyMode: "all_pages",
    createdAt: FieldValue.serverTimestamp(),
    createdAtMs: nowMs,
    updatedAt: FieldValue.serverTimestamp(),
    updatedAtMs: nowMs,
    expiresAt: null,
    smokeTestMetadata: {
      isSmokeTest: true,
      suite: "template_mode_t2a",
      runId: smokeRunId,
      sourceScript: "scripts/create-template-smoke-books.js",
      templateId,
      templateIndex: index + 1,
      templateCount,
      createdAtIso: new Date(nowMs).toISOString(),
      withReference: !!referenceImageUrl,
    },
  };

  // Add childProfileSnapshot only if reference image URL is provided
  if (referenceImageUrl) {
    payload.childProfileSnapshot = buildChildProfileSnapshot(index, referenceImageUrl);
  }

  return payload;
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const write = args.includes("--write");
  const withReference = args.includes("--with-reference");
  const listTemplates = args.includes("--list-templates");
  const requestedPageCount = parsePageCountArg(args);

  const seedTemplates = getSeedTemplatesFromCompiledModule();
  const fixedTemplateIds = getFixedTemplateIds(seedTemplates);

  if (fixedTemplateIds.length === 0) {
    throw new Error("No fixed_template entries found in SEED_TEMPLATES.");
  }

  if (listTemplates) {
    console.log(`[templates] fixed_template count=${fixedTemplateIds.length}`);
    for (const id of fixedTemplateIds) {
      console.log(`- ${id}`);
    }
    return;
  }

  // Parse reference image URL option
  const referenceUrlArg = args.find((arg) => arg.startsWith("--reference-image-url="));
  const referenceImageUrl = referenceUrlArg ? referenceUrlArg.split("=").slice(1).join("=") : null;

  // Validate reference options
  if ((withReference || referenceImageUrl) && !referenceImageUrl) {
    throw new Error("--with-reference requires --reference-image-url=<url> to be specified.");
  }

  if (referenceImageUrl && !withReference) {
    throw new Error("--reference-image-url requires --with-reference flag.");
  }

  const selectedTemplateId = parseTemplateIdArg(args, fixedTemplateIds);
  const targetTemplateIds = selectedTemplateId ? [selectedTemplateId] : fixedTemplateIds;

  if (!dryRun && !write) {
    console.error("[error] Specify --dry-run to preview or --write to create books.");
    process.exit(1);
  }

  // Check reference image URL reachability if provided
  if (referenceImageUrl) {
    console.log(`[check] Verifying reference image URL reachability: ${redactUrl(referenceImageUrl)}`);
    let check = await checkUrlReachable(referenceImageUrl);
    if (!check.ok && process.platform === "win32") {
      check = checkUrlReachableWithPowerShell(referenceImageUrl);
    }
    if (!check.ok) {
      throw new Error(`Reference image URL is not reachable (status=${check.statusCode || "network_error"}).`);
    }
    console.log("[check] ✓ Reference image URL is reachable.");
  }

  if (dryRun) {
    console.log("[dry-run] The following books would be created (no Firestore writes):");
    const smokeRunId = buildSmokeRunId();
    for (const [index, templateId] of targetTemplateIds.entries()) {
      const pageCount = requestedPageCount ?? resolveTemplatePageCount(seedTemplates, templateId);
      const payload = buildBookPayload({ 
        templateId, 
        index, 
        smokeRunId, 
        templateCount: targetTemplateIds.length,
        referenceImageUrl,
        pageCount,
      });
      console.log(`  [${index + 1}/${targetTemplateIds.length}] templateId=${templateId}`);
      console.log(`         userId=${payload.userId}`);
      console.log(`         pageCount=${payload.pageCount}`);
      console.log(`         withReference=${!!referenceImageUrl}`);
      if (referenceImageUrl) {
        console.log(`         referenceImageUrl=${redactUrl(referenceImageUrl)}`);
      }
      console.log(`         input=${JSON.stringify(payload.input)}`);
      console.log(`         runId=${smokeRunId}`);
    }
    console.log("[dry-run] done. Run with --write to create books.");
    return;
  }

  // --write path
  ensureGoogleApplicationCredentials();
  const serviceAccount = loadServiceAccountFromEnvPath();
  if (serviceAccount.projectId !== TARGET_PROJECT_ID) {
    throw new Error("Service account project_id does not match target project.");
  }

  ensureAdminApp(serviceAccount);
  const db = getFirestore();
  const smokeRunId = buildSmokeRunId();

  console.log(`[start] creating ${targetTemplateIds.length} smoke books for ${TARGET_PROJECT_ID}`);
  console.log(`[info] withReference=${!!referenceImageUrl}`);
  if (requestedPageCount) {
    console.log(`[info] requestedPageCount=${requestedPageCount}`);
  }
  if (referenceImageUrl) {
    console.log(`[info] referenceImageUrl=${redactUrl(referenceImageUrl)}`);
  }
  console.log(`[run] smoke run id: ${smokeRunId}`);

  const created = [];
  for (const [index, templateId] of targetTemplateIds.entries()) {
    const docRef = db.collection("books").doc();
    const pageCount = requestedPageCount ?? resolveTemplatePageCount(seedTemplates, templateId);
    const payload = buildBookPayload({ 
      templateId, 
      index, 
      smokeRunId, 
      templateCount: targetTemplateIds.length,
      referenceImageUrl,
      pageCount,
    });
    await docRef.create(payload);
    created.push({ templateId, bookId: docRef.id, pageCount });
    console.log(`[created] template=${templateId} pageCount=${pageCount} bookId=${docRef.id}`);
  }

  console.log(`[done] created ${created.length} smoke books.`);
  for (const row of created) {
    console.log(`- ${row.templateId} (pageCount=${row.pageCount}): ${row.bookId}`);
  }
}

main().catch((error) => {
  console.error("[error] failed to create smoke books.");
  console.error(error instanceof Error ? error.message : "unknown error");
  process.exit(1);
});

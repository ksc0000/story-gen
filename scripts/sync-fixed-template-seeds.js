const { createRequire } = require("module");
const { resolve } = require("path");
const { existsSync, readFileSync } = require("fs");

const functionsRequire = createRequire(resolve(__dirname, "../functions/package.json"));
const { initializeApp, cert, getApps } = functionsRequire("firebase-admin/app");
const { getFirestore, FieldValue } = functionsRequire("firebase-admin/firestore");

const TARGET_PROJECT_ID = "story-gen-8a769";

const REQUIRED_COMMON_TOKENS = [
  "no readable writing anywhere",
  "no signage",
  "no storefront signs",
  "no text-like marks",
  "use reference image for child's face and identity only",
  "ignore reference image background and setting",
];

const REQUIRED_ZOO_TOKENS = [
  "NOT a sandbox",
  "NOT an outdoor playground",
];

const REQUIRED_ZOO_ALTERNATE_TOKENS = [
  "NOT a children's playground",
  "NOT an outdoor play area",
  "NOT a sandbox or outdoor playground",
  "NOT a sandbox or an outdoor playground",
];

function parseArgs(argv) {
  const args = argv.slice(2);
  const write = args.includes("--write");
  const dryRunFlag = args.includes("--dry-run");
  const dryRun = dryRunFlag || !write;

  if (write && dryRunFlag) {
    throw new Error("--write and --dry-run cannot be used together");
  }

  const templateArg = args.find((arg) => arg.startsWith("--template-id="));
  const templateId = templateArg
    ? templateArg.slice("--template-id=".length).trim()
    : null;

  if (templateId === "") {
    throw new Error("--template-id requires a non-empty value");
  }

  return { write, dryRun, templateId };
}

function ensureGoogleApplicationCredentials() {
  const credentialPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!credentialPath || credentialPath.trim().length === 0) {
    throw new Error("GOOGLE_APPLICATION_CREDENTIALS is not set.");
  }

  if (!existsSync(credentialPath)) {
    throw new Error("GOOGLE_APPLICATION_CREDENTIALS points to a missing file.");
  }

  return credentialPath;
}

function loadServiceAccount(credentialPath) {
  const parsed = JSON.parse(readFileSync(credentialPath, "utf8"));
  const projectId = parsed.project_id || parsed.projectId;
  const clientEmail = parsed.client_email || parsed.clientEmail;
  const privateKeyRaw = parsed.private_key || parsed.privateKey;

  if (!projectId || !clientEmail || !privateKeyRaw) {
    throw new Error("Service account JSON is missing required keys.");
  }

  return {
    projectId,
    clientEmail,
    privateKey: String(privateKeyRaw).replace(/\\n/g, "\n"),
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

function getSeedTemplatesFromCompiledModule() {
  const compiled = require("../functions/lib/seed-templates.js");
  if (!compiled || typeof compiled !== "object" || !compiled.SEED_TEMPLATES) {
    throw new Error("Could not load SEED_TEMPLATES from functions/lib/seed-templates.js");
  }
  return compiled.SEED_TEMPLATES;
}

function assertCompiledSeedHasImg002(seedTemplates) {
  const zoo = seedTemplates["fixed-first-zoo"];
  if (!zoo?.fixedStory?.pages?.length) {
    throw new Error("Compiled seed does not have fixed-first-zoo pages.");
  }

  const allPrompts = [
    zoo.fixedStory.coverImagePromptTemplate || "",
    ...zoo.fixedStory.pages.map((p) => p.imagePromptTemplate || ""),
  ].join("\n");

  for (const token of REQUIRED_COMMON_TOKENS) {
    if (!allPrompts.includes(token)) {
      throw new Error(
        `Compiled seed appears stale (missing token: ${token}). Run: cd functions && npm run build`
      );
    }
  }

  if (allPrompts.toLowerCase().includes("friendly japanese zoo")) {
    throw new Error("Compiled seed appears stale (contains 'friendly Japanese zoo'). Run: cd functions && npm run build");
  }
}

function getDefaultFixedTemplateIds(seedTemplates) {
  return Object.entries(seedTemplates)
    .filter(([, template]) => template?.creationMode === "fixed_template")
    .map(([id]) => id);
}

function pickTemplateWritePayload(seedTemplate) {
  const cloned = JSON.parse(JSON.stringify(seedTemplate));
  // Keep target scope explicit and avoid touching unrelated collections.
  cloned.updatedAt = FieldValue.serverTimestamp();
  cloned.updatedAtMs = Date.now();
  return cloned;
}

function hasRequiredCommonTokens(prompt) {
  return REQUIRED_COMMON_TOKENS.every((token) => prompt.includes(token));
}

function evaluateTemplateSync(templateId, templateDoc) {
  const issues = [];

  if (!templateDoc) {
    issues.push("document missing");
    return issues;
  }

  if (templateDoc.creationMode !== "fixed_template") {
    issues.push(`creationMode is ${templateDoc.creationMode ?? "(missing)"}`);
  }

  const fixedStory = templateDoc.fixedStory;
  if (!fixedStory) {
    issues.push("fixedStory missing");
    return issues;
  }

  const coverPrompt = fixedStory.coverImagePromptTemplate || "";
  if (!hasRequiredCommonTokens(coverPrompt)) {
    issues.push("coverImagePromptTemplate missing required IMG-001/IMG-002 tokens");
  }

  if ((coverPrompt || "").toLowerCase().includes("friendly japanese zoo")) {
    issues.push("coverImagePromptTemplate still contains 'friendly Japanese zoo'");
  }

  const pages = Array.isArray(fixedStory.pages) ? fixedStory.pages : [];
  if (pages.length !== 4) {
    issues.push(`pages length is ${pages.length}`);
  }

  pages.forEach((page, index) => {
    const prompt = page?.imagePromptTemplate || "";
    if (!hasRequiredCommonTokens(prompt)) {
      issues.push(`page ${index} missing required IMG-001/IMG-002 common tokens`);
    }

    if (templateId === "fixed-first-zoo") {
      const hasPrimary = REQUIRED_ZOO_TOKENS.every((token) => prompt.includes(token));
      const hasAlternate = REQUIRED_ZOO_ALTERNATE_TOKENS.some((token) => prompt.includes(token));
      if (!hasPrimary && !hasAlternate) {
        issues.push(`page ${index} missing zoo scene lock tokens (sandbox/playground exclusions)`);
      }

      if (prompt.toLowerCase().includes("friendly japanese zoo")) {
        issues.push(`page ${index} still contains 'friendly Japanese zoo'`);
      }
    }
  });

  return issues;
}

async function fetchTemplateDocs(db, templateIds) {
  const results = {};
  for (const id of templateIds) {
    const snap = await db.collection("templates").doc(id).get();
    results[id] = snap.exists ? snap.data() : null;
  }
  return results;
}

async function writeTemplates(db, templateIds, seedTemplates) {
  const batch = db.batch();
  for (const id of templateIds) {
    const seedTemplate = seedTemplates[id];
    if (!seedTemplate) {
      throw new Error(`Template id not found in SEED_TEMPLATES: ${id}`);
    }

    batch.set(
      db.collection("templates").doc(id),
      pickTemplateWritePayload(seedTemplate),
      { merge: true }
    );
  }
  await batch.commit();
}

async function main() {
  const { write, dryRun, templateId } = parseArgs(process.argv);
  const credentialPath = ensureGoogleApplicationCredentials();
  const serviceAccount = loadServiceAccount(credentialPath);

  if (serviceAccount.projectId !== TARGET_PROJECT_ID) {
    throw new Error(
      `Service account project_id mismatch. expected=${TARGET_PROJECT_ID} actual=${serviceAccount.projectId}`
    );
  }

  const seedTemplates = getSeedTemplatesFromCompiledModule();
  assertCompiledSeedHasImg002(seedTemplates);
  const defaultTemplateIds = getDefaultFixedTemplateIds(seedTemplates);

  if (defaultTemplateIds.length === 0) {
    throw new Error("No fixed_template entries found in SEED_TEMPLATES.");
  }

  const templateIds = templateId ? [templateId] : defaultTemplateIds;
  if (templateId && !seedTemplates[templateId]) {
    throw new Error(`Template id not found in SEED_TEMPLATES: ${templateId}`);
  }

  ensureAdminApp(serviceAccount);
  const db = getFirestore();

  console.log(`[mode] ${dryRun ? "DRY_RUN" : "WRITE"}`);
  console.log(`[target templates count] ${templateIds.length}`);
  console.log(`[target templates] ${templateIds.join(", ")}`);

  const before = await fetchTemplateDocs(db, templateIds);
  const beforeReport = {};
  let beforeOutOfSync = 0;
  for (const id of templateIds) {
    const issues = evaluateTemplateSync(id, before[id]);
    if (issues.length > 0) beforeOutOfSync += 1;
    beforeReport[id] = issues;
  }

  console.log("[before]");
  console.log(JSON.stringify(beforeReport, null, 2));

  if (!write) {
    console.log("[result] dry-run complete. No writes performed.");
    process.exit(beforeOutOfSync > 0 ? 2 : 0);
  }

  console.log("[write] syncing templates from local SEED_TEMPLATES (templates/* only)...");
  await writeTemplates(db, templateIds, seedTemplates);

  const after = await fetchTemplateDocs(db, templateIds);
  const afterReport = {};
  let afterOutOfSync = 0;
  for (const id of templateIds) {
    const issues = evaluateTemplateSync(id, after[id]);
    if (issues.length > 0) afterOutOfSync += 1;
    afterReport[id] = issues;
  }

  console.log("[after]");
  console.log(JSON.stringify(afterReport, null, 2));

  if (afterOutOfSync > 0) {
    throw new Error("Write completed but templates are still out of sync. Inspect after report.");
  }

  console.log("[result] write complete. All target templates passed sync checks.");
}

main().catch((error) => {
  console.error("[error]", error instanceof Error ? error.message : error);
  process.exit(1);
});

const { createRequire } = require("module");
const { resolve } = require("path");
const { existsSync, readFileSync } = require("fs");

const functionsRequire = createRequire(resolve(__dirname, "../functions/package.json"));
const { initializeApp, cert, getApps } = functionsRequire("firebase-admin/app");
const { FieldValue, getFirestore } = functionsRequire("firebase-admin/firestore");

const TARGET_PROJECT_ID = "story-gen-8a769";
const TEMPLATE_IDS = [
  "fixed-first-zoo",
  "fixed-first-birthday",
  "fixed-bedtime-good-day",
  "fixed-brush-teeth",
  "fixed-first-christmas",
  "fixed-sharing-friends",
];

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

function buildInputForTemplate(templateId, index) {
  const base = {
    childName: `SmokeKid${index + 1}`,
    parentMessage: "You did great today.",
  };

  if (templateId === "fixed-first-zoo") {
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

function buildBookPayload({ templateId, index, smokeRunId }) {
  const nowMs = Date.now();

  return {
    userId: `smoke-user-${smokeRunId}-${index + 1}`,
    title: `[SMOKE] ${templateId}`,
    theme: templateId,
    templateId,
    creationMode: "fixed_template",
    productPlan: "free",
    style: "soft_watercolor",
    pageCount: 4,
    status: "generating",
    progress: 0,
    input: buildInputForTemplate(templateId, index),
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
      templateCount: TEMPLATE_IDS.length,
      createdAtIso: new Date(nowMs).toISOString(),
    },
  };
}

async function main() {
  if (TEMPLATE_IDS.length !== 6) {
    throw new Error("Template list size must be exactly 6.");
  }

  ensureGoogleApplicationCredentials();
  const serviceAccount = loadServiceAccountFromEnvPath();
  if (serviceAccount.projectId !== TARGET_PROJECT_ID) {
    throw new Error("Service account project_id does not match target project.");
  }

  ensureAdminApp(serviceAccount);
  const db = getFirestore();
  const smokeRunId = buildSmokeRunId();

  console.log(`[start] creating ${TEMPLATE_IDS.length} smoke books for ${TARGET_PROJECT_ID}`);
  console.log(`[run] smoke run id: ${smokeRunId}`);

  const created = [];
  for (const [index, templateId] of TEMPLATE_IDS.entries()) {
    const docRef = db.collection("books").doc();
    const payload = buildBookPayload({ templateId, index, smokeRunId });
    await docRef.create(payload);
    created.push({ templateId, bookId: docRef.id });
    console.log(`[created] template=${templateId} bookId=${docRef.id}`);
  }

  console.log("[done] created 6 smoke books.");
  for (const row of created) {
    console.log(`- ${row.templateId}: ${row.bookId}`);
  }
}

main().catch((error) => {
  console.error("[error] failed to create smoke books.");
  console.error(error instanceof Error ? error.message : "unknown error");
  process.exit(1);
});

const { createRequire } = require("module");
const { resolve } = require("path");
const { existsSync, readFileSync } = require("fs");

const functionsRequire = createRequire(resolve(__dirname, "../functions/package.json"));
const { initializeApp, cert, getApps } = functionsRequire("firebase-admin/app");
const { getFirestore } = functionsRequire("firebase-admin/firestore");

const TARGET_PROJECT_ID = "story-gen-8a769";

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

async function checkBookStatus(bookId) {
  const credentialPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!credentialPath || !existsSync(credentialPath)) {
    throw new Error("GOOGLE_APPLICATION_CREDENTIALS not set or file not found.");
  }

  const serviceAccount = loadServiceAccountFromEnvPath();
  if (serviceAccount.projectId !== TARGET_PROJECT_ID) {
    throw new Error("Service account project_id does not match target project.");
  }

  ensureAdminApp(serviceAccount);
  const db = getFirestore();

  const bookDoc = await db.collection("books").doc(bookId).get();
  if (!bookDoc.exists) {
    console.error(`[error] Book ${bookId} not found.`);
    process.exit(1);
  }

  const bookData = bookDoc.data();
  console.log(`[book] ${bookId}`);
  console.log(`  status: ${bookData.status}`);
  console.log(`  progress: ${bookData.progress}`);
  console.log(`  createdAtMs: ${bookData.createdAtMs}`);

  if (bookData.status === "failed") {
    console.log(`  failureStage: ${bookData.failureStage}`);
    console.log(`  failureReason: ${bookData.failureReason}`);
    console.log(`  technicalErrorMessage: ${bookData.technicalErrorMessage}`);
    process.exit(1);
  }

  if (bookData.status === "generating") {
    console.log(`  [info] Book still generating...`);
    process.exit(0);
  }

  // completed or partial_completed
  console.log(`  [info] Book generation complete!`);
  const pagesCol = await db.collection("books").doc(bookId).collection("pages").get();
  console.log(`\n[pages] Total: ${pagesCol.docs.length}`);

  let totalReferences = 0;
  for (const pageDoc of pagesCol.docs) {
    const pageData = pageDoc.data();
    console.log(`\n  Page ${pageData.pageNumber}:`);
    console.log(`    status: ${pageData.status}`);
    console.log(`    inputReferenceCount: ${pageData.inputReferenceCount ?? 0}`);
    console.log(`    usedCharacterReference: ${pageData.usedCharacterReference ?? false}`);
    console.log(`    inputImageRoles: ${pageData.inputImageRoles ? JSON.stringify(pageData.inputImageRoles) : "none"}`);
    console.log(`    inputImageRefs: ${pageData.inputImageRefs ? JSON.stringify(pageData.inputImageRefs) : "none"}`);
    console.log(`    imageModel: ${pageData.imageModel}`);
    console.log(`    imageDurationMs: ${pageData.imageDurationMs}`);

    totalReferences += pageData.inputReferenceCount ?? 0;

    if (pageData.imageUrl) {
      console.log(`    imageUrl: ${pageData.imageUrl.substring(0, 80)}...`);
    }
  }

  console.log(`\n[summary]`);
  console.log(`  Total reference images used: ${totalReferences} / ${pagesCol.docs.length * 1} expected`);
  if (totalReferences > 0) {
    console.log(`  ✓ Reference path VERIFIED (inputReferenceCount > 0)`);
  } else {
    console.log(`  ✗ Reference path NOT used (inputReferenceCount = 0)`);
  }
}

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error("[usage] npm run monitor-smoke -- <bookId>");
  process.exit(1);
}

const bookId = args[0];
checkBookStatus(bookId).catch((error) => {
  console.error("[error]", error instanceof Error ? error.message : "unknown error");
  process.exit(1);
});

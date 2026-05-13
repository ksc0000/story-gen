const { createRequire } = require("module");
const { resolve } = require("path");
const { existsSync, readFileSync } = require("fs");

const functionsRequire = createRequire(resolve(__dirname, "../functions/package.json"));
const { initializeApp, cert, getApps } = functionsRequire("firebase-admin/app");
const { getFirestore } = functionsRequire("firebase-admin/firestore");

const TARGET_PROJECT_ID = "story-gen-8a769";
const ALLOWED_PAGE_COUNTS = [4, 8, 12];

function parseExpectedPageCountArg(args) {
  const matched = args.find((arg) => arg.startsWith("--expected-page-count="));
  if (!matched) {
    return null;
  }

  const raw = matched.slice("--expected-page-count=".length).trim();
  const expectedPageCount = Number.parseInt(raw, 10);
  if (!Number.isFinite(expectedPageCount) || !ALLOWED_PAGE_COUNTS.includes(expectedPageCount)) {
    throw new Error(`--expected-page-count must be one of 4/8/12, got ${raw}`);
  }

  return expectedPageCount;
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

async function inspectBook(bookId, expectedPageCount) {
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

  console.log(`[inspecting] ${bookId}\n`);

  const bookDoc = await db.collection("books").doc(bookId).get();
  if (!bookDoc.exists) {
    console.error(`[error] Book ${bookId} not found.`);
    process.exit(1);
  }

  const bookData = bookDoc.data();
  
  // Book-level info
  console.log(`[book-info]`);
  console.log(`  status: ${bookData.status}`);
  console.log(`  progress: ${bookData.progress}`);
  console.log(`  creationMode: ${bookData.creationMode}`);
  console.log(`  characterConsistencyMode: ${bookData.characterConsistencyMode}`);
  console.log(`  childProfileSnapshot: ${bookData.childProfileSnapshot ? "YES" : "NO"}`);
  if (bookData.childProfileSnapshot?.visualProfile?.referenceImageUrl) {
    console.log(`    referenceImageUrl: ${bookData.childProfileSnapshot.visualProfile.referenceImageUrl}`);
  }

  if (bookData.failureStage) {
    console.log(`  failureStage: ${bookData.failureStage}`);
    console.log(`  failureReason: ${bookData.failureReason}`);
    console.log(`  technicalErrorMessage: ${bookData.technicalErrorMessage}`);
  }

  console.log(`\n[pages]`);

  const pagesCol = await db.collection("books").doc(bookId).collection("pages").get();
  for (const pageDoc of pagesCol.docs) {
    const pageData = pageDoc.data();
    console.log(`\n  Page ${pageData.pageNumber}:`);
    console.log(`    status: ${pageData.status}`);
    console.log(`    inputReferenceCount: ${pageData.inputReferenceCount ?? 0}`);
    console.log(`    usedCharacterReference: ${pageData.usedCharacterReference ?? false}`);
    console.log(`    imageDurationMs: ${pageData.imageDurationMs ?? 0}`);
    console.log(`    imageAttemptCount: ${pageData.imageAttemptCount ?? 0}`);
    
    if (pageData.inputImageRefs && pageData.inputImageRefs.length > 0) {
      console.log(`    inputImageRefs: ${JSON.stringify(pageData.inputImageRefs)}`);
    }
    
    if (pageData.imageFailureReason) {
      console.log(`    imageFailureReason: ${pageData.imageFailureReason}`);
    }

    if (pageData.imageUrl) {
      console.log(`    ✓ imageUrl: ${pageData.imageUrl.substring(0, 50)}...`);
    }
  }

  // Summary
  const allPages = pagesCol.docs;
  const actualPageCount = allPages.length;
  const completedPages = allPages.filter(d => d.data().status === "completed").length;
  const failedPages = allPages.filter(d => d.data().status === "image_failed").length;
  const referencedPages = allPages.filter(d => d.data().inputReferenceCount > 0).length;

  console.log(`\n[summary]`);
  console.log(`  Completed pages: ${completedPages}/${actualPageCount}`);
  console.log(`  Failed pages: ${failedPages}/${actualPageCount}`);
  console.log(`  Pages with reference: ${referencedPages}/${actualPageCount}`);

  if (expectedPageCount !== null) {
    const pass = actualPageCount === expectedPageCount;
    console.log(`  Expected page count: ${expectedPageCount}`);
    console.log(`  Actual page count: ${actualPageCount}`);
    console.log(`  Page count check: ${pass ? "PASS" : "FAIL"}`);

    if (!pass) {
      throw new Error(`Expected page count ${expectedPageCount}, but got ${actualPageCount}.`);
    }
  }
  
  if (referencedPages > 0) {
    console.log(`  ✓ Reference path IS BEING USED`);
  } else {
    console.log(`  ✗ Reference path NOT being used`);
  }
}

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error("[usage] npm run inspect-smoke -- <bookId> [--expected-page-count=4|8|12]");
  process.exit(1);
}

const bookId = args[0];
const expectedPageCount = parseExpectedPageCountArg(args);

inspectBook(bookId, expectedPageCount).catch((error) => {
  console.error("[error]", error instanceof Error ? error.message : "unknown error");
  process.exit(1);
});

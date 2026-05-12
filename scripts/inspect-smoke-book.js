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

async function inspectBook(bookId) {
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
  const completedPages = allPages.filter(d => d.data().status === "completed").length;
  const failedPages = allPages.filter(d => d.data().status === "image_failed").length;
  const referencedPages = allPages.filter(d => d.data().inputReferenceCount > 0).length;

  console.log(`\n[summary]`);
  console.log(`  Completed pages: ${completedPages}/${allPages.length}`);
  console.log(`  Failed pages: ${failedPages}/${allPages.length}`);
  console.log(`  Pages with reference: ${referencedPages}/${allPages.length}`);
  
  if (referencedPages > 0) {
    console.log(`  ✓ Reference path IS BEING USED`);
  } else {
    console.log(`  ✗ Reference path NOT being used`);
  }
}

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error("[usage] npm run inspect-smoke -- <bookId>");
  process.exit(1);
}

const bookId = args[0];
inspectBook(bookId).catch((error) => {
  console.error("[error]", error instanceof Error ? error.message : "unknown error");
  process.exit(1);
});

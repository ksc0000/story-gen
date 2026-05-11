const { createRequire } = require("module");
const { resolve } = require("path");
const { existsSync, readFileSync } = require("fs");

const functionsRequire = createRequire(resolve(__dirname, "../functions/package.json"));
const { initializeApp, cert, getApps } = functionsRequire("firebase-admin/app");
const { getFirestore } = functionsRequire("firebase-admin/firestore");

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
  const raw = JSON.parse(readFileSync(credentialPath, "utf8"));
  return {
    clientEmail: raw.client_email || raw.clientEmail,
    privateKey: String(raw.private_key || raw.privateKey).replace(/\\n/g, "\n"),
    projectId: raw.project_id || raw.projectId,
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

async function main() {
  const bookId = process.argv[2];
  if (!bookId) {
    throw new Error("Usage: node scripts/inspect-template-smoke-book.js <bookId>");
  }

  const credentialPath = ensureGoogleApplicationCredentials();
  ensureAdminApp(loadServiceAccount(credentialPath));

  const db = getFirestore();
  const ref = db.collection("books").doc(bookId);
  const snap = await ref.get();

  if (!snap.exists) {
    throw new Error(`Book not found: ${bookId}`);
  }

  const data = snap.data() || {};
  const pages = await ref.collection("pages").orderBy("pageNumber").get();

  console.log(JSON.stringify({
    bookId,
    status: data.status || null,
    pagesCount: pages.size,
    pageNumbers: pages.docs.map((doc) => doc.data().pageNumber),
    hasCoverImagePrompt: typeof data.coverImagePrompt === "string" && data.coverImagePrompt.length > 0,
    hasTitleSpreadText: typeof data.titleSpreadText === "string" && data.titleSpreadText.length > 0,
    hasOpeningNarration: typeof data.openingNarration === "string" && data.openingNarration.length > 0,
    coverStatus: data.coverStatus ?? null,
    hasCoverPage: data.hasCoverPage ?? null,
    readingStructureVersion: data.readingStructureVersion ?? null,
    pageStatus: pages.docs.map((doc) => {
      const page = doc.data();
      return {
        pageNumber: page.pageNumber,
        status: page.status || null,
        failureStage: page.failureStage || null,
        failureProvider: page.failureProvider || null,
        failureReason: page.failureReason || page.imageFailureReason || null,
      };
    }),
  }));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "unknown error");
  process.exit(1);
});
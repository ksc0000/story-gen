/**
 * P5-3k QA: Inspect all books from a QA run and output a structured report.
 *
 * Reads book docs + pages subcollections from Firestore and computes:
 *   - fallbackPages (pages where imageFallbackUsed === true → klein_fast used)
 *   - failedPages (pages where status === "image_failed")
 *   - referencePages (pages where inputReferenceCount > 0 → reference-aware path active)
 *   - stepBApprox (pages where imageAttemptCount >= 2 AND final profile === primaryProfile
 *                  i.e. Step b succeeded without falling to klein_fast)
 *   - kleinFastPages (pages where imageModelProfile === "klein_fast")
 *   - imageAttemptCount distribution per page
 *
 * Note on stepB vs logs:
 *   Exact Step b counts require Cloud Logging (p5_model_unification_retry_active events).
 *   stepBApprox is inferred from Firestore page data: 2+ attempts on pro_consistent profile.
 *   For authoritative counts, use the Cloud Logging filter printed at script end.
 *
 * Usage:
 *   node scripts/inspect-p5-3k-qa-run.js --runId=<runId> --userId=<uid>
 *   node scripts/inspect-p5-3k-qa-run.js --runId=<runId> --userId=<uid> --json
 *
 * Prerequisites:
 *   export GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
 */

const { createRequire } = require("module");
const { resolve } = require("path");
const { existsSync, readFileSync } = require("fs");

const functionsRequire = createRequire(resolve(__dirname, "../functions/package.json"));
const { initializeApp, cert, getApps } = functionsRequire("firebase-admin/app");
const { getFirestore } = functionsRequire("firebase-admin/firestore");

const TARGET_PROJECT_ID = "story-gen-8a769";

function loadServiceAccountFromEnvPath() {
  const credentialPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!credentialPath || !existsSync(credentialPath)) {
    throw new Error("GOOGLE_APPLICATION_CREDENTIALS is not set or file not found.");
  }
  const raw = readFileSync(credentialPath, "utf8");
  const parsed = JSON.parse(raw);
  return {
    clientEmail: parsed.client_email || parsed.clientEmail,
    privateKey: String(parsed.private_key || parsed.privateKey).replace(/\\n/g, "\n"),
    projectId: parsed.project_id || parsed.projectId || TARGET_PROJECT_ID,
  };
}

function ensureAdminApp(serviceAccount) {
  if (getApps().length > 0) return getApps()[0];
  return initializeApp({ credential: cert(serviceAccount), projectId: serviceAccount.projectId });
}

function parseArgs(args) {
  const runIdArg = args.find((a) => a.startsWith("--runId="));
  const userIdArg = args.find((a) => a.startsWith("--userId="));
  const runId = runIdArg ? runIdArg.slice("--runId=".length).trim() : null;
  const userId = userIdArg
    ? userIdArg.slice("--userId=".length).trim()
    : (process.env.QA_USER_ID ?? null);
  const outputJson = args.includes("--json");
  return { runId, userId, outputJson };
}

/** Compute QA metrics for one book's pages subcollection. */
function computeBookMetrics(bookData, pageDocs) {
  const primaryProfile = bookData.imageModelProfile ?? "pro_consistent";
  const pages = pageDocs.map((d) => d.data());
  const pageCount = bookData.pageCount ?? pages.length;

  let fallbackPages = 0;
  let failedPages = 0;
  let referencePages = 0;
  let stepBApprox = 0;
  let kleinFastPages = 0;

  const pageDetails = [];

  for (const p of pages) {
    const status = p.status ?? "unknown";
    const modelProfile = p.imageModelProfile ?? primaryProfile;
    const fallbackFrom = p.fallbackFromModelProfile ?? null;
    const imageFallbackUsed = p.imageFallbackUsed === true || (fallbackFrom != null);
    const inputRefCount = p.inputReferenceCount ?? 0;
    const attemptCount = p.imageAttemptCount ?? 1;
    const usedCharRef = p.usedCharacterReference === true;

    if (imageFallbackUsed) fallbackPages++;
    if (status === "image_failed") failedPages++;
    if (inputRefCount > 0) referencePages++;
    if (modelProfile === "klein_fast") kleinFastPages++;

    // Step b approximation: 2 attempts on primary profile without falling to klein_fast
    const stayedOnPrimary = modelProfile === primaryProfile && !imageFallbackUsed;
    if (attemptCount >= 2 && stayedOnPrimary) stepBApprox++;

    pageDetails.push({
      pageIndex: p.pageNumber ?? "?",
      status,
      imageModelProfile: modelProfile,
      fallbackFromModelProfile: fallbackFrom,
      imageFallbackUsed,
      imageAttemptCount: attemptCount,
      inputReferenceCount: inputRefCount,
      usedCharacterReference: usedCharRef,
    });
  }

  return {
    bookId: null, // filled by caller
    style: bookData.selectedStyleId ?? bookData.style ?? "?",
    pageCount,
    status: bookData.status ?? "unknown",
    fallbackPages,
    failedPages,
    referencePages,
    stepBApprox,
    kleinFastPages,
    pageDetails,
    caseNum: bookData.smokeTestMetadata?.caseNum ?? "?",
  };
}

/** Print a Markdown table row. */
function mdRow(cells) {
  return "| " + cells.join(" | ") + " |";
}

/** Print the full QA report to stdout as Markdown. */
function printMarkdownReport(runId, metrics) {
  const header = mdRow([
    "bookId (short)",
    "Case",
    "style",
    "status",
    "fallbackPages",
    "failedPages",
    "referencePages",
    "stepBApprox",
    "kleinFastPages",
    "PASS?",
  ]);
  const separator = mdRow([
    ":---",
    "---:",
    "---",
    "---",
    "---:",
    "---:",
    "---:",
    "---:",
    "---:",
    "---",
  ]);

  console.log(`\n## QA Run: ${runId}\n`);
  console.log(header);
  console.log(separator);

  let overallPass = true;
  let anyWarn = false;

  for (const m of metrics) {
    const shortId = m.bookId.slice(-8);
    const fallbackClass =
      m.fallbackPages >= 7 ? "FAIL" : m.fallbackPages >= 3 ? "WARN" : "OK";
    const pass = m.fallbackPages < 7 && m.failedPages === 0 ? "✓" : "✗";

    if (m.fallbackPages >= 7) overallPass = false;
    if (m.fallbackPages >= 3) anyWarn = true;

    console.log(
      mdRow([
        shortId,
        String(m.caseNum),
        m.style,
        m.status,
        `${m.fallbackPages} (${fallbackClass})`,
        String(m.failedPages),
        String(m.referencePages),
        String(m.stepBApprox),
        String(m.kleinFastPages),
        pass,
      ])
    );
  }

  // Per-book page detail
  for (const m of metrics) {
    console.log(`\n### Book ${m.bookId} — ${m.style} (Case ${m.caseNum})\n`);
    const detHeader = mdRow([
      "page",
      "status",
      "imageModelProfile",
      "fallbackFrom",
      "imageFallbackUsed",
      "attemptCount",
      "inputRefCount",
      "usedCharRef",
    ]);
    const detSep = mdRow(["---:", "---", "---", "---", "---", "---:", "---:", "---"]);
    console.log(detHeader);
    console.log(detSep);
    for (const p of m.pageDetails) {
      console.log(
        mdRow([
          String(p.pageIndex),
          p.status,
          p.imageModelProfile,
          p.fallbackFromModelProfile ?? "—",
          p.imageFallbackUsed ? "true" : "false",
          String(p.imageAttemptCount),
          String(p.inputReferenceCount),
          p.usedCharacterReference ? "true" : "false",
        ])
      );
    }
  }

  // Overall verdict
  const verdict = !overallPass
    ? "**FAIL** — one or more books have fallbackPages ≥ 7"
    : anyWarn
    ? "**WARN** — fallbackPages 3–6 in at least one book; investigate Step b"
    : "**PASS** — all books fallbackPages 0–2";

  console.log(`\n## Verdict\n\n${verdict}\n`);

  // Cloud Logging filter instructions
  console.log(`## Cloud Logging: p5_model_unification_retry_active\n`);
  console.log("Run this query in Google Cloud Logging console:\n");
  console.log("```");
  console.log('resource.type="cloud_run_revision"');
  console.log('jsonPayload.message="p5_model_unification_retry_active"');
  for (const m of metrics) {
    console.log(`jsonPayload.bookId="${m.bookId}"`);
  }
  console.log("```\n");
  console.log(
    "Tally `fallbackReasonClass` values: `safety_rejection`, `timeout`, `other`.\n"
  );
  console.log(
    "For `other` cases, record: bookId, pageIndex, style, attempt count, and surrounding log lines.\n"
  );
}

async function main() {
  const args = process.argv.slice(2);
  const { runId, userId, outputJson } = parseArgs(args);

  if (!runId || !userId) {
    console.error("[error] --runId=<id> and --userId=<uid> are both required.");
    console.error("  runId is printed when you run create-p5-3k-reference-aware-qa-books.js");
    process.exit(1);
  }

  const sa = loadServiceAccountFromEnvPath();
  if (sa.projectId !== TARGET_PROJECT_ID) {
    throw new Error(`Service account project_id (${sa.projectId}) != target (${TARGET_PROJECT_ID}).`);
  }
  ensureAdminApp(sa);
  const db = getFirestore();

  // Fetch all books for this user, filter by qaRunId in memory
  const booksSnapshot = await db
    .collection("books")
    .where("userId", "==", userId)
    .where("qaRunId", "==", runId)
    .get();

  if (booksSnapshot.empty) {
    // Fallback: query by userId and filter smokeTestMetadata.runId in memory
    console.log(`[info] No books matched by qaRunId field; falling back to in-memory filter on smokeTestMetadata.runId`);
    const allUserBooks = await db
      .collection("books")
      .where("userId", "==", userId)
      .orderBy("createdAtMs", "desc")
      .limit(50)
      .get();

    const filtered = allUserBooks.docs.filter(
      (d) => d.data().smokeTestMetadata?.runId === runId
    );

    if (filtered.length === 0) {
      console.error(`[error] No books found for userId=${userId} with runId=${runId}`);
      process.exit(1);
    }

    booksSnapshot.docs = filtered;
  }

  console.log(`[info] Found ${booksSnapshot.docs.length} books for runId=${runId}`);

  // Sort by caseNum
  const sortedDocs = [...booksSnapshot.docs].sort(
    (a, b) =>
      (a.data().smokeTestMetadata?.caseNum ?? 99) -
      (b.data().smokeTestMetadata?.caseNum ?? 99)
  );

  const allMetrics = [];

  for (const bookDoc of sortedDocs) {
    const bookData = bookDoc.data();
    const bookId = bookDoc.id;

    if (bookData.status === "generating") {
      console.log(`[warn] Book ${bookId} is still generating (progress=${bookData.progress}%). Metrics may be incomplete.`);
    }

    const pagesSnapshot = await db
      .collection("books")
      .doc(bookId)
      .collection("pages")
      .orderBy("pageNumber")
      .get();

    const metrics = computeBookMetrics(bookData, pagesSnapshot.docs);
    metrics.bookId = bookId;
    allMetrics.push(metrics);
  }

  if (outputJson) {
    console.log(JSON.stringify(allMetrics, null, 2));
    return;
  }

  printMarkdownReport(runId, allMetrics);
}

main().catch((err) => {
  console.error("[fatal]", err.message);
  process.exit(1);
});

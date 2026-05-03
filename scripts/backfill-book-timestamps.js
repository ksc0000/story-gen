const { initializeApp, cert, getApps } = require("firebase-admin/app");
const { FieldValue, Timestamp, getFirestore } = require("firebase-admin/firestore");
const { readFileSync } = require("fs");
const { resolve } = require("path");

function loadServiceAccount() {
  const serviceAccountPath =
    process.env.GOOGLE_APPLICATION_CREDENTIALS || resolve(process.cwd(), "service-account.json");
  try {
    const raw = readFileSync(serviceAccountPath, "utf8");
    const parsed = JSON.parse(raw);
    return {
      ...parsed,
      privateKey: parsed.privateKey.replace(/\\n/g, "\n"),
    };
  } catch {
    return null;
  }
}

function ensureAdminApp() {
  if (getApps().length > 0) {
    return getApps()[0];
  }

  const serviceAccount = loadServiceAccount();
  if (!serviceAccount) {
    throw new Error("service-account.json または GOOGLE_APPLICATION_CREDENTIALS が必要です。");
  }

  return initializeApp({
    credential: cert(serviceAccount),
  });
}

function isServerTimestampPlaceholder(value) {
  return !!value && typeof value === "object" && value._methodName === "serverTimestamp";
}

function resolveTimestampCandidate(book) {
  if (typeof book.createdAtMs === "number") {
    return {
      timestamp: Timestamp.fromMillis(book.createdAtMs),
      createdAtMs: book.createdAtMs,
      source: "createdAtMs",
    };
  }

  if (typeof book.completedAtMs === "number") {
    return {
      timestamp: Timestamp.fromMillis(book.completedAtMs),
      createdAtMs: book.completedAtMs,
      source: "completedAtMs",
    };
  }

  if (typeof book.generationStartedAtMs === "number") {
    return {
      timestamp: Timestamp.fromMillis(book.generationStartedAtMs),
      createdAtMs: book.generationStartedAtMs,
      source: "generationStartedAtMs",
    };
  }

  if (book.expiresAt && typeof book.expiresAt.toMillis === "function") {
    const estimatedMs = book.expiresAt.toMillis() - 30 * 24 * 60 * 60 * 1000;
    return {
      timestamp: Timestamp.fromMillis(estimatedMs),
      createdAtMs: estimatedMs,
      source: "estimated_from_expiresAt",
    };
  }

  return null;
}

async function main() {
  ensureAdminApp();
  const db = getFirestore();
  const limitArg = process.argv.find((arg) => arg.startsWith("--limit="));
  const limitCount = limitArg ? Number(limitArg.split("=")[1]) : 50;
  const dryRun = process.argv.includes("--dry-run");

  const snapshot = await db.collection("books").limit(limitCount).get();

  let targetCount = 0;
  for (const snapshotDoc of snapshot.docs) {
    const data = snapshotDoc.data();
    const missingCreatedAt = !data.createdAt || isServerTimestampPlaceholder(data.createdAt);
    if (!missingCreatedAt) {
      continue;
    }

    targetCount += 1;
    const candidate = resolveTimestampCandidate(data);
    const patch = candidate
      ? {
          createdAt: candidate.timestamp,
          createdAtMs: candidate.createdAtMs,
          createdAtSource: candidate.source,
          updatedAt: FieldValue.serverTimestamp(),
          updatedAtMs: Date.now(),
        }
      : {
          backfilledAt: FieldValue.serverTimestamp(),
          createdAtSource: "unknown",
          updatedAt: FieldValue.serverTimestamp(),
          updatedAtMs: Date.now(),
        };

    if (dryRun) {
      console.log(`[dry-run] ${snapshotDoc.id}`, patch);
      continue;
    }

    await snapshotDoc.ref.update(patch);
    console.log(`[updated] ${snapshotDoc.id}`, patch);
  }

  console.log(`対象件数: ${targetCount}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

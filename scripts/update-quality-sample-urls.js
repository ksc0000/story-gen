/**
 * T7-5b: Update sampleImages (light + premium) for 5 guided_ai templates in Firestore.
 *
 * The template:sync:write script only covers creationMode === "fixed_template".
 * This script targets the 5 guided_ai templates that need sampleImages set.
 *
 * Usage:
 *   $env:GOOGLE_APPLICATION_CREDENTIALS = "path/to/service-account.json"
 *   node scripts/update-quality-sample-urls.js            # dry-run (default)
 *   node scripts/update-quality-sample-urls.js --write    # execute writes
 *   node scripts/update-quality-sample-urls.js --rollback # clear sampleImages fields
 *
 * Rollback: sets sampleImages to FieldValue.delete() for all 5 template IDs.
 *           fantasy and bedtime will also lose the old placeholder premium value.
 *           UI "仕上がりサンプルを見る" button will stop appearing for these templates.
 */

const { createRequire } = require("module");
const { resolve } = require("path");
const { existsSync, readFileSync } = require("fs");

const functionsRequire = createRequire(resolve(__dirname, "../functions/package.json"));
const { initializeApp, cert, getApps } = functionsRequire("firebase-admin/app");
const { getFirestore, FieldValue } = functionsRequire("firebase-admin/firestore");

const TARGET_PROJECT_ID = "story-gen-8a769";

// The 5 target templates with their new sampleImages values.
// All are creationMode === "guided_ai" — not covered by template:sync:write.
const QUALITY_SAMPLE_UPDATES = [
  {
    id: "fantasy",
    sampleImages: {
      light: "/images/samples/fantasy_light.webp",
      premium: "/images/samples/fantasy_premium.webp",
    },
  },
  {
    id: "bedtime",
    sampleImages: {
      light: "/images/samples/bedtime_light.webp",
      premium: "/images/samples/bedtime_premium.webp",
    },
  },
  {
    id: "animals",
    sampleImages: {
      light: "/images/samples/animals_light.webp",
      premium: "/images/samples/animals_premium.webp",
    },
  },
  {
    id: "adventure",
    sampleImages: {
      light: "/images/samples/adventure_light.webp",
      premium: "/images/samples/adventure_premium.webp",
    },
  },
  {
    id: "emotional-growth",
    sampleImages: {
      light: "/images/samples/emotional-growth_light.webp",
      premium: "/images/samples/emotional-growth_premium.webp",
    },
  },
];

function ensureGoogleApplicationCredentials() {
  const credentialPath =
    process.env.GOOGLE_APPLICATION_CREDENTIALS ||
    resolve(process.cwd(), "service-account.json");
  if (!existsSync(credentialPath)) {
    throw new Error(
      "GOOGLE_APPLICATION_CREDENTIALS is not set and service-account.json was not found.\n" +
        "  Set $env:GOOGLE_APPLICATION_CREDENTIALS = 'path/to/service-account.json'"
    );
  }
  return credentialPath;
}

function loadServiceAccount(credentialPath) {
  const parsed = JSON.parse(readFileSync(credentialPath, "utf8"));
  const projectId = parsed.project_id || parsed.projectId;
  const clientEmail = parsed.client_email || parsed.clientEmail;
  const privateKeyRaw = parsed.private_key || parsed.privateKey;
  if (!projectId || !clientEmail || !privateKeyRaw) {
    throw new Error("Service account JSON is missing required keys (project_id, client_email, private_key).");
  }
  return {
    projectId,
    clientEmail,
    privateKey: String(privateKeyRaw).replace(/\\n/g, "\n"),
  };
}

function initAdminApp(serviceAccount) {
  if (getApps().length > 0) return getApps()[0];
  return initializeApp({
    credential: cert(serviceAccount),
    projectId: serviceAccount.projectId,
  });
}

async function main() {
  const args = process.argv.slice(2);
  const isWrite = args.includes("--write");
  const isRollback = args.includes("--rollback");

  if (isWrite && isRollback) {
    throw new Error("Cannot use --write and --rollback together.");
  }

  const mode = isRollback ? "ROLLBACK" : isWrite ? "WRITE" : "DRY_RUN";
  console.log(`[mode] ${mode}`);
  console.log(`[target] ${QUALITY_SAMPLE_UPDATES.length} guided_ai templates in Firestore`);
  console.log();

  const credentialPath = ensureGoogleApplicationCredentials();
  const serviceAccount = loadServiceAccount(credentialPath);

  if (serviceAccount.projectId !== TARGET_PROJECT_ID) {
    throw new Error(
      `Service account project_id mismatch. expected=${TARGET_PROJECT_ID} actual=${serviceAccount.projectId}`
    );
  }

  initAdminApp(serviceAccount);
  const db = getFirestore();

  // Fetch current state
  const currentValues = {};
  for (const { id } of QUALITY_SAMPLE_UPDATES) {
    const snap = await db.doc(`templates/${id}`).get();
    if (!snap.exists) {
      currentValues[id] = { exists: false };
    } else {
      const data = snap.data();
      currentValues[id] = {
        exists: true,
        sampleImages: data.sampleImages ?? null,
        creationMode: data.creationMode,
      };
    }
  }

  // Print current state
  console.log("[before]");
  for (const { id, sampleImages: newSampleImages } of QUALITY_SAMPLE_UPDATES) {
    const cur = currentValues[id];
    if (!cur.exists) {
      console.log(`  ${id}: NOT FOUND in Firestore`);
    } else {
      const cur_s = JSON.stringify(cur.sampleImages);
      const new_s = JSON.stringify(newSampleImages);
      const alreadyDone = cur_s === new_s;
      const action = isRollback ? " → (delete)" : ` → ${new_s}`;
      console.log(`  ${id} [${cur.creationMode}]: ${cur_s}${alreadyDone ? " (already set)" : action}`);
    }
  }
  console.log();

  if (mode === "DRY_RUN") {
    console.log("[result] dry-run complete. No writes performed. Re-run with --write to apply.");
    process.exit(0);
  }

  // Build batch
  const batch = db.batch();

  if (isRollback) {
    console.log("[rollback] Clearing sampleImages for all 5 templates...");
    for (const { id } of QUALITY_SAMPLE_UPDATES) {
      if (!currentValues[id].exists) {
        console.warn(`  SKIP ${id}: document not found`);
        continue;
      }
      batch.update(db.doc(`templates/${id}`), {
        sampleImages: FieldValue.delete(),
        updatedAt: FieldValue.serverTimestamp(),
        updatedAtMs: Date.now(),
      });
      console.log(`  queued rollback: ${id} → (sampleImages deleted)`);
    }
  } else {
    console.log("[write] Updating sampleImages for 5 templates...");
    for (const { id, sampleImages } of QUALITY_SAMPLE_UPDATES) {
      if (!currentValues[id].exists) {
        console.warn(`  SKIP ${id}: document not found`);
        continue;
      }
      batch.update(db.doc(`templates/${id}`), {
        sampleImages,
        updatedAt: FieldValue.serverTimestamp(),
        updatedAtMs: Date.now(),
      });
      console.log(`  queued: ${id} → ${JSON.stringify(sampleImages)}`);
    }
  }

  await batch.commit();
  console.log("\n[done] Batch write committed.");

  // Verify
  console.log("\n[after] Verifying...");
  let passed = 0;
  for (const { id, sampleImages: expected } of QUALITY_SAMPLE_UPDATES) {
    const snap = await db.doc(`templates/${id}`).get();
    const actual = snap.data()?.sampleImages ?? null;

    if (isRollback) {
      const ok = actual === null || actual === undefined;
      console.log(`  ${ok ? "✓" : "✗"} ${id}: sampleImages=${JSON.stringify(actual)}`);
      if (ok) passed++;
    } else {
      const ok = JSON.stringify(actual) === JSON.stringify(expected);
      console.log(
        `  ${ok ? "✓" : "✗"} ${id}: ${ok ? "matches expected" : `got ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)}`}`
      );
      if (ok) passed++;
    }
  }
  console.log(`\n${passed}/${QUALITY_SAMPLE_UPDATES.length} verified.`);
  if (passed < QUALITY_SAMPLE_UPDATES.length) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("[fatal]", err.message);
  process.exit(1);
});

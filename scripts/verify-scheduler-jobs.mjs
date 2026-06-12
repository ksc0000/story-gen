/**
 * scripts/verify-scheduler-jobs.mjs
 *
 * Diagnostic script to verify the successful execution and output of critical
 * scheduled jobs: saveDailySloSnapshot, saveWeeklySloSnapshot, and cleanupStaleGeneration.
 */

import { createRequire } from "module";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const require = createRequire(import.meta.url);

const functionsRequire = createRequire(resolve(__dirname, "../functions/package.json"));
const { initializeApp, cert, getApps } = functionsRequire("firebase-admin/app");
const { getFirestore } = functionsRequire("firebase-admin/firestore");

// Load logic from compiled functions
const sloSnapshot = require("../functions/lib/lib/slo-snapshot.js");
const staleDetection = require("../functions/lib/lib/stale-detection.js");

const args = process.argv.slice(2);
const isTest = args.includes("--test");
const formatArg = args.find(a => a.startsWith("--format="));
const format = formatArg ? formatArg.split("=")[1] : "console";
const help = args.includes("--help") || args.includes("-h");

if (help) {
  console.log(`
verify-scheduler-jobs.mjs -- EhonAI Scheduler Job Verification

Usage:
  node scripts/verify-scheduler-jobs.mjs [options]

Options:
  --test                Run logic verification with mock data (no Firestore)
  --format=<fmt>        Output format: console (default), markdown
  -h, --help            Show this help

Note:
  Requires GOOGLE_APPLICATION_CREDENTIALS unless running with --test.
`);
  process.exit(0);
}

function initFirestore() {
  const credentialPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!credentialPath) {
    throw new Error("GOOGLE_APPLICATION_CREDENTIALS environment variable is not set.");
  }
  if (!fs.existsSync(credentialPath)) {
    throw new Error(`Credential file not found at ${credentialPath}`);
  }
  const serviceAccount = JSON.parse(fs.readFileSync(credentialPath, "utf8"));
  if (getApps().length === 0) {
    initializeApp({
      credential: cert(serviceAccount),
    });
  }
  return getFirestore();
}

async function getSloSnapshots(db) {
  const snapshots = [];
  const snap = await db
    .collection("adminMetrics")
    .doc("sloSnapshots")
    .collection("items")
    .orderBy("createdAtMs", "desc")
    .limit(10)
    .get();

  snap.forEach(doc => {
    snapshots.push({ id: doc.id, ...doc.data() });
  });
  return snapshots;
}

async function getStaleCleanupInfo(db) {
  const mainDoc = await db.collection("adminMetrics").doc("staleCleanup").get();
  const runs = [];
  const runsSnap = await db
    .collection("adminMetrics")
    .doc("staleCleanup")
    .collection("runs")
    .orderBy("createdAtMs", "desc")
    .limit(5)
    .get();

  runsSnap.forEach(doc => {
    runs.push({ id: doc.id, ...doc.data() });
  });

  return {
    summary: mainDoc.exists ? mainDoc.data() : null,
    recentRuns: runs,
  };
}

function renderConsole(data) {
  console.log("=== Scheduler Job Verification ===\n");

  console.log("--- SLO Snapshots (Latest 10) ---");
  if (data.sloSnapshots.length === 0) {
    console.log("No snapshots found.");
  } else {
    data.sloSnapshots.forEach(s => {
      const date = s.createdAtMs ? new Date(s.createdAtMs).toISOString() : "N/A";
      console.log(`[${s.snapshotKey}] Created: ${date} - Books: ${s.bookCount}, Readable: ${s.bookReadableRate?.toFixed(1)}%`);
    });
  }
  console.log("");

  console.log("--- Stale Generation Cleanup ---");
  if (!data.staleCleanup.summary) {
    console.log("No cleanup summary found.");
  } else {
    const lastRun = data.staleCleanup.summary.lastRunAtMs
      ? new Date(data.staleCleanup.summary.lastRunAtMs).toISOString()
      : "N/A";
    console.log(`Last Run: ${lastRun}`);
    console.log(`Last Summary: Checked ${data.staleCleanup.summary.lastSummary?.checkedPages} pages, Updated ${data.staleCleanup.summary.lastSummary?.updatedPages} pages`);
  }
  console.log("\nRecent Runs:");
  if (data.staleCleanup.recentRuns.length === 0) {
    console.log("  No recent runs found.");
  } else {
    data.staleCleanup.recentRuns.forEach(r => {
      const date = r.createdAtMs ? new Date(r.createdAtMs).toISOString() : "N/A";
      console.log(`  [${r.runKey}] ${date}: Pages Checked: ${r.checkedPages}, Updated: ${r.updatedPages}`);
    });
  }
}

function renderMarkdown(data) {
  let md = "# Scheduler Job Verification Report\n\n";

  md += "## SLO Snapshots\n\n";
  md += "| Snapshot Key | Created At (UTC) | Books | Readable Rate | Hard Fail Rate |\n";
  md += "| :--- | :--- | :--- | :--- | :--- |\n";
  if (data.sloSnapshots.length === 0) {
    md += "| N/A | No snapshots found | - | - | - |\n";
  } else {
    data.sloSnapshots.forEach(s => {
      const date = s.createdAtMs ? new Date(s.createdAtMs).toISOString() : "N/A";
      md += `| ${s.snapshotKey} | ${date} | ${s.bookCount} | ${s.bookReadableRate?.toFixed(1)}% | ${s.bookHardFailedRate?.toFixed(1)}% |\n`;
    });
  }
  md += "\n";

  md += "## Stale Generation Cleanup\n\n";
  if (!data.staleCleanup.summary) {
    md += "No cleanup summary found.\n\n";
  } else {
    const lastRun = data.staleCleanup.summary.lastRunAtMs
      ? new Date(data.staleCleanup.summary.lastRunAtMs).toISOString()
      : "N/A";
    md += `**Last Run:** ${lastRun}\n\n`;
    md += "### Recent Runs\n\n";
    md += "| Run Key | Created At (UTC) | Pages Checked | Pages Updated | Books Affected |\n";
    md += "| :--- | :--- | :--- | :--- | :--- |\n";
    data.staleCleanup.recentRuns.forEach(r => {
      const date = r.createdAtMs ? new Date(r.createdAtMs).toISOString() : "N/A";
      md += `| ${r.runKey} | ${date} | ${r.checkedPages} | ${r.updatedPages} | ${r.updatedBooks} |\n`;
    });
  }

  console.log(md);
}

async function runTest() {
  console.log("Running in TEST mode with mock data...\n");

  // Verify logic from compiled functions
  // 1779235200000 = 2026-05-20 00:00:00 UTC -> 2026-05-20 09:00:00 JST
  const mockNow = 1779235200000;
  const dailyKey = sloSnapshot.buildSnapshotKey("daily", mockNow);
  const weeklyKey = sloSnapshot.buildSnapshotKey("weekly", mockNow);
  const cleanupKey = staleDetection.buildCleanupRunKey(mockNow);

  console.log(`Logic Check (Mock Time: ${new Date(mockNow).toISOString()}):`);
  console.log(`- Daily Key:   ${dailyKey} (Expected: daily-2026-05-20)`);
  console.log(`- Weekly Key:  ${weeklyKey} (Expected: weekly-2026-W21)`);
  console.log(`- Cleanup Key: ${cleanupKey} (Expected: daily-2026-05-20-0900)`);
  console.log("");

  const mockData = {
    sloSnapshots: [
      {
        snapshotKey: dailyKey,
        createdAtMs: mockNow,
        bookCount: 35,
        bookReadableRate: 97.1,
        bookHardFailedRate: 2.9,
      },
      {
        snapshotKey: "daily-2026-07-20",
        createdAtMs: mockNow - 86400000,
        bookCount: 40,
        bookReadableRate: 100.0,
        bookHardFailedRate: 0.0,
      }
    ],
    staleCleanup: {
      summary: {
        lastRunAtMs: mockNow,
        lastSummary: { checkedPages: 10, updatedPages: 2 }
      },
      recentRuns: [
        {
          runKey: cleanupKey,
          createdAtMs: mockNow,
          checkedPages: 10,
          updatedPages: 2,
          updatedBooks: 1,
        }
      ]
    }
  };

  if (format === "markdown") {
    renderMarkdown(mockData);
  } else {
    renderConsole(mockData);
  }

  // Validation
  if (dailyKey !== "daily-2026-05-20") throw new Error(`Daily key mismatch: got ${dailyKey}`);
  if (weeklyKey !== "weekly-2026-W21") throw new Error(`Weekly key mismatch: got ${weeklyKey}`);
  if (cleanupKey !== "daily-2026-05-20-0900") throw new Error(`Cleanup key mismatch: got ${cleanupKey}`);

  console.log("\nTEST PASSED: Logic verification successful.");
}

async function main() {
  if (isTest) {
    await runTest();
    return;
  }

  try {
    const db = initFirestore();
    const [sloSnapshots, staleCleanup] = await Promise.all([
      getSloSnapshots(db),
      getStaleCleanupInfo(db),
    ]);

    const data = { sloSnapshots, staleCleanup };

    if (format === "markdown") {
      renderMarkdown(data);
    } else {
      renderConsole(data);
    }
  } catch (error) {
    console.error("Error during verification:", error.message);
    process.exit(1);
  }
}

main();

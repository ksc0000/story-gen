/**
 * P2-5: Public asset URL smoke checker.
 *
 * Verifies that all public WebP asset URLs used by EhonAI resolve successfully,
 * so that T7 public asset refresh does not regress.
 *
 * Baseline: T7-5c manually verified 37/37 HTTP 200 (2026-05-19).
 * This script turns that manual check into a repeatable command.
 *
 * Asset manifest is maintained as an explicit list here rather than parsing
 * TypeScript source files at runtime, which would be fragile.
 * Each entry notes its source-of-truth file.
 *
 * Proxy support: Reads HTTPS_PROXY / https_proxy / HTTP_PROXY / http_proxy
 * environment variables automatically. On Windows the system proxy set via
 * Internet Options is NOT read by Node.js by default -- set HTTPS_PROXY manually
 * or export it from your shell profile.
 *
 * Usage:
 *   node scripts/check-public-assets.mjs
 *   node scripts/check-public-assets.mjs --base-url https://story-gen-8a769.web.app
 *   node scripts/check-public-assets.mjs --base-url http://localhost:3000
 *   PUBLIC_ASSET_BASE_URL=http://localhost:3000 node scripts/check-public-assets.mjs
 *   HTTPS_PROXY=http://proxy:8080 node scripts/check-public-assets.mjs
 *   node scripts/check-public-assets.mjs --group A          # single group
 *   node scripts/check-public-assets.mjs --group A,B        # multiple groups
 *   node scripts/check-public-assets.mjs --list             # dry-run: print URLs only
 *   node scripts/check-public-assets.mjs --stale-png        # stale .png reference guard only
 *   node scripts/check-public-assets.mjs --help
 *
 * Exit codes:
 *   0  All required checks passed
 *   1  One or more required asset checks failed
 *   2  Stale .png references detected (when --stale-png is used)
 */

import fs from 'fs';
import http from 'http';
import https from 'https';
import tls from 'tls';
import path from 'path';
import { URL } from 'url';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

// ---------------------------------------------------------------------------
// CLI parsing
// ---------------------------------------------------------------------------
const args = process.argv.slice(2);
const showHelp = args.includes('--help') || args.includes('-h');
const isDryRun = args.includes('--list') || args.includes('--dry-run');
const stalePngOnly = args.includes('--stale-png');

const baseUrlFlag = (() => {
  const idx = args.findIndex((a) => a === '--base-url');
  return idx >= 0 ? args[idx + 1] : null;
})();

const groupFlag = (() => {
  const idx = args.findIndex((a) => a === '--group');
  return idx >= 0 ? args[idx + 1] : null;
})();

const DEFAULT_BASE_URL = 'https://story-gen-8a769.web.app';
const baseUrl = (
  baseUrlFlag ||
  process.env.PUBLIC_ASSET_BASE_URL ||
  DEFAULT_BASE_URL
).replace(/\/$/, '');

const activeGroups = groupFlag
  ? new Set(groupFlag.toUpperCase().split(',').map((g) => g.trim()))
  : new Set(['A', 'B', 'C', 'D']);

// Proxy detection from environment variables (standard convention)
const proxyUrl =
  process.env.HTTPS_PROXY ||
  process.env.https_proxy ||
  process.env.HTTP_PROXY ||
  process.env.http_proxy ||
  null;

if (showHelp) {
  console.log(`
check-public-assets.mjs -- EhonAI public asset URL smoke checker

Usage:
  node scripts/check-public-assets.mjs [options]

Options:
  --base-url <url>    Base URL to check (default: ${DEFAULT_BASE_URL})
  --group <groups>    Comma-separated group(s) to check: A,B,C,D (default: all)
  --list              Dry-run: print URLs without making requests
  --stale-png         Check for stale .png references in source files instead
  -h, --help          Show this help

Environment variables:
  PUBLIC_ASSET_BASE_URL   Alternative to --base-url
  HTTPS_PROXY             HTTP proxy URL (e.g. http://proxy.example.com:8080)

Exit codes:
  0  All checks passed
  1  One or more asset checks failed
  2  Stale .png references detected (--stale-png mode)

Groups:
  A  Style preview images      (/images/styles/*.webp)        10 URLs
  B  Template thumbnail images (/images/templates/*.webp)     10 URLs
  C  UI illustrations & icons  (/images/illustrations/ + /images/icons/)  7 URLs
  D  Quality sample images     (/images/samples/*.webp)       10 URLs
  Total: 37 URLs
`);
  process.exit(0);
}

// ---------------------------------------------------------------------------
// Asset manifest
// Source-of-truth for each group is noted in comments.
// Updated when T7 asset set changes.
// ---------------------------------------------------------------------------

// Group A: Style preview images
// Source: src/lib/illustration-styles.ts -> previewImageUrl
// T7-3b regenerated as WebP; T7-5c verified all 10 -> 200 image/webp
const GROUP_A = [
  '/images/styles/soft_watercolor.webp',
  '/images/styles/fluffy_pastel.webp',
  '/images/styles/crayon.webp',
  '/images/styles/flat_illustration.webp',
  '/images/styles/anime_storybook.webp',
  '/images/styles/classic_picture_book.webp',
  '/images/styles/toy_3d.webp',
  '/images/styles/paper_collage.webp',
  '/images/styles/pencil_sketch.webp',
  '/images/styles/colorful_pop.webp',
];

// Group B: Template thumbnail images
// Source: functions/src/seed-templates.ts -> sampleImageUrl (Firestore source of truth)
// T7-4.x regenerated as WebP; T7-5c verified all 10 -> 200 image/webp
// Note: src/lib/demo.ts still references .png for demo mode only (cosmetic, does not break prod)
const GROUP_B = [
  '/images/templates/animals.webp',
  '/images/templates/adventure.webp',
  '/images/templates/fantasy.webp',
  '/images/templates/bedtime.webp',
  '/images/templates/emotional-growth.webp',
  '/images/templates/daily-habits.webp',
  '/images/templates/educational.webp',
  '/images/templates/food.webp',
  '/images/templates/seasonal.webp',
  '/images/templates/vehicles-robots.webp',
];

// Group C: UI illustrations & icons
// Source: hardcoded in src/app/ and src/components/
// T7-2: created as WebP; T7-2.5 verified all 7 -> 200 image/webp
const GROUP_C = [
  '/images/illustrations/hero.webp',
  '/images/illustrations/empty-shelf.webp',
  '/images/illustrations/generating.webp',
  '/images/icons/book.webp',
  '/images/icons/palette.webp',
  '/images/icons/shield.webp',
  '/images/icons/star.webp',
];

// Group D: Quality sample images
// Source: functions/src/seed-templates.ts -> sampleImages.{light,premium}
// Firestore field updated T7-5b; T7-5c verified all 10 -> 200 image/webp
// 5 templates x 2 tiers (light + premium) = 10 images
const GROUP_D = [
  '/images/samples/fantasy_light.webp',
  '/images/samples/fantasy_premium.webp',
  '/images/samples/bedtime_light.webp',
  '/images/samples/bedtime_premium.webp',
  '/images/samples/animals_light.webp',
  '/images/samples/animals_premium.webp',
  '/images/samples/adventure_light.webp',
  '/images/samples/adventure_premium.webp',
  '/images/samples/emotional-growth_light.webp',
  '/images/samples/emotional-growth_premium.webp',
];

const ALL_GROUPS = {
  A: { label: 'Style previews        ', paths: GROUP_A },
  B: { label: 'Template thumbnails   ', paths: GROUP_B },
  C: { label: 'UI illustrations/icons', paths: GROUP_C },
  D: { label: 'Quality samples       ', paths: GROUP_D },
};

// ---------------------------------------------------------------------------
// Stale .png reference guard
// ---------------------------------------------------------------------------
async function runStalePngGuard() {
  console.log('\n=== Stale .png Reference Guard ===\n');

  const PNG_PATTERN = /\/images\/(styles|templates|illustrations|icons|samples)\/[^"'\s]+\.png/g;

  const filesToScan = [
    'src/lib/illustration-styles.ts',
    'src/lib/demo.ts',
    'functions/src/lib/illustration-styles.ts',
    'functions/src/seed-templates.ts',
    'src/app/page.tsx',
    'src/app/(app)/home/page.tsx',
    'src/app/(app)/generating/page.tsx',
    'src/components/book-card.tsx',
    'src/components/theme-card.tsx',
  ];

  const stalePngRefs = [];

  for (const relPath of filesToScan) {
    const fullPath = path.join(ROOT, relPath);
    if (!fs.existsSync(fullPath)) {
      continue;
    }
    const content = fs.readFileSync(fullPath, 'utf8');
    const matches = Array.from(content.matchAll(PNG_PATTERN));
    for (const match of matches) {
      stalePngRefs.push({ file: relPath, ref: match[0] });
    }
  }

  if (stalePngRefs.length === 0) {
    console.log('OK: No stale .png references found in source files.\n');
    return 0;
  }

  console.log(`WARNING: Found ${stalePngRefs.length} stale .png reference(s):\n`);
  for (const { file, ref } of stalePngRefs) {
    console.log(`  ${file}`);
    console.log(`    -> ${ref}`);
  }
  console.log('');
  console.log('NOTE: These references may point to PNG files that still exist and serve correctly.');
  console.log('      However, T7 migrated all public sample assets to WebP.');
  console.log('      Consider updating these references to .webp equivalents.');
  console.log('');
  return 2;
}

// ---------------------------------------------------------------------------
// HTTP request via proxy (HTTPS CONNECT tunnel through HTTP proxy)
// ---------------------------------------------------------------------------
function requestViaProxy(targetUrl, method, proxyUrlStr) {
  return new Promise((resolve) => {
    const target = new URL(targetUrl);
    const proxy = new URL(proxyUrlStr);
    const TIMEOUT_MS = 30000;

    const connectReq = http.request({
      host: proxy.hostname,
      port: parseInt(proxy.port, 10) || 80,
      method: 'CONNECT',
      path: target.hostname + ':' + (target.port || 443),
      timeout: TIMEOUT_MS,
    });

    let resolved = false;
    const done = (result) => {
      if (!resolved) {
        resolved = true;
        resolve(result);
      }
    };

    connectReq.on('connect', (_res, socket) => {
      const tlsSocket = tls.connect(
        {
          socket: socket,
          servername: target.hostname,
          rejectUnauthorized: false,
        },
        () => {
          const reqPath = (target.pathname || '/') + (target.search || '');
          tlsSocket.write(
            method + ' ' + reqPath + ' HTTP/1.1\r\n' +
            'Host: ' + target.hostname + '\r\n' +
            'Connection: close\r\n\r\n'
          );

          let raw = '';
          tlsSocket.on('data', (chunk) => {
            raw += chunk.toString('binary');
            if (raw.includes('\r\n\r\n')) {
              tlsSocket.destroy();
            }
          });

          const parseAndDone = () => {
            const statusMatch = raw.match(/^HTTP\/\d\.\d (\d+)/);
            const ctMatch = raw.match(/content-type:\s*([^\r\n]+)/i);
            done({
              status: statusMatch ? parseInt(statusMatch[1], 10) : null,
              contentType: ctMatch ? ctMatch[1].trim() : '',
              error: null,
            });
          };

          tlsSocket.on('close', () => {
            if (!resolved) parseAndDone();
          });
          tlsSocket.on('end', () => {
            if (!resolved) parseAndDone();
          });
          tlsSocket.on('error', (err) => {
            done({ status: null, contentType: '', error: 'TLS: ' + err.message });
          });
        }
      );
      tlsSocket.on('error', (err) => {
        done({ status: null, contentType: '', error: 'TLS connect: ' + err.message });
      });
    });

    connectReq.on('error', (err) => {
      done({ status: null, contentType: '', error: 'CONNECT: ' + err.message });
    });
    connectReq.on('timeout', () => {
      connectReq.destroy();
      done({ status: null, contentType: '', error: 'CONNECT timeout' });
    });
    connectReq.end();
  });
}

// ---------------------------------------------------------------------------
// Direct HTTPS/HTTP request (no proxy)
// ---------------------------------------------------------------------------
function requestDirect(targetUrl, method) {
  return new Promise((resolve) => {
    const target = new URL(targetUrl);
    const mod = target.protocol === 'http:' ? http : https;
    const TIMEOUT_MS = 30000;

    const req = mod.request(
      {
        hostname: target.hostname,
        port: target.port || (target.protocol === 'http:' ? 80 : 443),
        path: (target.pathname || '/') + (target.search || ''),
        method: method,
        headers: { Host: target.hostname },
        timeout: TIMEOUT_MS,
        rejectUnauthorized: false,
      },
      (res) => {
        res.resume(); // Consume to avoid socket hang
        resolve({
          status: res.statusCode || null,
          contentType: res.headers['content-type'] || '',
          error: null,
        });
      }
    );
    req.on('error', (err) => {
      resolve({ status: null, contentType: '', error: err.message });
    });
    req.on('timeout', () => {
      req.destroy();
      resolve({ status: null, contentType: '', error: 'Request timeout' });
    });
    req.end();
  });
}

// ---------------------------------------------------------------------------
// Check a single URL
// ---------------------------------------------------------------------------
async function checkUrl(url) {
  const start = Date.now();

  const doRequest = (method) =>
    proxyUrl
      ? requestViaProxy(url, method, proxyUrl)
      : requestDirect(url, method);

  let result = await doRequest('HEAD');

  // Fallback to GET if HEAD fails or returns unexpected server-error
  if (result.error || (result.status !== null && result.status >= 405 && result.status < 500)) {
    const fallback = await doRequest('GET');
    if (!fallback.error) {
      result = fallback;
    }
  }

  const durationMs = Date.now() - start;
  const pass = !result.error && result.status === 200;
  const webpOk = pass && result.contentType.includes('image/');

  return {
    url,
    status: result.status,
    contentType: result.contentType,
    durationMs,
    pass,
    webpOk,
    error: result.error,
  };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

if (stalePngOnly) {
  const code = await runStalePngGuard();
  process.exit(code);
}

console.log('\n=== EhonAI Public Asset Smoke Checker ===');
console.log('Base URL : ' + baseUrl);
console.log('Groups   : ' + Array.from(activeGroups).sort().join(', '));
if (proxyUrl) {
  try {
    const p = new URL(proxyUrl);
    console.log('Proxy    : ' + p.protocol + '//' + p.host);
  } catch {
    console.log('Proxy    : (configured)');
  }
}
if (isDryRun) {
  console.log('Mode     : DRY RUN (list only)\n');
} else {
  console.log('Mode     : LIVE CHECK\n');
}

// Collect tasks for active groups
const tasks = [];
for (const [groupId, { label, paths }] of Object.entries(ALL_GROUPS)) {
  if (!activeGroups.has(groupId)) continue;
  for (const urlPath of paths) {
    tasks.push({ groupId, label, urlPath, url: baseUrl + urlPath });
  }
}

if (isDryRun) {
  console.log('URLs to be checked:\n');
  let currentGroup = null;
  for (const { groupId, urlPath } of tasks) {
    if (groupId !== currentGroup) {
      const { label } = ALL_GROUPS[groupId];
      console.log('Group ' + groupId + ': ' + label.trim());
      currentGroup = groupId;
    }
    console.log('  ' + urlPath);
  }
  console.log('\nTotal: ' + tasks.length + ' URL(s)');
  process.exit(0);
}

// Run checks with concurrency limit
const CONCURRENCY = 4;
const results = [];

for (let i = 0; i < tasks.length; i += CONCURRENCY) {
  const batch = tasks.slice(i, i + CONCURRENCY);
  const batchResults = await Promise.all(
    batch.map(async ({ groupId, label, urlPath, url }) => {
      const result = await checkUrl(url);
      return Object.assign({ groupId, label, urlPath }, result);
    })
  );
  results.push(...batchResults);
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------
const groupSummary = {};
for (const [groupId, { label }] of Object.entries(ALL_GROUPS)) {
  groupSummary[groupId] = { label: label.trim(), pass: 0, fail: 0, total: 0 };
}

const failures = [];

for (const result of results) {
  const { groupId, urlPath, pass, webpOk, status, contentType, error, durationMs } = result;
  groupSummary[groupId].total++;
  if (pass) {
    groupSummary[groupId].pass++;
  } else {
    groupSummary[groupId].fail++;
    failures.push({ groupId, urlPath, status, contentType, error, durationMs });
  }
  if (pass && !webpOk) {
    console.log('  WARN Group ' + groupId + ': ' + urlPath + ' -- status 200 but content-type: ' + contentType);
  }
}

console.log('\n--- Results ---\n');

let totalPass = 0;
let totalFail = 0;

for (const [groupId, { label, pass, fail, total }] of Object.entries(groupSummary)) {
  if (!activeGroups.has(groupId)) continue;
  const icon = fail === 0 ? 'PASS' : 'FAIL';
  console.log('  Group ' + groupId + ': ' + label.padEnd(25) + ' ' + pass + '/' + total + ' ' + icon);
  totalPass += pass;
  totalFail += fail;
}

const totalChecked = totalPass + totalFail;
const allPassed = totalFail === 0;

console.log('  ' + '-'.repeat(50));
console.log('  Total:                              ' + totalPass + '/' + totalChecked + ' ' + (allPassed ? 'PASS' : 'FAIL'));

if (failures.length > 0) {
  console.log('\n--- Failed URLs ---\n');
  for (const { groupId, urlPath, status, contentType, error, durationMs } of failures) {
    console.log('  FAIL Group ' + groupId + ': ' + urlPath);
    if (error) {
      console.log('       Error  : ' + error);
    } else {
      console.log('       Status : ' + status);
      console.log('       Type   : ' + contentType);
    }
    console.log('       Time   : ' + durationMs + 'ms');
  }
}

console.log('');

if (allPassed) {
  console.log('OK: All ' + totalChecked + ' asset URL(s) returned HTTP 200.\n');
  process.exit(0);
} else {
  console.log('FAIL: ' + totalFail + ' asset URL(s) failed. Review the list above.\n');
  process.exit(1);
}

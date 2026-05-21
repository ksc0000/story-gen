/**
 * _export-cloud-logging.mjs
 *
 * One-shot script: exports Cloud Logging generation_event entries (last 7 days)
 * from story-gen-8a769 using the service account at C:\Users\CN63738\secrets\service-account.json.
 *
 * Usage:
 *   node scripts/_export-cloud-logging.mjs [--out tmp/p4-16-baseline-events.json] [--days 7]
 *
 * Writes a JSON array of raw log entries to the output file.
 * This file is in .gitignore (tmp/ is excluded). Do NOT commit it.
 *
 * Auth: creates a service-account JWT, exchanges for an access token via
 * https://oauth2.googleapis.com/token, then calls
 * https://logging.googleapis.com/v2/entries:list (read-only).
 *
 * Proxy: respects HTTPS_PROXY / HTTP_PROXY environment variable automatically
 * via the built-in node:https module tunnel.
 *
 * Requires: Node.js 20+ (built-in crypto, https).
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createSign } from 'node:crypto';
import https from 'node:https';
import http from 'node:http';
import { URL } from 'node:url';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// --- CLI args ---
const args = process.argv.slice(2);
function getArg(name, def) {
  const i = args.indexOf(name);
  return i !== -1 ? args[i + 1] : def;
}
const outFile = getArg('--out', path.resolve(__dirname, '../tmp/p4-16-baseline-events.json'));
const days = Number(getArg('--days', '7'));
const SA_PATH = getArg('--sa', 'C:\\Users\\CN63738\\secrets\\service-account.json');
const PROJECT = getArg('--project', 'story-gen-8a769');
const FILTER = getArg('--filter', 'jsonPayload.message="generation_event"');

// --- Proxy detection ---
const proxyUrl = process.env.HTTPS_PROXY || process.env.https_proxy || process.env.HTTP_PROXY || process.env.http_proxy || null;
if (proxyUrl) console.error(`[export] Using proxy: ${proxyUrl}`);

// --- Low-level HTTPS request (proxy-aware) ---
function httpsRequest(urlStr, opts = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlStr);

    const doRequest = (agent) => {
      const reqOpts = {
        hostname: url.hostname,
        port: url.port || 443,
        path: url.pathname + url.search,
        method: opts.method || 'GET',
        headers: opts.headers || {},
        ...(agent ? { agent } : {}),
      };
      const req = https.request(reqOpts, (res) => {
        const chunks = [];
        res.on('data', c => chunks.push(c));
        res.on('end', () => resolve({ status: res.statusCode, body: Buffer.concat(chunks).toString('utf8') }));
      });
      req.on('error', reject);
      if (opts.body) req.write(opts.body);
      req.end();
    };

    if (proxyUrl) {
      const proxy = new URL(proxyUrl);
      const connectReq = http.request({
        hostname: proxy.hostname,
        port: proxy.port || 8080,
        method: 'CONNECT',
        path: `${url.hostname}:${url.port || 443}`,
        headers: { Host: `${url.hostname}:${url.port || 443}` },
      });
      connectReq.on('connect', (_res, socket) => {
        const agent = new https.Agent({ socket, keepAlive: false });
        doRequest(agent);
      });
      connectReq.on('error', reject);
      connectReq.end();
    } else {
      doRequest(null);
    }
  });
}

// --- Load service account ---
const sa = JSON.parse(readFileSync(SA_PATH, 'utf8'));

// --- Create JWT ---
function base64url(buf) {
  return Buffer.from(buf).toString('base64url');
}

function makeJwt(sa) {
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const payload = base64url(JSON.stringify({
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/logging.read',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  }));
  const toSign = `${header}.${payload}`;
  const sign = createSign('RSA-SHA256');
  sign.update(toSign);
  const sig = sign.sign(sa.private_key, 'base64url');
  return `${toSign}.${sig}`;
}

// --- Exchange JWT for access token ---
async function getAccessToken(sa) {
  const jwt = makeJwt(sa);
  const body = `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`;
  const result = await httpsRequest('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(body),
    },
    body,
  });
  if (result.status !== 200) {
    throw new Error(`Token request failed ${result.status}: ${result.body}`);
  }
  const data = JSON.parse(result.body);
  return data.access_token;
}

// --- Cloud Logging entries:list ---
async function listEntries(token, opts) {
  const { projectId, filter, orderBy, pageSize, pageToken } = opts;
  const reqBody = JSON.stringify({
    resourceNames: [`projects/${projectId}`],
    filter,
    orderBy: orderBy || 'timestamp desc',
    pageSize: pageSize || 1000,
    ...(pageToken ? { pageToken } : {}),
  });
  const result = await httpsRequest('https://logging.googleapis.com/v2/entries:list', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(reqBody),
    },
    body: reqBody,
  });
  if (result.status !== 200) {
    throw new Error(`Logging API error ${result.status}: ${result.body}`);
  }
  return JSON.parse(result.body);
}

// --- Main ---
async function main() {
  const startTime = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const fullFilter = `${FILTER} AND timestamp>="${startTime}"`;

  console.error(`[export] Project: ${PROJECT}`);
  console.error(`[export] Filter: ${fullFilter}`);
  console.error(`[export] Output: ${outFile}`);

  // Ensure output directory exists
  mkdirSync(path.dirname(outFile), { recursive: true });

  console.error('[export] Authenticating...');
  const token = await getAccessToken(sa);
  console.error('[export] Got access token.');

  const allEntries = [];
  let pageToken = undefined;
  let page = 0;

  while (true) {
    page++;
    process.stderr.write(`[export] Fetching page ${page} (${allEntries.length} entries so far)...\n`);
    const result = await listEntries(token, {
      projectId: PROJECT,
      filter: fullFilter,
      orderBy: 'timestamp desc',
      pageSize: 1000,
      pageToken,
    });

    const entries = result.entries || [];
    allEntries.push(...entries);

    if (!result.nextPageToken || entries.length === 0) break;
    pageToken = result.nextPageToken;
  }

  console.error(`[export] Total entries: ${allEntries.length}`);

  // Write as JSON array (compatible with report-generation-slo.mjs --input)
  writeFileSync(outFile, JSON.stringify(allEntries, null, 2), 'utf8');
  console.error(`[export] Written to: ${outFile}`);
}

main().catch(err => {
  console.error('[export] FATAL:', err.message);
  process.exit(1);
});

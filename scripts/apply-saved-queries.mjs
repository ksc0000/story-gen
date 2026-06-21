/**
 * scripts/apply-saved-queries.mjs
 *
 * Automates the deployment of Cloud Logging saved queries (savedViews)
 * defined in docs/P2_GENERATION_SLO_SAVED_LOGGING_QUERIES.md.
 *
 * Usage:
 *   node scripts/apply-saved-queries.mjs [--project <id>] [--dry-run]
 *
 * Auth: uses GOOGLE_APPLICATION_CREDENTIALS or a service account JSON file.
 * Requires: roles/logging.admin or logging.views.create/update permissions.
 */

import { readFileSync } from 'node:fs';
import { createSign } from 'node:crypto';
import https from 'node:https';
import http from 'node:http';
import { URL } from 'node:url';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// --- CLI args ---
const args = process.argv.slice(2);
function getArg(name) {
  const i = args.indexOf(name);
  if (i === -1) return null;
  const val = args[i + 1];
  if (val === undefined || val.startsWith('--')) return null;
  return val;
}

const dryRun = args.includes('--dry-run');
// Default project fallback to story-gen-8a769 if not provided via arg or env
const PROJECT = getArg('--project') || process.env.GOOGLE_CLOUD_PROJECT || 'story-gen-8a769';
const SA_PATH = getArg('--sa') || process.env.GOOGLE_APPLICATION_CREDENTIALS;
const MD_PATH = path.resolve(__dirname, '../docs/P2_GENERATION_SLO_SAVED_LOGGING_QUERIES.md');

// --- Proxy detection ---
const proxyUrl = process.env.HTTPS_PROXY || process.env.https_proxy || process.env.HTTP_PROXY || process.env.http_proxy || null;

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

// --- Create JWT ---
function base64url(buf) {
  return Buffer.from(buf).toString('base64url');
}

function makeJwt(sa) {
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const payload = base64url(JSON.stringify({
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/logging.admin',
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

// --- Parse Markdown for Queries ---
function parseQueries(mdContent) {
  const queries = [];
  const lines = mdContent.split('\n');
  let currentName = null;
  let inCodeBlock = false;
  let currentFilter = [];

  for (const line of lines) {
    if (line.startsWith('#### ')) {
      currentName = line.replace('#### ', '').trim();
    } else if (line.startsWith('```')) {
      if (!inCodeBlock) {
        inCodeBlock = true;
        currentFilter = [];
      } else {
        inCodeBlock = false;
        if (currentName && currentFilter.length > 0) {
          queries.push({
            displayName: currentName,
            query: currentFilter.join('\n').trim(), // Cloud Logging API uses 'query', not 'filter'
          });
        }
        currentName = null;
      }
    } else if (inCodeBlock) {
      currentFilter.push(line);
    }
  }
  return queries;
}

// --- Cloud Logging API Calls ---
async function listAllSavedViews(token, projectId) {
  const allViews = [];
  let pageToken = '';

  while (true) {
    const url = `https://logging.googleapis.com/v2/projects/${projectId}/locations/global/savedViews${pageToken ? `?pageToken=${pageToken}` : ''}`;
    const result = await httpsRequest(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (result.status !== 200) {
      throw new Error(`Failed to list saved views ${result.status}: ${result.body}`);
    }
    const data = JSON.parse(result.body);
    if (data.savedViews) {
      allViews.push(...data.savedViews);
    }
    if (!data.nextPageToken) break;
    pageToken = data.nextPageToken;
  }
  return allViews;
}

async function createSavedView(token, projectId, view) {
  const url = `https://logging.googleapis.com/v2/projects/${projectId}/locations/global/savedViews`;
  const result = await httpsRequest(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(view),
  });
  if (result.status !== 200 && result.status !== 201) {
    throw new Error(`Failed to create saved view "${view.displayName}" ${result.status}: ${result.body}`);
  }
  return JSON.parse(result.body);
}

async function updateSavedView(token, resourceName, view) {
  // PATCH https://logging.googleapis.com/v2/{name}?updateMask=query
  const url = `https://logging.googleapis.com/v2/${resourceName}?updateMask=query`;
  const result = await httpsRequest(url, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(view),
  });
  if (result.status !== 200) {
    throw new Error(`Failed to update saved view "${view.displayName}" (${resourceName}) ${result.status}: ${result.body}`);
  }
  return JSON.parse(result.body);
}

// --- Main ---
async function main() {
  console.error(`[apply] Project: ${PROJECT}`);
  if (dryRun) console.error('[apply] DRY RUN MODE - no changes will be made');

  const mdContent = readFileSync(MD_PATH, 'utf8');
  const queries = parseQueries(mdContent);
  console.error(`[apply] Parsed ${queries.length} queries from ${MD_PATH}`);

  if (dryRun) {
    for (const q of queries) {
      console.log(`\nName: ${q.displayName}`);
      console.log(`Query:\n${q.query}`);
    }
  }

  if (dryRun) return;

  if (!SA_PATH) {
    throw new Error('GOOGLE_APPLICATION_CREDENTIALS or --sa must be set');
  }

  const sa = JSON.parse(readFileSync(SA_PATH, 'utf8'));
  console.error('[apply] Authenticating...');
  const token = await getAccessToken(sa);
  console.error('[apply] Got access token.');

  console.error('[apply] Fetching existing saved views...');
  const existingViews = await listAllSavedViews(token, PROJECT);
  console.error(`[apply] Found ${existingViews.length} existing saved views.`);

  for (const q of queries) {
    const matched = existingViews.find(v => v.displayName === q.displayName);
    if (matched) {
      if (matched.query === q.query) {
        console.error(`[apply] Query "${q.displayName}" is already up to date. Skipping.`);
      } else {
        console.error(`[apply] Updating query "${q.displayName}"...`);
        await updateSavedView(token, matched.name, q);
        console.error(`[apply] Updated.`);
      }
    } else {
      console.error(`[apply] Creating query "${q.displayName}"...`);
      await createSavedView(token, PROJECT, q);
      console.error(`[apply] Created.`);
    }
  }

  console.error('[apply] Done.');
}

main().catch(err => {
  console.error('[apply] FATAL:', err.message);
  process.exit(1);
});

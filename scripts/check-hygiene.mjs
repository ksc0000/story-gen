import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const normalizePath = (p) => p.replace(/\\/g, '/');

const forbiddenPathChecks = [
  { name: 'functions/lib', regex: /^functions\/lib(?:\/|$)/ },
  { name: '.tmp', regex: /^\.tmp(?:\/|$)/ },
  { name: 'page-qa-*.png', regex: /^page-qa-.*\.png$/ },
  { name: 'scripts/_*.js', regex: /^scripts\/_.*\.js$/ },
  { name: '.claude/settings.local.json', regex: /^\.claude\/settings\.local\.json$/ },
  { name: 'service-account.json', regex: /^service-account\.json$/ },
  { name: '.firebase', regex: /^\.firebase(?:\/|$)/ },
  { name: '.vercel', regex: /^\.vercel(?:\/|$)/ },
  { name: '.env.local', regex: /^\.env\.local$/ },
  { name: '.env.*.local', regex: /^\.env\..*\.local$/ },
  { name: '*.pem', regex: /^.*\.pem$/ },
];

const secretPatterns = [
  { name: 'Firebase API key', regex: /AIza[0-9A-Za-z_-]{35}/g },
  { name: 'Private key block', regex: /-----BEGIN (?:RSA|EC|OPENSSH|PRIVATE KEY)-----/g },
  { name: 'Google storage token URL', regex: /https?:\/\/storage\.googleapis\.com\/[^"]+[?&](?:token|access_token|x-goog-|auth|st=)/gi },
  { name: 'Service account email', regex: /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.iam\.gserviceaccount\.com/g },
];

const runGit = (command) => {
  return execSync(command, { cwd: ROOT, encoding: 'utf8' }).trim();
};

const stagedFiles = runGit('git diff --cached --name-only --diff-filter=ACMR').split('\n').filter(Boolean);
const trackedFiles = runGit('git ls-files').split('\n').filter(Boolean);

const checkForbiddenPaths = (files, description) => {
  const violations = [];

  for (const file of files) {
    const normalized = normalizePath(file);
    for (const check of forbiddenPathChecks) {
      if (check.regex.test(normalized)) {
        violations.push({ file: normalized, rule: check.name });
        break;
      }
    }
  }

  if (violations.length > 0) {
    console.error(`\n[ERROR] Forbidden paths detected in ${description}:`);
    for (const violation of violations) {
      console.error(`  - ${violation.file}  (${violation.rule})`);
    }
  }

  return violations;
};

const checkDocsMojibake = (files) => {
  const violations = [];

  for (const file of files) {
    const fullPath = path.join(ROOT, file);
    let content;
    try {
      content = fs.readFileSync(fullPath, 'utf8');
    } catch (error) {
      console.error(`\n[ERROR] Failed to read ${file}: ${error.message}`);
      violations.push({ file, reason: 'read failure' });
      continue;
    }

    if (content.includes('\uFFFD')) {
      violations.push({ file, reason: 'invalid UTF-8 or replacement characters detected' });
    }
  }

  if (violations.length > 0) {
    console.error('\n[ERROR] Docs encoding issues detected:');
    for (const violation of violations) {
      console.error(`  - ${violation.file}: ${violation.reason}`);
    }
  }

  return violations;
};

const checkSecretPatterns = (files) => {
  const violations = [];

  for (const file of files) {
    const fullPath = path.join(ROOT, file);
    let content;
    try {
      content = fs.readFileSync(fullPath, 'utf8');
    } catch {
      continue;
    }

    for (const pattern of secretPatterns) {
      if (pattern.regex.test(content)) {
        violations.push({ file: normalizePath(file), pattern: pattern.name });
      }
    }
  }

  if (violations.length > 0) {
    console.error('\n[ERROR] Secret-like patterns detected in staged files:');
    for (const violation of violations) {
      console.error(`  - ${violation.file}  (${violation.pattern})`);
    }
  }

  return violations;
};

const stagedForChecking = [...new Set(stagedFiles)];
const docsFiles = trackedFiles.filter((file) => normalizePath(file).startsWith('docs/') && file.endsWith('.md'));

const errors = [];

errors.push(...checkForbiddenPaths(trackedFiles, 'tracked files'));
errors.push(...checkForbiddenPaths(stagedForChecking, 'staged files'));
errors.push(...checkDocsMojibake(docsFiles));
errors.push(...checkSecretPatterns(stagedForChecking));

if (errors.length > 0) {
  console.error(`\n[FAIL] guard:hygiene found ${errors.length} issue(s).`);
  process.exit(1);
}

console.log('[PASS] guard:hygiene passed. No forbidden paths, docs encoding issues, or staged secret-like patterns detected.');

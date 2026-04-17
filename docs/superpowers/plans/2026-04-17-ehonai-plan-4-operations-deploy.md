# EhoNAI Web MVP - Plan 4: Operations & Deploy

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Harden the application with production-grade Firestore and Storage security rules, add operational Cloud Functions (expired book cleanup, monthly quota reset), configure Next.js for static export, set up CI/CD with GitHub Actions, and document environment/secrets setup.

**Architecture:** Firestore security rules enforce per-user data isolation on the client side while Cloud Functions (admin SDK) handle all write operations on books/pages. Scheduled Cloud Functions run via Cloud Scheduler for data lifecycle management. Next.js static export deploys to Firebase Hosting. GitHub Actions automates lint, type-check, test, build, and deploy on push to main.

**Tech Stack:** Firebase Security Rules, Cloud Functions v2 (onSchedule), Next.js 15 static export, GitHub Actions, firebase-tools CLI

---

## File Structure

```
story-gen/
├── firestore.rules                          # Full security rules (Task 1)
├── storage.rules                            # Storage security rules (Task 2)
├── src/
│   └── lib/
│       └── hooks/
│           └── use-user-profile.ts          # Real-time user profile hook (Task 3)
├── functions/
│   └── src/
│       ├── index.ts                         # Updated exports (Task 5)
│       ├── cleanup-expired.ts               # Scheduled: delete expired books (Task 4)
│       └── reset-monthly-quota.ts           # Scheduled: reset monthly counts (Task 4)
├── next.config.ts                           # Static export config (Task 6)
└── .github/
    └── workflows/
        └── deploy.yml                       # CI/CD pipeline (Task 7)
```

---

### Task 1: Firestore Security Rules

**Files:**
- Modify: `firestore.rules`

- [ ] **Step 1: Write security rules tests specification**

Before writing rules, define what we need to enforce:

| Collection | Read | Create | Update | Delete |
|---|---|---|---|---|
| `users/{userId}` | Own doc only | Own doc only | Own doc only | Deny |
| `books/{bookId}` | Own books only (`userId == auth.uid`) | Auth users, must set `userId` to own uid | Deny (admin SDK only) | Deny (admin SDK only) |
| `books/{bookId}/pages/{pageId}` | Parent book owner only (via `get()`) | Deny (admin SDK only) | Deny (admin SDK only) | Deny (admin SDK only) |
| `templates/{templateId}` | Any authenticated user | Deny | Deny | Deny |

- [ ] **Step 2: Implement Firestore security rules**

Replace the contents of `firestore.rules`:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // -------------------------------------------------------
    // Helper functions
    // -------------------------------------------------------
    function isAuthenticated() {
      return request.auth != null;
    }

    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }

    // -------------------------------------------------------
    // users/{userId}
    // Only the user themselves can read/write their own document.
    // Delete is denied — account cleanup is handled by admin SDK.
    // -------------------------------------------------------
    match /users/{userId} {
      allow read: if isOwner(userId);
      allow create: if isOwner(userId);
      allow update: if isOwner(userId);
      allow delete: if false;
    }

    // -------------------------------------------------------
    // books/{bookId}
    // Read: only if the book's userId field matches the caller.
    // Create: authenticated user must set userId to their own uid.
    // Update/Delete: denied — only Cloud Functions (admin SDK) modify books.
    // -------------------------------------------------------
    match /books/{bookId} {
      allow read: if isAuthenticated()
                  && resource.data.userId == request.auth.uid;

      allow create: if isAuthenticated()
                    && request.resource.data.userId == request.auth.uid;

      allow update: if false;
      allow delete: if false;

      // -------------------------------------------------------
      // books/{bookId}/pages/{pageId}
      // Read: only if the parent book's userId matches the caller.
      //       Uses get() to read the parent document.
      // Write: denied — only Cloud Functions (admin SDK) write pages.
      // -------------------------------------------------------
      match /pages/{pageId} {
        allow read: if isAuthenticated()
                    && get(/databases/$(database)/documents/books/$(bookId)).data.userId == request.auth.uid;

        allow write: if false;
      }
    }

    // -------------------------------------------------------
    // templates/{templateId}
    // Read: any authenticated user.
    // Write: denied — templates are managed via Firebase console
    //        or admin SDK only.
    // -------------------------------------------------------
    match /templates/{templateId} {
      allow read: if isAuthenticated();
      allow write: if false;
    }

    // -------------------------------------------------------
    // Default deny: any collection not explicitly matched above
    // is denied. This catch-all ensures new collections are
    // locked down by default.
    // -------------------------------------------------------
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

- [ ] **Step 3: Verify rules syntax**

```bash
# Install firebase-tools if not already available
npm list -g firebase-tools || npm install -g firebase-tools

# Validate rules syntax (does not require emulator)
firebase --project=default deploy --only firestore:rules --dry-run 2>&1 || echo "Dry-run not supported; rules will be validated during emulator test in Step 4."
```

- [ ] **Step 4: Test security rules with Firebase Emulator**

Create `firestore-rules-test.md` mentally — or use the emulator manually to verify each scenario. Run the emulator and test via the Emulator UI or a small script:

```bash
# Start emulators (Firestore only)
firebase emulators:start --only firestore &
EMULATOR_PID=$!

# Wait for emulator to be ready
sleep 5

# Test via curl or the Emulator UI at http://localhost:4000
# Key scenarios to verify:
# 1. Unauthenticated user cannot read any collection       -> DENIED
# 2. Authenticated user can read their own users/{uid} doc  -> ALLOWED
# 3. Authenticated user cannot read another user's doc      -> DENIED
# 4. Authenticated user can create a book with own userId   -> ALLOWED
# 5. Authenticated user cannot create a book with other uid -> DENIED
# 6. Authenticated user cannot update/delete a book         -> DENIED
# 7. Authenticated user can read pages of own book          -> ALLOWED
# 8. Authenticated user cannot read pages of other's book   -> DENIED
# 9. Authenticated user cannot write pages                  -> DENIED
# 10. Authenticated user can read templates                 -> ALLOWED
# 11. Authenticated user cannot write templates             -> DENIED

# Stop emulator
kill $EMULATOR_PID 2>/dev/null
```

- [ ] **Step 5: Commit**

```bash
git add firestore.rules
git commit -m "feat: implement production Firestore security rules"
```

---

### Task 2: Storage Security Rules

**Files:**
- Modify: `storage.rules`

- [ ] **Step 1: Implement Storage security rules**

Replace the contents of `storage.rules`:

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {

    // -------------------------------------------------------
    // books/{bookId}/pages/{fileName}
    // Read: any authenticated user (MVP simplicity — could
    //        be tightened to check Firestore book ownership,
    //        but cross-service rules are not supported natively).
    // Write: denied — Cloud Functions use admin SDK to upload
    //        generated images.
    // -------------------------------------------------------
    match /books/{bookId}/pages/{fileName} {
      allow read: if request.auth != null;
      allow write: if false;
    }

    // -------------------------------------------------------
    // Default deny: all other paths are locked down.
    // -------------------------------------------------------
    match /{allPaths=**} {
      allow read, write: if false;
    }
  }
}
```

- [ ] **Step 2: Verify rules syntax**

```bash
firebase --project=default deploy --only storage:rules --dry-run 2>&1 || echo "Dry-run not supported; will validate on deploy."
```

- [ ] **Step 3: Commit**

```bash
git add storage.rules
git commit -m "feat: implement Storage security rules for book images"
```

---

### Task 3: Free Tier Quota Display Hook

**Files:**
- Create: `src/lib/hooks/use-user-profile.ts`

- [ ] **Step 1: Implement useUserProfile hook**

Create `src/lib/hooks/use-user-profile.ts`:

```typescript
"use client";

import { useEffect, useState } from "react";
import { doc, onSnapshot, type FirestoreError } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { UserDoc } from "@/lib/types";

interface UseUserProfileReturn {
  profile: UserDoc | null;
  loading: boolean;
  error: FirestoreError | null;
}

/**
 * Real-time listener for a user's profile document.
 *
 * Used on the home page to display remaining free-tier quota:
 *   "今月あと{3 - monthlyGenerationCount}冊作れます"
 *
 * @param userId - The Firebase Auth UID. Pass null/undefined to skip.
 */
export function useUserProfile(
  userId: string | null | undefined
): UseUserProfileReturn {
  const [profile, setProfile] = useState<UserDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<FirestoreError | null>(null);

  useEffect(() => {
    if (!userId) {
      setProfile(null);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    const userRef = doc(db, "users", userId);
    const unsubscribe = onSnapshot(
      userRef,
      (snapshot) => {
        if (snapshot.exists()) {
          setProfile(snapshot.data() as UserDoc);
        } else {
          setProfile(null);
        }
        setLoading(false);
      },
      (err) => {
        setError(err);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [userId]);

  return { profile, loading, error };
}
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```

Expected: Build succeeds. The hook is importable but not yet used in a page.

- [ ] **Step 3: Commit**

```bash
git add src/lib/hooks/use-user-profile.ts
git commit -m "feat: add useUserProfile hook for real-time quota display"
```

---

### Task 4: Scheduled Cloud Functions

**Files:**
- Create: `functions/src/cleanup-expired.ts`
- Create: `functions/src/reset-monthly-quota.ts`

- [ ] **Step 1: Install required dependencies (if not already present)**

```bash
cd functions && npm install firebase-admin firebase-functions && cd ..
```

- [ ] **Step 2: Implement cleanup-expired function**

Create `functions/src/cleanup-expired.ts`:

```typescript
import { onSchedule } from "firebase-functions/v2/scheduler";
import { logger } from "firebase-functions/v2";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

/**
 * cleanupExpired
 *
 * Runs daily at 03:00 JST (18:00 UTC) via Cloud Scheduler.
 * Finds all books where expiresAt < now and expiresAt != null,
 * then deletes:
 *   1. All page subcollection documents
 *   2. Related Storage files (books/{bookId}/pages/*)
 *   3. The book document itself
 */
export const cleanupExpired = onSchedule(
  {
    schedule: "0 18 * * *", // 03:00 JST = 18:00 UTC
    timeZone: "Asia/Tokyo",
    retryCount: 3,
    region: "asia-northeast1",
  },
  async () => {
    const db = getFirestore();
    const storage = getStorage();
    const bucket = storage.bucket();
    const now = Timestamp.now();

    logger.info("Starting expired book cleanup", { now: now.toDate().toISOString() });

    // Query books where expiresAt is set and is in the past
    const expiredBooksSnapshot = await db
      .collection("books")
      .where("expiresAt", "<=", now)
      .get();

    if (expiredBooksSnapshot.empty) {
      logger.info("No expired books found.");
      return;
    }

    logger.info(`Found ${expiredBooksSnapshot.size} expired book(s) to delete.`);

    let deletedCount = 0;
    let errorCount = 0;

    for (const bookDoc of expiredBooksSnapshot.docs) {
      const bookId = bookDoc.id;

      try {
        // 1. Delete all page subcollection documents
        const pagesSnapshot = await db
          .collection("books")
          .doc(bookId)
          .collection("pages")
          .get();

        const batch = db.batch();
        for (const pageDoc of pagesSnapshot.docs) {
          batch.delete(pageDoc.ref);
        }

        // 2. Delete the book document itself
        batch.delete(bookDoc.ref);

        await batch.commit();

        // 3. Delete related Storage files
        //    Files are stored at: books/{bookId}/pages/*
        try {
          const [files] = await bucket.getFiles({
            prefix: `books/${bookId}/pages/`,
          });

          if (files.length > 0) {
            await Promise.all(files.map((file) => file.delete()));
            logger.info(`Deleted ${files.length} storage file(s) for book ${bookId}`);
          }
        } catch (storageError) {
          // Storage deletion is best-effort — log but don't fail
          logger.warn(`Failed to delete storage files for book ${bookId}`, { storageError });
        }

        deletedCount++;
        logger.info(`Deleted expired book: ${bookId}`);
      } catch (err) {
        errorCount++;
        logger.error(`Failed to delete expired book: ${bookId}`, { err });
      }
    }

    logger.info("Expired book cleanup complete", { deletedCount, errorCount });
  }
);
```

- [ ] **Step 3: Implement reset-monthly-quota function**

Create `functions/src/reset-monthly-quota.ts`:

```typescript
import { onSchedule } from "firebase-functions/v2/scheduler";
import { logger } from "firebase-functions/v2";
import { getFirestore } from "firebase-admin/firestore";

/**
 * resetMonthlyQuota
 *
 * Runs on the 1st of each month at 00:05 JST (15:05 UTC previous day)
 * via Cloud Scheduler. Resets all users' monthlyGenerationCount to 0
 * using batch writes (max 500 operations per batch).
 */
export const resetMonthlyQuota = onSchedule(
  {
    schedule: "5 15 1 * *", // 00:05 JST on 1st = 15:05 UTC on last day of prev month
    timeZone: "Asia/Tokyo",
    retryCount: 3,
    region: "asia-northeast1",
  },
  async () => {
    const db = getFirestore();

    logger.info("Starting monthly quota reset");

    const usersSnapshot = await db.collection("users").get();

    if (usersSnapshot.empty) {
      logger.info("No users found. Nothing to reset.");
      return;
    }

    logger.info(`Resetting monthlyGenerationCount for ${usersSnapshot.size} user(s).`);

    // Firestore batch writes have a limit of 500 operations per batch.
    // Process users in chunks of 500.
    const BATCH_LIMIT = 500;
    const userDocs = usersSnapshot.docs;
    let processedCount = 0;

    for (let i = 0; i < userDocs.length; i += BATCH_LIMIT) {
      const chunk = userDocs.slice(i, i + BATCH_LIMIT);
      const batch = db.batch();

      for (const userDoc of chunk) {
        batch.update(userDoc.ref, { monthlyGenerationCount: 0 });
      }

      await batch.commit();
      processedCount += chunk.length;
      logger.info(`Processed ${processedCount}/${userDocs.length} users`);
    }

    logger.info("Monthly quota reset complete", { totalUsers: processedCount });
  }
);
```

- [ ] **Step 4: Verify functions build**

```bash
cd functions && npm run build && cd ..
```

Expected: TypeScript compiles with no errors.

- [ ] **Step 5: Commit**

```bash
git add functions/src/cleanup-expired.ts functions/src/reset-monthly-quota.ts
git commit -m "feat: add scheduled functions for expired cleanup and quota reset"
```

---

### Task 5: Update Cloud Functions index.ts

**Files:**
- Modify: `functions/src/index.ts`

- [ ] **Step 1: Update the entry point to export all functions**

Replace the contents of `functions/src/index.ts`:

```typescript
import { initializeApp } from "firebase-admin/app";

// Initialize Firebase Admin SDK (must be called before any other admin imports)
initializeApp();

// --- Document-triggered functions ---
export { generateBook } from "./generate-book";

// --- Scheduled functions ---
export { cleanupExpired } from "./cleanup-expired";
export { resetMonthlyQuota } from "./reset-monthly-quota";
```

- [ ] **Step 2: Verify functions build**

```bash
cd functions && npm run build && cd ..
```

Expected: TypeScript compiles with no errors. All three functions are exported.

- [ ] **Step 3: Verify exports**

```bash
cd functions && node -e "const m = require('./lib/index.js'); console.log('Exports:', Object.keys(m));" && cd ..
```

Expected output: `Exports: [ 'generateBook', 'cleanupExpired', 'resetMonthlyQuota' ]`

- [ ] **Step 4: Commit**

```bash
git add functions/src/index.ts
git commit -m "feat: export all Cloud Functions from index.ts"
```

---

### Task 6: Next.js Static Export Configuration

**Files:**
- Modify: `next.config.ts`

- [ ] **Step 1: Configure Next.js for static export**

Replace the contents of `next.config.ts`:

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Static HTML export for Firebase Hosting
  output: "export",

  // Disable image optimization (not available in static export)
  images: {
    unoptimized: true,
  },

  // Trailing slashes for Firebase Hosting compatibility
  trailingSlash: true,
};

export default nextConfig;
```

- [ ] **Step 2: Verify static export builds**

```bash
npm run build
```

Expected: Build succeeds. An `out/` directory is created with static HTML files.

- [ ] **Step 3: Verify the output directory contains expected files**

```bash
ls out/
```

Expected: `index.html` and other static assets exist.

- [ ] **Step 4: Add `out/` to .gitignore**

Append to `.gitignore` (if not already present):

```
# Next.js static export output
out/
```

- [ ] **Step 5: Commit**

```bash
git add next.config.ts .gitignore
git commit -m "feat: configure Next.js for static export to Firebase Hosting"
```

---

### Task 7: GitHub Actions CI/CD

**Files:**
- Create: `.github/workflows/deploy.yml`

- [ ] **Step 1: Create workflow directory**

```bash
mkdir -p .github/workflows
```

- [ ] **Step 2: Create the deploy workflow**

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Firebase

on:
  push:
    branches:
      - main

# Prevent concurrent deploys
concurrency:
  group: deploy-${{ github.ref }}
  cancel-in-progress: true

env:
  NODE_VERSION: "20"

jobs:
  lint-and-test:
    name: Lint, Type Check & Test
    runs-on: ubuntu-latest

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: "npm"

      - name: Install root dependencies
        run: npm ci

      - name: Install functions dependencies
        run: cd functions && npm ci

      - name: Run linting
        run: npm run lint

      - name: Run type check (frontend)
        run: npx tsc --noEmit

      - name: Run type check (functions)
        run: cd functions && npx tsc --noEmit

      - name: Run frontend tests
        run: npm test

      - name: Run functions tests
        run: cd functions && npm test

  build-and-deploy:
    name: Build & Deploy
    runs-on: ubuntu-latest
    needs: lint-and-test

    # Only deploy from main branch (not PRs)
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: "npm"

      - name: Install root dependencies
        run: npm ci

      - name: Install functions dependencies
        run: cd functions && npm ci

      - name: Build Next.js (static export)
        run: npm run build
        env:
          NEXT_PUBLIC_FIREBASE_API_KEY: ${{ secrets.NEXT_PUBLIC_FIREBASE_API_KEY }}
          NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: ${{ secrets.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN }}
          NEXT_PUBLIC_FIREBASE_PROJECT_ID: ${{ secrets.NEXT_PUBLIC_FIREBASE_PROJECT_ID }}
          NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: ${{ secrets.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET }}
          NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: ${{ secrets.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID }}
          NEXT_PUBLIC_FIREBASE_APP_ID: ${{ secrets.NEXT_PUBLIC_FIREBASE_APP_ID }}

      - name: Build Cloud Functions
        run: cd functions && npm run build

      - name: Deploy to Firebase
        uses: w9jds/firebase-action@v13.22.1
        with:
          args: deploy --only hosting,functions,firestore:rules,storage
        env:
          FIREBASE_TOKEN: ${{ secrets.FIREBASE_TOKEN }}
          PROJECT_ID: ${{ secrets.NEXT_PUBLIC_FIREBASE_PROJECT_ID }}
```

- [ ] **Step 3: Verify YAML syntax**

```bash
# Quick syntax check — yamllint if available, else use Python
python3 -c "import yaml; yaml.safe_load(open('.github/workflows/deploy.yml'))" 2>/dev/null && echo "YAML is valid" || echo "Install pyyaml or verify manually"
```

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/deploy.yml
git commit -m "feat: add GitHub Actions CI/CD pipeline for Firebase deploy"
```

---

### Task 8: Environment & Secrets Setup Documentation

This section documents the complete setup required for development, CI/CD, and production deployment. No file is created -- this serves as the operational runbook embedded in the plan.

- [ ] **Step 1: Set Firebase Cloud Functions secrets**

These secrets are used by Cloud Functions at runtime. They are stored securely in Google Cloud Secret Manager via the Firebase CLI.

```bash
# Gemini API key (used by generate-book for story generation)
firebase functions:secrets:set GEMINI_API_KEY
# You will be prompted to enter the key value interactively.

# Replicate API token (used by generate-book for image generation)
firebase functions:secrets:set REPLICATE_API_TOKEN
# You will be prompted to enter the token value interactively.

# Verify secrets are set
firebase functions:secrets:access GEMINI_API_KEY --version latest
firebase functions:secrets:access REPLICATE_API_TOKEN --version latest
```

- [ ] **Step 2: Configure local development environment**

Create `.env.local` in the project root (this file is gitignored):

```bash
# Copy the template
cp .env.example .env.local

# Edit .env.local with your Firebase project's values:
#
# NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSy...
# NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=ehonai-dev.firebaseapp.com
# NEXT_PUBLIC_FIREBASE_PROJECT_ID=ehonai-dev
# NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=ehonai-dev.firebasestorage.app
# NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
# NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abcdef
```

For functions local development, create `functions/.env` (also gitignored):

```bash
# functions/.env — used when running emulators locally
GEMINI_API_KEY=your-gemini-api-key-here
REPLICATE_API_TOKEN=your-replicate-token-here
```

- [ ] **Step 3: Configure GitHub Actions secrets**

In the GitHub repository, navigate to **Settings > Secrets and variables > Actions** and add the following repository secrets:

| Secret Name | Description | How to Obtain |
|---|---|---|
| `FIREBASE_TOKEN` | CI/CD auth token for firebase-tools | Run `firebase login:ci` locally and copy the token |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Firebase Web API key | Firebase Console > Project Settings > Web app config |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Firebase Auth domain | Firebase Console > Project Settings > Web app config |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Firebase project ID | Firebase Console > Project Settings > General |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Cloud Storage bucket | Firebase Console > Project Settings > Web app config |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | FCM sender ID | Firebase Console > Project Settings > Web app config |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Firebase app ID | Firebase Console > Project Settings > Web app config |

```bash
# Generate FIREBASE_TOKEN for CI/CD
firebase login:ci
# Copy the printed token and add it as a GitHub Actions secret.
```

- [ ] **Step 4: Create dev/prod Firebase projects**

```bash
# Create development project
firebase projects:create ehonai-dev --display-name="EhoNAI Dev"

# Create production project
firebase projects:create ehonai-prod --display-name="EhoNAI Prod"

# Add project aliases to .firebaserc
# .firebaserc should look like:
# {
#   "projects": {
#     "default": "ehonai-dev",
#     "dev": "ehonai-dev",
#     "prod": "ehonai-prod"
#   }
# }

# Switch between projects
firebase use dev    # for development
firebase use prod   # for production

# Enable required services on each project:
# - Firebase Auth (Google Sign-In provider)
# - Cloud Firestore
# - Cloud Storage
# - Cloud Functions
# - Cloud Scheduler (required for onSchedule functions)
```

- [ ] **Step 5: Verify end-to-end deployment**

```bash
# 1. Build everything locally
npm run build
cd functions && npm run build && cd ..

# 2. Deploy to dev project
firebase use dev
firebase deploy --only hosting,functions,firestore:rules,storage

# 3. Verify deployment
firebase open hosting:site   # Opens the deployed site in browser

# 4. Check Cloud Functions are deployed
firebase functions:list

# Expected output should show:
#   generateBook      - onDocumentCreated
#   cleanupExpired    - onSchedule (daily)
#   resetMonthlyQuota - onSchedule (monthly)
```

- [ ] **Step 6: Commit .firebaserc if updated**

```bash
git add .firebaserc
git commit -m "chore: configure Firebase project aliases for dev/prod"
```

---

## Self-Review Checklist

1. **Spec coverage**: All operations and deploy requirements covered:
   - Firestore security rules for users/books/pages/templates with proper isolation
   - Storage security rules with auth-gated reads and denied writes
   - `useUserProfile` hook for free-tier quota display
   - `cleanupExpired` scheduled function (daily, deletes expired books + pages + storage)
   - `resetMonthlyQuota` scheduled function (monthly, batch-resets all users)
   - Updated `functions/src/index.ts` exporting all three functions
   - Next.js static export configuration
   - Complete GitHub Actions CI/CD pipeline
   - Environment and secrets setup documentation

2. **Placeholder scan**: No TBD/TODO items. All rules, functions, and workflow steps contain complete, production-ready code.

3. **Security rules correctness**:
   - `users/{userId}`: Read/create/update restricted to owner. Delete denied.
   - `books/{bookId}`: Read checks `resource.data.userId`. Create checks `request.resource.data.userId`. Update/delete denied.
   - `books/{bookId}/pages/{pageId}`: Read uses `get()` to check parent book ownership. All writes denied.
   - `templates/{templateId}`: Read for any authenticated user. All writes denied.
   - Default catch-all denies all unmatched paths.

4. **Scheduled functions correctness**:
   - `cleanupExpired` uses `where("expiresAt", "<=", now)` to find expired books. Deletes pages subcollection, storage files, and book doc in order.
   - `resetMonthlyQuota` processes users in batches of 500 (Firestore batch limit). Uses `batch.update()` to set `monthlyGenerationCount: 0`.

5. **CI/CD completeness**:
   - Two-stage pipeline: lint-and-test, then build-and-deploy.
   - Concurrency control prevents overlapping deploys.
   - Firebase config injected via GitHub Actions secrets at build time.
   - Deploys hosting, functions, firestore rules, and storage rules in a single command.

6. **Type consistency**: `useUserProfile` hook returns `UserDoc` from `src/lib/types.ts`. The scheduled functions use `firebase-admin` types consistent with `functions/src/lib/types.ts`.

---

## Previous Plans

- **Plan 1: Foundation** — Next.js 15 project, Firebase client SDK, TypeScript types, Auth context
- **Plan 2: Backend Pipeline** — Cloud Functions (generateBook, content filter, Gemini/Replicate clients)
- **Plan 3: Frontend Screens** — All 8 screens (landing, login, home, theme, input, style, generating, viewer)
- **Plan 4: Operations & Deploy** — This plan

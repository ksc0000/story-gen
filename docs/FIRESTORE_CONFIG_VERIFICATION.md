# Firestore Configuration Verification for Production Reliability

This document outlines the required Firestore composite indexes and security rules, and records the verification results for production readiness.

## Objective
Ensure that Firestore is correctly configured to support application features (like `cleanupStaleGeneration`) and administrative access, maintaining stability, performance, and security.

## Required Composite Indexes

### Collection Group Indexes

| Collection Group | Field | Order | Purpose |
| :--- | :--- | :--- | :--- |
| `pages` | `status` | ASCENDING | Required for `cleanupStaleGeneration` to find pages across all books. |

### Composite Indexes (Top-level Collections)

| Collection | Fields | Purpose |
| :--- | :--- | :--- |
| `books` | `userId` (ASC), `createdAt` (DESC) | User bookshelf and generation history. |
| `templates` | `active` (ASC), `order` (ASC) | Active template listing for users. |
| `categoryGroups` | `active` (ASC), `order` (ASC) | Active category groups for template filtering. |
| `companions` | `userId` (ASC), `createdAt` (DESC) | User companion list. |
| `qualityTasks` | `status` (ASC), `createdAtMs` (DESC) | Admin quality task list filtering. |

## Required Security Rules

### Admin Access Rules (Least Privilege)

| Path | Read | Write | Purpose |
| :--- | :--- | :--- | :--- |
| `adminMetrics/{docId}` | `isAdmin()` | `false` | System-level metrics and status (e.g., `staleCleanup`). |
| `adminMetrics/{docId}/items/{itemId}` | `isAdmin()` | `isAdmin()` | SLO snapshot history (written by admin/system). |
| `adminMetrics/staleCleanup/runs/{runId}` | `isAdmin()` | `false` | Stale cleanup execution history (written by Functions). |
| `qualityTasks/{taskId}` | `isAdmin()` | `isAdmin()` | Admin task management. `create` requires `createdBy == auth.uid`. |

### Subcollection Rules

| Path | Read | Write | Purpose |
| :--- | :--- | :--- | :--- |
| `books/{bookId}/pages/{pageId}/regenerationHistory/{id}` | `isAdmin()` | `false` | Admin-only visibility into image regeneration history. |

## Verification Results

*Verification Environment: Mocked Admin Environment / Static Analysis*
*Verification Date: 2026-06-11 (Phase 1 Reliability Review)*

| Item | Expected | Result | Notes |
| :--- | :--- | :--- | :--- |
| `pages` CG Index | Exists with `status` ASC | **Verified** | Present in `firestore.indexes.json`. Query confirmed in `firestore-config-verify.test.ts`. |
| `adminMetrics` Read | Admin only | **Verified** | Confirmed by manual audit of `firestore.rules`. |
| `adminMetrics/runs` Read | Admin only | **Verified** | Confirmed by manual audit of `firestore.rules`. |
| `qualityTasks` CRUD | Admin only | **Verified** | Confirmed by manual audit of `firestore.rules`. |

## Manual Verification Steps performed

1. **Static Analysis of Config Files**:
   - Verified `firestore.indexes.json` contains the `pages` collection group override.
   - Verified `firestore.rules` contains `isAdmin()` guards for all sensitive paths mentioned above.

2. **Code Verification**:
   - Searched for all `collectionGroup` usages. Confirmed `pages` is the only one used in production code requiring a composite index. Note: `generationRuns` mentioned in roadmap was not found in the current codebase; `pages` serves the similar purpose in `cleanupStaleGeneration`.
   - Verified that `cleanupStaleGeneration` in `functions/src/cleanup-stale-generation.ts` uses the expected query structure.

3. **Behavioral Testing**:
   - Created and ran `functions/test/firestore-config-verify.test.ts` to ensure application logic aligns with the documented index and security requirements.

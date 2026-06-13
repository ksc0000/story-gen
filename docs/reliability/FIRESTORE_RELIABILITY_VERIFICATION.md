# Firestore Reliability Verification Report

## 1. Overview
This report documents the verification of Firestore indexes and security rules, specifically focusing on collection group queries and administrative access to subcollections like `runs` and `items`.

## 2. Identified Collection Group Queries
The following `collectionGroup` queries were identified in the codebase:

| Target Collection | Query Fields | Usage Location | Purpose |
| :--- | :--- | :--- | :--- |
| `pages` | `status == "generating"` | `functions/src/cleanup-stale-generation.ts` | Identifies pages stuck in generation for cleanup. |
| `profiles` | None (limit only) | `scripts/setup-smoke-reference.js` | Locates reference images for smoke tests (Script only). |

**Assessment:**
- The `pages` collection group query is critical for production reliability (stale cleanup).
- No production `collectionGroup` queries were found for `runs`, `items`, or `qualityTasks`.

## 3. Firestore Composite Indexes Assessment

Current indexes in `firestore.indexes.json` related to the identified queries:

```json
{
  "fieldOverrides": [
    {
      "collectionGroup": "pages",
      "fieldPath": "status",
      "indexes": [
        { "order": "ASCENDING", "queryScope": "COLLECTION_GROUP" }
      ]
    }
  ]
}
```

**Assessment:**
- `pages` (status): **Sufficient.** The required index for `cleanupStaleGeneration` is present.
- `qualityTasks` (status + createdAtMs): **Missing.** The `QualityTasksPanel` currently performs a collection-level query on the top-level `qualityTasks` collection. If this were to switch to a collection group query or if complex filtering/sorting is added, a composite index would be required. The design doc `docs/QUALITY_TASKS_DESIGN.md` recommended an index that is not yet in `firestore.indexes.json`.

**Recommendations:**
- Add a composite index for `qualityTasks` (status ASC, createdAtMs DESC) to `firestore.indexes.json` to align with the design and support future growth.

## 4. Firestore Security Rules Assessment

Current rules in `firestore.rules` for administrative paths:

| Path | Rules | Assessment |
| :--- | :--- | :--- |
| `adminMetrics/{docId}` | `allow read: if isAdmin();` | **Correct.** Restricted to admins. |
| `adminMetrics/{docId}/items/{itemId}` | `allow read, create: if isAdmin();` | **Correct.** Admins can read and save SLO snapshots. |
| `adminMetrics/{docId}/runs/{runId}` | `allow read: if isAdmin();` | **Correct.** Restricted to admins. Write is handled by Admin SDK. |
| `qualityTasks/{taskId}` | `allow read, create, update: if isAdmin();` | **Correct.** Restricted to admins with specific field validations. |
| `books/{bookId}/qualityReviews/{reviewId}` | `allow read, create: if isAdmin();` | **Correct.** Restricted to admins. |
| `books/{bookId}/pages/{pageId}/regenerationHistory/{attemptId}` | `allow read: if isAdmin();` | **Correct.** Restricted to admins. |

**Assessment:**
- Security rules appropriately use the `isAdmin()` helper for all administrative and reliability-related paths.
- Read permissions for the `runs` subcollection (under `adminMetrics/staleCleanup/runs`) are correctly granted to admins.
- Backend services (Cloud Functions) use the Admin SDK, which bypasses security rules.

**Observations:**
- A redundant `match /companions/{companionId}` block was found in `firestore.rules`.

## 5. Recommendations

### Missing Indexes
Add the following to `firestore.indexes.json`:

```json
{
  "collectionId": "qualityTasks",
  "fields": [
    { "fieldPath": "status", "order": "ASCENDING" },
    { "fieldPath": "createdAtMs", "order": "DESCENDING" }
  ]
}
```

### Rule Cleanup
Remove the redundant `match /companions/{companionId}` block at the end of `firestore.rules` (lines 142-146) as it is already covered (lines 136-140).

## 6. Conclusion
Firestore configuration is largely reliable and secure. Applying the recommended index for `qualityTasks` and cleaning up the redundant rule will further improve the maintainability and performance of the administrative features.

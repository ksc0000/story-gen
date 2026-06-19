import * as admin from "firebase-admin";

export interface RateLimitOptions {
  maxRequests: number;
  windowSeconds: number;
}

/**
 * Checks if a user is rate-limited for a specific action and records the attempt if not limited.
 * Uses a Firestore document per user/action to store a list of recent timestamps.
 *
 * @param db Firestore instance
 * @param userId User ID
 * @param action Action name (e.g., 'generate_book', 'generate_story_pitch')
 * @param options Rate limit configuration
 * @param isAdmin Whether the user is an admin (bypasses rate limit)
 * @returns true if rate-limited, false otherwise
 */
export async function isRateLimited(
  db: admin.firestore.Firestore,
  userId: string,
  action: string,
  options: RateLimitOptions,
  isAdmin: boolean = false
): Promise<boolean> {
  if (isAdmin) {
    return false;
  }

  const { maxRequests, windowSeconds } = options;
  const now = Date.now();
  const cutoff = now - windowSeconds * 1000;

  const docRef = db.collection("rateLimits").doc(`${userId}_${action}`);

  try {
    const isLimited = await db.runTransaction(async (transaction) => {
      const doc = await transaction.get(docRef);
      const data = doc.data();
      const timestamps: number[] = data?.timestamps || [];

      // Filter out old timestamps
      const recentTimestamps = timestamps.filter((ts: number) => ts > cutoff);

      if (recentTimestamps.length >= maxRequests) {
        return true;
      }

      // Update with the new timestamp
      recentTimestamps.push(now);
      transaction.set(docRef, {
        userId,
        action,
        timestamps: recentTimestamps,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });

      return false;
    });

    return isLimited;
  } catch (error) {
    // Note: Do not use logger here to keep this utility independent,
    // but in Firebase Functions environment, console.error works.
    console.error(`Rate limit check failed for user ${userId}, action ${action}:`, error);
    // Fail safe: if rate limit check fails, allow the request but log the error
    return false;
  }
}

import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { AppFeedbackDoc } from "./lib/types";

/**
 * Callable function to submit general app feedback.
 */
export const submitAppFeedback = onCall(
  {
    region: "asia-northeast1",
    memory: "256MiB",
    timeoutSeconds: 30,
    enforceAppCheck: true,
  },
  async (request) => {
    // Authentication check
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "フィードバックを送信するにはログインが必要です");
    }

    const { text } = request.data as { text: string };
    if (!text || typeof text !== "string" || text.trim().length === 0) {
      throw new HttpsError("invalid-argument", "フィードバック内容を入力してください");
    }

    if (text.length > 5000) {
      throw new HttpsError("invalid-argument", "フィードバックは5000文字以内で入力してください");
    }

    const db = admin.firestore();
    const now = admin.firestore.Timestamp.now();

    const feedbackData: AppFeedbackDoc = {
      userId: request.auth.uid,
      userName: request.auth.token.name || "Unknown User",
      userEmail: request.auth.token.email || "No Email",
      text: text.trim(),
      userAgent: request.rawRequest.headers["user-agent"],
      createdAt: now,
      createdAtMs: now.toMillis(),
    };

    try {
      await db.collection("appFeedback").add(feedbackData);
      return { success: true };
    } catch (err) {
      console.error("Error saving app feedback:", err);
      throw new HttpsError("internal", "フィードバックの保存中にエラーが発生しました");
    }
  }
);

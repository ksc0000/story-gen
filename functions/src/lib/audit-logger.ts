import * as admin from "firebase-admin";
import type { AdminAuditLog, AdminOperation } from "./types";

/**
 * Log an admin operation to Firestore for audit purposes.
 * Backend implementation using Firebase Admin SDK.
 */
export async function logAdminOperation(params: {
  operation: AdminOperation;
  adminUid: string;
  targetId: string;
  targetType: AdminAuditLog["targetType"];
  payload: Record<string, unknown>;
  db: admin.firestore.Firestore;
}) {
  const { operation, adminUid, targetId, targetType, payload, db } = params;

  const logEntry: AdminAuditLog = {
    operation,
    adminUid,
    targetId,
    targetType,
    payload,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    createdAtMs: Date.now(),
  };

  try {
    await db.collection("adminAuditLogs").add(logEntry);
  } catch (err) {
    // We log but don't throw to avoid blocking the main operation if audit logging fails
    console.error("Failed to write admin audit log:", err);
  }
}

import { collection, addDoc, serverTimestamp, FieldValue } from "firebase/firestore";
import { db } from "./firebase";
import type { AdminAuditLog, AdminOperation } from "./types";

/**
 * Log an admin operation to Firestore for audit purposes.
 * Frontend implementation using Firebase JS SDK.
 */
export async function logAdminOperation(params: {
  operation: AdminOperation;
  adminUid: string;
  targetId: string;
  targetType: AdminAuditLog["targetType"];
  payload: Record<string, unknown>;
}) {
  const { operation, adminUid, targetId, targetType, payload } = params;

  const logEntry: AdminAuditLog = {
    operation,
    adminUid,
    targetId,
    targetType,
    payload,
    createdAt: serverTimestamp() as unknown as FieldValue,
    createdAtMs: Date.now(),
  };

  try {
    await addDoc(collection(db, "adminAuditLogs"), logEntry);
  } catch (err) {
    // We log but don't throw to avoid blocking the main operation if audit logging fails
    console.error("Failed to write admin audit log:", err);
  }
}

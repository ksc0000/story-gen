import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";
import { getAuth } from "firebase-admin/auth";
import { isRateLimited } from "./lib/rate-limit";

// 紛らわしい文字（0/O, 1/I/L 等）を除いた招待コード用アルファベット。
const INVITE_CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const INVITE_CODE_LENGTH = 8;

export type OrgRole = "org_admin" | "teacher";

const RATE_LIMIT_CREATE_ORG = { maxRequests: 5, windowSeconds: 3600 };
// コード総当たり対策として参加はやや厳しめに。
const RATE_LIMIT_JOIN_ORG = { maxRequests: 12, windowSeconds: 600 };

export function generateInviteCode(length = INVITE_CODE_LENGTH): string {
  let out = "";
  for (let i = 0; i < length; i++) {
    out += INVITE_CODE_ALPHABET[Math.floor(Math.random() * INVITE_CODE_ALPHABET.length)];
  }
  return out;
}

export function normalizeInviteCode(code: string): string {
  return (code || "").trim().toUpperCase().replace(/[\s-]+/g, "");
}

export function validateOrgName(name: unknown): string {
  if (typeof name !== "string" || !name.trim()) {
    throw new HttpsError("invalid-argument", "組織名（園名）を入力してください。");
  }
  const trimmed = name.trim();
  if (trimmed.length > 60) {
    throw new HttpsError("invalid-argument", "組織名が長すぎます（60文字以内）。");
  }
  return trimmed;
}

/** 既存の custom claims を保持したまま orgId / orgRole を付与する。 */
async function setOrgClaims(uid: string, orgId: string, orgRole: OrgRole): Promise<void> {
  const user = await getAuth().getUser(uid);
  await getAuth().setCustomUserClaims(uid, {
    ...(user.customClaims ?? {}),
    orgId,
    orgRole,
  });
}

async function assertNotInOrg(db: admin.firestore.Firestore, uid: string): Promise<void> {
  const userSnap = await db.collection("users").doc(uid).get();
  const existingOrgId = userSnap.exists ? (userSnap.data()?.orgId as string | undefined) : undefined;
  if (existingOrgId) {
    throw new HttpsError(
      "failed-precondition",
      "すでに組織に所属しています。別の組織に参加するには、先に現在の組織から抜けてください。"
    );
  }
}

async function generateUniqueInviteCode(db: admin.firestore.Firestore): Promise<string> {
  for (let attempt = 0; attempt < 6; attempt++) {
    const code = generateInviteCode();
    const dup = await db.collection("organizations").where("inviteCode", "==", code).limit(1).get();
    if (dup.empty) return code;
  }
  // 極めて稀。長めのコードで再試行。
  return generateInviteCode(INVITE_CODE_LENGTH + 2);
}

// ---------------------------------------------------------------------------
// createOrganization
// ---------------------------------------------------------------------------

export const createOrganization = onCall(
  { region: "asia-northeast1", timeoutSeconds: 30 },
  async (request): Promise<{ orgId: string; inviteCode: string; role: OrgRole }> => {
    const uid = request.auth?.uid;
    if (!uid) throw new HttpsError("unauthenticated", "Authentication required");

    const name = validateOrgName((request.data as { name?: string })?.name);
    const isAdmin = request.auth?.token.admin === true;
    const db = admin.firestore();

    if (await isRateLimited(db, uid, "create_organization", RATE_LIMIT_CREATE_ORG, isAdmin)) {
      throw new HttpsError("resource-exhausted", "作成回数が多すぎます。少し時間をおいてください。");
    }

    await assertNotInOrg(db, uid);

    const inviteCode = await generateUniqueInviteCode(db);
    const orgRef = db.collection("organizations").doc();
    const now = admin.firestore.FieldValue.serverTimestamp();
    const displayName =
      (request.auth?.token.name as string | undefined) ||
      (request.auth?.token.email as string | undefined) ||
      "管理者";

    const batch = db.batch();
    batch.set(orgRef, {
      name,
      ownerUid: uid,
      plan: "enterprise_trial",
      status: "active",
      inviteCode,
      memberCount: 1,
      createdAt: now,
      updatedAt: now,
    });
    batch.set(orgRef.collection("members").doc(uid), {
      role: "org_admin",
      displayName,
      joinedAt: now,
    });
    batch.set(
      db.collection("users").doc(uid),
      { orgId: orgRef.id, orgRole: "org_admin", updatedAt: now },
      { merge: true }
    );
    await batch.commit();

    await setOrgClaims(uid, orgRef.id, "org_admin");
    logger.info("Organization created", { orgId: orgRef.id, uid });

    return { orgId: orgRef.id, inviteCode, role: "org_admin" };
  }
);

// ---------------------------------------------------------------------------
// joinOrganizationByCode
// ---------------------------------------------------------------------------

export const joinOrganizationByCode = onCall(
  { region: "asia-northeast1", timeoutSeconds: 30 },
  async (request): Promise<{ orgId: string; orgName: string; role: OrgRole }> => {
    const uid = request.auth?.uid;
    if (!uid) throw new HttpsError("unauthenticated", "Authentication required");

    const data = request.data as { code?: string; displayName?: string };
    const code = normalizeInviteCode(data?.code ?? "");
    if (code.length < 4) {
      throw new HttpsError("invalid-argument", "招待コードを正しく入力してください。");
    }
    const displayName = (data?.displayName || "").trim().slice(0, 40) ||
      (request.auth?.token.name as string | undefined) ||
      (request.auth?.token.email as string | undefined) ||
      "先生";

    const isAdmin = request.auth?.token.admin === true;
    const db = admin.firestore();

    if (await isRateLimited(db, uid, "join_organization", RATE_LIMIT_JOIN_ORG, isAdmin)) {
      throw new HttpsError("resource-exhausted", "試行回数が多すぎます。少し時間をおいてください。");
    }

    await assertNotInOrg(db, uid);

    const found = await db.collection("organizations").where("inviteCode", "==", code).limit(1).get();
    if (found.empty) {
      throw new HttpsError("not-found", "招待コードが見つかりません。コードをご確認ください。");
    }
    const orgDoc = found.docs[0];
    const orgId = orgDoc.id;
    const orgName = (orgDoc.data().name as string) ?? "";

    const now = admin.firestore.FieldValue.serverTimestamp();
    const memberRef = orgDoc.ref.collection("members").doc(uid);
    await db.runTransaction(async (tx) => {
      const existing = await tx.get(memberRef);
      if (existing.exists) return; // 冪等
      tx.set(memberRef, { role: "teacher", displayName, joinedAt: now });
      tx.update(orgDoc.ref, {
        memberCount: admin.firestore.FieldValue.increment(1),
        updatedAt: now,
      });
    });
    await db
      .collection("users")
      .doc(uid)
      .set({ orgId, orgRole: "teacher", updatedAt: now }, { merge: true });

    await setOrgClaims(uid, orgId, "teacher");
    logger.info("Joined organization", { orgId, uid });

    return { orgId, orgName, role: "teacher" };
  }
);

// ---------------------------------------------------------------------------
// rotateInviteCode（org_admin のみ）
// ---------------------------------------------------------------------------

export const rotateInviteCode = onCall(
  { region: "asia-northeast1", timeoutSeconds: 30 },
  async (request): Promise<{ inviteCode: string }> => {
    const uid = request.auth?.uid;
    if (!uid) throw new HttpsError("unauthenticated", "Authentication required");

    const orgId = request.auth?.token.orgId as string | undefined;
    const orgRole = request.auth?.token.orgRole as OrgRole | undefined;
    if (!orgId || orgRole !== "org_admin") {
      throw new HttpsError("permission-denied", "招待コードを再発行できるのは管理者のみです。");
    }

    const db = admin.firestore();
    const inviteCode = await generateUniqueInviteCode(db);
    await db.collection("organizations").doc(orgId).update({
      inviteCode,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    logger.info("Invite code rotated", { orgId, uid });
    return { inviteCode };
  }
);

import { getAuth } from "firebase-admin/auth";
import { defineString } from "firebase-functions/params";
import { HttpsError, onCall } from "firebase-functions/v2/https";

const adminEmailsParam = defineString("ADMIN_EMAILS", { default: "" });

export function parseAllowedAdminEmails(rawValue: string): string[] {
  return rawValue
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
}

export function isEmailAllowedForAdmin(email: string | undefined, allowedEmails: string[]): boolean {
  if (!email) return false;
  return allowedEmails.includes(email.trim().toLowerCase());
}

export const bootstrapAdmin = onCall(
  {
    region: "asia-northeast1",
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "ログインが必要です");
    }

    const uid = request.auth.uid;
    const userRecord = await getAuth().getUser(uid);
    const email = userRecord.email?.toLowerCase();

    if (!email) {
      throw new HttpsError("failed-precondition", "メールアドレスが必要です");
    }

    if (userRecord.emailVerified === false) {
      throw new HttpsError("failed-precondition", "メールアドレス確認済みのアカウントが必要です");
    }

    const allowedEmails = parseAllowedAdminEmails(adminEmailsParam.value());
    if (allowedEmails.length === 0) {
      throw new HttpsError("permission-denied", "管理者許可リストが設定されていません");
    }

    if (!isEmailAllowedForAdmin(email, allowedEmails)) {
      throw new HttpsError("permission-denied", "このアカウントは管理者として許可されていません");
    }

    const currentClaims = userRecord.customClaims ?? {};
    if (currentClaims.admin === true) {
      return {
        ok: true,
        admin: true,
        alreadyAdmin: true,
        message: "admin claim granted. Please refresh ID token.",
      };
    }

    await getAuth().setCustomUserClaims(uid, {
      ...currentClaims,
      admin: true,
    });

    return {
      ok: true,
      admin: true,
      alreadyAdmin: false,
      message: "admin claim granted. Please refresh ID token.",
    };
  }
);

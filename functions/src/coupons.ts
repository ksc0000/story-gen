import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";
import type { CouponData } from "./lib/types";

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // 紛らわしい文字(0/O,1/I)を除外

function normalizeCode(code: string): string {
  return code.trim().toUpperCase().replace(/\s+/g, "");
}

function generateCode(length = 8): string {
  let out = "";
  for (let i = 0; i < length; i++) {
    out += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return out;
}

/**
 * 管理者：クーポンを生成する。code 未指定ならランダム生成。
 */
export const createCoupon = onCall(
  { region: "asia-northeast1" },
  async (request) => {
    if (request.auth?.token.admin !== true) {
      throw new HttpsError("permission-denied", "管理者のみ実行できます。");
    }
    const data = request.data as {
      code?: string;
      creditsGranted?: number;
      maxRedemptions?: number;
      expiresAtMs?: number;
      note?: string;
    };

    const creditsGranted = Math.max(1, Math.min(Number(data.creditsGranted ?? 1), 100));
    const maxRedemptions = Math.max(1, Math.min(Number(data.maxRedemptions ?? 1), 100000));
    const db = admin.firestore();

    const code = normalizeCode(data.code || generateCode());
    if (code.length < 4) {
      throw new HttpsError("invalid-argument", "コードは4文字以上にしてください。");
    }

    const ref = db.collection("coupons").doc(code);
    const existing = await ref.get();
    if (existing.exists) {
      throw new HttpsError("already-exists", "同じコードが既に存在します。");
    }

    const now = Date.now();
    const doc: CouponData = {
      code,
      creditsGranted,
      maxRedemptions,
      redemptionCount: 0,
      ...(data.expiresAtMs ? { expiresAtMs: Number(data.expiresAtMs) } : {}),
      active: true,
      ...(data.note ? { note: String(data.note).slice(0, 200) } : {}),
      createdAt: admin.firestore.FieldValue.serverTimestamp() as unknown as FirebaseFirestore.Timestamp,
      createdAtMs: now,
    };
    await ref.set(doc);

    logger.info("Coupon created", { code, creditsGranted, maxRedemptions });
    return { ok: true, code, creditsGranted, maxRedemptions };
  }
);

/**
 * ユーザー：クーポンを引き換えて singleBookCredits を付与する。
 * 1ユーザー1回まで・利用上限・有効期限・有効フラグを検証する。
 */
export const redeemCoupon = onCall(
  { region: "asia-northeast1" },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "ログインが必要です。");
    }
    const uid = request.auth.uid;
    const code = normalizeCode(String((request.data as { code?: string })?.code ?? ""));
    if (!code) {
      throw new HttpsError("invalid-argument", "コードを入力してください。");
    }

    const db = admin.firestore();
    const couponRef = db.collection("coupons").doc(code);
    const redemptionRef = db.collection("couponRedemptions").doc(`${uid}_${code}`);
    const userRef = db.collection("users").doc(uid);

    const granted = await db.runTransaction(async (tx) => {
      const couponSnap = await tx.get(couponRef);
      if (!couponSnap.exists) {
        throw new HttpsError("not-found", "無効なコードです。");
      }
      const coupon = couponSnap.data() as CouponData;

      if (!coupon.active) {
        throw new HttpsError("failed-precondition", "このコードは現在利用できません。");
      }
      if (coupon.expiresAtMs && Date.now() > coupon.expiresAtMs) {
        throw new HttpsError("failed-precondition", "このコードは有効期限が切れています。");
      }
      if (coupon.redemptionCount >= coupon.maxRedemptions) {
        throw new HttpsError("resource-exhausted", "このコードは利用上限に達しています。");
      }

      const already = await tx.get(redemptionRef);
      if (already.exists) {
        throw new HttpsError("already-exists", "このコードは既に引き換え済みです。");
      }

      tx.update(couponRef, { redemptionCount: admin.firestore.FieldValue.increment(1) });
      tx.set(redemptionRef, {
        userId: uid,
        code,
        creditsGranted: coupon.creditsGranted,
        redeemedAtMs: Date.now(),
        redeemedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      tx.set(
        userRef,
        { singleBookCredits: admin.firestore.FieldValue.increment(coupon.creditsGranted) },
        { merge: true }
      );

      return coupon.creditsGranted;
    });

    logger.info("Coupon redeemed", { uid, code, granted });
    return { ok: true, creditsGranted: granted };
  }
);

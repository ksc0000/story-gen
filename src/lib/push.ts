"use client";

import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { isDemoMode } from "@/lib/demo";

/**
 * 生成完了プッシュ通知（FCM Web Push）のクライアント側ユーティリティ。
 *
 * - SW（/firebase-messaging-sw.js）には Firebase 設定をクエリパラメータで注入する
 *   （設定値をリポジトリにコミットしないため）。
 * - VAPID キーは NEXT_PUBLIC_FIREBASE_VAPID_KEY があれば使用、無ければ
 *   Firebase プロジェクト既定のキーペアにフォールバックする。
 * - iOS Safari はホーム画面に追加した PWA でのみ通知可（iOS 16.4+）。
 */

const SW_PATH = "/firebase-messaging-sw.js";

export type PushSupportState =
  | "supported"
  | "needs-install" // iOS Safari のブラウザ表示（PWA インストールで通知可能になる）
  | "unsupported";

function isIos(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)")?.matches === true ||
    // iOS Safari 独自プロパティ
    (navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

/** この環境でプッシュ通知が使えるか（iOS未インストールは needs-install） */
export async function getPushSupportState(): Promise<PushSupportState> {
  if (typeof window === "undefined" || isDemoMode) return "unsupported";
  if (!("serviceWorker" in navigator)) return "unsupported";
  if (isIos() && !isStandalone()) {
    // iOS は PWA としてインストールされるまで Notification API 自体が現れない
    return "needs-install";
  }
  if (!("Notification" in window) || !("PushManager" in window)) return "unsupported";
  try {
    const { isSupported } = await import("firebase/messaging");
    return (await isSupported()) ? "supported" : "unsupported";
  } catch {
    return "unsupported";
  }
}

function buildSwUrl(): string {
  const params = new URLSearchParams({
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "",
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "",
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "",
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "",
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "",
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? "",
  });
  return `${SW_PATH}?${params.toString()}`;
}

/**
 * 通知許可を要求し、FCM トークンを取得して Firestore に保存する。
 * 成功時はトークン文字列、拒否/失敗時は null を返す。
 * 必ずユーザー操作（ボタンタップ）から呼ぶこと。
 */
export async function enableBookCompletionPush(uid: string): Promise<string | null> {
  const state = await getPushSupportState();
  if (state !== "supported") return null;

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return null;

  try {
    const registration = await navigator.serviceWorker.register(buildSwUrl());
    await navigator.serviceWorker.ready;

    const { getMessaging, getToken } = await import("firebase/messaging");
    const { getApps } = await import("firebase/app");
    const messaging = getMessaging(getApps()[0]);

    const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
    const token = await getToken(messaging, {
      serviceWorkerRegistration: registration,
      ...(vapidKey ? { vapidKey } : {}),
    });
    if (!token) return null;

    // トークンをドキュメントIDにして保存（同一端末の重複を自然に排除）
    await setDoc(
      doc(db, "users", uid, "fcmTokens", token),
      {
        token,
        platform: isIos() ? "ios-pwa" : "web",
        userAgent: typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 200) : "",
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
    return token;
  } catch (err) {
    console.error("Failed to enable push notifications:", err);
    return null;
  }
}

/** 既に許可済みなら true（UI の出し分け用） */
export function isPushPermissionGranted(): boolean {
  return typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted";
}

export function isPushPermissionDenied(): boolean {
  return typeof window !== "undefined" && "Notification" in window && Notification.permission === "denied";
}

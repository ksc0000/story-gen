import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getFunctions } from "firebase/functions";
import { getAnalytics, isSupported, type Analytics } from "firebase/analytics";
import { initializeAppCheck, ReCaptchaV3Provider, ReCaptchaEnterpriseProvider } from "firebase/app-check";

import { isDemoMode } from "./demo";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

if ((isDemoMode || process.env.NODE_ENV === "test") && !firebaseConfig.apiKey) {
  firebaseConfig.apiKey = "DummyKey";
  firebaseConfig.projectId = "dummy-project";
}

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app, "asia-northeast1");

export let analytics: Analytics | null = null;

if (typeof window !== "undefined" && !isDemoMode) {
  if (process.env.NODE_ENV !== "production") {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (self as any).FIREBASE_APPCHECK_DEBUG_TOKEN =
      process.env.NEXT_PUBLIC_FIREBASE_APP_CHECK_DEBUG_TOKEN ?? true;
  }
  // App Check: Enterprise キーがあればそちらを使う。
  // クラシック reCAPTCHA は 2024 年以降キーの新規発行が止まっており、
  // Firebase Console 側も v3 の登録フォームを無効化しているため Enterprise が正路。
  // 両対応にしてあるのは、コードのデプロイと Console 側の登録を別々に行えるようにするため
  // （プロバイダとキーが食い違うと appCheck/recaptcha-error になる）。
  const enterpriseSiteKey = process.env.NEXT_PUBLIC_RECAPTCHA_ENTERPRISE_SITE_KEY;
  const legacySiteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
  if (enterpriseSiteKey) {
    initializeAppCheck(app, {
      provider: new ReCaptchaEnterpriseProvider(enterpriseSiteKey),
      isTokenAutoRefreshEnabled: true,
    });
  } else if (legacySiteKey) {
    initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider(legacySiteKey),
      isTokenAutoRefreshEnabled: true,
    });
  }
  isSupported().then((supported) => {
    if (supported) {
      analytics = getAnalytics(app);
    }
  });
}

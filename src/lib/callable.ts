/**
 * httpsCallable のラッパー。
 *
 * サーバの callable は `consumeAppCheckToken: true`（トークンを1回で消費し、再利用を拒否）で
 * 定義されている。クライアントが通常の App Check トークン（TTL 7日・キャッシュ共有）で
 * 呼ぶと、2回目以降が「消費済みトークン」として INVALID 判定される。
 * （2026-09-03 本番ログで規約確認: 再生成呼び出しの App Check が毎回 rejected）
 * `limitedUseAppCheckTokens: true` で毎回使い切りトークンを取得し、消費型の検証と対にする。
 * App Check 強制（Stage 2）へ進む前提条件。
 */
import { httpsCallable as firebaseHttpsCallable } from "firebase/functions";
import type { Functions, HttpsCallable, HttpsCallableOptions } from "firebase/functions";

export const CALLABLE_OPTIONS: HttpsCallableOptions = { limitedUseAppCheckTokens: true };

export function httpsCallable<RequestData = unknown, ResponseData = unknown>(
  functionsInstance: Functions,
  name: string,
  options?: HttpsCallableOptions
): HttpsCallable<RequestData, ResponseData> {
  return firebaseHttpsCallable<RequestData, ResponseData>(functionsInstance, name, {
    ...CALLABLE_OPTIONS,
    ...options,
  });
}

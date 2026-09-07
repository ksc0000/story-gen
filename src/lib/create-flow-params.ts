/**
 * 作成導線の URL パラメータ引き継ぎ。
 *
 * 各画面が `new URLSearchParams()` を作り直すため、保存テンプレ（tpl=1）や
 * なかよしキャラのプロフィールから渡された設定が途中で落ちていた。
 * ここで「引き継ぐべきキー」を一箇所に定義し、各画面はこれを呼ぶ。
 */

/** 服装まわり（保存テンプレ由来。input / ai-brief が作り直す params に乗せる） */
export const OUTFIT_PARAM_KEYS = ["outfitMode", "customOutfit", "keepSignatureItem"] as const;

/** なかよしキャラ（相棒として同行させる指定。主人公選択で子どもを選んでも保持する） */
export const COMPANION_PARAM_KEYS = ["companionId", "companionName", "companionVisualDescription"] as const;

/** `from` にあるキーだけを `to` にコピーする（既に `to` にある値は上書きしない） */
export function forwardParams(
  from: URLSearchParams,
  to: URLSearchParams,
  keys: readonly string[]
): URLSearchParams {
  for (const key of keys) {
    const value = from.get(key);
    if (value != null && value !== "" && !to.has(key)) to.set(key, value);
  }
  return to;
}

import type { OutfitMode } from "@/lib/types";

const OUTFIT_MODES: readonly OutfitMode[] = ["profile_default", "theme_auto", "user_custom"];

/** 保存テンプレ由来の服装設定を state 初期値として読む */
export function readOutfitParams(params: URLSearchParams): {
  outfitMode?: OutfitMode;
  customOutfit?: string;
  keepSignatureItem?: boolean;
} {
  const mode = params.get("outfitMode");
  const keep = params.get("keepSignatureItem");
  return {
    outfitMode: (OUTFIT_MODES as readonly string[]).includes(mode ?? "") ? (mode as OutfitMode) : undefined,
    customOutfit: params.get("customOutfit") ?? undefined,
    keepSignatureItem: keep === "true" ? true : keep === "false" ? false : undefined,
  };
}

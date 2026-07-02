// エンタープライズ（園・団体）機能の公開フラグ。
// 一般公開するときは NEXT_PUBLIC_ENTERPRISE_OPEN=true でビルドする。
// 非公開の間も admin クレーム保持者は動作確認のためアクセス可能（enterprise-gate 参照）。
export const ENTERPRISE_OPEN = process.env.NEXT_PUBLIC_ENTERPRISE_OPEN === "true";

#!/usr/bin/env node
/**
 * ビルド成果物（out/）に焼き込まれた Firebase 設定の健全性チェック。
 *
 * 背景: 本番バンドルの appId に測定ID（G-…）が焼き込まれ、Firebase
 * Installations が 400 INVALID_ARGUMENT で全端末失敗 → FCM トークンが
 * 一切登録できない障害が起きた（2026-07-11）。NEXT_PUBLIC_* はコンパイル時
 * 焼き込みのため、環境変数の取り違えや .next キャッシュの古い値は
 * デプロイ前に成果物側で検出するしかない。
 *
 * deploy:hosting のビルド直後に実行され、不正ならデプロイを中断する。
 */

const fs = require("fs");
const path = require("path");

const chunksDir = path.join(__dirname, "..", "out", "_next", "static", "chunks");
const APP_ID_PATTERN = /appId:"([^"]*)"/g;
// Firebase App ID の正しい形式: 1:<projectNumber>:web:<hash>
const VALID_APP_ID = /^1:\d+:(web|ios|android):[0-9a-f]+$/;

if (!fs.existsSync(chunksDir)) {
  console.error(`verify-build-config: ${chunksDir} がありません。先に build してください。`);
  process.exit(1);
}

const bad = [];
let found = 0;

for (const file of fs.readdirSync(chunksDir)) {
  if (!file.endsWith(".js")) continue;
  const content = fs.readFileSync(path.join(chunksDir, file), "utf8");
  for (const match of content.matchAll(APP_ID_PATTERN)) {
    const value = match[1];
    // SDK 内部コードの `appId:"..."` ではなく設定リテラルだけを見るため、
    // 変数参照など空でない実値のみ判定する
    if (!value) continue;
    found += 1;
    if (!VALID_APP_ID.test(value)) {
      bad.push({ file, value });
    }
  }
}

if (found === 0) {
  console.error("verify-build-config: 成果物に appId が見つかりません。ビルドが不完全な可能性があります。");
  process.exit(1);
}

if (bad.length > 0) {
  console.error("verify-build-config: 不正な appId が焼き込まれています（Installations が 400 で全滅します）:");
  for (const { file, value } of bad) {
    console.error(`  - ${file}: appId:"${value}"`);
  }
  console.error("NEXT_PUBLIC_FIREBASE_APP_ID の値（1:…:web:… 形式か）と .next キャッシュを確認してください。");
  process.exit(1);
}

console.log(`verify-build-config: OK（appId 焼き込み ${found} 箇所、全て正しい形式）`);

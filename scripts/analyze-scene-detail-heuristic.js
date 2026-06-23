// 一回限りの調査スクリプト（読み取り専用）。
// missing_scene_detail / missing_action_or_emotion の過剰発火を実データで定量し、
// 再キャリブレーション候補の発火率を OLD と比較する。
// 使い方: GOOGLE_APPLICATION_CREDENTIALS=<sa.json> node scripts/analyze-scene-detail-heuristic.js [--limit N]
const { createRequire } = require("module");
const { resolve } = require("path");
const { readFileSync } = require("fs");
const fnRequire = createRequire(resolve(__dirname, "../functions/package.json"));
const { initializeApp, cert, getApps } = fnRequire("firebase-admin/app");
const { getFirestore } = fnRequire("firebase-admin/firestore");

const placeWords = /(おへや|へや|まど|そら|こうえん|もり|みち|すなば|すなのなか|すなのうえ|てのなか|てのひら|ゆびさき|うみ|かわ|やま|にわ|キッチン|テーブル|ベッド|どうぶつえん|みずうみ|くも)/;
const actionWords = /(ある|はし|みつけ|あつめ|つく|のぼ|すべ|ひろ|みつめ|さわ|のぞ|えら|あけ|もっ|ぎゅっ|ふり|わら|みた|きい|のった|とんだ|ひらいた|ひろが|ならべ|おいた|みせた|つたえ|かんがえ|みつめた)/;
const emotionWords = /(うれ|かなし|ほっ|びっくり|わくわく|どきどき|にっこり|わら|えがお|みつけ|きづ|ふしぎ|あんしん|こわ|たのし)/;
const countJa = (t) => (t.replace(/\s+/g, "").match(/[ぁ-んァ-ヶ一-龠]/g) ?? []).length;

function initDb() {
  const cred = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!cred) throw new Error("GOOGLE_APPLICATION_CREDENTIALS is not set.");
  const sa = JSON.parse(readFileSync(cred, "utf8"));
  if (getApps().length === 0) initializeApp({ credential: cert(sa), projectId: sa.project_id });
  return getFirestore();
}

(async () => {
  const limit = Number((process.argv.find((a, i) => process.argv[i - 1] === "--limit")) || 80);
  const db = initDb();
  const snap = await db.collection("books").orderBy("createdAt", "desc").limit(limit).get();

  // 各候補の per-page 判定
  const variants = {
    OLD_no_place: (t) => !placeWords.test(t),
    NEW_thin_lt35: (t) => !placeWords.test(t) && countJa(t) < 35,
    NEW_empty_no_place_action_emotion: (t) =>
      !placeWords.test(t) && !actionWords.test(t) && !emotionWords.test(t),
    OLD_no_action_emotion: (t) => !(actionWords.test(t) || emotionWords.test(t)),
    NEW_actemo_thin_lt35: (t) => !(actionWords.test(t) || emotionWords.test(t)) && countJa(t) < 35,
  };

  const pageFires = {}; // variant -> pages that fired
  const bookFires = {}; // variant -> books with >=1 firing page
  for (const k of Object.keys(variants)) {
    pageFires[k] = 0;
    bookFires[k] = 0;
  }
  let totalBooks = 0;
  let totalPages = 0;

  for (const doc of snap.docs) {
    const pagesSnap = await doc.ref.collection("pages").get();
    const texts = pagesSnap.docs.map((p) => p.data().text || "").filter((t) => t.length > 0);
    if (texts.length === 0) continue;
    totalBooks += 1;
    totalPages += texts.length;
    for (const [k, fn] of Object.entries(variants)) {
      let bookHit = false;
      for (const t of texts) {
        if (fn(t)) {
          pageFires[k] += 1;
          bookHit = true;
        }
      }
      if (bookHit) bookFires[k] += 1;
    }
  }

  console.log(`\n対象: ${totalBooks}冊 / ${totalPages}ページ\n`);
  console.log("variant".padEnd(38), "page発火率", "book発火率");
  for (const k of Object.keys(variants)) {
    const pr = ((100 * pageFires[k]) / totalPages).toFixed(1) + "%";
    const br = ((100 * bookFires[k]) / totalBooks).toFixed(1) + "%";
    console.log(k.padEnd(38), pr.padStart(8), br.padStart(9));
  }
  process.exit(0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});

const fs = require('fs');
const path = require('path');
const { createRequire } = require('module');

const req = createRequire(path.resolve('functions/package.json'));
const { initializeApp, cert, getApps } = req('firebase-admin/app');
const { getFirestore } = req('firebase-admin/firestore');

const cred = JSON.parse(fs.readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS, 'utf8'));
if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: cred.project_id,
      clientEmail: cred.client_email,
      privateKey: String(cred.private_key).replace(/\\n/g, '\n'),
    }),
    projectId: cred.project_id,
  });
}

const db = getFirestore();
const bookId = 'mR3lsI7AF2P8n11mMRxS';
const outDir = path.resolve('.tmp', 't3-5-5');
fs.mkdirSync(outDir, { recursive: true });

async function download(url, dst) {
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  const ab = await res.arrayBuffer();
  fs.writeFileSync(dst, Buffer.from(ab));
}

(async () => {
  const snap = await db.collection('books').doc(bookId).collection('pages').get();
  const rows = snap.docs.map((d) => d.data()).sort((a, b) => (a.pageNumber ?? 0) - (b.pageNumber ?? 0));
  console.log(`[book] ${bookId} pages=${rows.length}`);
  for (const p of rows) {
    const pn = p.pageNumber;
    const dst = path.join(outDir, `page-${pn}.png`);
    try {
      await download(p.imageUrl, dst);
      console.log(`downloaded page=${pn} status=${p.status} model=${p.imageModel || ''}`);
    } catch (e) {
      console.error(`failed page=${pn}:`, e.message || e);
      throw e;
    }
  }
  console.log(`[done] ${outDir}`);
})().catch((e) => {
  console.error('[fatal]', e.message || e);
  process.exit(1);
});

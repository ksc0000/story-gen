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

(async () => {
  const db = getFirestore();
  const snap = await db.collection('books').doc('mR3lsI7AF2P8n11mMRxS').collection('pages').get();
  const rows = snap.docs.map((d) => d.data()).sort((a, b) => (a.pageNumber ?? 0) - (b.pageNumber ?? 0));
  const lines = rows.map((p) => `${p.pageNumber}|${p.imageUrl}`);
  fs.writeFileSync(path.resolve('.tmp', 't3-5-5', 'urls.txt'), lines.join('\n'));
  console.log(`wrote ${lines.length} urls`);
})();

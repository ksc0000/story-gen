const { createRequire } = require("module");
const { resolve } = require("path");
const { readFileSync } = require("fs");
const functionsRequire = createRequire(resolve(__dirname, "../functions/package.json"));
const { initializeApp, cert, getApps } = functionsRequire("firebase-admin/app");
const { getFirestore } = functionsRequire("firebase-admin/firestore");
const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
const sa = JSON.parse(readFileSync(credPath, "utf8"));
if (!getApps().length) {
  initializeApp({ credential: cert({ clientEmail: sa.client_email, privateKey: sa.private_key, projectId: sa.project_id }), projectId: sa.project_id });
}
const db = getFirestore();
db.collection("books").doc("ZNbdu8zX7HNYzoST327M").collection("pages").orderBy("pageNumber").get().then(snap => {
  snap.forEach(d => { const p = d.data(); console.log("P" + p.pageNumber + "|" + (p.imageUrl || "NO_URL")); });
  process.exit(0);
}).catch(e => { console.error(e.message); process.exit(1); });

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
db.collection("books").doc("OZmjFEZxVnW0vpRD0uuH").collection("pages").get().then(snap => {
  console.log("docs count:", snap.size);
  snap.forEach(d => {
    const p = d.data();
    const keys = Object.keys(p).join(",");
    console.log("id:", d.id, "pageNumber:", p.pageNumber, "pageIndex:", p.pageIndex, "keys:", keys.substring(0,80));
    console.log("  imageUrl:", (p.imageUrl||"NONE").substring(0,80));
  });
  process.exit(0);
}).catch(e => { console.error(e.message); process.exit(1); });

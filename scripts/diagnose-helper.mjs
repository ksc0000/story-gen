import { createRequire } from "module";
import { resolve } from "path";
const require = createRequire(import.meta.url);
const functionsRequire = createRequire(resolve("functions/package.json"));
const { initializeApp, cert } = functionsRequire("firebase-admin/app");
const { getFirestore } = functionsRequire("firebase-admin/firestore");

async function main() {
  console.log("Searching for books with potential consistency issues...");
  // This will fail if no credentials, but let's see if we can get anything from a local emulator if it's running
  try {
    const db = getFirestore();
    const snap = await db.collection("books").orderBy("createdAt", "desc").limit(10).get();
    snap.docs.forEach(doc => {
      const data = doc.data();
      console.log(`Book ID: ${doc.id}, Status: ${data.status}, Mode: ${data.creationMode}, Consistency: ${data.characterConsistencyMode}`);
    });
  } catch (e) {
    console.error("Firestore access failed. Using baseline data instead.");
  }
}
main();

/**
 * T6-43: I1 Smoke — Create a single book with openai_image_candidate profile.
 * Target pair: imagination × crayon
 *
 * Prerequisites:
 *   - OPENAI_API_KEY registered in Firebase Secret Manager (A4)
 *   - OpenAI Organization Verification completed (A3)
 *   - functions deployed with OpenAI routing (firebase deploy --only functions)
 *
 * Usage:
 *   node scripts/create-openai-smoke-book.js
 */

const admin = require("firebase-admin");
const { randomUUID } = require("crypto");

// Initialize with service account or Application Default Credentials
if (!admin.apps.length) {
  admin.initializeApp({ projectId: "story-gen-8a769" });
}

const db = admin.firestore();

async function main() {
  const userId = "smoke-test-openai-i1";
  const bookId = `smoke-openai-i1-${Date.now()}`;

  // Ensure user doc exists
  const userRef = db.collection("users").doc(userId);
  const userDoc = await userRef.get();
  if (!userDoc.exists) {
    await userRef.set({
      plan: "premium",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      generationOverride: { bypassMonthlyLimit: true },
    });
    console.log(`Created user: ${userId}`);
  }

  const bookData = {
    userId,
    status: "generating",
    theme: "imagination",
    style: "crayon",
    pageCount: 8,
    creationMode: "guided_ai",
    productPlan: "premium_paid",
    imageQualityTier: "light",
    imageModelProfile: "openai_image_candidate", // T6-43: OpenAI diagnostic
    characterConsistencyMode: "cover_only",
    childName: "ゆうき",
    childAge: 5,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    createdAtMs: Date.now(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAtMs: Date.now(),
  };

  console.log(`Creating smoke book: ${bookId}`);
  console.log(`  theme: ${bookData.theme}`);
  console.log(`  style: ${bookData.style}`);
  console.log(`  imageModelProfile: ${bookData.imageModelProfile}`);
  console.log(`  pageCount: ${bookData.pageCount}`);

  await db.collection("books").doc(bookId).set(bookData);

  console.log(`\nBook document created: books/${bookId}`);
  console.log(`Monitor: node scripts/inspect-smoke-book.js ${bookId}`);
  console.log(`\nExpected outcome:`);
  console.log(`  - If OPENAI_API_KEY is configured: generates 8 pages via gpt-image-1-mini`);
  console.log(`  - Success criterion: image_failed <= 2/8`);
  console.log(`  - Rejection criterion: image_failed >= 6/8`);
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});

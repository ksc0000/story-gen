import { createRequire } from "module";
import { fileURLToPath } from "url";
import { resolve, dirname } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(resolve(__dirname, "../../functions/package.json"));
const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");

// Force emulator usage
process.env.FIRESTORE_EMULATOR_HOST = "localhost:8080";

initializeApp({
  projectId: "story-gen-8a769",
});

const db = getFirestore();

const AXES = [
  "storyScore",
  "illustrationScore",
  "characterConsistencyScore",
  "personalizationScore",
  "safetyScore",
  "overallScore",
];

function getRandomScore(base, variance = 1) {
  const score = base + (Math.random() * variance * 2 - variance);
  return Math.round(Math.min(5, Math.max(1, score)) * 10) / 10;
}

async function seed() {
  console.log("Seeding mock comparison data to Firestore emulator...");

  for (let i = 1; i <= 50; i++) {
    const bookId = `mock-book-${i}`;
    const bookRef = db.collection("books").doc(bookId);

    // Create book summary (optional but good for script compatibility)
    await bookRef.set({
      title: `Mock Book ${i}`,
      status: "completed",
      createdAt: new Date(),
    });

    // Create Human Review
    const humanBase = 3 + Math.random() * 2; // Bias towards higher quality for humans
    const humanReview = {
      reviewerType: "human",
      reviewerId: "human-1",
      storyScore: Math.round(getRandomScore(humanBase)),
      illustrationScore: Math.round(getRandomScore(humanBase)),
      characterConsistencyScore: Math.round(getRandomScore(humanBase)),
      personalizationScore: Math.round(getRandomScore(humanBase)),
      safetyScore: 5, // Usually safe
      overallScore: 0,
      flaggedIssues: [],
      createdAtMs: Date.now(),
    };
    humanReview.overallScore = (humanReview.storyScore + humanReview.illustrationScore + humanReview.characterConsistencyScore + humanReview.personalizationScore + humanReview.safetyScore) / 5;

    // Simulate some human-flagged issues
    if (Math.random() > 0.8) {
      humanReview.flaggedIssues.push({ area: "illustration", message: "Anatomy issues" });
      humanReview.illustrationScore = Math.max(1, humanReview.illustrationScore - 1);
    }
    if (i === 42) { // Edge case: serious safety issue
      humanReview.flaggedIssues.push({ area: "safety", message: "Inappropriate content" });
      humanReview.safetyScore = 1;
    }

    // Create LLM Review
    // LLM is usually slightly lenient (Bias +0.2) or slightly different variance
    const llmReview = {
      reviewerType: "llm",
      reviewerId: "system_llm",
      storyScore: getRandomScore(humanReview.storyScore, 0.5),
      illustrationScore: getRandomScore(humanReview.illustrationScore, 0.7),
      characterConsistencyScore: getRandomScore(humanReview.characterConsistencyScore, 0.6),
      personalizationScore: getRandomScore(humanReview.personalizationScore, 0.3),
      safetyScore: getRandomScore(humanReview.safetyScore, 0.2),
      overallScore: 0,
      flaggedIssues: [],
      createdAtMs: Date.now(),
    };

    // Systematic Bias Simulation: LLM is more lenient on Character Consistency
    llmReview.characterConsistencyScore = Math.min(5, llmReview.characterConsistencyScore + 0.3);

    llmReview.overallScore = (llmReview.storyScore + llmReview.illustrationScore + llmReview.characterConsistencyScore + llmReview.personalizationScore + llmReview.safetyScore) / 5;

    // Simulate LLM flagging issues
    if (llmReview.illustrationScore < 3.5) {
      llmReview.flaggedIssues.push({ area: "illustration", message: "Visual artifacts detected" });
    }

    // Simulate False Negative in Safety for book 42
    if (i === 42) {
      llmReview.safetyScore = 4.5; // LLM missed the safety issue
    }

    await bookRef.collection("qualityReviews").doc("human-review").set(humanReview);
    await bookRef.collection("qualityReviews").doc("llm-review").set(llmReview);

    if (i % 10 === 0) console.log(`  Processed ${i}/50 books...`);
  }

  console.log("Seeding complete.");
}

seed().catch(console.error);

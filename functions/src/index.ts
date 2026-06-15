import { initializeApp, getApps } from "firebase-admin/app";

if (getApps().length === 0) initializeApp();

export { generateBook } from "./generate-book";
export { deleteBook } from "./delete-book";
export { generateChildCharacter } from "./generate-child-character";
export { cleanupExpired } from "./cleanup-expired";
export { resetMonthlyQuota } from "./reset-monthly-quota";
export { seedTemplates } from "./seed-templates";
export { testImageModels } from "./test-image-models";
export { bootstrapAdmin } from "./bootstrap-admin";
export { regeneratePageImage, checkBookCompletion } from "./regenerate-page-image";
export { regenerateCoverImage } from "./regenerate-cover-image";
export { saveDailySloSnapshot } from "./save-daily-slo-snapshot";
export { saveWeeklySloSnapshot } from "./save-weekly-slo-snapshot";
export { cleanupStaleGeneration } from "./cleanup-stale-generation";
export { createCheckoutSession, createSinglePurchaseCheckout, stripeWebhook } from "./stripe-checkout";
export { onAvatarJobCreated } from "./generate-avatar-job";
export { generateTemplate } from "./generate-template";
export { onCompanionImageJobCreated } from "./generate-companion-image";
export { generateStoryPitch } from "./generate-story-pitch";
export { onBookCompletion_triggerLLMAutoReview } from "./auto-review";
export { submitAppFeedback } from "./submit-app-feedback";
export { updateBookTitle } from "./update-book-title";

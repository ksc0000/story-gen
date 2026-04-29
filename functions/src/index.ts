import { initializeApp, getApps } from "firebase-admin/app";

if (getApps().length === 0) initializeApp();

export { generateBook } from "./generate-book";
export { generateChildCharacter } from "./generate-child-character";
export { cleanupExpired } from "./cleanup-expired";
export { resetMonthlyQuota } from "./reset-monthly-quota";
export { seedTemplates } from "./seed-templates";

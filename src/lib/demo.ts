export const isDemoMode =
  typeof window !== "undefined" &&
  (process.env.NEXT_PUBLIC_EHONAI_DEMO_MODE === "true" ||
    (process.env.NEXT_PUBLIC_FIREBASE_API_KEY?.includes("Dummy") ?? false));

import type { CharacterConsistencyMode, ImageQualityTier, ProductPlan, TemplateDoc } from "@/lib/types";

export const DEMO_TEMPLATES: (TemplateDoc & { id: string })[] = [
  { id: "animals", name: "どうぶつのおはなし", description: "ふわふわ動物たちと友だちになるやさしい物語", icon: "🐾", genre: "Animal", categoryGroupId: "favorite-worlds", creationMode: "guided_ai", priceTier: "take", storyCostLevel: "standard", sampleImageUrl: "/images/templates/animals.png", order: 1, systemPrompt: "", active: true },
  { id: "adventure", name: "わくわく冒険", description: "森・海・空へ出かける発見いっぱいの冒険", icon: "⛰️", genre: "Adventure", categoryGroupId: "imagination", creationMode: "guided_ai", priceTier: "take", storyCostLevel: "standard", sampleImageUrl: "/images/templates/adventure.png", order: 2, systemPrompt: "", active: true },
  { id: "fantasy", name: "まほうの世界", description: "魔法や妖精、ドラゴンが出てくる夢の世界", icon: "🪄", genre: "Fantasy", categoryGroupId: "imagination", creationMode: "guided_ai", priceTier: "take", storyCostLevel: "standard", sampleImageUrl: "/images/templates/fantasy.png", sampleImages: { premium: "/images/templates/fantasy.png" }, order: 3, systemPrompt: "", active: true },
  { id: "bedtime", name: "おやすみ前のおはなし", description: "月と星に包まれる静かな寝かしつけ絵本", icon: "🌙", genre: "Bedtime", categoryGroupId: "bedtime", creationMode: "guided_ai", priceTier: "take", storyCostLevel: "standard", sampleImageUrl: "/images/templates/bedtime.png", sampleImages: { premium: "/images/templates/bedtime.png" }, order: 4, systemPrompt: "", active: true },
  { id: "emotional-growth", name: "こころを育てる", description: "勇気・やさしさ・自己肯定感を育てる物語", icon: "⭐", genre: "Emotional Growth", categoryGroupId: "emotional-growth", creationMode: "guided_ai", priceTier: "take", storyCostLevel: "standard", sampleImageUrl: "/images/templates/emotional-growth.png", order: 5, systemPrompt: "", active: true },
  { id: "daily-habits", name: "生活習慣をまなぶ", description: "歯みがき・片づけ・あいさつを楽しく練習", icon: "🪥", genre: "Daily Habits", categoryGroupId: "growth-support", creationMode: "guided_ai", priceTier: "take", storyCostLevel: "standard", sampleImageUrl: "/images/templates/daily-habits.png", order: 6, systemPrompt: "", active: true },
  { id: "educational", name: "たのしく学ぶ", description: "数字・色・形・ひらがなを遊びながら学ぶ", icon: "🔤", genre: "Educational", categoryGroupId: "learning", creationMode: "guided_ai", priceTier: "take", storyCostLevel: "standard", sampleImageUrl: "/images/templates/educational.png", order: 7, systemPrompt: "", active: true },
  { id: "food", name: "おいしいおはなし", description: "パンや野菜、スイーツが主役のかわいい物語", icon: "🍳", genre: "Food", categoryGroupId: "favorite-worlds", creationMode: "guided_ai", priceTier: "take", storyCostLevel: "standard", sampleImageUrl: "/images/templates/food.png", order: 8, systemPrompt: "", active: true },
  { id: "seasonal", name: "季節とイベント", description: "春夏秋冬、誕生日や行事を楽しむ絵本", icon: "🌸", genre: "Seasonal", categoryGroupId: "seasonal-events", creationMode: "guided_ai", priceTier: "take", storyCostLevel: "standard", sampleImageUrl: "/images/templates/seasonal.png", order: 9, systemPrompt: "", active: true },
  { id: "vehicles-robots", name: "のりもの・ロボット", description: "電車・車・飛行機・ロボットの楽しい世界", icon: "🤖", genre: "Vehicles & Robots", categoryGroupId: "favorite-worlds", creationMode: "guided_ai", priceTier: "take", storyCostLevel: "standard", sampleImageUrl: "/images/templates/vehicles-robots.png", order: 10, systemPrompt: "", active: true },
  { id: "fixed-first-zoo", name: "はじめてのどうぶつえん", description: "はじめてのおでかけをやさしく残す固定テンプレート", icon: "🦁", categoryGroupId: "memories", creationMode: "fixed_template", priceTier: "ume", storyCostLevel: "none", sampleImageUrl: "/images/templates/animals.png", order: 11, systemPrompt: "", active: true },
  { id: "fixed-bedtime-good-day", name: "きょうもいい日だったね", description: "寝る前に短く読める安心テンプレート", icon: "🛏️", categoryGroupId: "bedtime", creationMode: "fixed_template", priceTier: "ume", storyCostLevel: "none", sampleImageUrl: "/images/templates/bedtime.png", order: 12, systemPrompt: "", active: true },
  { id: "original-ai", name: "オリジナル絵本", description: "自由に書いた内容からAIが一から作る絵本", icon: "✨", categoryGroupId: "imagination", creationMode: "original_ai", priceTier: "matsu", storyCostLevel: "standard", sampleImageUrl: "/images/templates/fantasy.png", order: 13, systemPrompt: "", active: true, isOriginalEntry: true },
];

const DEMO_STORAGE_KEY = "ehonai-demo-books";

type DemoBookPage = {
  id: string;
  pageNumber: number;
  text: string;
  imageUrl: string;
  imagePrompt: string;
  status: "generating" | "completed" | "failed";
};

export type DemoBook = {
  id: string;
  title: string;
  theme: string;
  style: string;
  pageCount: number;
  productPlan?: ProductPlan;
  imageQualityTier?: ImageQualityTier;
  characterConsistencyMode?: CharacterConsistencyMode;
  status: "generating" | "completed" | "failed";
  progress: number;
  pages: DemoBookPage[];
};

function getDemoStorage(): Record<string, DemoBook> {
  if (typeof window === "undefined") return {} as Record<string, DemoBook>;
  try {
    return JSON.parse(window.sessionStorage.getItem(DEMO_STORAGE_KEY) ?? "{}") as Record<string, DemoBook>;
  } catch {
    return {} as Record<string, DemoBook>;
  }
}

function saveDemoStorage(data: Record<string, DemoBook>) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(data));
}

export function loadDemoBook(bookId: string): DemoBook | null {
  const storage = getDemoStorage();
  return storage[bookId] ?? null;
}

export function loadAllDemoBooks(): DemoBook[] {
  return Object.values(getDemoStorage());
}

export function saveDemoBook(book: DemoBook): void {
  const storage = getDemoStorage();
  storage[book.id] = book;
  saveDemoStorage(storage);
}

export function updateDemoBook(bookId: string, patch: Partial<DemoBook>): void {
  const storage = getDemoStorage();
  const existing = storage[bookId];
  if (!existing) return;
  storage[bookId] = { ...existing, ...patch };
  saveDemoStorage(storage);
}

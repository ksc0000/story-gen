export const isDemoMode =
  typeof window !== "undefined" &&
  (process.env.NEXT_PUBLIC_FIREBASE_API_KEY?.includes("Dummy") ?? false);

import type { TemplateDoc } from "@/lib/types";

export const DEMO_TEMPLATES: (TemplateDoc & { id: string })[] = [
  { id: "birthday", name: "おたんじょうび", description: "主人公の誕生日パーティーの冒険", icon: "🎂", order: 1, systemPrompt: "", active: true },
  { id: "bedtime", name: "おやすみなさい", description: "眠りにつくまでの穏やかな物語", icon: "🌙", order: 2, systemPrompt: "", active: true },
  { id: "adventure", name: "おでかけぼうけん", description: "公園や動物園へのお出かけ冒険", icon: "🌳", order: 3, systemPrompt: "", active: true },
  { id: "seasons", name: "きせつのおはなし", description: "春夏秋冬の季節イベント", icon: "🌸", order: 4, systemPrompt: "", active: true },
  { id: "animals", name: "どうぶつのともだち", description: "動物たちと友だちになる物語", icon: "🐰", order: 5, systemPrompt: "", active: true },
  { id: "food", name: "たべものだいぼうけん", description: "好き嫌い克服や食の楽しさ", icon: "🍙", order: 6, systemPrompt: "", active: true },
  { id: "challenge", name: "できたよ！チャレンジ", description: "トイレ・着替え・お片付けなど成長体験", icon: "💪", order: 7, systemPrompt: "", active: true },
  { id: "family", name: "かぞくのおはなし", description: "家族の絆や兄弟・祖父母との物語", icon: "👨‍👩‍👧", order: 8, systemPrompt: "", active: true },
];

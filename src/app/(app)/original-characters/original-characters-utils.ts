import { CharacterRole } from "@/lib/types";

export const ROLE_OPTIONS: { value: CharacterRole; label: string; description: string }[] = [
  { value: "hero", label: "主人公", description: "物語の中心となって活躍します" },
  { value: "buddy", label: "相棒", description: "主人公のそばで支えてくれる存在です" },
  { value: "guide", label: "導き手", description: "困ったときにヒントをくれる賢い存在です" },
  { value: "guardian", label: "守護者", description: "ピンチのときに守ってくれる頼もしい存在です" },
  { value: "comic_relief", label: "ムードメーカー", description: "みんなを笑わせて元気づけてくれます" },
];

export const PERSONALITY_OPTIONS = [
  "やさしい", "元気", "おっとり", "ちょっとドジ", "勇敢", "ものしり",
  "甘えんぼ", "いたずら好き", "聞き上手", "照れ屋", "前向き", "不思議ちゃん"
];

export const MOOD_OPTIONS = [
  "ふわふわ", "まるい", "小さい", "光る", "透明", "もこもこ",
  "星っぽい", "動物っぽい", "ロボットっぽい", "雲っぽい", "植物っぽい", "おもちゃっぽい"
];

export const COLOR_OPTIONS: { value: string; label: string; hex: string }[] = [
  { value: "milk_white", label: "ミルクホワイト", hex: "#F8F8FF" },
  { value: "sky_blue", label: "そらいろ", hex: "#87CEEB" },
  { value: "sakura_pink", label: "さくらピンク", hex: "#FFB7C5" },
  { value: "lemon_yellow", label: "レモンイエロー", hex: "#FFF44F" },
  { value: "mint_green", label: "ミントグリーン", hex: "#98FF98" },
  { value: "lavender", label: "ラベンダー", hex: "#E6E6FA" },
  { value: "caramel", label: "キャラメル", hex: "#C68E17" },
  { value: "starry_navy", label: "ほしぞらネイビー", hex: "#000080" },
  { value: "coral_orange", label: "コーラルオレンジ", hex: "#FF7F50" },
  { value: "leaf_green", label: "若葉グリーン", hex: "#90EE90" },
];

export const POWER_OPTIONS = [
  "こわい気持ちを小さくする", "忘れものを見つける", "星を集める", "夢の入口を開く",
  "ありがとうを光に変える", "泣きそうな気持ちを雲にする", "勇気を一粒くれる",
  "眠くなる魔法の音を鳴らす", "小さな成功を見つける", "やさしい言葉を花にする"
];

export const QUIRK_OPTIONS = [
  "朝が少し苦手", "ほめられると光る", "うれしいとくるくる回る",
  "びっくりすると小さくなる", "おなかがすくと眠くなる", "ありがとうを聞くと花を咲かせる"
];

export function buildCharacterBible(params: {
  name: string;
  species: string;
  role: string;
  personalityTraits: string[];
  specialPower: string;
  weaknessOrQuirk?: string;
  visualProfile: {
    bodyShape: string;
    mainColor: string;
    faceFeatures: string;
    texture?: string;
  };
}): string {
  return `
1. キャラクター名: ${params.name}
2. 種族・存在: ${params.species}
3. 性格: ${params.personalityTraits.join("、")}
4. 特別な力: ${params.specialPower}
5. 弱点・クセ: ${params.weaknessOrQuirk || "なし"}
6. 見た目の詳細:
   - 体型: ${params.visualProfile.bodyShape}
   - メインカラー: ${params.visualProfile.mainColor}
   - 顔の特徴: ${params.visualProfile.faceFeatures}
   - 質感: ${params.visualProfile.texture || "標準"}
7. 物語での役割: ${params.role}
  `.trim();
}

export function buildBasePrompt(params: {
  name: string;
  species: string;
  personalityTraits: string[];
  specialPower: string;
  mainColor: string;
  visualMood: string;
}): string {
  return `
Create an original child-friendly storybook character.
Character concept:
- Name: ${params.name}
- Species/type: ${params.species}
- Personality: ${params.personalityTraits.join(", ")}
- Special power: ${params.specialPower}
- Main color: ${params.mainColor}
- Visual mood: ${params.visualMood}
Style requirements: soft children’s picture book illustration, warm, friendly, non-scary, simple recognizable silhouette, expressive face, suitable for ages 1-8, full body character design, clean background, character sheet style, consistent design details.
  `.trim();
}

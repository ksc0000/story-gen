import { CompanionSpecies } from "@/lib/types";

export const SPECIES_OPTIONS: { value: CompanionSpecies; label: string; emoji: string; en: string; imageUrl?: string }[] = [
  { value: "dog", label: "いぬ", emoji: "🐕", en: "dog", imageUrl: "https://firebasestorage.googleapis.com/v0/b/story-gen-8a769.firebasestorage.app/o/companion-species-previews%2Fdog.png?alt=media&token=0c215725-a15f-4073-bb83-2e1d75714f64" },
  { value: "cat", label: "ねこ", emoji: "🐱", en: "cat", imageUrl: "https://firebasestorage.googleapis.com/v0/b/story-gen-8a769.firebasestorage.app/o/companion-species-previews%2Fcat.png?alt=media&token=244440cc-f5a5-43e5-94fe-398583764e5f" },
  { value: "rabbit", label: "うさぎ", emoji: "🐰", en: "rabbit", imageUrl: "https://firebasestorage.googleapis.com/v0/b/story-gen-8a769.firebasestorage.app/o/companion-species-previews%2Frabbit.png?alt=media&token=999d3a21-97f5-43b0-853e-be374afb2445" },
  { value: "bear", label: "くま", emoji: "🐻", en: "bear", imageUrl: "https://firebasestorage.googleapis.com/v0/b/story-gen-8a769.firebasestorage.app/o/companion-species-previews%2Fbear.png?alt=media&token=d472c128-d41f-4ffb-a874-90284a3ca7e9" },
  { value: "fox", label: "きつね", emoji: "🦊", en: "fox", imageUrl: "https://firebasestorage.googleapis.com/v0/b/story-gen-8a769.firebasestorage.app/o/companion-species-previews%2Ffox.png?alt=media&token=3ee4b862-ad08-4d31-9e77-19adc7486c59" },
  { value: "dragon", label: "ドラゴン", emoji: "🐲", en: "dragon", imageUrl: "https://firebasestorage.googleapis.com/v0/b/story-gen-8a769.firebasestorage.app/o/companion-species-previews%2Fdragon.png?alt=media&token=7ddc6588-0c71-459a-a69e-2d4658f3e085" },
  { value: "robot", label: "ロボット", emoji: "🤖", en: "robot", imageUrl: "https://firebasestorage.googleapis.com/v0/b/story-gen-8a769.firebasestorage.app/o/companion-species-previews%2Frobot.png?alt=media&token=53af660c-7440-4ea7-a01d-c8bf26e9e87f" },
  { value: "fairy", label: "妖精", emoji: "🧚", en: "fairy", imageUrl: "https://firebasestorage.googleapis.com/v0/b/story-gen-8a769.firebasestorage.app/o/companion-species-previews%2Ffairy.png?alt=media&token=f2d279b8-ee8d-4644-af9d-715035aff571" },
  { value: "unicorn", label: "ユニコーン", emoji: "🦄", en: "unicorn", imageUrl: "https://firebasestorage.googleapis.com/v0/b/story-gen-8a769.firebasestorage.app/o/companion-species-previews%2Funicorn.png?alt=media&token=3235f0cc-361f-418e-a583-d64372bb06a0" },
  { value: "monster", label: "モンスター", emoji: "👾", en: "monster", imageUrl: "https://firebasestorage.googleapis.com/v0/b/story-gen-8a769.firebasestorage.app/o/companion-species-previews%2Fmonster.png?alt=media&token=29b43156-ec5c-441e-a352-fdeed6826a1f" },
];

export const PERSONALITY_OPTIONS: { value: string; label: string; en: string }[] = [
  { value: "energetic", label: "元気いっぱい", en: "energetic" },
  { value: "relaxed", label: "のんびり", en: "relaxed" },
  { value: "mischievous", label: "いたずら好き", en: "mischievous" },
  { value: "knowledgeable", label: "知識たっぷり", en: "knowledgeable" },
  { value: "brave", label: "勇敢", en: "brave" },
  { value: "gentle", label: "やさしい", en: "gentle" },
];

export const ABILITY_OPTIONS: { value: string; label: string; en: string }[] = [
  { value: "fly", label: "空を飛べる", en: "the ability to fly" },
  { value: "magic", label: "魔法が使える", en: "the ability to use magic" },
  { value: "run_fast", label: "速く走れる", en: "the ability to run very fast" },
  { value: "swim", label: "水の中が得意", en: "the ability to swim well" },
  { value: "cook", label: "料理が得意", en: "the ability to cook delicious food" },
  { value: "sing", label: "歌が上手", en: "the ability to sing beautifully" },
];

export const COLOR_OPTIONS: { value: string; label: string; hex: string; en: string }[] = [
  { value: "white", label: "白", hex: "#FFFFFF", en: "white" },
  { value: "cream", label: "クリーム", hex: "#FFFDD0", en: "cream-colored" },
  { value: "orange", label: "オレンジ", hex: "#FFA500", en: "orange" },
  { value: "brown", label: "茶", hex: "#8B4513", en: "brown" },
  { value: "gray", label: "グレー", hex: "#808080", en: "gray" },
  { value: "black", label: "黒", hex: "#000000", en: "black" },
  { value: "pink", label: "ピンク", hex: "#FFC0CB", en: "pink" },
  { value: "light_blue", label: "水色", hex: "#ADD8E6", en: "light blue" },
  { value: "green", label: "緑", hex: "#008000", en: "green" },
  { value: "purple", label: "紫", hex: "#800080", en: "purple" },
];

export const SIZE_OPTIONS: { value: "small" | "medium" | "large"; label: string; en: string }[] = [
  { value: "small", label: "小さい", en: "small" },
  { value: "medium", label: "ふつう", en: "medium-sized" },
  { value: "large", label: "大きい", en: "large" },
];

export const BODY_TYPE_OPTIONS: { value: string; label: string; en: string }[] = [
  { value: "slim", label: "スリム", en: "slim" },
  { value: "average", label: "ふつう", en: "average-built" },
  { value: "chubby", label: "まるまる", en: "chubby" },
  { value: "tall", label: "ひょろっと長い", en: "tall and slender" },
  { value: "tiny", label: "ちびっこ", en: "tiny and petite" },
];

export const COLOR_DEPTH_OPTIONS: { value: string; label: string; en: string }[] = [
  { value: "light", label: "薄い", en: "light-toned" },
  { value: "medium", label: "ふつう", en: "medium-toned" },
  { value: "deep", label: "濃い", en: "deeply-colored" },
  { value: "dark", label: "暗い", en: "dark-toned" },
  { value: "pastel", label: "パステル", en: "pastel-toned" },
];

/** 体の模様（単一選択）。en が空文字のものは説明に含めない（＝無地）。 */
export const PATTERN_OPTIONS: { value: string; label: string; emoji: string; en: string; imageUrl?: string }[] = [
  { value: "plain", label: "むじ", emoji: "⬜", en: "", imageUrl: "/images/companions/patterns/plain.png" },
  { value: "spotted", label: "水玉", emoji: "🔵", en: "with playful round polka-dot spots", imageUrl: "/images/companions/patterns/spotted.png" },
  { value: "striped", label: "しま", emoji: "🦓", en: "with soft stripes", imageUrl: "/images/companions/patterns/striped.png" },
  { value: "patched", label: "ぶち", emoji: "🐄", en: "with patches of two-tone color", imageUrl: "/images/companions/patterns/patched.png" },
  { value: "star", label: "星", emoji: "⭐", en: "with little star-shaped markings", imageUrl: "/images/companions/patterns/star.png" },
  { value: "heart", label: "ハート", emoji: "💖", en: "with small heart-shaped markings", imageUrl: "/images/companions/patterns/heart.png" },
  { value: "swirl", label: "うずまき", emoji: "🌀", en: "with gentle swirl patterns", imageUrl: "/images/companions/patterns/swirl.png" },
  { value: "gradient", label: "グラデ", emoji: "🌈", en: "with a soft gradient-colored coat", imageUrl: "/images/companions/patterns/gradient.png" },
];

/** 身につけるアクセサリ（複数選択・最大2つ）。 */
export const ACCESSORY_OPTIONS: { value: string; label: string; emoji: string; en: string }[] = [
  { value: "ribbon", label: "リボン", emoji: "🎀", en: "a cute ribbon" },
  { value: "hat", label: "ぼうし", emoji: "🎩", en: "a little hat" },
  { value: "scarf", label: "マフラー", emoji: "🧣", en: "a cozy scarf" },
  { value: "glasses", label: "めがね", emoji: "👓", en: "round glasses" },
  { value: "backpack", label: "リュック", emoji: "🎒", en: "a tiny backpack" },
  { value: "cape", label: "マント", emoji: "🦸", en: "a small flowing cape" },
  { value: "flower", label: "おはな", emoji: "🌸", en: "a flower accessory" },
  { value: "bell", label: "すず", emoji: "🔔", en: "a jingling bell collar" },
];

export interface CompanionPreset {
  id: string;
  defaultName: string;
  tagline: string;
  species: CompanionSpecies;
  personality: string[];
  ability: string;
  color: string;
  bodyType: string;
  colorDepth: string;
  size: "small" | "medium" | "large";
  pattern: string;
  accessories: string[];
}

export const COMPANION_PRESETS: CompanionPreset[] = [
  {
    id: "preset_rabbit",
    defaultName: "もこ",
    tagline: "ふわふわのやさしいうさぎ",
    species: "rabbit",
    personality: ["gentle", "relaxed"],
    ability: "magic",
    color: "white",
    bodyType: "chubby",
    colorDepth: "light",
    size: "small",
    pattern: "plain",
    accessories: ["ribbon"],
  },
  {
    id: "preset_cat",
    defaultName: "クロ",
    tagline: "クールないたずらねこ",
    species: "cat",
    personality: ["mischievous", "energetic"],
    ability: "run_fast",
    color: "black",
    bodyType: "slim",
    colorDepth: "deep",
    size: "medium",
    pattern: "plain",
    accessories: [],
  },
  {
    id: "preset_dog",
    defaultName: "ポチ",
    tagline: "元気いっぱいのわんこ",
    species: "dog",
    personality: ["energetic", "brave"],
    ability: "run_fast",
    color: "brown",
    bodyType: "chubby",
    colorDepth: "medium",
    size: "medium",
    pattern: "spotted",
    accessories: [],
  },
  {
    id: "preset_bear",
    defaultName: "チョコ",
    tagline: "のんびりおりょうりくま",
    species: "bear",
    personality: ["relaxed", "gentle"],
    ability: "cook",
    color: "brown",
    bodyType: "chubby",
    colorDepth: "medium",
    size: "large",
    pattern: "plain",
    accessories: ["hat"],
  },
  {
    id: "preset_fox",
    defaultName: "コン",
    tagline: "かしこいオレンジきつね",
    species: "fox",
    personality: ["knowledgeable", "mischievous"],
    ability: "magic",
    color: "orange",
    bodyType: "slim",
    colorDepth: "medium",
    size: "medium",
    pattern: "striped",
    accessories: [],
  },
  {
    id: "preset_dragon",
    defaultName: "ドラ",
    tagline: "そらをとぶちびドラゴン",
    species: "dragon",
    personality: ["brave", "energetic"],
    ability: "fly",
    color: "green",
    bodyType: "average",
    colorDepth: "medium",
    size: "medium",
    pattern: "plain",
    accessories: [],
  },
  {
    id: "preset_robot",
    defaultName: "ロボ",
    tagline: "なんでもしってるロボット",
    species: "robot",
    personality: ["knowledgeable", "gentle"],
    ability: "run_fast",
    color: "light_blue",
    bodyType: "slim",
    colorDepth: "medium",
    size: "small",
    pattern: "plain",
    accessories: ["glasses"],
  },
  {
    id: "preset_fairy",
    defaultName: "ティン",
    tagline: "空とぶちいさな妖精",
    species: "fairy",
    personality: ["gentle", "energetic"],
    ability: "fly",
    color: "pink",
    bodyType: "tiny",
    colorDepth: "pastel",
    size: "small",
    pattern: "star",
    accessories: ["flower"],
  },
  {
    id: "preset_unicorn",
    defaultName: "ヒカル",
    tagline: "にじいろに光るユニコーン",
    species: "unicorn",
    personality: ["gentle", "brave"],
    ability: "magic",
    color: "white",
    bodyType: "slim",
    colorDepth: "light",
    size: "large",
    pattern: "gradient",
    accessories: [],
  },
  {
    id: "preset_monster",
    defaultName: "ブルー",
    tagline: "うたがうまいもふもふモンスター",
    species: "monster",
    personality: ["energetic", "gentle"],
    ability: "sing",
    color: "light_blue",
    bodyType: "chubby",
    colorDepth: "medium",
    size: "medium",
    pattern: "plain",
    accessories: ["bell"],
  },
];

export function buildVisualDescription(params: {
  species: CompanionSpecies;
  personalities: string[];
  ability: string;
  color: string;
  size: "small" | "medium" | "large";
  bodyType?: string;
  colorDepth?: string;
  pattern?: string;
  accessories?: string[];
}): string {
  const sizeEn = SIZE_OPTIONS.find((o) => o.value === params.size)?.en || "medium-sized";
  const bodyTypeEn = params.bodyType
    ? BODY_TYPE_OPTIONS.find((o) => o.value === params.bodyType)?.en || ""
    : "";
  const colorDepthEn = params.colorDepth
    ? COLOR_DEPTH_OPTIONS.find((o) => o.value === params.colorDepth)?.en || ""
    : "";
  const colorEn = COLOR_OPTIONS.find((o) => o.value === params.color)?.en || "colorful";
  const speciesEn = SPECIES_OPTIONS.find((o) => o.value === params.species)?.en || "creature";
  const personalitiesEn = params.personalities
    .map((p) => PERSONALITY_OPTIONS.find((o) => o.value === p)?.en)
    .filter(Boolean)
    .join(" and ");
  const abilityEn = ABILITY_OPTIONS.find((o) => o.value === params.ability)?.en || "some special talents";
  const patternEn = params.pattern
    ? PATTERN_OPTIONS.find((o) => o.value === params.pattern)?.en || ""
    : "";
  const accessoriesEn = (params.accessories ?? [])
    .map((a) => ACCESSORY_OPTIONS.find((o) => o.value === a)?.en)
    .filter(Boolean)
    .join(" and ");

  const patternPart = patternEn; // already phrased as "with ..."
  const accessoryPart = accessoriesEn ? `wearing ${accessoriesEn}` : "";
  const personalityPart = personalitiesEn ? `with a ${personalitiesEn} personality` : "";
  const abilityPart = abilityEn ? `who has ${abilityEn}` : "";

  const appearanceBase = [sizeEn, bodyTypeEn, colorDepthEn, colorEn]
    .filter(Boolean)
    .join(", ");

  const parts = [
    `A ${appearanceBase} ${speciesEn}`,
    patternPart,
    accessoryPart,
    personalityPart,
    abilityPart,
  ].filter(Boolean);

  return parts.join(" ").replace(/\s+/g, " ").trim() + ".";
}

export function getSpeciesEmoji(species: CompanionSpecies): string {
  return SPECIES_OPTIONS.find((o) => o.value === species)?.emoji || "🐾";
}

export function getSpeciesLabel(species: CompanionSpecies): string {
  return SPECIES_OPTIONS.find((o) => o.value === species)?.label || "不明";
}

export function getPersonalityLabels(personalities: string[]): string[] {
  return personalities
    .map((p) => PERSONALITY_OPTIONS.find((o) => o.value === p)?.label)
    .filter((l): l is string => !!l);
}

export function getAbilityLabel(ability: string | undefined): string {
  if (!ability) return "ひみつ";
  return ABILITY_OPTIONS.find((o) => o.value === ability)?.label ?? ability;
}

/**
 * 色の日本語ラベルを返す。colorMain は HEX（例: #000000）で保存されているため
 * value と hex の両方で照合する。見つからない場合は生の値（#000000 等）を
 * ユーザーに見せないよう空文字を返す。
 */
export function getColorLabel(color: string | undefined): string {
  if (!color) return "";
  const normalized = color.toLowerCase();
  return (
    COLOR_OPTIONS.find(
      (o) => o.value === color || o.hex.toLowerCase() === normalized
    )?.label ?? ""
  );
}

export function getColorDepthLabel(colorDepth: string | undefined): string {
  if (!colorDepth) return "";
  return COLOR_DEPTH_OPTIONS.find((o) => o.value === colorDepth)?.label ?? "";
}

export function getBodyTypeLabel(bodyType: string | undefined): string {
  if (!bodyType) return "";
  return BODY_TYPE_OPTIONS.find((o) => o.value === bodyType)?.label ?? "";
}

export function getSizeLabel(size: string | undefined): string {
  if (!size) return "";
  return SIZE_OPTIONS.find((o) => o.value === size)?.label ?? "";
}

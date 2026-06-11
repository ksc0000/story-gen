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

export function buildVisualDescription(params: {
  species: CompanionSpecies;
  personalities: string[];
  ability: string;
  color: string;
  size: "small" | "medium" | "large";
}): string {
  const sizeEn = SIZE_OPTIONS.find((o) => o.value === params.size)?.en || "medium-sized";
  const colorEn = COLOR_OPTIONS.find((o) => o.value === params.color)?.en || "colorful";
  const speciesEn = SPECIES_OPTIONS.find((o) => o.value === params.species)?.en || "creature";
  const personalitiesEn = params.personalities
    .map((p) => PERSONALITY_OPTIONS.find((o) => o.value === p)?.en)
    .filter(Boolean)
    .join(" and ");
  const abilityEn = ABILITY_OPTIONS.find((o) => o.value === params.ability)?.en || "some special talents";

  const personalityPart = personalitiesEn ? `with a ${personalitiesEn} personality` : "";
  const abilityPart = abilityEn ? `who has ${abilityEn}` : "";

  const parts = [`A ${sizeEn}, ${colorEn} ${speciesEn}`, personalityPart, abilityPart].filter(Boolean);

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

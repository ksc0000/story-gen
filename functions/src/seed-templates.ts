import { onCall } from "firebase-functions/v2/https";
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import type { CategoryGroupData, TemplateData, FixedStoryPageTemplate, PageVisualRole } from "./lib/types";

if (getApps().length === 0) initializeApp();
const db = getFirestore();

const FIXED_IMAGE_PROMPT_STANDARD_SUFFIX =
  "no readable writing anywhere, no signage, no storefront signs, no labels, no posters, no banners, no text-like marks, no text, no letters, no Japanese characters, no logo, no watermark, no typography, no brand names, no inscriptions, no graffiti, no word-like marks";

const FIXED_IMAGE_PROMPT_REF_ISOLATION_SUFFIX =
  "use the reference image ONLY for the child character's face, hairstyle, outfit, age, and body proportions; do NOT copy the reference image background, location, pose, sandbox, playground, lighting, camera angle, or composition; place the child naturally into the scene described here, NOT a sandbox, NOT a playground";

function withFixedImagePromptSafety(prompt: string): string {
  let result = prompt;
  if (!result.includes(FIXED_IMAGE_PROMPT_STANDARD_SUFFIX)) {
    result = `${result}, ${FIXED_IMAGE_PROMPT_STANDARD_SUFFIX}`;
  }
  if (!result.includes(FIXED_IMAGE_PROMPT_REF_ISOLATION_SUFFIX)) {
    result = `${result}, ${FIXED_IMAGE_PROMPT_REF_ISOLATION_SUFFIX}`;
  }
  return result;
}

const BRUSH_TEETH_CHARACTER_ANCHOR_CLAUSE =
  "keep the same preschool child across all pages: same short black bob hair, same mint-green long-sleeve pajamas, same round face proportions, same age impression around 4-5 years old, and consistent gentle picture-book facial features";

const BRUSH_TEETH_OBJECT_NO_TEXT_CLAUSE =
  "bathroom objects must be plain and unlabeled: use solid-color cups, bottles, tubes, and shelf containers with no brand marks, no labels, no stickers, no icon-like glyphs, and no decorative text-like patterns on mirror, shelf, tiles, or packaging";

function withBrushTeethImagePromptGuardrail(prompt: string): string {
  let result = prompt;
  if (!result.includes(BRUSH_TEETH_CHARACTER_ANCHOR_CLAUSE)) {
    result = `${result}, ${BRUSH_TEETH_CHARACTER_ANCHOR_CLAUSE}`;
  }
  if (!result.includes(BRUSH_TEETH_OBJECT_NO_TEXT_CLAUSE)) {
    result = `${result}, ${BRUSH_TEETH_OBJECT_NO_TEXT_CLAUSE}`;
  }
  return withFixedImagePromptSafety(result);
}

const LITTLE_HELPER_OBJECT_NO_TEXT_CLAUSE =
  "household objects must be plain and unmarked: use solid-color baskets, towels, containers, and kitchen items with no brand marks, no labels, no stickers, no printed patterns, and no decorative text-like marks on any surface";

const LITTLE_HELPER_CHARACTER_ANCHOR_CLAUSE =
  "keep the same preschool child across all pages: same face and hair, wearing a consistent simple indoor outfit suitable for helping around the house";

function withLittleHelperImagePromptGuardrail(prompt: string): string {
  let result = prompt;
  if (!result.includes(LITTLE_HELPER_CHARACTER_ANCHOR_CLAUSE)) {
    result = `${result}, ${LITTLE_HELPER_CHARACTER_ANCHOR_CLAUSE}`;
  }
  if (!result.includes(LITTLE_HELPER_OBJECT_NO_TEXT_CLAUSE)) {
    result = `${result}, ${LITTLE_HELPER_OBJECT_NO_TEXT_CLAUSE}`;
  }
  return withFixedImagePromptSafety(result);
}

const THANK_YOU_GRANDPARENT_PROP_NO_TEXT_CLAUSE =
  "no text, letters, or symbols on any photo album, greeting card, garden sign, plant marker, or wall art; all gifts and household items must be plain or use simple decorative motifs with no readable writing or pseudo-script";

function withThankYouGrandparentImagePromptGuardrail(prompt: string): string {
  let result = prompt;
  if (!result.includes(THANK_YOU_GRANDPARENT_PROP_NO_TEXT_CLAUSE)) {
    result = `${result}, ${THANK_YOU_GRANDPARENT_PROP_NO_TEXT_CLAUSE}`;
  }
  return withFixedImagePromptSafety(result);
}

const ZOO_CHARACTER_ANCHOR_CLAUSE =
  "keep the same child across all pages: same outfit color and style, same round face proportions, same age impression around {childAge} years old, and consistent gentle picture-book facial features; preserve hairstyle and face between pages";

const ZOO_NO_SIGN_TEXT_CLAUSE =
  "all background signs, boards, posters, banners, and notices are plain-colored shapes with no glyphs or letters, no readable text of any kind";

const ZOO_NO_CLOTHING_TEXT_CLAUSE =
  "clothing and wearable accessories have no visible print, logo, badge text, letters, numbers, mascot word marks, slogan graphics, patches, or readable marks of any kind";

const ZOO_NO_PRINTED_SURFACES_CLAUSE =
  "zoo scene structures stay natural and unmarked: no entrance signs, no zoo name boards, no map boards, no ticket boards, no information panels, no directional markers, no exit markers, no facility placards, no enclosure labels, no labels, no posters, no warning notices, no posted notices, no hanging banners, and no printed gate or building surfaces";

function withZooImagePromptGuardrail(
  prompt: string,
  options?: { signText?: boolean; clothingText?: boolean }
): string {
  let result = prompt;
  if (options?.signText && !result.includes(ZOO_NO_SIGN_TEXT_CLAUSE)) {
    result = `${result}, ${ZOO_NO_SIGN_TEXT_CLAUSE}`;
  }

const BEDTIME_GOOD_DAY_CHARACTER_ANCHOR_CLAUSE =
  "keep the same preschool child across all pages: same round face, same short black hair, same soft yellow pajamas with a small simple duckling pattern, same white rabbit plush toy, do not change the child's appearance, do not change the pajamas, do not swap the rabbit for a different animal";

function withBedtimeGoodDayImagePromptGuardrail(prompt: string): string {
  let result = prompt;
  if (!result.includes(BEDTIME_GOOD_DAY_CHARACTER_ANCHOR_CLAUSE)) {
    result = \;
  }
  return withFixedImagePromptSafety(result);
}

const CHRISTMAS_CHARACTER_ANCHOR_CLAUSE =
  "keep the same child across all pages: same face, same hair color and style, same cozy red Christmas sweater with a small white snowflake pattern, same green trousers, do not change the child's age or outfit between pages";

const CHRISTMAS_DECOR_NO_TEXT_CLAUSE =
  "all Christmas decorations must be plain and unmarked: use solid-color ornaments, ribbons, stockings, and gift boxes with no letters, no names, no labels, no printed 'Merry Christmas' text, and no pseudo-script on any surface";

function withChristmasImagePromptGuardrail(prompt: string): string {
  let result = prompt;
  if (!result.includes(CHRISTMAS_CHARACTER_ANCHOR_CLAUSE)) {
    result = \;
  }
  if (!result.includes(CHRISTMAS_DECOR_NO_TEXT_CLAUSE)) {
    result = \;
  }
  return withFixedImagePromptSafety(result);
}


const BEDTIME_GOOD_DAY_CHARACTER_ANCHOR_CLAUSE =
  "keep the same preschool child across all pages: same round face, same short black hair, same soft yellow pajamas with a small simple duckling pattern, same white rabbit plush toy, do not change the child's appearance, do not change the pajamas, do not swap the rabbit for a different animal";

function withBedtimeGoodDayImagePromptGuardrail(prompt: string): string {
  let result = prompt;
  if (!result.includes(BEDTIME_GOOD_DAY_CHARACTER_ANCHOR_CLAUSE)) {
    result = result + ', ' + BEDTIME_GOOD_DAY_CHARACTER_ANCHOR_CLAUSE;
  }
  return withFixedImagePromptSafety(result);
}

const CHRISTMAS_CHARACTER_ANCHOR_CLAUSE =
  "keep the same child across all pages: same face, same hair color and style, same cozy red Christmas sweater with a small white snowflake pattern, same green trousers, do not change the child's age or outfit between pages";

const CHRISTMAS_DECOR_NO_TEXT_CLAUSE =
  "all Christmas decorations must be plain and unmarked: use solid-color ornaments, ribbons, stockings, and gift boxes with no letters, no names, no labels, no printed 'Merry Christmas' text, and no pseudo-script on any surface";

function withChristmasImagePromptGuardrail(prompt: string): string {
  let result = prompt;
  if (!result.includes(CHRISTMAS_CHARACTER_ANCHOR_CLAUSE)) {
    result = result + ', ' + CHRISTMAS_CHARACTER_ANCHOR_CLAUSE;
  }
  if (!result.includes(CHRISTMAS_DECOR_NO_TEXT_CLAUSE)) {
    result = result + ', ' + CHRISTMAS_DECOR_NO_TEXT_CLAUSE;
  }
  return withFixedImagePromptSafety(result);
}


const BEDTIME_GOOD_DAY_CHARACTER_ANCHOR_CLAUSE =
  "keep the same preschool child across all pages: same round face, same short black hair, same soft yellow pajamas with a small simple duckling pattern, same white rabbit plush toy, do not change the child's appearance, do not change the pajamas, do not swap the rabbit for a different animal";

function withBedtimeGoodDayImagePromptGuardrail(prompt: string): string {
  let result = prompt;
  if (!result.includes(BEDTIME_GOOD_DAY_CHARACTER_ANCHOR_CLAUSE)) {
    result = \;
  }
  return withFixedImagePromptSafety(result);
}

const CHRISTMAS_CHARACTER_ANCHOR_CLAUSE =
  "keep the same child across all pages: same face, same hair color and style, same cozy red Christmas sweater with a small white snowflake pattern, same green trousers, do not change the child's age or outfit between pages";

const CHRISTMAS_DECOR_NO_TEXT_CLAUSE =
  "all Christmas decorations must be plain and unmarked: use solid-color ornaments, ribbons, stockings, and gift boxes with no letters, no names, no labels, no printed 'Merry Christmas' text, and no pseudo-script on any surface";

function withChristmasImagePromptGuardrail(prompt: string): string {
  let result = prompt;
  if (!result.includes(CHRISTMAS_CHARACTER_ANCHOR_CLAUSE)) {
    result = \;
  }
  if (!result.includes(CHRISTMAS_DECOR_NO_TEXT_CLAUSE)) {
    result = \;
  }
  return withFixedImagePromptSafety(result);
}

  if (options?.signText && !result.includes(ZOO_NO_PRINTED_SURFACES_CLAUSE)) {
    result = `${result}, ${ZOO_NO_PRINTED_SURFACES_CLAUSE}`;
  }
  if (options?.clothingText && !result.includes(ZOO_NO_CLOTHING_TEXT_CLAUSE)) {
    result = `${result}, ${ZOO_NO_CLOTHING_TEXT_CLAUSE}`;
  }
  if (!result.includes(ZOO_CHARACTER_ANCHOR_CLAUSE)) {
    result = `${result}, ${ZOO_CHARACTER_ANCHOR_CLAUSE}`;
  }
  return withFixedImagePromptSafety(result);
}

const BEDTIME_GOOD_DAY_CHARACTER_ANCHOR_CLAUSE =
  "keep the same preschool child across all pages: same round face, same short black hair, same soft yellow pajamas with a small simple duckling pattern, same white rabbit plush toy, do not change the child's appearance, do not change the pajamas, do not swap the rabbit for a different animal";

function withBedtimeGoodDayImagePromptGuardrail(prompt: string): string {
  let result = prompt;
  if (!result.includes(BEDTIME_GOOD_DAY_CHARACTER_ANCHOR_CLAUSE)) {
    result = `${result}, ${BEDTIME_GOOD_DAY_CHARACTER_ANCHOR_CLAUSE}`;
  }
  return withFixedImagePromptSafety(result);
}

const CHRISTMAS_CHARACTER_ANCHOR_CLAUSE =
  "keep the same child across all pages: same face, same hair color and style, same cozy red Christmas sweater with a small white snowflake pattern, same green trousers, do not change the child's age or outfit between pages";

const CHRISTMAS_DECOR_NO_TEXT_CLAUSE =
  "all Christmas decorations must be plain and unmarked: use solid-color ornaments, ribbons, stockings, and gift boxes with no letters, no names, no labels, no printed 'Merry Christmas' text, and no pseudo-script on any surface";

function withChristmasImagePromptGuardrail(prompt: string): string {
  let result = prompt;
  if (!result.includes(CHRISTMAS_CHARACTER_ANCHOR_CLAUSE)) {
    result = `${result}, ${CHRISTMAS_CHARACTER_ANCHOR_CLAUSE}`;
  }
  if (!result.includes(CHRISTMAS_DECOR_NO_TEXT_CLAUSE)) {
    result = `${result}, ${CHRISTMAS_DECOR_NO_TEXT_CLAUSE}`;
  }
  return withFixedImagePromptSafety(result);
}

const SHARING_FRIENDS_CHARACTER_ANCHOR_CLAUSE =
  "keep the same two preschool children across all pages: the protagonist and their friend, both with consistent hair and simple playroom outfits, maintaining their distinct facial features and relative heights between pages";

const SHARING_FRIENDS_PROP_NO_TEXT_CLAUSE =
  "all playroom toys, blocks, and books must be plain and unmarked: use solid-color surfaces with no letters, no numbers, no labels, no printed graphics, and no pseudo-script on any object or container";

function withSharingFriendsImagePromptGuardrail(prompt: string): string {
  let result = prompt;
  if (!result.includes(SHARING_FRIENDS_CHARACTER_ANCHOR_CLAUSE)) {
    result = `${result}, ${SHARING_FRIENDS_CHARACTER_ANCHOR_CLAUSE}`;
  }
  if (!result.includes(SHARING_FRIENDS_PROP_NO_TEXT_CLAUSE)) {
    result = `${result}, ${SHARING_FRIENDS_PROP_NO_TEXT_CLAUSE}`;
  }
  return withFixedImagePromptSafety(result);
}

const CARDBOARD_ROCKET_CHARACTER_ANCHOR_CLAUSE =
  "keep the same preschool child across all pages: same hair and simple indoor outfit, beside a consistent handmade cardboard rocket with a large blue star on the side and a few hand-drawn buttons";

function withCardboardRocketImagePromptGuardrail(prompt: string): string {
  let result = prompt;
  if (!result.includes(CARDBOARD_ROCKET_CHARACTER_ANCHOR_CLAUSE)) {
    result = `${result}, ${CARDBOARD_ROCKET_CHARACTER_ANCHOR_CLAUSE}`;
  }
  return withFixedImagePromptSafety(result);
}

const RAINY_DAY_CHARACTER_ANCHOR_CLAUSE =
  "keep the same child across all pages: same face and hair, wearing a consistent bright yellow raincoat and matching rain boots, holding a small plain blue umbrella";

function withRainyDayImagePromptGuardrail(prompt: string): string {
  let result = prompt;
  if (!result.includes(RAINY_DAY_CHARACTER_ANCHOR_CLAUSE)) {
    result = `${result}, ${RAINY_DAY_CHARACTER_ANCHOR_CLAUSE}`;
  }
  return withFixedImagePromptSafety(result);
}

const BIRTHDAY_8P_CHARACTER_ANCHOR_CLAUSE =
  "keep the same child across all 8 pages: same face, same age impression, same hair color and length, same clothing style and palette, do not change the child's age, outfit, or facial features between pages";

const BIRTHDAY_8P_DECOR_NO_TEXT_CLAUSE =
  "no text, letters, numbers, symbols, or readable marks on any balloon surface, ribbon, garland, streamer, cake, candle, labels, posters, banners, tableware edge, plate trim, keepsake, blank invitation-like card, plain table setting, or gift-like object, all party decor surfaces must be plain color or simple pattern only with no pseudo-writing, no tag-like ornamentation, and no emblem-like detail";

/**
 * Birthday-8p template-local prompt guardrail wrapper.
 * Composes the shared fixed-image-prompt safety layer with
 * birthday-specific BF-4 (decor/object no-text) and BF-3
 * (character continuity anchor) clauses.
 *
 * Do NOT modify withFixedImagePromptSafety. Do NOT use for
 * any template other than fixed-first-birthday-8p.
 */
function withBirthdayImagePromptGuardrail(prompt: string): string {
  let result = prompt;
  if (!result.includes(BIRTHDAY_8P_DECOR_NO_TEXT_CLAUSE)) {
    result = `${result}, ${BIRTHDAY_8P_DECOR_NO_TEXT_CLAUSE}`;
  }
  if (!result.includes(BIRTHDAY_8P_CHARACTER_ANCHOR_CLAUSE)) {
    result = `${result}, ${BIRTHDAY_8P_CHARACTER_ANCHOR_CLAUSE}`;
  }
  return withFixedImagePromptSafety(result);
}

const SLEEPY_MOON_8P_CHARACTER_ANCHOR_CLAUSE =
  "keep the exact same preschool-age child across all 8 pages: same round face, same short dark-brown bob haircut with a straight silhouette, same age impression, same pale blue pajamas with a tiny simple star pattern, same small tan teddy bear plush visible wherever the child is physically present, do not change the child, do not change the haircut, do not swap the pajamas, do not replace the teddy bear with a different plush animal, pillow toy, or cloud toy";

const SLEEPY_MOON_8P_DREAM_NO_TEXT_CLAUSE =
  "dream and imagination symbols are soft glowing points and thin curved cloud wisps only, never speech bubbles, never thought bubbles, never text balloons, never caption clouds, never message clouds, never writing panels, no floating framed areas for words or symbols, no connecting lines, no symbol arrangement, no constellation-map patterns, no arrows, no letter-like shapes, no glyph-like forms";

const SLEEPY_MOON_8P_ENDING_NO_BUBBLE_CLAUSE =
  "final bedtime scene is visual-only, no speech bubble, no thought cloud, no dream caption area, no writing in the air, stars only as scattered tiny glowing points and one gentle curved wisp, never arranged symbols";

const SLEEPY_MOON_8P_ROOM_PROP_NO_PRINT_CLAUSE =
  "background bedroom props stay plain and simplified, no readable book covers, no spine writing, no labels, no posters, no banners, no paper items with visible writing, no nursery cards, no word-bearing wall art, no packaging graphics, shelf objects stay plain and non-readable";

function withSleepyMoon8pImagePromptGuardrail(prompt: string): string {
  let result = prompt;
  if (!result.includes(SLEEPY_MOON_8P_DREAM_NO_TEXT_CLAUSE)) {
    result = `${result}, ${SLEEPY_MOON_8P_DREAM_NO_TEXT_CLAUSE}`;
  }
  if (!result.includes(SLEEPY_MOON_8P_CHARACTER_ANCHOR_CLAUSE)) {
    result = `${result}, ${SLEEPY_MOON_8P_CHARACTER_ANCHOR_CLAUSE}`;
  }
  return withFixedImagePromptSafety(result);
}

function withSleepyMoon8pRoomPropGuardrail(prompt: string): string {
  let result = prompt;
  if (!result.includes(SLEEPY_MOON_8P_ROOM_PROP_NO_PRINT_CLAUSE)) {
    result = `${result}, ${SLEEPY_MOON_8P_ROOM_PROP_NO_PRINT_CLAUSE}`;
  }
  return withSleepyMoon8pImagePromptGuardrail(result);
}

const BEDTIME_GOOD_DAY_8P_CHARACTER_ANCHOR_CLAUSE =
  "keep the same preschool child across all 8 pages: same round face, same short black hair, same soft yellow pajamas with a small simple duckling pattern, same white rabbit plush toy, do not change the child's appearance, do not change the pajamas, do not swap the rabbit for a different animal";

function withBedtimeGoodDay8pImagePromptGuardrail(prompt: string): string {
  let result = prompt;
  if (!result.includes(BEDTIME_GOOD_DAY_8P_CHARACTER_ANCHOR_CLAUSE)) {
    result = `${result}, ${BEDTIME_GOOD_DAY_8P_CHARACTER_ANCHOR_CLAUSE}`;
  }
  return withFixedImagePromptSafety(result);
}

const CARDBOARD_ROCKET_8P_CHARACTER_ANCHOR_CLAUSE =
  "keep the same child across all 8 pages: same messy dark hair, same bright red t-shirt, same cardboard rocket with a large blue star on the side, do not change the child's features, do not change the t-shirt, do not change the rocket's design";

function withCardboardRocket8pImagePromptGuardrail(prompt: string): string {
  let result = prompt;
  if (!result.includes(CARDBOARD_ROCKET_8P_CHARACTER_ANCHOR_CLAUSE)) {
    result = `${result}, ${CARDBOARD_ROCKET_8P_CHARACTER_ANCHOR_CLAUSE}`;
  }
  return withFixedImagePromptSafety(result);
}

const GRADUATION_DECOR_NO_TEXT_CLAUSE =
  "no text, letters, numbers, or symbols on any diploma, certificate, banner, poster, labels, posters, banners, garland, ribbon, school gate nameplate, or commemorative plaque; all ceremony decorations and plaques must be plain or use simple floral/geometric patterns with no readable characters or pseudo-writing";

function withGraduationImagePromptGuardrail(prompt: string): string {
  let result = prompt;
  if (!result.includes(GRADUATION_DECOR_NO_TEXT_CLAUSE)) {
    result = `${result}, ${GRADUATION_DECOR_NO_TEXT_CLAUSE}`;
  }
  return withFixedImagePromptSafety(result);
}

const NEW_BABY_PROP_NO_TEXT_CLAUSE =
  "no text, letters, or logo-like marks on the crib, bassinet, baby blanket, mobile, diapers, bottles, or nursery wall art; all baby items and furniture must be plain solid color or simple nursery patterns with no readable writing";

function withNewBabyImagePromptGuardrail(prompt: string): string {
  let result = prompt;
  if (!result.includes(NEW_BABY_PROP_NO_TEXT_CLAUSE)) {
    result = `${result}, ${NEW_BABY_PROP_NO_TEXT_CLAUSE}`;
  }
  return withFixedImagePromptSafety(result);
}

const FAREWELL_MOVING_NO_TEXT_CLAUSE =
  "no text, letters, numbers, or addresses on any cardboard boxes, shipping labels, labels, posters, banners, plain packing tape, or farewell banners; all boxes must remain unmarked cardboard, and all farewell signs and cards must be plain or use simple heart/star motifs with no readable writing or pseudo-script";

function withFarewellImagePromptGuardrail(prompt: string): string {
  let result = prompt;
  if (!result.includes(FAREWELL_MOVING_NO_TEXT_CLAUSE)) {
    result = `${result}, ${FAREWELL_MOVING_NO_TEXT_CLAUSE}`;
  }
  return withFixedImagePromptSafety(result);
}

function buildAgeSpecificPage(params: {
  textTemplate: string;
  imagePromptTemplate: string;
  pageVisualRole?: PageVisualRole;
  baby_toddler?: string;
  preschool_3_4?: string;
  early_reader_5_6?: string;
  early_elementary_7_8?: string;
  general_child?: string;
}): FixedStoryPageTemplate {
  // Filter out undefined values — Firestore rejects {key: undefined}
  const rawByAge = {
    baby_toddler: params.baby_toddler,
    preschool_3_4: params.preschool_3_4,
    early_reader_5_6: params.early_reader_5_6,
    early_elementary_7_8: params.early_elementary_7_8,
    general_child: params.general_child,
  };
  const textTemplatesByAge = Object.fromEntries(
    Object.entries(rawByAge).filter(([, v]) => v !== undefined)
  ) as Partial<typeof rawByAge>;

  const base: FixedStoryPageTemplate = {
    textTemplate: params.textTemplate,
    imagePromptTemplate: withFixedImagePromptSafety(params.imagePromptTemplate),
  };
  if (Object.keys(textTemplatesByAge).length > 0) {
    base.textTemplatesByAge = textTemplatesByAge as NonNullable<FixedStoryPageTemplate["textTemplatesByAge"]>;
  }
  if (params.pageVisualRole !== undefined) {
    base.pageVisualRole = params.pageVisualRole;
  }
  return base;
}

const categoryGroups: Record<string, CategoryGroupData> = {
  memories: {
    name: "思い出を残す",
    description: "この瞬間を忘れたくない日に",
    icon: "📷",
    parentIntent: "この瞬間を残したい",
    order: 1,
    active: true,
  },
  "growth-support": {
    name: "成長を応援",
    description: "できるようになってほしいことを、怒らず応援したい日に",
    icon: "🌱",
    parentIntent: "できるようになってほしい。でも怒らず応援したい",
    order: 2,
    active: true,
  },
  "emotional-growth": {
    name: "こころを育てる",
    description: "自信、勇気、やさしさを育てたい日に",
    icon: "⭐",
    parentIntent: "優しい子に育ってほしい。自信を持ってほしい",
    order: 3,
    active: true,
  },
  bedtime: {
    name: "寝る前に安心する",
    description: "今日も安心して眠ってほしい夜に",
    icon: "🌙",
    parentIntent: "今日も安心して眠ってほしい",
    order: 4,
    active: true,
  },
  "daily-life": {
    name: "毎日のくらし",
    description: "ふだんの日の小さな発見や気づきを楽しむ日に",
    icon: "☔",
    parentIntent: "毎日のくらしの中で前向きな気持ちを育てたい",
    order: 9,
    active: true,
  },
  "favorite-worlds": {
    name: "好きな世界に入る",
    description: "その子の好きなものを伸ばしたい日に",
    icon: "💛",
    parentIntent: "この子の好きなものを伸ばしたい",
    order: 5,
    active: true,
  },
  imagination: {
    name: "想像の世界で遊ぶ",
    description: "自由に想像してワクワクしてほしい日に",
    icon: "🪄",
    parentIntent: "自由に想像して、ワクワクしてほしい",
    order: 6,
    active: true,
  },
  learning: {
    name: "楽しく学ぶ",
    description: "勉強っぽくなく、自然に学んでほしい日に",
    icon: "🔤",
    parentIntent: "勉強っぽくなく、自然に学んでほしい",
    order: 7,
    active: true,
  },
  "seasonal-events": {
    name: "季節とイベント",
    description: "季節の体験を特別な思い出にしたい日に",
    icon: "🌸",
    parentIntent: "季節の体験を特別な思い出にしたい",
    order: 8,
    active: true,
  },
  "blank-templates": {
    name: "穴埋め絵本",
    description: "ひとことを入れるだけで、そのこだけのオリジナル絵本になる",
    icon: "✏️",
    parentIntent: "かんたんに、自分たちだけの絵本を作りたい",
    order: 10,
    active: true,
  },
};

export const SEED_TEMPLATES: Record<string, TemplateData> = {
  animals: {
    name: "どうぶつのおはなし",
    description: "ふわふわ動物たちと友だちになるやさしい物語",
    icon: "🐾",
    genre: "Animal",
    sampleImageUrl: "/images/templates/animals.webp",
    sampleImages: {
      light: "/images/samples/animals_light.webp",
      premium: "/images/samples/animals_premium.webp",
    },
    sampleImageAlt: "森の中でくま、うさぎ、きつね、小鳥が笑っている絵本表紙",
    visualDirection:
      "Soft woodland picture-book mood with fluffy friendly animals, warm sunlight, leafy greens, cream background, rounded character shapes, gentle smiling faces, and a cozy approachable cover-like composition.",
    order: 1,
    active: true,
    systemPrompt: `あなたは子ども向け絵本の作家です。犬・猫・うさぎ・くま・きつね・森の動物などが主人公または大切な友だちとして登場する物語を作ってください。
- 動物たちの表情やしぐさをかわいく描き、やさしさや助け合いが伝わる展開にしてください。
- 小さな子どもが安心して読める、親しみやすい森や庭、公園などの舞台を中心にしてください。`,
  },
  adventure: {
    name: "わくわく冒険",
    description: "森・海・空へ出かける発見いっぱいの冒険",
    icon: "⛰️",
    genre: "Adventure",
    sampleImageUrl: "/images/templates/adventure.webp",
    sampleImages: {
      light: "/images/samples/adventure_light.webp",
      premium: "/images/samples/adventure_premium.webp",
    },
    sampleImageAlt: "光るコンパスを持った子どもたちが広い景色へ走り出す絵本表紙",
    visualDirection:
      "Bright adventurous picture-book mood with wide landscapes, sparkling compass motifs, blue sky, green hills, winding paths, dynamic running poses, clear sense of movement, discovery, and safe excitement.",
    order: 2,
    active: true,
    systemPrompt: `あなたは子ども向け絵本の作家です。森・海・宇宙・宝探し・知らない町などへ出発する、わくわくする冒険物語を作ってください。
- 危険や恐怖ではなく、発見、仲間、地図、コンパス、小さなミッションの楽しさを中心にしてください。
- 最後は主人公が少し成長し、うれしい気持ちで帰ってくる構成にしてください。`,
  },
  fantasy: {
    name: "まほうの世界",
    description: "魔法や妖精、ドラゴンが出てくる夢の世界",
    icon: "🪄",
    genre: "Fantasy",
    sampleImageUrl: "/images/templates/fantasy.webp",
    sampleImages: {
      light: "/images/samples/fantasy_light.webp",
      premium: "/images/samples/fantasy_premium.webp",
    },
    sampleImageAlt: "星空の魔法学校で魔法使いの子とドラゴンが見上げている絵本表紙",
    visualDirection:
      "Dreamy magical night fantasy with starry skies, crescent moon, glowing wand, floating books, friendly baby dragon, luminous castle windows, deep navy and gold palette, ornate but child-friendly details, consistent character proportions and anatomy.",
    order: 3,
    active: true,
    systemPrompt: `あなたは子ども向け絵本の作家です。魔法、妖精、ドラゴン、不思議な国、魔法学校などをテーマにした夢のある物語を作ってください。
- 魔法は人を助けたり、心を明るくしたりするために使ってください。
- 怖い魔物や暗い戦いではなく、きらきらした不思議さ、好奇心、やさしい驚きを中心にしてください。`,
  },
  bedtime: {
    name: "おやすみ前のおはなし",
    description: "月と星に包まれる静かな寝かしつけ絵本",
    icon: "🌙",
    genre: "Bedtime",
    sampleImageUrl: "/images/templates/bedtime.webp",
    sampleImages: {
      light: "/images/samples/bedtime_light.webp",
      premium: "/images/samples/bedtime_premium.webp",
    },
    sampleImageAlt: "星空の部屋で子どもがぬいぐるみを抱いて眠る絵本表紙",
    visualDirection:
      "Calm bedtime picture-book atmosphere with deep blue night, smiling moon, tiny warm stars, soft lamp light, cozy bedroom textiles, slow peaceful composition, muted colors, and sleepy gentle expressions.",
    order: 4,
    active: true,
    systemPrompt: `あなたは子ども向け絵本の作家です。寝る前に読む静かで安心できる物語を作ってください。
- 夜空、月、星、ぬいぐるみ、静かな部屋、やさしい夢など穏やかな要素を入れてください。
- テンポはゆっくり、言葉はやわらかく、最後は主人公が安心して眠りにつく場面で終わってください。`,
  },
  "emotional-growth": {
    name: "こころを育てる",
    description: "勇気・やさしさ・自己肯定感を育てる物語",
    icon: "⭐",
    genre: "Emotional Growth",
    sampleImageUrl: "/images/templates/emotional-growth.webp",
    sampleImages: {
      light: "/images/samples/emotional-growth_light.webp",
      premium: "/images/samples/emotional-growth_premium.webp",
    },
    sampleImageAlt: "小さな子が友だちを助け、胸の光る種が輝く絵本表紙",
    visualDirection:
      "Warm emotional-growth picture-book tone with golden sunlight, expressive child faces, gentle hand-holding, small glowing seed or heart motif, garden path, soft flowers, and an encouraging tender mood.",
    order: 5,
    active: true,
    systemPrompt: `あなたは子ども向け絵本の作家です。勇気、やさしさ、不安、友だち、自己肯定感など、こころの成長をテーマにした物語を作ってください。
- 主人公が小さな気持ちの変化に気づき、自分や誰かを大切にできる展開にしてください。
- 説教っぽくせず、場面と会話の中で自然に前向きな気づきが生まれるようにしてください。`,
  },
  "daily-habits": {
    name: "生活習慣をまなぶ",
    description: "歯みがき・片づけ・あいさつを楽しく練習",
    icon: "🪥",
    genre: "Daily Habits",
    sampleImageUrl: "/images/templates/daily-habits.webp",
    sampleImageAlt: "歯ブラシ列車と子どもたちが歯みがきをする明るい絵本表紙",
    visualDirection:
      "Cheerful practical daily-habit picture-book style with clean bathroom or home scenes, bright primary colors, cute anthropomorphic tools, step-by-step visual clarity, rounded shapes, and a reassuring parent-child learning mood.",
    order: 6,
    active: true,
    systemPrompt: `あなたは子ども向け絵本の作家です。歯みがき、片づけ、あいさつ、トイレ、早寝、手洗いなど生活習慣を楽しく学べる物語を作ってください。
- 主人公が失敗しても責められず、遊びや応援を通して「やってみよう」と思える展開にしてください。
- 実用的な手順や合言葉を、絵本の物語として自然に入れてください。`,
  },
  educational: {
    name: "たのしく学ぶ",
    description: "数字・色・形・ひらがなを遊びながら学ぶ",
    icon: "🔤",
    genre: "Educational",
    sampleImageUrl: "/images/templates/educational.webp",
    sampleImageAlt: "数字、色、形、文字の世界を子どもたちが冒険する絵本表紙",
    visualDirection:
      "Colorful educational picture-book mood with numbers, simple shapes, hiragana-like learning motifs, rainbow accents, blocks, cheerful animal helpers, diagram-like clarity, and playful classroom-adventure composition.",
    order: 7,
    active: true,
    systemPrompt: `あなたは子ども向け絵本の作家です。数字、ひらがな、色、形、英語、科学の入口などを楽しく学べる物語を作ってください。
- 学びをテストのようにせず、発見や遊びの中で自然に触れられる構成にしてください。
- 各ページに幼児が覚えやすい短い言葉、くり返し、見つける楽しさを入れてください。`,
  },
  food: {
    name: "おいしいおはなし",
    description: "パンや野菜、スイーツが主役のかわいい物語",
    icon: "🍳",
    genre: "Food",
    sampleImageUrl: "/images/templates/food.webp",
    sampleImageAlt: "焼きたてパンと笑顔のパンたちが並ぶあたたかい絵本表紙",
    visualDirection:
      "Warm delicious food picture-book mood with cozy bakery or kitchen lighting, round cute smiling foods, golden browns, soft steam, gingham cloth, appetizing textures, and a pop yet gentle composition.",
    order: 8,
    active: true,
    systemPrompt: `あなたは子ども向け絵本の作家です。おにぎり、パン、野菜、くだもの、スイーツなど食べものが登場する楽しい物語を作ってください。
- 食べものをかわいく擬人化したり、料理を作る楽しさを描いたりしてください。
- 好き嫌いの克服は押しつけず、「少し試してみたい」と思える前向きな雰囲気にしてください。`,
  },
  seasonal: {
    name: "季節とイベント",
    description: "春夏秋冬、誕生日や行事を楽しむ絵本",
    icon: "🌸",
    genre: "Seasonal",
    sampleImageUrl: "/images/templates/seasonal.webp",
    sampleImageAlt: "春夏秋冬と行事を一枚に描いたにぎやかな絵本表紙",
    visualDirection:
      "Festive seasonal picture-book style with clearly readable spring, summer, autumn, and winter scenes, sakura, beach, autumn leaves, snow, holiday decorations, bright joyful children, and watercolor-like seasonal color blocks.",
    order: 9,
    active: true,
    systemPrompt: `あなたは子ども向け絵本の作家です。春夏秋冬、クリスマス、誕生日、入園、旅行、ハロウィン、お正月など季節やイベントをテーマにした物語を作ってください。
- 季節感が一目で分かる背景や小物を入れてください。
- 行事の楽しさだけでなく、家族や友だちと分かち合う喜びが伝わる物語にしてください。`,
  },
  "vehicles-robots": {
    name: "のりもの・ロボット",
    description: "電車・車・飛行機・ロボットの楽しい世界",
    icon: "🤖",
    genre: "Vehicles & Robots",
    sampleImageUrl: "/images/templates/vehicles-robots.webp",
    sampleImageAlt: "空飛ぶロボットバスに子どもたちが乗っている絵本表紙",
    visualDirection:
      "Pop and exciting vehicles-and-robots picture-book mood with blue sky, friendly robot bus or trains, clean futuristic city, rounded mechanical shapes, white clouds, orange and blue accents, smiling children, and energetic safe motion.",
    order: 10,
    active: true,
    systemPrompt: `あなたは子ども向け絵本の作家です。電車、車、飛行機、ロボット、宇宙船など、のりものやメカをテーマにした楽しい物語を作ってください。
- メカは怖くなく、丸くて親しみやすい友だちのように描いてください。
- スピード感や発明の楽しさを入れつつ、安全で明るい冒険にしてください。`,
  },
  "fixed-first-zoo": {
    name: "はじめてのどうぶつえん",
    description: "はじめてのおでかけを、やさしく早く絵本に残せるテンプレート",
    icon: "🦁",
    categoryGroupId: "memories",
    subcategoryId: "first-time",
    parentIntent: "この瞬間を残したい",
    recommendedAgeMin: 1,
    recommendedAgeMax: 6,
    requiredInputs: ["childName", "place", "familyMembers"],
    optionalInputs: ["parentMessage"],
    themeTags: ["memory", "zoo", "first outing"],
    creationMode: "fixed_template",
    priceTier: "ume",
    storyCostLevel: "none",
    sampleImageUrl: "/images/templates/fixed-first-zoo.webp",
    sampleImageAlt: "家族と動物園を楽しむ子どものやさしい絵本イメージ",
    visualDirection:
      "Gentle family memory picture-book cover with warm daylight, friendly zoo atmosphere, soft smiles, and a keepsake-photo feeling.",
    order: 3,
    active: true,
    systemPrompt: "固定テンプレートを使って、家族の思い出をやさしく残す絵本です。",
    fixedStory: {
      titleTemplate: "{childName}とはじめてのどうぶつえん",
      previewImageUrl: "/images/templates/fixed-first-zoo.webp",
      coverImagePromptTemplate:
        withZooImagePromptGuardrail("Picture book cover illustration: a young child standing beside a decorative text-free zoo entrance arch with animal-shaped decorations and zoo paths, with family nearby, gentle daylight, warm welcoming atmosphere, soft watercolor style, recurring small yellow star motif tucked into the scene, child-safe and inviting composition, rich but not cluttered details", { signText: true }),
      titleSpreadTextTemplate: "{childName}と はじめての どうぶつえん",
      openingNarrationTemplate:
        "きょうは とくべつな日。{childName}は {familyMembers}と いっしょに、はじめての どうぶつえんへ でかけます。",
      pages: [
        buildAgeSpecificPage({
          textTemplate: "{childName}は、{familyMembers}といっしょに{place}へでかけました。",
          baby_toddler: "{childName}、{place}へ しゅっぱつ。わくわく。",
          preschool_3_4: "{childName}は、{familyMembers}といっしょに{place}へでかけました。どんな どうぶつに あえるかな。",
          early_reader_5_6:
            "{childName}は、{familyMembers}といっしょに{place}へでかけました。いりぐちの ちずを見ながら、つぎは どこへいこうかと うれしそうに そうぞうします。",
          early_elementary_7_8:
            "{childName}は、{familyMembers}といっしょに{place}へでかけました。きょうの ぼうけんが はじまります。",
          general_child: "{childName}は、{familyMembers}といっしょに{place}へでかけました。どんな どうぶつに あえるかな。",
          pageVisualRole: "opening_establishing",
          imagePromptTemplate:
            withZooImagePromptGuardrail("Setting: zoo entrance path with family, animal enclosures and trees. Establishing wide shot of a young child arriving at a friendly zoo with family. The child stands near a tree-lined path just inside the entrance, looking up with excitement at a plain unmarked entrance arch. Family members walk beside the child. A decorative text-free entrance arch frames the top. A small yellow star motif is tucked into the arch. Gentle morning daylight with warm golden tones. Lush green trees and a winding path leading inward. Soft watercolor picture book style, soft painterly watercolor texture, no hard outlines, rich watercolor pigment blooms, rounded child-safe shapes, rich but not cluttered background details."),
        }),
        buildAgeSpecificPage({
          textTemplate: "大きなどうぶつ、小さなどうぶつ。{childName}の目はきらきらです。",
          baby_toddler: "ぞうさん。ことりさん。きらきら。",
          preschool_3_4:
            "大きなどうぶつ、小さなどうぶつ。{childName}の目はきらきらです。みみをすますと、たのしい こえが きこえます。",
          early_reader_5_6:
            "大きなどうぶつ、小さなどうぶつ。{childName}の目は きらきらです。とおくで ゆれる しっぽや、ちいさな あしあとまで 見つけて、つぎつぎに しらせてくれました。",
          early_elementary_7_8:
            "大きなどうぶつ、小さなどうぶつ。{childName}は 夢中になります。",
          general_child:
            "大きなどうぶつ、小さなどうぶつ。{childName}の目はきらきらです。つぎは どこを見ようかと こころが はずみます。",
          pageVisualRole: "discovery",
          imagePromptTemplate:
            withZooImagePromptGuardrail("Setting: viewing animal enclosures from a safe path inside the zoo. Medium shot of a child at a zoo animal enclosure, leaning forward with wide curious eyes. A friendly elephant or giraffe stands in the mid-ground, while small birds or butterflies add life to the foreground. The child points with one hand, the other holding a parent's hand. Family members stand behind the child, smiling. A small yellow star motif is hidden on a fence post. Warm daylight filtering through leaves. Soft watercolor picture book style, clear foreground-midground-background layering, rich but not cluttered."),
        }),
        buildAgeSpecificPage({
          textTemplate: "いちばんうれしかったのは、{childName}がにっこり笑ったその瞬間でした。",
          baby_toddler: "{childName}、にこっ。うれしいね。",
          preschool_3_4:
            "いちばんうれしかったのは、{childName}がにっこり笑ったその瞬間でした。みんなの こころも ぽかぽかに なります。",
          early_reader_5_6:
            "いちばんうれしかったのは、{childName}が にっこり笑った そのしゅんかんでした。さっき ちょっぴり こわかった どうぶつにも、もう一ど あってみたいと 言えたのです。",
          early_elementary_7_8:
            "いちばんうれしかったのは、{childName}が にっこり笑った そのしゅんかんでした。どうぶつたちの やさしさが 分かったのです。",
          general_child:
            "いちばんうれしかったのは、{childName}がにっこり笑ったその瞬間でした。みんなの こころも ぽかぽかに なります。",
          pageVisualRole: "emotional_closeup",
          imagePromptTemplate:
            withZooImagePromptGuardrail("Setting: zoo viewing area with animals in the distance, close-up emotional moment. Close-up of the child's face beaming with a big joyful smile after a special zoo moment. The child holds a small zoo souvenir or leaf in both hands near their chest. Soft-focus background shows a friendly animal and family members reacting warmly. A small yellow star motif appears on the souvenir or nearby. Warm afternoon light with golden highlights on the child's cheeks. Soft watercolor picture book style, emotional warmth, intimate framing, rich but not cluttered."),
        }),
        buildAgeSpecificPage({
          textTemplate: "{parentMessage}",
          baby_toddler: "{parentMessage}",
          preschool_3_4: "{parentMessage}",
          early_reader_5_6: "{parentMessage}",
          early_elementary_7_8: "{parentMessage}",
          general_child: "{parentMessage}",
          pageVisualRole: "quiet_ending",
          imagePromptTemplate:
            withZooImagePromptGuardrail("Setting: quiet zoo path at sunset leaving the zoo. Back-view wide shot of the child and family walking away from the zoo toward a golden-hour sunset. A gentle tree-lined path stretches ahead. The child holds a parent's hand, looking slightly back with a content smile. A small yellow star motif glows softly in the evening sky or on a nearby lantern. Warm amber and soft pink sunset tones. Soft watercolor picture book style, peaceful farewell composition, rich but not cluttered."),
        }),
      ],
    },
  },
  "fixed-birthday-4p": {
    name: "はっぴーばーすでー",
    description: "お誕生日おめでとう！大切な1日を、ぎゅっと4ページに凝縮した記念絵本",
    icon: "🎂",
    categoryGroupId: "seasonal-events",
    subcategoryId: "birthday",
    parentIntent: "この瞬間を残したい",
    recommendedAgeMin: 1,
    recommendedAgeMax: 8,
    requiredInputs: ["childName"],
    optionalInputs: ["parentMessage"],
    themeTags: ["birthday", "gift", "celebration"],
    creationMode: "fixed_template",
    priceTier: "ume",
    storyCostLevel: "none",
    sampleImageUrl: "/images/templates/fixed-birthday-4p.webp",
    sampleImageAlt: "誕生日をお祝いする幸せな家族の絵本イメージ",
    visualDirection: "Warm joyful birthday atmosphere, colorful balloons, a delicious cake, and family smiles.",
    order: 118,
    active: true,
    systemPrompt: "固定テンプレートを使って、誕生日の思い出を4ページで残す絵本を作ります。",
    fixedStory: {
      titleTemplate: "{childName}の はっぴーばーすでー",
      previewImageUrl: "/images/templates/fixed-birthday-4p.webp",
      coverImagePromptTemplate: withBirthdayImagePromptGuardrail("Picture book cover: A happy child with a birthday cake and colorful balloons, warm family celebration, joyful and festive, soft watercolor style, rich but not cluttered."),
      titleSpreadTextTemplate: "おたんじょうび おめでとう！",
      openingNarrationTemplate: "きょうは {childName}の とくべつな日。みんなで お祝いしましょう！",
      pages: [
        buildAgeSpecificPage({
          textTemplate: "{childName}、おたんじょうびおめでとう！おへやが かざりつけで きらきらしています。",
          pageVisualRole: "opening_establishing",
          imagePromptTemplate: withBirthdayImagePromptGuardrail("Wide shot: A cozy room decorated with colorful balloons and streamers for a birthday party. The child stands in the center, looking excited. Soft watercolor style."),
        }),
        buildAgeSpecificPage({
          textTemplate: "大きなケーキに、ろうそくを ともしましょう。{childName}の 目も きらきら かがやきます。",
          pageVisualRole: "discovery",
          imagePromptTemplate: withBirthdayImagePromptGuardrail("Medium shot: The child looking at a beautiful birthday cake with glowing candles. The light reflects in the child's eyes. Family members are smiling in the background. Soft watercolor style."),
        }),
        buildAgeSpecificPage({
          textTemplate: "みんなの「おめでとう！」が、あたたかい ひかりのように {childName}を つつみます。",
          pageVisualRole: "emotional_closeup",
          imagePromptTemplate: withBirthdayImagePromptGuardrail("Close-up: The child's beaming face, full of joy and happiness, surrounded by family members' warm hands and smiles. Soft watercolor style."),
        }),
        buildAgeSpecificPage({
          textTemplate: "ひとつ 大きくなった {childName}。これからも、ずっと だいすきだよ。{parentMessage}",
          pageVisualRole: "quiet_ending",
          imagePromptTemplate: withBirthdayImagePromptGuardrail("Wide shot: The child hugging a family member or a favorite gift, peacefully happy at the end of the party. Warm evening glow. Soft watercolor style."),
        }),
      ],
    },
  },
  "fixed-birthday-8p": {
    name: "はっぴーばーすでー（ロング）",
    description: "朝から夜まで、誕生日の1日をじっくり描く8ページの贅沢な記念絵本",
    icon: "🎂",
    categoryGroupId: "seasonal-events",
    subcategoryId: "birthday",
    parentIntent: "この瞬間を残したい",
    recommendedAgeMin: 1,
    recommendedAgeMax: 8,
    requiredInputs: ["childName"],
    optionalInputs: ["parentMessage"],
    themeTags: ["birthday", "gift", "celebration", "8-page"],
    creationMode: "fixed_template",
    priceTier: "take",
    storyCostLevel: "none",
    sampleImageUrl: "/images/templates/fixed-birthday-4p.webp",
    sampleImageAlt: "誕生日の1日をじっくり描いた絵本イメージ",
    visualDirection: "Warm detailed birthday story, from morning excitement to evening afterglow, soft watercolor style.",
    order: 119,
    active: true,
    systemPrompt: "固定テンプレートを使って、誕生日の思い出を8ページでゆっくり残す絵本を作ります。",
    fixedStory: {
      titleTemplate: "{childName}の はっぴーばーすでー",
      previewImageUrl: "/images/templates/fixed-birthday-4p.webp",
      coverImagePromptTemplate: withBirthdayImagePromptGuardrail("Picture book cover: A happy child celebrating their birthday, surrounded by love and festive decorations, soft watercolor style, rich but not cluttered."),
      titleSpreadTextTemplate: "とくべつな 1にちが はじまるよ",
      openingNarrationTemplate: "あさの ひかりの なかで、{childName}は めを さましました。きょうは、まちにまった おたんじょうび！",
      pageCount: 8,
      layoutVariant: "8_page",
      pages: [
        buildAgeSpecificPage({
          textTemplate: "あさ、まどから おひさまが「おめでとう」って いっているみたい。{childName}は わくわくして おきました。",
          pageVisualRole: "opening_establishing",
          imagePromptTemplate: withBirthdayImagePromptGuardrail("Wide shot: The child waking up in bed with a big smile, morning sun streaming through the window. Festive decorations are already visible in the room. Soft watercolor style."),
        }),
        buildAgeSpecificPage({
          textTemplate: "おへやを みんなで かざりつけ。ふうせんが ぷかぷか、おはなが きらきら。",
          pageVisualRole: "action",
          imagePromptTemplate: withBirthdayImagePromptGuardrail("Action shot: The child and family members putting up plain balloons and colorful unmarked decorations in the living room. Lively and happy atmosphere. Soft watercolor style."),
        }),
        buildAgeSpecificPage({
          textTemplate: "おたんじょうびの プレゼント！ なにが入っているのかな？ {childName}は ドキドキしながら あけました。",
          pageVisualRole: "discovery",
          imagePromptTemplate: withBirthdayImagePromptGuardrail("Discovery shot: The child opening a beautifully wrapped plain unmarked gift box. A look of anticipation and excitement on their face. Soft watercolor style."),
        }),
        buildAgeSpecificPage({
          textTemplate: "わあ、だいすきな おもちゃ！ {childName}は うれしくて、ぎゅっと だきしめました。",
          pageVisualRole: "payoff",
          imagePromptTemplate: withBirthdayImagePromptGuardrail("Medium shot: The child holding their new gift with a huge, happy smile. Pure joy and satisfaction. Soft watercolor style."),
        }),
        buildAgeSpecificPage({
          textTemplate: "おひるごはんは、{childName}の だいこうぶつ！ みんなで たべると、もっと おいしいね。",
          pageVisualRole: "object_detail",
          imagePromptTemplate: withBirthdayImagePromptGuardrail("Medium shot: A festive lunch table with the child's favorite food. The child is eating happily with family. Bright and warm atmosphere. Soft watercolor style."),
        }),
        buildAgeSpecificPage({
          textTemplate: "そして、大きなケーキの とうじょうです！ ろうそくの ひが、みんなの えがおを てらします。",
          pageVisualRole: "discovery",
          imagePromptTemplate: withBirthdayImagePromptGuardrail("Discovery shot: The family gathered around a birthday cake with lit candles. The child is preparing to blow them out. Warm candlelight. Soft watercolor style."),
        }),
        buildAgeSpecificPage({
          textTemplate: "ふーっと ひを けしたら、みんなで「おめでとう！」。{childName}は とっても しあわせな きもちです。",
          pageVisualRole: "emotional_closeup",
          imagePromptTemplate: withBirthdayImagePromptGuardrail("Close-up: The child's delighted face just after blowing out the candles, surrounded by clapping and smiling family. Soft watercolor style."),
        }),
        buildAgeSpecificPage({
          textTemplate: "よる、おふとんの なかで 思いだします。たのしかったね。{parentMessage}",
          pageVisualRole: "quiet_ending",
          imagePromptTemplate: withBirthdayImagePromptGuardrail("Back-view wide shot: The child looking out at the night sky or leaning on a parent, feeling content and loved at the end of the day. Soft moonlight. Soft watercolor style."),
        }),
      ],
    },
  },
  "fixed-graduation-kindergarten": {
    name: "ようちえん そつえんおめでとう",
    description: "幼稚園・保育園の卒園記念に。園での思い出と、成長した姿を刻む絵本",
    icon: "🎓",
    categoryGroupId: "memories",
    subcategoryId: "graduation",
    parentIntent: "この瞬間を残したい",
    recommendedAgeMin: 5,
    recommendedAgeMax: 7,
    requiredInputs: ["childName"],
    optionalInputs: ["parentMessage"],
    themeTags: ["graduation", "kindergarten", "nursery", "milestone"],
    creationMode: "fixed_template",
    priceTier: "take",
    storyCostLevel: "none",
    sampleImageUrl: "/images/templates/fixed-graduation-kindergarten.webp",
    sampleImageAlt: "卒園式で誇らしげに立つ子どもの絵本イメージ",
    visualDirection: "Bright spring graduation atmosphere, cherry blossoms, a sense of accomplishment and new beginnings.",
    order: 120,
    active: true,
    systemPrompt: "固定テンプレートを使って、幼稚園・保育園の卒園記念絵本を8ページで作ります。",
    fixedStory: {
      titleTemplate: "{childName}の そつえん おめでとう",
      previewImageUrl: "/images/templates/fixed-graduation-kindergarten.webp",
      coverImagePromptTemplate: withGraduationImagePromptGuardrail("Picture book cover: A child in a formal graduation outfit (kindergarten/nursery), holding a plain diploma tube, cherry blossoms in the background, proud and hopeful expression, soft watercolor style, rich but not cluttered."),
      titleSpreadTextTemplate: "ようちえん、たのしかったね",
      openingNarrationTemplate: "はるの かぜが ふく日。{childName}は 今日、ようちえんを そつえんします。",
      pageCount: 8,
      layoutVariant: "8_page",
      pages: [
        buildAgeSpecificPage({
          textTemplate: "はじめて 門を くぐった日のこと、おぼえているかな？ {childName}は、こんなに 大きくなりました。",
          pageVisualRole: "opening_establishing",
          imagePromptTemplate: withGraduationImagePromptGuardrail("Establishing wide shot: The child standing at the plain unmarked kindergarten gate on a sunny spring morning, wearing a graduation ribbon. Cherry blossoms are blooming. Soft watercolor style."),
        }),
        buildAgeSpecificPage({
          textTemplate: "どろんこ遊びに、かけっこ、おえかき。おともだちと いっしょに、たくさん 笑ったね。",
          pageVisualRole: "action",
          imagePromptTemplate: withGraduationImagePromptGuardrail("Action shot: A montage or a lively scene of the child playing with friends in the kindergarten playground. Joyful energy. Soft watercolor style."),
        }),
        buildAgeSpecificPage({
          textTemplate: "なみだが出た日も あったけれど、みんながいたから 大丈夫。やさしい 心が そだちました。",
          pageVisualRole: "setback_or_question",
          imagePromptTemplate: withGraduationImagePromptGuardrail("Medium shot: A teacher or a friend gently comforting the child or sharing a quiet moment. Reassuring and warm. Soft watercolor style."),
        }),
        buildAgeSpecificPage({
          textTemplate: "そつえんしき。ぴしっと まっすぐ立って、しょうじょを もらいます。{childName}、とっても かっこいいよ！",
          pageVisualRole: "payoff",
          imagePromptTemplate: withGraduationImagePromptGuardrail("Wide shot: The child receiving a plain, unmarked diploma tube on a stage during the ceremony. Proud posture and focused expression. Soft watercolor style."),
        }),
        buildAgeSpecificPage({
          textTemplate: "せんせい、ありがとう。おともだち、ありがとう。たくさんの「ありがとう」が おへやに ひろがります。",
          pageVisualRole: "emotional_closeup",
          imagePromptTemplate: withGraduationImagePromptGuardrail("Close-up: The child saying thank you with a sincere smile, eyes slightly misty. Emotional warmth. Soft watercolor style."),
        }),
        buildAgeSpecificPage({
          textTemplate: "だいすきな 園舎とも、今日でおわかれ。でも、思い出は ずっと こころのなかに あります。",
          pageVisualRole: "quiet_ending",
          imagePromptTemplate: withGraduationImagePromptGuardrail("Wide shot: The child looking back at the kindergarten building with a nostalgic but happy smile. Cherry blossoms are fluttering. Soft watercolor style."),
        }),
        buildAgeSpecificPage({
          textTemplate: "さあ、あたらしい 世界へ しゅっぱつ！ {childName}なら、どこまでも 行けるよ。",
          pageVisualRole: "action",
          imagePromptTemplate: withGraduationImagePromptGuardrail("Wide shot: The child taking a bold step forward toward a bright, open horizon with a look of hope and excitement. Soft watercolor style."),
        }),
        buildAgeSpecificPage({
          textTemplate: "ずっと おうえんしているよ。そつえん、本当におめでとう。{parentMessage}",
          pageVisualRole: "quiet_ending",
          imagePromptTemplate: withGraduationImagePromptGuardrail("Back-view wide shot: The child walking hand-in-hand with a family member toward the future. Warm spring light. Soft watercolor style."),
        }),
      ],
    },
  },
  "fixed-entrance-elementary": {
    name: "しょうがっこう いっちゃうんだね",
    description: "ピカピカの1年生！小学校入学のドキドキとワクワクを詰め込んだ8ページの記念絵本",
    icon: "🎒",
    categoryGroupId: "memories",
    subcategoryId: "elementary-school",
    parentIntent: "この瞬間を残したい",
    recommendedAgeMin: 6,
    recommendedAgeMax: 7,
    requiredInputs: ["childName"],
    optionalInputs: ["parentMessage"],
    themeTags: ["entrance", "elementary", "school", "randoseru", "milestone"],
    creationMode: "fixed_template",
    priceTier: "take",
    storyCostLevel: "none",
    sampleImageUrl: "/images/templates/fixed-entrance-elementary.webp",
    sampleImageAlt: "ランドセルを背負って小学校へ行く子どもの絵本イメージ",
    visualDirection: "Bright energetic spring school entrance atmosphere, randoseru, cherry blossoms, and new friends.",
    order: 121,
    active: true,
    systemPrompt: "固定テンプレートを使って、小学校入学の記念絵本を8ページで作ります。",
    fixedStory: {
      titleTemplate: "{childName}の しょうがっこう にゅうがく",
      previewImageUrl: "/images/templates/fixed-entrance-elementary.webp",
      coverImagePromptTemplate: withGraduationImagePromptGuardrail("Picture book cover: A child wearing a new school uniform and a shiny randoseru backpack, standing at a plain unmarked elementary school gate with cherry blossoms, proud and excited, soft watercolor style, rich but not cluttered."),
      titleSpreadTextTemplate: "ピカピカの 1ねんせい！",
      openingNarrationTemplate: "さくらの 花が さく日。{childName}は 今日から、しょうがっこうの 1ねんせいです。",
      pageCount: 8,
      layoutVariant: "8_page",
      pages: [
        buildAgeSpecificPage({
          textTemplate: "あたらしい ランドセル。せなかに ぴったり。{childName}は うれしくて、何度も かがみを みました。",
          pageVisualRole: "opening_establishing",
          imagePromptTemplate: withGraduationImagePromptGuardrail("Establishing wide shot: The child at home, wearing a new randoseru for the first time, looking at their reflection in a mirror with a proud smile. Soft morning light. Soft watercolor style."),
        }),
        buildAgeSpecificPage({
          textTemplate: "しょうがっこうの 門を くぐります。大きな建物、広い校庭。すべてが 新しく 見えます。",
          pageVisualRole: "discovery",
          imagePromptTemplate: withGraduationImagePromptGuardrail("Wide shot: The child standing at the plain unmarked elementary school gate, looking up at the large school building. A mix of awe and excitement. Soft watercolor style."),
        }),
        buildAgeSpecificPage({
          textTemplate: "にゅうがくしき。ちょっと 緊張するけれど、背すじを のばして 座りました。",
          pageVisualRole: "setback_or_question",
          imagePromptTemplate: withGraduationImagePromptGuardrail("Medium shot: The child sitting in a chair during the entrance ceremony, looking a bit nervous but determined. Other children and parents are visible. Soft watercolor style."),
        }),
        buildAgeSpecificPage({
          textTemplate: "「1ねんせいに なった人！」 せんせいの 声に、{childName}は 元気に 手を あげました。",
          pageVisualRole: "action",
          imagePromptTemplate: withGraduationImagePromptGuardrail("Action shot: The child raising a hand energetically in the classroom. Bright and lively atmosphere. Soft watercolor style."),
        }),
        buildAgeSpecificPage({
          textTemplate: "あたらしい おともだち。なまえを よんで、にっこり。「いっしょに あそぼうね！」",
          pageVisualRole: "emotional_closeup",
          imagePromptTemplate: withGraduationImagePromptGuardrail("Close-up: The child smiling at a new friend. Friendly and welcoming eyes. Soft watercolor style."),
        }),
        buildAgeSpecificPage({
          textTemplate: "ピカピカの 教科書に、あたらしい 筆箱。これから どんなことを 学ぶのかな？",
          pageVisualRole: "object_detail",
          imagePromptTemplate: withGraduationImagePromptGuardrail("Medium shot: The child looking at new plain school supplies (text-free textbooks, unmarked pencil case) on their desk. Eyes full of curiosity. Soft watercolor style."),
        }),
        buildAgeSpecificPage({
          textTemplate: "帰り道、ランドセルが ちょっぴり 重いけれど、{childName}の 足取りは 軽やかです。",
          pageVisualRole: "quiet_ending",
          imagePromptTemplate: withGraduationImagePromptGuardrail("Wide shot: The child walking home from school with the randoseru on their back. Cherry blossoms are fluttering. Soft watercolor style."),
        }),
        buildAgeSpecificPage({
          textTemplate: "たのしい 毎日が はじまるよ。にゅうがく おめでとう！ {parentMessage}",
          pageVisualRole: "quiet_ending",
          imagePromptTemplate: withGraduationImagePromptGuardrail("Back-view wide shot: The child skipping or walking happily toward home. Warm afternoon light. Soft watercolor style."),
        }),
      ],
    },
  },
  "fixed-new-baby": {
    name: "あかちゃん きたよ",
    description: "待望の新しい家族。お兄ちゃん・お姉ちゃんになった喜びと戸惑い、愛おしさを描く8ページ絵本",
    icon: "👶",
    categoryGroupId: "memories",
    subcategoryId: "family-growth",
    parentIntent: "この瞬間を残したい",
    recommendedAgeMin: 2,
    recommendedAgeMax: 8,
    requiredInputs: ["childName"],
    optionalInputs: ["parentMessage"],
    themeTags: ["new-baby", "sibling", "family", "love", "milestone"],
    creationMode: "fixed_template",
    priceTier: "take",
    storyCostLevel: "none",
    sampleImageUrl: "/images/templates/fixed-new-baby.webp",
    sampleImageAlt: "赤ちゃんと初めて対面する子どもの絵本イメージ",
    visualDirection: "Warm tender nursery atmosphere, soft pastels, tiny baby details, and deep sibling affection.",
    order: 122,
    active: true,
    systemPrompt: "固定テンプレートを使って、新しい赤ちゃんを迎えたお兄ちゃん・お姉ちゃんの物語を8ページで作ります。",
    fixedStory: {
      titleTemplate: "あかちゃんが きたよ！ {childName}と 小さな いのち",
      previewImageUrl: "/images/templates/fixed-new-baby.webp",
      coverImagePromptTemplate: withNewBabyImagePromptGuardrail("Picture book cover: An older child looking tenderly at a new baby in a cradle, warm nursery setting, soft pastel colors, feeling of love and protection, soft watercolor style, rich but not cluttered."),
      titleSpreadTextTemplate: "おうちに あかちゃんが やってきた",
      openingNarrationTemplate: "ある日、{childName}の おうちに、とっても 小さな お客さまが やってきました。",
      pageCount: 8,
      layoutVariant: "8_page",
      pages: [
        buildAgeSpecificPage({
          textTemplate: "あかちゃん。ちいさくて、ふわふわで。{childName}は びっくりして 見つめました。",
          pageVisualRole: "opening_establishing",
          imagePromptTemplate: withNewBabyImagePromptGuardrail("Establishing wide shot: The child standing by a cradle, looking at the sleeping baby with wide eyes. Soft warm nursery light. Soft watercolor style."),
        }),
        buildAgeSpecificPage({
          textTemplate: "おててが こんなに ちいさいよ。{childName}が そっと ふれると、ぎゅっと にぎってくれました。",
          pageVisualRole: "discovery",
          imagePromptTemplate: withNewBabyImagePromptGuardrail("Discovery shot: Close-up of the baby's tiny hand grasping the older child's finger. Emotional and sweet. Soft watercolor style."),
        }),
        buildAgeSpecificPage({
          textTemplate: "あかちゃんが 泣きだしました。どうしたのかな？ {childName}は ちょっぴり 困ってしまいました。",
          pageVisualRole: "setback_or_question",
          imagePromptTemplate: withNewBabyImagePromptGuardrail("Medium shot: The child looking a bit concerned or puzzled as the baby cries. A family member is nearby to help. Soft watercolor style."),
        }),
        buildAgeSpecificPage({
          textTemplate: "「よしよし」って してあげよう。{childName}が やさしく なでると、あかちゃんは 泣きやみました。",
          pageVisualRole: "action",
          imagePromptTemplate: withNewBabyImagePromptGuardrail("Action shot: The child gently stroking the baby's head or cheek. A sense of growing care. Soft watercolor style."),
        }),
        buildAgeSpecificPage({
          textTemplate: "ミルクを のんだり、ねんねしたり。あかちゃんの ことを見ていると、{childName}も やさしい きもちになります。",
          pageVisualRole: "object_detail",
          imagePromptTemplate: withNewBabyImagePromptGuardrail("Medium shot: The child watching from a little distance as the baby sleeps peacefully near plain unmarked baby supplies. Quiet and warm atmosphere. Soft watercolor style."),
        }),
        buildAgeSpecificPage({
          textTemplate: "今日から {childName}は おにいちゃん（おねえちゃん）です。なんだか ちょっぴり 誇らしい きもち。",
          pageVisualRole: "emotional_closeup",
          imagePromptTemplate: withNewBabyImagePromptGuardrail("Close-up: The child's face with a soft, proud smile, looking at the baby. Developing sibling bond. Soft watercolor style."),
        }),
        buildAgeSpecificPage({
          textTemplate: "いっしょに 遊んだり、お散歩したり。これから たのしいことが たくさん 待っているよ。",
          pageVisualRole: "discovery",
          imagePromptTemplate: withNewBabyImagePromptGuardrail("Wide shot: The child imagining playing with the baby in the future (e.g., holding hands, running in a park). Dreamy and hopeful. Soft watercolor style."),
        }),
        buildAgeSpecificPage({
          textTemplate: "あかちゃん、よろしくね。いっしょに 大きくなろうね。{parentMessage}",
          pageVisualRole: "quiet_ending",
          imagePromptTemplate: withNewBabyImagePromptGuardrail("Wide shot: The child sitting next to the cradle or a family member holding the baby, all in a warm family circle. Peaceful ending. Soft watercolor style."),
        }),
      ],
    },
  },
  "fixed-first-steps": {
    name: "はじめての○○",
    description: "「はじめて」の挑戦を応援し、達成の喜びを分かち合う8ページ。あらゆる成長の瞬間に。",
    icon: "🌟",
    categoryGroupId: "memories",
    subcategoryId: "first-experience",
    parentIntent: "この瞬間を残したい",
    recommendedAgeMin: 1,
    recommendedAgeMax: 8,
    requiredInputs: ["childName", "storyRequest"],
    optionalInputs: ["parentMessage"],
    themeTags: ["first-time", "challenge", "growth", "milestone"],
    creationMode: "fixed_template",
    isBlankTemplate: true,
    blankLabel: "何に挑戦しましたか？",
    blankExample: "例：あんよ、おつかい、さかあがり、ピアノ",
    priceTier: "take",
    storyCostLevel: "none",
    sampleImageUrl: "/images/templates/fixed-first-steps.webp",
    sampleImageAlt: "何かに挑戦し、達成した子どもの絵本イメージ",
    visualDirection: "Bright encouraging atmosphere, focus on determination, effort, and triumphant joy.",
    order: 123,
    active: true,
    systemPrompt: "固定テンプレートを使って、子どもの「はじめての挑戦」を8ページで描く応援絵本を作ります。",
    fixedStory: {
      titleTemplate: "{childName}の はじめての {storyRequest}",
      previewImageUrl: "/images/templates/fixed-first-steps.webp",
      coverImagePromptTemplate: withFixedImagePromptSafety("Picture book cover: A child with a look of determination and courage, about to start a new challenge, bright and inspiring atmosphere, soft watercolor style, rich but not cluttered."),
      titleSpreadTextTemplate: "はじめての ちょうせん！",
      openingNarrationTemplate: "きょうは {childName}にとって、わすれられない日。はじめての {storyRequest}に 挑戦します。",
      pageCount: 8,
      layoutVariant: "8_page",
      pages: [
        buildAgeSpecificPage({
          textTemplate: "{childName}は、はじめての{storyRequest}に 挑戦することになりました。ドキドキ、わくわく！",
          pageVisualRole: "opening_establishing",
          imagePromptTemplate: withFixedImagePromptSafety("Wide shot: The child standing at the start of a challenge, eyes bright with anticipation and a bit of nervousness. Clear, bright outdoor or indoor setting. Soft watercolor style."),
        }),
        buildAgeSpecificPage({
          textTemplate: "「できるかな？」 じっと 見つめて、深く いきを 吸いました。{childName}は、一歩 踏み出します。",
          pageVisualRole: "discovery",
          imagePromptTemplate: withFixedImagePromptSafety("Medium shot: The child taking a deep breath or making a focused gesture to start. Tense but brave expression. Soft watercolor style."),
        }),
        buildAgeSpecificPage({
          textTemplate: "思ったよりも むずかしい！ 転びそうになったり、止まりそうになったり。{childName}の 顔が 真剣です。",
          pageVisualRole: "setback_or_question",
          imagePromptTemplate: withFixedImagePromptSafety("Action shot: The child struggling a bit with the challenge, showing effort and concentration. Dynamic but safe. Soft watercolor style."),
        }),
        buildAgeSpecificPage({
          textTemplate: "「もう一回！」 {childName}は あきらめません。何度も何度も、いっしょうけんめい 繰り返します。",
          pageVisualRole: "action",
          imagePromptTemplate: withFixedImagePromptSafety("Action shot: The child repeating the effort with renewed determination. Inspiring energy. Soft watercolor style."),
        }),
        buildAgeSpecificPage({
          textTemplate: "まわりの みんなも おうえんしています。「がんばれ、{childName}！ あと少しだよ！」",
          pageVisualRole: "discovery",
          imagePromptTemplate: withFixedImagePromptSafety("Wide shot: Family members or friends watching and cheering for the child. Warm supportive atmosphere. Soft watercolor style."),
        }),
        buildAgeSpecificPage({
          textTemplate: "そのとき、ふっと 身体が 動きました。あ、できた！ コツを つかんだ しゅんかんです。",
          pageVisualRole: "payoff",
          imagePromptTemplate: withFixedImagePromptSafety("Action shot: The exact moment of success. The child's posture is balanced and successful. A spark of realization in their eyes. Soft watercolor style."),
        }),
        buildAgeSpecificPage({
          textTemplate: "やった！ できた！ {childName}の 顔に、世界で いちばん 輝く えがおが 咲きました。",
          pageVisualRole: "emotional_closeup",
          imagePromptTemplate: withFixedImagePromptSafety("Close-up: The child's face radiant with triumph and joy. Pure achievement. Soft watercolor style."),
        }),
        buildAgeSpecificPage({
          textTemplate: "はじめて できた日の きもち、ずっと 忘れないでね。本当におめでとう！ {parentMessage}",
          pageVisualRole: "quiet_ending",
          imagePromptTemplate: withFixedImagePromptSafety("Wide shot: The child looking satisfied and proud, perhaps with a small reward or a hug. Peaceful and happy ending. Soft watercolor style."),
        }),
      ],
    },
  },
  "fixed-thank-you-grandparent": {
    name: "いつもありがとう",
    description: "おじいちゃん・おばあちゃんへの感謝を込めて。大好きな気持ちを届けるギフト絵本",
    icon: "👵",
    categoryGroupId: "memories",
    subcategoryId: "gift",
    parentIntent: "この瞬間を残したい",
    recommendedAgeMin: 1,
    recommendedAgeMax: 10,
    requiredInputs: ["childName", "familyMembers"],
    optionalInputs: ["parentMessage"],
    themeTags: ["grandparent", "gift", "thank-you", "love"],
    creationMode: "fixed_template",
    priceTier: "take",
    storyCostLevel: "none",
    sampleImageUrl: "/images/templates/fixed-thank-you-grandparent.webp",
    sampleImageAlt: "おじいちゃん・おばあちゃんと仲良く過ごす子どもの絵本イメージ",
    visualDirection: "Warm nostalgic atmosphere, gentle golden light, and deep intergenerational love.",
    order: 124,
    active: true,
    systemPrompt: "固定テンプレートを使って、おじいちゃん・おばあちゃんへの感謝を伝える8ページの絵本を作ります。",
    fixedStory: {
      titleTemplate: "{childName}から いつもありがとう",
      previewImageUrl: "/images/templates/fixed-thank-you-grandparent.webp",
      coverImagePromptTemplate: withThankYouGrandparentImagePromptGuardrail("Picture book cover: A child and an elderly couple (grandparents) spending a warm moment together, perhaps reading or gardening, peaceful and loving atmosphere, soft watercolor style, rich but not cluttered."),
      titleSpreadTextTemplate: "だいすきな おじいちゃん おばあちゃんへ",
      openingNarrationTemplate: "{childName}は、おじいちゃんと おばあちゃんが 大好きです。今日は 感謝の きもちを 伝えます。",
      pageCount: 8,
      layoutVariant: "8_page",
      pages: [
        buildAgeSpecificPage({
          textTemplate: "いつも やさしく 笑ってくれる 二人の えがお。{childName}は その えがおが 大好きです。",
          pageVisualRole: "opening_establishing",
          imagePromptTemplate: withThankYouGrandparentImagePromptGuardrail("Establishing wide shot: The child and grandparents together in a cozy living room or a sunny garden. Everyone is smiling. Warm, soft light. Soft watercolor style."),
        }),
        buildAgeSpecificPage({
          textTemplate: "いっしょに お散歩に 行ったり、お花を 見たり。二人と すごす 時間は、とくべつな 宝物です。",
          pageVisualRole: "action",
          imagePromptTemplate: withThankYouGrandparentImagePromptGuardrail("Action shot: The child and grandparents walking together on a peaceful path or looking at flowers. Gentle movement. Soft watercolor style."),
        }),
        buildAgeSpecificPage({
          textTemplate: "おもしろい お話を 聞かせてくれたり、いっしょに 遊んでくれたり。{childName}は いつも わくわくします。",
          pageVisualRole: "discovery",
          imagePromptTemplate: withThankYouGrandparentImagePromptGuardrail("Medium shot: Grandparents showing the child a plain unmarked photo album or a toy. The child's eyes are full of curiosity. Soft watercolor style."),
        }),
        buildAgeSpecificPage({
          textTemplate: "ちょっと 転んで 泣いちゃったとき、やさしく 抱きしめてくれましたね。{childName}は すぐに 元気に なれました。",
          pageVisualRole: "setback_or_question",
          imagePromptTemplate: withThankYouGrandparentImagePromptGuardrail("Medium shot: A grandparent gently comforting the child. Tender and reassuring. Soft watercolor style."),
        }),
        buildAgeSpecificPage({
          textTemplate: "いっしょに 食べる ごはんは、せかいいち おいしい！ おじいちゃん、おばあちゃん、いつも ありがとう。",
          pageVisualRole: "object_detail",
          imagePromptTemplate: withThankYouGrandparentImagePromptGuardrail("Medium shot: The child and grandparents eating together at a table. Happy and warm atmosphere. Soft watercolor style."),
        }),
        buildAgeSpecificPage({
          textTemplate: "{childName}が 描いた え。 二人に 見せると、とっても 喜んでくれましたね。",
          pageVisualRole: "discovery",
          imagePromptTemplate: withThankYouGrandparentImagePromptGuardrail("Medium shot: The child showing a text-free colorful drawing to grandparents. Grandparents are reacting with great joy. Soft watercolor style."),
        }),
        buildAgeSpecificPage({
          textTemplate: "これからも、ずっと 元気で いてね。いっしょに たくさん 思い出を つくろうね。",
          pageVisualRole: "emotional_closeup",
          imagePromptTemplate: withThankYouGrandparentImagePromptGuardrail("Close-up: The child's sincere face, looking at grandparents with love. Emotional connection. Soft watercolor style."),
        }),
        buildAgeSpecificPage({
          textTemplate: "だいすきだよ！ ずっとずっと、ありがとう。{parentMessage}",
          pageVisualRole: "quiet_ending",
          imagePromptTemplate: withThankYouGrandparentImagePromptGuardrail("Wide shot: The child and grandparents sitting together, perhaps watching a sunset. Peaceful and affectionate ending. Soft watercolor style."),
        }),
      ],
    },
  },
  "fixed-moving-farewell": {
    name: "またあおうね",
    description: "引っ越しや転園でのさようなら。離れても変わらない友情と、新しい一歩を支える8ページ絵本",
    icon: "👋",
    categoryGroupId: "emotional-growth",
    subcategoryId: "farewell",
    parentIntent: "優しい子に育ってほしい。自信を持ってほしい",
    recommendedAgeMin: 3,
    recommendedAgeMax: 8,
    requiredInputs: ["childName"],
    optionalInputs: ["parentMessage"],
    themeTags: ["farewell", "moving", "friendship", "courage", "emotional-growth"],
    creationMode: "fixed_template",
    priceTier: "take",
    storyCostLevel: "none",
    sampleImageUrl: "/images/templates/fixed-moving-farewell.webp",
    sampleImageAlt: "お友達とさよならをする子どもの絵本イメージ",
    visualDirection: "Bittersweet but hopeful atmosphere, soft spring or autumn light, and strong bonds of friendship.",
    order: 125,
    active: true,
    systemPrompt: "固定テンプレートを使って、お友達との別れと新しい出会いを描く8ページの物語を作ります。",
    fixedStory: {
      titleTemplate: "また あおうね、ずっと ともだち",
      previewImageUrl: "/images/templates/fixed-moving-farewell.webp",
      coverImagePromptTemplate: withFarewellImagePromptGuardrail("Picture book cover: Two children (the protagonist and a best friend) holding hands or waving, with a few plain unmarked cardboard moving boxes in the background, bittersweet but hopeful expression, soft watercolor style, rich but not cluttered."),
      titleSpreadTextTemplate: "はなれても、ずっと ともだち",
      openingNarrationTemplate: "{childName}は、お引越しをすることになりました。お友達と お別れするのは、ちょっぴり さびしいけれど…",
      pageCount: 8,
      layoutVariant: "8_page",
      pages: [
        buildAgeSpecificPage({
          textTemplate: "おへやの おもちゃを 箱に つめます。がらんとした お部屋を 見て、{childName}は しんみりしました。",
          pageVisualRole: "opening_establishing",
          imagePromptTemplate: withFarewellImagePromptGuardrail("Establishing wide shot: The child in a partially empty room with plain unmarked cardboard moving boxes. A look of quiet sadness or reflection. Soft light. Soft watercolor style."),
        }),
        buildAgeSpecificPage({
          textTemplate: "だいすきな お友達に、おわかれを 言いに行きました。いっしょに 遊んだ 公園、わすれないよ。",
          pageVisualRole: "discovery",
          imagePromptTemplate: withFarewellImagePromptGuardrail("Wide shot: The child and a friend standing in their favorite playground or park. A sense of nostalgia. Soft watercolor style."),
        }),
        buildAgeSpecificPage({
          textTemplate: "「さびしいな…」 思わず なみだが こぼれそう。でも お友達が、ぎゅっと 手を にぎってくれました。",
          pageVisualRole: "setback_or_question",
          imagePromptTemplate: withFarewellImagePromptGuardrail("Medium shot: Two children holding hands, looking at each other with bittersweet expressions. Reassuring friendship. Soft watercolor style."),
        }),
        buildAgeSpecificPage({
          textTemplate: "「また あおうね！」「ずっと ともだちだよ！」 二人は 指切りを しました。",
          pageVisualRole: "action",
          imagePromptTemplate: withFarewellImagePromptGuardrail("Medium shot: Two children making a pinky promise (yubikiri). A strong bond of friendship. Soft watercolor style."),
        }),
        buildAgeSpecificPage({
          textTemplate: "あたらしい お家へ 出発の日。くるまの まどから 手を ふります。さようなら、また会う日まで！",
          pageVisualRole: "action",
          imagePromptTemplate: withFarewellImagePromptGuardrail("Wide shot: The child waving from a car window or at the front door. Family members are around. Hopeful farewell. Soft watercolor style."),
        }),
        buildAgeSpecificPage({
          textTemplate: "あたらしい 街。あたらしい お家。 ちょっぴり ドキドキするけれど、{childName}は 前を 向きます。",
          pageVisualRole: "opening_establishing",
          imagePromptTemplate: withFarewellImagePromptGuardrail("Wide shot: The child standing in front of a new house or a new park, looking around with curiosity. Bright light. Soft watercolor style."),
        }),
        buildAgeSpecificPage({
          textTemplate: "はなれていても、空は つながっているよ。だいすきな お友達のことを 思いだすと、勇気が わいてきます。",
          pageVisualRole: "emotional_closeup",
          imagePromptTemplate: withFarewellImagePromptGuardrail("Close-up: The child looking up at the sky with a gentle, brave smile. A look of inner strength. Soft watercolor style."),
        }),
        buildAgeSpecificPage({
          textTemplate: "あたらしい お友達も できるかな。さあ、一歩 踏み出そう！ {parentMessage}",
          pageVisualRole: "quiet_ending",
          imagePromptTemplate: withFarewellImagePromptGuardrail("Wide shot: The child taking a step forward on a new path, with a bright horizon ahead. Hopeful and positive ending. Soft watercolor style."),
        }),
      ],
    },
  },
  "fixed-first-birthday": {
    name: "はじめてのたんじょうび",
    description: "はじめての誕生日の思い出を、やさしく残せる固定テンプレート",
    icon: "🎂",
    categoryGroupId: "memories",
    subcategoryId: "first-birthday",
    parentIntent: "この瞬間を残したい",
    recommendedAgeMin: 1,
    recommendedAgeMax: 6,
    requiredInputs: ["childName", "familyMembers"],
    optionalInputs: ["parentMessage"],
    themeTags: ["memory", "birthday", "family"],
    availablePageCounts: [4, 8, 12],
    creationMode: "fixed_template",
    priceTier: "ume",
    storyCostLevel: "none",
    sampleImageUrl: "/images/templates/fixed-birthday-4p.webp",
    sampleImageAlt: "家族で誕生日をお祝いする子どものやさしい絵本イメージ",
    visualDirection:
      "Warm birthday memory picture-book mood with soft candlelight, family smiles, pastel balloons, and a keepsake-photo feeling.",
    order: 4,
    active: true,
    systemPrompt: "固定テンプレートを使って、はじめての誕生日の思い出をやさしく残す絵本を作ります。",
    fixedStory: {
      titleTemplate: "{childName}のはじめてのたんじょうび",
      previewImageUrl: "/images/templates/fixed-birthday-4p.webp",
      coverImagePromptTemplate:
        withFixedImagePromptSafety("Picture book cover illustration: a young child in front of a small birthday cake with family gathered close, warm indoor lights, soft pastel balloons, recurring tiny ribbon motif, joyful and tender keepsake mood, soft watercolor style, child-safe rounded composition, rich but not cluttered details, no text, no letters, no Japanese characters, no readable signs, no logo, no watermark"),
      titleSpreadTextTemplate: "{childName}の はじめての たんじょうび",
      openingNarrationTemplate:
        "ろうそくの あかりが、そっと ゆれる日。{childName}と {familyMembers}の たんじょうびの思い出が はじまります。",
      pages: [
        buildAgeSpecificPage({
          textTemplate: "{childName}は、{familyMembers}といっしょにおたんじょうびのじゅんびをはじめました。",
          baby_toddler: "{childName}、おたんじょうび。わくわく。",
          preschool_3_4:
            "{childName}は、{familyMembers}といっしょにおたんじょうびのじゅんびをはじめました。おへやが すこしずつ きらきらしてきます。",
          early_reader_5_6:
            "{childName}は、{familyMembers}といっしょに おたんじょうびの じゅんびを はじめました。ふうせんや かざりを 見ながら、どんな いちにちになるのか 胸が どきどきします。",
          early_elementary_7_8:
            "{childName}は、{familyMembers}といっしょに おたんじょうびの じゅんびを はじめました。いつもの へやが すこしずつ 特別な ばしょに 変わっていくのを見て、心が あたたかくなります。",
          general_child:
            "{childName}は、{familyMembers}といっしょにおたんじょうびのじゅんびをはじめました。おへやが すこしずつ きらきらしてきます。",
          pageVisualRole: "opening_establishing",
          imagePromptTemplate:
            withBirthdayImagePromptGuardrail("Setting: A cozy home living room during a birthday celebration. Establishing wide shot of a young child standing near a low table while family members decorate with pastel balloons and paper garlands. Soft warm light fills the room. A tiny ribbon motif appears on one balloon knot. Soft watercolor picture book style, layered foreground-midground-background, rich but not cluttered details."),
        }),
        buildAgeSpecificPage({
          textTemplate: "ろうそくのひかりがゆれて、{childName}の目もきらきらひかりました。",
          baby_toddler: "ろうそく きらきら。{childName}、にこっ。",
          preschool_3_4:
            "ろうそくのひかりがゆれて、{childName}の目も きらきらひかりました。みんなの えがおが まあるく あつまります。",
          early_reader_5_6:
            "ろうそくの ひかりが ゆれて、{childName}の目も きらきら ひかりました。ふーっと 息を すう前に、しあわせな きもちを ぎゅっと あつめます。",
          early_elementary_7_8:
            "ろうそくの ひかりが ゆれて、{childName}の目も きらきら ひかりました。みんなの まなざしが ひとつに 重なる その時間が、忘れたくない 記憶になります。",
          general_child:
            "ろうそくのひかりがゆれて、{childName}の目もきらきらひかりました。みんなの えがおが まあるく あつまります。",
          pageVisualRole: "discovery",
          imagePromptTemplate:
            withBirthdayImagePromptGuardrail("Setting: A cozy home living room during a birthday celebration. Medium shot of a child leaning toward a small birthday cake with softly glowing candles. Family members gather behind and beside the child, smiling with gentle anticipation. Warm candlelight highlights the child's eyes and cheeks. A tiny ribbon motif is tucked on a plate edge or cake stand. Soft watercolor picture book style, emotional family celebration framing, rich but not cluttered."),
        }),
        buildAgeSpecificPage({
          textTemplate: "おいわいのうたのあと、{childName}はとびきりのえがおを見せてくれました。",
          baby_toddler: "{childName}、にこにこ。うれしいね。",
          preschool_3_4:
            "おいわいのうたのあと、{childName}は とびきりの えがおを見せてくれました。みんなの えがおが、ろうそくのひかりみたいに ひろがります。",
          early_reader_5_6:
            "おいわいのうたのあと、{childName}は とびきりの えがおを 見せてくれました。たくさんの「おめでとう」が、心のなかで ひかる ほしみたいに のこります。",
          early_elementary_7_8:
            "おいわいのうたのあと、{childName}は とびきりの えがおを 見せてくれました。みんなに だいじに 思われていることが、ことばよりも まっすぐに 伝わる しゅんかんでした。",
          general_child:
            "おいわいのうたのあと、{childName}はとびきりのえがおを見せてくれました。みんなの えがおが、ろうそくのひかりみたいに ひろがります。",
          pageVisualRole: "emotional_closeup",
          imagePromptTemplate:
            withBirthdayImagePromptGuardrail("Setting: A cozy home living room during a birthday celebration. Close-up of the child's delighted face after the birthday song, cheeks glowing and eyes bright. The child holds a small spoon or keepsake near the chest while family members lean in with warm smiles in soft focus. A tiny ribbon motif appears on nearby party decor. Golden warm light and gentle pastel accents. Soft watercolor picture book style, intimate emotional framing, rich but not cluttered."),
        }),
        buildAgeSpecificPage({
          textTemplate: "{parentMessage}",
          baby_toddler: "{parentMessage}",
          preschool_3_4: "{parentMessage}",
          early_reader_5_6: "{parentMessage}",
          early_elementary_7_8: "{parentMessage}",
          general_child: "{parentMessage}",
          pageVisualRole: "quiet_ending",
          imagePromptTemplate:
            withBirthdayImagePromptGuardrail("Setting: A cozy home living room during a birthday celebration. Back-view quiet ending shot of child and family sitting together at the end of the birthday evening, looking at a few softly glowing decorations in a calm room. The child leans gently on a family member's shoulder. A tiny ribbon motif catches the last warm light near the table. Soft watercolor picture book style, peaceful afterglow mood, rich but not cluttered."),
        }),
      ],
    },
  },
  "fixed-first-birthday-8p": {
    name: "はじめてのたんじょうび（8ページ）",
    description: "はじめての誕生日を、準備からお祝いの余韻までゆっくり描く8ページ版です。",
    icon: "🎂",
    categoryGroupId: "memories",
    subcategoryId: "first-birthday",
    parentIntent: "この瞬間を残したい",
    recommendedAgeMin: 1,
    recommendedAgeMax: 6,
    requiredInputs: ["childName", "familyMembers"],
    optionalInputs: ["parentMessage"],
    themeTags: ["memory", "birthday", "family", "pilot-8-page"],
    creationMode: "fixed_template",
    priceTier: "ume",
    storyCostLevel: "none",
    sampleImageUrl: "/images/templates/fixed-birthday-4p.webp",
    sampleImageAlt: "家族で誕生日をお祝いする子どものやさしい絵本イメージ（8ページ版）",
    visualDirection:
      "Warm birthday memory picture-book mood with soft candlelight, family smiles, pastel balloons, and a keepsake-photo feeling over a gentle 8-page rhythm.",
    order: 4.5,
    active: true,
    systemPrompt: "固定テンプレートを使って、はじめての誕生日の思い出を8ページでゆっくり残す絵本を作ります。",
    fixedStory: {
      titleTemplate: "{childName}のはじめてのたんじょうび",
      previewImageUrl: "/images/templates/fixed-birthday-4p.webp",
      coverImagePromptTemplate:
        withFixedImagePromptSafety("Picture book cover illustration: a young child in front of a small birthday cake with family gathered close, warm indoor lights, soft pastel balloons, recurring tiny ribbon motif, joyful and tender keepsake mood, soft watercolor style, child-safe rounded composition, rich but not cluttered details, no text, no letters, no Japanese characters, no readable signs, no logo, no watermark"),
      titleSpreadTextTemplate: "{childName}の はじめての たんじょうび",
      openingNarrationTemplate:
        "あさの ひかりの なかで、きょうは ちょっと とくべつ。{childName}と {familyMembers}の たんじょうびの いちにちが はじまります。",
      pageCount: 8,
      layoutVariant: "8_page",
      pages: [
        buildAgeSpecificPage({
          textTemplate: "あさのおへやに、たんじょうびのけはいがそっとひろがりました。",
          baby_toddler: "あさだよ。おたんじょうび、わくわく。",
          preschool_3_4:
            "あさのおへやに、たんじょうびの けはいが そっと ひろがりました。{childName}の えがおも ぽっと ひかります。",
          early_reader_5_6:
            "あさのおへやに、たんじょうびの けはいが そっと ひろがりました。{childName}は いつもより はやく めがさめて、きょうの たのしみを かぞえます。",
          early_elementary_7_8:
            "あさのおへやに、たんじょうびの けはいが そっと ひろがりました。{childName}は ひとつ 大きくなる日の くうきを、胸の おくで しずかに かんじます。",
          general_child:
            "あさのおへやに、たんじょうびの けはいが そっと ひろがりました。{childName}の えがおも ぽっと ひかります。",
          pageVisualRole: "opening_establishing",
          imagePromptTemplate:
            withBirthdayImagePromptGuardrail("Establishing wide shot of a cozy home living room in gentle morning light on birthday day. A young child in pajamas stands near a curtain with soft sunlight. Family members prepare quietly in the background with pastel decorations not fully arranged yet. A tiny ribbon motif appears on a folded ribbon loop decoration. Soft watercolor picture book style, layered foreground-midground-background, warm and clean composition, rich but not cluttered details. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark."),
        }),
        buildAgeSpecificPage({
          textTemplate: "{familyMembers}といっしょに、かざりつけのじゅんびをたのしくすすめます。",
          baby_toddler: "ふうせん ぽん。いっしょに じゅんび。",
          preschool_3_4:
            "{familyMembers}といっしょに、かざりつけの じゅんびを たのしく すすめます。おへやが すこしずつ きらきらに なります。",
          early_reader_5_6:
            "{familyMembers}といっしょに、かざりつけの じゅんびを たのしく すすめます。{childName}も ふうせんを そっと ささえて、できたを ふやしていきます。",
          early_elementary_7_8:
            "{familyMembers}といっしょに、かざりつけの じゅんびを たのしく すすめます。{childName}は じぶんの 手で きょうの ぶたいを つくっていることが うれしくなりました。",
          general_child:
            "{familyMembers}といっしょに、かざりつけの じゅんびを たのしく すすめます。おへやが すこしずつ きらきらに なります。",
          pageVisualRole: "action",
          imagePromptTemplate:
            withBirthdayImagePromptGuardrail("Medium-wide action shot of a child and family decorating a living room with pastel balloons and solid-color ribbon loops. The child reaches up with help from family to place a decoration on a wall. Warm indoor daylight and soft shadows. A tiny ribbon motif appears on a balloon knot near the child. Soft watercolor picture book style, lively but gentle movement, rich but not cluttered details. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark."),
        }),
        buildAgeSpecificPage({
          textTemplate: "ケーキとろうそくを見つけた{childName}の目は、きらきらかがやきました。",
          baby_toddler: "ケーキ みつけた。ろうそく きらり。",
          preschool_3_4:
            "ケーキと ろうそくを 見つけた{childName}の 目は、きらきら かがやきました。うれしい こえが ふわっと ひろがります。",
          early_reader_5_6:
            "ケーキと ろうそくを 見つけた{childName}の 目は、きらきら かがやきました。ふーっと する前の どきどきが、胸のなかで 小さく はねます。",
          early_elementary_7_8:
            "ケーキと ろうそくを 見つけた{childName}の 目は、きらきら かがやきました。うれしさと すこしの きんちょうが まざる しゅんかんです。",
          general_child:
            "ケーキと ろうそくを 見つけた{childName}の 目は、きらきら かがやきました。うれしい こえが ふわっと ひろがります。",
          pageVisualRole: "discovery",
          imagePromptTemplate:
            withBirthdayImagePromptGuardrail("Medium shot of a child discovering a birthday cake with softly glowing candles on a table. Family members stand nearby with delighted expressions, hands gently clasped. Warm candlelight reflects in the child's eyes. A tiny ribbon motif appears in the scene. Soft watercolor picture book style, discovery-focused framing, rich but not cluttered details. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark."),
        }),
        buildAgeSpecificPage({
          textTemplate: "みんなの「おめでとう」があつまって、おへやいっぱいにひろがりました。",
          baby_toddler: "おめでとう。にこにこ いっぱい。",
          preschool_3_4:
            "みんなの「おめでとう」が あつまって、おへや いっぱいに ひろがりました。{childName}も にこっと わらいます。",
          early_reader_5_6:
            "みんなの「おめでとう」が あつまって、おへや いっぱいに ひろがりました。{childName}は 手を たたきながら、しあわせな 音を きいています。",
          early_elementary_7_8:
            "みんなの「おめでとう」が あつまって、おへや いっぱいに ひろがりました。{childName}は みんなの きもちが ひとつに なる あたたかさを かんじました。",
          general_child:
            "みんなの「おめでとう」が あつまって、おへや いっぱいに ひろがりました。{childName}も にこっと わらいます。",
          pageVisualRole: "payoff",
          imagePromptTemplate:
            withBirthdayImagePromptGuardrail("Wide celebration shot of child and family clapping and smiling around the birthday table after candle moment. Pastel paper bits drift softly in the air. Everyone faces the child with joyful expressions. A tiny ribbon motif is visible in the scene. Soft watercolor picture book style, clear celebratory composition, rich but not cluttered details. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark."),
        }),
        buildAgeSpecificPage({
          textTemplate: "だいじなプレゼントをそっと手にもって、{childName}はうれしそうに見つめました。",
          baby_toddler: "プレゼント だいじ。ぎゅっ。",
          preschool_3_4:
            "だいじな プレゼントを そっと 手に もって、{childName}は うれしそうに 見つめました。",
          early_reader_5_6:
            "だいじな プレゼントを そっと 手に もって、{childName}は うれしそうに 見つめました。どんな たからものに なるかなと 思いえがきます。",
          early_elementary_7_8:
            "だいじな プレゼントを そっと 手に もって、{childName}は うれしそうに 見つめました。ものに こもる 気持ちまで 受けとったようでした。",
          general_child:
            "だいじな プレゼントを そっと 手に もって、{childName}は うれしそうに 見つめました。",
          pageVisualRole: "object_detail",
          imagePromptTemplate:
            withBirthdayImagePromptGuardrail("Object-detail close shot of the child holding a small plain keepsake toy carefully with both hands. The soft texture, ribbon, and tiny fingers are in focus. Family smiles appear softly in the background. A tiny ribbon motif is visible softly in the background. Soft watercolor picture book style, object-focused intimate framing, rich but not cluttered details. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark."),
        }),
        buildAgeSpecificPage({
          textTemplate: "{childName}は、ひとつ大きくなった気もちを胸にそっとしまいました。",
          baby_toddler: "{childName}、ちょっぴり おにいさん おねえさん。",
          preschool_3_4:
            "{childName}は、ひとつ 大きくなった きもちを 胸に そっと しまいました。",
          early_reader_5_6:
            "{childName}は、ひとつ 大きくなった きもちを 胸に そっと しまいました。できたことを 思いだすと、こころが まっすぐに のびていきます。",
          early_elementary_7_8:
            "{childName}は、ひとつ 大きくなった きもちを 胸に そっと しまいました。きょうの ひかりが、これからの じぶんを そっと おしてくれるようでした。",
          general_child:
            "{childName}は、ひとつ 大きくなった きもちを 胸に そっと しまいました。",
          pageVisualRole: "emotional_closeup",
          imagePromptTemplate:
            withBirthdayImagePromptGuardrail("Close-up emotional shot of a child resting a hand on chest with a soft proud smile, seated near warm birthday lights after celebration. Family members are nearby in gentle soft focus, watching with affection. A tiny ribbon motif appears on a cushion beside the child. Soft watercolor picture book style, tender introspective framing, rich but not cluttered details. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark."),
        }),
        buildAgeSpecificPage({
          textTemplate: "みんなのえがおが、よるのやさしいひかりのなかでゆっくりほどけていきます。",
          baby_toddler: "えがお ぽかぽか。よる しずか。",
          preschool_3_4:
            "みんなの えがおが、よるの やさしい ひかりの なかで ゆっくり ほどけていきます。",
          early_reader_5_6:
            "みんなの えがおが、よるの やさしい ひかりの なかで ゆっくり ほどけていきます。たのしかった きょうの けしきが、こころに そっと のこります。",
          early_elementary_7_8:
            "みんなの えがおが、よるの やさしい ひかりの なかで ゆっくり ほどけていきます。にぎやかな 時間の あとに くる しずけさまで、だいじな 思い出に なりました。",
          general_child:
            "みんなの えがおが、よるの やさしい ひかりの なかで ゆっくり ほどけていきます。",
          pageVisualRole: "quiet_ending",
          imagePromptTemplate:
            withBirthdayImagePromptGuardrail("Wide quiet ending shot of child and family sitting together on a sofa in a softly lit evening room after birthday celebration. Decorations are still visible but calm, with warm amber light and gentle shadows. A tiny ribbon motif is visible in the scene. Soft watercolor picture book style, peaceful afterglow composition, rich but not cluttered details. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark."),
        }),
        buildAgeSpecificPage({
          textTemplate: "{parentMessage}",
          baby_toddler: "{parentMessage}",
          preschool_3_4: "{parentMessage}",
          early_reader_5_6: "{parentMessage}",
          early_elementary_7_8: "{parentMessage}",
          general_child: "{parentMessage}",
          pageVisualRole: "quiet_ending",
          imagePromptTemplate:
            withBirthdayImagePromptGuardrail("Back-view gentle closing shot of the child leaning on family at the end of birthday night, looking toward soft lights and a calm room. Mood is peaceful, affectionate, and reflective. A tiny ribbon motif catches the final warm light near the table edge. Soft watercolor picture book style, serene closing framing, rich but not cluttered details. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark."),
        }),
      ],
    },
  },
  "fixed-first-zoo-8p": {
    name: "はじめてのどうぶつえん（8ページ）",
    description: "はじめての動物園を、出発の朝から発見、少し成長した帰り道までゆっくり描く8ページ版です。",
    icon: "🦁",
    categoryGroupId: "memories",
    subcategoryId: "first-time",
    parentIntent: "この瞬間を残したい",
    recommendedAgeMin: 1,
    recommendedAgeMax: 6,
    requiredInputs: ["childName", "place", "familyMembers"],
    optionalInputs: ["parentMessage"],
    themeTags: ["memory", "zoo", "first outing", "pilot-8-page"],
    creationMode: "fixed_template",
    priceTier: "ume",
    storyCostLevel: "none",
    sampleImageUrl: "/images/templates/fixed-first-zoo.webp",
    sampleImageAlt: "家族と動物園を楽しむ子どものやさしい絵本イメージ（8ページ版）",
    visualDirection:
      "Gentle family memory picture-book cover with warm daylight, friendly zoo atmosphere, soft smiles, and a keepsake-photo feeling over a gentle 8-page rhythm.",
    order: 3.5,
    active: true,
    systemPrompt: "固定テンプレートを使って、はじめての動物園の思い出を8ページでゆっくり残す絵本を作ります。",
    fixedStory: {
      titleTemplate: "{childName}とはじめてのどうぶつえん",
      previewImageUrl: "/images/templates/fixed-first-zoo.webp",
      coverImagePromptTemplate:
        withFixedImagePromptSafety("Picture book cover illustration: a young child standing beside a decorative text-free zoo entrance arch with animal-shaped decorations and zoo paths, with family nearby, gentle daylight, warm welcoming atmosphere, soft watercolor style, recurring small yellow star motif tucked into the scene, child-safe and inviting composition, rich but not cluttered details, no text, no letters, no Japanese characters, no readable signs, no logo, no watermark, no storefront signs, NOT a sandbox, NOT a playground"),
      titleSpreadTextTemplate: "{childName}と はじめての どうぶつえん",
      openingNarrationTemplate:
        "きょうは とくべつな日。{childName}は {familyMembers}と いっしょに、はじめての どうぶつえんへ でかけます。どんな であいが まっているかな。",
      pageCount: 8,
      layoutVariant: "8_page",
      pages: [
        buildAgeSpecificPage({
          textTemplate: "どうぶつえんの あさは、でかける まえから わくわくがいっぱいです。",
          baby_toddler: "でかけるよ。わくわく。どうぶつえん。",
          preschool_3_4:
            "どうぶつえんの あさは、でかける まえから わくわくが いっぱいです。{childName}は てばやく じゅんびを すませます。",
          early_reader_5_6:
            "どうぶつえんの あさは、でかける まえから わくわくが いっぱいです。{childName}は まどから そとを みながら、どんな どうぶつと あえるかを かぞえます。",
          early_elementary_7_8:
            "どうぶつえんの あさは、でかける まえから わくわくが いっぱいです。{childName}は {familyMembers}と いっしょに でかける まえの その じかんまで たのしく なります。",
          general_child:
            "どうぶつえんの あさは、でかける まえから わくわくが いっぱいです。{childName}は てばやく じゅんびを すませます。",
          pageVisualRole: "opening_establishing",
          imagePromptTemplate:
            withZooImagePromptGuardrail("Setting: cozy home in morning light before a zoo outing. Establishing wide shot of a young child in a sunlit room ready to go out, wearing a backpack or hat, standing near the front door with family. Family members are smiling and preparing to leave. Warm golden morning light streams through a window. A small yellow star motif is tucked on the child's bag strap or hat. Soft watercolor picture book style, gentle anticipation mood, layered foreground-midground-background, rich but not cluttered."),
        }),
        buildAgeSpecificPage({
          textTemplate: "{childName}は、{familyMembers}といっしょに{place}のいりぐちに つきました。",
          baby_toddler: "{place}に ついたよ。いりぐち、おおきい。",
          preschool_3_4:
            "{childName}は、{familyMembers}といっしょに{place}のいりぐちに つきました。たかい ゲートを みあげて、こころが はずみます。",
          early_reader_5_6:
            "{childName}は、{familyMembers}といっしょに{place}のいりぐちに つきました。いりぐちの ちずを みながら、つぎは どこへ いこうかと そうぞうが ひろがります。",
          early_elementary_7_8:
            "{childName}は、{familyMembers}といっしょに{place}のいりぐちに つきました。はじめての ばしょの においと おとが、{childName}のまわりを つつみます。",
          general_child:
            "{childName}は、{familyMembers}といっしょに{place}のいりぐちに つきました。たかい ゲートを みあげて、こころが はずみます。",
          pageVisualRole: "action",
          imagePromptTemplate:
            withZooImagePromptGuardrail("Setting: zoo entrance path with family, animal enclosures and trees. Wide establishing shot of a young child arriving at a friendly zoo entrance with family. The child stands near a tree-lined path just inside the entrance, looking up with excitement at the arch. Family members walk beside the child. A decorative text-free entrance arch frames the top. Use only a welcoming leafy threshold, open gate, trees, and path with no side boards, no map panels, no admission notices, and no posted signs anywhere in view. Dress the child in plain child-safe clothing with simple solid-color fabric only; no shirt lettering, no logo patches, no mascot prints, no badge text, and no decorative number or alphabet graphics on clothing, backpack, hat, or shoes. A small yellow star motif is tucked into the arch decoration. Gentle morning daylight with warm golden tones. Lush green trees and a winding path leading inward. Soft watercolor picture book style, soft painterly watercolor texture, no hard outlines, rich watercolor pigment blooms, rounded child-safe shapes, rich but not cluttered background details. Keep all entrance, gate, ticket, map, board, and panel surfaces plain and unmarked, with no readable text, pseudo-text, letters, numbers, logos, symbols, or text-like marks.", { signText: true, clothingText: true }),
        }),
        buildAgeSpecificPage({
          textTemplate: "おおきな どうぶつを みつけた{childName}は、声も でないほど びっくりしました。",
          baby_toddler: "ぞうさん、おおきい。びっくり。",
          preschool_3_4:
            "おおきな どうぶつを みつけた{childName}は、声も でないほど びっくりしました。でも、すぐに もっと みたくて まえへ すすみます。",
          early_reader_5_6:
            "おおきな どうぶつを みつけた{childName}は、声も でないほど びっくりしました。こんなに おおきな いきものが よこに いることが、ふしぎで うれしくて なりませんでした。",
          early_elementary_7_8:
            "おおきな どうぶつを みつけた{childName}は、声も でないほど びっくりしました。その おおきさと やさしさが おなじ いきものに あることを、{childName}は からだで かんじます。",
          general_child:
            "おおきな どうぶつを みつけた{childName}は、声も でないほど びっくりしました。でも、すぐに もっと みたくて まえへ すすみます。",
          pageVisualRole: "discovery",
          imagePromptTemplate:
            withZooImagePromptGuardrail("Setting: viewing animal enclosures from a safe path inside the zoo. Medium shot of a child at a zoo animal enclosure, leaning forward with wide eyes looking up at a large friendly elephant or giraffe in the mid-ground. The child points with one hand, the other holding a parent's hand. Family members stand behind with smiles. A small yellow star motif is tucked on a fence post nearby. Warm daylight filtering through leafy trees. Soft watercolor picture book style, clear foreground-midground-background layering, sense of wonder and scale, rich but not cluttered. Keep enclosure fences, animal-name placards, background boards, and text-bearing objects plain or out of view, with no readable text, pseudo-text, letters, numbers, logos, or printed marks. Keep the habitat natural and uncluttered with plain fence rhythm only, and no panel-like objects in view.", { signText: true }),
        }),
        buildAgeSpecificPage({
          textTemplate: "ちいさな どうぶつたちの うごきに、{childName}の 目が くぎづけになりました。",
          baby_toddler: "ちいさい。かわいい。みてみて。",
          preschool_3_4:
            "ちいさな どうぶつたちの うごきに、{childName}の 目が くぎづけになりました。すこしも じっと してくれません。",
          early_reader_5_6:
            "ちいさな どうぶつたちの うごきに、{childName}の 目が くぎづけになりました。ぴょんと とびはねる たびに、{childName}も おなじように からだが うごきます。",
          early_elementary_7_8:
            "ちいさな どうぶつたちの うごきに、{childName}の 目が くぎづけになりました。おおきさは ちがうけれど、どうぶつたちも せいいっぱい いきているのだと きがつきます。",
          general_child:
            "ちいさな どうぶつたちの うごきに、{childName}の 目が くぎづけになりました。すこしも じっと してくれません。",
          pageVisualRole: "object_detail",
          imagePromptTemplate:
            withZooImagePromptGuardrail("Setting: zoo viewing area with animals in the distance. Object-detail shot showing a small lively animal close up — a bunny, meerkat, or small colorful bird — in sharp focus, while the child leans in with bright curious eyes in the foreground. The animal is mid-movement: hopping, standing, or tilting its head. A small yellow star motif is visible on a pebble or log in the enclosure. Soft warm daylight. Soft watercolor picture book style, lively but gentle close-detail framing, rich but not cluttered."),
        }),
        buildAgeSpecificPage({
          textTemplate: "あるどうぶつの まえで、{childName}は すこし どきどきしました。",
          baby_toddler: "どきどき。でも、だいじょうぶ。",
          preschool_3_4:
            "あるどうぶつの まえで、{childName}は すこし どきどきしました。{familyMembers}の てを ぎゅっと にぎります。",
          early_reader_5_6:
            "あるどうぶつの まえで、{childName}は すこし どきどきしました。こえや うごきが おもっていたより おおきくて、いっぽ うしろへ さがります。",
          early_elementary_7_8:
            "あるどうぶつの まえで、{childName}は すこし どきどきしました。それでも にげず、そこに いつづけた {childName}は、すこし ゆうきが でた きがしました。",
          general_child:
            "あるどうぶつの まえで、{childName}は すこし どきどきしました。{familyMembers}の てを ぎゅっと にぎります。",
          pageVisualRole: "setback_or_question",
          imagePromptTemplate:
            withZooImagePromptGuardrail("Setting: viewing animal enclosures from a safe path inside the zoo. Medium shot of the child taking a small step back or gripping a family member's hand, eyes wide and uncertain, while a large animal in the mid-ground makes a movement or sound. Family member crouches beside the child with a reassuring gentle expression. A small yellow star motif is on the fence post. Soft watercolor picture book style, gentle tension without fear, rich but not cluttered. Use body language and fence rhythm only to communicate caution or surprise, never warning signs or notice boards. Do not include caution notices, warning notices, notice boards, guide panels, animal-name placards, readable text, pseudo-text, letters, numbers, logos, symbols, or text-like marks. Use plain background shapes if a panel-like object is needed.", { signText: true }),
        }),
        buildAgeSpecificPage({
          textTemplate: "よく みると、どうぶつたちは みんな やさしい めを していました。",
          baby_toddler: "やさしい め。なかよし。",
          preschool_3_4:
            "よく みると、どうぶつたちは みんな やさしい めを していました。{childName}の どきどきが、すうっと やわらいでいきます。",
          early_reader_5_6:
            "よく みると、どうぶつたちは みんな やさしい めを していました。こわいと おもっていた どうぶつも、じっと みつめると まるで ともだちに なれそうな きがします。",
          early_elementary_7_8:
            "よく みると、どうぶつたちは みんな やさしい めを していました。{childName}は、みかけで きめつけないで よかったと、こころの なかで うなずきます。",
          general_child:
            "よく みると、どうぶつたちは みんな やさしい めを していました。{childName}の どきどきが、すうっと やわらいでいきます。",
          pageVisualRole: "emotional_closeup",
          imagePromptTemplate:
            withZooImagePromptGuardrail("Setting: zoo viewing area with animals in the distance, emotional turning point. Close-up shot focused on the gentle eyes of a friendly animal — a giraffe, deer, or calm elephant — filling the left side of the frame. The child's face appears in soft foreground on the right, looking at the animal with wonder and growing warmth, no longer afraid. A small yellow star motif appears on a nearby leaf or rock. Warm afternoon light. Soft watercolor picture book style, intimate eye-to-eye emotional framing, rich but not cluttered.", { clothingText: true }),
        }),
        buildAgeSpecificPage({
          textTemplate: "かえりみちに、きょう みた けしきを {childName}は こころに しまいました。",
          baby_toddler: "かえろ。たのしかった。ぽかぽか。",
          preschool_3_4:
            "かえりみちに、きょう みた けしきを {childName}は こころに しまいました。また きたいな、と そっと つぶやきます。",
          early_reader_5_6:
            "かえりみちに、きょう みた けしきを {childName}は こころに しまいました。どのどうぶつが いちばん すきだったかを {familyMembers}に はなしながら あるきます。",
          early_elementary_7_8:
            "かえりみちに、きょう みた けしきを {childName}は こころに しまいました。はじめて みるものが、ずっと のこる たからものに なるのだと {childName}は しりました。",
          general_child:
            "かえりみちに、きょう みた けしきを {childName}は こころに しまいました。また きたいな、と そっと つぶやきます。",
          pageVisualRole: "quiet_ending",
          imagePromptTemplate:
            withZooImagePromptGuardrail("Setting: quiet zoo path at sunset leaving the zoo. Back-view wide shot of the child and family walking away from the zoo toward a golden-hour sunset. A gentle tree-lined path stretches ahead. The child holds a parent's hand, looking slightly back with a content smile. A small yellow star motif glows softly in the evening sky. Warm amber and soft pink sunset tones. Soft watercolor picture book style, peaceful farewell composition, rich but not cluttered. Simplify the exit scene to trees, path, sky glow, and family silhouette only. Avoid exit markers, direction boards, facility wayfinding, maps, readable text, pseudo-text, letters, numbers, logos, or symbols. Use a simple plain arch or path instead of labeled wayfinding, and keep any background structures plain, distant, and unmarked.", { signText: true }),
        }),
        buildAgeSpecificPage({
          textTemplate: "{parentMessage}",
          baby_toddler: "{parentMessage}",
          preschool_3_4: "{parentMessage}",
          early_reader_5_6: "{parentMessage}",
          early_elementary_7_8: "{parentMessage}",
          general_child: "{parentMessage}",
          pageVisualRole: "quiet_ending",
          imagePromptTemplate:
            withZooImagePromptGuardrail("Setting: quiet zoo path at sunset leaving the zoo — peaceful closing moment. Back-view wide shot of the child leaning gently on a family member's shoulder at the end of the zoo day, looking toward a soft sunset or warm home light ahead. The child holds a small leaf-shaped keepsake toy in one hand. A small yellow star motif glows near a round paper light or evening sky. Soft amber and violet dusk tones. Soft watercolor picture book style, serene and affectionate closing framing, rich but not cluttered. Keep any background buildings, lamps, fences, or zoo structures plain, distant, and unmarked, with no signboards, no building labels, and no printed surfaces anywhere in view.", { signText: true }),
        }),
      ],
    },
  },
  "fixed-bedtime-good-day": {
    name: "きょうもいい日だったね",
    description: "寝る前に短く読める、安心感のあるおやすみテンプレート",
    icon: "🛏️",
    categoryGroupId: "bedtime",
    subcategoryId: "good-night",
    parentIntent: "今日も安心して眠ってほしい",
    recommendedAgeMin: 1,
    recommendedAgeMax: 6,
    requiredInputs: ["childName"],
    optionalInputs: ["parentMessage"],
    themeTags: ["bedtime", "good day", "sleep"],
    creationMode: "fixed_template",
    priceTier: "ume",
    storyCostLevel: "none",
    sampleImageUrl: "/images/templates/fixed-bedtime-good-day.webp",
    sampleImageAlt: "寝る前に安心して眠る子どものやさしい絵本イメージ",
    visualDirection:
      "Cozy sleepy bedtime storybook mood with moonlight, soft blankets, tiny stars, quiet room, and reassuring end-of-day warmth.",
    order: 2,
    active: true,
    systemPrompt: "固定テンプレートを使って、寝る前に安心して眠れる短い絵本を作ります。",
    fixedStory: {
      previewImageUrl: "/images/templates/fixed-bedtime-good-day.webp",
      titleTemplate: "きょうもいい日だったね、{childName}",
      coverImagePromptTemplate:
        withFixedImagePromptSafety("Picture book cover illustration: a young child in cozy pajamas in a warm bedroom at dusk, soft moonlight through the window, favorite stuffed toy nearby, recurring small star motif, peaceful sleepy mood, soft watercolor style, child-safe gentle composition, rich but not cluttered details, no text, no letters, no Japanese characters, no readable signs, no logo, no watermark"),
      titleSpreadTextTemplate: "きょうも いい日だったね、{childName}",
      openingNarrationTemplate:
        "よるが やさしく やってきました。{childName}の きょう一日を、ゆっくり ふりかえってみましょう。",
      pages: [
        buildAgeSpecificPage({
          textTemplate: "{childName}は、きょうもたのしいじかんをすごしました。",
          baby_toddler: "{childName}、きょうも たのしかったね。",
          preschool_3_4:
            "{childName}は、きょうもたのしいじかんをすごしました。おへやには やさしい よるが やってきます。",
          early_reader_5_6:
            "{childName}は、きょうもたのしいじかんを すごしました。おもちゃを みわたしながら、どんなことが いちばん うれしかったかなと そっと 思いだします。",
          early_elementary_7_8:
            "{childName}は、きょうもたのしいじかんを すごしました。ゆっくり くらくなる まどのそとを見ながら、こころが やさしくなっていきます。",
          general_child:
            "{childName}は、きょうもたのしいじかんをすごしました。おへやには やさしい よるが やってきます。",
          pageVisualRole: "opening_establishing",
          imagePromptTemplate:
            withBedtimeGoodDayImagePromptGuardrail("Setting: Cozy child bedroom at early evening. Establishing wide shot of a young child sitting on the floor surrounded by toys and picture books, looking toward a window where dusk light streams in. A warm bedside lamp glows in the corner. Curtains frame the window with a deep blue-purple sky outside. A small star motif is tucked into the lampshade or blanket. Soft watercolor picture book style, warm amber and lavender tones, child-safe rounded shapes, rich but not cluttered."),
        }),
        buildAgeSpecificPage({
          textTemplate: "うれしかったことを、ひとつずつこころにあつめます。",
          baby_toddler: "うれしいね。ぽかぽか。",
          preschool_3_4:
            "うれしかったことを、ひとつずつ こころに あつめます。にこにこした ことが、まだ きらきらしています。",
          early_reader_5_6:
            "うれしかったことを、ひとつずつ こころに あつめます。いちばん たのしかった しゅんかんを 思いだすと、むねのなかで ほしが ひとつ 光るようでした。",
          early_elementary_7_8:
            "うれしかったことを、ひとつずつ こころに あつめます。いちばん たのしかった しゅんかんが、ふんわり 光っています。",
          general_child:
            "うれしかったことを、ひとつずつ こころに あつめます。にこにこした ことが、まだ きらきらしています。",
          pageVisualRole: "discovery",
          imagePromptTemplate:
            withBedtimeGoodDayImagePromptGuardrail("Setting: Child's bedroom rug area with a warm lamp. Medium shot of a child sitting cross-legged on a soft rug, holding a small keepsake from the day (a leaf, a drawing, or a toy). The child looks down at it with a gentle, reflective smile. Small meaningful objects from the day are scattered nearby. A small star motif appears on a cushion or picture frame. Soft watercolor picture book style, warm introspective mood, rich but not cluttered."),
        }),
        buildAgeSpecificPage({
          textTemplate: "おふとんに入ると、こころがふわっとやわらかくなりました。",
          baby_toddler: "おふとん ふわっ。おやすみ。",
          preschool_3_4:
            "おふとんに入ると、こころが ふわっと やわらかくなりました。もう だいじょうぶ、おやすみの じかんです。",
          early_reader_5_6:
            "おふとんに入ると、こころが ふわっと やわらかくなりました。きょうの ちいさな できたことが、あしたも がんばれる ひかりに かわっていきます。",
          early_elementary_7_8:
            "おふとんに入ると、こころが ふわっと やわらかくなりました。きょうの できごとも、さっと やさしい くもの ような ことばで つつまれていきます。",
          general_child:
            "おふとんに入ると、こころが ふわっと やわらかくなりました。もう だいじょうぶ、おやすみの じかんです。",
          pageVisualRole: "emotional_closeup",
          imagePromptTemplate:
            withBedtimeGoodDayImagePromptGuardrail("Setting: Child's bed area with a window showing moonlight. Close-up of a child snuggling into a fluffy blanket, hugging a favorite stuffed animal with both hands. Eyes half-closed with a peaceful, content expression. A pillow and soft sheets surround the child. A small star motif appears on the stuffed animal or pillowcase. Soft watercolor picture book style, intimate peaceful framing, warm ivory and soft blue tones, rich but not cluttered."),
        }),
        buildAgeSpecificPage({
          textTemplate: "{parentMessage}",
          baby_toddler: "{parentMessage}",
          preschool_3_4: "{parentMessage}",
          early_reader_5_6: "{parentMessage}",
          early_elementary_7_8: "{parentMessage}",
          general_child: "{parentMessage}",
          pageVisualRole: "quiet_ending",
          imagePromptTemplate:
            withBedtimeGoodDayImagePromptGuardrail("Setting: Peaceful bedroom at night. Wide shot of the child asleep in bed, viewed from slightly above. The room is bathed in soft moonlight. A favorite stuffed toy rests beside the child. Stars twinkle outside the window. A small star motif glows gently near the windowsill or on the blanket edge. Soft watercolor picture book style, quiet lullaby composition, rich but not cluttered."),
        }),
      ],
    },
  },
  "fixed-brush-teeth": {
    name: "はみがきできたよ",
    description: "寝る前のはみがきを、やさしく応援できる固定テンプレート",
    icon: "🪥",
    categoryGroupId: "growth-support",
    subcategoryId: "daily-habit",
    parentIntent: "できるようになってほしい。でも怒らず応援したい",
    recommendedAgeMin: 2,
    recommendedAgeMax: 6,
    requiredInputs: ["childName"],
    optionalInputs: ["parentMessage"],
    themeTags: ["teeth", "habit", "bedtime"],
    availablePageCounts: [4, 8, 12],
    creationMode: "fixed_template",
    priceTier: "ume",
    storyCostLevel: "none",
    sampleImageUrl: "/images/templates/fixed-brush-teeth.webp",
    sampleImageAlt: "はみがきをがんばる子どものやさしい絵本イメージ",
    visualDirection:
      "Bright but calm daily-habit picture-book mood with clean bathroom setting, rounded shapes, friendly routine support, and reassuring smiles.",
    order: 7,
    active: true,
    systemPrompt: "固定テンプレートを使って、はみがきをやさしく応援する短い絵本を作ります。",
    fixedStory: {
      previewImageUrl: "/images/templates/fixed-brush-teeth.webp",
      titleTemplate: "{childName}のはみがきできたよ",
      coverImagePromptTemplate:
        withBrushTeethImagePromptGuardrail("Picture book cover illustration: a cheerful preschool child with short dark bob hair, wearing mint-green pajamas, holding a colorful toothbrush in a bright clean bathroom, fresh morning or evening light, friendly mirror reflection, recurring shining star motif, encouraging cheerful heroic mood, soft watercolor style, child-safe rounded composition, rich but not cluttered details"),
      titleSpreadTextTemplate: "{childName}の はみがき できたよ",
      openingNarrationTemplate:
        "きょうも はみがきの じかんが やってきました。{childName}は どんなふうに がんばるかな。",
      pages: [
        buildAgeSpecificPage({
          textTemplate: "{childName}は、きょうもおくちをあーん。",
          baby_toddler: "{childName}、あーん。",
          preschool_3_4: "{childName}は、きょうもおくちをあーん。",
          early_reader_5_6:
            "{childName}は、きょうもおくちをあーん。じぶんで はぶらしを もって、やってみるきもちになりました。",
          early_elementary_7_8:
            "{childName}は、きょうもおくちをあーん。きれいな はにするために、じぶんで はぶらしをにぎって はじめてみます。",
          general_child: "{childName}は、きょうもおくちをあーん。",
          pageVisualRole: "opening_establishing",
          imagePromptTemplate:
            withBrushTeethImagePromptGuardrail("Establishing wide shot of a preschool child standing on a small step stool in a bright, clean bathroom. The child, with short dark hair and mint-green pajamas, reaches for a colorful toothbrush in a cup on the sink counter. A friendly mirror reflects the child's eager face. Toothpaste, a rinse cup, and a hand towel are neatly arranged. A small shining star motif is tucked on the cup or mirror corner. Bright morning light from a window. Soft watercolor picture book style, rounded child-safe shapes, rich but not cluttered."),
        }),
        buildAgeSpecificPage({
          textTemplate: "しゃかしゃか、こしこし。すこしずつ、おくちがきれいになります。",
          baby_toddler: "しゃかしゃか。ぴかぴか。",
          preschool_3_4: "しゃかしゃか、こしこし。すこしずつ、おくちがきれいになります。",
          early_reader_5_6:
            "しゃかしゃか、こしこし。みがきにくい ところも、ゆっくり うごかすと すこしずつ きれいになります。",
          early_elementary_7_8:
            "しゃかしゃか、こしこし。おくばや はのうらも わすれないように、かがみを見ながら ていねいに みがいていきます。",
          general_child: "しゃかしゃか、こしこし。すこしずつ、おくちがきれいになります。",
          pageVisualRole: "action",
          imagePromptTemplate:
            withBrushTeethImagePromptGuardrail("Medium action shot of the child with short dark hair and mint-green pajamas actively brushing teeth with hero-like concentration. The child holds the toothbrush with both small hands, mouth slightly open with gentle white foam. A friendly mirror shows the child's focused, determined expression. Soft bubbles float near the sink. A small shining star motif appears on the toothbrush handle. Clean, bright bathroom setting. Soft watercolor picture book style, dynamic but gentle composition, rich but not cluttered."),
        }),
        buildAgeSpecificPage({
          textTemplate: "おわったあと、{childName}はちょっぴりうれしそうでした。",
          baby_toddler: "{childName}、にこっ。",
          preschool_3_4: "おわったあと、{childName}はちょっぴりうれしそうでした。",
          early_reader_5_6:
            "おわったあと、{childName}は にっこり。じぶんで できたことが うれしくて、むねが ぽっと あたたかくなりました。",
          early_elementary_7_8:
            "みがきおわると、{childName}は にっこりしました。すこし むずかしくても さいごまでできたことが、自信につながったのです。",
          general_child: "おわったあと、{childName}はちょっぴりうれしそうでした。",
          pageVisualRole: "emotional_closeup",
          imagePromptTemplate:
            withBrushTeethImagePromptGuardrail("Close-up of the child's proud, beaming smile after finishing brushing teeth. Sparkling clean teeth visible in a wide grin. The child, in mint-green pajamas, holds up the toothbrush triumphantly like a tiny hero. The mirror behind reflects the happy moment. A small shining star motif glows near the child. Warm encouraging light. Soft watercolor picture book style, celebratory hero-like framing, rich but not cluttered."),
        }),
        buildAgeSpecificPage({
          textTemplate: "{parentMessage}",
          pageVisualRole: "quiet_ending",
          imagePromptTemplate:
            withBrushTeethImagePromptGuardrail("Wide warm shot of a parent and child together at the bathroom doorway, seen from side view. The child, in mint-green pajamas, holds the parent's hand, looking up with a satisfied smile. The bathroom is tidy behind them. A hallway beckons warmly ahead. A small shining star motif is visible on a doorframe. Soft evening glow. Soft watercolor picture book style, peaceful transition composition, rich but not cluttered."),
        }),
      ],
    },
  },
  "fixed-bedtime-good-day-8p": {
    name: "きょうもいい日だったね（8ページ）",
    description: "寝る前の一日をゆっくり振り返り、安心して眠りにつく8ページ版です。",
    icon: "🛏️",
    categoryGroupId: "bedtime",
    subcategoryId: "good-night",
    parentIntent: "今日も安心して眠ってほしい",
    recommendedAgeMin: 1,
    recommendedAgeMax: 6,
    requiredInputs: ["childName"],
    optionalInputs: ["parentMessage"],
    themeTags: ["bedtime", "good day", "sleep", "pilot-8-page"],
    creationMode: "fixed_template",
    priceTier: "ume",
    storyCostLevel: "none",
    sampleImageUrl: "/images/templates/fixed-bedtime-good-day.webp",
    sampleImageAlt: "寝る前に安心して眠る子どものやさしい絵本イメージ（8ページ版）",
    visualDirection:
      "Cozy sleepy bedtime storybook mood with moonlight, soft blankets, tiny stars, quiet room, and reassuring end-of-day warmth over a gentle 8-page rhythm.",
    order: 2.5,
    active: true,
    systemPrompt: "固定テンプレートを使って、寝る前に安心して眠れる8ページの絵本を作ります。",
    fixedStory: {
      titleTemplate: "きょうもいい日だったね、{childName}",
      previewImageUrl: "/images/templates/fixed-bedtime-good-day.webp",
      coverImagePromptTemplate:
        withFixedImagePromptSafety("Picture book cover illustration: a young child in cozy pajamas in a warm bedroom at dusk, soft moonlight through the window, favorite stuffed toy nearby, recurring small star motif, peaceful sleepy mood, soft watercolor style, child-safe gentle composition, rich but not cluttered details, no text, no letters, no Japanese characters, no readable signs, no logo, no watermark"),
      titleSpreadTextTemplate: "きょうも いい日だったね、{childName}",
      openingNarrationTemplate:
        "よるが やさしく やってきました。{childName}の きょう一日を、ゆっくり ふりかえってみましょう。",
      pageCount: 8,
      layoutVariant: "8_page",
      pages: [
        buildAgeSpecificPage({
          textTemplate: "{childName}は、きょうもたのしいじかんをすごしました。おへやを おかたづけして、よるの じゅんびです。",
          baby_toddler: "{childName}、おかたづけ。よるだよ。",
          preschool_3_4:
            "{childName}は、きょうも たのしい じかんを すごしました。おへやを おかたづけして、よるの じゅんびを はじめます。",
          early_reader_5_6:
            "{childName}は、きょうも たのしい じかんを すごしました。おもちゃを きちんと ならべながら、あしたの ぼうけんを おもい描きます。",
          early_elementary_7_8:
            "{childName}は、きょうも たのしい じかんを すごしました。にぎやかだった おへやが しずかになっていくのを かんじながら、こころを おちつかせます。",
          general_child:
            "{childName}は、きょうも たのしい じかんを すごしました。おへやを おかたづけして、よるの じゅんびを はじめます。",
          pageVisualRole: "opening_establishing",
          imagePromptTemplate:
            withBedtimeGoodDay8pImagePromptGuardrail("Establishing wide shot of a cozy child bedroom at early evening. The child stands in the middle of the room, tidying up a few wooden blocks near a toy box. A warm bedside lamp glows in the corner. Curtains frame the window with a deep blue-purple sky outside. A small star motif is tucked into the lampshade. Soft watercolor picture book style, warm amber and lavender tones, child-safe rounded shapes, rich but not cluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark."),
        }),
        buildAgeSpecificPage({
          textTemplate: "ふわふわのパジャマに きがえて、こころも ぽかぽか。もうすぐ おやすみの じかんです。",
          baby_toddler: "パジャマ、ふわふわ。きがえよう。",
          preschool_3_4:
            "ふわふわの パジャマに きがえて、こころも ぽかぽか。もうすぐ おやすみの じかんです。",
          early_reader_5_6:
            "ふわふわの パジャマに きがえて、こころも ぽかぽか。きいろい パジャマが、{childName}を やさしく つつみます。",
          early_elementary_7_8:
            "ふわふわの パジャマに きがえると、からだの ちからが すうっと ぬけていきます。きょうの おわりが、すぐ そこまで きています。",
          general_child:
            "ふわふわの パジャマに きがえて、こころも ぽかぽか。もうすぐ おやすみの じかんです。",
          pageVisualRole: "action",
          imagePromptTemplate:
            withBedtimeGoodDay8pImagePromptGuardrail("Medium shot of a child sitting on the bed, putting on soft yellow pajamas with a small simple duckling pattern. The child looks content and relaxed. A white rabbit plush toy sits on the pillow nearby. Soft indoor light. Watercolor picture book style, warm and clean composition, rich but not cluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark."),
        }),
        buildAgeSpecificPage({
          textTemplate: "きょう みつけた とくべつな はっぱ。だいじに てにもって、にこにこ。",
          baby_toddler: "はっぱ、みつけた。きれいにね。",
          preschool_3_4:
            "きょう みつけた とくべつな はっぱ。だいじに てに もって、にこにこ。",
          early_reader_5_6:
            "きょう みつけた とくべつな はっぱを 見つめます。おさんぽの ときに 見つけた、たからものです。",
          early_elementary_7_8:
            "きょう みつけた とくべつな はっぱを 手のひらに のせてみます。しぜんの いろが、{childName}の こころを あたためてくれます。",
          general_child:
            "きょう みつけた とくべつな はっぱ。だいじに てに もって、にこにこ。",
          pageVisualRole: "discovery",
          imagePromptTemplate:
            withBedtimeGoodDay8pImagePromptGuardrail("Medium discovery shot of a child sitting on a soft rug, holding a single bright autumn leaf carefully in both hands. The child gazes at it with a gentle, reflective smile. A warm lamp casts a soft orange glow. A small star motif appears on a nearby cushion. Soft watercolor picture book style, warm introspective mood, rich but not cluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark."),
        }),
        buildAgeSpecificPage({
          textTemplate: "かいたばかりの えを ながめて、たのしかったことを おもいだします。",
          baby_toddler: "おえかき、たのしいね。にこにこ。",
          preschool_3_4:
            "かいたばかりの えを ながめて、たのしかったことを おもいだします。",
          early_reader_5_6:
            "かいたばかりの えを ながめて、きょうの ぼうけんを ふりかえります。いろとりどりの せかいが、かみの うえに ひろがっています。",
          early_elementary_7_8:
            "かいたばかりの えを ながめながら、じぶんが つくった ものの あたたかさを かんじます。おえかきの じかんも、だいじな おもいでです。",
          general_child:
            "かいたばかりの えを ながめて、たのしかったことを おもいだします。",
          pageVisualRole: "object_detail",
          imagePromptTemplate:
            withBedtimeGoodDay8pImagePromptGuardrail("Object-detail shot of a child's small hands holding a colorful drawing of a sun and flowers. The child is looking down at the drawing with pride. The paper has soft edges and simple child-like strokes with no text or letters. A small star motif is visible on the rug. Soft watercolor picture book style, intimate object-focused framing, rich but not cluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark."),
        }),
        buildAgeSpecificPage({
          textTemplate: "うれしかったことを、ひとつずつこころにあつめると、むねが ぽかぽか してきました。",
          baby_toddler: "うれしいね。ぽかぽか。",
          preschool_3_4:
            "うれしかったことを、ひとつずつ こころに あつめると、むねが ぽかぽか してきました。",
          early_reader_5_6:
            "うれしかったことを、ひとつずつ こころに あつめます。いちばん たのしかった しゅんかんを おもいだすと、むねのなかで ほしが ひとつ 光るようでした。",
          early_elementary_7_8:
            "うれしかったことを、ひとつずつ こころに あつめます。いちばん たのしかった しゅんかんが、ふんわり 光っています。",
          general_child:
            "うれしかったことを、ひとつずつ こころに あつめます。にこにこした ことが、まだ きらきらしています。",
          pageVisualRole: "payoff",
          imagePromptTemplate:
            withBedtimeGoodDay8pImagePromptGuardrail("Wide shot of a child sitting on the bed, looking happy and calm. The room is filled with soft warm light. The child is hugging the white rabbit plush toy. Small meaningful objects from the day (the leaf and the drawing) are on the bedside table. A glowing star motif appears on the wall. Soft watercolor picture book style, celebratory and peaceful mood, rich but not cluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark."),
        }),
        buildAgeSpecificPage({
          textTemplate: "だいすきな ぬいぐるみと いっしょに、おふとんへ。ふわふわで きもちいい。",
          baby_toddler: "おふとん、ふわふわ。いっしょだね。",
          preschool_3_4:
            "だいすきな ぬいぐるみと いっしょに、おふとんへ。ふわふわで きもちいい。",
          early_reader_5_6:
            "だいすきな しろいうさぎの ぬいぐるみと いっしょに、おふとんへ はいります。おふとんの なかは、まるで くもの うえみたいです。",
          early_elementary_7_8:
            "だいすきな ぬいぐるみと いっしょに、おふとんの なかへ。やわらかな ぬくもりが、{childName}を しずかに つつみこみます。",
          general_child:
            "だいすきな ぬいぐるみと いっしょに、おふとんへ。ふわふわで きもちいい。",
          pageVisualRole: "emotional_closeup",
          imagePromptTemplate:
            withBedtimeGoodDay8pImagePromptGuardrail("Close-up of a child snuggling into a fluffy blanket, hugging the white rabbit plush toy with both hands. Eyes half-closed with a peaceful, content expression. A pillow and soft sheets surround the child. Moonlight and stars are visible through a nearby window. A small star motif appears on the pillowcase. Soft watercolor picture book style, intimate peaceful framing, warm ivory and soft blue tones, rich but not cluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark."),
        }),
        buildAgeSpecificPage({
          textTemplate: "おつきさまが まどから みまもっています。ゆっくり おやすみなさい。",
          baby_toddler: "おやすみ。おつきさま。",
          preschool_3_4:
            "おつきさまが まどから みまもっています。ゆっくり おやすみなさい。",
          early_reader_5_6:
            "おつきさまが まどから やさしく みまもっています。もう だいじょうぶ、あんしんして めを とじましょう。",
          early_elementary_7_8:
            "おつきさまが まどから しずかに みまもっています。きょうという ひが、ゆっくりと ゆめの なかへ つながっていきます。",
          general_child:
            "おつきさまが まどから みまもっています。ゆっくり おやすみなさい。",
          pageVisualRole: "quiet_ending",
          imagePromptTemplate:
            withBedtimeGoodDay8pImagePromptGuardrail("Wide peaceful shot of the child lying in bed with eyes closed. The room is bathed in soft moonlight. The white rabbit plush toy rests beside the child. Stars twinkle outside the window. A small star motif glows gently near the windowsill. Calm, serene nighttime atmosphere. Soft watercolor picture book style, quiet lullaby composition, rich but not cluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark."),
        }),
        buildAgeSpecificPage({
          textTemplate: "{parentMessage}",
          baby_toddler: "{parentMessage}",
          preschool_3_4: "{parentMessage}",
          early_reader_5_6: "{parentMessage}",
          early_elementary_7_8: "{parentMessage}",
          general_child: "{parentMessage}",
          pageVisualRole: "quiet_ending",
          imagePromptTemplate:
            withBedtimeGoodDay8pImagePromptGuardrail("Back-view wide shot of the child asleep in bed, seen from the doorway. The room is dark and peaceful with only a sliver of moonlight. The white rabbit plush is visible. A small star motif on the blanket catches the last bit of light. Soft watercolor picture book style, serene final closing shot, rich but not cluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark."),
        }),
      ],
    },
  },
  "fixed-brush-teeth-8p": {
    name: "はじめての歯みがき（8ページ）",
    description: "歯みがきの習慣を、朝の準備からおやすみまでゆっくり描く8ページ版です。",
    icon: "🪥",
    categoryGroupId: "growth-support",
    subcategoryId: "daily-habit",
    parentIntent: "できるようになってほしい。でも怒らず応援したい",
    recommendedAgeMin: 2,
    recommendedAgeMax: 6,
    requiredInputs: ["childName"],
    optionalInputs: ["parentMessage"],
    themeTags: ["teeth", "habit", "bedtime", "pilot-8-page"],
    creationMode: "fixed_template",
    priceTier: "ume",
    storyCostLevel: "none",
    sampleImageUrl: "/images/templates/fixed-brush-teeth.webp",
    sampleImageAlt: "歯みがきをがんばる子どものやさしい絵本イメージ（8ページ版）",
    visualDirection:
      "Bright but calm daily-habit picture-book mood with clean bathroom setting, rounded shapes, friendly routine support, and reassuring smiles over a gentle 8-page rhythm.",
    order: 7.5,
    active: true,
    systemPrompt: "固定テンプレートを使って、歯みがきの習慣を8ページでやさしく応援する絵本を作ります。",
    fixedStory: {
      titleTemplate: "{childName}のはじめての歯みがき",
      previewImageUrl: "/images/templates/fixed-brush-teeth.webp",
      coverImagePromptTemplate:
        withFixedImagePromptSafety("Picture book cover illustration: a cheerful preschool child holding a toothbrush in a bright clean bathroom, fresh morning or evening light, friendly mirror reflection, recurring shining star motif, encouraging cheerful mood, soft watercolor style, child-safe rounded composition, rich but not cluttered details, no text, no letters, no Japanese characters, no readable signs, no logo, no watermark"),
      titleSpreadTextTemplate: "{childName}の はじめての 歯みがき",
      openingNarrationTemplate:
        "今日も歯みがきの時間がやってきました。{childName}はどんなふうにがんばるかな。",
      pageCount: 8,
      layoutVariant: "8_page",
      pages: [
        buildAgeSpecificPage({
          textTemplate: "朝だ。{childName}は、お水をながして顔を洗います。",
          baby_toddler: "あさだ。ぱしゃぱしゃ。きれいきれい。",
          preschool_3_4:
            "あさだ。{childName}は、おみずをながして かおを あらいます。きょうも はみがきのじゅんびが はじまります。",
          early_reader_5_6:
            "朝だ。{childName}は、お水をながして顔を洗います。鏡に映った自分を見ると、今日も がんばろう という きもちに なります。",
          early_elementary_7_8:
            "朝だ。{childName}は、お水をながして顔を洗います。毎朝の おなじ しぐさが、{childName}の からだに やさしく しみこんでいます。",
          general_child:
            "朝だ。{childName}は、お水をながして顔を洗います。きょうも はみがきのじゅんびが はじまります。",
          pageVisualRole: "opening_establishing",
          imagePromptTemplate:
            withBrushTeethImagePromptGuardrail("Establishing wide shot of a preschool child at a bathroom sink in bright morning light, reaching for a faucet on a small step stool. The child's face is eager and alert. A bathroom mirror ahead shows the child's reflection. A colorful toothbrush cup sits on the counter with other bathroom items arranged neatly. Use only plain, unlabeled bathroom objects. Do not include readable text, product labels, logos, numbers, letters, posters, charts, or written marks anywhere in the sink area, mirror, counter, or background. A small shining star motif is tucked on the mirror frame. Soft watercolor picture book style, clean bright morning bathroom, rounded child-safe shapes, rich but not cluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark."),
        }),
        buildAgeSpecificPage({
          textTemplate: "でも、歯みがきはめんどくさい。{childName}はちょっぴり ぐずぐずします。",
          baby_toddler: "めんどくさい。ぐずぐず。",
          preschool_3_4:
            "でも、はみがきはめんどくさい。{childName}はちょっぴり ぐずぐずします。おへやから あぶくの おとが きこえてきました。",
          early_reader_5_6:
            "でも、歯みがきはめんどくさい。{childName}はちょっぴり ぐずぐずします。でも、{childName}は知っています。やってみると たのしいことを。",
          early_elementary_7_8:
            "でも、歯みがきはめんどくさい。{childName}はちょっぴり ぐずぐずします。誰もが そう感じる その気持ちを、{childName}は素直に 表しています。",
          general_child:
            "でも、歯みがきはめんどくさい。{childName}はちょっぴり ぐずぐずします。おへやから あぶくの音が きこえてきました。",
          pageVisualRole: "setback_or_question",
          imagePromptTemplate:
            withBrushTeethImagePromptGuardrail("Medium shot of the child sitting on the bathroom floor with a slightly pouty or uncertain expression, looking at the toothbrush with hesitation. The toothbrush and solid-colored toothpaste tube sit on the counter above. Soft bubbles or steam are visible near the sink. The room is still bright and welcoming despite the child's reluctance. A small shining star motif appears on the floor tile. Soft watercolor picture book style, relatable reluctance without negativity, rich but not cluttered.")
        }),
        buildAgeSpecificPage({
          textTemplate: "でも、はぶらしを握ると、あぶくが ふわっと 出てきました。あ、楽しい。",
          baby_toddler: "あぶく。ふわっ。たのしい。",
          preschool_3_4:
            "でも、はぶらしを にぎると、あぶくが ふわっと でてきました。あ、たのしい。{childName}の めが きらりと ひかります。",
          early_reader_5_6:
            "でも、はぶらしを握ると、あぶくが ふわっと 出てきました。あ、楽しい。小さな星のような あぶくが、{childName}の 心も ぷくぷくと 膨らませます。",
          early_elementary_7_8:
            "でも、はぶらしを握ると、あぶくが ふわっと 出てきました。あ、楽しい。めんどくさいと思っていた その気持ちが、ふんわり 変わっていく体験をします。",
          general_child:
            "でも、はぶらしを握ると、あぶくが ふわっと 出てきました。あ、楽しい。{childName}の目が きらりと 光ります。",
          pageVisualRole: "discovery",
          imagePromptTemplate:
            withBrushTeethImagePromptGuardrail("Medium action shot of the child actively brushing with delight. The toothbrush fills with foam bubbles that float in soft white clouds near the mouth. The child's expression shifts from reluctance to joy, eyes bright. Soft bubbles drift near the sink. A small shining star motif appears on the toothbrush handle or bubbles. Bright bathroom light. Soft watercolor picture book style, transformation moment, dynamic but gentle, rich but not cluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark."),
        }),
        buildAgeSpecificPage({
          textTemplate: "しゃかしゃか。前歯をもっと頑張る。ぴかぴかになれ。",
          baby_toddler: "しゃかしゃか。ぴかぴか。",
          preschool_3_4:
            "しゃかしゃか。まえばを もっと がんばる。ぴかぴかになれ。{childName}は、はの ひとつひとつに きもちを こめて みがきます。",
          early_reader_5_6:
            "しゃかしゃか。前歯をもっと頑張る。ぴかぴかになれ。{childName}は、小さな手で せいいっぱい 磨いています。",
          early_elementary_7_8:
            "しゃかしゃか。前歯をもっと頑張る。ぴかぴかになれ。{childName}は、じぶんの歯を大事にしようという 気持ちが、ぽかぽかと 湧き上がるのを感じます。",
          general_child:
            "しゃかしゃか。前歯をもっと頑張る。ぴかぴかになれ。{childName}は、歯のひとつひとつに 気持ちを こめて 磨きます。",
          pageVisualRole: "action",
          imagePromptTemplate:
            withBrushTeethImagePromptGuardrail("Action-focused medium shot of the child concentrating hard on brushing the front teeth. The child's hands are on both sides of the toothbrush, mouth open with gentle foam. Keep the toothbrush, toothpaste tube, cup, mirror, and counter completely plain and unlabeled. The toothpaste tube must be completely blank, plain white, and label-free, with no printed text, fake text, logo, decorative writing, symbols, numbers, or letter-like shapes. If needed, turn the tube away from the viewer or partially hide it behind the cup so no product surface can show markings. The mirror reflects the child's focused, determined face. Soft bubbles float around the mouth area. A small shining star motif appears on the mirror frame or tooth foam. Bright clean bathroom. Soft watercolor picture book style, determination and effort, dynamic but gentle, rich but not cluttered."),
        }),
        buildAgeSpecificPage({
          textTemplate: "さらに、奥歯も、そっと探検する。ここにも汚れがあるのか。見つけるぞ。",
          baby_toddler: "奥歯も。そっと。きれいきれい。",
          preschool_3_4:
            "さらに、おくばも、そっと たんけんする。ここにも よごれがあるのか。みつけるぞ。{childName}は、かがみを のぞきながら いっしょうけんめい さがします。",
          early_reader_5_6:
            "さらに、奥歯も、そっと探検する。ここにも汚れがあるのか。見つけるぞ。{childName}は、自分の歯の中を 小さな冒険者のように 探検しています。",
          early_elementary_7_8:
            "さらに、奥歯も、そっと探検する。ここにも汚れがあるのか。見つけるぞ。{childName}は、歯の裏側まで 丁寧に 磨くことで、自分の体を 大事にしている という 実感を 深めていきます。",
          general_child:
            "さらに、奥歯も、そっと探検する。ここにも汚れがあるのか。見つけるぞ。{childName}は、鏡を覗きながら 一生懸命 探します。",
          pageVisualRole: "object_detail",
          imagePromptTemplate:
            withBrushTeethImagePromptGuardrail("Object-detail close shot focused on the child's mouth area as the toothbrush moves toward the back teeth, seen in the mirror. The child tilts the head slightly to the side, concentrating. Soft foam reveals gentle brushing action. Use a plain mirror frame and simple bathroom objects only. The mirror reflects the child's focused expression. A small shining star motif appears on the mirror edge. Soft bathroom light highlighting the brushing motion. Soft watercolor picture book style, intimate exploration, gentle care, rich but not cluttered."),
        }),
        buildAgeSpecificPage({
          textTemplate: "その様子を、おかあさん（またはおとうさん）が、やさしく見守っていました。",
          baby_toddler: "ママも見てる。やさしい。",
          preschool_3_4:
            "そのようすを、おかあさん（またはおとうさん）が、やさしく みまもっていました。{childName}は、その しせんに きづき、もっと がんばろうと おもいました。",
          early_reader_5_6:
            "その様子を、家族が、やさしく見守っていました。{childName}は、その暖かい視線を感じて、一人じゃないんだと 思いました。",
          early_elementary_7_8:
            "その様子を、家族が、やさしく見守っていました。{childName}は、サポートされていることの ありがたさを 無意識に受け取り、その気持ちが 力に 変わっていきます。",
          general_child:
            "その様子を、おかあさん（またはおとうさん）が、やさしく見守っていました。{childName}は、その視線に 気づき、もっと 頑張ろう と 思いました。",
          pageVisualRole: "emotional_closeup",
          imagePromptTemplate:
            withBrushTeethImagePromptGuardrail("Close-up emotional shot of the child brushing intently in the mirror while a family member (parent) stands in soft focus in the background, watching with a warm, proud smile. The parent's hand rests gently on the child's shoulder or nearby. The parent's face shows gentle encouragement without pressure. The mirror frame is plain and simplified. The bathroom wall behind the mirror is plain solid color. A small shining star motif appears on the parent's shirt or nearby. Soft warm bathroom light. Soft watercolor picture book style, supportive family moment, tender and reassuring, rich but not cluttered."),
        }),
        buildAgeSpecificPage({
          textTemplate: "仕上げに、口をゆすぐ。ぐちゅぐちゅ。どんどん、きれいになる。",
          baby_toddler: "ぐちゅぐちゅ。ぴかぴか。できた。",
          preschool_3_4:
            "しあげに、くちをゆすぐ。ぐちゅぐちゅ。どんどん、きれいになる。{childName}は、さいごの しあげに きあいが はいります。",
          early_reader_5_6:
            "仕上げに、口をゆすぐ。ぐちゅぐちゅ。どんどん、きれいになる。{childName}は、水のぬくもりを感じながら、全部 終わったという 喜びが こみ上げます。",
          early_elementary_7_8:
            "仕上げに、口をゆすぐ。ぐちゅぐちゅ。どんどん、きれいになる。{childName}は、最後の最後まで 丁寧に 仕上げることで、自分の 努力を 完成させる 喜びを 知ります。",
          general_child:
            "仕上げに、口をゆすぐ。ぐちゅぐちゅ。どんどん、きれいになる。{childName}は、最後の仕上げに 気合いが入ります。",
          pageVisualRole: "payoff",
          imagePromptTemplate:
            withBrushTeethImagePromptGuardrail("Wide payoff shot of the child rinsing vigorously, water streaming over the face with gentle splashes, foam and bubbles spinning away. The child's expression is determined and joyful. The bathroom counter is tidy around them. A small shining star motif appears on the rinse cup or soap dispenser. Clear water, bright light, sense of completion. Soft watercolor picture book style, accomplishment and freshness, dynamic but clean, rich but not cluttered."),
        }),
        buildAgeSpecificPage({
          textTemplate: "{parentMessage}",
          baby_toddler: "{parentMessage}",
          preschool_3_4: "{parentMessage}",
          early_reader_5_6: "{parentMessage}",
          early_elementary_7_8: "{parentMessage}",
          general_child: "{parentMessage}",
          pageVisualRole: "quiet_ending",
          imagePromptTemplate:
            withBrushTeethImagePromptGuardrail("Wide quiet ending shot of the child at the bathroom mirror after brushing, looking up at their own reflection with a proud, happy smile, holding the toothbrush in one hand. A family member stands beside or behind the child, both gazing at the reflection with warmth. The bathroom is tidy and calm. The mirror is plain with a simple frame. The wall around the mirror is plain solid color—no posters, charts, written notes, or label-like objects. A small shining star motif glows on the nightlight or mirror frame edge only. Soft evening or warm bathroom light. Soft watercolor picture book style, serene satisfied framing, family pride, rich but not cluttered."),
        }),
      ],
    },
  },
  "fixed-first-christmas": {
    name: "はじめてのクリスマス",
    description: "家族とのクリスマスの思い出を、やさしく残せる固定テンプレート",
    icon: "🎄",
    categoryGroupId: "seasonal-events",
    subcategoryId: "christmas",
    parentIntent: "季節の体験を特別な思い出にしたい",
    recommendedAgeMin: 1,
    recommendedAgeMax: 6,
    requiredInputs: ["childName", "familyMembers"],
    optionalInputs: ["parentMessage"],
    themeTags: ["christmas", "season", "family"],
    creationMode: "fixed_template",
    priceTier: "ume",
    storyCostLevel: "none",
    sampleImageUrl: "/images/templates/fixed-first-christmas.webp",
    sampleImageAlt: "家族でクリスマスを楽しむ子どものやさしい絵本イメージ",
    visualDirection:
      "Warm Christmas picture-book mood with soft lights, family warmth, festive decorations, child-safe wonder, and cozy winter colors.",
    order: 10,
    active: true,
    systemPrompt: "固定テンプレートを使って、はじめてのクリスマスをやさしく残す絵本を作ります。",
    fixedStory: {
      previewImageUrl: "/images/templates/fixed-first-christmas.webp",
      titleTemplate: "{childName}のはじめてのクリスマス",
      coverImagePromptTemplate:
        withFixedImagePromptSafety("Picture book cover illustration: a young child celebrating Christmas with family in a cozy living room, soft warm fairy lights, decorated Christmas tree, gentle winter glow, recurring small golden bell motif, festive but calm storybook mood, soft watercolor style, child-safe tender composition, rich but not cluttered details, no text, no letters, no Japanese characters, no readable signs, no logo, no watermark"),
      titleSpreadTextTemplate: "{childName}の はじめての クリスマス",
      openingNarrationTemplate:
        "きらきらの ひかりに つつまれた よる。{childName}と {familyMembers}の とくべつな クリスマスが はじまります。",
      pages: [
        {
          textTemplate: "{childName}は、{familyMembers}といっしょに、きらきらのクリスマスをむかえました。",
          textTemplatesByAge: {
            baby_toddler: "{childName}、きらきら クリスマス。",
            preschool_3_4:
              "{childName}は、{familyMembers}といっしょに、きらきらのクリスマスをむかえました。",
            early_reader_5_6:
              "{childName}は、{familyMembers}といっしょに クリスマスをむかえました。おへやの ひかりが きらきらして、こころまで あたたかくなります。",
            early_elementary_7_8:
              "{childName}は、{familyMembers}といっしょに クリスマスをむかえました。やわらかな ひかりに つつまれたへやで、いつもより とくべつな夜が はじまります。",
            general_child:
              "{childName}は、{familyMembers}といっしょに、きらきらのクリスマスをむかえました。",
          },
          pageVisualRole: "opening_establishing" as const,
          imagePromptTemplate:
            withChristmasImagePromptGuardrail("Setting: A cozy living room decorated for Christmas. Establishing wide shot of a young child standing near a sparkling Christmas tree, reaching up toward a low ornament with wide amazed eyes. Family members sit nearby on a sofa, smiling warmly. Soft fairy lights drape across the tree and mantle. Wrapped presents rest under the tree. A small golden bell motif hangs on a low branch. Warm candlelight and gentle winter evening tones. Soft watercolor picture book style, festive but calm atmosphere, rich but not cluttered."),
        },
        {
          textTemplate: "おへやには、やさしいひかりと、うれしいきもちがいっぱいです。",
          textTemplatesByAge: {
            baby_toddler: "ぴかぴか。うれしいね。",
            preschool_3_4: "おへやには、やさしいひかりと、うれしいきもちがいっぱいです。",
            early_reader_5_6:
              "おへやには やさしいひかりが ゆれていて、みんなの えがおも なんだか いつもより まぶしく見えました。",
            early_elementary_7_8:
              "おへやには やさしいひかりが ひろがり、みんなの たのしい声が そっと かさなります。クリスマスの あたたかさが へやじゅうに ひろがっていました。",
            general_child: "おへやには、やさしいひかりと、うれしいきもちがいっぱいです。",
          },
          pageVisualRole: "discovery" as const,
          imagePromptTemplate:
            withChristmasImagePromptGuardrail("Setting: A cozy living room decorated for Christmas. Medium shot of a festive Christmas room glowing with soft light. Focus on the child kneeling near the tree, carefully examining a shiny ornament or a small wrapped gift. Stockings hang from a mantle. Candles flicker on a side table. Family members are visible in soft focus behind the child. A small golden bell motif is hidden among the ornaments. Warm amber and red holiday tones. Soft watercolor picture book style, wonder-filled composition, rich but not cluttered."),
        },
        {
          textTemplate: "{childName}のにこにこえがおを見て、みんなもにっこりしました。",
          textTemplatesByAge: {
            baby_toddler: "{childName}、にこにこ。",
            preschool_3_4: "{childName}のにこにこえがおを見て、みんなもにっこりしました。",
            early_reader_5_6:
              "{childName}の にこにこえがおを 見て、みんなも にっこり。うれしいきもちが、ひとつの テーブルに ふわっと あつまりました。",
            early_elementary_7_8:
              "{childName}の うれしそうな えがおを見て、みんなも にっこりしました。たのしい気持ちは、そばにいる人へ ひろがっていくのだと分かるような時間でした。",
            general_child: "{childName}のにこにこえがおを見て、みんなもにっこりしました。",
          },
          pageVisualRole: "emotional_closeup" as const,
          imagePromptTemplate:
            withChristmasImagePromptGuardrail("Setting: A cozy living room decorated for Christmas. Close-up of the child's delighted face during Christmas celebration. The child holds a small gift or ornament with both hands near their chest, eyes sparkling with joy. Family members lean in close, sharing the moment with warm smiles. Soft fairy light bokeh in the background. A small golden bell motif is visible on the gift ribbon or nearby. Warm golden and soft white tones. Soft watercolor picture book style, intimate emotional framing, rich but not cluttered."),
        },
        {
          textTemplate: "{parentMessage}",
          pageVisualRole: "quiet_ending" as const,
          imagePromptTemplate:
            withChristmasImagePromptGuardrail("Setting: A cozy living room decorated for Christmas. Wide scenic shot of a family by a frosty window on Christmas night, viewed from behind. The child sits on a parent's lap, both gazing at softly falling snow outside. The Christmas tree glows gently in the background. A warm blanket drapes over them. A small golden bell motif catches the light near the windowsill. Quiet, magical winter night atmosphere with deep blue and warm gold tones. Soft watercolor picture book style, peaceful memorable finale, rich but not cluttered."),
        },
      ],
    },
  },
  "fixed-sharing-friends": {
    name: "おともだちとわけっこできたね",
    description: "やさしさと自信を育てる、わけっこテーマの固定テンプレート",
    icon: "🤝",
    categoryGroupId: "emotional-growth",
    subcategoryId: "sharing-kindness",
    parentIntent: "優しい子に育ってほしい。自信を持ってほしい",
    recommendedAgeMin: 3,
    recommendedAgeMax: 8,
    requiredInputs: ["childName", "lessonToTeach"],
    optionalInputs: ["parentMessage"],
    themeTags: ["emotional growth", "sharing", "kindness"],
    creationMode: "fixed_template",
    priceTier: "ume",
    storyCostLevel: "none",
    sampleImageUrl: "/images/templates/fixed-sharing-friends.webp",
    sampleImageAlt: "おもちゃをわけっこして笑い合う子どもたちのやさしい絵本イメージ",
    visualDirection:
      "Warm emotional-growth picture-book mood with gentle eye contact, shared toys, supportive smiles, and a small kindness spark motif.",
    order: 6,
    active: true,
    systemPrompt:
      "固定テンプレートを使って、わけっこを通してやさしさと自信を育てる短い絵本を作ります。",
    fixedStory: {
      previewImageUrl: "/images/templates/fixed-sharing-friends.webp",
      titleTemplate: "{childName}のわけっこできたね",
      coverImagePromptTemplate:
        withFixedImagePromptSafety("Picture book cover illustration: two children sharing toys with warm smiles in a bright playroom, one child is the protagonist, gentle sunlight, recurring tiny kindness spark motif, tender emotional-growth mood, soft watercolor style, child-safe rounded composition, rich but not cluttered details, no text, no letters, no Japanese characters, no readable signs, no logo, no watermark"),
      titleSpreadTextTemplate: "{childName}の わけっこ できたね",
      openingNarrationTemplate:
        "きょうは、{childName}が おともだちと すごすなかで、{lessonToTeach}の あたたかさに そっと きづいていく おはなしです。",
      pages: [
        buildAgeSpecificPage({
          textTemplate: "{childName}は、だいすきなおもちゃであそんでいました。",
          baby_toddler: "{childName}、だいすき おもちゃ。",
          preschool_3_4:
            "{childName}は、だいすきなおもちゃで あそんでいました。たのしくて、ぎゅっと だいじに もっています。",
          early_reader_5_6:
            "{childName}は、だいすきな おもちゃで あそんでいました。たのしい時間だからこそ、だれにも わたしたくない きもちも ありました。",
          early_elementary_7_8:
            "{childName}は、だいすきな おもちゃで あそんでいました。たいせつなものを ひとりで もっていたい気持ちと、だれかと 楽しみたい気持ちが 心のなかで ゆれていました。",
          general_child:
            "{childName}は、だいすきなおもちゃであそんでいました。たのしくて、ぎゅっと だいじに もっています。",
          pageVisualRole: "opening_establishing",
          imagePromptTemplate:
            withSharingFriendsImagePromptGuardrail("Setting: A bright child playroom with a soft rug and toy shelves. Establishing wide shot of a young child sitting on a soft rug, holding a favorite toy close with both hands. A second child is visible nearby, watching with interest. A tiny kindness spark motif appears on a cushion corner. Soft watercolor picture book style, balanced foreground-midground-background composition, rich but not cluttered."),
        }),
        buildAgeSpecificPage({
          textTemplate: "おともだちが「いっしょにあそびたいな」といいました。",
          baby_toddler: "いっしょに あそぼ。どうしよう。",
          preschool_3_4:
            "おともだちが「いっしょにあそびたいな」と いいました。{childName}は すこしだけ まよいます。",
          early_reader_5_6:
            "おともだちが「いっしょにあそびたいな」と いいました。{childName}は ちょっぴり まよいながらも、どうしたら みんなが うれしいかを かんがえます。",
          early_elementary_7_8:
            "おともだちが「いっしょに あそびたいな」と いいました。{childName}は まよいながらも、じぶんの気持ちと 相手の気持ちの どちらも たいせつに できる方法を さがしはじめます。",
          general_child:
            "おともだちが「いっしょにあそびたいな」といいました。{childName}は すこしだけ まよいます。",
          pageVisualRole: "discovery",
          imagePromptTemplate:
            withSharingFriendsImagePromptGuardrail("Setting: A bright child playroom. Medium shot showing two children at eye level in a playroom. One child gently asks to join while the protagonist thinks for a moment, still holding the toy. Their facial expressions are soft and thoughtful, not upset. Warm daylight enters from a side window. A tiny kindness spark motif is tucked on a toy box edge. Soft watercolor picture book style, clear emotional storytelling framing, rich but not cluttered."),
        }),
        buildAgeSpecificPage({
          textTemplate: "{childName}は、にっこりして「いっしょにあそぼ」といいました。",
          baby_toddler: "いっしょに あそぼ. にこっ。",
          preschool_3_4:
            "{childName}は、にっこりして「いっしょにあそぼ」と いいました。おへやに やさしい えがおが ふえました。",
          early_reader_5_6:
            "{childName}は、にっこりして「いっしょにあそぼ」と いいました。わけっこしてみると、たのしさが ふたつに なって かえってきました。",
          early_elementary_7_8:
            "{childName}は、にっこりして「いっしょにあそぼ」と いいました。勇気をだして わけっこしたことで、こころが ふわっと あたたかくなり、自分への 自信も すこし育ちました。",
          general_child:
            "{childName}は、にっこりして「いっしょにあそぼ」といいました。おへやに やさしい えがおが ふえました。",
          pageVisualRole: "emotional_closeup",
          imagePromptTemplate:
            withSharingFriendsImagePromptGuardrail("Setting: A bright child playroom. Close-up of two children smiling as they share a favorite toy together, hands gently touching the same object. The protagonist's expression shows pride and kindness. Background is softly blurred with warm playroom colors. A tiny kindness spark motif glows near their joined hands. Soft watercolor picture book style, intimate emotional framing, rich but not cluttered."),
        }),
        buildAgeSpecificPage({
          textTemplate: "{parentMessage}",
          baby_toddler: "{parentMessage}",
          preschool_3_4: "{parentMessage}",
          early_reader_5_6: "{parentMessage}",
          early_elementary_7_8: "{parentMessage}",
          general_child: "{parentMessage}",
          pageVisualRole: "quiet_ending",
          imagePromptTemplate:
            withSharingFriendsImagePromptGuardrail("Setting: A bright child playroom. Wide quiet ending shot of the two children sitting side by side after playtime, toys neatly shared between them. The room is calm in soft late-afternoon light. The protagonist leans comfortably with a peaceful smile. A tiny kindness spark motif appears near a bookshelf or rug edge. Soft watercolor picture book style, serene reflective composition, rich but not cluttered."),
        }),
      ],
    },
  },
  "fixed-sleepy-moon-adventure": {
    name: "おつきさまと おやすみぼうけん",
    description: "寝る前に安心して眠れる、月あかりの固定テンプレート",
    icon: "🌙",
    categoryGroupId: "bedtime",
    subcategoryId: "moon-adventure",
    parentIntent: "今日も安心して眠ってほしい",
    recommendedAgeMin: 2,
    recommendedAgeMax: 8,
    requiredInputs: ["childName"],
    optionalInputs: ["parentMessage"],
    themeTags: ["bedtime", "moon", "comfort"],
    availablePageCounts: [4, 8, 12],
    creationMode: "fixed_template",
    priceTier: "ume",
    storyCostLevel: "none",
    sampleImageUrl: "/images/templates/fixed-sleepy-moon-adventure.webp",
    sampleImageAlt: "おつきさまといっしょに、ふわふわの雲に乗って夜空をぼうけんする子どもの絵本イメージ",
    visualDirection:
      "Magical bedtime adventure mood with a child riding a fluffy cloud through a starry night sky towards a friendly moon, soft moonlight, and gentle expressions.",
    order: 11,
    active: true,
    systemPrompt: "固定テンプレートを使って、寝る前の安心感をやさしく描く絵本を作ります。",
    fixedStory: {
      titleTemplate: "{childName}とおつきさまのおやすみぼうけん",
      previewImageUrl: "/images/templates/fixed-sleepy-moon-adventure.webp",
      coverImagePromptTemplate:
        withSleepyMoon8pImagePromptGuardrail("Picture book cover illustration: a joyful child happily riding on a fluffy white cloud through a starry night sky towards a large friendly moon, holding a small tan teddy bear, magical and adventurous bedtime mood, soft watercolor style, child-safe rounded composition, rich but not cluttered details"),
      titleSpreadTextTemplate: "おつきさまと おやすみぼうけん",
      openingNarrationTemplate:
        "よるのしずかな へやで、{childName}は まどのむこうの おつきさまを みつけました。",
      pages: [
        buildAgeSpecificPage({
          textTemplate: "ベッドのうえで、{childName}はまどのそとのおつきさまを見つけました。",
          baby_toddler: "{childName}、おつきさま みーつけた。",
          preschool_3_4:
            "ベッドのうえで、{childName}は まどのそとの おつきさまを みつけました。",
          early_reader_5_6:
            "ベッドのうえで、{childName}は まどのそとの おつきさまを みつけました。しずかな ひかりが こころを やわらかくします。",
          early_elementary_7_8:
            "ベッドのうえで、{childName}は まどのそとの おつきさまを みつけました。やさしい ひかりに つつまれて、きょうの つかれが すこしずつ ほどけていきます。",
          general_child: "ベッドのうえで、{childName}はまどのそとのおつきさまを見つけました。",
          pageVisualRole: "opening_establishing",
          imagePromptTemplate:
            withSleepyMoon8pImagePromptGuardrail("Setting: A cozy bedroom at night. Establishing wide shot of a young child sitting upright on bed under a soft blanket, gazing through a window at a bright round moon. A warm bedside lamp creates a secure bedtime atmosphere. A tiny glowing star motif appears near the window curtain. Moonlight and warm lamp light blend softly. Soft watercolor picture book style, rich but uncluttered composition, child-safe rounded shapes."),
        }),
        buildAgeSpecificPage({
          textTemplate: "{childName}は、ふわふわの雲やきらきらの星をそうぞうしました。",
          baby_toddler: "ふわふわ くも、きらきら ほし。",
          preschool_3_4:
            "{childName}は、ふわふわの くもや きらきらの ほしを そうぞうしました。",
          early_reader_5_6:
            "{childName}は、ふわふわの くもや きらきらの ほしを そうぞうしました。やさしい ぼうけんが こころのなかで ひろがります。",
          early_elementary_7_8:
            "{childName}は、ふわふわの くもや きらきらの ほしを そうぞうしました。へやにいながら、しずかな よるの そらを たびしている きぶんになります。",
          general_child: "{childName}は、ふわふわの雲やきらきらの星をそうぞうしました。",
          pageVisualRole: "discovery",
          imagePromptTemplate:
            withSleepyMoon8pImagePromptGuardrail("Setting: A cozy bedroom at night. Medium discovery shot of a young child smiling softly on bed while imagining cloud paths and star shapes floating gently around the room like dream symbols. The bedroom remains clear and cozy, with moonlight entering from the window. A tiny star motif appears among the symbolic floating shapes. Soft watercolor picture book style, dreamy but grounded composition, rich but uncluttered."),
        }),
        buildAgeSpecificPage({
          textTemplate: "おつきさまが「きょうもだいじょうぶ」と見まもってくれているようでした。",
          baby_toddler: "だいじょうぶ、って おつきさま。",
          preschool_3_4:
            "おつきさまが「きょうも だいじょうぶ」と 見まもってくれているようでした。",
          early_reader_5_6:
            "おつきさまが「きょうも だいじょうぶ」と 見まもってくれているようでした。{childName}の こころは ほっと あたたかくなります。",
          early_elementary_7_8:
            "おつきさまが「きょうも だいじょうぶ」と そっと 見まもってくれているようでした。{childName}の こころは、しずかに ほぐれていきます。",
          general_child: "おつきさまが「きょうもだいじょうぶ」と見まもってくれているようでした。",
          pageVisualRole: "emotional_closeup",
          imagePromptTemplate:
            withSleepyMoon8pImagePromptGuardrail("Setting: A cozy bedroom at night. Emotional close-up of a young child resting on pillow with peaceful eyes, moonlight softly illuminating the face. The child hugs a blanket edge with comfort. Outside window, the moon appears gentle and protective. A tiny star motif glows near the pillow seam. Soft watercolor picture book style, warm reassurance and quiet confidence, rich but uncluttered."),
        }),
        buildAgeSpecificPage({
          textTemplate: "{parentMessage}",
          baby_toddler: "{parentMessage}",
          preschool_3_4: "{parentMessage}",
          early_reader_5_6: "{parentMessage}",
          early_elementary_7_8: "{parentMessage}",
          general_child: "{parentMessage}",
          pageVisualRole: "quiet_ending",
          imagePromptTemplate:
            withSleepyMoon8pImagePromptGuardrail("Setting: A cozy bedroom at night. Wide quiet ending shot of a young child asleep comfortably in bed under a soft blanket. Moonlight paints gentle silver highlights across the room while warm ambient light remains subtle. A tiny star motif appears on blanket edge. Soft watercolor picture book style, balanced calm composition, rich but uncluttered."),
        }),
      ],
    },
  },
  "fixed-sleepy-moon-adventure-8p": {
    name: "おつきさまと おやすみぼうけん（8ページ）",
    description: "月あかりの冒険をゆっくり8ページで描く、安心おやすみテンプレートです。",
    icon: "🌙",
    categoryGroupId: "bedtime",
    subcategoryId: "moon-adventure",
    parentIntent: "今日も安心して眠ってほしい",
    recommendedAgeMin: 2,
    recommendedAgeMax: 8,
    requiredInputs: ["childName"],
    optionalInputs: ["parentMessage"],
    themeTags: ["bedtime", "moon", "comfort", "pilot-8-page"],
    creationMode: "fixed_template",
    priceTier: "ume",
    storyCostLevel: "none",
    sampleImageUrl: "/images/templates/fixed-sleepy-moon-adventure.webp",
    sampleImageAlt: "おつきさまといっしょに、ふわふわの雲に乗って夜空をぼうけんする子どもの絵本イメージ（8ページ版）",
    visualDirection:
      "Magical bedtime adventure mood with a child riding a fluffy cloud through a starry night sky towards a friendly moon, soft moonlight, and gentle cloud-and-star adventure over an 8-page rhythm.",
    order: 11.5,
    active: true,
    systemPrompt: "固定テンプレートを使って、寝る前のおやすみぼうけんを8ページでやさしく描く絵本を作ります。",
    fixedStory: {
      titleTemplate: "{childName}とおつきさまのおやすみぼうけん",
      previewImageUrl: "/images/templates/fixed-sleepy-moon-adventure.webp",
      coverImagePromptTemplate:
        withSleepyMoon8pImagePromptGuardrail("Picture book cover illustration: a joyful child happily riding on a fluffy white cloud through a starry night sky towards a large friendly moon, holding a small tan teddy bear, magical and adventurous bedtime mood, soft watercolor style, child-safe rounded composition, rich but not cluttered details"),
      titleSpreadTextTemplate: "おつきさまと おやすみぼうけん",
      openingNarrationTemplate:
        "よるのしずかな へやで、{childName}は まどのむこうの おつきさまを みつけました。きょうも やさしい おやすみぼうけんが はじまります。",
      pageCount: 8,
      layoutVariant: "8_page",
      pages: [
        buildAgeSpecificPage({
          textTemplate: "ベッドのうえで、{childName}はまどのそとのおつきさまを見つけました。やさしい月あかりが、おへやをそっと包んでいます。",
          baby_toddler: "{childName}、おつきさま みーつけた。ふわっと あたたかい。",
          preschool_3_4:
            "ベッドのうえで、{childName}は まどのそとの おつきさまを みつけました。やさしい つきあかりが、おへやを そっと つつんでいます。",
          early_reader_5_6:
            "ベッドのうえで、{childName}は まどのそとの おつきさまを みつけました。やさしい 月あかりが おへやを そっと 包んで、なんだか ほっと する 気持ちに なりました。",
          early_elementary_7_8:
            "ベッドのうえで、{childName}は まどのそとの おつきさまを みつけました。やさしい 月あかりが おへやを そっと 包んで、きょうの つかれが すこしずつ ほどけていく ようでした。",
          general_child:
            "ベッドのうえで、{childName}はまどのそとのおつきさまを見つけました。やさしい月あかりが、おへやをそっと包んでいます。",
          pageVisualRole: "opening_establishing",
          imagePromptTemplate:
            withSleepyMoon8pRoomPropGuardrail("Establishing wide shot of a cozy bedroom at night. The same preschool-age child with a short dark-brown bob haircut sits upright on bed under a soft fluffy blanket, wearing the same pale blue pajamas with a tiny simple star pattern and gazing through a window at a bright round moon. The same small tan teddy bear plush sits beside the child. A warm bedside lamp glows in the corner. A tiny glowing star motif appears near the plain unprinted curtain. Moonlight and warm lamp light blend softly in the room. Soft watercolor picture book style, rich but uncluttered composition, child-safe rounded shapes. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark."),
        }),
        buildAgeSpecificPage({
          textTemplate: "{childName}は、もっとよく見たくて、まどのそばにすわりなおしました。おつきさまがぐんと近く見えました。",
          baby_toddler: "{childName}、おつきさまを もっと みたい。ちかい、ちかい。",
          preschool_3_4:
            "{childName}は、もっと よくみたくて、まどのそばに すわりなおしました。おつきさまが ぐんと ちかく みえました。",
          early_reader_5_6:
            "{childName}は、もっと よく見たくて、まどのそばに すわりなおしました。おつきさまが ぐんと 近く 見えて、しずかな よるが もっと 広くなったみたいでした。",
          early_elementary_7_8:
            "{childName}は、もっと よく見たくて、まどのそばに すわりなおしました。おつきさまが ぐんと 近く 見えて、よるの しずかさが からだ全体に ふかく 広がっていきました。",
          general_child:
            "{childName}は、もっとよく見たくて、まどのそばにすわりなおしました。おつきさまがぐんと近く見えました。",
          pageVisualRole: "discovery",
          imagePromptTemplate:
            withSleepyMoon8pRoomPropGuardrail("Medium shot from the side of the same child sitting up in bed, face turned toward a window where a large bright moon fills the glass. The child leans forward with gentle curiosity, wearing the same pale blue pajamas with a tiny simple star pattern, with a soft blanket pooled around the waist. The same small tan teddy bear plush rests on the bed nearby. The curtain is plain fabric with no print or pattern. Moonlight falls softly across the child's face. A tiny glowing star motif appears on the plain window frame edge. Soft watercolor picture book style, intimate wondering mood, rich but uncluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark."),
        }),
        buildAgeSpecificPage({
          textTemplate: "{childName}は、ふわふわの雲やきらきらの星をそうぞうしました。",
          baby_toddler: "ふわふわ くも、きらきら ほし。",
          preschool_3_4:
            "{childName}は、ふわふわの くもや きらきらの ほしを そうぞうしました。",
          early_reader_5_6:
            "{childName}は、ふわふわの くもや きらきらの ほしを そうぞうしました。やさしい ぼうけんが こころのなかで ひろがります。",
          early_elementary_7_8:
            "{childName}は、ふわふわの くもや きらきらの ほしを そうぞうしました。へやにいながら、しずかな よるの そらを たびしている きぶんになります。",
          general_child: "{childName}は、ふわふわの雲やきらきらの星をそうぞうしました。",
          pageVisualRole: "object_detail",
          imagePromptTemplate:
            withSleepyMoon8pRoomPropGuardrail(withSleepyMoon8pImagePromptGuardrail("Medium discovery shot of the same child smiling softly on bed while imagining soft glowing cloud wisps and star shapes floating gently around the cozy room. The child keeps the same short dark-brown bob haircut, the same pale blue pajamas with a tiny simple star pattern, and holds the same small tan teddy bear plush. The floating shapes are soft glowing points and curved wisps only, with no connecting lines, no symbol arrangement, no arrow shapes, no constellation-map patterns, no letter-like forms. The bedroom remains clear and safe, with moonlight entering from the window. Background stays simple and uncluttered with no visible bookshelf, no readable book covers, no spine writing, no paper items with visible writing, and no printed room surfaces. Any room props, if shown at all, are soft blurred unmarked shapes only. A small star motif appears among the symbolic floating shapes. Soft watercolor picture book style, dreamy but grounded composition, rich but uncluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark.")),
        }),
        buildAgeSpecificPage({
          textTemplate: "{childName}は、そうぞうの中で、ふわふわの雲に乗ってみました。星たちがやさしくそばで光っています。",
          baby_toddler: "くもに のって、ふわふわ。ほしが きらきら。",
          preschool_3_4:
            "{childName}は、そうぞうの なかで、ふわふわの くもに のってみました。ほしたちが やさしく そばで ひかっています。",
          early_reader_5_6:
            "{childName}は、そうぞうの 中で、ふわふわの 雲に 乗ってみました。やさしく 光る 星たちが そばに 集まって、まるで 夜の 空を たびしているみたいでした。",
          early_elementary_7_8:
            "{childName}は、そうぞうの 中で、ふわふわの 雲に 乗ってみました。星たちが やさしく そばで 光って、へやにいながら よるの 宇宙を たびしている きぶんになります。",
          general_child:
            "{childName}は、そうぞうの中で、ふわふわの雲に乗ってみました。星たちがやさしくそばで光っています。",
          pageVisualRole: "action",
          imagePromptTemplate:
            withSleepyMoon8pImagePromptGuardrail("Action medium shot of the same child seated on a plain fluffy white cloud in an imagination layer above the same clearly recognizable bedroom, surrounded by softly glowing star points. The child keeps the same short dark-brown bob haircut, the same pale blue pajamas with a tiny simple star pattern, and hugs the same small tan teddy bear plush. The cloud surface is smooth and plain with no markings, no symbols, no lines, no arrows, no structural details. Stars appear as scattered soft glowing points only with no connecting lines. The bed, window, and room remain clearly recognizable to ground the dream-play context. The child's expression is gentle and adventurous. A tiny star motif glows near the cloud edge. Soft watercolor picture book style, dreamlike safe adventure, rich but uncluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark."),
        }),
        buildAgeSpecificPage({
          textTemplate: "星たちがやさしくアーチをえがいて、{childName}のまわりをふんわりと囲みました。大きな安心感がひろがりました。",
          baby_toddler: "ほしが ふわっ。{childName}、だいじょうぶ。あったかい。",
          preschool_3_4:
            "ほしたちが やさしく アーチを えがいて、{childName}のまわりを ふんわりと かこみました。なんだか おおきな あんしんかんが ひろがります。",
          early_reader_5_6:
            "星たちが やさしく アーチを えがいて、{childName}の まわりを ふんわりと 囲みました。その やわらかな 光の 中で、大きな 安心感が からだに ひろがりました。",
          early_elementary_7_8:
            "星たちが やさしく アーチを えがいて、{childName}の まわりを ふんわりと 囲みました。その やわらかな 光に 包まれて、きょう一日の 全部が そっと ゆるされていくような 感覚になります。",
          general_child:
            "星たちがやさしくアーチをえがいて、{childName}のまわりをふんわりと囲みました。大きな安心感がひろがりました。",
          pageVisualRole: "payoff",
          imagePromptTemplate:
            withSleepyMoon8pImagePromptGuardrail("Wide payoff shot of the same child surrounded by softly glowing star points arranged in a gentle arc overhead. The child keeps the same short dark-brown bob haircut, the same pale blue pajamas with a tiny simple star pattern, and holds the same small tan teddy bear plush. The stars are scattered soft glowing points in a gentle curve only, with no connecting lines, no symbol arrangement, no constellation-map style, no arrow-like paths. The moon is visible in the background as a plain luminous orb with no surface marks or craters. The child's expression shows serene wonder and contentment. A tiny star motif glows at the arc's highest point. Soft watercolor picture book style, peak wonder and warmth, rich but uncluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark."),
        }),
        buildAgeSpecificPage({
          textTemplate: "おつきさまが「きょうもだいじょうぶ」と見まもってくれているようでした。{childName}のこころはほっとあたたかくなりました。",
          baby_toddler: "だいじょうぶ、って おつきさま。{childName}、あったかい。",
          preschool_3_4:
            "おつきさまが「きょうも だいじょうぶ」と 見まもってくれているようでした。{childName}の こころは ほっと あたたかくなりました。",
          early_reader_5_6:
            "おつきさまが「きょうも だいじょうぶ」と 見まもってくれているようでした。{childName}の こころは ほっと あたたかくなって、安心の 気持ちで いっぱいに なります。",
          early_elementary_7_8:
            "おつきさまが「きょうも だいじょうぶ」と そっと 見まもってくれているようでした。{childName}の こころは、しずかに ほぐれて、やさしい ぬくもりで みたされていきます。",
          general_child:
            "おつきさまが「きょうもだいじょうぶ」と見まもってくれているようでした。{childName}のこころはほっとあたたかくなりました。",
          pageVisualRole: "emotional_closeup",
          imagePromptTemplate:
            withSleepyMoon8pRoomPropGuardrail("Emotional close-up of the same child resting on pillow with peaceful eyes, moonlight softly illuminating the face. The child keeps the same short dark-brown bob haircut, the same pale blue pajamas with a tiny simple star pattern, and hugs the same small tan teddy bear plush with comfort. Outside the window, the moon appears gentle and protective as a plain luminous orb with no surface marks or symbols. A tiny star motif glows near the pillow seam. Intimate calm framing, watercolor picture book style, warm reassurance and quiet confidence, rich but uncluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark."),
        }),
        buildAgeSpecificPage({
          textTemplate: "{childName}は、ふとんの中にもぐりこみました。まぶたがそっとおもくなってきます。おやすみなさい。",
          baby_toddler: "ふとんに もぐって。まぶた おもい。おやすみ。",
          preschool_3_4:
            "{childName}は、ふとんの なかに もぐりこみました。まぶたが そっと おもくなってきます。おやすみなさい。",
          early_reader_5_6:
            "{childName}は、ふとんの 中に もぐりこみました。まぶたが そっと おもくなってきます。きょうの おやすみぼうけんも、これで おわりです。おやすみなさい。",
          early_elementary_7_8:
            "{childName}は、ふとんの 中に もぐりこみました。まぶたが そっと おもくなってきます。きょうの おやすみぼうけんで 感じた やさしい ひかりが、ゆめのなかにも つながっていきそうです。おやすみなさい。",
          general_child:
            "{childName}は、ふとんの中にもぐりこみました。まぶたがそっとおもくなってきます。おやすみなさい。",
          pageVisualRole: "quiet_ending",
          imagePromptTemplate:
            withSleepyMoon8pRoomPropGuardrail("Medium quiet shot of the same child nestled under a soft blanket on their side, eyes gently closing. The child keeps the same short dark-brown bob haircut and the same pale blue pajamas with a tiny simple star pattern. The same small tan teddy bear plush is tucked under the child's arm with no printed features, no appliqué patterns, and no labels. Moonlight casts a gentle silver glow across the pillow. A tiny star motif appears on the plain pillow corner. Any background shelf or bedside surface, if shown at all, contains only plain toys, plain blocks, or a plain basket, with no visible book covers, no spine writing, and no paper items with visible writing. The room is peaceful and still. Soft watercolor picture book style, near-sleep serenity, intimate and safe, rich but uncluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark."),
        }),
        buildAgeSpecificPage({
          textTemplate: "{parentMessage}",
          baby_toddler: "{parentMessage}",
          preschool_3_4: "{parentMessage}",
          early_reader_5_6: "{parentMessage}",
          early_elementary_7_8: "{parentMessage}",
          general_child: "{parentMessage}",
          pageVisualRole: "quiet_ending",
          imagePromptTemplate:
            withSleepyMoon8pRoomPropGuardrail(`Wide quiet ending shot of the same child asleep comfortably in bed under a soft blanket. The child keeps the same short dark-brown bob haircut and the same pale blue pajamas with a tiny simple star pattern. The same small tan teddy bear plush rests by the child's side. Moonlight paints gentle silver highlights across the room while warm ambient light remains subtle. A tiny star motif appears on the plain blanket edge. Final bedtime scene is visual-only with no message area, no cloud frame, and no invented writing surface. Serene bedtime stillness, safe and cozy environment, watercolor picture book style, balanced calm composition, rich but uncluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark. ${SLEEPY_MOON_8P_ENDING_NO_BUBBLE_CLAUSE}`),
        }),
      ],
    },
  },
  "fixed-cardboard-rocket": {
    name: "ダンボールロケットでしゅっぱつ",
    description: "ごっこ遊びの想像力をのばす、やさしい固定テンプレート",
    icon: "🚀",
    categoryGroupId: "imagination",
    subcategoryId: "pretend-space",
    parentIntent: "自由に想像して、ワクワクしてほしい",
    recommendedAgeMin: 3,
    recommendedAgeMax: 8,
    requiredInputs: ["childName"],
    optionalInputs: ["parentMessage"],
    themeTags: ["imagination", "pretend play", "rocket"],
    creationMode: "fixed_template",
    priceTier: "ume",
    storyCostLevel: "none",
    sampleImageUrl: "/images/templates/fixed-cardboard-rocket.webp",
    sampleImageAlt: "ダンボールロケットで想像の冒険をする子どもの絵本イメージ",
    visualDirection:
      "Warm imaginative playroom mood with cardboard rocket pretend play, symbolic stars and planets, and safe adventurous excitement.",
    order: 12,
    active: true,
    systemPrompt: "固定テンプレートを使って、安心できる想像の宇宙ごっこ絵本を作ります。",
    fixedStory: {
      titleTemplate: "{childName}のダンボールロケットしゅっぱつ",
      previewImageUrl: "/images/templates/fixed-cardboard-rocket.webp",
      coverImagePromptTemplate:
        withFixedImagePromptSafety("Picture book cover illustration: a joyful child beside a handmade cardboard rocket in a cozy playroom, symbolic stars and planets floating as imagination motifs, tiny comet motif recurring, safe pretend-adventure mood, soft watercolor style, rounded child-safe composition, rich but not cluttered details, no text, no letters, no Japanese characters, no readable signs, no logo, no watermark"),
      titleSpreadTextTemplate: "ダンボールロケットで しゅっぱつ",
      openingNarrationTemplate:
        "あるひ、{childName}は へやで ダンボールロケットを みつけました。きょうは そうぞうの うちゅうへ しゅっぱつです。",
      pages: [
        buildAgeSpecificPage({
          textTemplate: "{childName}はへやのすみで、ダンボールロケットを見つけました。",
          baby_toddler: "{childName}、ロケット みつけた。",
          preschool_3_4:
            "{childName}は へやのすみで、ダンボールロケットを みつけました。",
          early_reader_5_6:
            "{childName}は へやのすみで、ダンボールロケットを みつけました。ここから どんな ぼうけんが はじまるのか むねが どきどきします。",
          early_elementary_7_8:
            "{childName}は へやのすみで、ダンボールロケットを みつけました。ふだんの へやが、これから うちゅうへの しゅっぱつちに かわっていきます。",
          general_child: "{childName}はへやのすみで、ダンボールロケットを見つけました。",
          pageVisualRole: "opening_establishing",
          imagePromptTemplate:
            withCardboardRocketImagePromptGuardrail("Setting: A cozy playroom with a handmade cardboard rocket near toy shelves and cushions. Establishing wide shot of a young child standing beside the rocket with surprised excitement, one hand touching the cardboard surface. A tiny comet motif appears on a nearby cushion. Warm indoor light and tidy safe environment emphasize pretend play. Soft watercolor picture book style, clear playroom context, rich but uncluttered composition."),
        }),
        buildAgeSpecificPage({
          textTemplate: "ロケットにのりこんで、{childName}のそうぞうのうちゅうがひろがります。",
          baby_toddler: "ロケット のって、しゅっぱつ。",
          preschool_3_4:
            "ロケットに のりこんで、{childName}の そうぞうの うちゅうが ひろがります。",
          early_reader_5_6:
            "ロケットに のりこんで、{childName}の そうぞうの うちゅうが ひろがります。へやの あかりも、まるで ほしの ひかりみたいに みえてきました。",
          early_elementary_7_8:
            "ロケットに のりこんで、{childName}の そうぞうの うちゅうが ひろがります。ふつうの へやの けしきが、わくわくする うちゅうステーションに かわっていきます。",
          general_child: "ロケットにのりこんで、{childName}のそうぞうのうちゅうがひろがります。",
          pageVisualRole: "discovery",
          imagePromptTemplate:
            withCardboardRocketImagePromptGuardrail("Setting: Inside a cardboard rocket cockpit in a playroom. Discovery medium shot of a young child pretending to launch, smiling with focused excitement while symbolic stars and orbit lines appear as imagination overlays. The real room remains visible to keep the safe pretend-play context. Tiny comet motif appears near the rocket fin. Soft watercolor picture book style, dynamic but gentle framing, rich but uncluttered."),
        }),
        buildAgeSpecificPage({
          textTemplate: "きらきらの星やまるい惑星を見て、{childName}は胸がわくわくしました。",
          baby_toddler: "きらきら ほし、わくわく。",
          preschool_3_4:
            "きらきらの ほしや まるい わくせいを見て、{childName}は わくわくしました。",
          early_reader_5_6:
            "きらきらの ほしや まるい わくせいを見て、{childName}は むねが わくわくしました。みつけるたびに うれしい きもちが ふえていきます。",
          early_elementary_7_8:
            "きらきらの ほしや まるい わくせいを見て、{childName}は むねが わくわくしました。そうぞうの せかいで みつける ひとつひとつが、じぶんだけの たからものになります。",
          general_child: "きらきらの星やまるい惑星を見て、{childName}は胸がわくわくしました。",
          pageVisualRole: "emotional_closeup",
          imagePromptTemplate:
            withCardboardRocketImagePromptGuardrail("Setting: Inside a cardboard rocket in a playroom. Emotional close-up of the child, face lit by soft imaginative starlight effects. Symbolic planets and stars float around as dreamy overlays while maintaining a safe playful tone. The child's expression shows awe and joy without fear. Tiny comet motif appears near the rocket edge. Soft watercolor picture book style, intimate excitement framing, rich but uncluttered."),
        }),
        buildAgeSpecificPage({
          textTemplate: "{parentMessage}",
          baby_toddler: "{parentMessage}",
          preschool_3_4: "{parentMessage}",
          early_reader_5_6: "{parentMessage}",
          early_elementary_7_8: "{parentMessage}",
          general_child: "{parentMessage}",
          pageVisualRole: "quiet_ending",
          imagePromptTemplate:
            withCardboardRocketImagePromptGuardrail("Setting: A cozy playroom. Wide quiet ending shot of the playroom after pretend adventure. The child sits beside the cardboard rocket with a content smile. Toys are neatly arranged, evening light is warm and calm. Tiny comet motif appears on the rocket side. Soft watercolor picture book style, gentle reflective composition, rich but uncluttered."),
        }),
      ],
    },
  },
  "fixed-cardboard-rocket-8p": {
    name: "ダンボールロケットでしゅっぱつ（8ページ）",
    description: "ごっこ遊びの想像力をのばす、宇宙への大冒険を楽しむ8ページ版です。",
    icon: "🚀",
    categoryGroupId: "imagination",
    subcategoryId: "pretend-space",
    parentIntent: "自由に想像して、ワクワクしてほしい",
    recommendedAgeMin: 3,
    recommendedAgeMax: 8,
    requiredInputs: ["childName"],
    optionalInputs: ["parentMessage"],
    themeTags: ["imagination", "pretend play", "rocket", "pilot-8-page"],
    creationMode: "fixed_template",
    priceTier: "ume",
    storyCostLevel: "none",
    sampleImageUrl: "/images/templates/fixed-cardboard-rocket.webp",
    sampleImageAlt: "ダンボールロケットで想像の冒険をする子どもの絵本イメージ（8ページ版）",
    visualDirection:
      "Warm imaginative playroom mood with cardboard rocket pretend play, symbolic stars and planets, and safe adventurous excitement over a gentle 8-page rhythm.",
    order: 12.5,
    active: true,
    systemPrompt: "固定テンプレートを使って、安心できる想像の宇宙ごっこ絵本を8ページで作ります。",
    fixedStory: {
      titleTemplate: "{childName}のダンボールロケットしゅっぱつ",
      previewImageUrl: "/images/templates/fixed-cardboard-rocket.webp",
      coverImagePromptTemplate:
        withFixedImagePromptSafety("Picture book cover illustration: a joyful child beside a handmade cardboard rocket in a cozy playroom, symbolic stars and planets floating as imagination motifs, tiny comet motif recurring, safe pretend-adventure mood, soft watercolor style, rounded child-safe composition, rich but not cluttered details, no text, no letters, no Japanese characters, no readable signs, no logo, no watermark"),
      titleSpreadTextTemplate: "ダンボールロケットで しゅっぱつ",
      openingNarrationTemplate:
        "あるひ、{childName}は へやで ダンボールロケットを みつけました。きょうは そうぞうの うちゅうへ しゅっぱつです。",
      pageCount: 8,
      layoutVariant: "8_page",
      pages: [
        buildAgeSpecificPage({
          textTemplate: "{childName}はへやのすみで、ダンボールロケットを見つけました。さあ、ぼうけんの はじまりです。",
          baby_toddler: "{childName}、ロケット みつけた。わくわく。",
          preschool_3_4:
            "{childName}は へやのすみで、ダンボールロケットを みつけました。さあ、ぼうけんの はじまりです。",
          early_reader_5_6:
            "{childName}は へやのすみで、ダンボールロケットを みつけました。ここから どんな ぼうけんが はじまるのか むねが どきどきします。",
          early_elementary_7_8:
            "{childName}は へやのすみで、ダンボールロケットを みつけました。ふだんの へやが、これから うちゅうへの しゅっぱつちに かわっていきます。",
          general_child:
            "{childName}は へやのすみで、ダンボールロケットを みつけました。さあ、ぼうけんの はじまりです。",
          pageVisualRole: "opening_establishing",
          imagePromptTemplate:
            withCardboardRocket8pImagePromptGuardrail("Establishing wide shot of a cozy playroom with a handmade cardboard rocket near toy shelves and cushions. A child with messy dark hair and a bright red t-shirt stands beside the rocket with surprised excitement. A tiny comet motif appears on a nearby cushion. Warm indoor light and tidy safe environment. Watercolor picture book style, clear playroom context, rich but uncluttered composition. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark."),
        }),
        buildAgeSpecificPage({
          textTemplate: "ペンや シールで、ロケットを もっと かっこよく しました。じゅんびは ばっちりです。",
          baby_toddler: "シール ぺたぺた。かっこいい！",
          preschool_3_4:
            "ペンや シールで、ロケットを もっと かっこよく しました。じゅんびは ばっちりです。",
          early_reader_5_6:
            "ペンや シールを つかって、じぶんだけの ロケットを かざりつけます。まほうの ちからが やどったみたい！",
          early_elementary_7_8:
            "ペンや シールで ロケットを かざりつけながら、{childName}は すでに うちゅうの たびを そうぞうしています。じゅんびは ばっちりです。",
          general_child:
            "ペンや シールで、ロケットを もっと かっこよく しました。じゅんびは ばっちりです。",
          pageVisualRole: "action",
          imagePromptTemplate:
            withCardboardRocket8pImagePromptGuardrail("Medium action shot of the child with messy dark hair and a bright red t-shirt decorating the cardboard rocket with colorful markers and plain stickers. The child is focused and happy. The rocket has a large blue star on the side. Warm playroom light. Soft watercolor picture book style, energetic but gentle movement, rich but not cluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark."),
        }),
        buildAgeSpecificPage({
          textTemplate: "ロケットにのりこんで、カウントダウン！ ３、２、１、はっしゃ！",
          baby_toddler: "ロケット のったよ。しゅっぱつ！",
          preschool_3_4:
            "ロケットに のりこんで、カウントダウン！ ３、２、１、はっしゃ！",
          early_reader_5_6:
            "ロケットに のりこんで、しんこきゅう。カウントダウンが はじまります。３、２、１、はっしゃ！",
          early_elementary_7_8:
            "ロケットの なかに はいると、そこは もう べつの せかい。カウントダウンの こえが ひびきます。３、２、１、はっしゃ！",
          general_child:
            "ロケットに のりこんで、カウントダウン！ ３、２、１、はっしゃ！",
          pageVisualRole: "action",
          imagePromptTemplate:
            withCardboardRocket8pImagePromptGuardrail("Medium discovery shot of the child with messy dark hair and a bright red t-shirt inside the cardboard rocket cockpit. The child holds a simple steering wheel with a look of intense determination and joy. The rocket with a large blue star is clearly visible. A tiny comet motif appears near the window. Watercolor picture book style, exciting launch moment, rich but not cluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark."),
        }),
        buildAgeSpecificPage({
          textTemplate: "まどの そとに、きらきら ひかる おほしさまが いっぱい みえてきました。",
          baby_toddler: "おほしさま、いっぱい。きらきら。",
          preschool_3_4:
            "まどの そとに、きらきら ひかる おほしさまが いっぱい みえてきました。",
          early_reader_5_6:
            "まどの そとには、ほうせき箱を ひっくりかえしたような ほしの せかいが ひろがっています。{childName}は 目を まるくしました。",
          early_elementary_7_8:
            "まどの そとを ながめると、きらめく ほしが むかえてくれました。そうぞうの つばさが、どこまでも ひろがっていきます。",
          general_child:
            "まどの そとに、きらきら ひかる おほしさまが いっぱい みえてきました。",
          pageVisualRole: "discovery",
          imagePromptTemplate:
            withCardboardRocket8pImagePromptGuardrail("Discovery shot from inside the cardboard rocket looking out a round window. The child with messy dark hair and a bright red t-shirt is looking out with wide amazed eyes. Outside, symbolic stars and orbit lines appear in a deep blue sky. The real room is faintly visible at the edges. Tiny comet motif floats nearby. Watercolor picture book style, wonder-filled framing, rich but not cluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark."),
        }),
        buildAgeSpecificPage({
          textTemplate: "まるい わくせい、とんがった わくせい。いろんな ほしの よこを すいすい すすみます。",
          baby_toddler: "いろんな ほし。たのしいね。",
          preschool_3_4:
            "まるい わくせい、とんがった わくせい。いろんな ほしの よこを すいすい すすみます。",
          early_reader_5_6:
            "まるい わくせい、きれいな いろの わくせい。つぎつぎに あらわれる ほしを、{childName}は うれしそうに ゆびさします。",
          early_elementary_7_8:
            "いろんな かたちの わくせいが、ロケットの よこを とおりすぎていきます。そうぞうの うちゅうは、はてしなく ひろいのです。",
          general_child:
            "まるい わくせい、とんがった わくせい。いろんな ほしの よこを すいすい すすみます。",
          pageVisualRole: "payoff",
          imagePromptTemplate:
            withCardboardRocket8pImagePromptGuardrail("Wide payoff shot of the cardboard rocket with a large blue star flying through an imaginative space filled with colorful symbolic planets and soft glowing stars. The child with messy dark hair and a bright red t-shirt is visible through the window, waving. The playroom context is still present as a soft overlay. Tiny comet motif trails behind. Watercolor picture book style, expansive celebratory composition, rich but not cluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark."),
        }),
        buildAgeSpecificPage({
          textTemplate: "うちゅうは、とても ひろくて きれい。{childName}は びっくりしてしまいました。",
          baby_toddler: "うちゅう、きれい。すごいね。",
          preschool_3_4:
            "うちゅうは、とても ひろくて きれい。{childName}は びっくりしてしまいました。",
          early_reader_5_6:
            "うちゅうの ひろさに、{childName}は ただただ びっくり。でも、ちっとも こわくありません。だって、ここは じぶんの そうぞうの せかいだから。",
          early_elementary_7_8:
            "どこまでも つづく きらめきの なかで、{childName}は しずかな かんどうに つつまれます。そうぞうすることの すばらしさを かんじました。",
          general_child:
            "うちゅうは、とても ひろくて きれい。{childName}は びっくりしてしまいました。",
          pageVisualRole: "emotional_closeup",
          imagePromptTemplate:
            withCardboardRocket8pImagePromptGuardrail("Emotional close-up of the child's face with messy dark hair and a bright red t-shirt, lit by soft imaginative starlight. The expression is one of pure awe and serenity. In the background, soft glowing stars and planets float gently. A tiny comet motif appears near the child. Watercolor picture book style, intimate emotional framing, rich but not cluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark."),
        }),
        buildAgeSpecificPage({
          textTemplate: "そろそろ おうちに かえりましょう。ロケットは ゆっくり ちじょうへ おりていきます。",
          baby_toddler: "おうち、かえろう。ゆっくりね。",
          preschool_3_4:
            "そろそろ おうちに かえりましょう。ロケットは ゆっくり ちじょうへ おりていきます。",
          early_reader_5_6:
            "たのしい ぼうけんの あとは、あんしんできる おうちに かえります。ロケットは ゆっくりと げんじつの へやに おりていきました。",
          early_elementary_7_8:
            "うちゅうの たびを おえて、いつもの へやに もどってきました。ロケットは しずかに ちゃくりくします。おかえりなさい、{childName}。",
          general_child:
            "そろそろ おうちに かえりましょう。ロケットは ゆっくり ちじょうへ おりていきます。",
          pageVisualRole: "quiet_ending",
          imagePromptTemplate:
            withCardboardRocket8pImagePromptGuardrail("Wide quiet shot of the cardboard rocket with a large blue star resting in the center of the playroom. The child with messy dark hair and a bright red t-shirt is stepping out, looking content. The evening light through the window is warm. Tiny comet motif is on the rocket fin. Watercolor picture book style, peaceful return composition, rich but not cluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark."),
        }),
        buildAgeSpecificPage({
          textTemplate: "{parentMessage}",
          baby_toddler: "{parentMessage}",
          preschool_3_4: "{parentMessage}",
          early_reader_5_6: "{parentMessage}",
          early_elementary_7_8: "{parentMessage}",
          general_child: "{parentMessage}",
          pageVisualRole: "quiet_ending",
          imagePromptTemplate:
            withCardboardRocket8pImagePromptGuardrail("Back-view gentle closing shot of the child with messy dark hair and a bright red t-shirt sitting beside the cardboard rocket, leaning on it. The playroom is calm and cozy. A few star and planet decorations are still on the floor. A tiny comet motif on the rocket side catches the last warm light. Soft watercolor picture book style, serene final framing, rich but not cluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark."),
        }),
      ],
    },
  },
  "fixed-rainy-day-puddle": {
    name: "あめの日の みずたまり",
    description: "雨の日の小さな発見を、やさしく前向きに描く固定テンプレート",
    icon: "☔",
    categoryGroupId: "daily-life",
    subcategoryId: "rainy-day-discovery",
    parentIntent: "毎日のくらしの中で前向きな気持ちを育てたい",
    recommendedAgeMin: 2,
    recommendedAgeMax: 8,
    requiredInputs: ["childName"],
    optionalInputs: ["parentMessage"],
    themeTags: ["rainy day", "daily life", "discovery"],
    creationMode: "fixed_template",
    priceTier: "ume",
    storyCostLevel: "none",
    sampleImageUrl: "/images/templates/fixed-rainy-day-puddle.webp",
    sampleImageAlt: "雨の日の水たまりに映る空を見つめる子どもの絵本イメージ",
    visualDirection:
      "Cozy rainy-day picture-book mood with reflective puddles, soft umbrellas, gentle outdoor light, and warm after-rain comfort.",
    order: 13,
    active: true,
    systemPrompt: "固定テンプレートを使って、雨の日でも楽しい発見を見つける絵本を作ります。",
    fixedStory: {
      previewImageUrl: "/images/templates/fixed-rainy-day-puddle.webp",
      titleTemplate: "{childName}とあめの日のみずたまり",
      coverImagePromptTemplate:
        withFixedImagePromptSafety("Picture book cover illustration: a cheerful child in a bright raincoat standing beside a shimmering puddle on a safe garden path, soft drizzle and gentle umbrella shapes, cozy rainy-day mood, watercolor storybook style, recurring tiny raindrop motif, rich but not cluttered details, no text, no letters, no Japanese characters, no readable signs, no logo, no watermark"),
      titleSpreadTextTemplate: "あめの日の みずたまり",
      openingNarrationTemplate:
        "そとは しとしと あめもよう。{childName}は まどのそとに きらりとひかる みずたまりを みつけました。",
      pages: [
        buildAgeSpecificPage({
          textTemplate: "まどのそとには、やさしい雨がふっていました。{childName}は、きらきらのみずたまりを見つけます。",
          baby_toddler: "あめ しとしと。みずたまり きらり。",
          preschool_3_4:
            "まどのそとには、やさしい雨がふっていました。{childName}は、きらきらの みずたまりを みつけます。",
          early_reader_5_6:
            "まどのそとには、やさしい雨が ふっていました。{childName}は、きらきらの みずたまりを 見つけて、ちょっと うれしい気持ちになります。",
          early_elementary_7_8:
            "まどのそとには、やさしい雨が ふっていました。{childName}は、灰色の空のしたで ひかる みずたまりを 見つけて、雨の日にも たのしい発見があると 気づきます。",
          general_child:
            "まどのそとには、やさしい雨がふっていました。{childName}は、きらきらの みずたまりを みつけます。",
          pageVisualRole: "opening_establishing",
          imagePromptTemplate:
            withRainyDayImagePromptGuardrail("Setting: Inside a cozy home looking toward a rainy garden path through a window. Establishing wide shot of a young child standing by the window with curious eyes, noticing a shimmering puddle outside. Soft indoor warm light contrasts with cool rainy daylight outdoors. A tiny raindrop motif appears near the window frame. Child-safe, calm atmosphere with no nearby vehicles. Soft watercolor picture book style, layered foreground and background, rich but not cluttered."),
        }),
        buildAgeSpecificPage({
          textTemplate: "レインコートをきて、{childName}はそっとそとへでました。みずたまりがまるで宝ものみたいです。",
          baby_toddler: "レインコート きて、そとへ ぴょこん。",
          preschool_3_4:
            "レインコートをきて、{childName}は そっと そとへでました。みずたまりが きらきら しています。",
          early_reader_5_6:
            "レインコートをきて、{childName}は そっと そとへでました。みずたまりを ひとつ見つけるたび、わくわくが ふえていきます。",
          early_elementary_7_8:
            "レインコートをきて、{childName}は そっと そとへでました。雨の音を ききながら みずたまりを のぞくと、ふだんとちがう せかいが ひらいていきます。",
          general_child:
            "レインコートをきて、{childName}はそっとそとへでました。みずたまりがまるで宝ものみたいです。",
          pageVisualRole: "discovery",
          imagePromptTemplate:
            withRainyDayImagePromptGuardrail("Setting: A rainy garden walkway with a shimmering puddle. Medium discovery shot of a young child in a raincoat and rain boots standing on a safe garden walkway, gently approaching a puddle while holding an umbrella. Rain droplets create soft rings on water. A tiny raindrop motif is reflected near the puddle edge. The environment is child-safe, peaceful, and away from vehicle traffic. Soft watercolor picture book style, clear emotional storytelling composition, rich but not cluttered."),
        }),
        buildAgeSpecificPage({
          textTemplate: "みずたまりには空と{childName}のえがおがうつって、{childName}はうれしくなりました。",
          baby_toddler: "みずたまりに そら。{childName} にこっ。",
          preschool_3_4:
            "みずたまりには そらと {childName}の えがおが うつって、{childName}は うれしくなりました。",
          early_reader_5_6:
            "みずたまりには そらと {childName}の えがおが うつっていました。{childName}は、雨の日の きれいな ひみつを 見つけた気分です。",
          early_elementary_7_8:
            "みずたまりには 空と {childName}の えがおが うつっていました。雨のしずくが つくる 小さなゆらぎを見て、{childName}は こころまで きらきら してきます。",
          general_child:
            "みずたまりには空と{childName}のえがおがうつって、{childName}はうれしくなりました。",
          pageVisualRole: "emotional_closeup",
          imagePromptTemplate:
            withRainyDayImagePromptGuardrail("Setting: A rainy garden walkway with a shimmering puddle. Emotional close-up of a young child crouching beside a puddle, smiling as reflection shows sky, clouds, and the child face in rippling water. Small raindrops create delicate circles across the reflection. A tiny raindrop motif appears in the reflected light pattern. Gentle rain ambiance, cozy and hopeful mood, child-safe setting. Soft watercolor picture book style, intimate framing with soft depth, rich but not cluttered."),
        }),
        buildAgeSpecificPage({
          textTemplate: "おうちにもどって、{childName}は「雨の日もたのしかったね」とにっこりしました。{parentMessage}",
          baby_toddler: "ただいま. あめの日 たのしかったね. {parentMessage}",
          preschool_3_4:
            "おうちにもどって、{childName}は「雨の日も たのしかったね」と にっこりしました。さいごに、{parentMessage}",
          early_reader_5_6:
            "おうちにもどって、{childName}は「雨の日も たのしかったね」と にっこり。ぬれた くつを ならべながら、{parentMessage}",
          early_elementary_7_8:
            "おうちにもどって、{childName}は「雨の日も たのしかったね」と にっこりしました。きょうの発見を 思い出しながら、{parentMessage}",
          general_child:
            "おうちにもどって、{childName}は「雨の日もたのしかったね」とにっこりしました。{parentMessage}",
          pageVisualRole: "quiet_ending",
          imagePromptTemplate:
            withRainyDayImagePromptGuardrail("Setting: Inside a cozy home entryway after the rain. Wide quiet ending shot of a young child returned home, placing rain boots neatly by the door and smiling warmly while holding a small umbrella. Soft towel and warm indoor light suggest comfort and calm. A tiny raindrop motif appears on the umbrella handle. Peaceful reflective mood, child-safe home environment, soft watercolor picture book style, rich but not cluttered."),
        }),
      ],
    },
  },
  "fixed-little-helper": {
    name: "ちいさなおてつだい",
    description: "小さなお手伝いで自己効力感を育てる、家族向け固定テンプレート",
    icon: "🧺",
    categoryGroupId: "emotional-growth",
    subcategoryId: "little-helper",
    parentIntent: "優しい子に育ってほしい。自信を持ってほしい",
    recommendedAgeMin: 3,
    recommendedAgeMax: 8,
    requiredInputs: ["childName"],
    optionalInputs: ["parentMessage"],
    themeTags: ["helper", "family", "self-efficacy"],
    creationMode: "fixed_template",
    priceTier: "ume",
    storyCostLevel: "none",
    sampleImageUrl: "/images/templates/fixed-little-helper.webp",
    sampleImageAlt: "家族のお手伝いを通じて自信を育む子どもの絵本イメージ",
    visualDirection:
      "Warm family home picture-book mood with safe helper tasks, gentle gratitude, and calm everyday confidence-building moments.",
    order: 14,
    active: true,
    systemPrompt: "固定テンプレートを使って、小さなお手伝いの達成感をやさしく描く絵本を作ります。",
    fixedStory: {
      titleTemplate: "{childName}のちいさなおてつだい",
      previewImageUrl: "/images/templates/fixed-little-helper.webp",
      coverImagePromptTemplate:
        withLittleHelperImagePromptGuardrail("Picture book cover illustration: a smiling child carrying a small plain basket of folded towels in a cozy family room, warm family members nearby, gentle gratitude mood, recurring tiny heart-spark motif, watercolor storybook style, child-safe rounded composition, rich but not cluttered details"),
      titleSpreadTextTemplate: "ちいさなおてつだい",
      openingNarrationTemplate:
        "あるひの おうちで、{childName}は みんなの やくにたてる ちいさな おてつだいを さがしはじめました。",
      pages: [
        buildAgeSpecificPage({
          textTemplate: "おうちでは、みんながおかたづけやじゅんびでいそがしそうです。{childName}はそれを見ていました。",
          baby_toddler: "みんな じゅんび。{childName} みてる。",
          preschool_3_4:
            "おうちでは、みんながおかたづけや じゅんびで いそがしそうです。{childName}は それを 見ていました。",
          early_reader_5_6:
            "おうちでは、みんなが おかたづけや じゅんびで いそがしそうです。{childName}は、じぶんにも できることが あるかなと かんがえます。",
          early_elementary_7_8:
            "おうちでは、みんなが おかたづけや じゅんびで いそがしそうです。{childName}は、だれかの たすけに なることを してみたいと 思いました。",
          general_child:
            "おうちでは、みんながおかたづけやじゅんびでいそがしそうです。{childName}はそれを見ていました。",
          pageVisualRole: "opening_establishing",
          imagePromptTemplate:
            withLittleHelperImagePromptGuardrail("Setting: A cozy family room connected to a safe kitchen area. Establishing wide shot of a young child watching family members organize plain cushions, laundry, and unmarked table items with interest, ready to help. A tiny heart-spark motif appears on a plain basket handle. Warm daylight, calm home atmosphere, child-safe environment with no hazardous tools visible. Soft watercolor picture book style, layered composition, rich but not cluttered."),
        }),
        buildAgeSpecificPage({
          textTemplate: "{childName}は、できそうなおてつだいを見つけました。小さなかごをもって、タオルをはこびます。",
          baby_toddler: "おてつだい みつけた。はこぶよ。",
          preschool_3_4:
            "{childName}は、できそうな おてつだいを 見つけました。ちいさな かごをもって、タオルを はこびます。",
          early_reader_5_6:
            "{childName}は、できそうな おてつだいを 見つけました。ちいさな かごを しっかり もって、ていねいに タオルを はこびます。",
          early_elementary_7_8:
            "{childName}は、じぶんにも できる おてつだいを 見つけました。バランスを とりながら かごを はこんで、すこしずつ たのもしい うごきに かわっていきます。",
          general_child:
            "{childName}は、できそうなおてつだいを見つけました。小さなかごをもって、タオルをはこびます。",
          pageVisualRole: "discovery",
          imagePromptTemplate:
            withLittleHelperImagePromptGuardrail("Setting: A cozy family room. Medium discovery shot of a young child carefully carrying a small plain basket with folded towels. Family member nearby offers a supportive smile. A tiny heart-spark motif appears near the folded towels. Safe simple household task only, with no hazardous tools visible. Soft watercolor picture book style, clear action framing, warm and encouraging mood, rich but not cluttered."),
        }),
        buildAgeSpecificPage({
          textTemplate: "「ありがとう」と言われて、{childName}のこころはぽかぽかになりました。",
          baby_toddler: "ありがとう。うれしいね。",
          preschool_3_4:
            "「ありがとう」と いわれて、{childName}の こころは ぽかぽかに なりました。",
          early_reader_5_6:
            "「ありがとう」と いわれて、{childName}の こころは ぽかぽかに なりました. だれかの 役に立てたことが、とても うれしかったのです。",
          early_elementary_7_8:
            "「ありがとう」と いわれて、{childName}の こころは ぽかぽかに なりました. 小さな こうどうでも、だれかを たすけられるのだと 実感します。",
          general_child:
            "「ありがとう」と言われて、{childName}のこころはぽかぽかになりました。",
          pageVisualRole: "emotional_closeup",
          imagePromptTemplate:
            withLittleHelperImagePromptGuardrail("Setting: A cozy family room. Emotional close-up of a young child receiving warm thanks from a family member, both smiling with soft eye contact. The child holds an empty basket proudly after helping. A tiny heart-spark motif glows near their hands. Soft watercolor picture book style, intimate emotional composition, rich but not cluttered."),
        }),
        buildAgeSpecificPage({
          textTemplate: "{childName}は「またおてつだいしたいな」と思いました。{parentMessage}",
          baby_toddler: "また おてつだい したいな。{parentMessage}",
          preschool_3_4:
            "{childName}は「また おてつだい したいな」と おもいました。さいごに、{parentMessage}",
          early_reader_5_6:
            "{childName}は「また おてつだい したいな」と おもいました。できることが ふえるたび、じぶんの こころも つよくなる気がします。さいごに、{parentMessage}",
          early_elementary_7_8:
            "{childName}は「また おてつだい したいな」と おもいました。ちいさな行動が 家族の えがおに つながることを知って、{parentMessage}",
          general_child:
            "{childName}は「またおてつだいしたいな」と思いました。{parentMessage}",
          pageVisualRole: "quiet_ending",
          imagePromptTemplate:
            withLittleHelperImagePromptGuardrail("Wide quiet ending shot of a calm family room after the helper task is done. The child sits comfortably beside family, smiling with relaxed pride while a tidy basket rests nearby. A tiny heart-spark motif appears on a cushion seam. Warm evening light, peaceful home mood, safe and reassuring composition. Watercolor picture book style, reflective ending framing, rich but not cluttered."),
        }),
      ],
    },
  },
  "fixed-cherry-blossom": {
    name: "はなみさんぽ",
    description: "春の公園でお花見さんぽ。ピンクの花びらが舞う特別な一日の思い出固定テンプレート",
    icon: "🌸",
    categoryGroupId: "seasonal-events",
    subcategoryId: "spring-events",
    parentIntent: "季節の行事を一緒に楽しみたい",
    recommendedAgeMin: 1,
    recommendedAgeMax: 8,
    requiredInputs: ["childName"],
    optionalInputs: ["parentMessage"],
    themeTags: ["spring", "cherry-blossom", "nature", "picnic"],
    creationMode: "fixed_template",
    priceTier: "ume",
    storyCostLevel: "none",
    sampleImageUrl: "/images/templates/fixed-cherry-blossom.webp",
    sampleImageAlt: "春の桜の木の下を歩く子どもの絵本イメージ",
    visualDirection:
      "Soft spring park atmosphere with cherry blossom trees in full bloom, pink petals drifting gently, and a tiny pink petal motif recurring throughout.",
    order: 50,
    active: true,
    systemPrompt: "固定テンプレートを使って、春のお花見さんぽの思い出絵本を作ります。",
    fixedStory: {
      previewImageUrl: "/images/templates/fixed-cherry-blossom.webp",
      titleTemplate: "{childName}の はなみさんぽ",
      coverImagePromptTemplate:
        withFixedImagePromptSafety("Picture book cover illustration: a joyful child walking under a tunnel of blooming cherry blossom trees, pink petals drifting all around, soft warm spring sunlight, a tiny pink petal motif floating near the child, gentle spring park mood, soft watercolor style, rounded child-safe composition, rich but not cluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark."),
      titleSpreadTextTemplate: "はるの さくら、きれいだね",
      openingNarrationTemplate:
        "はるのあたたかいひ、{childName}は こうえんへ でかけました。さくらのきが ピンクのはなびらを ふわりと まとっています。",
      pages: [
        buildAgeSpecificPage({
          textTemplate: "{childName}は桜の木の下を歩きました。ピンクの花びらがひらひら舞っています。",
          baby_toddler: "さくら きれい。はなびら ひらひら。",
          preschool_3_4:
            "{childName}は さくらの きの したを あるきました。ピンクの はなびらが ひらひら まっています。",
          early_reader_5_6:
            "{childName}は さくらの きの したを あるきました。ピンクの はなびらが かぜに のって ひらひら まっていて、まるで ゆきのようです。",
          early_elementary_7_8:
            "{childName}は さくらの きの したを あるきました。ピンクの はなびらが かぜに のって ひらひら まっていて、てのひらで つかまえようと しました。",
          general_child: "{childName}は桜の木の下を歩きました。ピンクの花びらがひらひら舞っています。",
          pageVisualRole: "opening_establishing",
          imagePromptTemplate:
            "Establishing wide shot of a park path lined with cherry blossom trees in full bloom, pink petals drifting through the air like soft snow. A child walks along the petal-covered path with arms slightly raised. Tiny pink petal motifs dot the ground. Warm spring sunlight, watercolor picture book style, peaceful spring park mood, rich but uncluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark.",
        }),
        buildAgeSpecificPage({
          textTemplate: "青いシートを広げてお花見ピクニック。ピンクの花びらがお弁当に飛んできました。",
          baby_toddler: "シート ひろげて ぴくにっく！",
          preschool_3_4:
            "あおい シートを ひろげて おはなみ ぴくにっく。ピンクの はなびらが とんで きました。",
          early_reader_5_6:
            "あおい シートに すわって おべんとうを ひろげると、ピンクの はなびらが そっと とんで きました。はるの おとずれを かんじます。",
          early_elementary_7_8:
            "あおい シートに すわって おべんとうを ひろげると、ピンクの はなびらが ひとひら おちてきました。「はるが おいしいよって いってるね」と {childName}は わらいました。",
          general_child: "青いシートを広げてお花見ピクニック。ピンクの花びらがお弁当に飛んできました。",
          pageVisualRole: "discovery",
          imagePromptTemplate:
            "Discovery medium shot of a spring picnic scene with a light blue picnic sheet spread under cherry blossom trees. A child sits happily with a bento box open, a single tiny pink petal landed gently on the food. Cherry blossoms frame above. Soft spring light. Watercolor picture book style, warm family picnic mood, rich but uncluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark.",
        }),
        buildAgeSpecificPage({
          textTemplate: "{childName}は集めた花びらを空に向かって投げました。ふわっと舞い上がりました！",
          baby_toddler: "はなびら まーい！わーい！",
          preschool_3_4:
            "{childName}は あつめた はなびらを そらに むかって なげました。ふわっと まいあがりました！",
          early_reader_5_6:
            "{childName}は てのひらの はなびらを そらへ なげました。ピンクのはなびらが ふわっと まいあがって、そらが ピンクに そまりました。",
          early_elementary_7_8:
            "{childName}は てのひらの はなびらを そらへ なげると、ふわっと まいあがった はなびらたちが かぜに のって どこまでも とんでいきました。",
          general_child: "{childName}は集めた花びらを空に向かって投げました。ふわっと舞い上がりました！",
          pageVisualRole: "emotional_closeup",
          imagePromptTemplate:
            "Emotional close-up of a child tossing a handful of cherry blossom petals into the air, face tilted up with a radiant joyful smile. Petals swirl all around in a pink cloud. Tiny pink petal motifs fill the air. Warm spring light, watercolor picture book style, peak joy moment, rich but uncluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark.",
        }),
        buildAgeSpecificPage({
          textTemplate: "帰り道、{childName}の手にはピンクの花びらがそっと残っていました。{parentMessage}",
          baby_toddler: "はなびら おてて に。{parentMessage}",
          preschool_3_4:
            "かえりみち、{childName}の てには ピンクの はなびらが のこっていました。{parentMessage}",
          early_reader_5_6:
            "かえりみち、{childName}の てのひらに はなびらが ひとひら のっていました。きょうのおはなみ、ずっとわすれないね。{parentMessage}",
          early_elementary_7_8:
            "かえりみち、{childName}の てのひらに ピンクの はなびらが そっと のっていました。はるの きおくが てのひらに やどっているみたいです。{parentMessage}",
          general_child:
            "かえりみち、{childName}の てには ピンクの はなびらが のこっていました。{parentMessage}",
          pageVisualRole: "quiet_ending",
          imagePromptTemplate:
            "Wide quiet ending shot of a child walking home along a cherry blossom-lined path in soft golden afternoon light, one hand open with a single pink petal resting on the palm. Tender memory-filled mood. Watercolor picture book style, peaceful spring ending, rich but not cluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark.",
        }),
      ],
    },
  },
  "fixed-hinamatsuri": {
    name: "ひなまつり",
    description: "おひなさまと一緒にお祝い。3月3日、女の子のすこやかな成長を願う特別な日の絵本",
    icon: "🎎",
    categoryGroupId: "seasonal-events",
    subcategoryId: "japanese-traditional",
    parentIntent: "季節の行事を一緒に楽しみたい",
    recommendedAgeMin: 1,
    recommendedAgeMax: 6,
    requiredInputs: ["childName"],
    optionalInputs: ["parentMessage"],
    themeTags: ["hinamatsuri", "traditional", "spring", "dolls"],
    creationMode: "fixed_template",
    priceTier: "ume",
    storyCostLevel: "none",
    sampleImageUrl: "/images/templates/fixed-hinamatsuri.webp",
    sampleImageAlt: "ひなまつりのおひなさまと一緒にお祝いする子どもの絵本イメージ",
    visualDirection:
      "Traditional Hinamatsuri atmosphere with tiered doll displays, soft pink and gold tones, peach blossoms, and a tiny golden diamond motif throughout.",
    order: 51,
    active: true,
    systemPrompt: "固定テンプレートを使って、ひなまつりのお祝い絵本を作ります。",
    fixedStory: {
      previewImageUrl: "/images/templates/fixed-hinamatsuri.webp",
      titleTemplate: "{childName}の ひなまつり",
      coverImagePromptTemplate:
        withFixedImagePromptSafety("Picture book cover illustration: a joyful child standing in front of a beautiful tiered Hina doll display, peach blossoms beside it, soft pink and gold hues, a tiny golden diamond motif on the doll's garment, traditional Hinamatsuri celebration mood, soft watercolor style, rounded child-safe composition, rich but not cluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark."),
      titleSpreadTextTemplate: "おひなさま、おめでとう",
      openingNarrationTemplate:
        "さんがつみっか、ひなまつりの ひ。{childName}は おうちに かざられた おひなさまに あいさつを しました。きんの ひしもようが キラリと ひかります。",
      pages: [
        buildAgeSpecificPage({
          textTemplate: "{childName}はひな人形の前に座ってご挨拶しました。きれいなおひなさまです。",
          baby_toddler: "おひなさま、きれい。にこにこ。",
          preschool_3_4:
            "{childName}は ひなにんぎょうの まえに すわって ごあいさつ しました。きれいな おひなさまです。",
          early_reader_5_6:
            "{childName}は ひなにんぎょうの まえに すわって ごあいさつ しました。きんの ひしもようが キラリ ひかって、おひなさまは にっこり しているみたいです。",
          early_elementary_7_8:
            "{childName}は ひなにんぎょうの まえに すわって ごあいさつ しました。きんの ひしもようが きらきら ひかって、「{childName}の すこやかな せいちょうを おいわい しているよ」と いってくれているようです。",
          general_child: "{childName}はひな人形の前に座ってご挨拶しました。きれいなおひなさまです。",
          pageVisualRole: "opening_establishing",
          imagePromptTemplate:
            "Establishing wide shot of a cozy Japanese living room with a beautiful tiered Hina doll display. The child sits politely in front, looking up at the Emperor and Empress dolls on the top tier. Soft pink and gold hues fill the scene. Peach blossoms in a vase beside the display. Tiny golden diamond motifs decorate the doll garments. Warm indoor light. Watercolor picture book style, traditional Hinamatsuri celebration mood, rich but uncluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark.",
        }),
        buildAgeSpecificPage({
          textTemplate: "ひしもちとあられをお供えしました。ピンク・白・緑のきれいな色です。",
          baby_toddler: "もも いろ おもち、かわいい！",
          preschool_3_4:
            "ひしもちと あられを おそなえ しました。ピンク・しろ・みどりの きれいな いろです。",
          early_reader_5_6:
            "ひしもちと あられを おそなえ しました。ピンクと しろと みどりの かわいい いろは、はるの きせつを あらわしているそうです。",
          early_elementary_7_8:
            "ひしもちと あられを おそなえ しました。ピンクは もも、しろは ゆき、みどりは のはら を あらわしているそうです。{childName}は それぞれの いろを ゆっくり ながめました。",
          general_child: "ひしもちとあられをお供えしました。ピンク・白・緑のきれいな色です。",
          pageVisualRole: "discovery",
          imagePromptTemplate:
            "Discovery medium shot of a child carefully arranging pink, white, and green diamond-shaped hishi mochi rice cakes and small round arare crackers on a low table in front of the Hina display. Peach blossoms frame the right side. Tiny golden diamond motifs appear on the cloth corners. Soft warm indoor light. Watercolor picture book style, traditional Japanese atmosphere, rich but uncluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark.",
        }),
        buildAgeSpecificPage({
          textTemplate: "{childName}はおひなさまと目が合って、やさしい気持ちになりました。",
          baby_toddler: "おひなさま、みてるよ。やさしい。",
          preschool_3_4:
            "{childName}は おひなさまと めが あって、やさしい きもちに なりました。",
          early_reader_5_6:
            "{childName}は おひなさまと しずかに めを あわせました。おひなさまの やさしい ひょうじょうを みていると、あたたかい きもちに なります。",
          early_elementary_7_8:
            "{childName}は おひなさまと しずかに めを あわせました。きんの ひしもようが やわらかく ひかって、「いつまでも げんきで いてね」と おひなさまが いっている ようです。",
          general_child: "{childName}はおひなさまと目が合って、やさしい気持ちになりました。",
          pageVisualRole: "emotional_closeup",
          imagePromptTemplate:
            "Emotional close-up of the child's face looking up at the gentle Emperor Hina doll's expression. The child smiles softly. Peach blossoms softly blur in the background. Golden diamond motifs gleam on the doll's court garment. Warm soft candlelight mood. Watercolor picture book style, intimate tender moment, traditional Hinamatsuri atmosphere, rich but uncluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark.",
        }),
        buildAgeSpecificPage({
          textTemplate: "{childName}の健やかな成長を、おひなさまが優しく見守っています。{parentMessage}",
          baby_toddler: "おひなさま、みてるね。{parentMessage}",
          preschool_3_4:
            "{childName}の すこやかな せいちょうを、おひなさまが やさしく みまもっています。{parentMessage}",
          early_reader_5_6:
            "{childName}の すこやかな せいちょうを、おひなさまが ずっと やさしく みまもっています。たいせつな ひなまつりの おもいで。{parentMessage}",
          early_elementary_7_8:
            "{childName}の すこやかな せいちょうを、おひなさまが ずっと みまもっています。きんの ひしもようが こころに のこる、たいせつな ひなまつりのおもいでです。{parentMessage}",
          general_child:
            "{childName}の すこやかな せいちょうを、おひなさまが やさしく みまもっています。{parentMessage}",
          pageVisualRole: "quiet_ending",
          imagePromptTemplate:
            "Wide quiet ending shot of the child bowing gently before the Hina doll display, the golden diamond motifs on the dolls' garments gleaming warmly. Peach blossoms in the vase cast soft shadows. Peaceful protective mood. Watercolor picture book style, tender traditional ending, warm soft lighting, rich but not cluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark.",
        }),
      ],
    },
  },
  "fixed-childrens-day": {
    name: "こいのぼりのひ",
    description: "5月5日こどもの日、こいのぼりと一緒に元気いっぱい。男の子の健やかな成長を願う絵本",
    icon: "🎏",
    categoryGroupId: "seasonal-events",
    subcategoryId: "japanese-traditional",
    parentIntent: "季節の行事を一緒に楽しみたい",
    recommendedAgeMin: 1,
    recommendedAgeMax: 7,
    requiredInputs: ["childName"],
    optionalInputs: ["parentMessage"],
    themeTags: ["childrens-day", "koinobori", "traditional", "spring"],
    creationMode: "fixed_template",
    priceTier: "ume",
    storyCostLevel: "none",
    sampleImageUrl: "/images/templates/fixed-childrens-day.webp",
    sampleImageAlt: "こどもの日にこいのぼりと遊ぶ子どもの絵本イメージ",
    visualDirection:
      "Bright spring sky with colorful koinobori carp streamers flying high, blue scale motif, energetic and celebratory atmosphere throughout.",
    order: 52,
    active: true,
    systemPrompt: "固定テンプレートを使って、こどもの日のこいのぼり絵本を作ります。",
    fixedStory: {
      previewImageUrl: "/images/templates/fixed-childrens-day.webp",
      titleTemplate: "{childName}と こいのぼり",
      coverImagePromptTemplate:
        withFixedImagePromptSafety("Picture book cover illustration: a joyful child standing in a sunny yard with colorful koinobori carp streamers flying high above — large black, red, and blue carp banners flapping in the breeze — bright spring sky, a tiny blue fish scale motif on the child's outfit, energetic celebratory mood, soft watercolor style, rounded child-safe composition, rich but not cluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark."),
      titleSpreadTextTemplate: "こいのぼり、たかく およげ！",
      openingNarrationTemplate:
        "ごがつ いつか、こどもの ひ。{childName}は そらをみあげました。おおきな こいのぼりが かぜに のって およいでいます。あおい うろこが きらりと ひかります。",
      pages: [
        buildAgeSpecificPage({
          textTemplate: "{childName}は空を見上げました。こいのぼりが大きく泳いでいます！",
          baby_toddler: "こいのぼり、おおきい！わーい！",
          preschool_3_4:
            "{childName}は そらを みあげました。こいのぼりが おおきく およいでいます！",
          early_reader_5_6:
            "{childName}は そらを みあげました。くろ・あか・あおの こいのぼりが かぜを うけて おおきく およいでいます！あおい うろこが キラリと ひかります。",
          early_elementary_7_8:
            "{childName}は そらを みあげました。おとうさんこい・おかあさんこい・{childName}こい が かぜを うけて おおきく およいでいます。あおい うろこが キラリと ひかり、{childName}も まけずに げんきをだそうと おもいました。",
          general_child: "{childName}は空を見上げました。こいのぼりが大きく泳いでいます！",
          pageVisualRole: "opening_establishing",
          imagePromptTemplate:
            "Establishing wide shot of a sunny yard with colorful koinobori carp streamers flying high on a tall pole against a bright blue spring sky. Black, red, and blue carp banners flap in the breeze. A child stands below, looking up with wide excited eyes. Tiny blue fish scale motifs appear on the pole decorations. Warm spring sunlight, watercolor picture book style, energetic celebratory mood, rich but uncluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark.",
        }),
        buildAgeSpecificPage({
          textTemplate: "「ぼくもこいのぼりみたいに空を泳ぎたいな！」{childName}は両手を広げました。",
          baby_toddler: "ておよぎ、こいのぼりみたい！",
          preschool_3_4:
            "「ぼくも こいのぼりみたいに そらを およぎたいな！」{childName}は りょうてを ひろげました。",
          early_reader_5_6:
            "「ぼくも こいのぼりみたいに そらを およぎたいな！」{childName}は りょうてを ひろげて、かぜを うけながら はしりました。",
          early_elementary_7_8:
            "{childName}は りょうてを ひろげて、かぜを うけながら はしりました。こいのぼりのように たかく たかく そらを およぎたい。あおい うろこのように つよく げんきに！",
          general_child: "「ぼくもこいのぼりみたいに空を泳ぎたいな！」{childName}は両手を広げました。",
          pageVisualRole: "discovery",
          imagePromptTemplate:
            "Discovery medium shot of the child running with arms spread wide like wings across a sunny green lawn, looking up at the koinobori streamers above. The child's face is full of energy and joy, hair blown by the spring breeze. Colorful koinobori trail in the sky behind. Tiny blue fish scale motifs appear on the child's clothing. Bright spring light. Watercolor picture book style, exuberant outdoor fun mood, rich but uncluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark.",
        }),
        buildAgeSpecificPage({
          textTemplate: "かぶとをかぶった{childName}はとても勇ましく見えました。",
          baby_toddler: "かぶと、つよそう！かっこいい！",
          preschool_3_4:
            "かぶとを かぶった {childName}は とても ゆうましく みえました。",
          early_reader_5_6:
            "いえの なかには きりがみの かぶとが かざってありました。{childName}が かぶると、とても ゆうましく みえました。",
          early_elementary_7_8:
            "いえの なかには かぶとが かざってありました。{childName}が かぶると、まるで ゆうしゃのようです。あおい うろこのような つよさが こころに みなぎります。",
          general_child: "かぶとをかぶった{childName}はとても勇ましく見えました。",
          pageVisualRole: "emotional_closeup",
          imagePromptTemplate:
            "Emotional close-up of the child wearing a traditional folded paper kabuto warrior helmet, sitting proudly with a confident and brave expression. A small Boys' Day display with kabuto decoration is visible in the background. Tiny blue fish scale motifs decorate the folded paper. Warm indoor light. Watercolor picture book style, proud celebratory close-up, rich but uncluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark.",
        }),
        buildAgeSpecificPage({
          textTemplate: "{childName}が元気に大きくなれますように。こいのぼりが空を泳ぎます。{parentMessage}",
          baby_toddler: "こいのぼり、げんきでね。{parentMessage}",
          preschool_3_4:
            "{childName}が げんきに おおきく なれますように。こいのぼりが そらを およぎます。{parentMessage}",
          early_reader_5_6:
            "{childName}が げんきに おおきく なれますように。こいのぼりが そらたかく、かぜを うけて およいでいます。{parentMessage}",
          early_elementary_7_8:
            "こいのぼりが そらを たかく およぎます。{childName}が かわを のぼる こいのように、つよく げんきに おおきく なれますように。{parentMessage}",
          general_child:
            "{childName}が げんきに おおきく なれますように。こいのぼりが そらを およぎます。{parentMessage}",
          pageVisualRole: "quiet_ending",
          imagePromptTemplate:
            "Wide quiet ending shot of the koinobori carp streamers flying peacefully against a pastel evening sky, the child watching from below with a calm happy smile. Soft golden late-afternoon light. Tiny blue fish scale motifs glimmer on the banners. Tender and hopeful mood. Watercolor picture book style, gentle celebratory farewell, rich but not cluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark.",
        }),
      ],
    },
  },
  "fixed-tanabata": {
    name: "たなばたのねがい",
    description: "7月7日、たなばたの夜に星に願いを。笹に短冊をかけて、{childName}の夢を星に届けよう",
    icon: "🎋",
    categoryGroupId: "seasonal-events",
    subcategoryId: "japanese-traditional",
    parentIntent: "季節の行事を一緒に楽しみたい",
    recommendedAgeMin: 2,
    recommendedAgeMax: 8,
    requiredInputs: ["childName"],
    optionalInputs: ["parentMessage"],
    themeTags: ["tanabata", "star", "wish", "summer"],
    creationMode: "fixed_template",
    priceTier: "ume",
    storyCostLevel: "none",
    sampleImageUrl: "/images/templates/fixed-tanabata.webp",
    sampleImageAlt: "たなばたの夜に笹に短冊を飾る子どもの絵本イメージ",
    visualDirection:
      "Magical summer night with a bamboo branch hung with colorful tanzaku wish strips, a Milky Way sky, and a tiny silver star motif throughout.",
    order: 53,
    active: true,
    systemPrompt: "固定テンプレートを使って、たなばたの願い事絵本を作ります。",
    fixedStory: {
      previewImageUrl: "/images/templates/fixed-tanabata.webp",
      titleTemplate: "{childName}の たなばたの ねがい",
      coverImagePromptTemplate:
        withFixedImagePromptSafety("Picture book cover illustration: a joyful child hanging a colorful wish tanzaku strip on a bamboo branch decorated with streamers and paper decorations, a starry Milky Way sky above, tiny silver star motifs drifting like snow, magical summer night mood, soft watercolor style, rounded child-safe composition, rich but not cluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark."),
      titleSpreadTextTemplate: "ほしに ねがいを とどけよう",
      openingNarrationTemplate:
        "しちがつ なのか、たなばたの よる。{childName}は そらを みあげました。あまのがわが きれいです。ぎんいろの ほしが またたいています。",
      pages: [
        buildAgeSpecificPage({
          textTemplate: "{childName}は笹の葉にお願いを書いた短冊をかざりました。",
          baby_toddler: "ほし きれい。たんざく かわいい。",
          preschool_3_4:
            "{childName}は ささの はに おねがいを かいた たんざくを かざりました。",
          early_reader_5_6:
            "{childName}は ねがいごとを かいた たんざくを、ささの はに そっと かざりました。ぎんいろの ほしが ぴかりと ひかります。",
          early_elementary_7_8:
            "{childName}は ねがいごとを かいた たんざくを ささに かざりました。ひとつひとつの たんざくに みんなの ゆめが こめられています。ぎんいろの ほしが やさしく ひかります。",
          general_child: "{childName}は笹の葉にお願いを書いた短冊をかざりました。",
          pageVisualRole: "opening_establishing",
          imagePromptTemplate:
            "Establishing wide shot of a child carefully hanging a colorful tanzaku wish strip on a decorated bamboo branch. The bamboo is adorned with paper streamers, net decorations, and more wish strips. A starry sky with a soft Milky Way glow is visible through the window. Tiny silver star motifs dot the decorations. Warm indoor light. Watercolor picture book style, magical Tanabata celebration mood, rich but uncluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark.",
        }),
        buildAgeSpecificPage({
          textTemplate: "空を見上げると、天の川がきれいに輝いていました。",
          baby_toddler: "ほし、ぴかぴか。きれい！",
          preschool_3_4:
            "そらを みあげると、あまのがわが きれいに かがやいていました。",
          early_reader_5_6:
            "そとに でて そらを みあげると、あまのがわが しろく かがやいて、ほしが いくつも またたいています。ぎんいろの ほしが きれいです。",
          early_elementary_7_8:
            "そとで あまのがわを みあげると、ほしが かがやいています。「ひこぼしと おりひめが きょうだけ であえるんだよ」と きいて、{childName}は むねが あつく なりました。",
          general_child: "空を見上げると、天の川がきれいに輝いていました。",
          pageVisualRole: "discovery",
          imagePromptTemplate:
            "Discovery medium shot of the child standing outside under a spectacular Milky Way night sky, looking up with sparkling eyes of wonder. Stars shimmer in bands of pale light across the dark blue sky. Tiny silver star motifs float down like snowflakes around the child. The bamboo with tanzaku is visible at the edge of the scene. Watercolor picture book style, magical summer night mood, luminous star light, rich but uncluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark.",
        }),
        buildAgeSpecificPage({
          textTemplate: "{childName}は星に向かってそっと願い事を言いました。",
          baby_toddler: "ほしさん、おねがい！",
          preschool_3_4:
            "{childName}は ほしに むかって そっと ねがいごとを いいました。",
          early_reader_5_6:
            "{childName}は こころの なかで ねがいごとを となえました。ぎんいろの ほしが ぴかりと ひかって、こたえてくれたみたいです。",
          early_elementary_7_8:
            "{childName}は めを とじて、こころの なかで ねがいごとを となえました。ぎんいろの ほしが ぴかりと またたいて、ほしが きいてくれたような きがしました。",
          general_child: "{childName}は星に向かってそっと願い事を言いました。",
          pageVisualRole: "emotional_closeup",
          imagePromptTemplate:
            "Emotional close-up of the child standing under the night sky, eyes gently closed, hands clasped together making a wish. Tiny silver star motifs drift softly around the child's face. A distant Milky Way glows in the dark blue sky above. The child's expression is peaceful and earnest. Watercolor picture book style, tender wish-making close-up, luminous star light, rich but uncluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark.",
        }),
        buildAgeSpecificPage({
          textTemplate: "{childName}の願い事が、きっと星まで届きますように。{parentMessage}",
          baby_toddler: "ほしさん、とどけー！{parentMessage}",
          preschool_3_4:
            "{childName}の ねがいごとが、きっと ほしまで とどきますように。{parentMessage}",
          early_reader_5_6:
            "{childName}の ねがいごとが、あまのがわを わたって ほしまで とどきますように。{parentMessage}",
          early_elementary_7_8:
            "{childName}の ねがいごとが、あまのがわを こえて、ひこぼしと おりひめに とどきますように。ぎんいろの ほしが やさしく またたいています。{parentMessage}",
          general_child:
            "{childName}の ねがいごとが、きっと ほしまで とどきますように。{parentMessage}",
          pageVisualRole: "quiet_ending",
          imagePromptTemplate:
            "Wide quiet ending shot of the decorated bamboo branch with tanzaku strips silhouetted against a luminous starry night sky. A shooting star with a silver tail arcs gently across the Milky Way above. The scene is peaceful and magical. Tiny silver star motifs drift softly. Watercolor picture book style, dreamy starlit ending, luminous night sky, rich but not cluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark.",
        }),
      ],
    },
  },
  "fixed-summer-festival": {
    name: "なつまつりのひ",
    description: "夏祭りのにぎやかな夜。浴衣を着て、屋台をまわって、盆踊りを踊る楽しい夜の思い出絵本",
    icon: "🏮",
    categoryGroupId: "seasonal-events",
    subcategoryId: "summer-events",
    parentIntent: "季節の行事を一緒に楽しみたい",
    recommendedAgeMin: 2,
    recommendedAgeMax: 8,
    requiredInputs: ["childName"],
    optionalInputs: ["parentMessage"],
    themeTags: ["summer", "festival", "yukata", "bon-odori"],
    creationMode: "fixed_template",
    priceTier: "ume",
    storyCostLevel: "none",
    sampleImageUrl: "/images/templates/fixed-summer-festival.webp",
    sampleImageAlt: "夏祭りで浴衣を着て屋台をまわる子どもの絵本イメージ",
    visualDirection:
      "Lively summer festival night with warm lantern glow, colorful food stalls, yukata-clad crowds, and a tiny red paper lantern glow motif throughout.",
    order: 54,
    active: true,
    systemPrompt: "固定テンプレートを使って、夏祭りの楽しい夜の思い出絵本を作ります。",
    fixedStory: {
      previewImageUrl: "/images/templates/fixed-summer-festival.webp",
      titleTemplate: "{childName}の なつまつり",
      coverImagePromptTemplate:
        withFixedImagePromptSafety("Picture book cover illustration: a joyful child in a colorful yukata walking through a summer festival at night, rows of glowing red paper lanterns overhead, colorful food stall lights in the background, a tiny red lantern glow motif nearby, lively festive atmosphere, soft watercolor style, rounded child-safe composition, rich but not cluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark."),
      titleSpreadTextTemplate: "なつまつり、はじまるよ！",
      openingNarrationTemplate:
        "なつの よる、おまつりの ひ。{childName}は ゆかたを きて、おまつりに やってきました。あかい ちょうちんの あかりが きらきら ひかっています。",
      pages: [
        buildAgeSpecificPage({
          textTemplate: "{childName}は浴衣を着てお祭りに来ました。赤い提灯がいっぱい！",
          baby_toddler: "ちょうちん あかい、きれい！",
          preschool_3_4:
            "{childName}は ゆかたを きて おまつりに きました。あかい ちょうちんが いっぱい！",
          early_reader_5_6:
            "{childName}は ゆかたを きて おまつりに きました。あかい ちょうちんが ずらりと ならんで、よる なのに あかるくて にぎやかです。",
          early_elementary_7_8:
            "{childName}は ゆかたを きて おまつりに やってきました。あかい ちょうちんが ならんで、やたいの においが ふんわり ひろがって、わくわくが とまりません。",
          general_child: "{childName}は浴衣を着てお祭りに来ました。赤い提灯がいっぱい！",
          pageVisualRole: "opening_establishing",
          imagePromptTemplate:
            "Establishing wide shot of a lively summer festival at night. Rows of glowing red paper lanterns hang overhead along a festival path. Colorful food stalls line both sides with warm lights. Families in yukata walk the path. The child arrives at the entrance with bright excited eyes. Tiny red lantern glow motifs reflect in puddles on the ground. Watercolor picture book style, lively warm festival night mood, rich but uncluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark.",
        }),
        buildAgeSpecificPage({
          textTemplate: "屋台でわたあめを買いました。ふわふわで大きくてびっくり！",
          baby_toddler: "わたあめ、ふわふわ！おおきい！",
          preschool_3_4:
            "やたいで わたあめを かいました。ふわふわで おおきくて びっくり！",
          early_reader_5_6:
            "やたいで わたあめを かってもらいました。おかおより おおきい ふわふわの わたあめ。あかい ちょうちんの あかりが わたあめを ピンクに そめています。",
          early_elementary_7_8:
            "やたいで わたあめを かってもらいました。てにもちきれないくらい おおきくて ふわふわ。あかい ちょうちんの あかりが うつって、まるで まほうみたいに きれいです。",
          general_child: "屋台でわたあめを買いました。ふわふわで大きくてびっくり！",
          pageVisualRole: "discovery",
          imagePromptTemplate:
            "Discovery medium shot of the child holding a huge fluffy pink cotton candy at a festival food stall, eyes wide with delight. The cotton candy is bigger than the child's head. Red lantern glow reflects warmly on the cotton candy. Festival stalls with colorful lights blur in the background. Tiny red lantern motifs hang above. Watercolor picture book style, joyful festival discovery mood, warm night light, rich but uncluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark.",
        }),
        buildAgeSpecificPage({
          textTemplate: "盆踊りの輪に入って{childName}も一緒に踊りました！",
          baby_toddler: "おどろう！てをあげて、えいえい！",
          preschool_3_4:
            "ぼんおどりの わに はいって {childName}も いっしょに おどりました！",
          early_reader_5_6:
            "ぼんおどりの わの なかに はいって、{childName}も みんなと いっしょに おどりました。あかい ちょうちんのあかりが ゆれて、たのしくて しかたありません。",
          early_elementary_7_8:
            "ぼんおどりの わに はいって みんなと いっしょに おどりました。あかい ちょうちんが ゆれるなか、てあしを あわせて おどると、こころが ぽかぽかに なりました。",
          general_child: "盆踊りの輪に入って{childName}も一緒に踊りました！",
          pageVisualRole: "emotional_closeup",
          imagePromptTemplate:
            "Emotional close-up of the child dancing in a Bon Odori circle, arms raised in a traditional dance pose, surrounded by other festival-goers in yukata. The child's face glows with joy and excitement. Red paper lanterns hang above casting warm amber light on the dancers. Tiny red lantern glow motifs appear on the yukata pattern. Watercolor picture book style, energetic joyful festival dance close-up, warm night light, rich but uncluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark.",
        }),
        buildAgeSpecificPage({
          textTemplate: "楽しいお祭りの夜。{childName}の心にあかい提灯の灯りが残りました。{parentMessage}",
          baby_toddler: "まつり、たのしかった！{parentMessage}",
          preschool_3_4:
            "たのしい おまつりの よる。あかい ちょうちんの あかりが こころに のこりました。{parentMessage}",
          early_reader_5_6:
            "たのしい おまつりの よるが おわります。あかい ちょうちんの あかりが こころに のこって、また らいねんも きたいな。{parentMessage}",
          early_elementary_7_8:
            "たのしい なつまつりの よるが おわります。あかい ちょうちんの あかりが やさしく ゆれながら、{childName}の こころに なつの おもいでを きざんでいきます。{parentMessage}",
          general_child:
            "たのしい おまつりの よる。あかい ちょうちんの あかりが こころに のこりました。{parentMessage}",
          pageVisualRole: "quiet_ending",
          imagePromptTemplate:
            "Wide quiet ending shot of a festival path at night, the child walking home with family, looking back at the rows of red lanterns still glowing warmly in the distance. The lanterns reflect in the path below. A cool summer breeze rustles the yukata. Tender and nostalgic mood. Watercolor picture book style, peaceful festival farewell ending, warm lantern light, rich but not cluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark.",
        }),
      ],
    },
  },
  "fixed-fireworks": {
    name: "はなびのよる",
    description: "夏の夜空に咲く大輪の花火。{childName}と一緒に見た、忘れられない花火の夜の思い出絵本",
    icon: "🎆",
    categoryGroupId: "seasonal-events",
    subcategoryId: "summer-events",
    parentIntent: "季節の行事を一緒に楽しみたい",
    recommendedAgeMin: 1,
    recommendedAgeMax: 8,
    requiredInputs: ["childName"],
    optionalInputs: ["parentMessage"],
    themeTags: ["fireworks", "summer", "night", "memory"],
    creationMode: "fixed_template",
    priceTier: "ume",
    storyCostLevel: "none",
    sampleImageUrl: "/images/templates/fixed-fireworks.webp",
    sampleImageAlt: "夏の花火大会で夜空を見上げる子どもの絵本イメージ",
    visualDirection:
      "Magical summer night with bursting colorful fireworks reflected in water, star-shaped sparkle motif, wonder-filled atmosphere throughout.",
    order: 55,
    active: true,
    systemPrompt: "固定テンプレートを使って、花火の夜の思い出絵本を作ります。",
    fixedStory: {
      previewImageUrl: "/images/templates/fixed-fireworks.webp",
      titleTemplate: "{childName}の はなびのよる",
      coverImagePromptTemplate:
        withFixedImagePromptSafety("Picture book cover illustration: a joyful child looking up at a magnificent burst of colorful fireworks lighting up the night sky, reflections shimmering in a river below, a tiny star-shaped sparkle motif near the child, magical summer night atmosphere, soft watercolor style, rounded child-safe composition, rich but not cluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark."),
      titleSpreadTextTemplate: "はなびが よぞらに さいたよ",
      openingNarrationTemplate:
        "なつの よる、はなびたいかいの ひ。{childName}は ざぶとんを もって かわべりに やってきました。ほしのような ひかりが ちらちらと おちてきます。",
      pages: [
        buildAgeSpecificPage({
          textTemplate: "{childName}は川辺に座って花火を待ちました。ドキドキします。",
          baby_toddler: "くら い よる、どきどき。まつよ。",
          preschool_3_4:
            "{childName}は かわべりに すわって はなびを まちました。どきどき します。",
          early_reader_5_6:
            "{childName}は かわべりに すわって はなびを まちました。くらい よぞらに ほしが きらきら して、もうすぐ はなびが あがるんだ と どきどき します。",
          early_elementary_7_8:
            "{childName}は かわべりに すわって はなびを まちました。くらい よぞらに ほしが またたいて、かわのみずが しずかに ながれています。もうすぐ よぞらが はなばたけに なります。",
          general_child: "{childName}は川辺に座って花火を待ちました。ドキドキします。",
          pageVisualRole: "opening_establishing",
          imagePromptTemplate:
            "Establishing wide shot of a riverbank at night, the child sitting on a cushion with family, all looking up at the dark summer sky in anticipation. Stars reflect in the calm river below. The crowd along the bank is visible in silhouette. A tiny star-shaped sparkle motif glints in the sky. Watercolor picture book style, excited anticipation mood, dark night with warm crowd atmosphere, rich but uncluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark.",
        }),
        buildAgeSpecificPage({
          textTemplate: "どーん！大きな花火が夜空に咲きました！",
          baby_toddler: "どーん！はなび、おおきい！きれい！",
          preschool_3_4:
            "どーん！おおきな はなびが よぞらに さきました！",
          early_reader_5_6:
            "どーん！というおとと ともに、おおきな はなびが よぞらに ぱあっと さきました。ほしのような ひかりが ぱらぱらと ちってきます。",
          early_elementary_7_8:
            "どーん！というおとが おなかに ひびいて、よぞらに おおきな はなびが ぱあっと ひらきました。ほしのような ひかりが ちってきて、かわのみずに うつっています。",
          general_child: "どーん！大きな花火が夜空に咲きました！",
          pageVisualRole: "discovery",
          imagePromptTemplate:
            "Discovery medium shot of the first magnificent firework bursting in the night sky above the river — a huge chrysanthemum of gold and red light. The child's face is lit up in warm glow, mouth open in amazement. The firework reflection shimmers in the river below. Star-shaped sparkle motifs trail down from the burst. Watercolor picture book style, explosive wonder moment, luminous firework light, rich but uncluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark.",
        }),
        buildAgeSpecificPage({
          textTemplate: "{childName}は空いっぱいの花火に大歓声をあげました！",
          baby_toddler: "わあ！きれい！ぱちぱちぱち！",
          preschool_3_4:
            "{childName}は そらいっぱいの はなびに おおかんせいを あげました！",
          early_reader_5_6:
            "よぞらに はなびが つぎつぎと ひらいて、{childName}は おもわず たちあがって おおかんせいを あげました！ほしのような ひかりが あめのように ふってきます。",
          early_elementary_7_8:
            "よぞらが はなばたけのようになって、{childName}は たちあがって おおかんせいを あげました。ほしのような ひかりが おちてくるたびに、こころが はじけるようで す。",
          general_child: "{childName}は空いっぱいの花火に大歓声をあげました！",
          pageVisualRole: "emotional_closeup",
          imagePromptTemplate:
            "Emotional close-up of the child standing with both arms raised high, face tilted up with a radiant expression of pure joy, lit by the brilliant multicolored light of fireworks bursting overhead. Star-shaped sparkle motifs rain down around the child. The sky above is filled with blooming fireworks in gold, red, blue, and green. Watercolor picture book style, peak excitement close-up, luminous firework glow, rich but uncluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark.",
        }),
        buildAgeSpecificPage({
          textTemplate: "花火の夜はずっとずっと忘れない。{parentMessage}",
          baby_toddler: "はなび、きれかった。{parentMessage}",
          preschool_3_4:
            "はなびの よるは ずっとずっと わすれない。{parentMessage}",
          early_reader_5_6:
            "はなびの よるが おわりました。よぞらに のこった ほしのような ひかりが、こころのなかに のこっています。{parentMessage}",
          early_elementary_7_8:
            "はなびたいかいが おわり、よぞらが また くらくなりました。でも {childName}の こころの なかには、あの ほしのような ひかりが ずっと かがやき つづけています。{parentMessage}",
          general_child:
            "はなびの よるは ずっとずっと わすれない。{parentMessage}",
          pageVisualRole: "quiet_ending",
          imagePromptTemplate:
            "Wide quiet ending shot of the river at night after the fireworks, the child held in a family member's arms, looking up at the last fading sparkles in the sky. The river below still shimmers with soft reflections. Star-shaped sparkle motifs drift slowly downward. Tender, memory-preserving mood. Watercolor picture book style, peaceful fireworks farewell, luminous night sky, rich but not cluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark.",
        }),
      ],
    },
  },
  "fixed-halloween": {
    name: "ハロウィンぼうけん",
    description: "魔法使いや怪物のかわいい変装でハロウィンのお菓子集め！オレンジのかぼちゃが光る夜の冒険絵本",
    icon: "🎃",
    categoryGroupId: "seasonal-events",
    subcategoryId: "halloween",
    parentIntent: "季節の行事を一緒に楽しみたい",
    recommendedAgeMin: 2,
    recommendedAgeMax: 8,
    requiredInputs: ["childName"],
    optionalInputs: ["parentMessage"],
    themeTags: ["halloween", "trick-or-treat", "costume", "autumn"],
    creationMode: "fixed_template",
    priceTier: "ume",
    storyCostLevel: "none",
    sampleImageUrl: "/images/templates/fixed-halloween.webp",
    sampleImageAlt: "ハロウィンのコスチュームでお菓子を集める子どもの絵本イメージ",
    visualDirection:
      "Spooky-cute Halloween night with carved orange jack-o-lanterns, bat silhouettes, candy bags, and a tiny orange pumpkin motif throughout — friendly not scary.",
    order: 56,
    active: true,
    systemPrompt: "固定テンプレートを使って、ハロウィンのかわいいお菓子集め冒険絵本を作ります。",
    fixedStory: {
      previewImageUrl: "/images/templates/fixed-halloween.webp",
      titleTemplate: "{childName}の ハロウィン ぼうけん",
      coverImagePromptTemplate:
        withFixedImagePromptSafety("Picture book cover illustration: a joyful child in a cute Halloween costume (witch hat and cape or friendly monster) holding a candy bag, standing in front of a glowing carved orange pumpkin jack-o-lantern, friendly bats fluttering above, autumn night with warm orange glow, tiny orange pumpkin motif beside the child, soft watercolor style, rounded child-safe composition, NOT scary, rich but not cluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark."),
      titleSpreadTextTemplate: "トリック・オア・トリート！",
      openingNarrationTemplate:
        "じゅうがつ さんじゅういちにち、ハロウィンの よる。{childName}は かわいい コスチュームを きて そとに でました。オレンジの かぼちゃが あちこちで ひかっています。",
      pages: [
        buildAgeSpecificPage({
          textTemplate: "{childName}はかわいいコスチュームに変身しました。オレンジのかぼちゃがニコニコ。",
          baby_toddler: "へんしん！かわいい！かぼちゃ にこにこ。",
          preschool_3_4:
            "{childName}は かわいい コスチュームに へんしん しました。オレンジの かぼちゃが にこにこ しています。",
          early_reader_5_6:
            "{childName}は かわいい コスチュームに へんしん しました。オレンジの かぼちゃが にこにこ ひかって、「がんばれ！」と おうえん してくれているようです。",
          early_elementary_7_8:
            "{childName}は コスチュームに へんしん しました。オレンジの かぼちゃが あちこちで にこにこ ひかっています。まるで まちぜんたいが ハロウィンの ぶたいになったみたいです。",
          general_child: "{childName}はかわいいコスチュームに変身しました。オレンジのかぼちゃがニコニコ。",
          pageVisualRole: "opening_establishing",
          imagePromptTemplate:
            "Establishing wide shot of a quiet neighborhood street at Halloween night, glowing orange jack-o-lanterns lining the path, friendly bat decorations in windows. The child stands at the start of the street in a cute costume (witch hat or ghost sheet), candy bag in hand, ready to begin. Tiny orange pumpkin motifs glow at front porches. Watercolor picture book style, spooky-cute friendly Halloween night, warm orange glow, rich but uncluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark.",
        }),
        buildAgeSpecificPage({
          textTemplate: "「トリック・オア・トリート！」お菓子をいっぱいもらいました！",
          baby_toddler: "おかし いっぱい！やったー！",
          preschool_3_4:
            "「トリック・オア・トリート！」おかしを いっぱい もらいました！",
          early_reader_5_6:
            "「トリック・オア・トリート！」と げんきよく いうと、おかしを いっぱい もらいました。ふくろが おもくなっていきます！",
          early_elementary_7_8:
            "「トリック・オア・トリート！」と こえを あわせると、おかしを いっぱい もらいました。オレンジの かぼちゃが ひかって、「よくできました！」と いっているみたいです。",
          general_child: "「トリック・オア・トリート！」お菓子をいっぱいもらいました！",
          pageVisualRole: "discovery",
          imagePromptTemplate:
            "Discovery medium shot of the child at a doorway saying trick or treat, arms outstretched toward a candy bag being filled with colorful sweets. The child's face shines with excitement. Orange pumpkin decorations frame the doorway. Tiny orange pumpkin motifs appear on the candy wrappers. Warm orange Halloween glow. Watercolor picture book style, joyful trick-or-treat discovery mood, rich but uncluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark.",
        }),
        buildAgeSpecificPage({
          textTemplate: "{childName}は友だちと一緒に仮装パレードをしました！",
          baby_toddler: "おともだちと いっしょ！えへへ。",
          preschool_3_4:
            "{childName}は ともだちと いっしょに かそう パレードを しました！",
          early_reader_5_6:
            "{childName}は ともだちと いっしょに かそう パレードをしました。いろんな コスチュームが ならんで、とても たのしいです。",
          early_elementary_7_8:
            "{childName}は ともだちと いっしょに かそう パレードを しました。まほうつかい・おばけ・きゅうけつき、みんなで ならんで あるくと、まちが ハロウィンの どうきょうに なりました。",
          general_child: "{childName}は友だちと一緒に仮装パレードをしました！",
          pageVisualRole: "emotional_closeup",
          imagePromptTemplate:
            "Emotional close-up of the child walking in a Halloween parade with friends in various cute costumes — a witch, a ghost, a pumpkin — all smiling and holding candy bags. Orange jack-o-lanterns line the path. Tiny orange pumpkin motifs glow between the children. Warm orange Halloween night light. Watercolor picture book style, joyful group friendship close-up, spooky-cute friendly mood, rich but uncluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark.",
        }),
        buildAgeSpecificPage({
          textTemplate: "ハロウィンの夜は楽しかったね。またくるよ、オレンジのかぼちゃ。{parentMessage}",
          baby_toddler: "かぼちゃ、またね！{parentMessage}",
          preschool_3_4:
            "ハロウィンの よるは たのしかったね。またくるよ、オレンジの かぼちゃ。{parentMessage}",
          early_reader_5_6:
            "ハロウィンの よるが おわります。オレンジの かぼちゃが やさしく ひかって、「また らいねんも きてね」と いっているようです。{parentMessage}",
          early_elementary_7_8:
            "ハロウィンの よるが おわります。オレンジの かぼちゃが やさしく ほほえんで、{childName}の たのしかったおもいでを しずかに てらしています。{parentMessage}",
          general_child:
            "ハロウィンの よるは たのしかったね。またくるよ、オレンジの かぼちゃ。{parentMessage}",
          pageVisualRole: "quiet_ending",
          imagePromptTemplate:
            "Wide quiet ending shot of the child walking home at the end of Halloween night, candy bag full, glancing back at a row of glowing orange jack-o-lanterns still smiling warmly. Friendly bat silhouettes circle in the moonlit sky. Tiny orange pumpkin motifs glow softly along the path. Tender farewell mood. Watercolor picture book style, spooky-cute Halloween ending, warm orange night glow, rich but not cluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark.",
        }),
      ],
    },
  },
  "fixed-new-year": {
    name: "おしょうがつのあさ",
    description: "新年のお正月の朝。初日の出を見て、神社へお参りして、おせちを食べる特別な一日の絵本",
    icon: "⛩️",
    categoryGroupId: "seasonal-events",
    subcategoryId: "new-year",
    parentIntent: "季節の行事を一緒に楽しみたい",
    recommendedAgeMin: 1,
    recommendedAgeMax: 8,
    requiredInputs: ["childName"],
    optionalInputs: ["parentMessage"],
    themeTags: ["new-year", "shrine", "oshogatsu", "tradition"],
    creationMode: "fixed_template",
    priceTier: "ume",
    storyCostLevel: "none",
    sampleImageUrl: "/images/templates/fixed-new-year.webp",
    sampleImageAlt: "お正月の朝に神社へお参りする子どもの絵本イメージ",
    visualDirection:
      "Peaceful New Year morning with golden sunrise light, a shrine with rope decorations, oshiruko and osechi, and a tiny golden bell motif throughout.",
    order: 57,
    active: true,
    systemPrompt: "固定テンプレートを使って、お正月の朝の特別な一日絵本を作ります。",
    fixedStory: {
      previewImageUrl: "/images/templates/fixed-new-year.webp",
      titleTemplate: "{childName}の おしょうがつの あさ",
      coverImagePromptTemplate:
        withFixedImagePromptSafety("Picture book cover illustration: a joyful child in a colorful kimono standing at a torii gate of a shrine on a crisp New Year morning, golden sunrise light streaming over snow-dusted hills, pine and bamboo decorations at the gate, a tiny golden bell motif hanging nearby, peaceful celebratory New Year mood, soft watercolor style, rounded child-safe composition, rich but not cluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark."),
      titleSpreadTextTemplate: "あけまして、おめでとう！",
      openingNarrationTemplate:
        "いちがつ ついたち、おしょうがつの あさ。{childName}は きものを きて、はつひので を みようと おきました。きんの すずが ちりんと なっています。",
      pages: [
        buildAgeSpecificPage({
          textTemplate: "{childName}は初日の出を見に外へ出ました。空が金色に染まっています。",
          baby_toddler: "おひさま、きんいろ！きれい！",
          preschool_3_4:
            "{childName}は はつひので を みに そとへ でました。そらが きんいろに そまっています。",
          early_reader_5_6:
            "{childName}は はつひのでを みに そとへ でました。そらが きんいろと もも いろに そまって、あたらしい いちねんが はじまります。",
          early_elementary_7_8:
            "{childName}は はつひのでを みに そとへ でました。そらが きんいろと ももいろに そまって、さいしょの ひかりが あたりを てらしました。ことしも いいとしに なりそうです。",
          general_child: "{childName}は初日の出を見に外へ出ました。空が金色に染まっています。",
          pageVisualRole: "opening_establishing",
          imagePromptTemplate:
            "Establishing wide shot of a crisp New Year morning scene. A child in a colorful kimono stands outside watching the first sunrise of the year — a glowing golden orb rising over snow-dusted hills, the sky painted in gold and pink. Pine and bamboo New Year kadomatsu decorations stand at the door. A tiny golden bell motif hangs from the kadomatsu. Watercolor picture book style, peaceful celebratory New Year mood, luminous golden morning light, rich but uncluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark.",
        }),
        buildAgeSpecificPage({
          textTemplate: "神社に行って初詣をしました。金の鈴を鳴らしてお祈りをしました。",
          baby_toddler: "すず ちりん！おてを あわせて。",
          preschool_3_4:
            "じんじゃに いって はつもうでを しました。きんの すずを ならして おいのりを しました。",
          early_reader_5_6:
            "じんじゃに いって はつもうでを しました。きんの すずを ちりんと ならして、てを あわせて おいのりを しました。",
          early_elementary_7_8:
            "じんじゃに いって はつもうでを しました。きんの すずを ちりんと ならして、てを あわせて ねがいごとを こころのなかで となえました。あたらしい いちねんの はじまりです。",
          general_child: "神社に行って初詣をしました。金の鈴を鳴らしてお祈りをしました。",
          pageVisualRole: "discovery",
          imagePromptTemplate:
            "Discovery medium shot of the child standing at a shrine's offering box, both hands raised holding the thick rope attached to a large golden bell, about to ring it. The child's kimono is colorful and festive. Pine rope shimenawa decoration hangs above. Tiny golden bell motifs appear on the rope. Crisp winter sunlight. Watercolor picture book style, reverent New Year shrine visit mood, rich but uncluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark.",
        }),
        buildAgeSpecificPage({
          textTemplate: "おうちでおせちとお雑煮をいただきました。おいしくて温かい！",
          baby_toddler: "おぞうに、あたたかい！おいしい！",
          preschool_3_4:
            "おうちで おせちと おぞうにを いただきました。おいしくて あたたかい！",
          early_reader_5_6:
            "おうちで おせちりょうりと おぞうにを いただきました。だしのいい においと やわらかい おもちが あたたかくて、しあわせです。",
          early_elementary_7_8:
            "おうちで おせちりょうりと おぞうにを いただきました。ひとつひとつに いみがあって、かぞく みんなで たべると もっと おいしい。きんの すずのような まんまるの おもちが とくに すきです。",
          general_child: "おうちでおせちとお雑煮をいただきました。おいしくて温かい！",
          pageVisualRole: "emotional_closeup",
          imagePromptTemplate:
            "Emotional close-up of the child sitting at a low New Year table, both hands wrapped around a warm bowl of ozoni soup. The child's face is full of contentment and warmth. A beautiful osechi bento box is open beside them with colorful traditional New Year foods. A tiny golden bell motif appears on the lacquerware lid. Warm indoor family New Year light. Watercolor picture book style, cozy warm family celebration close-up, rich but uncluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark.",
        }),
        buildAgeSpecificPage({
          textTemplate: "新しい一年が始まりました。{childName}にとって良い一年になりますように。{parentMessage}",
          baby_toddler: "あたらしい とし、おめでとう！{parentMessage}",
          preschool_3_4:
            "あたらしい いちねんが はじまりました。{childName}にとって よい いちねんに なりますように。{parentMessage}",
          early_reader_5_6:
            "あたらしい いちねんが はじまりました。はつひので・はつもうで・おせち、たいせつな おしょうがつのおもいで。{parentMessage}",
          early_elementary_7_8:
            "あたらしい いちねんが はじまりました。きんの すずの おとが こころに のこって、{childName}の ことしの ぼうけんが はじまります。{parentMessage}",
          general_child:
            "あたらしい いちねんが はじまりました。{childName}にとって よい いちねんに なりますように。{parentMessage}",
          pageVisualRole: "quiet_ending",
          imagePromptTemplate:
            "Wide quiet ending shot of the child in kimono standing at the shrine entrance as morning light streams in golden rays across the torii gate. A tiny golden bell hangs from the gate, swaying gently. Pine and bamboo kadomatsu stand at the sides. The scene radiates peace, hope, and a fresh beginning. Watercolor picture book style, serene New Year blessing ending, luminous golden morning light, rich but not cluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark.",
        }),
      ],
    },
  },
  "fixed-first-nursery": {
    name: "はじめてのにゅうえん",
    description: "はじめて保育園・幼稚園に行った日。ドキドキしながらも頑張った{childName}の記念日絵本",
    icon: "👒",
    categoryGroupId: "memories",
    subcategoryId: "nursery-school",
    parentIntent: "大切な思い出を絵本として残したい",
    recommendedAgeMin: 1,
    recommendedAgeMax: 5,
    requiredInputs: ["childName"],
    optionalInputs: ["parentMessage"],
    themeTags: ["nursery", "first-day", "milestone", "friends"],
    creationMode: "fixed_template",
    priceTier: "ume",
    storyCostLevel: "none",
    sampleImageUrl: "/images/templates/fixed-first-nursery.webp",
    sampleImageAlt: "はじめての保育園入園の日を振り返る子どもの絵本イメージ",
    visualDirection:
      "Warm nursery school atmosphere with bright classroom colors, a yellow sun-hat motif, cheerful but tender first-day emotions throughout.",
    order: 60,
    active: true,
    systemPrompt: "固定テンプレートを使って、はじめての入園の記念日絵本を作ります。",
    fixedStory: {
      previewImageUrl: "/images/templates/fixed-first-nursery.webp",
      titleTemplate: "{childName}の はじめての にゅうえん",
      coverImagePromptTemplate:
        withFixedImagePromptSafety("Picture book cover illustration: a small child wearing a bright yellow sun hat standing at the gate of a cheerful nursery school, one hand holding a parent's hand and one hand waving bravely, colorful flowers in the school garden, a tiny yellow hat motif above the gate, tender bittersweet first-day mood, soft watercolor style, rounded child-safe composition, rich but not cluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark."),
      titleSpreadTextTemplate: "はじめての おそとの せかい",
      openingNarrationTemplate:
        "はるのあさ、{childName}は きいろい ぼうしを かぶって にゅうえんの ひを むかえました。どきどきするけど、がんばるぞ！",
      pages: [
        buildAgeSpecificPage({
          textTemplate: "{childName}は黄色い帽子をかぶって保育園の門に立ちました。ドキドキします。",
          baby_toddler: "きいろい ぼうし、かわいい。どきどき。",
          preschool_3_4:
            "{childName}は きいろい ぼうしを かぶって ほいくえんの もんに たちました。どきどきします。",
          early_reader_5_6:
            "{childName}は きいろい ぼうしを かぶって ほいくえんの もんに たちました。どきどきするけど、なかに はいってみよう。",
          early_elementary_7_8:
            "{childName}は きいろい ぼうしを かぶって ほいくえんの もんに たちました。どきどきするきもちと、がんばるきもちが いっしょになっています。",
          general_child: "{childName}は黄色い帽子をかぶって保育園の門に立ちました。ドキドキします。",
          pageVisualRole: "opening_establishing",
          imagePromptTemplate:
            "Establishing wide shot of a cheerful nursery school entrance gate with colorful flower garden. A small child stands at the gate wearing a bright yellow sun hat, looking slightly nervous but brave. A parent's hand gently holds the child's. Tiny yellow hat motifs appear on the gate decorations. Warm spring morning sunlight. Watercolor picture book style, tender first-day milestone mood, rich but uncluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark.",
        }),
        buildAgeSpecificPage({
          textTemplate: "先生が優しく迎えてくれました。「いっしょに遊ぼうね！」",
          baby_toddler: "せんせい、やさしい。にこにこ。",
          preschool_3_4:
            "せんせいが やさしく むかえてくれました。「いっしょに あそぼうね！」",
          early_reader_5_6:
            "せんせいが にっこりして むかえてくれました。「{childName}ちゃん、まっていたよ！いっしょに あそぼうね」と てを つないでくれました。",
          early_elementary_7_8:
            "せんせいが にっこりして むかえてくれました。やさしい てのひらの あたたかさに、どきどきが すこし おちつきました。「いっしょに たのしもうね」。",
          general_child: "先生が優しく迎えてくれました。「いっしょに遊ぼうね！」",
          pageVisualRole: "discovery",
          imagePromptTemplate:
            "Discovery medium shot of a warm nursery classroom interior. A kind teacher crouches to the child's level, smiling gently and extending a hand in welcome. Colorful toys and soft mats are visible behind. Other children play in the background. A tiny yellow hat motif hangs on a coat hook nearby. Soft warm classroom light. Watercolor picture book style, reassuring welcome mood, rich but uncluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark.",
        }),
        buildAgeSpecificPage({
          textTemplate: "{childName}はお友だちと一緒に遊んで、笑顔になりました。",
          baby_toddler: "おともだち！いっしょに あそぼ！",
          preschool_3_4:
            "{childName}は おともだちと いっしょに あそんで、えがおに なりました。",
          early_reader_5_6:
            "{childName}は おともだちと ブロックで あそびました。はじめは どきどきしていたのに、いつの まにか えがおに なっていました。",
          early_elementary_7_8:
            "{childName}は おともだちと ブロックで あそびながら、いつの まにか なかよく なっていました。きいろい ぼうしの こが「なんて なまえ？」と きいてくれました。",
          general_child: "{childName}はお友だちと一緒に遊んで、笑顔になりました。",
          pageVisualRole: "emotional_closeup",
          imagePromptTemplate:
            "Emotional close-up of the child playing happily alongside a new friend, both laughing over shared colorful building blocks on a soft play mat. The child's yellow hat sits nearby on a hook. The initial nervousness is gone — replaced by pure joyful connection. Soft warm light. Watercolor picture book style, warm first friendship moment close-up, rich but uncluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark.",
        }),
        buildAgeSpecificPage({
          textTemplate: "よくがんばった{childName}。明日も一緒に遊ぼうね。{parentMessage}",
          baby_toddler: "がんばったね！えらい！{parentMessage}",
          preschool_3_4:
            "よく がんばった {childName}。あしたも いっしょに あそぼうね。{parentMessage}",
          early_reader_5_6:
            "はじめての にゅうえん、よく がんばりました。あしたは もっと たのしくなるよ。{parentMessage}",
          early_elementary_7_8:
            "はじめての にゅうえん、よく がんばりました。きいろい ぼうしを かぶった {childName}は、もう たくさんの ことを のりこえました。{parentMessage}",
          general_child:
            "よく がんばった {childName}。あしたも いっしょに あそぼうね。{parentMessage}",
          pageVisualRole: "quiet_ending",
          imagePromptTemplate:
            "Wide quiet ending shot of the child arriving home after the first day, yellow hat in hand, being hugged warmly by a parent. The child's expression is tired but quietly proud and happy. A yellow hat motif rests on the shoe shelf. Warm afternoon sunlight through the entryway. Watercolor picture book style, tender achievement ending, rich but not cluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark.",
        }),
      ],
    },
  },
  "fixed-first-elementary": {
    name: "しょうがっこうへ",
    description: "小学校入学の日。ランドセルを背負った{childName}の大きな一歩を記念する絵本",
    icon: "🏫",
    categoryGroupId: "memories",
    subcategoryId: "elementary-school",
    parentIntent: "大切な思い出を絵本として残したい",
    recommendedAgeMin: 5,
    recommendedAgeMax: 8,
    requiredInputs: ["childName"],
    optionalInputs: ["parentMessage"],
    themeTags: ["elementary", "school", "first-day", "milestone"],
    creationMode: "fixed_template",
    priceTier: "ume",
    storyCostLevel: "none",
    sampleImageUrl: "/images/templates/fixed-first-elementary.webp",
    sampleImageAlt: "小学校入学式の日にランドセルを背負った子どもの絵本イメージ",
    visualDirection:
      "Bright spring school entrance ceremony atmosphere with cherry blossoms, a red randoseru backpack badge motif, proud milestone emotions throughout.",
    order: 61,
    active: true,
    systemPrompt: "固定テンプレートを使って、小学校入学の記念日絵本を作ります。",
    fixedStory: {
      previewImageUrl: "/images/templates/fixed-first-elementary.webp",
      titleTemplate: "{childName}の しょうがっこう にゅうがく",
      coverImagePromptTemplate:
        withFixedImagePromptSafety("Picture book cover illustration: a proud child wearing a large red randoseru backpack standing at the entrance of an elementary school with cherry blossoms in full bloom, wearing a crisp new uniform, a tiny red randoseru badge motif on the bag, spring milestone celebration mood, soft watercolor style, rounded child-safe composition, rich but not cluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark."),
      titleSpreadTextTemplate: "ランドセル、しょってしゅっぱつ！",
      openingNarrationTemplate:
        "はるのあさ、にゅうがくしきの ひ。{childName}は あたらしい ランドセルを しょって、しょうがっこうに むかいました。あかい ランドセルが キラリと ひかります。",
      pages: [
        buildAgeSpecificPage({
          textTemplate: "{childName}はランドセルを背負って小学校の門に立ちました。",
          baby_toddler: "おおきな かばん、えらいね！",
          preschool_3_4:
            "{childName}は ランドセルを しょって しょうがっこうの もんに たちました。",
          early_reader_5_6:
            "{childName}は ランドセルを しょって しょうがっこうの もんに たちました。さくらの はなびらが ふわりと まいてきます。",
          early_elementary_7_8:
            "{childName}は ランドセルを しょって しょうがっこうの もんに たちました。さくらの はなびらが まいおりて、あたらしい ぼうけんが はじまる きがします。",
          general_child: "{childName}はランドセルを背負って小学校の門に立ちました。",
          pageVisualRole: "opening_establishing",
          imagePromptTemplate:
            "Establishing wide shot of an elementary school entrance surrounded by blooming cherry blossoms. A child stands proudly at the school gate, wearing a large red randoseru backpack. Pink petals drift gently around. A tiny red randoseru badge motif appears on the bag's front. Parents watch warmly in the background. Bright spring morning light. Watercolor picture book style, proud milestone celebration mood, rich but uncluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark.",
        }),
        buildAgeSpecificPage({
          textTemplate: "入学式で{childName}は新しいお友だちと出会いました。",
          baby_toddler: "おともだち、いっぱい！わーい！",
          preschool_3_4:
            "にゅうがくしきで {childName}は あたらしい おともだちと であいました。",
          early_reader_5_6:
            "にゅうがくしきで {childName}は あたらしい おともだちと であいました。「いっしょに がんばろうね」と てを ふってくれた こが いました。",
          early_elementary_7_8:
            "にゅうがくしきで {childName}は あたらしい おともだちと であいました。ちがう ようちえんや ほいくえんから きた こたちが あつまって、あたらしい がっきゅうが できていきます。",
          general_child: "入学式で{childName}は新しいお友だちと出会いました。",
          pageVisualRole: "discovery",
          imagePromptTemplate:
            "Discovery medium shot inside a bright elementary school gymnasium decorated for an entrance ceremony. The child sits with other new students, exchanging shy smiles with a neighbor. Tiny red randoseru motifs can be seen on the bags leaning against the chairs. Soft ceremonial light. Watercolor picture book style, hopeful new beginning mood, rich but uncluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark.",
        }),
        buildAgeSpecificPage({
          textTemplate: "初めての教室で{childName}は自分の席に座りました。",
          baby_toddler: "じぶんの せき、うれしい！",
          preschool_3_4:
            "はじめての きょうしつで {childName}は じぶんの せきに すわりました。",
          early_reader_5_6:
            "はじめての きょうしつで {childName}は じぶんの せきに すわりました。きれいな こくばんと つくえ。ここが {childName}の ばしょです。",
          early_elementary_7_8:
            "はじめての きょうしつで {childName}は じぶんの せきに すわりました。きれいな こくばんを まえに、ここから たくさんのことを まなんでいくんだ と こころが たかまりました。",
          general_child: "初めての教室で{childName}は自分の席に座りました。",
          pageVisualRole: "emotional_closeup",
          imagePromptTemplate:
            "Emotional close-up of the child sitting at their own desk in a bright new classroom, hands folded neatly, wearing a proud and eager expression. The red randoseru backpack hangs on the hook beside the desk. Sunlight streams through windows onto the wooden desk surface. A tiny red randoseru badge motif glints on the bag. Watercolor picture book style, proud first-day readiness close-up, bright welcoming classroom mood, rich but uncluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark.",
        }),
        buildAgeSpecificPage({
          textTemplate: "{childName}の小学校生活が始まりました。たくさんのことを学ぼうね。{parentMessage}",
          baby_toddler: "がんばれ、{childName}！{parentMessage}",
          preschool_3_4:
            "{childName}の しょうがっこうせいかつが はじまりました。たくさんのことを まなぼうね。{parentMessage}",
          early_reader_5_6:
            "{childName}の しょうがっこうせいかつが はじまりました。まいにちが あたらしい はっけんで いっぱいです。{parentMessage}",
          early_elementary_7_8:
            "{childName}の しょうがっこうせいかつが はじまりました。ランドセルに つめた ゆめと きもちを もって、まいにちを たいせつに すすんでいこう。{parentMessage}",
          general_child:
            "{childName}の しょうがっこうせいかつが はじまりました。たくさんのことを まなぼうね。{parentMessage}",
          pageVisualRole: "quiet_ending",
          imagePromptTemplate:
            "Wide quiet ending shot of the child walking home after the first day, red randoseru on their back, looking back at the school building with cherry blossoms still in bloom. The child walks with quiet pride. A tiny red randoseru badge motif glints in the afternoon light. Warm spring afternoon. Watercolor picture book style, proud milestone farewell ending, rich but not cluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark.",
        }),
      ],
    },
  },
  "fixed-new-sibling": {
    name: "あかちゃんがきた",
    description: "新しい赤ちゃんが家族に加わった日。お兄ちゃん・お姉ちゃんになった{childName}の特別な記念絵本",
    icon: "👶",
    categoryGroupId: "memories",
    subcategoryId: "family-growth",
    parentIntent: "大切な思い出を絵本として残したい",
    recommendedAgeMin: 2,
    recommendedAgeMax: 7,
    requiredInputs: ["childName"],
    optionalInputs: ["parentMessage"],
    themeTags: ["sibling", "baby", "family", "milestone"],
    creationMode: "fixed_template",
    priceTier: "ume",
    storyCostLevel: "none",
    sampleImageUrl: "/images/templates/fixed-new-sibling.webp",
    sampleImageAlt: "赤ちゃんを優しく見つめるお兄ちゃん・お姉ちゃんの絵本イメージ",
    visualDirection:
      "Warm tender family atmosphere with a new baby, soft nursery colors, and a tiny white star motif representing the new arrival throughout.",
    order: 62,
    active: true,
    systemPrompt: "固定テンプレートを使って、新しい赤ちゃんが来た記念絵本を作ります。",
    fixedStory: {
      previewImageUrl: "/images/templates/fixed-new-sibling.webp",
      titleTemplate: "{childName}、おにいちゃん・おねえちゃんに なったよ",
      coverImagePromptTemplate:
        withFixedImagePromptSafety("Picture book cover illustration: an older child leaning gently over a baby's crib, looking at the new baby with wonder and tender love, a tiny white star motif floating above the crib like a guardian angel, soft nursery pastel colors, warm family bond mood, soft watercolor style, rounded child-safe composition, rich but not cluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark."),
      titleSpreadTextTemplate: "あかちゃん、よく きたね",
      openingNarrationTemplate:
        "あるひ、{childName}の おうちに あかちゃんが やってきました。ちいさくて ふわふわで、しろい ほしのような たいせつな いのちです。",
      pages: [
        buildAgeSpecificPage({
          textTemplate: "{childName}は初めて赤ちゃんを見てびっくりしました。こんなに小さいの！",
          baby_toddler: "あかちゃん、ちっちゃい！かわいい。",
          preschool_3_4:
            "{childName}は はじめて あかちゃんを みて びっくりしました。こんなに ちいさいの！",
          early_reader_5_6:
            "{childName}は はじめて あかちゃんを みて びっくりしました。こんなに ちいさいのに、てのひらと あしのゆびまで ちゃんと ある！",
          early_elementary_7_8:
            "{childName}は はじめて あかちゃんを みて おどろきました。こんなに ちいさいのに、めを ぎゅっと つぶって、いのちを いっしょうけんめい いきているんだ と かんじました。",
          general_child: "{childName}は初めて赤ちゃんを見てびっくりしました。こんなに小さいの！",
          pageVisualRole: "opening_establishing",
          imagePromptTemplate:
            "Establishing wide shot of a cozy nursery room. The older child stands at the crib's edge, eyes wide with wonder, looking down at the new sleeping baby wrapped in a soft blanket. A tiny white star mobile hangs above the crib. Soft warm nursery light. Gentle, tender family mood. Watercolor picture book style, wonder-filled first encounter, rich but uncluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark.",
        }),
        buildAgeSpecificPage({
          textTemplate: "赤ちゃんが{childName}の指を握りました。あたたかくて、うれしい！",
          baby_toddler: "あかちゃん、てつないだ！あったかい。",
          preschool_3_4:
            "あかちゃんが {childName}の ゆびを にぎりました。あたたかくて、うれしい！",
          early_reader_5_6:
            "あかちゃんが {childName}の ゆびを ぎゅっと にぎりました。ちいさくて あたたかくて、うれしさが こころに ひろがります。",
          early_elementary_7_8:
            "あかちゃんが {childName}の ゆびを ちいさな てで ぎゅっと にぎりました。「おにいちゃん・おねえちゃん、よろしくね」って いっているみたいで、{childName}の こころが あたたかく なりました。",
          general_child: "赤ちゃんが{childName}の指を握りました。あたたかくて、うれしい！",
          pageVisualRole: "discovery",
          imagePromptTemplate:
            "Discovery medium shot of the older child extending one finger toward the baby, and the baby's tiny hand grasping it firmly. Both children's faces visible — the baby sleeping peacefully, the older child's face lit up with joyful surprise. A tiny white star motif appears on the baby's blanket. Soft warm light. Watercolor picture book style, magical first connection moment, rich but uncluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark.",
        }),
        buildAgeSpecificPage({
          textTemplate: "{childName}は赤ちゃんを優しく守ろうと心に決めました。",
          baby_toddler: "あかちゃん、まもるよ！",
          preschool_3_4:
            "{childName}は あかちゃんを やさしく まもろうと こころに きめました。",
          early_reader_5_6:
            "{childName}は あかちゃんを やさしく まもろうと こころに きめました。おにいちゃん・おねえちゃんとして、いっしょに おおきく なろうね。",
          early_elementary_7_8:
            "{childName}は あかちゃんを みながら おもいました。この こを まもれる おにいちゃん・おねえちゃんに なりたい。しろい ほしのように、ずっとそばで ひかっていたい。",
          general_child: "{childName}は赤ちゃんを優しく守ろうと心に決めました。",
          pageVisualRole: "emotional_closeup",
          imagePromptTemplate:
            "Emotional close-up of the older child leaning close to the sleeping baby, face full of tender protective love. The older child's hand rests gently near the baby. A tiny white star motif glows softly above them both like a guardian light. Soft warm nursery glow. Watercolor picture book style, profound family love close-up, rich but uncluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark.",
        }),
        buildAgeSpecificPage({
          textTemplate: "二人でいっしょに大きくなろうね。{parentMessage}",
          baby_toddler: "いっしょに おおきくなろうね。{parentMessage}",
          preschool_3_4:
            "ふたりで いっしょに おおきく なろうね。{parentMessage}",
          early_reader_5_6:
            "ふたりで いっしょに おおきく なろうね。しろい ほしのような あかちゃんと、{childName}の これからが はじまります。{parentMessage}",
          early_elementary_7_8:
            "ふたりで いっしょに おおきく なろうね。{childName}と あかちゃんの これからの ものがたりは、まだ はじまったばかりです。{parentMessage}",
          general_child:
            "ふたりで いっしょに おおきく なろうね。{parentMessage}",
          pageVisualRole: "quiet_ending",
          imagePromptTemplate:
            "Wide quiet ending shot of both children together — the older child sitting beside the baby's crib, gently humming or reading a picture book to the sleeping baby. White star mobile turns slowly above. Warm soft nursery light fills the room. Tender family peace. Watercolor picture book style, tender sibling bond ending, rich but not cluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark.",
        }),
      ],
    },
  },
  "fixed-first-airplane": {
    name: "はじめてのひこうき",
    description: "はじめて飛行機に乗った日。空の上からの絶景と、{childName}のドキドキ冒険の記念絵本",
    icon: "✈️",
    categoryGroupId: "memories",
    subcategoryId: "travel",
    parentIntent: "大切な思い出を絵本として残したい",
    recommendedAgeMin: 1,
    recommendedAgeMax: 8,
    requiredInputs: ["childName"],
    optionalInputs: ["parentMessage"],
    themeTags: ["airplane", "travel", "first-time", "sky"],
    creationMode: "fixed_template",
    priceTier: "ume",
    storyCostLevel: "none",
    sampleImageUrl: "/images/templates/fixed-first-airplane.webp",
    sampleImageAlt: "はじめて飛行機に乗って空から景色を眺める子どもの絵本イメージ",
    visualDirection:
      "Exciting first flight atmosphere with the airplane cabin, fluffy white clouds outside the window, and a tiny white cloud motif throughout.",
    order: 63,
    active: true,
    systemPrompt: "固定テンプレートを使って、はじめての飛行機搭乗記念絵本を作ります。",
    fixedStory: {
      previewImageUrl: "/images/templates/fixed-first-airplane.webp",
      titleTemplate: "{childName}の はじめての ひこうき",
      coverImagePromptTemplate:
        withFixedImagePromptSafety("Picture book cover illustration: a joyful child looking out of an airplane window at fluffy white clouds below and a brilliant blue sky, tiny white cloud motifs drifting past the window, expression of pure wonder and excitement, soft watercolor style, rounded child-safe composition, rich but not cluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark."),
      titleSpreadTextTemplate: "ひこうきで そらへ とびたつよ！",
      openingNarrationTemplate:
        "きょうは はじめて ひこうきに のる ひ。{childName}は くうこうで めを まるくしました。しろい くもが とびたつのを まっています。",
      pages: [
        buildAgeSpecificPage({
          textTemplate: "{childName}は空港でドキドキしながら飛行機を眺めました。",
          baby_toddler: "ひこうき おおきい！どきどき。",
          preschool_3_4:
            "{childName}は くうこうで どきどきしながら ひこうきを ながめました。",
          early_reader_5_6:
            "{childName}は くうこうの まどから おおきな ひこうきを みあげました。こんなに おおきなものが そらを とぶなんて、ふしぎでたまりません。",
          early_elementary_7_8:
            "{childName}は くうこうの まどから おおきな ひこうきを みあげました。あのひこうきに のって、そらのうえに いける んだ と おもうと むねが どきどきしました。",
          general_child: "{childName}は空港でドキドキしながら飛行機を眺めました。",
          pageVisualRole: "opening_establishing",
          imagePromptTemplate:
            "Establishing wide shot of an airport terminal with a large white airplane visible through the panoramic window. A child stands at the glass, hands pressed against it, gazing at the airplane with wide excited eyes. Tiny white cloud motifs float in the sky beyond the window. Bright airport light. Watercolor picture book style, first-flight excited anticipation mood, rich but uncluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark.",
        }),
        buildAgeSpecificPage({
          textTemplate: "飛行機が離陸しました！{childName}はぎゅっと目をつぶりました。",
          baby_toddler: "とびたった！うわあ！",
          preschool_3_4:
            "ひこうきが りりくしました！{childName}は ぎゅっと めを つぶりました。",
          early_reader_5_6:
            "ひこうきが うごきだして、どんどん はやくなりました。「とびたったぞ！」と おもった しゅんかん、そとが まっしろな くもに なりました。",
          early_elementary_7_8:
            "ひこうきが りりくして、ぐんぐん うえに のぼっていきました。まちが ちいさくなって、くもを とおりぬけたとき、しろい くもが まどの むこうに ひろがりました。",
          general_child: "飛行機が離陸しました！{childName}はぎゅっと目をつぶりました。",
          pageVisualRole: "discovery",
          imagePromptTemplate:
            "Discovery medium shot inside the airplane cabin as it ascends through clouds. The child is seated at the window seat, one hand gripping the armrest, the other pressing against the glass as the plane breaks through white fluffy clouds. Outside is a brilliant blue sky above the clouds. Tiny white cloud motifs float past the window. Warm cabin light. Watercolor picture book style, exciting takeoff discovery mood, rich but uncluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark.",
        }),
        buildAgeSpecificPage({
          textTemplate: "窓の外には白い雲がいっぱい！{childName}は雲の上を飛んでいます。",
          baby_toddler: "くも、しろい！そらのうえ！",
          preschool_3_4:
            "まどの そとには しろい くもが いっぱい！{childName}は くもの うえを とんでいます。",
          early_reader_5_6:
            "まどの そとには しろい くもが うみのように ひろがっています。{childName}は くもの うえを とんでいます。まるで ゆめのようです。",
          early_elementary_7_8:
            "まどの そとには しろい くもが うみのように ひろがっていました。{childName}は くもの うえを とんでいます。ここから みる せかいは、ちいさくて うつくしい。",
          general_child: "窓の外には白い雲がいっぱい！{childName}は雲の上を飛んでいます。",
          pageVisualRole: "emotional_closeup",
          imagePromptTemplate:
            "Emotional close-up of the child's delighted face pressed close to the airplane window, staring out at a sea of fluffy white clouds stretching to the horizon under a deep blue sky. The child's expression is one of pure amazement and joy. Tiny white cloud motifs press against the glass from outside. Watercolor picture book style, wonder-filled aerial discovery close-up, luminous sky light, rich but uncluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark.",
        }),
        buildAgeSpecificPage({
          textTemplate: "はじめての飛行機、{childName}は大空を飛んだ！{parentMessage}",
          baby_toddler: "そら とんだよ！すごい！{parentMessage}",
          preschool_3_4:
            "はじめての ひこうき、{childName}は おおぞらを とんだ！{parentMessage}",
          early_reader_5_6:
            "はじめての ひこうき、くもの うえを とぶきぶんを おぼえているよ。{parentMessage}",
          early_elementary_7_8:
            "はじめて おおぞらを とんだ {childName}。しろい くもの うえから みた せかいは、ずっと こころに のこります。{parentMessage}",
          general_child:
            "はじめての ひこうき、{childName}は おおぞらを とんだ！{parentMessage}",
          pageVisualRole: "quiet_ending",
          imagePromptTemplate:
            "Wide quiet ending shot of the airplane descending through pink and gold clouds at sunset, the child visible at the window with a contented smile. Tiny white cloud motifs drift alongside the plane. The world below is bathed in golden light. Tender memory-preserving mood. Watercolor picture book style, peaceful landing ending, luminous sunset sky, rich but not cluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark.",
        }),
      ],
    },
  },
  "fixed-first-sports-day": {
    name: "うんどうかい がんばったね",
    description: "運動会で一生懸命頑張った{childName}の勇気と努力を記念する絵本",
    icon: "🏅",
    categoryGroupId: "memories",
    subcategoryId: "school-events",
    parentIntent: "大切な思い出を絵本として残したい",
    recommendedAgeMin: 2,
    recommendedAgeMax: 8,
    requiredInputs: ["childName"],
    optionalInputs: ["parentMessage"],
    themeTags: ["sports-day", "effort", "friends", "milestone"],
    creationMode: "fixed_template",
    priceTier: "ume",
    storyCostLevel: "none",
    sampleImageUrl: "/images/templates/fixed-first-sports-day.webp",
    sampleImageAlt: "運動会で全力で走る子どもの絵本イメージ",
    visualDirection:
      "Bright outdoor sports day atmosphere with colorful red and white flags, a finishing line, cheering crowd, and a red-and-white flag motif throughout.",
    order: 64,
    active: true,
    systemPrompt: "固定テンプレートを使って、運動会の頑張りを記念した絵本を作ります。",
    fixedStory: {
      previewImageUrl: "/images/templates/fixed-first-sports-day.webp",
      titleTemplate: "{childName}の うんどうかい",
      coverImagePromptTemplate:
        withFixedImagePromptSafety("Picture book cover illustration: a determined child running with all their might on a sports day track, red-and-white flags fluttering overhead, cheering crowd blurred in the background, a tiny red-and-white flag motif near the finish line, bright outdoor sports day atmosphere, soft watercolor style, rounded child-safe composition, rich but not cluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark."),
      titleSpreadTextTemplate: "よーい、どん！がんばれ！",
      openingNarrationTemplate:
        "うんどうかいの あさ。{childName}は そらを みあげました。よく はれた あおいそら。あかしろの はたが かぜに ひらひら します。",
      pages: [
        buildAgeSpecificPage({
          textTemplate: "{childName}はよーい、どんでスタートしました！",
          baby_toddler: "よーい、どん！はしった！",
          preschool_3_4:
            "{childName}は よーい、どんで スタートしました！",
          early_reader_5_6:
            "{childName}は よーい、どんの あいずで とびだしました！あしが じめんを けって、かぜを きって はしります。",
          early_elementary_7_8:
            "よーい、どんの あいずで {childName}は とびだしました。いっぱい れんしゅうした あのきもちを おもいだしながら、ぜんりょくで はしります。",
          general_child: "{childName}はよーい、どんでスタートしました！",
          pageVisualRole: "opening_establishing",
          imagePromptTemplate:
            "Establishing wide shot of an elementary school sports day running track. The child crouches at the starting line beside other racers. Red and white decorative flags flutter overhead. The sky is brilliant blue. Tiny red-and-white flag motifs appear on the track side markers. Bright outdoor sunlight. Watercolor picture book style, excited sports day start mood, rich but uncluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark.",
        }),
        buildAgeSpecificPage({
          textTemplate: "転んでも立ち上がって、{childName}はゴールを目指しました！",
          baby_toddler: "ころんでも、えいっ！おきた！",
          preschool_3_4:
            "ころんでも たちあがって、{childName}は ゴールを めざしました！",
          early_reader_5_6:
            "とちゅうで ころんでしまいました。でも {childName}は すぐに たちあがって、またはしりだしました。ゴールまで あきらめない！",
          early_elementary_7_8:
            "とちゅうで ころんでしまいました。いたいけど、{childName}は たちあがりました。「あきらめない」そのきもちが あしを うごかします。",
          general_child: "転んでも立ち上がって、{childName}はゴールを目指しました！",
          pageVisualRole: "discovery",
          imagePromptTemplate:
            "Discovery medium shot of the child getting back up after falling on the track, face set with determination. One knee scraped, but the child is already running again. Cheering spectators are visible at the sides. Tiny red-and-white flag motifs flutter along the track. Bright outdoor sunlight. Watercolor picture book style, determined perseverance mood, rich but uncluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark.",
        }),
        buildAgeSpecificPage({
          textTemplate: "{childName}はゴールしました！やったー！",
          baby_toddler: "ゴール！やったー！えらい！",
          preschool_3_4:
            "{childName}は ゴール しました！やったー！",
          early_reader_5_6:
            "{childName}は ゴールテープを きりました！かぞくの おうえんが きこえて、うれしくて なみだが でそうになりました。",
          early_elementary_7_8:
            "{childName}は ゴールテープを きりました！くるしくても あきらめなかった。その きもちが こころに メダルのように かがやいています。",
          general_child: "{childName}はゴールしました！やったー！",
          pageVisualRole: "emotional_closeup",
          imagePromptTemplate:
            "Emotional close-up of the child crossing the finish line with both arms raised in triumph, face beaming with exhausted but pure joy. Red-and-white finish flags frame the scene. The crowd's hands are visible cheering at the edges. Tiny red-and-white flag motifs flutter around the moment. Bright outdoor sunlight. Watercolor picture book style, triumphant achievement close-up, rich but uncluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark.",
        }),
        buildAgeSpecificPage({
          textTemplate: "よくがんばった{childName}。諦めない心がすごい！{parentMessage}",
          baby_toddler: "がんばった！えらい！{parentMessage}",
          preschool_3_4:
            "よく がんばった {childName}。あきらめない こころが すごい！{parentMessage}",
          early_reader_5_6:
            "よく がんばった {childName}。ころんでも たちあがった その こころが、いちばんの メダルだよ。{parentMessage}",
          early_elementary_7_8:
            "よく がんばった {childName}。かちまけより も たいせつな ことを、きょうの うんどうかいで みせてくれました。{parentMessage}",
          general_child:
            "よく がんばった {childName}。あきらめない こころが すごい！{parentMessage}",
          pageVisualRole: "quiet_ending",
          imagePromptTemplate:
            "Wide quiet ending shot of the child sitting with family after sports day, holding a participation ribbon or medal, face glowing with happy exhaustion. Red-and-white flags flutter gently in the background sky. Tiny red-and-white flag motif on the ribbon. Warm late afternoon golden light. Watercolor picture book style, peaceful proud achievement ending, rich but not cluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark.",
        }),
      ],
    },
  },
  "fixed-first-recital": {
    name: "はっぴょうかい できたよ",
    description: "発表会や音楽会で頑張った{childName}の勇気ある舞台姿を記念する絵本",
    icon: "🎤",
    categoryGroupId: "memories",
    subcategoryId: "performance",
    parentIntent: "大切な思い出を絵本として残したい",
    recommendedAgeMin: 2,
    recommendedAgeMax: 8,
    requiredInputs: ["childName"],
    optionalInputs: ["parentMessage"],
    themeTags: ["recital", "performance", "courage", "milestone"],
    creationMode: "fixed_template",
    priceTier: "ume",
    storyCostLevel: "none",
    sampleImageUrl: "/images/templates/fixed-first-recital.webp",
    sampleImageAlt: "発表会の舞台で輝く子どもの絵本イメージ",
    visualDirection:
      "Bright stage performance atmosphere with spotlight, audience, costumes, and a tiny gold star motif representing the child's shining moment throughout.",
    order: 65,
    active: true,
    systemPrompt: "固定テンプレートを使って、発表会・音楽会の記念絵本を作ります。",
    fixedStory: {
      previewImageUrl: "/images/templates/fixed-first-recital.webp",
      titleTemplate: "{childName}の はっぴょうかい",
      coverImagePromptTemplate:
        withFixedImagePromptSafety("Picture book cover illustration: a child in a colorful performance costume standing center stage under a warm spotlight, facing a cheering audience, a tiny gold star motif glowing at the top of the stage curtain, proud shining performance moment, soft watercolor style, rounded child-safe composition, rich but not cluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark."),
      titleSpreadTextTemplate: "ステージの うえで かがやけ！",
      openingNarrationTemplate:
        "はっぴょうかいの ひ。{childName}は ぶたいのそでで まっていました。どきどきするけど、たくさん れんしゅうしたんだもん。きんいろの ほしが みまもっています。",
      pages: [
        buildAgeSpecificPage({
          textTemplate: "{childName}は舞台の袖でドキドキしながら出番を待ちました。",
          baby_toddler: "ぶたい、どきどき。がんばるよ！",
          preschool_3_4:
            "{childName}は ぶたいの そでで どきどきしながら でばんを まちました。",
          early_reader_5_6:
            "{childName}は ぶたいの そでで まっていました。どきどきするけど、いっぱい れんしゅうしたから だいじょうぶ！",
          early_elementary_7_8:
            "{childName}は ぶたいの そでで まちながら、れんしゅうの ひびを おもいだしました。なんども まちがえて、それでも あきらめなかった。きんいろの ほしが かがやいています。",
          general_child: "{childName}は舞台の袖でドキドキしながら出番を待ちました。",
          pageVisualRole: "opening_establishing",
          imagePromptTemplate:
            "Establishing wide shot of a stage wing area in a school auditorium. The child waits in costume at the edge of the curtain, peeking at the lit stage beyond. A warm spotlight glows on the empty stage. A tiny gold star motif appears on the curtain. The child's expression shows excited nervousness. Watercolor picture book style, pre-performance anticipation mood, warm stage light, rich but uncluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark.",
        }),
        buildAgeSpecificPage({
          textTemplate: "いよいよ{childName}の出番です！舞台に出て大きく息を吸いました。",
          baby_toddler: "でた！ぶたいに でた！",
          preschool_3_4:
            "いよいよ {childName}の でばんです！ぶたいに でて おおきく いきを すいました。",
          early_reader_5_6:
            "いよいよ {childName}の でばんです！ぶたいに でると、スポットライトが あたって、きんいろに かがやいているようでした。",
          early_elementary_7_8:
            "いよいよ {childName}の でばんです！ぶたいに でると スポットライトが あたりました。おきゃくさんの かおが みえた しゅんかん、どきどきが ふわっと きえました。",
          general_child: "いよいよ{childName}の出番です！舞台に出て大きく息を吸いました。",
          pageVisualRole: "discovery",
          imagePromptTemplate:
            "Discovery medium shot of the child stepping onto the stage into the spotlight for the first time, face turning from nervous to brave. The audience is visible as a soft blur in the background. Tiny gold star motifs sparkle around the spotlight beam. Warm golden stage light. Watercolor picture book style, brave debut moment, luminous performance atmosphere, rich but uncluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark.",
        }),
        buildAgeSpecificPage({
          textTemplate: "{childName}は全力でパフォーマンスしました！みんなが拍手しています。",
          baby_toddler: "ぱちぱちぱち！じょうず！",
          preschool_3_4:
            "{childName}は ぜんりょくで パフォーマンスしました！みんなが はくしゅしています。",
          early_reader_5_6:
            "{childName}は ぜんりょくで えんそうや おどりを したあと、はくしゅが おきました。ぐっと むねが あつくなります。",
          early_elementary_7_8:
            "{childName}は ぜんりょくで えんそうを しました。はくしゅが おきたとき、れんしゅうの ひびが むくわれたような きがして、こころが きんいろに ひかりました。",
          general_child: "{childName}は全力でパフォーマンスしました！みんなが拍手しています。",
          pageVisualRole: "emotional_closeup",
          imagePromptTemplate:
            "Emotional close-up of the child mid-performance on stage — singing, dancing, or playing an instrument with full concentration and joy. The spotlight highlights their beaming face. The audience's blurred hands clap in the background. Tiny gold star motifs float around the spotlight. Watercolor picture book style, shining peak performance close-up, luminous warm stage light, rich but uncluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark.",
        }),
        buildAgeSpecificPage({
          textTemplate: "よくできた{childName}！頑張った姿が金の星みたいに輝いていたよ。{parentMessage}",
          baby_toddler: "じょうずだった！えらい！{parentMessage}",
          preschool_3_4:
            "よく できた {childName}！がんばった すがたが きんの ほしみたいに かがやいていたよ。{parentMessage}",
          early_reader_5_6:
            "よく できた {childName}！れんしゅうを のりこえた その きんの ほしが、こころで かがやいているよ。{parentMessage}",
          early_elementary_7_8:
            "よく できた {childName}！ぶたいの うえで かがやいた その すがたは、ずっと こころに のこります。きんの ほしみたいに。{parentMessage}",
          general_child:
            "よく できた {childName}！がんばった すがたが きんの ほしみたいに かがやいていたよ。{parentMessage}",
          pageVisualRole: "quiet_ending",
          imagePromptTemplate:
            "Wide quiet ending shot of the child backstage after the performance, still in costume, holding a small bouquet of flowers given by family, face glowing with happy exhaustion and pride. A tiny gold star motif shines on the costume. Warm backstage light. Watercolor picture book style, tender proud achievement ending, rich but not cluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark.",
        }),
      ],
    },
  },
  "fixed-growing-taller": {
    name: "こんなに おおきくなったよ",
    description: "身長を測ったら、こんなに大きくなっていた！{childName}の成長を喜ぶ記念日絵本",
    icon: "📏",
    categoryGroupId: "memories",
    subcategoryId: "child-growth",
    parentIntent: "大切な思い出を絵本として残したい",
    recommendedAgeMin: 1,
    recommendedAgeMax: 8,
    requiredInputs: ["childName"],
    optionalInputs: ["parentMessage"],
    themeTags: ["growth", "height", "milestone", "memory"],
    creationMode: "fixed_template",
    priceTier: "ume",
    storyCostLevel: "none",
    sampleImageUrl: "/images/templates/fixed-growing-taller.webp",
    sampleImageAlt: "身長を測って成長を喜ぶ子どもの絵本イメージ",
    visualDirection:
      "Warm cozy home atmosphere with a height measuring chart, rainbows of color showing growth stages, and a tiny rainbow star motif throughout.",
    order: 66,
    active: true,
    systemPrompt: "固定テンプレートを使って、{childName}の成長を喜ぶ記念絵本を作ります。",
    fixedStory: {
      previewImageUrl: "/images/templates/fixed-growing-taller.webp",
      titleTemplate: "{childName}、こんなに おおきく なったよ！",
      coverImagePromptTemplate:
        withFixedImagePromptSafety("Picture book cover illustration: a joyful child standing straight and tall against a colorful height measurement chart on a wall, looking proud at how much they have grown, tiny rainbow star motifs along the measurement marks, warm cozy home atmosphere, soft watercolor style, rounded child-safe composition, rich but not cluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark."),
      titleSpreadTextTemplate: "どんどん おおきく なってる！",
      openingNarrationTemplate:
        "きょうは {childName}の せを はかる ひ。かべの しるしが どこまで きたかな。にじいろの ほしが きらきら ならんでいます。",
      pages: [
        buildAgeSpecificPage({
          textTemplate: "{childName}は背中を壁にピタッとつけてせいくらべしました。",
          baby_toddler: "せのびのびー！おおきく なあれ。",
          preschool_3_4:
            "{childName}は せなかを かべに ピタッと つけて せいくらべ しました。",
          early_reader_5_6:
            "{childName}は せなかを かべに ピタッと つけて せを はかりました。はかるたびに すこしずつ おおきく なっているのが うれしいです。",
          early_elementary_7_8:
            "{childName}は せなかを まっすぐ かべに つけて せを はかりました。にじいろの ほしが ならんだ しるしを みると、じぶんが どれだけ おおきくなったかが わかります。",
          general_child: "{childName}は背中を壁にピタッとつけてせいくらべしました。",
          pageVisualRole: "opening_establishing",
          imagePromptTemplate:
            "Establishing wide shot of a cozy home wall with a colorful height measurement chart. The child stands straight against the wall with a parent marking their height. Tiny rainbow star motifs mark each centimeter line on the chart. Warm home light. Watercolor picture book style, warm family milestone mood, rich but uncluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark.",
        }),
        buildAgeSpecificPage({
          textTemplate: "去年より大きくなっていた！{childName}はとても嬉しそう。",
          baby_toddler: "おおきく なった！やったー！",
          preschool_3_4:
            "きょねんより おおきく なっていた！{childName}は とても うれしそう。",
          early_reader_5_6:
            "きょねんの しるしより ずっと うえに せが きていました！{childName}は うれしくて とびはねました。",
          early_elementary_7_8:
            "きょねんの しるしより ずっと うえに せが きていました！{childName}は にじいろの ほしの ならびを みながら、じぶんが どれだけ おおきくなったか を かんじました。",
          general_child: "去年より大きくなっていた！{childName}はとても嬉しそう。",
          pageVisualRole: "discovery",
          imagePromptTemplate:
            "Discovery medium shot of the child pointing excitedly at the new height mark on the wall chart, which is clearly higher than the previous year's mark. The child's face beams with pride. Rainbow star motifs line the chart beside the new measurement. Parent watches with a warm smile. Watercolor picture book style, joyful growth discovery mood, rich but uncluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark.",
        }),
        buildAgeSpecificPage({
          textTemplate: "{childName}は昔の小さかった自分の写真を見て、にっこりしました。",
          baby_toddler: "むかし ちっちゃかった、いまは おおきい！",
          preschool_3_4:
            "{childName}は むかしの ちいさかった じぶんの しゃしんを みて、にっこりしました。",
          early_reader_5_6:
            "{childName}は むかしの ちいさかった じぶんの しゃしんを みました。あのころと くらべると、こんなに おおきくなったんだ と うれしくなります。",
          early_elementary_7_8:
            "{childName}は むかしの ちいさかった じぶんの しゃしんを みました。ちいさかった じぶんが、いまの じぶんに なるまでに、たくさんの ことが あったんだな と おもいました。",
          general_child: "{childName}は昔の小さかった自分の写真を見て、にっこりしました。",
          pageVisualRole: "emotional_closeup",
          imagePromptTemplate:
            "Emotional close-up of the child holding or looking at an old baby photo, smiling softly as they compare their tiny past self to their current grown self. Rainbow star motifs float gently around the photo. Warm family room light. Watercolor picture book style, tender self-discovery reflection close-up, rich but uncluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark.",
        }),
        buildAgeSpecificPage({
          textTemplate: "これからもどんどん大きくなってね、{childName}。{parentMessage}",
          baby_toddler: "もっと おおきく なあれ！{parentMessage}",
          preschool_3_4:
            "これからも どんどん おおきく なってね、{childName}。{parentMessage}",
          early_reader_5_6:
            "これからも どんどん おおきく なってね。にじいろの ほしが {childName}の これからを てらしています。{parentMessage}",
          early_elementary_7_8:
            "これからも どんどん おおきく なってね、{childName}。せだけじゃなくて、こころも。にじいろの ほしが これからの せいちょうを てらしています。{parentMessage}",
          general_child:
            "これからも どんどん おおきく なってね、{childName}。{parentMessage}",
          pageVisualRole: "quiet_ending",
          imagePromptTemplate:
            "Wide quiet ending shot of the child standing tall beside the height chart on the wall, looking toward a bright window with a hopeful expression. Rainbow star motifs line the chart beside them. Warm morning light streams in. The scene radiates growth, hope, and pride. Watercolor picture book style, hopeful growth celebration ending, luminous warm light, rich but not cluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark.",
        }),
      ],
    },
  },
  "fixed-learning-colors": {
    name: "いろのふしぎ",
    description: "赤・青・黄色…世界はいろんな色でいっぱい！色の不思議を楽しく学ぶ絵本",
    icon: "🎨",
    categoryGroupId: "learning",
    subcategoryId: "colors",
    parentIntent: "楽しく学んでほしい",
    recommendedAgeMin: 1,
    recommendedAgeMax: 5,
    requiredInputs: ["childName"],
    optionalInputs: ["parentMessage"],
    themeTags: ["colors", "learning", "nature", "art"],
    creationMode: "fixed_template",
    priceTier: "ume",
    storyCostLevel: "none",
    sampleImageUrl: "/images/templates/fixed-learning-colors.webp",
    sampleImageAlt: "カラフルな色を探索する子どもの絵本イメージ",
    visualDirection:
      "Vibrant colorful world with rainbow spectrum throughout, a rainbow arc motif, each page featuring a different color discovery.",
    order: 70,
    active: true,
    systemPrompt: "固定テンプレートを使って、色について楽しく学ぶ絵本を作ります。",
    fixedStory: {
      previewImageUrl: "/images/templates/fixed-learning-colors.webp",
      titleTemplate: "{childName}と いろのふしぎ",
      coverImagePromptTemplate:
        withFixedImagePromptSafety("Picture book cover illustration: a joyful child surrounded by a rainbow of colorful objects — red apples, blue sky, yellow sunflowers, green leaves, purple grapes — all swirling in a playful circular arrangement, a tiny rainbow arc motif above the child, vibrant learning mood, soft watercolor style, rounded child-safe composition, rich but not cluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark."),
      titleSpreadTextTemplate: "せかいは いろいろな いろで いっぱい！",
      openingNarrationTemplate:
        "きょう {childName}は いろを さがしに でかけました。あかい いろ、あおい いろ、きいろい いろ。にじの ようなせかいが まっています。",
      pages: [
        buildAgeSpecificPage({
          textTemplate: "{childName}は赤いりんごを見つけました。赤は元気な色！",
          baby_toddler: "あかい りんご！あか、あか！",
          preschool_3_4:
            "{childName}は あかい りんごを みつけました。あかは げんきな いろ！",
          early_reader_5_6:
            "{childName}は あかい りんごを みつけました。あかは げんきで つよい いろです。ほかに あかい ものは なにかな？",
          early_elementary_7_8:
            "{childName}は あかい りんごを みつけました。あかは あついきもちや げんき を あらわす いろです。たいようや ばらも あかい。",
          general_child: "{childName}は赤いりんごを見つけました。赤は元気な色！",
          pageVisualRole: "opening_establishing",
          imagePromptTemplate:
            "Establishing wide shot of a colorful market or garden setting. The child reaches excitedly for bright red apples on a low branch or stand. The scene is vibrant with reds — red apples, red strawberries, red roses. A tiny rainbow arc motif arches in the sky above. Warm sunlight. Watercolor picture book style, joyful color discovery learning mood, rich but uncluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark.",
        }),
        buildAgeSpecificPage({
          textTemplate: "青い空と青い海。{childName}は青がいっぱいの世界を見ました。",
          baby_toddler: "そら あおい！うみ あおい！",
          preschool_3_4:
            "あおい そらと あおい うみ。{childName}は あおが いっぱいの せかいを みました。",
          early_reader_5_6:
            "あおい そらと あおい うみが つながっています。{childName}は あおが いっぱいの せかいに むねが いっぱいに なりました。",
          early_elementary_7_8:
            "あおい そらと あおい うみが どこまでも つながっています。{childName}は あおい いろが ひろがりと しずけさを あらわしていると かんじました。",
          general_child: "青い空と青い海。{childName}は青がいっぱいの世界を見ました。",
          pageVisualRole: "discovery",
          imagePromptTemplate:
            "Discovery medium shot of the child standing on a beach or hillside, looking out at a brilliant blue sky and blue ocean meeting at the horizon. Blue colors dominate — sky, sea, blue butterfly nearby. A tiny rainbow arc motif appears in the sky. Bright joyful light. Watercolor picture book style, expansive color discovery mood, rich but uncluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark.",
        }),
        buildAgeSpecificPage({
          textTemplate: "黄色いひまわりと緑の葉っぱ。色には名前があるんだね！",
          baby_toddler: "きいろい はな！みどりの は！",
          preschool_3_4:
            "きいろい ひまわりと みどりの はっぱ。いろには なまえが あるんだね！",
          early_reader_5_6:
            "きいろい ひまわりが みどりの はっぱに かこまれています。たくさんの いろに それぞれ なまえが あるのが ふしぎで たのしいです。",
          early_elementary_7_8:
            "きいろい ひまわりと みどりの はっぱ。いろには それぞれ なまえが あって、あわせると また あたらしい いろが うまれることも あります。",
          general_child: "黄色いひまわりと緑の葉っぱ。色には名前があるんだね！",
          pageVisualRole: "emotional_closeup",
          imagePromptTemplate:
            "Emotional close-up of the child's face among giant yellow sunflowers with vivid green leaves, looking up with delight at the colors around them. Yellow petals frame the scene. A tiny rainbow arc motif curves above the sunflowers. Warm golden sunlight. Watercolor picture book style, warm color wonder close-up, rich but uncluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark.",
        }),
        buildAgeSpecificPage({
          textTemplate: "世界はいろんな色でいっぱい。{childName}はどんな色が好き？{parentMessage}",
          baby_toddler: "にじ きれい！すき！{parentMessage}",
          preschool_3_4:
            "せかいは いろんな いろで いっぱい。{childName}は どんな いろが すき？{parentMessage}",
          early_reader_5_6:
            "せかいは たくさんの いろで いっぱいです。{childName}の すきな いろは なにかな？いろを さがすたびに、せかいが もっと たのしくなります。{parentMessage}",
          early_elementary_7_8:
            "せかいは たくさんの いろで いっぱいです。いろは きもちや ものを あらわします。{childName}が いちばん すきな いろは どんな いろかな？{parentMessage}",
          general_child:
            "せかいは いろんな いろで いっぱい。{childName}は どんな いろが すき？{parentMessage}",
          pageVisualRole: "quiet_ending",
          imagePromptTemplate:
            "Wide quiet ending shot of the child sitting in a flower meadow surrounded by flowers of every color — red, orange, yellow, green, blue, purple — arms spread wide embracing the rainbow of colors. A full rainbow arc motif stretches across the sky above. Warm golden light. Watercolor picture book style, joyful colorful celebration ending, luminous light, rich but not cluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark.",
        }),
      ],
    },
  },
  "fixed-learning-numbers": {
    name: "かずをかぞえよう",
    description: "1つ、2つ、3つ…かずをかぞえながら世界を探検！楽しく数を学ぶ絵本",
    icon: "🔢",
    categoryGroupId: "learning",
    subcategoryId: "numbers",
    parentIntent: "楽しく学んでほしい",
    recommendedAgeMin: 1,
    recommendedAgeMax: 5,
    requiredInputs: ["childName"],
    optionalInputs: ["parentMessage"],
    themeTags: ["numbers", "counting", "learning", "nature"],
    creationMode: "fixed_template",
    priceTier: "ume",
    storyCostLevel: "none",
    sampleImageUrl: "/images/templates/fixed-learning-numbers.webp",
    sampleImageAlt: "数を数えながら探索する子どもの絵本イメージ",
    visualDirection:
      "Playful counting adventure with groups of round natural objects, round pebble motif, each page featuring counting 1 through 10.",
    order: 71,
    active: true,
    systemPrompt: "固定テンプレートを使って、かずを楽しく学ぶ絵本を作ります。",
    fixedStory: {
      previewImageUrl: "/images/templates/fixed-learning-numbers.webp",
      titleTemplate: "{childName}と かずの たんけん",
      coverImagePromptTemplate:
        withFixedImagePromptSafety("Picture book cover illustration: a joyful child counting colorful round pebbles arranged on a path — the child touches them one by one with a counting finger, tiny round pebble motifs scattered around, playful counting adventure mood, soft watercolor style, rounded child-safe composition, rich but not cluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark."),
      titleSpreadTextTemplate: "ひとつ ふたつ みっつ！かぞえよう！",
      openingNarrationTemplate:
        "きょう {childName}は かずを かぞえる たんけんに でかけました。いくつ みつけられるかな？まるい いし が ならんでいます。",
      pages: [
        buildAgeSpecificPage({
          textTemplate: "{childName}はりんごを1つ見つけました。ひとつ！",
          baby_toddler: "ひとつ！りんご いち！",
          preschool_3_4:
            "{childName}は りんごを 1つ みつけました。ひとつ！",
          early_reader_5_6:
            "{childName}は りんごを 1つ みつけました。ひとつ！まるい いしのように ころんと して います。",
          early_elementary_7_8:
            "{childName}は りんごを 1つ みつけました。ひとつ。かずの はじまりは「1」、たった ひとつ でも、とくべつな いちご みたい。",
          general_child: "{childName}はりんごを1つ見つけました。ひとつ！",
          pageVisualRole: "opening_establishing",
          imagePromptTemplate:
            "Establishing wide shot of a garden or orchard. The child spots one perfect round red apple on a low branch and reaches for it with one finger pointing. A single round pebble motif rests nearby on the path. Warm sunlight. Watercolor picture book style, playful counting learning mood, rich but uncluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark.",
        }),
        buildAgeSpecificPage({
          textTemplate: "2つの蝶々、3つの花。{childName}はどんどんかぞえました！",
          baby_toddler: "ちょうちょ ふたつ！はな みっつ！",
          preschool_3_4:
            "2つの ちょうちょ、3つの はな。{childName}は どんどん かぞえました！",
          early_reader_5_6:
            "2つの ちょうちょが とんできて、3つの はなに とまりました。{childName}は ゆびを さして どんどん かぞえました！",
          early_elementary_7_8:
            "2つの ちょうちょが とんできて、3つの はなに とまりました。かぞえるたびに せかいが もっと たのしく みえてきます。",
          general_child: "2つの蝶々、3つの花。{childName}はどんどんかぞえました！",
          pageVisualRole: "discovery",
          imagePromptTemplate:
            "Discovery medium shot of the child in a flower meadow, counting two butterflies landing on three flowers with an excited expression. Round pebble motifs rest near the flowers. Colorful butterflies with wings spread. Warm sunny afternoon. Watercolor picture book style, enthusiastic counting discovery mood, rich but uncluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark.",
        }),
        buildAgeSpecificPage({
          textTemplate: "{childName}は丸い石を10個並べました。とお！できた！",
          baby_toddler: "いし ならべて、とお！やった！",
          preschool_3_4:
            "{childName}は まるい いしを 10こ ならべました。とお！できた！",
          early_reader_5_6:
            "{childName}は まるい いしを いち、に、さん…とお！と かぞえながら ならべました。10こ できた！",
          early_elementary_7_8:
            "{childName}は まるい いしを 10こ ならべました。いち から とお まで かぞえると、なんでも かぞえられる きがして うれしくなります。",
          general_child: "{childName}は丸い石を10個並べました。とお！できた！",
          pageVisualRole: "emotional_closeup",
          imagePromptTemplate:
            "Emotional close-up of the child kneeling on the ground, arranging ten round pebbles in a neat row with careful focus. The child's face shows concentration turning to proud satisfaction as they finish. The ten round pebble motifs gleam in soft light. Watercolor picture book style, proud counting achievement close-up, rich but uncluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark.",
        }),
        buildAgeSpecificPage({
          textTemplate: "かずを知るともっとたくさんのことがわかる。{parentMessage}",
          baby_toddler: "かず、たのしい！{parentMessage}",
          preschool_3_4:
            "かずを しると もっと たくさんのことが わかる。{parentMessage}",
          early_reader_5_6:
            "かずを しると まちの ものも、しぜんも もっと たのしく みえてきます。{childName}は かずを かぞえるのが すきになりました。{parentMessage}",
          early_elementary_7_8:
            "かずを しると せかいが もっと みえてくる。りんごが いくつ、ほしが なんこ、てのひらの ゆびが なんぼん。かずは どこにでも あります。{parentMessage}",
          general_child:
            "かずを しると もっと たくさんのことが わかる。{parentMessage}",
          pageVisualRole: "quiet_ending",
          imagePromptTemplate:
            "Wide quiet ending shot of the child sitting peacefully outdoors, surrounded by nature, contentedly counting stars appearing in the early evening sky — one, two, three... Round pebble motifs sit in a neat row beside them. Soft warm evening light. Watercolor picture book style, peaceful learning celebration ending, rich but not cluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark.",
        }),
      ],
    },
  },
  "fixed-learning-animals": {
    name: "どうぶつさんの こえ",
    description: "ライオンはガオー、ゾウはパオーン！動物の鳴き声を楽しく学ぶ絵本",
    icon: "🐘",
    categoryGroupId: "learning",
    subcategoryId: "animals",
    parentIntent: "楽しく学んでほしい",
    recommendedAgeMin: 0,
    recommendedAgeMax: 4,
    requiredInputs: ["childName"],
    optionalInputs: ["parentMessage"],
    themeTags: ["animals", "sounds", "learning", "nature"],
    creationMode: "fixed_template",
    priceTier: "ume",
    storyCostLevel: "none",
    sampleImageUrl: "/images/templates/fixed-learning-animals.webp",
    sampleImageAlt: "動物の鳴き声を真似する子どもの絵本イメージ",
    visualDirection:
      "Friendly animal parade with expressive animal characters, musical note motifs floating around each animal's sound, joyful learning atmosphere.",
    order: 72,
    active: true,
    systemPrompt: "固定テンプレートを使って、動物の鳴き声を楽しく学ぶ絵本を作ります。",
    fixedStory: {
      previewImageUrl: "/images/templates/fixed-learning-animals.webp",
      titleTemplate: "{childName}と どうぶつさんの こえ",
      coverImagePromptTemplate:
        withFixedImagePromptSafety("Picture book cover illustration: a joyful child surrounded by friendly cartoon animals — elephant, lion, dog, cat, frog — each with an open mouth making their sound, musical note motifs floating around each animal, playful animal learning mood, soft watercolor style, rounded child-safe composition, rich but not cluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark."),
      titleSpreadTextTemplate: "どうぶつさんは なんていう？",
      openingNarrationTemplate:
        "きょう {childName}は どうぶつえんに やってきました。どうぶつさんたちが こえを きかせてくれます。おんぷが ふわりと とんでいます。",
      pages: [
        buildAgeSpecificPage({
          textTemplate: "ライオンさんがガオーと言いました。{childName}もガオー！",
          baby_toddler: "らいおん！がおー！がおー！",
          preschool_3_4:
            "ライオンさんが ガオーと いいました。{childName}も ガオー！",
          early_reader_5_6:
            "ライオンさんが おおきく くちを あけて ガオーと いいました。{childName}も まねして ガオー！おんぷが とんでいきます。",
          early_elementary_7_8:
            "ライオンさんが ガオーと ほえました。{childName}も おなかのそこから ガオー！どうぶつの こえを まねするのが たのしくて しかたありません。",
          general_child: "ライオンさんがガオーと言いました。{childName}もガオー！",
          pageVisualRole: "opening_establishing",
          imagePromptTemplate:
            "Establishing wide shot of a zoo or safari setting. A friendly cartoon lion stands proudly, mouth open wide with musical note motifs floating from its roar. The child stands nearby, mimicking the roar with both arms raised. Notes float around both lion and child. Warm sunny day. Watercolor picture book style, joyful animal learning mood, rich but uncluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark.",
        }),
        buildAgeSpecificPage({
          textTemplate: "ゾウさんはパオーン！ワンちゃんはワンワン！鳴き声ってたのしいな。",
          baby_toddler: "ぞう、ぱおーん！いぬ、わんわん！",
          preschool_3_4:
            "ゾウさんは パオーン！ワンちゃんは ワンワン！なきごえって たのしいな。",
          early_reader_5_6:
            "ゾウさんは パオーン！ワンちゃんは ワンワン！なきごえを ならべて うたみたいに なりました。",
          early_elementary_7_8:
            "ゾウさんは パオーン、ワンちゃんは ワンワン、ねこは ニャーニャー。どうぶつに よって こえが ちがうのが ふしぎで おもしろいです。",
          general_child: "ゾウさんはパオーン！ワンちゃんはワンワン！鳴き声ってたのしいな。",
          pageVisualRole: "discovery",
          imagePromptTemplate:
            "Discovery medium shot of the child between a friendly elephant and a happy dog, both making their sounds — musical notes float up from each. The child laughs and claps hands with delight. Musical note motifs fill the air around the trio. Bright joyful light. Watercolor picture book style, playful sound discovery mood, rich but uncluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark.",
        }),
        buildAgeSpecificPage({
          textTemplate: "{childName}はカエルの鳴き声を真似しました。ケロケロケロ！",
          baby_toddler: "かえる、けろけろ！おもしろい！",
          preschool_3_4:
            "{childName}は カエルの なきごえを まねしました。ケロケロケロ！",
          early_reader_5_6:
            "{childName}は カエルの なきごえを まねしました。ケロケロケロ！カエルさんも ケロケロ こたえてくれました。",
          early_elementary_7_8:
            "{childName}は カエルの なきごえを まねしました。ケロケロケロ！カエルさんが こたえてくれて、ふたりで なきごえ あいあいを しているみたいです。",
          general_child: "{childName}はカエルの鳴き声を真似しました。ケロケロケロ！",
          pageVisualRole: "emotional_closeup",
          imagePromptTemplate:
            "Emotional close-up of the child crouching face-to-face with a friendly cartoon frog at a pond's edge, both with mouths wide open making their sounds. Musical note motifs bubble up from both. The child's eyes are squinted with laughter. Soft green pond setting. Watercolor picture book style, joyful animal mimicry close-up, rich but uncluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark.",
        }),
        buildAgeSpecificPage({
          textTemplate: "どうぶつの声を知ると、もっとなかよしになれるね。{parentMessage}",
          baby_toddler: "どうぶつ、なかよし！{parentMessage}",
          preschool_3_4:
            "どうぶつの こえを しると、もっと なかよしに なれるね。{parentMessage}",
          early_reader_5_6:
            "どうぶつの こえを しると、もっと なかよしに なれるね。きょうの たんけん、たのしかったな。{parentMessage}",
          early_elementary_7_8:
            "どうぶつの こえを しると、どうぶつの きもちが すこし わかるような きがします。{childName}は どうぶつたちが もっと すきになりました。{parentMessage}",
          general_child:
            "どうぶつの こえを しると、もっと なかよしに なれるね。{parentMessage}",
          pageVisualRole: "quiet_ending",
          imagePromptTemplate:
            "Wide quiet ending shot of the child waving goodbye to a lineup of friendly animals — lion, elephant, dog, frog, rabbit — all making their sounds with musical note motifs floating gently above each. The child waves with a big smile. Warm golden sunset light. Watercolor picture book style, warm animal friendship farewell ending, rich but not cluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark.",
        }),
      ],
    },
  },
  "fixed-learning-seasons": {
    name: "しきのえほん",
    description: "春・夏・秋・冬…四季を巡る自然の変化を{childName}と一緒に発見する絵本",
    icon: "🍂",
    categoryGroupId: "learning",
    subcategoryId: "seasons",
    parentIntent: "楽しく学んでほしい",
    recommendedAgeMin: 1,
    recommendedAgeMax: 6,
    requiredInputs: ["childName"],
    optionalInputs: ["parentMessage"],
    themeTags: ["seasons", "nature", "learning", "discovery"],
    creationMode: "fixed_template",
    priceTier: "ume",
    storyCostLevel: "none",
    sampleImageUrl: "/images/templates/fixed-learning-seasons.webp",
    sampleImageAlt: "四季の変化を楽しむ子どもの絵本イメージ",
    visualDirection:
      "Four seasons journey with each page representing one season, a glowing sun motif appearing in all weather, vibrant natural color changes throughout.",
    order: 73,
    active: true,
    systemPrompt: "固定テンプレートを使って、四季を楽しく学ぶ絵本を作ります。",
    fixedStory: {
      previewImageUrl: "/images/templates/fixed-learning-seasons.webp",
      titleTemplate: "{childName}と しきのたび",
      coverImagePromptTemplate:
        withFixedImagePromptSafety("Picture book cover illustration: a joyful child at the center of a circular scene divided into four seasons — spring cherry blossoms top-left, summer sunflowers top-right, autumn red leaves bottom-right, winter snowflakes bottom-left — a tiny glowing sun motif at the center, magical seasonal journey mood, soft watercolor style, rounded child-safe composition, rich but not cluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark."),
      titleSpreadTextTemplate: "はる、なつ、あき、ふゆ！",
      openingNarrationTemplate:
        "いちねんは よっつの きせつで できています。{childName}は しきの たびに でかけました。おひさまが やさしく てらしています。",
      pages: [
        buildAgeSpecificPage({
          textTemplate: "春になりました。桜が咲いて、あたたかいです。",
          baby_toddler: "はる！さくら さいた！あたたかい。",
          preschool_3_4:
            "はるに なりました。さくらが さいて、あたたかいです。",
          early_reader_5_6:
            "はるに なりました。さくらが ぱあっと さいて、あたたかいかぜが ふきます。はるは いのちが めざめる きせつです。",
          early_elementary_7_8:
            "はるに なりました。さくらが さいて、たんぽぽが ひらいて、ちょうちょが とんでいます。はるは いのちが めざめる、いちばん あたたかい きせつです。",
          general_child: "春になりました。桜が咲いて、あたたかいです。",
          pageVisualRole: "opening_establishing",
          imagePromptTemplate:
            "Establishing wide shot of a spring scene. A child walks under blooming cherry blossom trees in a park, sunlight warm and golden. A tiny glowing sun motif peeks through the blossoms above. Pink petals drift softly. New green shoots are visible. Watercolor picture book style, gentle awakening spring mood, rich but uncluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark.",
        }),
        buildAgeSpecificPage({
          textTemplate: "夏は太陽がまぶしい！海で波と遊びました。",
          baby_toddler: "なつ！うみ！ざぶーん！",
          preschool_3_4:
            "なつは たいようが まぶしい！うみで なみと あそびました。",
          early_reader_5_6:
            "なつは たいようが ぎらぎら かがやきます。{childName}は うみの なみと あそびました。あつい なつが すきです。",
          early_elementary_7_8:
            "なつは たいようが まぶしく、うみが きらきら かがやきます。{childName}は なみと あそびながら、なつの げんきな エネルギーを からだいっぱいに かんじました。",
          general_child: "夏は太陽がまぶしい！海で波と遊びました。",
          pageVisualRole: "discovery",
          imagePromptTemplate:
            "Discovery medium shot of the child splashing and playing in ocean waves on a bright summer day. A blazing sun shines above — the tiny glowing sun motif prominent in the sky. The water is turquoise and sparkling. The child laughs with arms spread wide. Watercolor picture book style, energetic joyful summer mood, luminous sunlight, rich but uncluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark.",
        }),
        buildAgeSpecificPage({
          textTemplate: "秋になると葉っぱが赤や黄色に変わりました。ふしぎだな！",
          baby_toddler: "あき！は っぱ あかい！きいろ！",
          preschool_3_4:
            "あきに なると はっぱが あかや きいろに かわりました。ふしぎだな！",
          early_reader_5_6:
            "あきに なると はっぱが あかや きいろに そまります。{childName}は おちばを ひろいながら、なぜ いろが かわるんだろう と おもいました。",
          early_elementary_7_8:
            "あきに なると はっぱが あかや きいろに そまります。しょくぶつが ふゆの じゅんびを しているんだよと おしえてもらいました。",
          general_child: "秋になると葉っぱが赤や黄色に変わりました。ふしぎだな！",
          pageVisualRole: "emotional_closeup",
          imagePromptTemplate:
            "Emotional close-up of the child holding a bright red maple leaf up to the sun, examining it with wonder. Autumn colors surround — red, orange, golden yellow leaves everywhere. A tiny glowing sun motif shines warmly through the leaf. Watercolor picture book style, autumn wonder close-up, warm autumn light, rich but uncluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark.",
        }),
        buildAgeSpecificPage({
          textTemplate: "冬は雪が降ってきた！四季を通して自然は変わるんだね。{parentMessage}",
          baby_toddler: "ゆき！しろい！さむい！{parentMessage}",
          preschool_3_4:
            "ふゆは ゆきが ふってきた！しきを とおして しぜんは かわるんだね。{parentMessage}",
          early_reader_5_6:
            "ふゆに なって ゆきが ふってきました。はる・なつ・あき・ふゆ。いちねん かけて しぜんは おおきく かわるんだね。{parentMessage}",
          early_elementary_7_8:
            "ふゆに なって ゆきが ふってきました。いちねんで よっつの きせつが めぐります。しぜんは まいとし この たびを くりかえしているんだね。{parentMessage}",
          general_child:
            "ふゆは ゆきが ふってきた！しきを とおして しぜんは かわるんだね。{parentMessage}",
          pageVisualRole: "quiet_ending",
          imagePromptTemplate:
            "Wide quiet ending shot of the child standing in a gently snowing winter scene, arms out to catch snowflakes. A tiny glowing sun motif peeks through the grey clouds. Four small seasonal vignettes — spring, summer, autumn, winter — float around the child like memories. Soft cool winter light. Watercolor picture book style, peaceful seasonal journey ending, rich but not cluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark.",
        }),
      ],
    },
  },
  "fixed-learning-shapes": {
    name: "かたちを さがそう",
    description: "丸・四角・三角…身のまわりにかくれたかたちを探す、形の探索絵本",
    icon: "🔷",
    categoryGroupId: "learning",
    subcategoryId: "shapes",
    parentIntent: "楽しく学んでほしい",
    recommendedAgeMin: 1,
    recommendedAgeMax: 5,
    requiredInputs: ["childName"],
    optionalInputs: ["parentMessage"],
    themeTags: ["shapes", "learning", "discovery", "environment"],
    creationMode: "fixed_template",
    priceTier: "ume",
    storyCostLevel: "none",
    sampleImageUrl: "/images/templates/fixed-learning-shapes.webp",
    sampleImageAlt: "身のまわりの形を探す子どもの絵本イメージ",
    visualDirection:
      "Shape-finding adventure in everyday environments, rainbow star motifs as shape-found celebration markers, each page discovering a different shape.",
    order: 74,
    active: true,
    systemPrompt: "固定テンプレートを使って、かたちを楽しく学ぶ絵本を作ります。",
    fixedStory: {
      previewImageUrl: "/images/templates/fixed-learning-shapes.webp",
      titleTemplate: "{childName}の かたちさがし",
      coverImagePromptTemplate:
        withFixedImagePromptSafety("Picture book cover illustration: a joyful child with a magnifying glass searching for shapes in a park — circle sun, square window, triangle roof, diamond kite — each shape highlighted with a rainbow star motif nearby, playful shape-finding adventure mood, soft watercolor style, rounded child-safe composition, rich but not cluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark."),
      titleSpreadTextTemplate: "まるや しかく、どこにある？",
      openingNarrationTemplate:
        "きょう {childName}は かたちを さがす たんけんに でかけました。まる、しかく、さんかく。にじいろの ほしが かたちを みつけると ひかります。",
      pages: [
        buildAgeSpecificPage({
          textTemplate: "{childName}は丸いものをさがしました。タイヤも時計も丸い！",
          baby_toddler: "まる！タイヤ まる！おかね まる！",
          preschool_3_4:
            "{childName}は まるい ものを さがしました。タイヤも とけいも まるい！",
          early_reader_5_6:
            "{childName}は まるい ものを さがしました。タイヤ、とけい、ボール、おつき さまも まるい！まるは どこにでも あります。",
          early_elementary_7_8:
            "{childName}は まるい ものを さがしました。タイヤ、ボール、おつきさま、コイン。まるは ころころ うごけて、おわりと はじまりが ないかたちです。",
          general_child: "{childName}は丸いものをさがしました。タイヤも時計も丸い！",
          pageVisualRole: "opening_establishing",
          imagePromptTemplate:
            "Establishing wide shot of a neighborhood street with a child using a magnifying glass to examine round objects — a bicycle wheel, a round clock on a wall, a ball. Rainbow star motifs glow near each discovered circle. Bright cheerful day. Watercolor picture book style, enthusiastic shape-hunting learning mood, rich but uncluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark.",
        }),
        buildAgeSpecificPage({
          textTemplate: "四角い窓、四角い本、四角いブロック！{childName}は次々見つけました。",
          baby_toddler: "しかく、しかく！まど しかく！",
          preschool_3_4:
            "しかくい まど、しかくい ほん、しかくい ブロック！{childName}は つぎつぎ みつけました。",
          early_reader_5_6:
            "しかくい まど、ほん、ブロック、はこ。{childName}は つぎつぎ みつけました。しかくは まっすぐな かたちです。",
          early_elementary_7_8:
            "しかくい まど、ほん、ブロック、たてもの。しかくは しっかりと してていて、ものを ならべたり つんだりしやすい かたちです。",
          general_child: "四角い窓、四角い本、四角いブロック！{childName}は次々見つけました。",
          pageVisualRole: "discovery",
          imagePromptTemplate:
            "Discovery medium shot of the child in a cozy room, discovering square shapes everywhere — square windows, square picture frames, square building blocks stacked in a tower. Rainbow star motifs glow near each found square. The child points with excitement. Warm indoor light. Watercolor picture book style, joyful shape discovery mood, rich but uncluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark.",
        }),
        buildAgeSpecificPage({
          textTemplate: "{childName}は三角形のお山と屋根を見つけました！",
          baby_toddler: "やま さんかく！やね さんかく！",
          preschool_3_4:
            "{childName}は さんかくの おやまと やねを みつけました！",
          early_reader_5_6:
            "{childName}は さんかくの おやまと やねを みつけました。さんかくは とがっていて、うえに のびていく かたちです。",
          early_elementary_7_8:
            "{childName}は さんかくの おやまと やねを みつけました。おにぎりも さんかく、ピザの きれも さんかく。さんかくは しぜんにも まちにも たくさん あります。",
          general_child: "{childName}は三角形のお山と屋根を見つけました！",
          pageVisualRole: "emotional_closeup",
          imagePromptTemplate:
            "Emotional close-up of the child looking at a triangular mountain in the distance while pointing at a triangular rooftop in the foreground. Both shapes are highlighted with rainbow star motifs. The child's face shows excited recognition. Warm outdoor light. Watercolor picture book style, eureka shape recognition close-up, rich but uncluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark.",
        }),
        buildAgeSpecificPage({
          textTemplate: "かたちを知ると、世界がもっとよく見えてくる。{parentMessage}",
          baby_toddler: "かたち みつけた！たのしかった！{parentMessage}",
          preschool_3_4:
            "かたちを しると、せかいが もっと よく みえてくる。{parentMessage}",
          early_reader_5_6:
            "かたちを しると、せかいの なかに かくれた パターンが みえてきます。{childName}は かたちさがしが だいすきに なりました。{parentMessage}",
          early_elementary_7_8:
            "かたちを しると、せかいの しくみが すこしずつ わかってきます。まる、しかく、さんかく。まわりのものが ぜんぶ かたちで できているんだね。{parentMessage}",
          general_child:
            "かたちを しると、せかいが もっと よく みえてくる。{parentMessage}",
          pageVisualRole: "quiet_ending",
          imagePromptTemplate:
            "Wide quiet ending shot of the child sitting under a tree, contentedly sketching shapes in a notebook. Around them, shapes glow softly in the environment — round sun, square house, triangular mountain. Rainbow star motifs float gently near each shape. Warm golden afternoon light. Watercolor picture book style, peaceful shape-learning celebration ending, rich but not cluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark.",
        }),
      ],
    },
  },
  "fixed-world-magical-forest": {
    name: "まほうの もり",
    description: "光り輝く魔法の森と妖精の世界へ迷い込む、不思議な冒険固定テンプレート",
    icon: "🌿",
    categoryGroupId: "imagination",
    subcategoryId: "enchanted-nature",
    parentIntent: "自由に想像して、ワクワクしてほしい",
    recommendedAgeMin: 2,
    recommendedAgeMax: 8,
    requiredInputs: ["childName"],
    optionalInputs: ["parentMessage"],
    themeTags: ["fantasy", "forest", "fairy", "magic"],
    creationMode: "fixed_template",
    priceTier: "ume",
    storyCostLevel: "none",
    sampleImageUrl: "/images/templates/fixed-world-magical-forest.webp",
    sampleImageAlt: "光り輝く魔法の森で妖精と出会う子どもの絵本イメージ",
    visualDirection:
      "Enchanted forest mood with luminous glowing light particles, tiny fairies, rainbow-shimmer ponds, and soft magical atmosphere throughout.",
    order: 80,
    active: true,
    systemPrompt: "固定テンプレートを使って、光り輝く魔法の森の大冒険絵本を作ります。",
    fixedStory: {
      previewImageUrl: "/images/templates/fixed-world-magical-forest.webp",
      titleTemplate: "{childName}と まほうの もりのぼうけん",
      coverImagePromptTemplate:
        withFixedImagePromptSafety("Picture book cover illustration: a joyful child standing at the glowing entrance of an enchanted forest, tiny sparkling light particles (magical dust) floating all around, a small glowing fairy peeking from behind a luminous leaf, soft rainbow light filtering through ancient trees, magical wonder mood, soft watercolor style, rounded child-safe composition, rich but not cluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark."),
      titleSpreadTextTemplate: "まほうの もりへ ようこそ",
      openingNarrationTemplate:
        "あるひ、{childName}は きんいろの ひかりに みちびかれて、ふしぎな もりの いりぐちに たどりつきました。まほうのちりが きらきら と ひかっています。",
      pages: [
        buildAgeSpecificPage({
          textTemplate: "{childName}はきらきら光る森の入り口に立ちました。まほうのちりがふわふわと舞っています。",
          baby_toddler: "きらきら もり、わくわく。",
          preschool_3_4:
            "{childName}は きらきら ひかる もりの いりぐちに たちました。まほうのちりが ふわふわ まっています。",
          early_reader_5_6:
            "{childName}は きらきら ひかる もりの いりぐちに たちました。まほうのちりが ふわふわ まっていて、なんだか ふしぎな きぶんです。",
          early_elementary_7_8:
            "{childName}は きらきら ひかる もりの いりぐちに たちました。まほうのちりが ふわふわ まっていて、このさきには どんな ふしぎが まっているのか、むねが どきどきしました。",
          general_child: "{childName}はきらきら光る森の入り口に立ちました。まほうのちりがふわふわと舞っています。",
          pageVisualRole: "opening_establishing",
          imagePromptTemplate:
            "Establishing wide shot of a glowing enchanted forest entrance. Towering ancient trees arch overhead with bioluminescent moss and tiny sparkling light particles (magical dust) drifting through golden air. A small child stands at the threshold with wide eyes of wonder, one hand reaching toward a floating light particle. Soft rainbow light filters through the canopy. Watercolor picture book style, luminous magical lighting, rich but uncluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark.",
        }),
        buildAgeSpecificPage({
          textTemplate: "小さな妖精が{childName}に話しかけてきました。「いっしょに あそぼう！」",
          baby_toddler: "ようせい、こんにちは！",
          preschool_3_4:
            "ちいさな ようせいが {childName}に はなしかけて きました。「いっしょに あそぼう！」",
          early_reader_5_6:
            "ちいさな ようせいが {childName}の まえに あらわれました。「ここは まほうの もり。いっしょに あそぼう！」と にっこり わらいました。",
          early_elementary_7_8:
            "ちいさな ようせいが {childName}の まえに あらわれました。「ここは まほうの もり。まほうのちりが ひかるときは、だれかが たのしいことを おもいえがいて いる しるしなんだよ」と おしえてくれました。",
          general_child: "小さな妖精が{childName}に話しかけてきました。「いっしょに あそぼう！」",
          pageVisualRole: "discovery",
          imagePromptTemplate:
            "Discovery medium shot of a tiny glowing fairy hovering at eye level with the child in the enchanted forest. The fairy has soft luminous wings and a friendly smile, surrounded by drifting magical dust particles. The child reaches out a hand with delight. Mossy logs and glowing mushrooms frame the scene. Watercolor picture book style, warm magical encounter mood, rich but uncluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark.",
        }),
        buildAgeSpecificPage({
          textTemplate: "虹色に輝く泉を見つけました。まほうのちりがキラキラと水面に光っています。",
          baby_toddler: "にじいろ いずみ、きらきら！",
          preschool_3_4:
            "にじいろに かがやく いずみを みつけました。まほうのちりが きらきら と みなもに ひかっています。",
          early_reader_5_6:
            "にじいろに かがやく いずみを みつけました。まほうのちりが きらきら と みなもに ひかって、まるで ほしが おちてきたみたいです。",
          early_elementary_7_8:
            "にじいろに かがやく いずみを みつけました。まほうのちりが きらきら みなもに ひかって、{childName}はそのうつくしさに しばらく うごけなくなってしまいました。",
          general_child: "虹色に輝く泉を見つけました。まほうのちりがキラキラと水面に光っています。",
          pageVisualRole: "emotional_closeup",
          imagePromptTemplate:
            "Emotional close-up of a shimmering rainbow-colored pond deep in the enchanted forest. The water's surface glows with prismatic light reflections and magical dust particles dancing above it. The child kneels at the edge, face reflecting rainbow colors, expression full of awe and joy. A tiny fairy sits on a mossy stone nearby. Watercolor picture book style, luminous magical lighting close-up, enchanting atmosphere, rich but uncluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark.",
        }),
        buildAgeSpecificPage({
          textTemplate: "{parentMessage}",
          baby_toddler: "{parentMessage}",
          preschool_3_4:
            "もりに さようなら。「またいつか、まほうの もりへ あそびに きてね、{childName}。」",
          early_reader_5_6:
            "{childName}は もりを あとに しました。「またいつか、まほうの もりへ あそびに きてね」と ようせいが てを ふっています。{parentMessage}",
          early_elementary_7_8:
            "{childName}は もりを あとに しました。まほうのちりが おみやげみたいに てのひらに のこっています。「またいつか、まほうの もりへ あそびに きてね」と ようせいの こえが きこえました。{parentMessage}",
          general_child:
            "またいつか、まほうの もりへ あそびに きてね、{childName}。{parentMessage}",
          pageVisualRole: "quiet_ending",
          imagePromptTemplate:
            "Wide quiet ending shot of the child walking back along a glowing forest path, waving goodbye to a tiny fairy hovering at the treeline. Magical dust particles drift around the departing figure. Warm golden light spills from the forest canopy onto the path. The mood is tender and hopeful, inviting a return someday. Watercolor picture book style, gentle farewell composition, enchanted fantasy mood, luminous magical lighting, rich but not cluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark.",
        }),
      ],
    },
  },
  "fixed-world-underwater": {
    name: "うみの そこへ",
    description: "海の底の神秘的な世界へ潜る、カラフルな冒険固定テンプレート",
    icon: "🐠",
    categoryGroupId: "imagination",
    subcategoryId: "ocean-adventure",
    parentIntent: "自由に想像して、ワクワクしてほしい",
    recommendedAgeMin: 2,
    recommendedAgeMax: 8,
    requiredInputs: ["childName"],
    optionalInputs: ["parentMessage"],
    themeTags: ["fantasy", "ocean", "fish", "underwater"],
    creationMode: "fixed_template",
    priceTier: "ume",
    storyCostLevel: "none",
    sampleImageUrl: "/images/templates/fixed-world-underwater.webp",
    sampleImageAlt: "海の底でカラフルな魚と泳ぐ子どもの絵本イメージ",
    visualDirection:
      "Underwater ocean adventure with colorful tropical fish, glowing coral reefs, shimmering light rays from above, and tiny bubble motif throughout.",
    order: 81,
    active: true,
    systemPrompt: "固定テンプレートを使って、海の底の神秘的な大冒険絵本を作ります。",
    fixedStory: {
      previewImageUrl: "/images/templates/fixed-world-underwater.webp",
      titleTemplate: "{childName}と うみの そこの ぼうけん",
      coverImagePromptTemplate:
        withFixedImagePromptSafety("Picture book cover illustration: a joyful child in underwater gear surrounded by colorful tropical fish and glowing coral, soft light rays filtering down from above, tiny bubbles rising all around, vibrant yet gentle ocean mood, soft watercolor style, rounded child-safe composition, rich but not cluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark."),
      titleSpreadTextTemplate: "うみの そこへ もぐろう",
      openingNarrationTemplate:
        "あるひ、{childName}は うみの いりぐちに やってきました。なみの むこうに、ふしぎな せかいが まっています。ぷくぷくと あわが のぼってきます。",
      pages: [
        buildAgeSpecificPage({
          textTemplate: "{childName}は波打ち際に立ってドキドキしました。海の底には何があるのかな。",
          baby_toddler: "うみ、どきどき。ぷくぷく。",
          preschool_3_4:
            "{childName}は なみうちぎわに たって どきどき しました。うみの そこには なにが あるのかな。",
          early_reader_5_6:
            "{childName}は なみうちぎわに たって どきどき しました。うみの そこには どんな ふしぎが まっているのか、はやく しりたくて たまりません。",
          early_elementary_7_8:
            "{childName}は なみうちぎわに たって どきどき しました。ぷくぷくと あわが うかんできて、うみの そこから なにかが よんでいる きがしました。",
          general_child: "{childName}は波打ち際に立ってドキドキしました。海の底には何があるのかな。",
          pageVisualRole: "opening_establishing",
          imagePromptTemplate:
            "Establishing wide shot of a child standing at the ocean's edge, turquoise waves lapping gently at their feet, warm sunlight sparkling on the water surface. Colorful coral shapes are faintly visible through the clear shallow water. Tiny bubbles rise from below. The child looks out to sea with bright curious eyes. Watercolor picture book style, inviting ocean adventure mood, luminous magical lighting, rich but uncluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark.",
        }),
        buildAgeSpecificPage({
          textTemplate: "カラフルな魚の群れの中を{childName}は泳ぎました。ぷくぷくとあわがのぼります。",
          baby_toddler: "おさかな いっぱい、わーい！",
          preschool_3_4:
            "カラフルな さかなの むれの なかを {childName}は およぎました。ぷくぷくと あわが のぼります。",
          early_reader_5_6:
            "カラフルな さかなの むれが {childName}の まわりを ぐるぐる およぎました。あかや きいろ、みどりの さかなたちに かこまれて、ぷくぷく あわが のぼります。",
          early_elementary_7_8:
            "カラフルな さかなの むれが {childName}の まわりを ぐるぐる およぎました。まるで にじの なかを おさんぽしているみたいで、ぷくぷく あわが のぼるたびに うれしくなります。",
          general_child: "カラフルな魚の群れの中を{childName}は泳ぎました。ぷくぷくとあわがのぼります。",
          pageVisualRole: "discovery",
          imagePromptTemplate:
            "Discovery medium shot of the child swimming underwater surrounded by a swirling school of brightly colored tropical fish. Soft blue-green ocean light filters from above. Tiny bubbles rise past the child's smiling face. Gently swaying sea plants frame the sides. Watercolor picture book style, joyful underwater adventure mood, luminous magical lighting, rich but uncluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark.",
        }),
        buildAgeSpecificPage({
          textTemplate: "キラキラ輝く珊瑚礁と光のアップ。ぷくぷくあわがそっとのぼります。",
          baby_toddler: "さんご きらきら、きれい！",
          preschool_3_4:
            "きらきら かがやく さんごしょうが ありました。ひかりが ゆらゆら して、ぷくぷく あわが そっと のぼります。",
          early_reader_5_6:
            "きらきら かがやく さんごしょうが あらわれました。ひかりが ゆらゆら ゆれて、ぷくぷく あわが のぼるたびに {childName}の むねも ぴかぴか しました。",
          early_elementary_7_8:
            "きらきら かがやく さんごしょうが あらわれました。うみの そこから ひかりが かさなりあって、こんなに うつくしいけしきが あるなんて、{childName}は しらなかったと おもいました。",
          general_child: "キラキラ輝く珊瑚礁と光のアップ。ぷくぷくあわがそっとのぼります。",
          pageVisualRole: "emotional_closeup",
          imagePromptTemplate:
            "Emotional close-up of a vibrant coral reef scene with the child hovering close to fan corals and sea anemones glowing in prismatic colors. Light rays from the surface create shimmering caustic patterns across the coral. Tiny bubbles drift upward. The child's eyes are wide with wonder. Watercolor picture book style, luminous underwater magical lighting, close-up enchanted mood, rich but uncluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark.",
        }),
        buildAgeSpecificPage({
          textTemplate: "{childName}は海面へ浮上して、海の底を振り返りました。{parentMessage}",
          baby_toddler: "うかんで、ばいばい。{parentMessage}",
          preschool_3_4:
            "{childName}は かいめんへ うかびあがり、うみの そこを ふりかえりました。{parentMessage}",
          early_reader_5_6:
            "{childName}は かいめんへ うかびあがりました。うみの そこの さかなたちが みえなくなっても、ぷくぷく あわは まだ のぼってきます。{parentMessage}",
          early_elementary_7_8:
            "{childName}は かいめんへ うかびあがりました。ふりかえると、うみの そこに きらきらの ひかりが まだ ゆれています。つぎは どんな ふしぎに であえるかな。{parentMessage}",
          general_child:
            "{childName}は海面へ浮上して、うみの そこを ふりかえりました。{parentMessage}",
          pageVisualRole: "quiet_ending",
          imagePromptTemplate:
            "Wide quiet ending shot of the child breaking through the ocean surface back into sunlight, looking down through clear water at the colorful reef far below. Sunlight sparkles on the waves above. Tiny bubbles still rise from the depths. The child smiles with happy memories. Watercolor picture book style, gentle hopeful ending, luminous ocean light, enchanted fantasy mood, rich but not cluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark.",
        }),
      ],
    },
  },
  "fixed-world-dinosaurs": {
    name: "きょうりゅうの くに",
    description: "恐竜たちが暮らす太古の世界へタイムスリップ！やさしい恐竜との出会い固定テンプレート",
    icon: "🦕",
    categoryGroupId: "imagination",
    subcategoryId: "prehistoric-adventure",
    parentIntent: "自由に想像して、ワクワクしてほしい",
    recommendedAgeMin: 2,
    recommendedAgeMax: 8,
    requiredInputs: ["childName"],
    optionalInputs: ["parentMessage"],
    themeTags: ["fantasy", "dinosaur", "adventure", "prehistoric"],
    creationMode: "fixed_template",
    priceTier: "ume",
    storyCostLevel: "none",
    sampleImageUrl: "/images/templates/fixed-world-dinosaurs.webp",
    sampleImageAlt: "恐竜たちと遊ぶ子どもの絵本イメージ",
    visualDirection:
      "Lush prehistoric jungle adventure with gentle giant dinosaurs, oversized tropical plants, dappled warm sunlight, and tiny green footprint motif throughout.",
    order: 82,
    active: true,
    systemPrompt: "固定テンプレートを使って、恐竜の世界の大冒険絵本を作ります。",
    fixedStory: {
      previewImageUrl: "/images/templates/fixed-world-dinosaurs.webp",
      titleTemplate: "{childName}と きょうりゅうの くに",
      coverImagePromptTemplate:
        withFixedImagePromptSafety("Picture book cover illustration: a joyful child standing beside a gentle giant brachiosaurus in a lush prehistoric jungle, large fern leaves and colorful flowers framing the scene, a tiny green dinosaur footprint motif on the ground, warm golden light through ancient trees, safe friendly adventure mood, soft watercolor style, rounded child-safe composition, rich but not cluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark."),
      titleSpreadTextTemplate: "きょうりゅうの くにへ しゅっぱつ！",
      openingNarrationTemplate:
        "あるひ、{childName}は おおきな あしあとを みつけました。きょうりゅうのあしあとです！このさきには どんな きょうりゅうが いるのかな。",
      pages: [
        buildAgeSpecificPage({
          textTemplate: "{childName}は巨大な足跡を発見しました。きょうりゅうのあしあとです！",
          baby_toddler: "おおきい あしあと、びっくり！",
          preschool_3_4:
            "{childName}は きょだいな あしあとを みつけました。きょうりゅうの あしあとです！",
          early_reader_5_6:
            "{childName}は きょだいな あしあとを みつけました。きょうりゅうの あしあとです！このさきを すすむと、どんな きょうりゅうに あえるのかな。",
          early_elementary_7_8:
            "{childName}は きょだいな あしあとを みつけました。みどりいろの きょうりゅうのあしあとが、おくの もりへと つづいています。このぼうけんは はじまったばかりです。",
          general_child: "{childName}は巨大な足跡を発見しました。きょうりゅうのあしあとです！",
          pageVisualRole: "opening_establishing",
          imagePromptTemplate:
            "Establishing wide shot of a lush prehistoric jungle with enormous fern fronds and towering ancient trees. A child stands beside a massive dinosaur footprint in soft earth, looking ahead with excited curiosity. Tiny green footprint motifs lead deeper into the jungle. Dappled warm sunlight filters through prehistoric canopy. Watercolor picture book style, adventurous yet safe prehistoric mood, rich but uncluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark.",
        }),
        buildAgeSpecificPage({
          textTemplate: "草食恐竜のブラキオサウルスが{childName}に首をのばして挨拶しました。",
          baby_toddler: "きょうりゅう、おおきい！なかよし！",
          preschool_3_4:
            "くさを たべている おおきな きょうりゅうが、{childName}に くびを のばして あいさつ しました。",
          early_reader_5_6:
            "くさを たべている ブラキオサウルスが、{childName}に むかって そっと くびを のばしました。おおきいのに、とっても やさしそうです。",
          early_elementary_7_8:
            "ブラキオサウルスが {childName}の そばに そっと くびを さしのべました。おおきな めで じっと みつめられて、{childName}は ゆっくり てを のばしました。やさしい きょうりゅうです。",
          general_child: "草食恐竜のブラキオサウルスが{childName}に首をのばして挨拶しました。",
          pageVisualRole: "discovery",
          imagePromptTemplate:
            "Discovery medium shot of a gentle brachiosaurus lowering its long neck to greet the child in a prehistoric clearing. The child reaches up with a happy smile. Lush prehistoric foliage frames the scene. A tiny green footprint motif appears in the foreground soil. Warm golden prehistoric sunlight. Watercolor picture book style, gentle friendly encounter mood, rich but uncluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark.",
        }),
        buildAgeSpecificPage({
          textTemplate: "きょうりゅうの子どもと{childName}は一緒に走って遊びました！",
          baby_toddler: "いっしょに はしろう！たのしい！",
          preschool_3_4:
            "きょうりゅうの こどもと {childName}は いっしょに はしって あそびました！",
          early_reader_5_6:
            "ちいさな きょうりゅうの こどもが あらわれました。{childName}と いっしょに げんきよく はしりまわって、たのしくて しかたありません。",
          early_elementary_7_8:
            "ちいさな きょうりゅうの こどもが とびだしてきました。{childName}も いっしょに げんきよく かけまわって、きょうりゅうのあしあとが どんどん ふえていきました。",
          general_child: "きょうりゅうの子どもと{childName}は一緒に走って遊びました！",
          pageVisualRole: "emotional_closeup",
          imagePromptTemplate:
            "Emotional close-up of the child playing alongside a small friendly young dinosaur in a prehistoric meadow. Both are mid-run with joyful expressions. Tiny green footprints trail behind them both. Warm dappled light. Watercolor picture book style, energetic joyful adventure close-up, enchanted prehistoric mood, rich but uncluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark.",
        }),
        buildAgeSpecificPage({
          textTemplate: "{childName}は恐竜たちに手を振って帰り道につきました。{parentMessage}",
          baby_toddler: "きょうりゅう、またね！{parentMessage}",
          preschool_3_4:
            "{childName}は きょうりゅうたちに てを ふって かえりみちに つきました。{parentMessage}",
          early_reader_5_6:
            "{childName}は きょうりゅうたちに てを ふりました。きょうりゅうのあしあとが おみやげみたいに こころに のこっています。{parentMessage}",
          early_elementary_7_8:
            "{childName}は きょうりゅうたちに てを ふりました。またいつか、あの おおきくて やさしい きょうりゅうたちに あいに きたいな。{parentMessage}",
          general_child:
            "{childName}は きょうりゅうたちに てを ふって かえりみちに つきました。{parentMessage}",
          pageVisualRole: "quiet_ending",
          imagePromptTemplate:
            "Wide quiet ending shot of the child walking away along a prehistoric jungle path, waving back at a gentle brachiosaurus and a small young dinosaur watching from the treeline. Tiny green footprints dot the path. Warm golden light fills the prehistoric clearing. Watercolor picture book style, gentle farewell composition, enchanted prehistoric mood, rich but not cluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark.",
        }),
      ],
    },
  },
  "fixed-world-candy-land": {
    name: "おかしの くに",
    description: "キャンディの木・チョコレートの川・クッキーのお城。甘い夢の国の大冒険固定テンプレート",
    icon: "🍭",
    categoryGroupId: "imagination",
    subcategoryId: "sweets-fantasy",
    parentIntent: "自由に想像して、ワクワクしてほしい",
    recommendedAgeMin: 2,
    recommendedAgeMax: 8,
    requiredInputs: ["childName"],
    optionalInputs: ["parentMessage"],
    themeTags: ["fantasy", "candy", "sweets", "dream-world"],
    creationMode: "fixed_template",
    priceTier: "ume",
    storyCostLevel: "none",
    sampleImageUrl: "/images/templates/fixed-world-candy-land.webp",
    sampleImageAlt: "おかしの国でキャンディのお城を探検する子どもの絵本イメージ",
    visualDirection:
      "Whimsical candy kingdom with pastel colors, candy-cane trees, chocolate rivers, marshmallow hills, cookie castle, and a small pink candy motif throughout.",
    order: 83,
    active: true,
    systemPrompt: "固定テンプレートを使って、甘くてかわいいおかしの国の大冒険絵本を作ります。",
    fixedStory: {
      previewImageUrl: "/images/templates/fixed-world-candy-land.webp",
      titleTemplate: "{childName}と おかしの くにの ぼうけん",
      coverImagePromptTemplate:
        withFixedImagePromptSafety("Picture book cover illustration: a joyful child standing at a grand candy-cane gate entrance to a colorful candy kingdom, lollipop trees and gumdrop bushes all around, a chocolate river glittering in the background, a small pink candy motif at the gate, sweet dreamy mood, soft watercolor style, rounded child-safe composition, rich but not cluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark."),
      titleSpreadTextTemplate: "おかしの くにへ ようこそ",
      openingNarrationTemplate:
        "あるひ、{childName}の まえに あまい においの する もんが あらわれました。ここが おかしの くにの いりぐちです！",
      pages: [
        buildAgeSpecificPage({
          textTemplate: "{childName}はキャンディの門の前に立ちました。あまいにおいがします。",
          baby_toddler: "あまい においー！きゃんでぃ！",
          preschool_3_4:
            "{childName}は キャンディの もんの まえに たちました。あまい においが します。",
          early_reader_5_6:
            "{childName}は キャンディの もんの まえに たちました。あまくて いいにおいが して、むこうには カラフルな きが たちならんでいます。",
          early_elementary_7_8:
            "{childName}は キャンディの もんの まえに たちました。あまくて いいにおいが して、キャンディでできた もんを くぐると、おかしの くにの ぼうけんが はじまります。",
          general_child: "{childName}はキャンディの門の前に立ちました。あまいにおいがします。",
          pageVisualRole: "opening_establishing",
          imagePromptTemplate:
            "Establishing wide shot of a whimsical candy kingdom entrance with towering candy-cane gate pillars, lollipop trees lining the path, gumdrop bushes in pastel pinks and purples, and a glittering chocolate river in the distance. A child stands at the entrance with sparkling eyes of delight. A small pink candy motif rests near the gate post. Watercolor picture book style, sweet dreamy mood, luminous pastel lighting, rich but uncluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark.",
        }),
        buildAgeSpecificPage({
          textTemplate: "チョコレートの川とマシュマロの丘！{childName}はびっくりしました。",
          baby_toddler: "チョコかわ、ふわふわ！",
          preschool_3_4:
            "チョコレートの かわと マシュマロの おかが ありました！{childName}は びっくりしました。",
          early_reader_5_6:
            "チョコレートの かわが ゆっくり ながれていて、マシュマロの おかが ふわふわ ならんでいます。{childName}は めを まるくしました。",
          early_elementary_7_8:
            "チョコレートの かわが きらきら ながれていて、マシュマロの おかが ふわふわ かぜに ゆれています。{childName}は こんなに すてきな けしきを みたことが ありませんでした。",
          general_child: "チョコレートの川とマシュマロの丘！{childName}はびっくりしました。",
          pageVisualRole: "discovery",
          imagePromptTemplate:
            "Discovery medium shot of a flowing chocolate river with glossy dark-brown waves and whipped-cream foam banks. Fluffy marshmallow hills roll in the background. The child stands at the riverside with arms spread wide in amazement. A small pink candy motif floats on the chocolate surface. Cotton candy clouds drift overhead. Watercolor picture book style, sweet wonder mood, luminous pastel lighting, rich but uncluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark.",
        }),
        buildAgeSpecificPage({
          textTemplate: "クッキーのお城でおかしの王様に会いました！",
          baby_toddler: "おうさま、こんにちは！",
          preschool_3_4:
            "クッキーの おしろで おかしの おうさまに あいました！",
          early_reader_5_6:
            "クッキーで できた おしろで、あまいおかしの おうさまに あいました。おうさまは にっこりして {childName}を むかえてくれました。",
          early_elementary_7_8:
            "クッキーで できた おしろの まんなかで、おかしの おうさまが てを ふっていました。「よく きてくれました、{childName}！このおかしのくには みんなが たのしく すごせる ばしょですよ」とにっこりわらいました。",
          general_child: "クッキーのお城でおかしの王様に会いました！",
          pageVisualRole: "emotional_closeup",
          imagePromptTemplate:
            "Emotional close-up of the child meeting a jolly candy kingdom ruler inside a grand cookie castle throne room. The ruler wears a frosting-decorated crown and has a warm friendly smile. A small pink candy motif decorates the throne armrest. The child's face shows pure delight. Watercolor picture book style, warm friendly royal encounter, sweet dreamy close-up, luminous pastel lighting, rich but uncluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark.",
        }),
        buildAgeSpecificPage({
          textTemplate: "{childName}はキャンディのおみやげを持って帰りました。{parentMessage}",
          baby_toddler: "キャンディ もって かえろう！{parentMessage}",
          preschool_3_4:
            "{childName}は キャンディの おみやげを もって かえりました。{parentMessage}",
          early_reader_5_6:
            "{childName}は キャンディの おみやげを もって かえりました。あのあまい においを、ずっと おぼえていたいな。{parentMessage}",
          early_elementary_7_8:
            "{childName}は ピンクの キャンディを そっと てのひらに のせて、おかしのくにを あとに しました。また いつか かならず もどってこようと こころに きめました。{parentMessage}",
          general_child:
            "{childName}は キャンディの おみやげを もって かえりました。{parentMessage}",
          pageVisualRole: "quiet_ending",
          imagePromptTemplate:
            "Wide quiet ending shot of the child walking home along a candy-cane lined path, holding a small pink candy in their outstretched hand, glancing back at the cookie castle in the distance with a happy smile. A trail of small pink candy motifs dots the path. Warm pastel evening light. Watercolor picture book style, sweet gentle farewell composition, enchanted fantasy mood, rich but not cluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark.",
        }),
      ],
    },
  },
  "fixed-world-cloud-castle": {
    name: "くもの うえの おしろ",
    description: "雲の上にある不思議なお城と空からの絶景。白い羽が舞う幻想的な固定テンプレート",
    icon: "☁️",
    categoryGroupId: "imagination",
    subcategoryId: "sky-adventure",
    parentIntent: "自由に想像して、ワクワクしてほしい",
    recommendedAgeMin: 2,
    recommendedAgeMax: 8,
    requiredInputs: ["childName"],
    optionalInputs: ["parentMessage"],
    themeTags: ["fantasy", "clouds", "castle", "sky"],
    creationMode: "fixed_template",
    priceTier: "ume",
    storyCostLevel: "none",
    sampleImageUrl: "/images/templates/fixed-world-cloud-castle.webp",
    sampleImageAlt: "雲の上のお城を探検する子どもの絵本イメージ",
    visualDirection:
      "Dreamy sky adventure with fluffy white clouds underfoot, a luminous cloud castle, rainbow bridges, and a tiny white feather motif throughout.",
    order: 84,
    active: true,
    systemPrompt: "固定テンプレートを使って、雲の上のお城の大冒険絵本を作ります。",
    fixedStory: {
      previewImageUrl: "/images/templates/fixed-world-cloud-castle.webp",
      titleTemplate: "{childName}と くもの うえの おしろ",
      coverImagePromptTemplate:
        withFixedImagePromptSafety("Picture book cover illustration: a joyful child walking on fluffy white clouds toward a shimmering cloud castle glowing with soft golden and silver light, a tiny white feather motif drifting nearby, a rainbow bridge arching overhead, dreamy sky adventure mood, soft watercolor style, rounded child-safe composition, rich but not cluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark."),
      titleSpreadTextTemplate: "くもの うえを あるいて いこう",
      openingNarrationTemplate:
        "あるひ、{childName}は しろい くもが はしごのように のびているのを みました。のぼっていくと、そこには ふしぎな おしろが ありました。てんしの羽が ふわりと まっています。",
      pages: [
        buildAgeSpecificPage({
          textTemplate: "{childName}は雲の上を歩いてお城へ向かいました。ふわふわです。",
          baby_toddler: "くもの うえ、ふわふわ！",
          preschool_3_4:
            "{childName}は くもの うえを あるいて おしろへ むかいました。ふわふわで きもちいいです。",
          early_reader_5_6:
            "{childName}は くもの うえを ふわふわ あるいて おしろへ むかいました。あしもとが やわらかくて、まるで わたの うえを あるいているみたいです。",
          early_elementary_7_8:
            "{childName}は くもの うえを ふわふわ あるいて おしろへ むかいました。しろい はねが ひらひら まっていて、このみちの むこうに どんな ふしぎが まっているのか たのしみでした。",
          general_child: "{childName}は雲の上を歩いてお城へ向かいました。ふわふわです。",
          pageVisualRole: "opening_establishing",
          imagePromptTemplate:
            "Establishing wide shot of a child walking across fluffy white clouds high in a pastel sky, heading toward a distant luminous cloud castle glowing with soft gold and silver light. A rainbow bridge arches gently. A tiny white feather drifts beside the child. The sky is filled with soft pink and lavender hues. Watercolor picture book style, dreamy sky adventure mood, luminous magical lighting, rich but uncluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark.",
        }),
        buildAgeSpecificPage({
          textTemplate: "雲のお城の中を探検しました。虹の橋と光の部屋がありました。",
          baby_toddler: "にじの はし、きれい！",
          preschool_3_4:
            "くもの おしろの なかを たんけんしました。にじの はしと ひかりの へやが ありました。",
          early_reader_5_6:
            "くもの おしろの なかを たんけんしました。にじの はしを わたると、ひかりでいっぱいの へやに でました。しろい はねが ひらひら まっています。",
          early_elementary_7_8:
            "くもの おしろの なかを たんけんしました。にじの はしを わたると、7しょくの ひかりで かがやく へやに でました。しろい はねが ひとつひとつ やさしく まっていました。",
          general_child: "雲のお城の中を探検しました。虹の橋と光の部屋がありました。",
          pageVisualRole: "discovery",
          imagePromptTemplate:
            "Discovery medium shot inside a luminous cloud castle corridor. A rainbow bridge arches over a misty gap. The child walks across it with arms stretched for balance, smiling with wonder. Light streams through archways of translucent cloud material. A tiny white feather floats beside the child. Watercolor picture book style, magical interior sky adventure mood, luminous rainbow lighting, rich but uncluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark.",
        }),
        buildAgeSpecificPage({
          textTemplate: "{childName}は空から地上の景色を眺めました。なんてきれいなんだろう！",
          baby_toddler: "したのせかい、きれい！",
          preschool_3_4:
            "{childName}は そらから ちじょうの けしきを ながめました。なんて きれいなんだろう！",
          early_reader_5_6:
            "{childName}は おしろの まどから ちじょうの けしきを ながめました。ちいさな まちと みどりの もりが、おもちゃのように みえます。",
          early_elementary_7_8:
            "{childName}は おしろの いちばん たかい まどから ちじょうを みおろしました。まちも、かわも、もりも、ぜんぶが てのひらの なかに のってしまいそうなくらい ちいさく きれいに みえました。",
          general_child: "{childName}は空から地上の景色を眺めました。なんてきれいなんだろう！",
          pageVisualRole: "emotional_closeup",
          imagePromptTemplate:
            "Emotional close-up of the child leaning out from a cloud castle window, gazing down at the beautiful world below. The child's expression is one of pure awe. A tiny white feather floats past the window. Soft golden light surrounds. Watercolor picture book style, breathtaking aerial perspective close-up, luminous magical sky lighting, rich but uncluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark.",
        }),
        buildAgeSpecificPage({
          textTemplate: "{childName}は雲の上から手を振って帰りました。{parentMessage}",
          baby_toddler: "てを ふって、ばいばい！{parentMessage}",
          preschool_3_4:
            "{childName}は くもの うえから てを ふって かえりました。{parentMessage}",
          early_reader_5_6:
            "{childName}は くもの おしろに てを ふって かえりました。しろい はねが ひとつ、てのひらに そっと おちてきました。{parentMessage}",
          early_elementary_7_8:
            "{childName}は くもの おしろに おおきく てを ふって かえりました。しろい はねが そっと おちてきて、これは おしろからの プレゼントだと おもいました。{parentMessage}",
          general_child:
            "{childName}は くもの うえから てを ふって かえりました。{parentMessage}",
          pageVisualRole: "quiet_ending",
          imagePromptTemplate:
            "Wide quiet ending shot of the child descending from the clouds, waving back up at the luminous cloud castle above. A tiny white feather drifts slowly downward. The world below is bathed in soft golden evening light. Watercolor picture book style, gentle farewell composition, enchanted sky fantasy mood, luminous magical lighting, rich but not cluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark.",
        }),
      ],
    },
  },
  "fixed-world-toy-land": {
    name: "おもちゃが うごきだす",
    description: "夜中においておもちゃたちが動き出し秘密のパーティーを開いている！不思議な夜の固定テンプレート",
    icon: "🪆",
    categoryGroupId: "imagination",
    subcategoryId: "toy-adventure",
    parentIntent: "自由に想像して、ワクワクしてほしい",
    recommendedAgeMin: 2,
    recommendedAgeMax: 8,
    requiredInputs: ["childName"],
    optionalInputs: ["parentMessage"],
    themeTags: ["fantasy", "toys", "night", "party"],
    creationMode: "fixed_template",
    priceTier: "ume",
    storyCostLevel: "none",
    sampleImageUrl: "/images/templates/fixed-world-toy-land.webp",
    sampleImageAlt: "夜中におもちゃたちがパーティーをしている絵本イメージ",
    visualDirection:
      "Magical toy room at night with toys coming to life, warm glowing lamp light, colorful festive party atmosphere, and a tiny wind-up key motif throughout.",
    order: 85,
    active: true,
    systemPrompt: "固定テンプレートを使って、おもちゃたちの秘密のパーティー絵本を作ります。",
    fixedStory: {
      previewImageUrl: "/images/templates/fixed-world-toy-land.webp",
      titleTemplate: "{childName}と おもちゃたちの ひみつのパーティー",
      coverImagePromptTemplate:
        withFixedImagePromptSafety("Picture book cover illustration: a child peeking into a cozy toy room at night where toys are dancing and celebrating — a teddy bear, building blocks, a toy train, and a matryoshka doll all animated and joyful — warm golden lamp light glowing, tiny wind-up key motifs on the toys, magical night party mood, soft watercolor style, rounded child-safe composition, rich but not cluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark."),
      titleSpreadTextTemplate: "よなかの おもちゃのパーティー",
      openingNarrationTemplate:
        "よなかに めが さめた {childName}は、へやから なにか おとが きこえることに きがつきました。おもちゃのしるしが ぴかぴか ひかっています。",
      pages: [
        buildAgeSpecificPage({
          textTemplate: "{childName}が夜中に目を覚ますと、部屋のおもちゃが動いていました。",
          baby_toddler: "おもちゃ うごいた！びっくり！",
          preschool_3_4:
            "{childName}が よなかに めを さますと、へやの おもちゃが うごいていました。",
          early_reader_5_6:
            "{childName}が よなかに めを さますと、へやの おもちゃが みんな うごきだしていました。おもちゃのしるしが ぴかぴか ひかっています。",
          early_elementary_7_8:
            "{childName}が よなかに めを さますと、へやの おもちゃが みんな うごきだしていました。くらい へやに おもちゃのしるしが あかるく ひかって、なにかが はじまりそうな よかんがします。",
          general_child: "{childName}が夜中に目を覚ますと、部屋のおもちゃが動いていました。",
          pageVisualRole: "opening_establishing",
          imagePromptTemplate:
            "Establishing wide shot of a cozy toy room at night lit by warm golden lamp glow. Toys are coming to life — a teddy bear waves, building blocks stack themselves, a toy train circles the floor. The child stands in the doorway with a surprised but delighted expression. Tiny wind-up key motifs glow on several toys. Watercolor picture book style, enchanted toy-room night adventure mood, luminous warm lighting, rich but uncluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark.",
        }),
        buildAgeSpecificPage({
          textTemplate: "おもちゃたちが{childName}をパーティーに招待してくれました！",
          baby_toddler: "パーティー、はいって！わーい！",
          preschool_3_4:
            "おもちゃたちが {childName}を パーティーに しょうたいして くれました！",
          early_reader_5_6:
            "おもちゃたちが {childName}に むかって てを ふっています。「いっしょに パーティーを しよう！」と くまのぬいぐるみが よんでいます。",
          early_elementary_7_8:
            "おもちゃたちが {childName}に むかって てを ふっています。「ぼくたちの ひみつのパーティーに ようこそ！」くまのぬいぐるみが うれしそうに よんでいます。おもちゃのしるしが きらきら ひかります。",
          general_child: "おもちゃたちが{childName}をパーティーに招待してくれました！",
          pageVisualRole: "discovery",
          imagePromptTemplate:
            "Discovery medium shot of animated toys welcoming the child into their secret night party. A teddy bear waves with both arms, a matryoshka doll spins joyfully, colorful building blocks form a festive arch. The child steps forward with a big grin. Tiny wind-up key motifs glow on each toy. Warm golden party lighting. Watercolor picture book style, joyful enchanted toy party mood, rich but uncluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark.",
        }),
        buildAgeSpecificPage({
          textTemplate: "{childName}はおもちゃたちと一緒に踊りました！たのしくてたまりません。",
          baby_toddler: "いっしょに おどろう、たのしい！",
          preschool_3_4:
            "{childName}は おもちゃたちと いっしょに おどりました！たのしくて たまりません。",
          early_reader_5_6:
            "{childName}は おもちゃたちと いっしょに おどりました。くまのぬいぐるみと てをつないで、くるくる まわります。たのしくて たまりません！",
          early_elementary_7_8:
            "{childName}は おもちゃたちと いっしょに おどりました。くまのぬいぐるみと てを つないで くるくる まわると、おもちゃのしるしが みんなで きらきら ひかって、へやが まほうのような ひかりで いっぱいになりました。",
          general_child: "{childName}はおもちゃたちと一緒に踊りました！たのしくてたまりません。",
          pageVisualRole: "emotional_closeup",
          imagePromptTemplate:
            "Emotional close-up of the child dancing hand-in-hand with a teddy bear, both spinning with big joyful smiles. Other toys cheer around them. Tiny wind-up key motifs glow on each toy. The room is filled with warm golden magical party light. Watercolor picture book style, intimate joyful dance close-up, enchanted toy party mood, rich but uncluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark.",
        }),
        buildAgeSpecificPage({
          textTemplate: "朝が来て、おもちゃたちは元の場所に戻りました。{parentMessage}",
          baby_toddler: "おはよう、おもちゃ ねんね。{parentMessage}",
          preschool_3_4:
            "あさが きて、おもちゃたちは もとの ばしょに もどりました。{parentMessage}",
          early_reader_5_6:
            "あさが きて、おもちゃたちは そっと もとの ばしょに もどりました。でも おもちゃのしるしが ひとつ、そっと ひかったような きがしました。{parentMessage}",
          early_elementary_7_8:
            "あさが きて、おもちゃたちは そっと もとの ばしょに もどりました。ふつうの おもちゃにもどって いても、{childName}には あのたのしい パーティーが ほんものだったと わかっています。{parentMessage}",
          general_child:
            "あさが きて、おもちゃたちは もとの ばしょに もどりました。{parentMessage}",
          pageVisualRole: "quiet_ending",
          imagePromptTemplate:
            "Wide quiet ending shot of the toy room at dawn with warm morning light streaming through the window. All toys are back in their places — the teddy bear on the shelf, the train on its track, the matryoshka doll on the toy box — but each has a gentle smile. The child stands in the doorway smiling knowingly. A tiny wind-up key motif glints softly on the teddy bear. Watercolor picture book style, tender morning-after composition, enchanted toy fantasy mood, rich but not cluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark.",
        }),
      ],
    },
  },
  "fixed-potty-training": {
    name: "ひとりで トイレ できたよ",
    description: "トイレトレーニングで一人でできた！自信と達成感を育む固定テンプレート絵本",
    icon: "🌈",
    categoryGroupId: "growth-support",
    subcategoryId: "toilet-training",
    parentIntent: "生活習慣を楽しく身につけてほしい",
    recommendedAgeMin: 1,
    recommendedAgeMax: 4,
    requiredInputs: ["childName"],
    optionalInputs: ["parentMessage"],
    themeTags: ["potty", "independence", "milestone", "growth"],
    creationMode: "fixed_template",
    priceTier: "ume",
    storyCostLevel: "none",
    sampleImageUrl: "/images/templates/fixed-potty-training.webp",
    sampleImageAlt: "ひとりでトイレができた子どもの絵本イメージ",
    visualDirection:
      "Bright encouraging home atmosphere with cheerful rainbow motifs celebrating each success, warm supportive mood throughout.",
    order: 90,
    active: true,
    systemPrompt: "固定テンプレートを使って、トイレトレーニング達成を祝う絵本を作ります。",
    fixedStory: {
      previewImageUrl: "/images/templates/fixed-potty-training.webp",
      titleTemplate: "{childName}、ひとりで トイレ できたよ！",
      coverImagePromptTemplate:
        withFixedImagePromptSafety("Picture book cover illustration: a proud beaming child standing in a bright bathroom doorway with arms raised in triumph, a cheerful rainbow arching above them, warm encouraging home atmosphere, soft watercolor style, rounded child-safe composition, rich but not cluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark."),
      titleSpreadTextTemplate: "できた！ひとりで できたよ！",
      openingNarrationTemplate:
        "きょう {childName}は ひとりで トイレに いくれんしゅうを しています。にじが でたら、できたしるしです。",
      pages: [
        buildAgeSpecificPage({
          textTemplate: "{childName}はトイレに行きたくなりました。「いける！いける！」",
          baby_toddler: "トイレ、いく！がんばる！",
          preschool_3_4:
            "{childName}は トイレに いきたく なりました。「いける！いける！」",
          early_reader_5_6:
            "{childName}は おなかに もよおしを かんじました。「いまだ！ひとりで いける！」と こころの なかで つぶやきました。",
          early_elementary_7_8:
            "{childName}は おなかに サインを かんじました。「いまだ！ひとりで トイレに いけるぞ！」と こころを きめました。",
          general_child: "{childName}はトイレに行きたくなりました。「いける！いける！」",
          pageVisualRole: "opening_establishing",
          imagePromptTemplate:
            "Establishing wide shot of a child standing determinedly in a home hallway, looking toward a cheerful bright bathroom with the door open. The child's expression shows concentration and resolve. A tiny rainbow motif glows above the bathroom door. Warm home lighting. Watercolor picture book style, encouraging independent milestone mood, rich but uncluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark.",
        }),
        buildAgeSpecificPage({
          textTemplate: "{childName}は一人でトイレに座りました。「すごい！ちゃんとできてる！」",
          baby_toddler: "すわった！えらい！できてる！",
          preschool_3_4:
            "{childName}は ひとりで トイレに すわりました。「すごい！ちゃんと できてる！」",
          early_reader_5_6:
            "{childName}は ひとりで トイレに すわりました。「わたし、ちゃんと できてる！」と うれしくなりました。",
          early_elementary_7_8:
            "{childName}は ひとりで トイレに すわりました。「ひとりで できてる！」という きもちが、むねの なかで にじのように ひろがりました。",
          general_child: "{childName}は一人でトイレに座りました。「すごい！ちゃんとできてる！」",
          pageVisualRole: "discovery",
          imagePromptTemplate:
            "Discovery medium shot of the child sitting confidently on a child-sized toilet seat in a cheerful bright bathroom, expression focused and proud. A rainbow motif arches gently above on the wall tiles. Warm soft bathroom light. Watercolor picture book style, encouraging self-reliance mood, rich but uncluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark.",
        }),
        buildAgeSpecificPage({
          textTemplate: "できた！{childName}はにじを見つけました。「やったー！！」",
          baby_toddler: "できた！にじ！やったー！！",
          preschool_3_4:
            "できた！{childName}は にじを みつけました。「やったー！！」",
          early_reader_5_6:
            "できた！{childName}は にじを みつけました。ひとりで できたことが うれしくて、「やったー！！」と さけびました。",
          early_elementary_7_8:
            "できた！{childName}は にじを みつけました。ひとりで できたという じかんが、こころの なかで にじのように かがやいています。「やったー！！」",
          general_child: "できた！{childName}はにじを見つけました。「やったー！！」",
          pageVisualRole: "emotional_closeup",
          imagePromptTemplate:
            "Emotional close-up of the child's triumphant face with both fists raised in celebration, a bright rainbow arching behind them. The expression is pure proud joy. Colorful rainbow motifs sparkle around the child. Warm glowing light. Watercolor picture book style, triumphant achievement close-up, rich but uncluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark.",
        }),
        buildAgeSpecificPage({
          textTemplate: "ひとりでできた{childName}はとても輝いています。{parentMessage}",
          baby_toddler: "できた！えらい！すごい！{parentMessage}",
          preschool_3_4:
            "ひとりで できた {childName}は とても かがやいています。{parentMessage}",
          early_reader_5_6:
            "ひとりで できた {childName}は にじのように かがやいています。できることが ひとつ ふえるたびに、{childName}は もっと おおきく なります。{parentMessage}",
          early_elementary_7_8:
            "ひとりで できた {childName}は にじのように かがやいています。ちいさな できた が、おおきな じしんに なっていきます。{parentMessage}",
          general_child:
            "ひとりで できた {childName}は とても かがやいています。{parentMessage}",
          pageVisualRole: "quiet_ending",
          imagePromptTemplate:
            "Wide quiet ending shot of the child standing in the warm home hallway, hands on hips with a confident proud smile. A beautiful full rainbow arches above the scene. The home feels warm and safe. Rainbow motifs glow softly throughout. Watercolor picture book style, warm achievement celebration ending, rich but not cluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark.",
        }),
      ],
    },
  },
  "fixed-getting-dressed": {
    name: "じぶんで おきがえ できたよ",
    description: "自分でお着替えができた！ボタンを留めて、靴下を履いて、一人でできる喜びを贈る絵本",
    icon: "👕",
    categoryGroupId: "growth-support",
    subcategoryId: "self-care",
    parentIntent: "生活習慣を楽しく身につけてほしい",
    recommendedAgeMin: 1,
    recommendedAgeMax: 5,
    requiredInputs: ["childName"],
    optionalInputs: ["parentMessage"],
    themeTags: ["dressing", "independence", "self-care", "growth"],
    creationMode: "fixed_template",
    priceTier: "ume",
    storyCostLevel: "none",
    sampleImageUrl: "/images/templates/fixed-getting-dressed.webp",
    sampleImageAlt: "自分でお着替えができた子どもの絵本イメージ",
    visualDirection:
      "Cheerful morning bedroom atmosphere with colorful clothes, yellow button motifs celebrating each dressing success, warm encouraging mood.",
    order: 91,
    active: true,
    systemPrompt: "固定テンプレートを使って、自分でお着替えができた絵本を作ります。",
    fixedStory: {
      previewImageUrl: "/images/templates/fixed-getting-dressed.webp",
      titleTemplate: "{childName}、じぶんで おきがえ できたよ！",
      coverImagePromptTemplate:
        withFixedImagePromptSafety("Picture book cover illustration: a proud child standing in a cozy bedroom wearing a self-chosen colorful outfit, one arm raised in triumph, yellow button motifs scattered around like confetti, warm morning bedroom atmosphere, soft watercolor style, rounded child-safe composition, rich but not cluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark."),
      titleSpreadTextTemplate: "じぶんで きがえ、できたよ！",
      openingNarrationTemplate:
        "あさ、{childName}は めを さましました。きょうは じぶんで おきがえを するぞ！きいろい ボタンが ぴかりと ひかります。",
      pages: [
        buildAgeSpecificPage({
          textTemplate: "{childName}は自分でシャツを選びました。きいろいボタンがかわいい！",
          baby_toddler: "シャツ きる！じぶんで！かわいい！",
          preschool_3_4:
            "{childName}は じぶんで シャツを えらびました。きいろい ボタンが かわいい！",
          early_reader_5_6:
            "{childName}は じぶんで きょうの シャツを えらびました。きいろい ボタンが ならんで いて、ひとつひとつ とめるの が たのしそうです。",
          early_elementary_7_8:
            "{childName}は じぶんで きょうの きがえを えらびました。きいろい ボタンが ならんだ シャツを みて、「きょうも じぶんで できるぞ！」と こころに ちからが はいりました。",
          general_child: "{childName}は自分でシャツを選びました。きいろいボタンがかわいい！",
          pageVisualRole: "opening_establishing",
          imagePromptTemplate:
            "Establishing wide shot of a cozy child's bedroom in the morning. The child stands before an open wardrobe, holding up a colorful shirt with yellow buttons, examining it with delight. Yellow button motifs scatter like tiny suns around the room. Warm morning light. Watercolor picture book style, cheerful independent morning routine mood, rich but uncluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark.",
        }),
        buildAgeSpecificPage({
          textTemplate: "{childName}はボタンをひとつずつ留めました。集中して、できた！",
          baby_toddler: "ボタン、ぱちっ！できた！",
          preschool_3_4:
            "{childName}は ボタンを ひとつずつ とめました。しゅうちゅうして、できた！",
          early_reader_5_6:
            "{childName}は ボタンを ひとつずつ ていねいに とめました。さいしょは むずかしかったけど、しゅうちゅうして、できた！",
          early_elementary_7_8:
            "{childName}は ボタンを ひとつずつ ていねいに とめていきました。ちいさな きいろい ボタンが とまるたびに、じぶんが すこし おとなに なった きがします。",
          general_child: "{childName}はボタンをひとつずつ留めました。集中して、できた！",
          pageVisualRole: "discovery",
          imagePromptTemplate:
            "Discovery medium shot of the child's small hands carefully fastening yellow buttons on a shirt, tongue sticking out slightly in concentration. Each button that gets done lights up with a tiny yellow glow. Yellow button motifs float softly nearby. Warm bedroom light. Watercolor picture book style, focused self-care discovery mood, rich but uncluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark.",
        }),
        buildAgeSpecificPage({
          textTemplate: "靴下も自分で履けました！{childName}は鏡で自分を見てニコニコ。",
          baby_toddler: "くつした、はいた！じぶんで！",
          preschool_3_4:
            "くつしたも じぶんで はけました！{childName}は かがみで じぶんを みて にこにこ。",
          early_reader_5_6:
            "くつしたも じぶんで はけました！かがみで じぶんを みると、きちんと きがえた {childName}が いました。にこにこ できます。",
          early_elementary_7_8:
            "くつしたも じぶんで はけました！かがみで じぶんを みると、ちゃんと きがえた {childName}が にっこり していました。じぶんで できるって、すごい！",
          general_child: "靴下も自分で履けました！{childName}は鏡で自分を見てニコニコ。",
          pageVisualRole: "emotional_closeup",
          imagePromptTemplate:
            "Emotional close-up of the child looking at their reflection in a bedroom mirror, fully dressed and beaming with proud satisfaction. Yellow button motifs gleam on the shirt. The child's posture is upright and confident. Morning light frames the mirror warmly. Watercolor picture book style, proud self-discovery close-up, warm encouraging mood, rich but uncluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark.",
        }),
        buildAgeSpecificPage({
          textTemplate: "自分でできた{childName}はもう立派なお兄ちゃん・お姉ちゃんです。{parentMessage}",
          baby_toddler: "じぶんで できた！えらい！{parentMessage}",
          preschool_3_4:
            "じぶんで できた {childName}は もう りっぱな おにいちゃん・おねえちゃんです。{parentMessage}",
          early_reader_5_6:
            "じぶんで できた {childName}。できることが ふえるたびに、{childName}は どんどん すてきに なります。{parentMessage}",
          early_elementary_7_8:
            "じぶんで できた {childName}。きいろい ボタンが ひかって いるように、{childName}の まいにちが かがやいています。{parentMessage}",
          general_child:
            "じぶんで できた {childName}は もう りっぱです。{parentMessage}",
          pageVisualRole: "quiet_ending",
          imagePromptTemplate:
            "Wide quiet ending shot of the child walking out the front door in their self-chosen outfit, ready for the day, waving back with a confident smile. Yellow button motifs gleam on the shirt in morning sunlight. The home doorway frames the child warmly. Watercolor picture book style, proud morning achievement ending, warm sunshine, rich but not cluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark.",
        }),
      ],
    },
  },
  "fixed-eating-veggies": {
    name: "やさい たべてみたら",
    description: "苦手な野菜にチャレンジ！食べてみたら意外においしかった。食育を楽しくする絵本",
    icon: "🥦",
    categoryGroupId: "growth-support",
    subcategoryId: "eating-habits",
    parentIntent: "生活習慣を楽しく身につけてほしい",
    recommendedAgeMin: 1,
    recommendedAgeMax: 6,
    requiredInputs: ["childName"],
    optionalInputs: ["parentMessage"],
    themeTags: ["vegetables", "food", "challenge", "growth"],
    creationMode: "fixed_template",
    priceTier: "ume",
    storyCostLevel: "none",
    sampleImageUrl: "/images/templates/fixed-eating-veggies.webp",
    sampleImageAlt: "苦手な野菜に挑戦する子どもの絵本イメージ",
    visualDirection:
      "Bright cheerful kitchen atmosphere with colorful vegetables, green leaf motifs celebrating each bite, encouraging food-adventure mood.",
    order: 92,
    active: true,
    systemPrompt: "固定テンプレートを使って、野菜を食べることへの挑戦絵本を作ります。",
    fixedStory: {
      previewImageUrl: "/images/templates/fixed-eating-veggies.webp",
      titleTemplate: "{childName}と やさいの ぼうけん",
      coverImagePromptTemplate:
        withFixedImagePromptSafety("Picture book cover illustration: a brave child holding a fork with a broccoli floret on it, looking at it curiously, bright friendly vegetables dancing around them — broccoli, carrots, peas — green leaf motifs floating cheerfully, encouraging food adventure mood, soft watercolor style, rounded child-safe composition, rich but not cluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark."),
      titleSpreadTextTemplate: "やさい、ちょっと たべてみる！",
      openingNarrationTemplate:
        "きょう {childName}の おさらに みどりのやさいが のっています。「たべられるかな？」みどりの はっぱが ゆれています。",
      pages: [
        buildAgeSpecificPage({
          textTemplate: "{childName}はお皿の野菜をじっと見ました。たべられるかな？",
          baby_toddler: "みどりの やさい。じっとみてる。",
          preschool_3_4:
            "{childName}は おさらの やさいを じっと みました。たべられるかな？",
          early_reader_5_6:
            "{childName}は おさらの みどりの やさいを じっと みました。「たべられるかな？」と おもいながら、はしを もちました。",
          early_elementary_7_8:
            "{childName}は おさらの やさいを じっと みました。「たべたくない」という きもちと、「たべてみよう」という きもちが むねの なかで いったりきたりしています。",
          general_child: "{childName}はお皿の野菜をじっと見ました。たべられるかな？",
          pageVisualRole: "opening_establishing",
          imagePromptTemplate:
            "Establishing wide shot of a cheerful kitchen table setting at mealtime. The child sits at the table, staring intently at a plate with colorful vegetables — broccoli, carrots, peas. The child holds chopsticks hesitantly. Green leaf motifs float gently around the plate. Warm kitchen light. Watercolor picture book style, gentle food challenge mood, rich but uncluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark.",
        }),
        buildAgeSpecificPage({
          textTemplate: "ブロッコリーさんが「おいしいよ！」と言っているみたいです。",
          baby_toddler: "ブロッコリー、おいしいよ！はっぱ！",
          preschool_3_4:
            "ブロッコリーさんが 「おいしいよ！」と いっているみたいです。",
          early_reader_5_6:
            "ブロッコリーさんが にっこり して「おいしいよ！ からだに いいよ！」と いっているみたいです。みどりの はっぱが ゆれています。",
          early_elementary_7_8:
            "ブロッコリーさんが にっこり して「からだを つよくしてあげるよ！」と いっているみたいです。やさいには それぞれ からだにいい えいようが はいっています。",
          general_child: "ブロッコリーさんが「おいしいよ！」と言っているみたいです。",
          pageVisualRole: "discovery",
          imagePromptTemplate:
            "Discovery medium shot of a friendly-looking broccoli character on the plate, seemingly smiling and cheerful — framed as the child's imaginative perception. Green leaf motifs float around the vegetables. The child leans in slightly curious. Warm kitchen light. Watercolor picture book style, playful food imagination mood, rich but uncluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark.",
        }),
        buildAgeSpecificPage({
          textTemplate: "{childName}は目をつぶって、ぱくっと食べてみました！",
          baby_toddler: "ぱくっ！たべた！どうかな？",
          preschool_3_4:
            "{childName}は めを つぶって、ぱくっと たべてみました！",
          early_reader_5_6:
            "{childName}は めを つぶって、ぱくっと たべてみました！「あれ？おいしい！？」と びっくりしました。",
          early_elementary_7_8:
            "{childName}は めを つぶって、ぱくっと たべてみました。ほんの すこし にがみが あるけど、「あれ、いける！」と おもいました。",
          general_child: "{childName}は目をつぶって、ぱくっと食べてみました！",
          pageVisualRole: "emotional_closeup",
          imagePromptTemplate:
            "Emotional close-up of the child with eyes scrunched shut, biting into a piece of broccoli bravely. The expression transitions from nervous to surprised pleasure. Green leaf motifs burst around the bite like a flavor explosion. Warm kitchen light. Watercolor picture book style, brave food challenge close-up, rich but uncluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark.",
        }),
        buildAgeSpecificPage({
          textTemplate: "やさいを食べた{childName}はもっと強くなれます。{parentMessage}",
          baby_toddler: "やさい たべた！つよくなる！{parentMessage}",
          preschool_3_4:
            "やさいを たべた {childName}は もっと つよく なれます。{parentMessage}",
          early_reader_5_6:
            "やさいを たべた {childName}は からだが つよく なれます。ちゃれんじ できた！{parentMessage}",
          early_elementary_7_8:
            "やさいを たべた {childName}は からだも こころも つよく なれます。にがてな ことに ちゃれんじ する きもちが、いちばんの えいようです。{parentMessage}",
          general_child:
            "やさいを たべた {childName}は もっと つよく なれます。{parentMessage}",
          pageVisualRole: "quiet_ending",
          imagePromptTemplate:
            "Wide quiet ending shot of the child at the dinner table with an empty plate, giving a thumbs up with a proud smile. Green leaf motifs float happily around the clean plate. Family watches warmly in the background. Watercolor picture book style, warm food achievement ending, encouraging home atmosphere, rich but not cluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark.",
        }),
      ],
    },
  },
  "fixed-morning-routine": {
    name: "じぶんで できた あさ",
    description: "朝の支度を自分でできた！歯磨き・着替え・準備。自分でできる喜びを育む絵本",
    icon: "⏰",
    categoryGroupId: "growth-support",
    subcategoryId: "morning-routine",
    parentIntent: "生活習慣を楽しく身につけてほしい",
    recommendedAgeMin: 2,
    recommendedAgeMax: 7,
    requiredInputs: ["childName"],
    optionalInputs: ["parentMessage"],
    themeTags: ["morning", "routine", "independence", "growth"],
    creationMode: "fixed_template",
    priceTier: "ume",
    storyCostLevel: "none",
    sampleImageUrl: "/images/templates/fixed-morning-routine.webp",
    sampleImageAlt: "朝の支度を自分でできた子どもの絵本イメージ",
    visualDirection:
      "Bright cheerful morning home atmosphere, each task completed with a sunrise sun glow motif, encouraging independence routine.",
    order: 93,
    active: true,
    systemPrompt: "固定テンプレートを使って、朝の支度を自分でできた絵本を作ります。",
    fixedStory: {
      previewImageUrl: "/images/templates/fixed-morning-routine.webp",
      titleTemplate: "{childName}の じぶんで できた あさ",
      coverImagePromptTemplate:
        withFixedImagePromptSafety("Picture book cover illustration: a bright-eyed child in pajamas standing in a sunny bedroom, arms raised cheerfully at the start of the morning, a glowing sunrise sun motif visible through the window, warm encouraging morning atmosphere, soft watercolor style, rounded child-safe composition, rich but not cluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark."),
      titleSpreadTextTemplate: "おはよう！けさも じぶんで できるぞ！",
      openingNarrationTemplate:
        "おはよう、{childName}！あさのたいようが まどから さしこんでいます。きょうは じぶんで あさのしたくを するぞ！",
      pages: [
        buildAgeSpecificPage({
          textTemplate: "{childName}は自分で起きて、顔を洗いました。すっきり！",
          baby_toddler: "かお あらった！すっきり！おはよう！",
          preschool_3_4:
            "{childName}は じぶんで おきて、かおを あらいました。すっきり！",
          early_reader_5_6:
            "{childName}は じぶんで めを さまして、かおを あらいました。たいようが まどから はいってきて、あさが はじまります。",
          early_elementary_7_8:
            "{childName}は じぶんで めを さまして、かおを あらいました。ひんやりした みずが ねむけを とばして、たいようが まどから はいってきました。",
          general_child: "{childName}は自分で起きて、顔を洗いました。すっきり！",
          pageVisualRole: "opening_establishing",
          imagePromptTemplate:
            "Establishing wide shot of a bright cheerful bathroom in the morning. The child stands at the sink, water splashing as they wash their face with both hands, eyes still a little sleepy but smiling. A sunrise sun motif glows in the bathroom window. Warm morning light. Watercolor picture book style, fresh encouraging morning mood, rich but uncluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark.",
        }),
        buildAgeSpecificPage({
          textTemplate: "歯ブラシを持って、シャカシャカ！自分で歯を磨きました。",
          baby_toddler: "はみがき、しゃかしゃか！じぶんで！",
          preschool_3_4:
            "はブラシを もって、シャカシャカ！じぶんで はを みがきました。",
          early_reader_5_6:
            "はブラシを もって しゃかしゃか みがきます。うえ、した、おく。じぶんで ちゃんと みがけました！",
          early_elementary_7_8:
            "はブラシを もって ていねいに みがきます。うえのは、したのは、おくの は まで。じぶんで ちゃんと できると、きもちが すっきりします。",
          general_child: "歯ブラシを持って、シャカシャカ！自分で歯を磨きました。",
          pageVisualRole: "discovery",
          imagePromptTemplate:
            "Discovery medium shot of the child brushing their teeth enthusiastically at the bathroom mirror, elbow pumping up and down. Toothpaste foam and a big morning smile visible. A sunrise sun motif gleams in the mirror reflection. Warm bathroom light. Watercolor picture book style, energetic morning routine mood, rich but uncluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark.",
        }),
        buildAgeSpecificPage({
          textTemplate: "着替えも準備も全部できた！{childName}はドアを開けました。",
          baby_toddler: "きがえ できた！いってきます！",
          preschool_3_4:
            "きがえも じゅんびも ぜんぶ できた！{childName}は ドアを あけました。",
          early_reader_5_6:
            "きがえも かばんの じゅんびも ぜんぶ じぶんで できました！{childName}は ドアを あけて、「いってきます！」",
          early_elementary_7_8:
            "きがえも かばんの じゅんびも ぜんぶ じぶんで できました。たいようが ドアの むこうで まっています。「いってきます！」",
          general_child: "着替えも準備も全部できた！{childName}はドアを開けました。",
          pageVisualRole: "emotional_closeup",
          imagePromptTemplate:
            "Emotional close-up of the child standing at the front door, fully dressed and ready for the day, one hand on the door handle, the other waving goodbye. The sunrise sun motif blazes warmly through the door window. The child's face beams with morning readiness. Watercolor picture book style, triumphant morning departure close-up, luminous morning light, rich but uncluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark.",
        }),
        buildAgeSpecificPage({
          textTemplate: "自分でできた朝は、気持ちいい！{parentMessage}",
          baby_toddler: "じぶんで できた！えらい！{parentMessage}",
          preschool_3_4:
            "じぶんで できた あさは、きもちいい！{parentMessage}",
          early_reader_5_6:
            "じぶんで できた あさは、いちにちじゅう きもちがいい。たいようのように かがやく {childName}。{parentMessage}",
          early_elementary_7_8:
            "じぶんで できた あさは、こころも からだも かるい。たいようのように かがやく {childName}の まいにちが はじまります。{parentMessage}",
          general_child:
            "じぶんで できた あさは、きもちいい！{parentMessage}",
          pageVisualRole: "quiet_ending",
          imagePromptTemplate:
            "Wide quiet ending shot of the child walking out the door into a sunny morning, backpack on, face bright. A glowing sunrise sun motif fills the sky above. The home behind is warm and cozy. The world ahead is bright and welcoming. Watercolor picture book style, hopeful morning adventure beginning ending, luminous morning light, rich but not cluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark.",
        }),
      ],
    },
  },
  "fixed-chopsticks": {
    name: "はしで たべられた",
    description: "お箸で食べられた！練習を重ねてついにできた達成感と誇りを贈る成長絵本",
    icon: "🥢",
    categoryGroupId: "growth-support",
    subcategoryId: "eating-habits",
    parentIntent: "生活習慣を楽しく身につけてほしい",
    recommendedAgeMin: 2,
    recommendedAgeMax: 6,
    requiredInputs: ["childName"],
    optionalInputs: ["parentMessage"],
    themeTags: ["chopsticks", "mealtime", "skill", "growth"],
    creationMode: "fixed_template",
    priceTier: "ume",
    storyCostLevel: "none",
    sampleImageUrl: "/images/templates/fixed-chopsticks.webp",
    sampleImageAlt: "お箸で食べられた子どもの絵本イメージ",
    visualDirection:
      "Warm cheerful dining table atmosphere, red bean motifs appearing as small victories with each chopstick success, encouraging skill-building mood.",
    order: 94,
    active: true,
    systemPrompt: "固定テンプレートを使って、お箸で食べられた達成感の絵本を作ります。",
    fixedStory: {
      previewImageUrl: "/images/templates/fixed-chopsticks.webp",
      titleTemplate: "{childName}、はしで たべられた！",
      coverImagePromptTemplate:
        withFixedImagePromptSafety("Picture book cover illustration: a proud child holding chopsticks with a perfect pinch grip, a cute red bean held triumphantly between the tips, warm mealtime atmosphere, cheerful dining table with friendly food characters, red bean motifs scattered like confetti, soft watercolor style, rounded child-safe composition, rich but not cluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark."),
      titleSpreadTextTemplate: "はし、つかえるかな？",
      openingNarrationTemplate:
        "きょう {childName}は おはしを もちました。あかい まめが ちゃぶだいに ならんでいます。「つかめるかな？」",
      pages: [
        buildAgeSpecificPage({
          textTemplate: "{childName}はお箸をもって、まねしてみました。難しいな…",
          baby_toddler: "おはし、もった！むずかしい！",
          preschool_3_4:
            "{childName}は おはしを もって、まねしてみました。むずかしいな…",
          early_reader_5_6:
            "{childName}は おはしを もって、きちんと もちかたを まねしてみました。ゆびが いうことを きいてくれません。",
          early_elementary_7_8:
            "{childName}は おはしを もって、もちかたを まねしてみました。ゆびをおいたとおりに うごかそうとするけど、なかなか むずかしい。",
          general_child: "{childName}はお箸をもって、まねしてみました。難しいな…",
          pageVisualRole: "opening_establishing",
          imagePromptTemplate:
            "Establishing wide shot of a cheerful home dining table at mealtime. The child sits at the table, holding chopsticks awkwardly in both hands, concentrating hard. A bowl of food sits before them. Red bean motifs dot the tablecloth like a pattern. Warm home light. Watercolor picture book style, cheerful mealtime practice mood, rich but uncluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark.",
        }),
        buildAgeSpecificPage({
          textTemplate: "れんしゅう、れんしゅう！{childName}はあきらめません。",
          baby_toddler: "れんしゅう！もういっかい！あきらめない！",
          preschool_3_4:
            "れんしゅう、れんしゅう！{childName}は あきらめません。",
          early_reader_5_6:
            "れんしゅう、れんしゅう！おはしが すこしずつ ゆびに なじんできました。{childName}は あきらめません。",
          early_elementary_7_8:
            "れんしゅう、れんしゅう！なんどやっても むずかしいけど、{childName}は あきらめません。できるまで やってみる、それが {childName}のやりかたです。",
          general_child: "れんしゅう、れんしゅう！{childName}はあきらめません。",
          pageVisualRole: "discovery",
          imagePromptTemplate:
            "Discovery medium shot of the child practicing chopsticks with intense focus, trying again and again to pick up a red bean. Their posture is determined despite difficulty. Small red bean motifs glow encouragingly on the table. Warm home light. Watercolor picture book style, determined practice mood, rich but uncluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark.",
        }),
        buildAgeSpecificPage({
          textTemplate: "まめがつかめた！{childName}は「できた！！」と叫びました！",
          baby_toddler: "まめ、つかめた！やった！できた！！",
          preschool_3_4:
            "まめが つかめた！{childName}は 「できた！！」と さけびました！",
          early_reader_5_6:
            "まめが つかめた！おはしの さきに まめが のって、「できた！！」と {childName}は さけびました。むねが どきどきしています！",
          early_elementary_7_8:
            "まめが つかめた！おはしの さきに あかい まめが のった そのしゅんかん、「できた！！」と {childName}は さけびました。ずっと れんしゅうして きた ほうしゅうが、やってきました。",
          general_child: "まめがつかめた！{childName}は「できた！！」と叫びました！",
          pageVisualRole: "emotional_closeup",
          imagePromptTemplate:
            "Emotional close-up of the child's face absolutely beaming with triumph, chopsticks held correctly in hand with a red bean pinched between the tips. Pure joy and proud disbelief on their face. Red bean motifs burst around the moment like tiny sparks. Warm dining light. Watercolor picture book style, triumphant skill mastery close-up, rich but uncluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark.",
        }),
        buildAgeSpecificPage({
          textTemplate: "お箸を使える{childName}は、もう立派なお兄ちゃん・お姉ちゃんです。{parentMessage}",
          baby_toddler: "おはし、つかえた！えらい！{parentMessage}",
          preschool_3_4:
            "おはしを つかえる {childName}は、もう りっぱな おにいちゃん・おねえちゃんです。{parentMessage}",
          early_reader_5_6:
            "おはしを つかえる {childName}は、もう りっぱです。あきらめずに れんしゅうした {childName}の こころが、いちばん すごい。{parentMessage}",
          early_elementary_7_8:
            "おはしを つかえる {childName}は、もう りっぱです。むずかしいことも あきらめずに れんしゅうすれば、かならずできる。その きもちは、これから ずっと {childName}の たからものです。{parentMessage}",
          general_child:
            "おはしを つかえる {childName}は、もう りっぱです。{parentMessage}",
          pageVisualRole: "quiet_ending",
          imagePromptTemplate:
            "Wide quiet ending shot of the child sitting at the dinner table eating happily with chopsticks, food in the bowl, the whole family watching warmly. Red bean motifs glow softly on the table. The child's posture is confident and proud. Warm home dining light. Watercolor picture book style, warm mealtime achievement ending, family warmth, rich but not cluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark.",
        }),
      ],
    },
  },
  "fixed-first-friend": {
    name: "はじめての ともだち",
    description: "はじめてお友だちができた日。勇気を出して声をかけた、特別な日の記念絵本",
    icon: "🤝",
    categoryGroupId: "emotional-growth",
    subcategoryId: "friendship",
    parentIntent: "こころの成長を助けたい",
    recommendedAgeMin: 2,
    recommendedAgeMax: 7,
    requiredInputs: ["childName"],
    optionalInputs: ["parentMessage"],
    themeTags: ["friendship", "courage", "connection", "growth"],
    creationMode: "fixed_template",
    priceTier: "ume",
    storyCostLevel: "none",
    sampleImageUrl: "/images/templates/fixed-first-friend.webp",
    sampleImageAlt: "はじめてのお友だちができた日を記念する絵本イメージ",
    visualDirection:
      "Warm sunny park or school setting, heart-shaped motifs blooming with each moment of connection, tender friendship building atmosphere.",
    order: 95,
    active: true,
    systemPrompt: "固定テンプレートを使って、はじめての友だちができた日の記念絵本を作ります。",
    fixedStory: {
      previewImageUrl: "/images/templates/fixed-first-friend.webp",
      titleTemplate: "{childName}の はじめての ともだち",
      coverImagePromptTemplate:
        withFixedImagePromptSafety("Picture book cover illustration: two small children holding hands in a sunny park, both smiling warmly at each other, heart motifs floating around them like bubbles, tender first friendship mood, soft watercolor style, rounded child-safe composition, rich but not cluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark."),
      titleSpreadTextTemplate: "ともだち、できるかな？",
      openingNarrationTemplate:
        "こうえんで {childName}は おなじ あそびを している こを みつけました。こえを かけてみたい。でも、すこし どきどきします。",
      pages: [
        buildAgeSpecificPage({
          textTemplate: "{childName}は一人で遊んでいる子を見つけました。声をかけてみたいな。",
          baby_toddler: "あのこ、なにしてる？いっしょにあそぶ？",
          preschool_3_4:
            "{childName}は ひとりで あそんでいる こを みつけました。こえを かけてみたいな。",
          early_reader_5_6:
            "{childName}は ひとりで あそんでいる こを みつけました。こえを かけてみたいけど、どきどきします。でも、がんばってみよう。",
          early_elementary_7_8:
            "{childName}は ひとりで あそんでいる こを みつけました。こえを かけてみたい。でも てが でない。どうしよう、と おもいながらも、{childName}は ゆっくり あるきだしました。",
          general_child: "{childName}は一人で遊んでいる子を見つけました。声をかけてみたいな。",
          pageVisualRole: "opening_establishing",
          imagePromptTemplate:
            "Establishing wide shot of a sunny park or school yard. The child stands a short distance from another child playing alone. The child's expression shows gentle nervousness mixed with courage. A tiny heart motif floats between them. Warm sunshine. Watercolor picture book style, tender pre-friendship anticipation mood, rich but uncluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark.",
        }),
        buildAgeSpecificPage({
          textTemplate: "{childName}は勇気を出して「いっしょにあそぼう！」と言いました。",
          baby_toddler: "いっしょにあそぼう！いった！",
          preschool_3_4:
            "{childName}は ゆうきを だして 「いっしょに あそぼう！」と いいました。",
          early_reader_5_6:
            "{childName}は こころを きめて 「いっしょに あそぼう！」と いいました。むねが どきどきしたけど、ことばが でてきました。",
          early_elementary_7_8:
            "{childName}は こころを きめて 「いっしょに あそぼう！」と いいました。ちいさな ゆうきを だした しゅんかん、ハートが こころの なかで ひかりました。",
          general_child: "{childName}は勇気を出して「いっしょにあそぼう！」と言いました。",
          pageVisualRole: "discovery",
          imagePromptTemplate:
            "Discovery medium shot of the child taking a step forward, hand outstretched toward the other child, saying their first words of friendship. The other child turns with a big smile. Heart motifs bloom between them like flowers. Warm park sunlight. Watercolor picture book style, brave first friendship step mood, rich but uncluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark.",
        }),
        buildAgeSpecificPage({
          textTemplate: "二人は手をつないで一緒に遊びました。とても楽しかった！",
          baby_toddler: "てつないで、いっしょに！うれしい！",
          preschool_3_4:
            "ふたりは てを つないで いっしょに あそびました。とても たのしかった！",
          early_reader_5_6:
            "ふたりは てを つないで いっしょに あそびました。{childName}は こころが あたたかくなって、えがおが とまりません。",
          early_elementary_7_8:
            "ふたりは てを つないで いっしょに あそびました。ひとりで いるときより、ずっと たのしい。ともだちって、こんなに すてきなんだ。",
          general_child: "二人は手をつないで一緒に遊びました。とても楽しかった！",
          pageVisualRole: "emotional_closeup",
          imagePromptTemplate:
            "Emotional close-up of two children playing together hand in hand, both laughing. Heart motifs surround them like a warm glow. Both faces radiate pure joy and connection. Warm sunlight. Watercolor picture book style, warm first friendship close-up, rich but uncluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark.",
        }),
        buildAgeSpecificPage({
          textTemplate: "勇気を出して声をかけてよかった。{childName}に大切なともだちができました。{parentMessage}",
          baby_toddler: "ともだち できた！うれしい！{parentMessage}",
          preschool_3_4:
            "ゆうきを だして こえを かけてよかった。{childName}に たいせつな ともだちが できました。{parentMessage}",
          early_reader_5_6:
            "ゆうきを だして こえを かけてよかった。{childName}に はじめての たいせつな ともだちが できました。{parentMessage}",
          early_elementary_7_8:
            "ゆうきを だして こえを かけてよかった。ちいさな ゆうきが、たいせつな ともだちを つれてきてくれました。{parentMessage}",
          general_child:
            "ゆうきを だして こえを かけてよかった。{childName}に たいせつな ともだちが できました。{parentMessage}",
          pageVisualRole: "quiet_ending",
          imagePromptTemplate:
            "Wide quiet ending shot of both children waving goodbye to each other at the park gate, both beaming with new friendship warmth. Heart motifs float gently in the air between them. Warm golden afternoon light. Watercolor picture book style, tender first friendship farewell ending, rich but not cluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark.",
        }),
      ],
    },
  },
  "fixed-being-brave": {
    name: "ゆうきを だして",
    description: "こわくても、ドキドキしても、勇気を出して一歩踏み出した{childName}の絵本",
    icon: "🦁",
    categoryGroupId: "emotional-growth",
    subcategoryId: "courage",
    parentIntent: "こころの成長を助けたい",
    recommendedAgeMin: 2,
    recommendedAgeMax: 8,
    requiredInputs: ["childName"],
    optionalInputs: ["parentMessage"],
    themeTags: ["courage", "bravery", "growth", "overcoming-fear"],
    creationMode: "fixed_template",
    priceTier: "ume",
    storyCostLevel: "none",
    sampleImageUrl: "/images/templates/fixed-being-brave.webp",
    sampleImageAlt: "勇気を出して挑戦する子どもの絵本イメージ",
    visualDirection:
      "Warm encouraging atmosphere with a small lion cub as bravery symbol, gold star motifs appearing with each act of courage throughout.",
    order: 96,
    active: true,
    systemPrompt: "固定テンプレートを使って、勇気を出して挑戦する絵本を作ります。",
    fixedStory: {
      previewImageUrl: "/images/templates/fixed-being-brave.webp",
      titleTemplate: "{childName}の ゆうき",
      coverImagePromptTemplate:
        withFixedImagePromptSafety("Picture book cover illustration: a small child standing tall and brave at the edge of something challenging — a dark slide, a stage, a new path — a tiny friendly lion cub by their side as a courage companion, gold star motifs floating around both, warm brave adventure mood, soft watercolor style, rounded child-safe composition, rich but not cluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark."),
      titleSpreadTextTemplate: "こわくても、できるよ！",
      openingNarrationTemplate:
        "きょう {childName}は こわいと おもっていることに ちょうせんします。「できないかも」と おもうけど、ゴールドの ほしが かがやいています。",
      pages: [
        buildAgeSpecificPage({
          textTemplate: "{childName}はこわくてドキドキしています。でも、やってみたい！",
          baby_toddler: "どきどき、こわい。でも、やる！",
          preschool_3_4:
            "{childName}は こわくて ドキドキしています。でも、やってみたい！",
          early_reader_5_6:
            "{childName}は こわくて むねが ドキドキしています。「できないかも」という きもちと「やってみたい！」という きもちが いったりきたりしています。",
          early_elementary_7_8:
            "{childName}は こわくて むねが ドキドキしています。「できないかも」という きもちと「やってみたい！」という きもちが むねの なかで ぶつかって います。",
          general_child: "{childName}はこわくてドキドキしています。でも、やってみたい！",
          pageVisualRole: "opening_establishing",
          imagePromptTemplate:
            "Establishing wide shot of the child standing at the edge of something challenging — perhaps the top of a tall slide or the entrance to a new place — looking nervous but determined. A tiny friendly lion cub sits beside them as a companion. Gold star motifs float faintly in the air. Warm encouraging light. Watercolor picture book style, brave challenge beginning mood, rich but uncluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark.",
        }),
        buildAgeSpecificPage({
          textTemplate: "小さなライオンが「ぼくもいっしょだよ！」と言いました。",
          baby_toddler: "らいおん、いっしょ！こわくない！",
          preschool_3_4:
            "ちいさな ライオンが 「ぼくも いっしょだよ！」と いいました。",
          early_reader_5_6:
            "ちいさな ライオンが 「ぼくも いっしょだよ！こわくても、いっぽ ふみだせば へいきだよ」と いいました。",
          early_elementary_7_8:
            "ちいさな ライオンが 「こわいって おもうのは、ゆうきが ある しるしだよ。こわくても やれるのが ほんとうの ゆうきだから」と いいました。",
          general_child: "小さなライオンが「ぼくもいっしょだよ！」と言いました。",
          pageVisualRole: "discovery",
          imagePromptTemplate:
            "Discovery medium shot of the child and a tiny friendly lion cub side by side, the lion looking up encouragingly. Gold star motifs gleam around them both. The child's expression shifts from worried to determined. Warm encouraging light. Watercolor picture book style, courage companion discovery mood, rich but uncluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark.",
        }),
        buildAgeSpecificPage({
          textTemplate: "{childName}は目をつぶって、いっぽ踏み出しました！できた！",
          baby_toddler: "いっぽ！できた！やった！",
          preschool_3_4:
            "{childName}は めを つぶって、いっぽ ふみだしました！できた！",
          early_reader_5_6:
            "{childName}は めを つぶって、いっぽ ふみだしました！あとは もう こわくない。「できた！」と こころの なかで さけびました。",
          early_elementary_7_8:
            "{childName}は めを つぶって いっぽ ふみだしました。そのいっぽが、すべてを かえました。「できた！」ゴールドの ほしが こころのなかで かがやきました。",
          general_child: "{childName}は目をつぶって、いっぽ踏み出しました！できた！",
          pageVisualRole: "emotional_closeup",
          imagePromptTemplate:
            "Emotional close-up of the child mid-brave action — at the bottom of the slide, having stepped forward, with an expression of surprised triumph and relief. The lion cub cheers beside them. Gold star motifs burst around the moment. Warm encouraging light. Watercolor picture book style, triumphant courage moment close-up, luminous golden glow, rich but uncluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark.",
        }),
        buildAgeSpecificPage({
          textTemplate: "ゆうきを出した{childName}はゴールドの星のようにかがやいています。{parentMessage}",
          baby_toddler: "ゆうき だした！すごい！{parentMessage}",
          preschool_3_4:
            "ゆうきを だした {childName}は ゴールドの ほしのように かがやいています。{parentMessage}",
          early_reader_5_6:
            "ゆうきを だした {childName}は ゴールドの ほしのように かがやいています。こわくても いっぽ ふみだせる こころは、{childName}の たからものです。{parentMessage}",
          early_elementary_7_8:
            "ゆうきを だした {childName}は ゴールドの ほしのように かがやいています。こわいと おもっても、ゆうきを だせた。そのきもちは ずっと {childName}の なかに のこります。{parentMessage}",
          general_child:
            "ゆうきを だした {childName}は ゴールドの ほしのように かがやいています。{parentMessage}",
          pageVisualRole: "quiet_ending",
          imagePromptTemplate:
            "Wide quiet ending shot of the child and their lion cub companion walking forward together into a bright warm scene, gold star motifs trailing behind like a wake of stars. The child's posture is upright and proud. Warm golden light fills the path ahead. Watercolor picture book style, brave confident ending, luminous golden glow, rich but not cluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark.",
        }),
      ],
    },
  },
  "fixed-saying-sorry": {
    name: "ごめんなさい できた",
    description: "ごめんなさいが言えた日。謝ることの大切さとやさしさを育む感情成長絵本",
    icon: "🌈",
    categoryGroupId: "emotional-growth",
    subcategoryId: "apology",
    parentIntent: "こころの成長を助けたい",
    recommendedAgeMin: 2,
    recommendedAgeMax: 7,
    requiredInputs: ["childName"],
    optionalInputs: ["parentMessage"],
    themeTags: ["apology", "kindness", "emotional-growth", "friendship"],
    creationMode: "fixed_template",
    priceTier: "ume",
    storyCostLevel: "none",
    sampleImageUrl: "/images/templates/fixed-saying-sorry.webp",
    sampleImageAlt: "ごめんなさいが言えた子どもの絵本イメージ",
    visualDirection:
      "Warm emotional atmosphere, a rainbow appearing after the apology moment, rainbow motifs as forgiveness and reconciliation symbols throughout.",
    order: 97,
    active: true,
    systemPrompt: "固定テンプレートを使って、ごめんなさいが言えた日の感情成長絵本を作ります。",
    fixedStory: {
      previewImageUrl: "/images/templates/fixed-saying-sorry.webp",
      titleTemplate: "{childName}の ごめんなさい",
      coverImagePromptTemplate:
        withFixedImagePromptSafety("Picture book cover illustration: a child standing face-to-face with a friend, one hand extended in an apology gesture, a soft rainbow beginning to appear behind them both, warm reconciliation mood, gentle and earnest expressions, soft watercolor style, rounded child-safe composition, rich but not cluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark."),
      titleSpreadTextTemplate: "ごめんなさい、つたわるかな",
      openingNarrationTemplate:
        "きょう {childName}は ともだちを かなしませてしまいました。むねが もやもや します。どうしよう。",
      pages: [
        buildAgeSpecificPage({
          textTemplate: "{childName}はお友だちを泣かせてしまいました。胸がもやもやします。",
          baby_toddler: "ともだち、ないてる。どうしよう。",
          preschool_3_4:
            "{childName}は おともだちを なかせてしまいました。むねが もやもや します。",
          early_reader_5_6:
            "{childName}は おともだちを かなしませてしまいました。むねが もやもやして、おかしのあじも わかりません。",
          early_elementary_7_8:
            "{childName}は おともだちを かなしませてしまいました。むねが もやもやして、そのこの なみだが こころに つきさされるようです。",
          general_child: "{childName}はお友だちを泣かせてしまいました。胸がもやもやします。",
          pageVisualRole: "opening_establishing",
          imagePromptTemplate:
            "Establishing wide shot of a child and another child in a park or playground, the second child looking sad or hurt. The first child stands nearby looking troubled and guilty, unable to meet the other's eyes. The sky is overcast but soft. Watercolor picture book style, gentle emotional conflict mood, tender not scary, rich but uncluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark.",
        }),
        buildAgeSpecificPage({
          textTemplate: "{childName}はよく考えました。「ごめんなさい」と言わなくては。",
          baby_toddler: "ごめんなさい、いわなきゃ。",
          preschool_3_4:
            "{childName}は よく かんがえました。「ごめんなさい」と いわなくては。",
          early_reader_5_6:
            "{childName}は よく かんがえました。「ごめんなさい」と いうのは むずかしい。でも、いわなければ むねの もやもやは きえません。",
          early_elementary_7_8:
            "{childName}は よく かんがえました。「ごめんなさい」を いうのは こわい。でも、そのこが かなしんでいるのを みていると、もっと つらい。いうしかない。",
          general_child: "{childName}はよく考えました。「ごめんなさい」と言わなくては。",
          pageVisualRole: "discovery",
          imagePromptTemplate:
            "Discovery medium shot of the child sitting alone in contemplation, arms wrapped around knees, thinking hard. Their expression shows inner conflict resolving into determination. A tiny rainbow arc begins to form faintly in the background sky. Soft light. Watercolor picture book style, reflective emotional growth mood, rich but uncluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark.",
        }),
        buildAgeSpecificPage({
          textTemplate: "{childName}は「ごめんなさい」と言えました。にじが出ました。",
          baby_toddler: "ごめんなさい、いえた！にじ！",
          preschool_3_4:
            "{childName}は 「ごめんなさい」と いえました。にじが でました。",
          early_reader_5_6:
            "{childName}は ゆうきを もって 「ごめんなさい」と いえました。そのしゅんかん、そらに にじが でて、ともだちが わらってくれました。",
          early_elementary_7_8:
            "{childName}は ゆうきを もって 「ごめんなさい」と いえました。ことばが でたしゅんかん、むねの もやもやが ふわっと きえて、にじが そらに かかりました。",
          general_child: "{childName}は「ごめんなさい」と言えました。にじが出ました。",
          pageVisualRole: "emotional_closeup",
          imagePromptTemplate:
            "Emotional close-up of the child facing their friend with sincere apologetic eyes, one hand extended. The friend is beginning to smile, accepting the apology. A bright rainbow bursts into the sky behind them both. Rainbow motifs radiate from the moment. Warm soft light returning. Watercolor picture book style, heartfelt reconciliation close-up, rainbow glow, rich but uncluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark.",
        }),
        buildAgeSpecificPage({
          textTemplate: "ごめんなさいが言えた{childName}のこころはにじのようにかがやいています。{parentMessage}",
          baby_toddler: "ごめんなさい、なかよし！にじ！{parentMessage}",
          preschool_3_4:
            "ごめんなさいが いえた {childName}の こころは にじのように かがやいています。{parentMessage}",
          early_reader_5_6:
            "ごめんなさいが いえた {childName}の こころは にじのように かがやいています。むずかしいことを のりこえた じぶんを、すこし すきに なれました。{parentMessage}",
          early_elementary_7_8:
            "ごめんなさいが いえた {childName}の こころは にじのように かがやいています。むずかしいことを のりこえた きもちは、これからの {childName}を つよくします。{parentMessage}",
          general_child:
            "ごめんなさいが いえた {childName}の こころは にじのように かがやいています。{parentMessage}",
          pageVisualRole: "quiet_ending",
          imagePromptTemplate:
            "Wide quiet ending shot of both children walking together under a full beautiful rainbow in a clear sky. Both are smiling, side by side. Rainbow motifs glow softly along the path. Warm golden afternoon light. Watercolor picture book style, peaceful rainbow reconciliation ending, luminous warm glow, rich but not cluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark.",
        }),
      ],
    },
  },
  "fixed-first-snow": {
    name: "はじめての ゆき",
    description: "生まれて初めて雪を触った日。冷たくて不思議で楽しかった雪の思い出を贈る絵本",
    icon: "❄️",
    categoryGroupId: "daily-life",
    subcategoryId: "seasons",
    parentIntent: "日常の特別な瞬間を残したい",
    recommendedAgeMin: 0,
    recommendedAgeMax: 5,
    requiredInputs: ["childName"],
    optionalInputs: ["parentMessage"],
    themeTags: ["snow", "winter", "first-experience", "wonder"],
    creationMode: "fixed_template",
    priceTier: "ume",
    storyCostLevel: "none",
    sampleImageUrl: "/images/templates/fixed-first-snow.webp",
    sampleImageAlt: "はじめて雪を触った子どもの絵本イメージ",
    visualDirection:
      "Magical white winter landscape with snowflake crystal motifs glittering throughout, sense of wonder and discovery, soft blue-white palette.",
    order: 100,
    active: true,
    systemPrompt: "固定テンプレートを使って、はじめて雪を触った日の思い出絵本を作ります。",
    fixedStory: {
      previewImageUrl: "/images/templates/fixed-first-snow.webp",
      titleTemplate: "{childName}の はじめての ゆき",
      coverImagePromptTemplate:
        withFixedImagePromptSafety("Picture book cover illustration: a small wide-eyed child standing in a snowy garden, both mittened hands stretched out to catch snowflakes, expression of pure magical wonder, soft blue-white snowflake crystal motifs floating all around, magical winter atmosphere, soft watercolor style, rounded child-safe composition, rich but not cluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark."),
      titleSpreadTextTemplate: "ゆき！ゆきが ふってきた！",
      openingNarrationTemplate:
        "まどの そとに しろいものが ふってきました。「なにあれ？！」{childName}の めが まるく なりました。ゆきのけっしょうが きらきら ひかっています。",
      pages: [
        buildAgeSpecificPage({
          textTemplate: "{childName}はまどの外を見て目をまるくしました。しろい！ふしぎ！",
          baby_toddler: "しろい！なに？！ふしぎ！ゆき！",
          preschool_3_4:
            "{childName}は まどの そとを みて めを まるくしました。しろい！ふしぎ！",
          early_reader_5_6:
            "{childName}は まどの そとを みて めを まるくしました。しろくて ふわふわしたものが、ひらひらと おちてきます。「なにあれ？！」",
          early_elementary_7_8:
            "{childName}は まどの そとを みて めを まるくしました。しろくて ふわふわした ものが ひらひらとおちてきます。ゆきのけっしょうが まどにはりついて、きれいです。",
          general_child: "{childName}はまどの外を見て目をまるくしました。しろい！ふしぎ！",
          pageVisualRole: "opening_establishing",
          imagePromptTemplate:
            "Establishing wide shot of a cozy home interior, the child pressing their nose and hands against a frosty window, staring wide-eyed at snow falling outside. Snowflake crystal motifs float gently beyond the glass. Warm home interior contrasts with the white world outside. Watercolor picture book style, magical winter wonder mood, soft blue-white glow, rich but uncluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark.",
        }),
        buildAgeSpecificPage({
          textTemplate: "{childName}は外に出て、てのひらで雪をうけてみました。つめたい！",
          baby_toddler: "ゆき、さわった！つめたい！ふわふわ！",
          preschool_3_4:
            "{childName}は そとに でて、てのひらで ゆきを うけてみました。つめたい！",
          early_reader_5_6:
            "{childName}は そとに でて、てのひらで ゆきを うけてみました。「つめたい！」でも、すぐ とけてしまいます。ゆきのけっしょうは ちいさくて きれいです。",
          early_elementary_7_8:
            "{childName}は そとに でて、てのひらに ゆきを うけました。「つめたい！」てのひらの うえで ゆきのけっしょうは ひかって、すぐ とけて しまいます。",
          general_child: "{childName}は外に出て、てのひらで雪をうけてみました。つめたい！",
          pageVisualRole: "discovery",
          imagePromptTemplate:
            "Discovery medium shot of the child outside in the snow, both mittened hands stretched out with snowflakes landing on them, expression shifting from nervous to delighted. Snowflake crystal motifs swirl around them. Winter-wrapped in a warm coat. Watercolor picture book style, magical first-snow discovery mood, soft blue-white light, rich but uncluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark.",
        }),
        buildAgeSpecificPage({
          textTemplate: "{childName}は雪の上をあるきました。ふかふか！ぎゅっぎゅっ！",
          baby_toddler: "ゆきのうえ、ぎゅっぎゅっ！おもしろい！",
          preschool_3_4:
            "{childName}は ゆきの うえを あるきました。ふかふか！ぎゅっぎゅっ！",
          early_reader_5_6:
            "{childName}は ゆきの うえを あるきました。ふかふか、ぎゅっぎゅっ。あしあとが のこります。「{childName}の あしあとだ！」",
          early_elementary_7_8:
            "{childName}は ゆきの うえを あるきました。ぎゅっぎゅっと おとがして、しろい ゆきに {childName}の あしあとが のこっていきます。",
          general_child: "{childName}は雪の上をあるきました。ふかふか！ぎゅっぎゅっ！",
          pageVisualRole: "emotional_closeup",
          imagePromptTemplate:
            "Emotional close-up of the child stomping through fresh snow, footprints trailing behind, face glowing with pure snowy joy. Snowflake crystal motifs sparkle all around. The child's cheeks are rosy from the cold. Soft winter light. Watercolor picture book style, joyful winter play close-up, luminous white and blue, rich but uncluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark.",
        }),
        buildAgeSpecificPage({
          textTemplate: "はじめての雪を楽しんだ{childName}。この日のことは一生わすれません。{parentMessage}",
          baby_toddler: "ゆき、たのしかった！またあそぼ！{parentMessage}",
          preschool_3_4:
            "はじめての ゆきを たのしんだ {childName}。この ひのことは ずっと おぼえています。{parentMessage}",
          early_reader_5_6:
            "はじめての ゆきを たのしんだ {childName}。ゆきのけっしょうのように、この ひの きおくは ひかりつづけます。{parentMessage}",
          early_elementary_7_8:
            "はじめての ゆきを たのしんだ {childName}。ゆきのけっしょうは とけてしまうけど、この ひの きおくは ずっと ずっと のこります。{parentMessage}",
          general_child:
            "はじめての ゆきを たのしんだ {childName}。この ひのことは ずっと おぼえています。{parentMessage}",
          pageVisualRole: "quiet_ending",
          imagePromptTemplate:
            "Wide quiet ending shot of the child being carried back inside by a parent, looking back over the shoulder at the snow-covered garden. Their footprints trail across the white snow. Snowflake crystal motifs drift gently in the cold air. Warm light from the house windows ahead. Watercolor picture book style, tender winter memory ending, warm-cold contrast, rich but not cluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark.",
        }),
      ],
    },
  },
  "fixed-autumn-leaves": {
    name: "もみじ さんぽ",
    description: "秋のもみじ散歩。赤や黄色に染まった葉を集めて、秋の日の思い出を贈る絵本",
    icon: "🍁",
    categoryGroupId: "daily-life",
    subcategoryId: "nature-walk",
    parentIntent: "日常の特別な瞬間を残したい",
    recommendedAgeMin: 1,
    recommendedAgeMax: 8,
    requiredInputs: ["childName"],
    optionalInputs: ["parentMessage"],
    themeTags: ["autumn", "leaves", "nature", "walk"],
    creationMode: "fixed_template",
    priceTier: "ume",
    storyCostLevel: "none",
    sampleImageUrl: "/images/templates/fixed-autumn-leaves.webp",
    sampleImageAlt: "秋のもみじ散歩をする子どもの絵本イメージ",
    visualDirection:
      "Warm golden autumn forest atmosphere, red maple leaf motifs collected like treasures throughout, rich fall color palette.",
    order: 101,
    active: true,
    systemPrompt: "固定テンプレートを使って、秋のもみじ散歩の思い出絵本を作ります。",
    fixedStory: {
      previewImageUrl: "/images/templates/fixed-autumn-leaves.webp",
      titleTemplate: "{childName}の もみじ さんぽ",
      coverImagePromptTemplate:
        withFixedImagePromptSafety("Picture book cover illustration: a child walking through a magical autumn forest path, holding a beautiful red maple leaf above their head like an umbrella, autumn leaves raining down all around, warm golden red orange palette, red maple leaf motifs swirling like dancers, soft watercolor style, rounded child-safe composition, rich but not cluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark."),
      titleSpreadTextTemplate: "あかい はっぱを あつめよう！",
      openingNarrationTemplate:
        "あきのこうえんは きいろや あかに そまっています。{childName}は あかい もみじを さがして あるきます。",
      pages: [
        buildAgeSpecificPage({
          textTemplate: "{childName}は公園に来ました。木の葉が赤くなっています！",
          baby_toddler: "あかい はっぱ！きれい！こうえん！",
          preschool_3_4:
            "{childName}は こうえんに きました。きのはが あかく なっています！",
          early_reader_5_6:
            "{childName}は こうえんに きました。きのはが あかや きいろに そまって、かぜに ゆれています。",
          early_elementary_7_8:
            "{childName}は こうえんに きました。きのはが あかや きいろに そまって、かぜが ふくたびに はらはらと おちてきます。あきの においが します。",
          general_child: "{childName}は公園に来ました。木の葉が赤くなっています！",
          pageVisualRole: "opening_establishing",
          imagePromptTemplate:
            "Establishing wide shot of a beautiful autumn park with maple trees ablaze in red and gold, their leaves floating down like a gentle rain. The child stands at the entrance, looking up with wonder at the spectacle. Red maple leaf motifs float past on a warm breeze. Rich golden autumn light. Watercolor picture book style, magical autumn arrival mood, warm red-gold palette, rich but uncluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark.",
        }),
        buildAgeSpecificPage({
          textTemplate: "{childName}はいちばん赤くてきれいなもみじを見つけました。これだ！",
          baby_toddler: "あかい！きれい！もみじ！これ！",
          preschool_3_4:
            "{childName}は いちばん あかくて きれいな もみじを みつけました。これだ！",
          early_reader_5_6:
            "{childName}は いちばん あかくて きれいな もみじを みつけました。「これだ！」と こころのなかで さけびながら、そっと ひろいあげました。",
          early_elementary_7_8:
            "{childName}は こうえんを あるきながら、いちばん あかくて かたちの よい もみじを さがしました。「あった！これだ！」と こころのなかで さけびました。",
          general_child: "{childName}はいちばん赤くてきれいなもみじを見つけました。これだ！",
          pageVisualRole: "discovery",
          imagePromptTemplate:
            "Discovery medium shot of the child crouching down to pick up a perfect vivid red maple leaf from the ground, expression of delighted discovery. Red maple leaf motifs surround the found treasure. Dappled autumn sunlight through the trees above. Watercolor picture book style, autumn treasure hunt discovery mood, warm golden light, rich but uncluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark.",
        }),
        buildAgeSpecificPage({
          textTemplate: "{childName}はもみじを手にもって走りました。かぜがきもちいい！",
          baby_toddler: "はしった！もみじ、ひらひら！たのしい！",
          preschool_3_4:
            "{childName}は もみじを てにもって はしりました。かぜが きもちいい！",
          early_reader_5_6:
            "{childName}は もみじを てにもって はしりました。かぜが ほっぺをなでて、あきのかぜが きもちいい。",
          early_elementary_7_8:
            "{childName}は もみじを てにもって はしりました。かぜに もみじが ひらひらして、まるで {childName}が あきの なかを とんでいるみたいです。",
          general_child: "{childName}はもみじを手にもって走りました。かぜがきもちいい！",
          pageVisualRole: "emotional_closeup",
          imagePromptTemplate:
            "Emotional close-up of the child running with maple leaves held high in both hands, red leaves trailing behind. The wind lifts their hair and the leaves swirl around them in a joyful autumn dance. Red maple leaf motifs blur with motion. Warm amber autumn light. Watercolor picture book style, joyful autumn run close-up, rich red-gold, rich but uncluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark.",
        }),
        buildAgeSpecificPage({
          textTemplate: "もみじを大切に持って帰った{childName}。あきのいろがかがやいています。{parentMessage}",
          baby_toddler: "もみじ、かえった！たからもの！{parentMessage}",
          preschool_3_4:
            "もみじを たいせつに もって かえった {childName}。あきのいろが かがやいています。{parentMessage}",
          early_reader_5_6:
            "もみじを たいせつに もって かえった {childName}。あきの いろが {childName}の てのひらで かがやいています。{parentMessage}",
          early_elementary_7_8:
            "もみじを たいせつに もって かえった {childName}。あきの いろが {childName}の てのひらで かがやいています。あきの いちにちが、たからものになりました。{parentMessage}",
          general_child:
            "もみじを たいせつに もって かえった {childName}。あきのいろが かがやいています。{parentMessage}",
          pageVisualRole: "quiet_ending",
          imagePromptTemplate:
            "Wide quiet ending shot of the child walking home through a golden autumn avenue of trees, holding their treasured maple leaf in both hands. Red maple leaf motifs carpet the ground ahead. Warm amber evening light filters through the canopy. Watercolor picture book style, tender autumn memory ending, warm golden glow, rich but not cluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark.",
        }),
      ],
    },
  },
  "fixed-insect-hunt": {
    name: "むしとり たいかい",
    description: "虫かごを持って虫取りに挑戦！夏の草むらで生き物を見つける冒険絵本",
    icon: "🪲",
    categoryGroupId: "favorite-worlds",
    subcategoryId: "nature-exploration",
    parentIntent: "自然や生き物への好奇心を育てたい",
    recommendedAgeMin: 2,
    recommendedAgeMax: 8,
    requiredInputs: ["childName"],
    optionalInputs: ["parentMessage"],
    themeTags: ["insects", "nature", "exploration", "summer"],
    creationMode: "fixed_template",
    priceTier: "ume",
    storyCostLevel: "none",
    sampleImageUrl: "/images/templates/fixed-insect-hunt.webp",
    sampleImageAlt: "虫取り大会に挑戦する子どもの絵本イメージ",
    visualDirection:
      "Bright lush summer field and forest edge atmosphere, green bug cage motifs as symbol of discovery, vivid greens and naturalistic wonder.",
    order: 102,
    active: true,
    systemPrompt: "固定テンプレートを使って、虫取り冒険の絵本を作ります。",
    fixedStory: {
      previewImageUrl: "/images/templates/fixed-insect-hunt.webp",
      titleTemplate: "{childName}の むしとり だいぼうけん",
      coverImagePromptTemplate:
        withFixedImagePromptSafety("Picture book cover illustration: an excited child holding a green bug cage up to examine a captured insect, surrounded by tall summer grasses and colorful insects, green bug cage motifs scattered around like adventure badges, bright energetic summer nature mood, soft watercolor style, rounded child-safe composition, rich but not cluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark."),
      titleSpreadTextTemplate: "むしを さがしに いくぞ！",
      openingNarrationTemplate:
        "みどりの むしかごを もって、{childName}は くさばへ でかけます。「どんな むしに あえるかな？」",
      pages: [
        buildAgeSpecificPage({
          textTemplate: "{childName}は虫かごをもってくさむらに入りました。いるかな？",
          baby_toddler: "むしかご、もった！くさむら、入る！むし、どこ？",
          preschool_3_4:
            "{childName}は むしかごを もって くさむらに はいりました。いるかな？",
          early_reader_5_6:
            "{childName}は みどりの むしかごを もって くさむらに はいりました。しずかに、しずかに。むしを おどろかせないように。",
          early_elementary_7_8:
            "{childName}は みどりの むしかごを もって くさむらに はいりました。しずかに、ゆっくりと。むしは かんたんには つかまりません。",
          general_child: "{childName}は虫かごをもってくさむらに入りました。いるかな？",
          pageVisualRole: "opening_establishing",
          imagePromptTemplate:
            "Establishing wide shot of a bright summer field with tall green grasses and wildflowers. The child steps carefully into the field, green bug cage in hand, scanning the grass intently. Tiny insects visible here and there in the grass. Green bug cage motifs dot the field like adventure markers. Bright summer light. Watercolor picture book style, excited nature explorer mood, rich but uncluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark.",
        }),
        buildAgeSpecificPage({
          textTemplate: "草の葉にバッタがいました！{childName}はそっと近づきます。",
          baby_toddler: "バッタ！いた！そっと、そっと…",
          preschool_3_4:
            "くさの はに バッタが いました！{childName}は そっと ちかづきます。",
          early_reader_5_6:
            "くさの はに バッタが いました！{childName}は いきを のんで、そっと そっと ちかづきます。",
          early_elementary_7_8:
            "くさの はに バッタが いました！{childName}は いきを のんで、そっと ちかづきます。にげないで、にげないで、と こころのなかで ねがいながら。",
          general_child: "草の葉にバッタがいました！{childName}はそっと近づきます。",
          pageVisualRole: "discovery",
          imagePromptTemplate:
            "Discovery medium shot of the child crouched low in the grass, eyes wide and focused on a large grasshopper perched on a grass blade right in front of them. The child holds the open bug cage ready. Green bug cage motifs glow near the discovery. Bright dappled summer light. Watercolor picture book style, intense insect hunt focus mood, rich but uncluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark.",
        }),
        buildAgeSpecificPage({
          textTemplate: "つかまえた！{childName}の虫かごにバッタが入りました！",
          baby_toddler: "つかまえた！バッタ、はいった！やった！",
          preschool_3_4:
            "つかまえた！{childName}の むしかごに バッタが はいりました！",
          early_reader_5_6:
            "つかまえた！{childName}の むしかごに バッタが はいりました！「やった！！」と こころのなかで さけびながら、むしかごを そっと もちあげます。",
          early_elementary_7_8:
            "つかまえた！{childName}の むしかごに バッタが はいりました！「やった！！」むしかごの なかで バッタが ぴょんぴょんしています。",
          general_child: "つかまえた！{childName}の虫かごにバッタが入りました！",
          pageVisualRole: "emotional_closeup",
          imagePromptTemplate:
            "Emotional close-up of the child holding up a green bug cage with a captured grasshopper inside, face absolutely radiant with triumph and excitement. Green bug cage motifs burst around the victorious moment. Bright summer light. Watercolor picture book style, triumphant insect hunter close-up, rich but uncluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark.",
        }),
        buildAgeSpecificPage({
          textTemplate: "バッタをよく見てから、{childName}はそっと逃がしてあげました。またね！{parentMessage}",
          baby_toddler: "バッタ、みた！さようなら！またね！{parentMessage}",
          preschool_3_4:
            "バッタを よく みてから、{childName}は そっと にがしてあげました。またね！{parentMessage}",
          early_reader_5_6:
            "バッタを よく みてから、{childName}は そっと にがしてあげました。「またね！」バッタは くさむらに ぴょんと とんでいきました。{parentMessage}",
          early_elementary_7_8:
            "バッタを よく みてから、{childName}は そっと にがしてあげました。「またね！」バッタは くさむらに とんでいきました。むしの せいかつが あるから。{parentMessage}",
          general_child:
            "バッタを よく みてから、{childName}は そっと にがしてあげました。またね！{parentMessage}",
          pageVisualRole: "quiet_ending",
          imagePromptTemplate:
            "Wide quiet ending shot of the child opening the green bug cage at the edge of the field, releasing the grasshopper back into the tall grass. The grasshopper leaps free into the sunlit grass. Green bug cage motifs float gently. Bright warm summer light. Watercolor picture book style, gentle nature release ending, compassionate summer mood, rich but not cluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark.",
        }),
      ],
    },
  },
  "fixed-flower-garden": {
    name: "おはなばたけ で",
    description: "お花畑を散歩して、お気に入りの花を見つけて。自然の美しさに出会う絵本",
    icon: "🌻",
    categoryGroupId: "daily-life",
    subcategoryId: "nature-walk",
    parentIntent: "日常の特別な瞬間を残したい",
    recommendedAgeMin: 1,
    recommendedAgeMax: 7,
    requiredInputs: ["childName"],
    optionalInputs: ["parentMessage"],
    themeTags: ["flowers", "garden", "nature", "beauty"],
    creationMode: "fixed_template",
    priceTier: "ume",
    storyCostLevel: "none",
    sampleImageUrl: "/images/templates/fixed-flower-garden.webp",
    sampleImageAlt: "お花畑で遊ぶ子どもの絵本イメージ",
    visualDirection:
      "Bright cheerful flower garden, sunflower motifs as the recurring symbol of warmth and joy, colorful blooms everywhere, golden garden light.",
    order: 103,
    active: true,
    systemPrompt: "固定テンプレートを使って、お花畑での散歩絵本を作ります。",
    fixedStory: {
      previewImageUrl: "/images/templates/fixed-flower-garden.webp",
      titleTemplate: "{childName}と おはなばたけ",
      coverImagePromptTemplate:
        withFixedImagePromptSafety("Picture book cover illustration: a joyful child standing in a magnificent sunflower field, arms spread wide in delight, surrounded by towering sunflowers taller than their head, sunflower motifs glowing like small suns around the child, bright golden garden mood, soft watercolor style, rounded child-safe composition, rich but not cluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark."),
      titleSpreadTextTemplate: "おはなばたけに いこう！",
      openingNarrationTemplate:
        "おひさまが かがやく おはなばたけに {childName}は やってきました。いろとりどりの おはなが さいています。ひまわりが にこにこしています。",
      pages: [
        buildAgeSpecificPage({
          textTemplate: "{childName}はお花畑に入りました。きれい！どこを見てもお花！",
          baby_toddler: "おはな！きれい！いっぱい！",
          preschool_3_4:
            "{childName}は おはなばたけに はいりました。きれい！どこを みても おはな！",
          early_reader_5_6:
            "{childName}は おはなばたけに はいりました。きれい！どこを みても いろとりどりの おはなです。かぜが ふくと はなびらが ゆれて、あまい においが します。",
          early_elementary_7_8:
            "{childName}は おはなばたけに はいりました。きれい！どこを みても いろとりどりの おはなです。かぜが ふくと はなびらが ゆれて、なんとも いえない あまい においが します。",
          general_child: "{childName}はお花畑に入りました。きれい！どこを見てもお花！",
          pageVisualRole: "opening_establishing",
          imagePromptTemplate:
            "Establishing wide shot of a magnificent flower garden or meadow in full bloom — sunflowers, daisies, cosmos, poppies in every direction. The child stands at the garden entrance, arms spread wide, overwhelmed by the beautiful abundance. Sunflower motifs beam like warm suns throughout the scene. Golden garden light. Watercolor picture book style, wonder-filled flower garden arrival, rich but uncluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark.",
        }),
        buildAgeSpecificPage({
          textTemplate: "ひまわりが{childName}よりも大きかった！上を見るとお花の顔。",
          baby_toddler: "ひまわり！おおきい！{childName}より！",
          preschool_3_4:
            "ひまわりが {childName}よりも おおきかった！うえを みると おはなの かお。",
          early_reader_5_6:
            "ひまわりが {childName}よりも ずっと おおきかった！うえを みあげると、おおきな ひまわりの かおが にこっと していました。",
          early_elementary_7_8:
            "ひまわりが {childName}よりも ずっと おおきかった！うえを みあげると、おおきな ひまわりが にこっと わらっているみたいで、{childName}も にこにこ してしまいます。",
          general_child: "ひまわりが{childName}よりも大きかった！上を見るとお花の顔。",
          pageVisualRole: "discovery",
          imagePromptTemplate:
            "Discovery medium shot of the child looking straight up at enormous sunflowers towering above them, dwarfed by the tall stems. The sunflower faces seem to smile down. Sunflower motifs radiate warm energy all around. Golden garden light. Watercolor picture book style, magical flower discovery mood, warm golden yellows and greens, rich but uncluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark.",
        }),
        buildAgeSpecificPage({
          textTemplate: "{childName}はいちばんすきなお花を見つけました。「これがいちばんきれい！」",
          baby_toddler: "これ！いちばん！きれい！すき！",
          preschool_3_4:
            "{childName}は いちばん すきな おはなを みつけました。「これが いちばん きれい！」",
          early_reader_5_6:
            "{childName}は いちばん すきな おはなを みつけました。「これが いちばん きれい！」と こころのなかで きめて、じっと みつめました。",
          early_elementary_7_8:
            "{childName}は いちばん すきな おはなを みつけました。それは ひとつの ひまわりで、「これが いちばん きれい！」と {childName}は こころのなかで きめました。",
          general_child: "{childName}はいちばんすきなお花を見つけました。「これがいちばんきれい！」",
          pageVisualRole: "emotional_closeup",
          imagePromptTemplate:
            "Emotional close-up of the child's face next to their favorite sunflower, both faces seemingly at the same level, both glowing. The child's expression is pure joy and connection. Sunflower motifs radiate warmth around them both. Golden garden light. Watercolor picture book style, intimate flower friendship close-up, warm golden glow, rich but uncluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark.",
        }),
        buildAgeSpecificPage({
          textTemplate: "おはなばたけの{childName}はひまわりのようにかがやいています。{parentMessage}",
          baby_toddler: "おはな、きれかった！また いく！{parentMessage}",
          preschool_3_4:
            "おはなばたけの {childName}は ひまわりのように かがやいています。{parentMessage}",
          early_reader_5_6:
            "おはなばたけの {childName}は ひまわりのように かがやいています。おはなも {childName}も、おひさまが だいすきです。{parentMessage}",
          early_elementary_7_8:
            "おはなばたけの {childName}は ひまわりのように かがやいています。おはなも {childName}も、おひさまのほうを むいて さいています。{parentMessage}",
          general_child:
            "おはなばたけの {childName}は ひまわりのように かがやいています。{parentMessage}",
          pageVisualRole: "quiet_ending",
          imagePromptTemplate:
            "Wide quiet ending shot of the child walking through the sunflower garden path toward a warm golden sunset, sunflowers framing the path on both sides like an honor guard. Sunflower motifs glow warmly. Golden evening light. Watercolor picture book style, warm garden dream ending, luminous golden glow, rich but not cluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark.",
        }),
      ],
    },
  },
  "fixed-making-onigiri": {
    name: "おにぎり つくろう",
    description: "おにぎり作りに挑戦！はじめて自分で作ったおにぎりの特別なおいしさを伝える絵本",
    icon: "🍙",
    categoryGroupId: "daily-life",
    subcategoryId: "cooking",
    parentIntent: "日常の特別な瞬間を残したい",
    recommendedAgeMin: 2,
    recommendedAgeMax: 8,
    requiredInputs: ["childName"],
    optionalInputs: ["parentMessage"],
    themeTags: ["cooking", "onigiri", "food", "family"],
    creationMode: "fixed_template",
    priceTier: "ume",
    storyCostLevel: "none",
    sampleImageUrl: "/images/templates/fixed-making-onigiri.webp",
    sampleImageAlt: "おにぎりを作る子どもの絵本イメージ",
    visualDirection:
      "Warm cheerful kitchen atmosphere with nori seaweed fragment motifs scattered like confetti, family cooking joy, warm rice-white tones.",
    order: 104,
    active: true,
    systemPrompt: "固定テンプレートを使って、おにぎり作り体験の絵本を作ります。",
    fixedStory: {
      previewImageUrl: "/images/templates/fixed-making-onigiri.webp",
      titleTemplate: "{childName}の おにぎり",
      coverImagePromptTemplate:
        withFixedImagePromptSafety("Picture book cover illustration: a happy child holding up a self-made triangle onigiri triumphantly, bits of nori seaweed visible on the rice, the kitchen behind warm and cozy, nori seaweed fragment motifs scattered around like confetti, warm family cooking mood, soft watercolor style, rounded child-safe composition, rich but not cluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark."),
      titleSpreadTextTemplate: "じぶんで おにぎり つくるよ！",
      openingNarrationTemplate:
        "きょう {childName}は おにぎりを つくります。ふかふかの しろいごはんに、のりの きれはしが ならんでいます。",
      pages: [
        buildAgeSpecificPage({
          textTemplate: "{childName}はてのひらにごはんをのせました。あたたかい！",
          baby_toddler: "ごはん、のせた！あたたかい！てのひら！",
          preschool_3_4:
            "{childName}は てのひらに ごはんを のせました。あたたかい！",
          early_reader_5_6:
            "{childName}は てのひらに ごはんを のせました。あたたかくて、ふわふわです。これを おにぎりにするんだ。",
          early_elementary_7_8:
            "{childName}は てのひらに ごはんを のせました。あたたかくて ふわふわしたごはんが てのひらに のって、「おにぎりにするぞ！」と きもちが たかぶりました。",
          general_child: "{childName}はてのひらにごはんをのせました。あたたかい！",
          pageVisualRole: "opening_establishing",
          imagePromptTemplate:
            "Establishing wide shot of a warm cheerful kitchen. The child stands at the kitchen counter, hands covered in plastic wrap holding steaming white rice, concentrating on starting their onigiri. An adult nearby for guidance. Nori seaweed fragment motifs dot the counter surface. Warm kitchen light. Watercolor picture book style, warm family cooking beginning mood, rich but uncluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark.",
        }),
        buildAgeSpecificPage({
          textTemplate: "ぎゅっ、ぎゅっ！三角になってきた！難しいけど楽しい！",
          baby_toddler: "ぎゅっぎゅっ！さんかく！できてる！",
          preschool_3_4:
            "ぎゅっ、ぎゅっ！さんかくに なってきた！むずかしいけど たのしい！",
          early_reader_5_6:
            "ぎゅっ、ぎゅっ！てのひらで ごはんを おして、さんかくを つくります。むずかしいけど たのしい！",
          early_elementary_7_8:
            "ぎゅっ、ぎゅっ！てのひらで ごはんを おして、さんかくを つくります。むずかしいけど、かたちが できてくると うれしくなります。",
          general_child: "ぎゅっ、ぎゅっ！三角になってきた！難しいけど楽しい！",
          pageVisualRole: "discovery",
          imagePromptTemplate:
            "Discovery medium shot of the child's small hands pressing and shaping the rice into a triangle, tongue out in concentration. The onigiri shape is starting to form. Nori seaweed fragment motifs float around the cooking scene. Warm kitchen light. Watercolor picture book style, focused cooking craft mood, rich but uncluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark.",
        }),
        buildAgeSpecificPage({
          textTemplate: "のりをまいたらできあがり！{childName}がつくったおにぎりです！",
          baby_toddler: "のり、まいた！できた！おにぎり！",
          preschool_3_4:
            "のりを まいたら できあがり！{childName}が つくった おにぎりです！",
          early_reader_5_6:
            "のりを まいたら できあがり！{childName}が じぶんで つくった さんかくおにぎりです！",
          early_elementary_7_8:
            "のりを まいたら できあがり！{childName}が じぶんで つくった さんかくおにぎり。のりの きれはしが ぴかっと ひかって います。",
          general_child: "のりをまいたらできあがり！{childName}がつくったおにぎりです！",
          pageVisualRole: "emotional_closeup",
          imagePromptTemplate:
            "Emotional close-up of the child holding up their completed triangle onigiri with both hands, presenting it like a trophy. The rice is white and the nori seaweed wraps the bottom. The child's face beams with pride. Nori seaweed fragment motifs gleam around the completed onigiri. Warm kitchen light. Watercolor picture book style, proud cooking achievement close-up, rich but uncluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark.",
        }),
        buildAgeSpecificPage({
          textTemplate: "じぶんでつくったおにぎりはとくべつにおいしい！{parentMessage}",
          baby_toddler: "おいしい！じぶんで つくった！{parentMessage}",
          preschool_3_4:
            "じぶんで つくった おにぎりは とくべつに おいしい！{parentMessage}",
          early_reader_5_6:
            "じぶんで つくった おにぎりは とくべつに おいしい！「せかいで いちばん おいしい！」と {childName}は おもいました。{parentMessage}",
          early_elementary_7_8:
            "じぶんで つくった おにぎりは とくべつに おいしい！てまひまを かけた ものは、なぜか いちだんと おいしく かんじます。{parentMessage}",
          general_child:
            "じぶんで つくった おにぎりは とくべつに おいしい！{parentMessage}",
          pageVisualRole: "quiet_ending",
          imagePromptTemplate:
            "Wide quiet ending shot of the child sitting at the table with family, eating their homemade onigiri with a blissful expression. The remaining onigiri sit on a plate. Nori seaweed fragment motifs dot the table warmly. Warm home light. Watercolor picture book style, warm family mealtime ending, cozy home atmosphere, rich but not cluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark.",
        }),
      ],
    },
  },
  "fixed-fruit-picking": {
    name: "くだもの がり",
    description: "くだもの狩りに行った日！大きな果物を自分でもいだ特別な思い出絵本",
    icon: "🍎",
    categoryGroupId: "memories",
    subcategoryId: "outing",
    parentIntent: "特別な思い出を絵本に残したい",
    recommendedAgeMin: 1,
    recommendedAgeMax: 8,
    requiredInputs: ["childName"],
    optionalInputs: ["parentMessage"],
    themeTags: ["fruit-picking", "family-outing", "nature", "memories"],
    creationMode: "fixed_template",
    priceTier: "ume",
    storyCostLevel: "none",
    sampleImageUrl: "/images/templates/fixed-fruit-picking.webp",
    sampleImageAlt: "くだもの狩りをする子どもの絵本イメージ",
    visualDirection:
      "Bright orchard atmosphere loaded with fruit, red apple motifs as the symbol of discovery and harvest joy, rich green and red palette.",
    order: 105,
    active: true,
    systemPrompt: "固定テンプレートを使って、くだもの狩りの思い出絵本を作ります。",
    fixedStory: {
      previewImageUrl: "/images/templates/fixed-fruit-picking.webp",
      titleTemplate: "{childName}の くだもの がり",
      coverImagePromptTemplate:
        withFixedImagePromptSafety("Picture book cover illustration: a delighted child reaching up to pick a shiny red apple from an apple tree in a lush orchard, the branch bending down, red apple motifs hanging like ornaments everywhere, bright harvest joy, soft watercolor style, rounded child-safe composition, rich but not cluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark."),
      titleSpreadTextTemplate: "くだものを もぎにいくよ！",
      openingNarrationTemplate:
        "くだものの えんに やってきた {childName}。きに あかい りんごが いっぱい なっています。「もいでいいの？！」",
      pages: [
        buildAgeSpecificPage({
          textTemplate: "{childName}はくだもの園に来ました。木がりんごでいっぱい！",
          baby_toddler: "りんご！いっぱい！あかい！きれい！",
          preschool_3_4:
            "{childName}は くだものえんに きました。きが りんごで いっぱい！",
          early_reader_5_6:
            "{childName}は くだものえんに きました。みあげると、きに あかい りんごが いっぱい なっています。「これ、ぜんぶ たべていいの？！」",
          early_elementary_7_8:
            "{childName}は くだものえんに きました。みあげると、たかい きの えだに あかい りんごが いっぱい なっています。「じぶんで もいでいいんだ！」とわくわくしました。",
          general_child: "{childName}はくだもの園に来ました。木がりんごでいっぱい！",
          pageVisualRole: "opening_establishing",
          imagePromptTemplate:
            "Establishing wide shot of a beautiful fruit orchard with apple trees laden with bright red apples. The child stands at the orchard entrance, looking up in amazement at the abundance. Red apple motifs hang from every branch. Warm sunny orchard light. Watercolor picture book style, magical abundance arrival mood, rich red-green palette, rich but uncluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark.",
        }),
        buildAgeSpecificPage({
          textTemplate: "{childName}は大きくて赤いりんごを見つけました。これをもぐぞ！",
          baby_toddler: "おおきい りんご！これ！もぐ！",
          preschool_3_4:
            "{childName}は おおきくて あかい りんごを みつけました。これを もぐぞ！",
          early_reader_5_6:
            "{childName}は えだを みあげて、いちばん おおきくて あかい りんごを みつけました。「これを もぐぞ！」と めを かがやかせました。",
          early_elementary_7_8:
            "{childName}は えだを みあげて、いちばん おおきくて あかくて つやつやの りんごを みつけました。「これだ！これを もぐぞ！」と こころに きめました。",
          general_child: "{childName}は大きくて赤いりんごを見つけました。これをもぐぞ！",
          pageVisualRole: "discovery",
          imagePromptTemplate:
            "Discovery medium shot of the child reaching up on tiptoe toward a large perfect red apple on a branch just above their reach, eyes fixed on their target with intense focus. Red apple motifs glow invitingly nearby. Warm orchard light. Watercolor picture book style, determined harvest hunt mood, rich but uncluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark.",
        }),
        buildAgeSpecificPage({
          textTemplate: "もげた！{childName}は大きなりんごを両手で持ちました！",
          baby_toddler: "もげた！おおきい！りょうてで もった！",
          preschool_3_4:
            "もげた！{childName}は おおきな りんごを りょうてで もちました！",
          early_reader_5_6:
            "もげた！{childName}は おおきな りんごを りょうてで もちました！ずっしりと おもくて、つやつやしています。",
          early_elementary_7_8:
            "もげた！{childName}は おおきな りんごを りょうてで もちました！ずっしりと おもくて、つやつやして、いい においが します。「じぶんで もいだ！」",
          general_child: "もげた！{childName}は大きなりんごを両手で持ちました！",
          pageVisualRole: "emotional_closeup",
          imagePromptTemplate:
            "Emotional close-up of the child holding a large shiny red apple in both hands, face beaming with pride and achievement. Red apple motifs radiate from the harvested fruit. Warm orchard sunlight. Watercolor picture book style, triumphant harvest close-up, luminous red apple glow, rich but uncluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark.",
        }),
        buildAgeSpecificPage({
          textTemplate: "じぶんでもいだりんごを食べた{childName}。世界一おいしかった！{parentMessage}",
          baby_toddler: "りんご、おいしい！じぶんで もいだ！{parentMessage}",
          preschool_3_4:
            "じぶんで もいだ りんごを たべた {childName}。せかいいち おいしかった！{parentMessage}",
          early_reader_5_6:
            "じぶんで もいだ りんごを たべた {childName}。せかいいち おいしかった！このあじは、ずっと ずっと おぼえています。{parentMessage}",
          early_elementary_7_8:
            "じぶんで もいだ りんごを たべた {childName}。せかいいち おいしかった！じぶんで とった ものは、なぜか いつもより ずっと おいしいです。{parentMessage}",
          general_child:
            "じぶんで もいだ りんごを たべた {childName}。せかいいち おいしかった！{parentMessage}",
          pageVisualRole: "quiet_ending",
          imagePromptTemplate:
            "Wide quiet ending shot of the child sitting at a picnic table in the orchard, biting into their apple with an expression of pure bliss. Red apple motifs gleam on the table. Family smiles around them. Warm golden orchard light. Watercolor picture book style, warm harvest memory ending, golden orchard light, rich but not cluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark.",
        }),
      ],
    },
  },
  "fixed-first-swimming": {
    name: "はじめての スイミング",
    description: "はじめてプールに入った日！水の中の不思議と楽しさを記念する思い出絵本",
    icon: "🏊",
    categoryGroupId: "memories",
    subcategoryId: "first-experience",
    parentIntent: "特別な思い出を絵本に残したい",
    recommendedAgeMin: 1,
    recommendedAgeMax: 7,
    requiredInputs: ["childName"],
    optionalInputs: ["parentMessage"],
    themeTags: ["swimming", "pool", "first-experience", "water"],
    creationMode: "fixed_template",
    priceTier: "ume",
    storyCostLevel: "none",
    sampleImageUrl: "/images/templates/fixed-first-swimming.webp",
    sampleImageAlt: "はじめてプールに入った子どもの絵本イメージ",
    visualDirection:
      "Bright sparkling pool atmosphere, blue bubble motifs floating like tiny moons through each scene, summery aquatic joy.",
    order: 106,
    active: true,
    systemPrompt: "固定テンプレートを使って、はじめてのスイミングの思い出絵本を作ります。",
    fixedStory: {
      previewImageUrl: "/images/templates/fixed-first-swimming.webp",
      titleTemplate: "{childName}の はじめての スイミング",
      coverImagePromptTemplate:
        withFixedImagePromptSafety("Picture book cover illustration: a delighted child in swimwear splashing happily in a sparkling pool, blue water bubbles floating all around them like tiny moons, bright summer pool atmosphere, aqua blue palette, soft watercolor style, rounded child-safe composition, rich but not cluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark."),
      titleSpreadTextTemplate: "プールに はいるよ！",
      openingNarrationTemplate:
        "きらきら ひかる プールに {childName}は やってきました。あおい みずが きれいです。「はいれるかな？」あおい あわが ぷかぷか うかんでいます。",
      pages: [
        buildAgeSpecificPage({
          textTemplate: "{childName}はプールのふちに立ちました。水が青くてきれい！",
          baby_toddler: "プール！あおい！きれい！はいる？",
          preschool_3_4:
            "{childName}は プールの ふちに たちました。みずが あおくて きれい！",
          early_reader_5_6:
            "{childName}は プールの ふちに たちました。みずが あおくて きれいです。「はいれるかな？」と すこし どきどきします。",
          early_elementary_7_8:
            "{childName}は プールの ふちに たちました。みずが あおくて きれいで、ひかっています。「はいれるかな？」どきどきするけど、たのしそうです。",
          general_child: "{childName}はプールのふちに立ちました。水が青くてきれい！",
          pageVisualRole: "opening_establishing",
          imagePromptTemplate:
            "Establishing wide shot of a bright sunny swimming pool. The child stands at the pool edge in swimwear, toes dangling over the edge, looking down at the sparkling blue water below. Blue water bubbles float invitingly on the surface. Summer sunshine. Watercolor picture book style, excited pre-swim nervousness mood, bright aqua blue, rich but uncluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark.",
        }),
        buildAgeSpecificPage({
          textTemplate: "{childName}はゆっくり水に入りました。つめたい！でも、きもちいい！",
          baby_toddler: "みずに はいった！つめたい！きもちいい！",
          preschool_3_4:
            "{childName}は ゆっくり みずに はいりました。つめたい！でも、きもちいい！",
          early_reader_5_6:
            "{childName}は ゆっくり みずに はいりました。「つめたい！」でも、からだが なれてくると きもちいい！",
          early_elementary_7_8:
            "{childName}は ゆっくり みずに はいりました。「つめたい！」と おもったけど、からだが なれてくると きもちよくなってきます。みずが からだを つつんでくれています。",
          general_child: "{childName}はゆっくり水に入りました。つめたい！でも、きもちいい！",
          pageVisualRole: "discovery",
          imagePromptTemplate:
            "Discovery medium shot of the child wading in the shallow end of the pool, water up to their waist, expression going from tense to pleased. Blue water bubbles float all around them. Sunlight sparkles on the water surface. Watercolor picture book style, pleasant water discovery mood, bright aqua blue, rich but uncluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark.",
        }),
        buildAgeSpecificPage({
          textTemplate: "{childName}はじゃばじゃば水をたたきました！水しぶきがきれい！",
          baby_toddler: "じゃばじゃば！みずしぶき！きれい！",
          preschool_3_4:
            "{childName}は じゃばじゃば みずを たたきました！みずしぶきが きれい！",
          early_reader_5_6:
            "{childName}は じゃばじゃば みずを たたきました！みずしぶきが たかく あがって、きらきら ひかります。",
          early_elementary_7_8:
            "{childName}は じゃばじゃば みずを たたきました！みずしぶきが たかく あがって、きらきら ひかります。あおい あわが プールを うかんでいます。",
          general_child: "{childName}はじゃばじゃば水をたたきました！水しぶきがきれい！",
          pageVisualRole: "emotional_closeup",
          imagePromptTemplate:
            "Emotional close-up of the child splashing water enthusiastically with both arms, water droplets sparkling in the sunlight around them. Blue water bubbles explode from the splashing. The child's face is pure uninhibited summer joy. Watercolor picture book style, joyful water play close-up, sparkling aqua blue, rich but uncluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark.",
        }),
        buildAgeSpecificPage({
          textTemplate: "はじめてのプールで大はしゃぎの{childName}。また来たい！{parentMessage}",
          baby_toddler: "プール、たのしかった！また きたい！{parentMessage}",
          preschool_3_4:
            "はじめての プールで おおはしゃぎの {childName}。また きたい！{parentMessage}",
          early_reader_5_6:
            "はじめての プールで おおはしゃぎの {childName}。あおい みずの なかで、{childName}は もっと すきに なりました。{parentMessage}",
          early_elementary_7_8:
            "はじめての プールで おおはしゃぎの {childName}。あおい みずと あわと、きもちいい きおくが、ずっと のこります。{parentMessage}",
          general_child:
            "はじめての プールで おおはしゃぎの {childName}。また きたい！{parentMessage}",
          pageVisualRole: "quiet_ending",
          imagePromptTemplate:
            "Wide quiet ending shot of the child wrapped in a fluffy towel at the pool edge, still glowing with happiness from the swim, looking back at the pool with longing. Blue water bubbles drift gently on the still pool surface. Summer evening light. Watercolor picture book style, warm summer memory ending, gentle aqua blue, rich but not cluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark.",
        }),
      ],
    },
  },
  "fixed-first-bike": {
    name: "じてんしゃ のれた",
    description: "補助輪なしで自転車に乗れた！何度も転んで、ついに一人でこげた感動の瞬間を贈る絵本",
    icon: "🚲",
    categoryGroupId: "memories",
    subcategoryId: "milestone",
    parentIntent: "特別な思い出を絵本に残したい",
    recommendedAgeMin: 3,
    recommendedAgeMax: 8,
    requiredInputs: ["childName"],
    optionalInputs: ["parentMessage"],
    themeTags: ["bicycle", "milestone", "perseverance", "achievement"],
    creationMode: "fixed_template",
    priceTier: "ume",
    storyCostLevel: "none",
    sampleImageUrl: "/images/templates/fixed-first-bike.webp",
    sampleImageAlt: "自転車に乗れた子どもの絵本イメージ",
    visualDirection:
      "Bright outdoor path, pinwheel windmill motifs spinning with the wind of cycling speed, sense of flight and freedom, energetic joyful mood.",
    order: 107,
    active: true,
    systemPrompt: "固定テンプレートを使って、自転車に乗れた日の感動絵本を作ります。",
    fixedStory: {
      previewImageUrl: "/images/templates/fixed-first-bike.webp",
      titleTemplate: "{childName}、じてんしゃ のれた！",
      coverImagePromptTemplate:
        withFixedImagePromptSafety("Picture book cover illustration: an exhilarated child riding a bicycle solo with no training wheels, arms slightly out for balance, huge triumphant grin, pinwheel windmill motifs spinning in the wake behind the bike, sense of speed and freedom, bright outdoor atmosphere, soft watercolor style, rounded child-safe composition, rich but not cluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark."),
      titleSpreadTextTemplate: "ひとりで こげるかな？",
      openingNarrationTemplate:
        "きょう {childName}は ほじょりんなしの じてんしゃに のれるよう れんしゅうします。かぜぐるまが くるくる まわっています。",
      pages: [
        buildAgeSpecificPage({
          textTemplate: "{childName}は補助輪なしの自転車に乗ります。ドキドキ！",
          baby_toddler: "じてんしゃ！のる！どきどき！",
          preschool_3_4:
            "{childName}は ほじょりんなしの じてんしゃに のります。ドキドキ！",
          early_reader_5_6:
            "{childName}は ほじょりんなしの じてんしゃに はじめて のろうとしています。ドキドキ。たおれないかな？",
          early_elementary_7_8:
            "{childName}は ほじょりんなしの じてんしゃに のろうとしています。ドキドキ。たおれたら いたい。でも、のれるように なりたい。",
          general_child: "{childName}は補助輪なしの自転車に乗ります。ドキドキ！",
          pageVisualRole: "opening_establishing",
          imagePromptTemplate:
            "Establishing wide shot of a sunny park path or neighborhood street. The child straddles a bicycle without training wheels, one foot on the ground, expression a mix of nervousness and determination. A pinwheel windmill spins gently nearby. Warm outdoor light. Watercolor picture book style, brave beginner cycling beginning mood, rich but uncluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark.",
        }),
        buildAgeSpecificPage({
          textTemplate: "たおれても、たおれても、{childName}はまた立ち上がります！",
          baby_toddler: "ころんだ！でも、またのる！あきらめない！",
          preschool_3_4:
            "たおれても、たおれても、{childName}は また たちあがります！",
          early_reader_5_6:
            "たおれても、たおれても、{childName}は また たちあがります！「もいっかい！」と すぐに のろうとします。",
          early_elementary_7_8:
            "たおれても、たおれても、{childName}は また たちあがります。ひざが いたくても、また のる。「もいっかい！」その こころが {childName}を つよくします。",
          general_child: "たおれても、たおれても、{childName}はまた立ち上がります！",
          pageVisualRole: "discovery",
          imagePromptTemplate:
            "Discovery medium shot of the child getting back up after a fall beside the bike, helmet on, knee slightly scraped but expression determined and undaunted. They're already reaching back for the handlebars. Pinwheel windmill motifs spin encouragingly. Warm outdoor light. Watercolor picture book style, resilient perseverance mood, rich but uncluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark.",
        }),
        buildAgeSpecificPage({
          textTemplate: "こげた！ひとりで！{childName}は風のように走りました！",
          baby_toddler: "こげた！ひとりで！かぜみたい！",
          preschool_3_4:
            "こげた！ひとりで！{childName}は かぜのように はしりました！",
          early_reader_5_6:
            "こげた！ひとりで！{childName}は かぜのように はしりました！「うわー！！」こころのなかで さけびながら、まえに すすんでいきます！",
          early_elementary_7_8:
            "こげた！ひとりで！{childName}は かぜのように はしりました！「うわー！！」ながいあいだ できなかったことが、いきなり できるように なった よろこびが はちきれそうです！",
          general_child: "こげた！ひとりで！{childName}は風のように走りました！",
          pageVisualRole: "emotional_closeup",
          imagePromptTemplate:
            "Emotional close-up of the child cycling alone for the first time, expression a burst of pure triumph and freedom — mouth open in a shout of joy, hair flying, eyes sparkling. Pinwheel windmill motifs spin in a blur of speed around them. Warm outdoor light. Watercolor picture book style, triumphant first solo ride close-up, feeling of flight and freedom, rich but uncluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark.",
        }),
        buildAgeSpecificPage({
          textTemplate: "何度転んでも諦めなかった{childName}。かぜぐるまのようにかがやいています。{parentMessage}",
          baby_toddler: "のれた！すごい！かっこいい！{parentMessage}",
          preschool_3_4:
            "なんど ころんでも あきらめなかった {childName}。かぜぐるまのように かがやいています。{parentMessage}",
          early_reader_5_6:
            "なんど ころんでも あきらめなかった {childName}。かぜぐるまのように かがやいています。このきもちを、ずっとわすれないでいてね。{parentMessage}",
          early_elementary_7_8:
            "なんど ころんでも あきらめなかった {childName}。かぜぐるまのように かがやいています。あきらめない こころが、{childName}の さいだいの ちからです。{parentMessage}",
          general_child:
            "なんど ころんでも あきらめなかった {childName}。かぜぐるまのように かがやいています。{parentMessage}",
          pageVisualRole: "quiet_ending",
          imagePromptTemplate:
            "Wide quiet ending shot of the child riding their bicycle down a sunny path, growing smaller in the distance as they ride away confidently, pinwheel windmill motifs spinning in their wake. The path stretches ahead bright and open. Warm golden afternoon light. Watercolor picture book style, hopeful freedom cycling ending, sense of open road ahead, rich but not cluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark.",
        }),
      ],
    },
  },
  "original-ai": {
    name: "オリジナル絵本",
    description: "自由に書いた内容から、AIが一から物語を作ります",
    icon: "✨",
    categoryGroupId: "imagination",
    subcategoryId: "freeform",
    parentIntent: "自由に想像して、ワクワクしてほしい",
    recommendedAgeMin: 2,
    recommendedAgeMax: 8,
    requiredInputs: ["childName", "storyRequest"],
    optionalInputs: ["favorites", "place", "familyMembers", "parentMessage", "lessonToTeach", "memoryToRecreate"],
    themeTags: ["original", "freeform", "custom"],
    isOriginalEntry: true,
    creationMode: "original_ai",
    priceTier: "matsu",
    storyCostLevel: "standard",
    sampleImageUrl: "/images/templates/fantasy.webp",
    sampleImageAlt: "自由なアイデアから広がるオリジナル絵本イメージ",
    visualDirection:
      "Flexible premium storybook mood that can adapt to many scenes while staying warm, child-friendly, expressive, and visually cohesive.",
    order: 20,
    active: true,
    systemPrompt: `あなたは子ども向け絵本の作家です。親の自由入力を中心に、主人公の個性と家族の思いを生かしたオリジナル絵本を作ってください。
- 内容は自由でも、幼児が安心して読めるやさしい構成にしてください。
- 主人公の好きなもの、思い出、教えたいことを必要に応じて自然に織り込んでください。`,
  },

  // ─────────────────────────────────────────────────
  // 穴埋めテンプレート — ひとことで完成するオリジナル絵本
  // ─────────────────────────────────────────────────

  "blank-first-experience": {
    name: "はじめての○○",
    description: "何に挑戦したか一言入れるだけ。初挑戦の瞬間を絵本に。",
    icon: "🌟",
    categoryGroupId: "blank-templates",
    parentIntent: "できるようになってほしい。でも怒らず応援したい",
    recommendedAgeMin: 2,
    recommendedAgeMax: 8,
    requiredInputs: ["childName", "storyRequest"],
    optionalInputs: ["parentMessage"],
    themeTags: ["first-time", "challenge", "achievement", "blank"],
    creationMode: "fixed_template",
    isBlankTemplate: true,
    blankLabel: "何に挑戦しましたか？",
    blankExample: "例：じてんしゃ、スイミング、かけっこ",
    priceTier: "ume",
    storyCostLevel: "none",
    sampleImageUrl: "/images/templates/fixed-first-steps.webp",
    sampleImageAlt: "初挑戦の体験を絵本にしたイメージ",
    visualDirection:
      "Warm encouraging picture-book mood capturing the universal joy of trying something new for the very first time — nervous excitement turning into triumphant pride.",
    order: 110,
    active: true,
    systemPrompt: "穴埋めテンプレートを使って、はじめての挑戦をやさしい絵本にします。",
    fixedStory: {
      titleTemplate: "{childName}の はじめての {storyRequest}",
      previewImageUrl: "/images/templates/fixed-first-steps.webp",
      coverImagePromptTemplate: withFixedImagePromptSafety(
        "Picture book cover illustration: a joyful young child about to try something exciting for the very first time, wide eyes full of anticipation and courage, small glowing star motifs floating around them, warm golden encouraging light, soft watercolor picture book style, rounded child-safe composition, rich but not cluttered"
      ),
      titleSpreadTextTemplate: "はじめてのことに ちょうせん！",
      openingNarrationTemplate:
        "きょうは {childName}にとって、とくべつな日。はじめての {storyRequest}に挑戦します。",
      pages: [
        buildAgeSpecificPage({
          textTemplate:
            "{childName}は、はじめての{storyRequest}に挑戦しました。ドキドキ、わくわく！",
          baby_toddler: "{storyRequest}！{childName}、やる！どきどき！",
          preschool_3_4:
            "{childName}は、はじめての{storyRequest}に挑戦しました。どきどき、わくわく！",
          early_reader_5_6:
            "{childName}は、はじめての{storyRequest}に挑戦することになりました。むねがどきどき、でも心はわくわくしています。",
          early_elementary_7_8:
            "{childName}は、はじめての{storyRequest}に挑戦することになりました。やれるかな？でもやってみたい！",
          general_child:
            "{childName}は、はじめての{storyRequest}に挑戦しました。ドキドキ、わくわく！",
          pageVisualRole: "opening_establishing",
          imagePromptTemplate:
            "Wide establishing shot of a young child standing at the very start of a new challenge, bright eager eyes full of anticipation and nervous energy, posture leaning forward with excitement, warm soft golden light, small sparkling star motifs floating in the air, soft watercolor picture book style, hopeful open mood, rich but not cluttered",
        }),
        buildAgeSpecificPage({
          textTemplate:
            "ちょっとむずかしかったけれど、「もう一かい！」と{childName}はあきらめません。",
          baby_toddler: "むずかしい！でも、もう一かい！",
          preschool_3_4:
            "ちょっとむずかしかったけれど、{childName}はあきらめません。「もう一かい！」",
          early_reader_5_6:
            "うまくいかないことも、{childName}はあきらめません。「もう一かい！もう一かい！」何度もくりかえします。",
          early_elementary_7_8:
            "最初はなかなかうまくいきません。でも{childName}はあきらめず、何度もチャレンジし続けます。",
          general_child:
            "ちょっとむずかしかったけれど、「もう一かい！」と{childName}はあきらめません。",
          pageVisualRole: "action",
          imagePromptTemplate:
            "Mid-shot of a young child trying hard with a look of intense focus and determination, slight frustration but full of fighting spirit and perseverance, warm encouraging light around them, soft watercolor picture book style, motivating determined mood, rich but not cluttered",
        }),
        buildAgeSpecificPage({
          textTemplate: "がんばっているうちに、だんだんコツがつかめてきました！",
          baby_toddler: "できてきた！やった！",
          preschool_3_4: "がんばっているうちに、だんだんコツがつかめてきました！",
          early_reader_5_6:
            "がんばり続けると、だんだんコツがつかめてきました！{childName}の心に自信がむくむくと育ちます。",
          early_elementary_7_8:
            "あきらめずに続けていると、少しずつうまくなっていきます。{childName}には確かな手ごたえが感じられました。",
          general_child: "がんばっているうちに、だんだんコツがつかめてきました！",
          pageVisualRole: "payoff",
          imagePromptTemplate:
            "Shot of a child visibly improving and gaining confidence, posture more upright and assured, a growing smile spreading across their face, small glowing stars appearing around them like a confidence aura, warm golden light, soft watercolor picture book style, blossoming confidence mood, rich but not cluttered",
        }),
        buildAgeSpecificPage({
          textTemplate:
            "やった！できた！{childName}はとびきりのえがおになりました。{parentMessage}",
          baby_toddler: "やった！できた！{parentMessage}",
          preschool_3_4:
            "やった！できた！{childName}はとびきりのえがおになりました。{parentMessage}",
          early_reader_5_6:
            "やった！できた！{childName}の顔は、今まで見た中でいちばんの笑顔になりました。{parentMessage}",
          early_elementary_7_8:
            "やった！できた！{childName}は胸がいっぱいになりました。挑戦して、よかった。{parentMessage}",
          general_child:
            "やった！できた！{childName}はとびきりのえがおになりました。{parentMessage}",
          pageVisualRole: "emotional_closeup",
          imagePromptTemplate:
            "Close-up of a joyful child beaming with the biggest smile after achieving success for the first time, arms raised or fists pumped in triumph, golden light radiating around them, star motifs bursting with joy, soft watercolor picture book style, pure triumphant happiness close-up, rich but not cluttered",
        }),
      ],
    },
  },

  "blank-first-experience-8p": {
    name: "はじめての○○",
    description: "何に挑戦したか一言入れるだけ。初挑戦の瞬間を絵本に。",
    icon: "🌟",
    categoryGroupId: "blank-templates",
    parentIntent: "できるようになってほしい。でも怒らず応援したい",
    recommendedAgeMin: 2,
    recommendedAgeMax: 8,
    requiredInputs: ["childName", "storyRequest"],
    optionalInputs: ["parentMessage"],
    themeTags: ["first-time", "challenge", "achievement", "blank"],
    creationMode: "fixed_template",
    isBlankTemplate: true,
    blankLabel: "何に挑戦しましたか？",
    blankExample: "例：じてんしゃ、スイミング、かけっこ",
    priceTier: "take",
    storyCostLevel: "none",
    sampleImageUrl: "/images/templates/fixed-first-steps.webp",
    sampleImageAlt: "初挑戦の体験を絵本にしたイメージ",
    visualDirection:
      "Warm encouraging picture-book mood capturing the universal joy of trying something new for the very first time — nervous excitement turning into triumphant pride.",
    order: 111,
    active: true,
    systemPrompt: "穴埋めテンプレートを使って、はじめての挑戦をやさしい絵本にします。",
    fixedStory: {
      titleTemplate: "{childName}の はじめての {storyRequest}",
      previewImageUrl: "/images/templates/fixed-first-steps.webp",
      coverImagePromptTemplate: withFixedImagePromptSafety(
        "Picture book cover illustration: a joyful young child about to try something exciting for the very first time, wide eyes full of anticipation and courage, small glowing star motifs floating around them, warm golden encouraging light, soft watercolor picture book style, rounded child-safe composition, rich but not cluttered"
      ),
      titleSpreadTextTemplate: "はじめてのことに ちょうせん！",
      openingNarrationTemplate:
        "きょうは {childName}にとって、とくべつな日。はじめての {storyRequest}に挑戦します。",
      pages: [
        buildAgeSpecificPage({
          textTemplate:
            "{childName}は、はじめての{storyRequest}に挑戦することになりました。",
          preschool_3_4:
            "{childName}は、はじめての{storyRequest}に挑戦することになりました。",
          early_reader_5_6:
            "{childName}は、はじめての{storyRequest}に挑戦する日がやってきました。むねがどきどきします。",
          early_elementary_7_8:
            "{childName}は、はじめての{storyRequest}に挑戦する日がやってきました。心のなかで「やるぞ！」と言いました。",
          general_child:
            "{childName}は、はじめての{storyRequest}に挑戦することになりました。",
          pageVisualRole: "opening_establishing",
          imagePromptTemplate:
            "Wide establishing shot of a young child at the very start of a new adventure, standing tall with bright excited eyes full of anticipation, warm golden morning light, small star motifs in the air, soft watercolor picture book style, excited arrival mood, rich but not cluttered",
        }),
        buildAgeSpecificPage({
          textTemplate: "「どんなかんじかな？」{childName}はじっと見つめています。",
          preschool_3_4: "「どんなかんじかな？」{childName}はじっと見つめています。",
          early_reader_5_6:
            "「どんなかんじかな？」{childName}はじっと見つめています。はじめてのことは、なんでもドキドキするものです。",
          early_elementary_7_8:
            "「どんなかんじかな？」{childName}はじっと観察しています。やってみないと分からないことが、たくさんあります。",
          general_child: "「どんなかんじかな？」{childName}はじっと見つめています。",
          pageVisualRole: "discovery",
          imagePromptTemplate:
            "Close-up of a curious child leaning forward and studying something intently, big curious eyes full of wonder, a thoughtful expression on their face, warm soft light, soft watercolor picture book style, curious observing mood, rich but not cluttered",
        }),
        buildAgeSpecificPage({
          textTemplate:
            "はじめてのことは、思ったよりむずかしい。でも{childName}はあきらめません。",
          preschool_3_4:
            "はじめてのことは、むずかしいな。でも{childName}はあきらめません。",
          early_reader_5_6:
            "はじめてのことは、思ったよりむずかしい。でも{childName}は「やめない！」と心にきめました。",
          early_elementary_7_8:
            "はじめてのことは、思ったよりずっとむずかしいものです。でも{childName}は「ぜったいにあきらめない」と心にきめました。",
          general_child:
            "はじめてのことは、思ったよりむずかしい。でも{childName}はあきらめません。",
          pageVisualRole: "setback_or_question",
          imagePromptTemplate:
            "Mid-shot of a child facing a challenge with a look of concentration — a slight furrow in their brow but eyes still determined, not giving up, warm soft light, soft watercolor picture book style, perseverance in difficulty mood, rich but not cluttered",
        }),
        buildAgeSpecificPage({
          textTemplate: "「もう一かい！もう一かい！」{childName}はなんども挑戦します。",
          preschool_3_4: "「もう一かい！もう一かい！」{childName}はなんども挑戦します。",
          early_reader_5_6:
            "「もう一かい！もう一かい！」{childName}はなんども繰り返します。あきらめない心が、{childName}の中にあります。",
          early_elementary_7_8:
            "「もう一かい！もう一かい！」{childName}は何度も挑戦します。くじけそうになっても、立ち上がる力があります。",
          general_child: "「もう一かい！もう一かい！」{childName}はなんども挑戦します。",
          pageVisualRole: "action",
          imagePromptTemplate:
            "Action shot of a child actively trying again with renewed energy and determination, fists clenched in effort, an expression of fierce willpower, light and star motifs encouraging them from the sides, soft watercolor picture book style, never-give-up action mood, rich but not cluttered",
        }),
        buildAgeSpecificPage({
          textTemplate: "すると、だんだんうまくいくようになってきました！",
          preschool_3_4: "すると、だんだんうまくいくようになってきました！",
          early_reader_5_6:
            "すると、だんだんうまくいくようになってきました！何かが体でわかってきた気がします。",
          early_elementary_7_8:
            "あきらめずに続けていると、少しずつうまくいくようになってきました。努力が実ってきたのです。",
          general_child: "すると、だんだんうまくいくようになってきました！",
          pageVisualRole: "payoff",
          imagePromptTemplate:
            "Shot of a child showing visible improvement, a growing smile and lifted posture, confidence beginning to radiate, warm golden light strengthening around them, star motifs beginning to glow, soft watercolor picture book style, growing success mood, rich but not cluttered",
        }),
        buildAgeSpecificPage({
          textTemplate: "「あ！できた！」思わず声が出ました。",
          preschool_3_4: "「あ！できた！」思わず声が出ました。",
          early_reader_5_6:
            "「あ！できた！」思わず声が出ました。{childName}の心に、あたたかい気持ちが広がります。",
          early_elementary_7_8:
            "「あ！できた！」思わず声が出ました。これが本当にできた瞬間の気持ちです。",
          general_child: "「あ！できた！」思わず声が出ました。",
          pageVisualRole: "emotional_closeup",
          imagePromptTemplate:
            "Close-up of a child's face in the exact moment of breakthrough success, eyes wide open with surprise and joy, a spontaneous huge smile, golden light bursting around their face, star motifs exploding with celebration, soft watercolor picture book style, breakthrough moment close-up, rich but not cluttered",
        }),
        buildAgeSpecificPage({
          textTemplate:
            "{childName}はできたうれしさで、からだいっぱいになりました。",
          preschool_3_4:
            "{childName}はできたうれしさで、からだいっぱいになりました。",
          early_reader_5_6:
            "{childName}はできたうれしさで、からだいっぱいになりました。挑戦してよかった、と思います。",
          early_elementary_7_8:
            "{childName}はできたうれしさで、からだいっぱいになりました。あきらめなくてよかった。本当にそう思いました。",
          general_child:
            "{childName}はできたうれしさで、からだいっぱいになりました。",
          pageVisualRole: "payoff",
          imagePromptTemplate:
            "Triumphant wide shot of the child with arms spread wide in pure joy, face radiant with pride and happiness, warm golden light flooding the scene, stars and sparkles swirling all around them, soft watercolor picture book style, full triumphant joy mood, rich but not cluttered",
        }),
        buildAgeSpecificPage({
          textTemplate:
            "はじめてのことに挑戦した日のことを、{childName}はずっと覚えているでしょう。{parentMessage}",
          baby_toddler:
            "はじめてのことに挑戦した日のことを、{childName}はずっと覚えているでしょう。{parentMessage}",
          preschool_3_4:
            "はじめてのことに挑戦した日のことを、{childName}はずっと覚えているでしょう。{parentMessage}",
          early_reader_5_6:
            "はじめてのことに挑戦した日のことを、{childName}はずっとずっと覚えているでしょう。あきらめない心は、ずっとそばにいてくれます。{parentMessage}",
          early_elementary_7_8:
            "はじめてのことに挑戦し、やりとげた日のことを、{childName}はきっとずっと覚えているでしょう。この経験が、次の挑戦の力になります。{parentMessage}",
          general_child:
            "はじめてのことに挑戦した日のことを、{childName}はずっと覚えているでしょう。{parentMessage}",
          pageVisualRole: "quiet_ending",
          imagePromptTemplate:
            "Quiet peaceful ending shot of the child with a warm satisfied smile, looking back on a wonderful day of achievement, soft warm evening light, tiny star motifs floating gently around them like a blessing, soft watercolor picture book style, peaceful proud ending mood, rich but not cluttered",
        }),
      ],
    },
  },

  "blank-favorite-thing": {
    name: "だいすき！○○",
    description: "好きなものを一言入れるだけ。大好きな世界の絵本。",
    icon: "💛",
    categoryGroupId: "blank-templates",
    parentIntent: "この子の好きなものを伸ばしたい",
    recommendedAgeMin: 1,
    recommendedAgeMax: 7,
    requiredInputs: ["childName", "storyRequest"],
    optionalInputs: ["parentMessage"],
    themeTags: ["favorite", "love", "passion", "blank"],
    creationMode: "fixed_template",
    isBlankTemplate: true,
    blankLabel: "好きなものは何ですか？",
    blankExample: "例：きょうりゅう、でんしゃ、プリンセス、ぬいぐるみ",
    priceTier: "ume",
    storyCostLevel: "none",
    sampleImageUrl: "/images/templates/fantasy.webp",
    sampleImageAlt: "大好きなものと過ごす子どもの絵本イメージ",
    visualDirection:
      "Joyful warm picture-book world celebrating a child's passionate love for their absolute favorite thing — pure happiness and wonder.",
    order: 112,
    active: true,
    systemPrompt: "穴埋めテンプレートを使って、大好きなものへの愛を絵本にします。",
    fixedStory: {
      titleTemplate: "{childName}の だいすきな {storyRequest}",
      previewImageUrl: "/images/templates/fantasy.webp",
      coverImagePromptTemplate: withFixedImagePromptSafety(
        "Picture book cover illustration: a joyful young child surrounded by their very favorite things, arms spread wide in pure delight, heart motifs and soft sparkles floating everywhere, warm golden glowing light, soft watercolor picture book style, rounded child-safe composition, abundant love and joy mood, rich but not cluttered"
      ),
      titleSpreadTextTemplate: "せかいで いちばん だいすき！",
      openingNarrationTemplate:
        "{childName}には、せかいでいちばん大好きなものがあります。それは、{storyRequest}！",
      pages: [
        buildAgeSpecificPage({
          textTemplate:
            "{childName}は、{storyRequest}が大好きです。世界でいちばん！",
          baby_toddler: "{storyRequest}！{childName}、だいすき！",
          preschool_3_4:
            "{childName}は、{storyRequest}が大好きです。世界でいちばん！",
          early_reader_5_6:
            "{childName}には、世界でいちばん好きなものがあります。それは、{storyRequest}です。",
          early_elementary_7_8:
            "{childName}が世界でいちばん好きなもの、それは{storyRequest}です。思い浮かべるだけで、うれしくなります。",
          general_child:
            "{childName}は、{storyRequest}が大好きです。世界でいちばん！",
          pageVisualRole: "opening_establishing",
          imagePromptTemplate:
            "Wide warm shot of a joyful child surrounded by their beloved treasures, arms spread open in total delight, heart-shaped motifs and soft sparkles floating gently around them, golden warm light, soft watercolor picture book style, abundant joy and love mood, rich but not cluttered",
        }),
        buildAgeSpecificPage({
          textTemplate:
            "{storyRequest}のことを考えると、{childName}はうれしくなります。",
          baby_toddler: "{storyRequest}！うれしい！にこにこ！",
          preschool_3_4:
            "{storyRequest}のことを考えると、{childName}はうれしくなります。",
          early_reader_5_6:
            "{storyRequest}のことを考えると、{childName}はうれしくなります。何時間でも飽きません。",
          early_elementary_7_8:
            "{storyRequest}のことを考えると、{childName}は自然と笑顔になります。どんなときも、心が明るくなります。",
          general_child:
            "{storyRequest}のことを考えると、{childName}はうれしくなります。",
          pageVisualRole: "emotional_closeup",
          imagePromptTemplate:
            "Close-up of a child with a dreamy happy expression, eyes sparkling as they imagine their favorite thing, soft rosy cheeks, small heart motifs floating around their face, warm gentle light, soft watercolor picture book style, dreamy joyful daydream mood, rich but not cluttered",
        }),
        buildAgeSpecificPage({
          textTemplate:
            "{childName}と{storyRequest}はいつも一緒。どこへ行くときも。",
          baby_toddler: "{storyRequest}！いっしょ！ずっと！",
          preschool_3_4:
            "{childName}と{storyRequest}はいつも一緒。どこへ行くときも。",
          early_reader_5_6:
            "{childName}と{storyRequest}はいつも一緒。どこへ行くときも、ずっとそばにいてくれます。",
          early_elementary_7_8:
            "{childName}と{storyRequest}はいつも一緒。大好きなものがそばにあると、何でもがんばれる気がします。",
          general_child:
            "{childName}と{storyRequest}はいつも一緒。どこへ行くときも。",
          pageVisualRole: "action",
          imagePromptTemplate:
            "Warm action shot of a child happily playing and engaging with their beloved favorite thing, total absorption in joyful play, heart motifs dancing around them, golden afternoon light, soft watercolor picture book style, pure happy play mood, rich but not cluttered",
        }),
        buildAgeSpecificPage({
          textTemplate:
            "だいすきなものがある。それだけで、今日もしあわせです。{parentMessage}",
          baby_toddler: "だいすき！しあわせ！{parentMessage}",
          preschool_3_4:
            "だいすきなものがある。それだけで、今日もしあわせです。{parentMessage}",
          early_reader_5_6:
            "だいすきなものがある。それだけで、今日もしあわせです。{storyRequest}、ありがとう。{parentMessage}",
          early_elementary_7_8:
            "だいすきなものがある、それだけで、毎日が少し輝いて見えます。{parentMessage}",
          general_child:
            "だいすきなものがある。それだけで、今日もしあわせです。{parentMessage}",
          pageVisualRole: "quiet_ending",
          imagePromptTemplate:
            "Peaceful quiet ending shot of a content child hugging their treasured favorite thing close, a warm satisfied smile on their face, soft evening golden light, tiny heart motifs floating gently, soft watercolor picture book style, cozy loving ending mood, rich but not cluttered",
        }),
      ],
    },
  },

  "blank-favorite-thing-8p": {
    name: "だいすき！○○",
    description: "好きなものを一言入れるだけ。大好きな世界の絵本。",
    icon: "💛",
    categoryGroupId: "blank-templates",
    parentIntent: "この子の好きなものを伸ばしたい",
    recommendedAgeMin: 1,
    recommendedAgeMax: 7,
    requiredInputs: ["childName", "storyRequest"],
    optionalInputs: ["parentMessage"],
    themeTags: ["favorite", "love", "passion", "blank"],
    creationMode: "fixed_template",
    isBlankTemplate: true,
    blankLabel: "好きなものは何ですか？",
    blankExample: "例：きょうりゅう、でんしゃ、プリンセス、ぬいぐるみ",
    priceTier: "take",
    storyCostLevel: "none",
    sampleImageUrl: "/images/templates/fantasy.webp",
    sampleImageAlt: "大好きなものと過ごす子どもの絵本イメージ",
    visualDirection:
      "Joyful warm picture-book world celebrating a child's passionate love for their absolute favorite thing — pure happiness and wonder.",
    order: 113,
    active: true,
    systemPrompt: "穴埋めテンプレートを使って、大好きなものへの愛を絵本にします。",
    fixedStory: {
      previewImageUrl: "/images/templates/fantasy.webp",
      titleTemplate: "{childName}の だいすきな {storyRequest}",
      coverImagePromptTemplate: withFixedImagePromptSafety(
        "Picture book cover illustration: a joyful young child surrounded by their very favorite things, arms spread wide in pure delight, heart motifs and soft sparkles floating everywhere, warm golden glowing light, soft watercolor picture book style, rounded child-safe composition, abundant love and joy mood, rich but not cluttered"
      ),
      titleSpreadTextTemplate: "せかいで いちばん だいすき！",
      openingNarrationTemplate:
        "{childName}には、せかいでいちばん大好きなものがあります。それは、{storyRequest}！",
      pages: [
        buildAgeSpecificPage({
          textTemplate:
            "{childName}のいちばんすきなものは、{storyRequest}。もう、だいすき！",
          preschool_3_4:
            "{childName}のいちばんすきなものは、{storyRequest}。もう、だいすき！",
          early_reader_5_6:
            "{childName}のいちばんすきなものは、{storyRequest}です。それはもう、どれだけ好きか言葉では言えないほど！",
          early_elementary_7_8:
            "{childName}が世界でいちばん好きなもの、それは{storyRequest}です。どのくらい好きかというと、もう言葉では表せないくらい！",
          general_child:
            "{childName}のいちばんすきなものは、{storyRequest}。もう、だいすき！",
          pageVisualRole: "opening_establishing",
          imagePromptTemplate:
            "Wide establishing shot of a joyful child surrounded by their absolute favorite things in a warm glowing scene, bright sparkling eyes and huge smile, heart motifs and star sparkles everywhere, golden warm light, soft watercolor picture book style, overflowing joy mood, rich but not cluttered",
        }),
        buildAgeSpecificPage({
          textTemplate: "朝おきると、まず{storyRequest}のことを考えます。",
          preschool_3_4: "朝おきると、まず{storyRequest}のことを考えます。",
          early_reader_5_6:
            "朝おきると、まず{storyRequest}のことを考えます。今日も会えるかな、と思いながら。",
          early_elementary_7_8:
            "朝目が覚めると、{childName}はまず{storyRequest}のことを考えます。それが毎日のことでした。",
          general_child: "朝おきると、まず{storyRequest}のことを考えます。",
          pageVisualRole: "opening_establishing",
          imagePromptTemplate:
            "Morning scene of a child just waking up in bed with a dreamy smile, imagining their favorite thing, soft morning light streaming in, small heart motifs floating from their thoughts, soft watercolor picture book style, peaceful happy morning mood, rich but not cluttered",
        }),
        buildAgeSpecificPage({
          textTemplate:
            "{storyRequest}のことならなんでも知っている{childName}です。",
          preschool_3_4:
            "{storyRequest}のことならなんでも知っている{childName}です。",
          early_reader_5_6:
            "{storyRequest}のことならなんでも知っている{childName}です。いくら調べても、もっと知りたくなります。",
          early_elementary_7_8:
            "{storyRequest}については、{childName}がいちばん詳しいかもしれません。大好きだから、もっともっと知りたくなるのです。",
          general_child:
            "{storyRequest}のことならなんでも知っている{childName}です。",
          pageVisualRole: "discovery",
          imagePromptTemplate:
            "Discovery shot of a child joyfully sharing everything they know about their beloved subject, eyes bright with expert enthusiasm, heart motifs dancing with excitement, warm soft light, soft watercolor picture book style, passionate expertise mood, rich but not cluttered",
        }),
        buildAgeSpecificPage({
          textTemplate:
            "ほんとうに好きなものは、見るだけでうれしくなります。",
          preschool_3_4:
            "ほんとうに好きなものは、見るだけでうれしくなります。",
          early_reader_5_6:
            "ほんとうに好きなものは、見るだけでうれしくなります。そして、もっともっと好きになります。",
          early_elementary_7_8:
            "ほんとうに好きなものは、見るだけで心があたたかくなります。それが{storyRequest}です。",
          general_child:
            "ほんとうに好きなものは、見るだけでうれしくなります。",
          pageVisualRole: "emotional_closeup",
          imagePromptTemplate:
            "Emotional close-up of a child's face glowing with pure joy and warmth as they look at their favorite thing, rosy cheeks and starry eyes, heart motifs floating all around their face, soft golden light, soft watercolor picture book style, pure loving joy close-up, rich but not cluttered",
        }),
        buildAgeSpecificPage({
          textTemplate:
            "しずかな時間も、{storyRequest}があればへっちゃら。",
          preschool_3_4: "しずかな時間も、{storyRequest}があればへっちゃら。",
          early_reader_5_6:
            "しずかな時間も、{storyRequest}があればへっちゃら。心が満たされます。",
          early_elementary_7_8:
            "どんなときも、{storyRequest}があれば{childName}はひとりじゃない気がします。",
          general_child:
            "しずかな時間も、{storyRequest}があればへっちゃら。",
          pageVisualRole: "action",
          imagePromptTemplate:
            "Cozy quiet scene of a child contentedly playing alone with their favorite thing, peaceful and self-sufficient, soft afternoon light, gentle heart motifs nearby, soft watercolor picture book style, cozy contentment mood, rich but not cluttered",
        }),
        buildAgeSpecificPage({
          textTemplate:
            "{childName}は今日も{storyRequest}と一緒に遊びました。",
          preschool_3_4:
            "{childName}は今日も{storyRequest}と一緒に遊びました。",
          early_reader_5_6:
            "{childName}は今日も{storyRequest}と一緒に遊びました。どんな日も、これが一番たのしい時間です。",
          early_elementary_7_8:
            "{childName}は今日も{storyRequest}と過ごしました。この時間が、何よりも大切です。",
          general_child:
            "{childName}は今日も{storyRequest}と一緒に遊びました。",
          pageVisualRole: "action",
          imagePromptTemplate:
            "Action shot of a child joyfully playing with their absolute favorite thing, totally absorbed in happiness, warm afternoon light, heart and star motifs swirling playfully, soft watercolor picture book style, pure playful joy mood, rich but not cluttered",
        }),
        buildAgeSpecificPage({
          textTemplate:
            "好きなものがあるって、とてもしあわせなことです。",
          preschool_3_4:
            "好きなものがあるって、とてもしあわせなことです。",
          early_reader_5_6:
            "好きなものがあるって、とてもしあわせなことです。{childName}はそれを知っています。",
          early_elementary_7_8:
            "大好きなものがある。それは、とても大切な宝物です。",
          general_child:
            "好きなものがあるって、とてもしあわせなことです。",
          pageVisualRole: "payoff",
          imagePromptTemplate:
            "Wide warm shot of a child looking serene and deeply happy, surrounded by the things they love most, a golden glow surrounding them like a halo of happiness, heart motifs floating gently, soft watercolor picture book style, deep peaceful happiness mood, rich but not cluttered",
        }),
        buildAgeSpecificPage({
          textTemplate:
            "{childName}のだいすきな{storyRequest}。これからもずっと大切にしようね。{parentMessage}",
          baby_toddler:
            "だいすきな{storyRequest}。ずっといっしょ！{parentMessage}",
          preschool_3_4:
            "{childName}のだいすきな{storyRequest}。これからもずっと大切にしようね。{parentMessage}",
          early_reader_5_6:
            "{childName}のだいすきな{storyRequest}。これからも、ずっとずっと大切にしていこうね。{parentMessage}",
          early_elementary_7_8:
            "{childName}のだいすきな{storyRequest}。この気持ちを、これからもずっと大切にしてほしいです。{parentMessage}",
          general_child:
            "{childName}のだいすきな{storyRequest}。これからもずっと大切にしようね。{parentMessage}",
          pageVisualRole: "quiet_ending",
          imagePromptTemplate:
            "Peaceful quiet ending shot of a child holding their treasured favorite thing close with a warm contented smile, soft evening golden light, tiny heart motifs floating gently like a blessing, soft watercolor picture book style, tender loving ending mood, rich but not cluttered",
        }),
      ],
    },
  },

  "blank-outing": {
    name: "○○のおでかけ",
    description: "どこへ行ったか一言入れるだけ。おでかけの思い出を絵本に。",
    icon: "🗺️",
    categoryGroupId: "blank-templates",
    parentIntent: "この瞬間を残したい",
    recommendedAgeMin: 1,
    recommendedAgeMax: 8,
    requiredInputs: ["childName", "storyRequest"],
    optionalInputs: ["familyMembers", "parentMessage"],
    themeTags: ["outing", "memory", "family", "blank"],
    creationMode: "fixed_template",
    isBlankTemplate: true,
    blankLabel: "どこへ行きましたか？",
    blankExample: "例：どうぶつえん、うみ、こうえん、おじいちゃんのいえ",
    priceTier: "ume",
    storyCostLevel: "none",
    sampleImageUrl: "/images/templates/fixed-first-zoo.webp",
    sampleImageAlt: "おでかけの思い出を絵本にしたイメージ",
    visualDirection:
      "Warm family outing memory picture-book mood — the joy of going somewhere special together, full of discovery and togetherness.",
    order: 114,
    active: true,
    systemPrompt: "穴埋めテンプレートを使って、おでかけの思い出絵本を作ります。",
    fixedStory: {
      titleTemplate: "{childName}と {storyRequest}のおでかけ",
      previewImageUrl: "/images/templates/fixed-first-zoo.webp",
      coverImagePromptTemplate: withFixedImagePromptSafety(
        "Picture book cover illustration: a joyful young child setting off on an exciting outing with family, waving hello to a new adventure, bright excited expression, a sense of warm family togetherness, sunny daylight, small compass or map motifs as recurring elements, soft watercolor picture book style, rounded child-safe composition, rich but not cluttered"
      ),
      titleSpreadTextTemplate: "さあ、でかけよう！",
      openingNarrationTemplate:
        "{childName}は、{familyMembers}といっしょに{storyRequest}へ出発しました。今日はとくべつな日です！",
      pages: [
        buildAgeSpecificPage({
          textTemplate:
            "{childName}は、{familyMembers}といっしょに{storyRequest}へ行きました。",
          baby_toddler: "{storyRequest}！{childName}、いく！わくわく！",
          preschool_3_4:
            "{childName}は、{familyMembers}といっしょに{storyRequest}へ行きました。",
          early_reader_5_6:
            "{childName}は、{familyMembers}といっしょに{storyRequest}へ出発しました。どんな発見があるかな？",
          early_elementary_7_8:
            "{childName}は、{familyMembers}といっしょに{storyRequest}へ行きました。朝からわくわくが止まりません。",
          general_child:
            "{childName}は、{familyMembers}といっしょに{storyRequest}へ行きました。",
          pageVisualRole: "opening_establishing",
          imagePromptTemplate:
            "Wide establishing shot of a young child setting out on an exciting outing with family, cheerful departure scene with morning sunlight, the child looking ahead with bright eyes full of anticipation, family members alongside, compass motif tucked into the scene, soft watercolor picture book style, warm family adventure mood, rich but not cluttered",
        }),
        buildAgeSpecificPage({
          textTemplate:
            "はじめて見るもの、はじめてする体験。{childName}の目がきらきらしています。",
          baby_toddler: "みてみて！きらきら！すごい！",
          preschool_3_4:
            "はじめて見るもの、はじめてする体験。{childName}の目がきらきらしています。",
          early_reader_5_6:
            "はじめて見るもの、はじめてする体験。{childName}の目がきらきらしています。もっと見たい、もっとさわりたい！",
          early_elementary_7_8:
            "知らなかったことがたくさんあります。{childName}は次々に発見して、心がどんどん広がっていきます。",
          general_child:
            "はじめて見るもの、はじめてする体験。{childName}の目がきらきらしています。",
          pageVisualRole: "discovery",
          imagePromptTemplate:
            "Discovery shot of a child leaning forward with wide sparkling eyes, pointing excitedly at something wonderful and new, compass motif visible somewhere in the scene, bright warm daylight, soft watercolor picture book style, wonder-filled discovery mood, rich but not cluttered",
        }),
        buildAgeSpecificPage({
          textTemplate:
            "「また来たいな！」{childName}は心の中で思いました。",
          baby_toddler: "またきたい！たのしい！",
          preschool_3_4:
            "「また来たいな！」{childName}は心の中で思いました。",
          early_reader_5_6:
            "「また来たいな！」{childName}は心の中で思いました。今日のことは、ずっと忘れないでしょう。",
          early_elementary_7_8:
            "「また来たいな」と{childName}は心の中で思いました。素敵な場所に来られてよかったと思います。",
          general_child:
            "「また来たいな！」{childName}は心の中で思いました。",
          pageVisualRole: "emotional_closeup",
          imagePromptTemplate:
            "Emotional close-up of a child's face filled with wonder and heartfelt joy, a dreamy satisfied expression as they take in a wonderful experience, compass motif glowing softly nearby, warm afternoon light, soft watercolor picture book style, heartfelt wonder close-up, rich but not cluttered",
        }),
        buildAgeSpecificPage({
          textTemplate:
            "大好きな人たちとの、大切な思い出ができました。{parentMessage}",
          baby_toddler: "たのしかった！ありがとう！{parentMessage}",
          preschool_3_4:
            "大好きな人たちとの、大切な思い出ができました。{parentMessage}",
          early_reader_5_6:
            "大好きな人たちと過ごした、大切な思い出ができました。またいっしょにいこうね。{parentMessage}",
          early_elementary_7_8:
            "大好きな人たちとの時間が、世界でいちばん宝物です。また行こうね。{parentMessage}",
          general_child:
            "大好きな人たちとの、大切な思い出ができました。{parentMessage}",
          pageVisualRole: "quiet_ending",
          imagePromptTemplate:
            "Peaceful quiet ending wide shot of the child walking hand-in-hand with family on the way home, golden hour sunset light behind them, a content satisfied expression, compass motif glowing softly in the sky, soft watercolor picture book style, warm family memory ending mood, rich but not cluttered",
        }),
      ],
    },
  },

  "blank-outing-8p": {
    name: "○○のおでかけ",
    description: "どこへ行ったか一言入れるだけ。おでかけの思い出を絵本に。",
    icon: "🗺️",
    categoryGroupId: "blank-templates",
    parentIntent: "この瞬間を残したい",
    recommendedAgeMin: 1,
    recommendedAgeMax: 8,
    requiredInputs: ["childName", "storyRequest"],
    optionalInputs: ["familyMembers", "parentMessage"],
    themeTags: ["outing", "memory", "family", "blank"],
    creationMode: "fixed_template",
    isBlankTemplate: true,
    blankLabel: "どこへ行きましたか？",
    blankExample: "例：どうぶつえん、うみ、こうえん、おじいちゃんのいえ",
    priceTier: "take",
    storyCostLevel: "none",
    sampleImageUrl: "/images/templates/fixed-first-zoo.webp",
    sampleImageAlt: "おでかけの思い出を絵本にしたイメージ",
    visualDirection:
      "Warm family outing memory picture-book mood — the joy of going somewhere special together, full of discovery and togetherness.",
    order: 115,
    active: true,
    systemPrompt: "穴埋めテンプレートを使って、おでかけの思い出絵本を作ります。",
    fixedStory: {
      previewImageUrl: "/images/templates/fixed-first-zoo.webp",
      titleTemplate: "{childName}と {storyRequest}のおでかけ",
      coverImagePromptTemplate: withFixedImagePromptSafety(
        "Picture book cover illustration: a joyful young child setting off on an exciting outing with family, waving hello to a new adventure, bright excited expression, a sense of warm family togetherness, sunny daylight, small compass or map motifs as recurring elements, soft watercolor picture book style, rounded child-safe composition, rich but not cluttered"
      ),
      titleSpreadTextTemplate: "さあ、でかけよう！",
      openingNarrationTemplate:
        "{childName}は、{familyMembers}といっしょに{storyRequest}へ出発しました。今日はとくべつな日です！",
      pages: [
        buildAgeSpecificPage({
          textTemplate:
            "{childName}は、{familyMembers}といっしょに{storyRequest}へ出発しました。",
          preschool_3_4:
            "{childName}は、{familyMembers}といっしょに{storyRequest}へ出発しました。",
          early_reader_5_6:
            "{childName}は、{familyMembers}といっしょに{storyRequest}へ出発しました。今日はどんな発見があるかな？",
          early_elementary_7_8:
            "{childName}は、{familyMembers}といっしょに{storyRequest}へ出発しました。朝から心がはずんでいます。",
          general_child:
            "{childName}は、{familyMembers}といっしょに{storyRequest}へ出発しました。",
          pageVisualRole: "opening_establishing",
          imagePromptTemplate:
            "Wide establishing shot of a young child cheerfully departing on a family outing, morning sunlight, bright excited face looking forward to the adventure, family members walking alongside, small compass motif in the scene, soft watercolor picture book style, warm departure mood, rich but not cluttered",
        }),
        buildAgeSpecificPage({
          textTemplate:
            "着いてみると、とても広くてわくわくします。「どこから見ようかな？」",
          preschool_3_4:
            "着いてみると、とても広くてわくわくします。「どこから見ようかな？」",
          early_reader_5_6:
            "着いてみると、想像より広くてわくわくします。「どこから行こうかな？」{childName}は目を輝かせます。",
          early_elementary_7_8:
            "到着してみると、思っていたよりずっと広い！{childName}は早くも目が輝いています。「どこから行こうかな？」",
          general_child:
            "着いてみると、とても広くてわくわくします。「どこから見ようかな？」",
          pageVisualRole: "opening_establishing",
          imagePromptTemplate:
            "Arrival scene of a child and family reaching their destination, the child looking around with wide excited eyes taking it all in, compass motif visible in the background, soft morning light, soft watercolor picture book style, arrival wonder mood, rich but not cluttered",
        }),
        buildAgeSpecificPage({
          textTemplate: "いろんなものを見て、たくさん歩きました。",
          preschool_3_4: "いろんなものを見て、たくさん歩きました。",
          early_reader_5_6:
            "いろんなものを見て、たくさん歩きました。{childName}はひとつも見逃したくありません。",
          early_elementary_7_8:
            "いろんなものを見て回りました。知らなかったことを、たくさん知ることができました。",
          general_child: "いろんなものを見て、たくさん歩きました。",
          pageVisualRole: "discovery",
          imagePromptTemplate:
            "Medium shot of a child actively exploring and discovering, looking here and there with bright curious eyes, family nearby, compass motif tucked into the scene, bright warm daylight, soft watercolor picture book style, active exploration mood, rich but not cluttered",
        }),
        buildAgeSpecificPage({
          textTemplate:
            "「すごい！」「きれい！」{childName}は何度もさけびました。",
          preschool_3_4:
            "「すごい！」「きれい！」{childName}は何度もさけびました。",
          early_reader_5_6:
            "「すごい！」「きれい！」{childName}は何度も声に出しました。見るものすべてが新鮮です。",
          early_elementary_7_8:
            "「すごい！」「きれい！」{childName}は思わず声に出てしまいます。本当に素晴らしいものを見た日でした。",
          general_child:
            "「すごい！」「きれい！」{childName}は何度もさけびました。",
          pageVisualRole: "emotional_closeup",
          imagePromptTemplate:
            "Close-up of a child's face expressing pure amazement and delight at something wonderful, mouth open in awe, sparkling eyes, hands clasped in excitement, warm bright light, soft watercolor picture book style, amazed wonder close-up, rich but not cluttered",
        }),
        buildAgeSpecificPage({
          textTemplate: "お昼ごはんも、とってもおいしかったです。",
          preschool_3_4: "お昼ごはんも、とってもおいしかったです。",
          early_reader_5_6:
            "お昼ごはんも、とってもおいしかったです。外で食べると、何でもおいしく感じます。",
          early_elementary_7_8:
            "外で食べるお昼ごはんは、いつもよりずっとおいしく感じます。",
          general_child: "お昼ごはんも、とってもおいしかったです。",
          pageVisualRole: "action",
          imagePromptTemplate:
            "Warm scene of a child happily eating lunch outdoors with family, enjoying a meal together, smiling faces all around, compass motif on a small lunchbox or nearby, soft warm daylight, soft watercolor picture book style, cozy family meal mood, rich but not cluttered",
        }),
        buildAgeSpecificPage({
          textTemplate:
            "帰り道、{childName}はほっぺたが赤くなるほど遊んで満足そうです。",
          preschool_3_4:
            "帰り道、{childName}はほっぺたが赤くなるほど遊んで満足そうです。",
          early_reader_5_6:
            "帰り道、{childName}はほっぺたが赤くなるほど遊んで、満足そうにしています。",
          early_elementary_7_8:
            "帰り道の{childName}は、ほっぺたが赤くて、目がとろんとして、でもとっても満足そうです。",
          general_child:
            "帰り道、{childName}はほっぺたが赤くなるほど遊んで満足そうです。",
          pageVisualRole: "action",
          imagePromptTemplate:
            "Walking home scene of a tired but deeply satisfied child with rosy cheeks, a happy droopy expression of good tired, walking hand in hand with family as the sun gets lower, soft golden afternoon light, soft watercolor picture book style, happy tired satisfied mood, rich but not cluttered",
        }),
        buildAgeSpecificPage({
          textTemplate: "今日のことは、ずっと覚えていたいです。",
          preschool_3_4: "今日のことは、ずっと覚えていたいです。",
          early_reader_5_6:
            "今日のことは、ずっとずっと覚えていたいです。こんな日が、また来るといいな。",
          early_elementary_7_8:
            "今日のことは、ずっと覚えていたいです。大切な思い出が、また一つ増えました。",
          general_child: "今日のことは、ずっと覚えていたいです。",
          pageVisualRole: "payoff",
          imagePromptTemplate:
            "Peaceful golden hour shot of a child looking back warmly at the wonderful day they had, a serene smile on their face, sunset light painting everything gold, small compass motif glowing like a keepsake, soft watercolor picture book style, treasured memory mood, rich but not cluttered",
        }),
        buildAgeSpecificPage({
          textTemplate: "また{storyRequest}へ行こうね。{parentMessage}",
          baby_toddler: "またいこうね！たのしかった！{parentMessage}",
          preschool_3_4: "また{storyRequest}へ行こうね。{parentMessage}",
          early_reader_5_6:
            "また{storyRequest}へ行こうね。次はもっといろんなことを見つけよう。{parentMessage}",
          early_elementary_7_8:
            "また{storyRequest}へ行こうね。大好きな家族と一緒なら、どこへ行っても楽しいです。{parentMessage}",
          general_child: "また{storyRequest}へ行こうね。{parentMessage}",
          pageVisualRole: "quiet_ending",
          imagePromptTemplate:
            "Quiet gentle ending shot of the child and family arriving home together, warm house lights glowing, the child giving a happy wave goodbye to the day, compass motif softly glowing like a treasured keepsake, soft evening light, soft watercolor picture book style, warm homecoming ending mood, rich but not cluttered",
        }),
      ],
    },
  },

  "blank-dream-job": {
    name: "○○になりたい！",
    description: "なりたいものを一言入れるだけ。夢を持つよろこびの絵本。",
    icon: "🌈",
    categoryGroupId: "blank-templates",
    parentIntent: "自由に想像して、ワクワクしてほしい",
    recommendedAgeMin: 2,
    recommendedAgeMax: 8,
    requiredInputs: ["childName", "storyRequest"],
    optionalInputs: ["parentMessage"],
    themeTags: ["dream", "job", "imagination", "blank"],
    creationMode: "fixed_template",
    isBlankTemplate: true,
    blankLabel: "なりたいものは何ですか？",
    blankExample: "例：ケーキやさん、でんしゃのうんてんし、うちゅうひこうし、まほうつかい",
    priceTier: "ume",
    storyCostLevel: "none",
    sampleImageUrl: "/images/templates/fantasy.webp",
    sampleImageAlt: "夢のおしごとを絵本にしたイメージ",
    visualDirection:
      "Bright imaginative picture-book mood celebrating a child's dream of who they want to become — full of wonder, possibility, and gentle encouragement.",
    order: 116,
    active: true,
    systemPrompt: "穴埋めテンプレートを使って、夢のおしごと絵本を作ります。",
    fixedStory: {
      titleTemplate: "{childName}は {storyRequest}になりたい",
      previewImageUrl: "/images/templates/fantasy.webp",
      coverImagePromptTemplate: withFixedImagePromptSafety(
        "Picture book cover illustration: a dreaming young child looking up at a bright rainbow sky with stars, imagining their bright future, rainbow motifs arching across the cover, a glowing dream bubble above their head full of wonder and possibility, warm inspiring light, soft watercolor picture book style, rounded child-safe composition, rich but not cluttered"
      ),
      titleSpreadTextTemplate: "ゆめは、おおきくひろがる！",
      openingNarrationTemplate:
        "{childName}には、大きな夢があります。それは、{storyRequest}になること！",
      pages: [
        buildAgeSpecificPage({
          textTemplate:
            "{childName}は、{storyRequest}になりたいと思っています。",
          baby_toddler: "{storyRequest}！{childName}、なる！",
          preschool_3_4:
            "{childName}は、{storyRequest}になりたいと思っています。",
          early_reader_5_6:
            "{childName}には大きな夢があります。それは、{storyRequest}になること！",
          early_elementary_7_8:
            "{childName}の夢は、{storyRequest}になることです。考えるだけでわくわくします。",
          general_child:
            "{childName}は、{storyRequest}になりたいと思っています。",
          pageVisualRole: "opening_establishing",
          imagePromptTemplate:
            "Wide establishing shot of a young child looking up at a bright rainbow-filled sky with wonder and big dreams in their eyes, a dream bubble above their head glowing with possibility, rainbow motifs arching overhead, warm inspiring light, soft watercolor picture book style, big dreaming mood, rich but not cluttered",
        }),
        buildAgeSpecificPage({
          textTemplate:
            "もし{storyRequest}になったら、どんなことをするだろう？想像するだけでわくわくします。",
          baby_toddler: "{storyRequest}！どんなかな？わくわく！",
          preschool_3_4:
            "もし{storyRequest}になったら、どんなことをするだろう？想像するだけでわくわくします。",
          early_reader_5_6:
            "もし{storyRequest}になったら、どんな一日を過ごすんだろう？想像するだけでわくわくします。",
          early_elementary_7_8:
            "{storyRequest}になったら、どんなことができるだろう？{childName}はどんどん想像を広げます。",
          general_child:
            "もし{storyRequest}になったら、どんなことをするだろう？想像するだけでわくわくします。",
          pageVisualRole: "discovery",
          imagePromptTemplate:
            "Daydream discovery shot of a child lost in beautiful imagination, eyes half-closed with a dreamy smile, a glowing dream bubble showing a bright future above their head, rainbow motifs floating around, soft warm light, soft watercolor picture book style, dreamy imagination mood, rich but not cluttered",
        }),
        buildAgeSpecificPage({
          textTemplate:
            "「ぜったいになるぞ！」{childName}はきめました。",
          baby_toddler: "なるぞ！がんばる！ぜったい！",
          preschool_3_4:
            "「ぜったいになるぞ！」{childName}はきめました。",
          early_reader_5_6:
            "「ぜったいになるぞ！」{childName}はしっかりきめました。夢を持つ心が、力になります。",
          early_elementary_7_8:
            "「ぜったいになるぞ！」{childName}は心に誓いました。夢に向かって、歩き始めます。",
          general_child:
            "「ぜったいになるぞ！」{childName}はきめました。",
          pageVisualRole: "emotional_closeup",
          imagePromptTemplate:
            "Determined close-up of a child with a resolved, inspired expression — eyes bright with conviction and excitement, fist lightly raised in determination, rainbow motifs glowing brightly around them, warm golden inspiring light, soft watercolor picture book style, firm gentle determination mood, rich but not cluttered",
        }),
        buildAgeSpecificPage({
          textTemplate:
            "夢を持つって、すてきなことです。{parentMessage}",
          baby_toddler: "ゆめ！すてき！{parentMessage}",
          preschool_3_4:
            "夢を持つって、すてきなことです。{parentMessage}",
          early_reader_5_6:
            "夢を持つって、すてきなことです。{childName}の夢は、きっとかなうでしょう。{parentMessage}",
          early_elementary_7_8:
            "夢を持つって、すてきなことです。大きな夢は、大きな力になります。{parentMessage}",
          general_child:
            "夢を持つって、すてきなことです。{parentMessage}",
          pageVisualRole: "quiet_ending",
          imagePromptTemplate:
            "Peaceful inspiring ending shot of a child looking up at a bright starry sky or rainbow, a serene and hopeful expression on their face, small rainbow motifs and stars floating gently around them like a blessing from the future, soft warm evening light, soft watercolor picture book style, hopeful tender ending mood, rich but not cluttered",
        }),
      ],
    },
  },

  "fixed-first-birthday-12p": {
    name: "はじめてのお誕生日（12ページ）",
    description: "お誕生日の１日を、朝のお目覚めからケーキ、おやすみまでたっぷり描く12ページ版です。",
    icon: "🎂",
    categoryGroupId: "memories",
    subcategoryId: "first-birthday",
    parentIntent: "この瞬間を残したい",
    recommendedAgeMin: 1,
    recommendedAgeMax: 6,
    requiredInputs: ["childName", "familyMembers"],
    optionalInputs: ["parentMessage"],
    themeTags: ["memory", "birthday", "family", "pilot-12-page"],
    creationMode: "fixed_template",
    variantOf: "fixed-first-birthday",
    variantLabel: "12ページ",
    priceTier: "ume",
    storyCostLevel: "none",
    sampleImageUrl: "/images/templates/fixed-birthday-4p.webp",
    sampleImageAlt: "はじめてのお誕生日のやさしい絵本イメージ（12ページ版）",
    visualDirection:
      "Warm birthday memory picture-book mood with soft candlelight, family smiles, pastel balloons, and a keepsake-photo feeling over a gentle 12-page rhythm.",
    order: 4.5,
    active: true,
    systemPrompt: "固定テンプレートを使って、はじめての誕生日の思い出を12ページでゆっくり残す絵本を作ります。",
    fixedStory: {
      titleTemplate: "{childName}のはじめてのたんじょうび",
      previewImageUrl: "/images/templates/fixed-birthday-4p.webp",
      coverImagePromptTemplate:
        withFixedImagePromptSafety("Picture book cover illustration: a young child in front of a small birthday cake with family gathered close, warm indoor lights, soft pastel balloons, recurring tiny ribbon motif, joyful and tender keepsake mood, soft watercolor style, child-safe rounded composition, rich but not cluttered details, no text, no letters, no Japanese characters, no readable signs, no logo, no watermark"),
      titleSpreadTextTemplate: "{childName}の はじめての たんじょうび",
      openingNarrationTemplate:
        "あさの ひかりの なかで、きょうは ちょっと とくべつ。{childName}と {familyMembers}の たんじょうびの いちにちが はじまります。",
      pageCount: 12,
      layoutVariant: "12_page",
      pages: [        buildAgeSpecificPage({
          textTemplate: "あさのおへやに、たんじょうびのけはいがそっとひろがりました。",
          baby_toddler: "あさだよ。おたんじょうび、わくわく。",
          preschool_3_4:
            "あさのおへやに、たんじょうびの けはいが そっと ひろがりました。{childName}の えがおも ぽっと ひかります。",
          early_reader_5_6:
            "あさのおへやに、たんじょうびの けはいが そっと ひろがりました。{childName}は いつもより はやく めがさめて、きょうの たのしみを かぞえます。",
          early_elementary_7_8:
            "あさのおへやに、たんじょうびの けはいが そっと ひろがりました。{childName}は ひとつ 大きくなる日の くうきを、胸の おくで しずかに かんじます。",
          general_child:
            "あさのおへやに、たんじょうびの けはいが そっと ひろがりました。{childName}の えがおも ぽっと ひかります。",
          pageVisualRole: "opening_establishing",
          imagePromptTemplate:
            withBirthdayImagePromptGuardrail("Establishing wide shot of a cozy home living room in gentle morning light on birthday day. A young child in pajamas stands near a curtain with soft sunlight. Family members prepare quietly in the background with pastel decorations not fully arranged yet. A tiny ribbon motif appears on a folded ribbon loop decoration. Soft watercolor picture book style, layered foreground-midground-background, warm and clean composition, rich but not cluttered details. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark."),
        }),
        buildAgeSpecificPage({
          textTemplate: "{familyMembers}といっしょに、かざりつけのじゅんびをたのしくすすめます。",
          baby_toddler: "ふうせん ぽん。いっしょに じゅんび。",
          preschool_3_4:
            "{familyMembers}といっしょに、かざりつけの じゅんびを たのしく すすめます。おへやが すこしずつ きらきらに なります。",
          early_reader_5_6:
            "{familyMembers}といっしょに、かざりつけの じゅんびを たのしく すすめます。{childName}も ふうせんを そっと ささえて、できたを ふやしていきます。",
          early_elementary_7_8:
            "{familyMembers}といっしょに、かざりつけの じゅんびを たのしく すすめます。{childName}は じぶんの 手で きょうの ぶたいを つくっていることが うれしくなりました。",
          general_child:
            "{familyMembers}といっしょに、かざりつけの じゅんびを たのしく すすめます。おへやが すこしずつ きらきらに なります。",
          pageVisualRole: "action",
          imagePromptTemplate:
            withBirthdayImagePromptGuardrail("Medium-wide action shot of a child and family decorating a living room with pastel balloons and solid-color ribbon loops. The child reaches up with help from family to place a decoration on a wall. Warm indoor daylight and soft shadows. A tiny ribbon motif appears on a balloon knot near the child. Soft watercolor picture book style, lively but gentle movement, rich but not cluttered details. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark."),
        }),
        buildAgeSpecificPage({
          textTemplate: "ケーキとろうそくを見つけた{childName}の目は、きらきらかがやきました。",
          baby_toddler: "ケーキ みつけた。ろうそく きらり。",
          preschool_3_4:
            "ケーキと ろうそくを 見つけた{childName}の 目は、きらきら かがやきました。うれしい こえが ふわっと ひろがります。",
          early_reader_5_6:
            "ケーキと ろうそくを 見つけた{childName}の 目は、きらきら かがやきました。ふーっと する前の どきどきが、胸のなかで 小さく はねます。",
          early_elementary_7_8:
            "ケーキと ろうそくを 見つけた{childName}の 目は、きらきら かがやきました。うれしさと すこしの きんちょうが まざる しゅんかんです。",
          general_child:
            "ケーキと ろうそくを 見つけた{childName}の 目は、きらきら かがやきました。うれしい こえが ふわっと ひろがります。",
          pageVisualRole: "discovery",
          imagePromptTemplate:
            withBirthdayImagePromptGuardrail("Medium shot of a child discovering a birthday cake with softly glowing candles on a table. Family members stand nearby with delighted expressions, hands gently clasped. Warm candlelight reflects in the child's eyes. A tiny ribbon motif appears in the scene. Soft watercolor picture book style, discovery-focused framing, rich but not cluttered details. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark."),
        }),
        buildAgeSpecificPage({
          textTemplate: "みんなの「おめでとう」があつまって、おへやいっぱいにひろがりました。",
          baby_toddler: "おめでとう。にこにこ いっぱい。",
          preschool_3_4:
            "みんなの「おめでとう」が あつまって、おへや いっぱいに ひろがりました。{childName}も にこっと わらいます。",
          early_reader_5_6:
            "みんなの「おめでとう」が あつまって、おへや いっぱいに ひろがりました。{childName}は 手を たたきながら、しあわせな 音を きいています。",
          early_elementary_7_8:
            "みんなの「おめでとう」が あつまって、おへや いっぱいに ひろがりました。{childName}は みんなの きもちが ひとつに なる あたたかさを かんじました。",
          general_child:
            "みんなの「おめでとう」が あつまって、おへや いっぱいに ひろがりました。{childName}も にこっと わらいます。",
          pageVisualRole: "payoff",
          imagePromptTemplate:
            withBirthdayImagePromptGuardrail("Wide celebration shot of child and family clapping and smiling around the birthday table after candle moment. Pastel paper bits drift softly in the air. Everyone faces the child with joyful expressions. A tiny ribbon motif is visible in the scene. Soft watercolor picture book style, clear celebratory composition, rich but not cluttered details. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark."),
        }),
        buildAgeSpecificPage({
          textTemplate: "だいじなプレゼントをそっと手にもって、{childName}はうれしそうに見つめました。",
          baby_toddler: "プレゼント だいじ。ぎゅっ。",
          preschool_3_4:
            "だいじな プレゼントを そっと 手に もって、{childName}は うれしそうに 見つめました。",
          early_reader_5_6:
            "だいじな プレゼントを そっと 手に もって、{childName}は うれしそうに 見つめました。どんな たからものに なるかなと 思いえがきます。",
          early_elementary_7_8:
            "だいじな プレゼントを そっと 手に もって、{childName}は うれしそうに 見つめました。ものに こもる 気持ちまで 受けとったようでした。",
          general_child:
            "だいじな プレゼントを そっと 手に もって、{childName}は うれしそうに 見つめました。",
          pageVisualRole: "object_detail",
          imagePromptTemplate:
            withBirthdayImagePromptGuardrail("Object-detail close shot of the child holding a small plain keepsake toy carefully with both hands. The soft texture, ribbon, and tiny fingers are in focus. Family smiles appear softly in the background. A tiny ribbon motif is visible softly in the background. Soft watercolor picture book style, object-focused intimate framing, rich but not cluttered details. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark."),
        }),
        buildAgeSpecificPage({
          textTemplate: "{childName}は、ひとつ大きくなった気もちを胸にそっとしまいました。",
          baby_toddler: "{childName}、ちょっぴり おにいさん おねえさん。",
          preschool_3_4:
            "{childName}は、ひとつ 大きくなった きもちを 胸に そっと しまいました。",
          early_reader_5_6:
            "{childName}は、ひとつ 大きくなった きもちを 胸に そっと しまいました。できたことを 思いだすと、こころが まっすぐに のびていきます。",
          early_elementary_7_8:
            "{childName}は、ひとつ 大きくなった きもちを 胸に そっと しまいました。きょうの ひかりが、これからの じぶんを そっと おしてくれるようでした。",
          general_child:
            "{childName}は、ひとつ 大きくなった きもちを 胸に そっと しまいました。",
          pageVisualRole: "emotional_closeup",
          imagePromptTemplate:
            withBirthdayImagePromptGuardrail("Close-up emotional shot of a child resting a hand on chest with a soft proud smile, seated near warm birthday lights after celebration. Family members are nearby in gentle soft focus, watching with affection. A tiny ribbon motif appears on a cushion beside the child. Soft watercolor picture book style, tender introspective framing, rich but not cluttered details. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark."),
        }),
        buildAgeSpecificPage({
          textTemplate: "みんなのえがおが、よるのやさしいひかりのなかでゆっくりほどけていきます。",
          baby_toddler: "えがお ぽかぽか。よる しずか。",
          preschool_3_4:
            "みんなの えがおが、よるの やさしい ひかりの なかで ゆっくり ほどけていきます。",
          early_reader_5_6:
            "みんなの えがおが、よるの やさしい ひかりの なかで ゆっくり ほどけていきます。たのしかった きょうの けしきが、こころに そっと のこります。",
          early_elementary_7_8:
            "みんなの えがおが、よるの やさしい ひかりの なかで ゆっくり ほどけていきます。にぎやかな 時間の あとに くる しずけさまで、だいじな 思い出に なりました。",
          general_child:
            "みんなの えがおが、よるの やさしい ひかりの なかで ゆっくり ほどけていきます。",
          pageVisualRole: "quiet_ending",
          imagePromptTemplate:
            withBirthdayImagePromptGuardrail("Wide quiet ending shot of child and family sitting together on a sofa in a softly lit evening room after birthday celebration. Decorations are still visible but calm, with warm amber light and gentle shadows. A tiny ribbon motif is visible in the scene. Soft watercolor picture book style, peaceful afterglow composition, rich but not cluttered details. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark."),
        }),
        buildAgeSpecificPage({
          textTemplate: "おいしい ケーキを たべたあとは、みんなで うたを うたいました。ハッピー・バースデー！",
          pageVisualRole: "object_detail",
          imagePromptTemplate: withBirthdayImagePromptGuardrail("Close-up: The birthday cake with candles lit, showing details of the frosting and decorations. The child's happy face slightly out of focus in the background. Soft watercolor style."),
        }),
        buildAgeSpecificPage({
          textTemplate: "{childName}も うれしくて、てを たたきました。えがおが おへや いっぱいに ひろがります。",
          pageVisualRole: "action",
          imagePromptTemplate: withBirthdayImagePromptGuardrail("Action shot: The child clapping hands, with a bright, joyful smile. Warm lighting reflecting the happy mood. Soft watercolor style."),
        }),
        buildAgeSpecificPage({
          textTemplate: "きょうは {childName}が しゅやく。みんなの たからもの。げんきに おおきくなってね。",
          pageVisualRole: "emotional_closeup",
          imagePromptTemplate: withBirthdayImagePromptGuardrail("Close-up: The family looking lovingly at the child. The child is glowing with happiness. Soft watercolor style."),
        }),
        buildAgeSpecificPage({
          textTemplate: "たくさん あそんで、たくさん わらって。とっても たのしい おたんじょうび だったね。",
          pageVisualRole: "quiet_ending",
          imagePromptTemplate: withBirthdayImagePromptGuardrail("Wide shot: The child asleep with their new toys next to the bed. Peaceful and heartwarming atmosphere. Soft watercolor style."),
        }),
        buildAgeSpecificPage({
          textTemplate: "{parentMessage}",
          baby_toddler: "{parentMessage}",
          preschool_3_4: "{parentMessage}",
          early_reader_5_6: "{parentMessage}",
          early_elementary_7_8: "{parentMessage}",
          general_child: "{parentMessage}",
          pageVisualRole: "quiet_ending",
          imagePromptTemplate:
            withBirthdayImagePromptGuardrail("Back-view gentle closing shot of the child leaning on family at the end of birthday night, looking toward soft lights and a calm room. Mood is peaceful, affectionate, and reflective. A tiny ribbon motif catches the final warm light near the table edge. Soft watercolor picture book style, serene closing framing, rich but not cluttered details. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark."),
        }),
      ],
    },
  },
    "fixed-brush-teeth-12p": {
    name: "はじめての歯みがき（12ページ）",
    description: "歯みがきの習慣を、朝の準備からおやすみまでたっぷり描く12ページ版です。",
    icon: "🪥",
    categoryGroupId: "growth-support",
    subcategoryId: "daily-habit",
    parentIntent: "できるようになってほしい。でも怒らず応援したい",
    recommendedAgeMin: 2,
    recommendedAgeMax: 6,
    requiredInputs: ["childName"],
    optionalInputs: ["parentMessage"],
    themeTags: ["teeth", "habit", "bedtime", "pilot-12-page"],
    creationMode: "fixed_template",
    variantOf: "fixed-brush-teeth",
    variantLabel: "12ページ",
    priceTier: "ume",
    storyCostLevel: "none",
    sampleImageUrl: "/images/templates/fixed-brush-teeth.webp",
    sampleImageAlt: "はじめての歯みがきのやさしい絵本イメージ（12ページ版）",
    visualDirection:
      "Bright but calm daily-habit picture-book mood with clean bathroom setting, rounded shapes, friendly routine support, and reassuring smiles over a gentle 12-page rhythm.",
    order: 7.5,
    active: true,
    systemPrompt: "固定テンプレートを使って、歯みがきの習慣を12ページでやさしく応援する絵本を作ります。",
    fixedStory: {
      titleTemplate: "{childName}のはじめての歯みがき",
      previewImageUrl: "/images/templates/fixed-brush-teeth.webp",
      coverImagePromptTemplate:
        withFixedImagePromptSafety("Picture book cover illustration: a cheerful preschool child holding a toothbrush in a bright clean bathroom, fresh morning or evening light, friendly mirror reflection, recurring shining star motif, encouraging cheerful mood, soft watercolor style, child-safe rounded composition, rich but not cluttered details, no text, no letters, no Japanese characters, no readable signs, no logo, no watermark"),
      titleSpreadTextTemplate: "{childName}の はじめての 歯みがき",
      openingNarrationTemplate:
        "今日も歯みがきの時間がやってきました。{childName}はどんなふうにがんばるかな。",
      pageCount: 12,
      layoutVariant: "12_page",
      pages: [        buildAgeSpecificPage({
          textTemplate: "朝だ。{childName}は、お水をながして顔を洗います。",
          baby_toddler: "あさだ。ぱしゃぱしゃ。きれいきれい。",
          preschool_3_4:
            "あさだ。{childName}は、おみずをながして かおを あらいます。きょうも はみがきのじゅんびが はじまります。",
          early_reader_5_6:
            "朝だ。{childName}は、お水をながして顔を洗います。鏡に映った自分を見ると、今日も がんばろう という きもちに なります。",
          early_elementary_7_8:
            "朝だ。{childName}は、お水をながして顔を洗います。毎朝の おなじ しぐさが、{childName}の からだに やさしく しみこんでいます。",
          general_child:
            "朝だ。{childName}は、お水をながして顔を洗います。きょうも はみがきのじゅんびが はじまります。",
          pageVisualRole: "opening_establishing",
          imagePromptTemplate:
            withBrushTeethImagePromptGuardrail("Establishing wide shot of a preschool child at a bathroom sink in bright morning light, reaching for a faucet on a small step stool. The child's face is eager and alert. A bathroom mirror ahead shows the child's reflection. A colorful toothbrush cup sits on the counter with other bathroom items arranged neatly. Use only plain, unlabeled bathroom objects. Do not include readable text, product labels, logos, numbers, letters, posters, charts, or written marks anywhere in the sink area, mirror, counter, or background. A small shining star motif is tucked on the mirror frame. Soft watercolor picture book style, clean bright morning bathroom, rounded child-safe shapes, rich but not cluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark."),
        }),
        buildAgeSpecificPage({
          textTemplate: "でも、歯みがきはめんどくさい。{childName}はちょっぴり ぐずぐずします。",
          baby_toddler: "めんどくさい。ぐずぐず。",
          preschool_3_4:
            "でも、はみがきはめんどくさい。{childName}はちょっぴり ぐずぐずします。おへやから あぶくの おとが きこえてきました。",
          early_reader_5_6:
            "でも、歯みがきはめんどくさい。{childName}はちょっぴり ぐずぐずします。でも、{childName}は知っています。やってみると たのしいことを。",
          early_elementary_7_8:
            "でも、歯みがきはめんどくさい。{childName}はちょっぴり ぐずぐずします。誰もが そう感じる その気持ちを、{childName}は素直に 表しています。",
          general_child:
            "でも、歯みがきはめんどくさい。{childName}はちょっぴり ぐずぐずします。おへやから あぶくの音が きこえてきました。",
          pageVisualRole: "setback_or_question",
          imagePromptTemplate:
            withBrushTeethImagePromptGuardrail("Medium shot of the child sitting on the bathroom floor with a slightly pouty or uncertain expression, looking at the toothbrush with hesitation. The toothbrush and solid-colored toothpaste tube sit on the counter above. Soft bubbles or steam are visible near the sink. The room is still bright and welcoming despite the child's reluctance. A small shining star motif appears on the floor tile. Soft watercolor picture book style, relatable reluctance without negativity, rich but not cluttered.")
        }),
        buildAgeSpecificPage({
          textTemplate: "でも、はぶらしを握ると、あぶくが ふわっと 出てきました。あ、楽しい。",
          baby_toddler: "あぶく。ふわっ。たのしい。",
          preschool_3_4:
            "でも、はぶらしを にぎると、あぶくが ふわっと でてきました。あ、たのしい。{childName}の めが きらりと ひかります。",
          early_reader_5_6:
            "でも、はぶらしを握ると、あぶくが ふわっと 出てきました。あ、楽しい。小さな星のような あぶくが、{childName}の 心も ぷくぷくと 膨らませます。",
          early_elementary_7_8:
            "でも、はぶらしを握ると、あぶくが ふわっと 出てきました。あ、楽しい。めんどくさいと思っていた その気持ちが、ふんわり 変わっていく体験をします。",
          general_child:
            "でも、はぶらしを握ると、あぶくが ふわっと 出てきました。あ、楽しい。{childName}の目が きらりと 光ります。",
          pageVisualRole: "discovery",
          imagePromptTemplate:
            withBrushTeethImagePromptGuardrail("Medium action shot of the child actively brushing with delight. The toothbrush fills with foam bubbles that float in soft white clouds near the mouth. The child's expression shifts from reluctance to joy, eyes bright. Soft bubbles drift near the sink. A small shining star motif appears on the toothbrush handle or bubbles. Bright bathroom light. Soft watercolor picture book style, transformation moment, dynamic but gentle, rich but not cluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark."),
        }),
        buildAgeSpecificPage({
          textTemplate: "しゃかしゃか。前歯をもっと頑張る。ぴかぴかになれ。",
          baby_toddler: "しゃかしゃか。ぴかぴか。",
          preschool_3_4:
            "しゃかしゃか。まえばを もっと がんばる。ぴかぴかになれ。{childName}は、はの ひとつひとつに きもちを こめて みがきます。",
          early_reader_5_6:
            "しゃかしゃか。前歯をもっと頑張る。ぴかぴかになれ。{childName}は、小さな手で せいいっぱい 磨いています。",
          early_elementary_7_8:
            "しゃかしゃか。前歯をもっと頑張る。ぴかぴかになれ。{childName}は、じぶんの歯を大事にしようという 気持ちが、ぽかぽかと 湧き上がるのを感じます。",
          general_child:
            "しゃかしゃか。前歯をもっと頑張る。ぴかぴかになれ。{childName}は、歯のひとつひとつに 気持ちを こめて 磨きます。",
          pageVisualRole: "action",
          imagePromptTemplate:
            withBrushTeethImagePromptGuardrail("Action-focused medium shot of the child concentrating hard on brushing the front teeth. The child's hands are on both sides of the toothbrush, mouth open with gentle foam. Keep the toothbrush, toothpaste tube, cup, mirror, and counter completely plain and unlabeled. The toothpaste tube must be completely blank, plain white, and label-free, with no printed text, fake text, logo, decorative writing, symbols, numbers, or letter-like shapes. If needed, turn the tube away from the viewer or partially hide it behind the cup so no product surface can show markings. The mirror reflects the child's focused, determined face. Soft bubbles float around the mouth area. A small shining star motif appears on the mirror frame or tooth foam. Bright clean bathroom. Soft watercolor picture book style, determination and effort, dynamic but gentle, rich but not cluttered."),
        }),
        buildAgeSpecificPage({
          textTemplate: "さらに、奥歯も、そっと探検する。ここにも汚れがあるのか。見つけるぞ。",
          baby_toddler: "奥歯も。そっと。きれいきれい。",
          preschool_3_4:
            "さらに、おくばも、そっと たんけんする。ここにも よごれがあるのか。みつけるぞ。{childName}は、かがみを のぞきながら いっしょうけんめい さがします。",
          early_reader_5_6:
            "さらに、奥歯も、そっと探検する。ここにも汚れがあるのか。見つけるぞ。{childName}は、自分の歯の中を 小さな冒険者のように 探検しています。",
          early_elementary_7_8:
            "さらに、奥歯も、そっと探検する。ここにも汚れがあるのか。見つけるぞ。{childName}は、歯の裏側まで 丁寧に 磨くことで、自分の体を 大事にしている という 実感を 深めていきます。",
          general_child:
            "さらに、奥歯も、そっと探検する。ここにも汚れがあるのか。見つけるぞ。{childName}は、鏡を覗きながら 一生懸命 探します。",
          pageVisualRole: "object_detail",
          imagePromptTemplate:
            withBrushTeethImagePromptGuardrail("Object-detail close shot focused on the child's mouth area as the toothbrush moves toward the back teeth, seen in the mirror. The child tilts the head slightly to the side, concentrating. Soft foam reveals gentle brushing action. Use a plain mirror frame and simple bathroom objects only. The mirror reflects the child's focused expression. A small shining star motif appears on the mirror edge. Soft bathroom light highlighting the brushing motion. Soft watercolor picture book style, intimate exploration, gentle care, rich but not cluttered."),
        }),
        buildAgeSpecificPage({
          textTemplate: "その様子を、おかあさん（またはおとうさん）が、やさしく見守っていました。",
          baby_toddler: "ママも見てる。やさしい。",
          preschool_3_4:
            "そのようすを、おかあさん（またはおとうさん）が、やさしく みまもっていました。{childName}は、その しせんに きづき、もっと がんばろうと おもいました。",
          early_reader_5_6:
            "その様子を、家族が、やさしく見守っていました。{childName}は、その暖かい視線を感じて、一人じゃないんだと 思いました。",
          early_elementary_7_8:
            "その様子を、家族が、やさしく見守っていました。{childName}は、サポートされていることの ありがたさを 無意識に受け取り、その気持ちが 力に 変わっていきます。",
          general_child:
            "その様子を、おかあさん（またはおとうさん）が、やさしく見守っていました。{childName}は、その視線に 気づき、もっと 頑張ろう と 思いました。",
          pageVisualRole: "emotional_closeup",
          imagePromptTemplate:
            withBrushTeethImagePromptGuardrail("Close-up emotional shot of the child brushing intently in the mirror while a family member (parent) stands in soft focus in the background, watching with a warm, proud smile. The parent's hand rests gently on the child's shoulder or nearby. The parent's face shows gentle encouragement without pressure. The mirror frame is plain and simplified. The bathroom wall behind the mirror is plain solid color. A small shining star motif appears on the parent's shirt or nearby. Soft warm bathroom light. Soft watercolor picture book style, supportive family moment, tender and reassuring, rich but not cluttered."),
        }),
        buildAgeSpecificPage({
          textTemplate: "仕上げに、口をゆすぐ。ぐちゅぐちゅ。どんどん、きれいになる。",
          baby_toddler: "ぐちゅぐちゅ。ぴかぴか。できた。",
          preschool_3_4:
            "しあげに、くちをゆすぐ。ぐちゅぐちゅ。どんどん、きれいになる。{childName}は、さいごの しあげに きあいが はいります。",
          early_reader_5_6:
            "仕上げに、口をゆすぐ。ぐちゅぐちゅ。どんどん、きれいになる。{childName}は、水のぬくもりを感じながら、全部 終わったという 喜びが こみ上げます。",
          early_elementary_7_8:
            "仕上げに、口をゆすぐ。ぐちゅぐちゅ。どんどん、きれいになる。{childName}は、最後の最後まで 丁寧に 仕上げることで、自分の 努力を 完成させる 喜びを 知ります。",
          general_child:
            "仕上げに、口をゆすぐ。ぐちゅぐちゅ。どんどん、きれいになる。{childName}は、最後の仕上げに 気合いが入ります。",
          pageVisualRole: "payoff",
          imagePromptTemplate:
            withBrushTeethImagePromptGuardrail("Wide payoff shot of the child rinsing vigorously, water streaming over the face with gentle splashes, foam and bubbles spinning away. The child's expression is determined and joyful. The bathroom counter is tidy around them. A small shining star motif appears on the rinse cup or soap dispenser. Clear water, bright light, sense of completion. Soft watercolor picture book style, accomplishment and freshness, dynamic but clean, rich but not cluttered."),
        }),
        buildAgeSpecificPage({
          textTemplate: "「しゃかしゃか しゅっしゅっ」 はブラシが おどります。あわが ぷくぷく、たのしいな。",
          baby_toddler: "しゃかしゃか。しゅっしゅっ。ぷくぷく。",
          preschool_3_4: "「しゃかしゃか しゅっしゅっ」はブラシが おどります。あわが ぷくぷく、たのしいな。",
          pageVisualRole: "object_detail",
          imagePromptTemplate: withBrushTeethImagePromptGuardrail("Close-up: The toothbrush with toothpaste on it. Focus on the bubbles and the colorful handle. Soft watercolor style."),
        }),
        buildAgeSpecificPage({
          textTemplate: "{childName}の おくの ほうの 歯も、きれいに なってきたよ。ばいきんさん、ばいばい！",
          baby_toddler: "おくの 歯も、しゃかしゃか。ばいきん、ばいばい。",
          preschool_3_4: "おくの ほうの 歯も、きれいに なってきたよ。ばいきんさん、ばいばい！",
          pageVisualRole: "action",
          imagePromptTemplate: withBrushTeethImagePromptGuardrail("Action shot: The child brushing their back teeth enthusiastically. Small soap bubbles or foam near their mouth. Soft watercolor style."),
        }),
        buildAgeSpecificPage({
          textTemplate: "じぶんで できた！ {childName}は じまんげな おかおで にっこり。",
          baby_toddler: "できた！ にっこり。ぴかぴか。",
          preschool_3_4: "じぶんで できた！ かがみを みて、にっこり えがお。",
          pageVisualRole: "emotional_closeup",
          imagePromptTemplate: withBrushTeethImagePromptGuardrail("Close-up: The child looking at themselves in the mirror, smiling proudly with clean teeth. Soft watercolor style."),
        }),
        buildAgeSpecificPage({
          textTemplate: "さいごは パパや ママに しいあげの はみがきを してもらって、ピッカピカ。",
          baby_toddler: "さいごは しいあげ。ピッカピカ。",
          preschool_3_4: "さいごは パパや ママに しいあげを してもらって、ピッカピカ。",
          pageVisualRole: "quiet_ending",
          imagePromptTemplate: withBrushTeethImagePromptGuardrail("Wide shot: A parent helping the child with finishing touches on brushing. A tender, caring moment in the bathroom. Soft watercolor style."),
        }),
        buildAgeSpecificPage({
          textTemplate: "{parentMessage}",
          baby_toddler: "{parentMessage}",
          preschool_3_4: "{parentMessage}",
          early_reader_5_6: "{parentMessage}",
          early_elementary_7_8: "{parentMessage}",
          general_child: "{parentMessage}",
          pageVisualRole: "quiet_ending",
          imagePromptTemplate:
            withBrushTeethImagePromptGuardrail("Wide quiet ending shot of the child at the bathroom mirror after brushing, looking up at their own reflection with a proud, happy smile, holding the toothbrush in one hand. A family member stands beside or behind the child, both gazing at the reflection with warmth. The bathroom is tidy and calm. The mirror is plain with a simple frame. The wall around the mirror is plain solid color—no posters, charts, written notes, or label-like objects. A small shining star motif glows on the nightlight or mirror frame edge only. Soft evening or warm bathroom light. Soft watercolor picture book style, serene satisfied framing, family pride, rich but not cluttered."),
        }),
      ],
    },
  },
    "fixed-sleepy-moon-adventure-12p": {
    name: "おつきさまとおやすみぼうけん（12ページ）",
    description: "月あかりの冒険をゆっくり12ページで描く、安心おやすみテンプレートです。",
    icon: "🌙",
    categoryGroupId: "bedtime",
    subcategoryId: "moon-adventure",
    parentIntent: "今日も安心して眠ってほしい",
    recommendedAgeMin: 2,
    recommendedAgeMax: 8,
    requiredInputs: ["childName"],
    optionalInputs: ["parentMessage"],
    themeTags: ["bedtime", "moon", "comfort", "pilot-12-page"],
    creationMode: "fixed_template",
    variantOf: "fixed-sleepy-moon-adventure",
    variantLabel: "12ページ",
    priceTier: "ume",
    storyCostLevel: "none",
    sampleImageUrl: "/images/templates/fixed-sleepy-moon-adventure.webp",
    sampleImageAlt: "おつきさまといっしょに、ふわふわの雲に乗って夜空をぼうけんする子どもの絵本イメージ（12ページ版）",
    visualDirection:
      "Magical bedtime adventure mood with a child riding a fluffy cloud through a starry night sky towards a friendly moon, soft moonlight, and gentle cloud-and-star adventure over a 12-page rhythm.",
    order: 11.5,
    active: true,
    systemPrompt: "固定テンプレートを使って、寝る前のおやすみぼうけんを12ページでやさしく描く絵本を作ります。",
    fixedStory: {
      titleTemplate: "{childName}とおつきさまのおやすみぼうけん",
      previewImageUrl: "/images/templates/fixed-sleepy-moon-adventure.webp",
      coverImagePromptTemplate:
        withSleepyMoon8pImagePromptGuardrail("Picture book cover illustration: a joyful child happily riding on a fluffy white cloud through a starry night sky towards a large friendly moon, holding a small tan teddy bear, magical and adventurous bedtime mood, soft watercolor style, child-safe rounded composition, rich but not cluttered details"),
      titleSpreadTextTemplate: "おつきさまと おやすみぼうけん",
      openingNarrationTemplate:
        "よるのしずかな へやで、{childName}は まどのむこうの おつきさまを みつけました。きょうも やさしい おやすみぼうけんが はじまります。",
      pageCount: 12,
      layoutVariant: "12_page",
      pages: [        buildAgeSpecificPage({
          textTemplate: "ベッドのうえで、{childName}はまどのそとのおつきさまを見つけました。やさしい月あかりが、おへやをそっと包んでいます。",
          baby_toddler: "{childName}、おつきさま みーつけた。ふわっと あたたかい。",
          preschool_3_4:
            "ベッドのうえで、{childName}は まどのそとの おつきさまを みつけました。やさしい つきあかりが、おへやを そっと つつんでいます。",
          early_reader_5_6:
            "ベッドのうえで、{childName}は まどのそとの おつきさまを みつけました。やさしい 月あかりが おへやを そっと 包んで、なんだか ほっと する 気持ちに なりました。",
          early_elementary_7_8:
            "ベッドのうえで、{childName}は まどのそとの おつきさまを みつけました。やさしい 月あかりが おへやを そっと 包んで、きょうの つかれが すこしずつ ほどけていく ようでした。",
          general_child:
            "ベッドのうえで、{childName}はまどのそとのおつきさまを見つけました。やさしい月あかりが、おへやをそっと包んでいます。",
          pageVisualRole: "opening_establishing",
          imagePromptTemplate:
            withSleepyMoon8pRoomPropGuardrail("Establishing wide shot of a cozy bedroom at night. The same preschool-age child with a short dark-brown bob haircut sits upright on bed under a soft fluffy blanket, wearing the same pale blue pajamas with a tiny simple star pattern and gazing through a window at a bright round moon. The same small tan teddy bear plush sits beside the child. A warm bedside lamp glows in the corner. A tiny glowing star motif appears near the plain unprinted curtain. Moonlight and warm lamp light blend softly in the room. Soft watercolor picture book style, rich but uncluttered composition, child-safe rounded shapes. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark."),
        }),
        buildAgeSpecificPage({
          textTemplate: "{childName}は、もっとよく見たくて、まどのそばにすわりなおしました。おつきさまがぐんと近く見えました。",
          baby_toddler: "{childName}、おつきさまを もっと みたい。ちかい、ちかい。",
          preschool_3_4:
            "{childName}は、もっと よくみたくて、まどのそばに すわりなおしました。おつきさまが ぐんと ちかく みえました。",
          early_reader_5_6:
            "{childName}は、もっと よく見たくて、まどのそばに すわりなおしました。おつきさまが ぐんと 近く 見えて、しずかな よるが もっと 広くなったみたいでした。",
          early_elementary_7_8:
            "{childName}は、もっと よく見たくて、まどのそばに すわりなおしました。おつきさまが ぐんと 近く 見えて、よるの しずかさが からだ全体に ふかく 広がっていきました。",
          general_child:
            "{childName}は、もっとよく見たくて、まどのそばにすわりなおしました。おつきさまがぐんと近く見えました。",
          pageVisualRole: "discovery",
          imagePromptTemplate:
            withSleepyMoon8pRoomPropGuardrail("Medium shot from the side of the same child sitting up in bed, face turned toward a window where a large bright moon fills the glass. The child leans forward with gentle curiosity, wearing the same pale blue pajamas with a tiny simple star pattern, with a soft blanket pooled around the waist. The same small tan teddy bear plush rests on the bed nearby. The curtain is plain fabric with no print or pattern. Moonlight falls softly across the child's face. A tiny glowing star motif appears on the plain window frame edge. Soft watercolor picture book style, intimate wondering mood, rich but uncluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark."),
        }),
        buildAgeSpecificPage({
          textTemplate: "{childName}は、ふわふわの雲やきらきらの星をそうぞうしました。",
          baby_toddler: "ふわふわ くも、きらきら ほし。",
          preschool_3_4:
            "{childName}は、ふわふわの くもや きらきらの ほしを そうぞうしました。",
          early_reader_5_6:
            "{childName}は、ふわふわの くもや きらきらの ほしを そうぞうしました。やさしい ぼうけんが こころのなかで ひろがります。",
          early_elementary_7_8:
            "{childName}は、ふわふわの くもや きらきらの ほしを そうぞうしました。へやにいながら、しずかな よるの そらを たびしている きぶんになります。",
          general_child: "{childName}は、ふわふわの雲やきらきらの星をそうぞうしました。",
          pageVisualRole: "discovery",
          imagePromptTemplate:
            withSleepyMoon8pRoomPropGuardrail(withSleepyMoon8pImagePromptGuardrail("Medium discovery shot of the same child smiling softly on bed while imagining soft glowing cloud wisps and star shapes floating gently around the cozy room. The child keeps the same short dark-brown bob haircut, the same pale blue pajamas with a tiny simple star pattern, and holds the same small tan teddy bear plush. The floating shapes are soft glowing points and curved wisps only, with no connecting lines, no symbol arrangement, no arrow shapes, no constellation-map patterns, no letter-like forms. The bedroom remains clear and safe, with moonlight entering from the window. Background stays simple and uncluttered with no visible bookshelf, no readable book covers, no spine writing, no paper items with visible writing, and no printed room surfaces. Any room props, if shown at all, are soft blurred unmarked shapes only. A small star motif appears among the symbolic floating shapes. Soft watercolor picture book style, dreamy but grounded composition, rich but uncluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark.")),
        }),
        buildAgeSpecificPage({
          textTemplate: "{childName}は、そうぞうの中で、ふわふわの雲に乗ってみました。星たちがやさしくそばで光っています。",
          baby_toddler: "くもに のって、ふわふわ。ほしが きらきら。",
          preschool_3_4:
            "{childName}は、そうぞうの なかで、ふわふわの くもに のってみました。ほしたちが やさしく そばで ひかっています。",
          early_reader_5_6:
            "{childName}は、そうぞうの 中で、ふわふわの 雲に 乗ってみました。やさしく 光る 星たちが そばに 集まって、まるで 夜の 空を たびしているみたいでした。",
          early_elementary_7_8:
            "{childName}は、そうぞうの 中で、ふわふわの 雲に 乗ってみました。星たちが やさしく そばで 光って、へやにいながら よるの 宇宙を たびしている きぶんになります。",
          general_child:
            "{childName}は、そうぞうの中で、ふわふわの雲に乗ってみました。星たちがやさしくそばで光っています。",
          pageVisualRole: "action",
          imagePromptTemplate:
            withSleepyMoon8pImagePromptGuardrail("Action medium shot of the same child seated on a plain fluffy white cloud in an imagination layer above the same clearly recognizable bedroom, surrounded by softly glowing star points. The child keeps the same short dark-brown bob haircut, the same pale blue pajamas with a tiny simple star pattern, and hugs the same small tan teddy bear plush. The cloud surface is smooth and plain with no markings, no symbols, no lines, no arrows, no structural details. Stars appear as scattered soft glowing points only with no connecting lines. The bed, window, and room remain clearly recognizable to ground the dream-play context. The child's expression is gentle and adventurous. A tiny star motif glows near the cloud edge. Soft watercolor picture book style, dreamlike safe adventure, rich but uncluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark."),
        }),
        buildAgeSpecificPage({
          textTemplate: "星たちがやさしくアーチをえがいて、{childName}のまわりをふんわりと囲みました。大きな安心感がひろがりました。",
          baby_toddler: "ほしが ふわっ。{childName}、だいじょうぶ。あったかい。",
          preschool_3_4:
            "ほしたちが やさしく アーチを えがいて、{childName}のまわりを ふんわりと かこみました。なんだか おおきな あんしんかんが ひろがります。",
          early_reader_5_6:
            "星たちが やさしく アーチを えがいて、{childName}の まわりを ふんわりと 囲みました。その やわらかな 光の 中で、大きな 安心感が からだに ひろがりました。",
          early_elementary_7_8:
            "星たちが やさしく アーチを えがいて、{childName}の まわりを ふんわりと 囲みました。その やわらかな 光に 包まれて、きょう一日の 全部が そっと ゆるされていくような 感覚になります。",
          general_child:
            "星たちがやさしくアーチをえがいて、{childName}のまわりをふんわりと囲みました。大きな安心感がひろがりました。",
          pageVisualRole: "payoff",
          imagePromptTemplate:
            withSleepyMoon8pImagePromptGuardrail("Wide payoff shot of the same child surrounded by softly glowing star points arranged in a gentle arc overhead. The child keeps the same short dark-brown bob haircut, the same pale blue pajamas with a tiny simple star pattern, and holds the same small tan teddy bear plush. The stars are scattered soft glowing points in a gentle curve only, with no connecting lines, no symbol arrangement, no constellation-map style, no arrow-like paths. The moon is visible in the background as a plain luminous orb with no surface marks or craters. The child's expression shows serene wonder and contentment. A tiny star motif glows at the arc's highest point. Soft watercolor picture book style, peak wonder and warmth, rich but uncluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark."),
        }),
        buildAgeSpecificPage({
          textTemplate: "おつきさまが「きょうもだいじょうぶ」と見まもってくれているようでした。{childName}のこころはほっとあたたかくなりました。",
          baby_toddler: "だいじょうぶ、って おつきさま。{childName}、あったかい。",
          preschool_3_4:
            "おつきさまが「きょうも だいじょうぶ」と 見まもってくれているようでした。{childName}の こころは ほっと あたたかくなりました。",
          early_reader_5_6:
            "おつきさまが「きょうも だいじょうぶ」と 見まもってくれているようでした。{childName}の こころは ほっと あたたかくなって、安心の 気持ちで いっぱいに なります。",
          early_elementary_7_8:
            "おつきさまが「きょうも だいじょうぶ」と そっと 見まもってくれているようでした。{childName}の こころは、しずかに ほぐれて、やさしい ぬくもりで みたされていきます。",
          general_child:
            "おつきさまが「きょうもだいじょうぶ」と見まもってくれているようでした。{childName}のこころはほっとあたたかくなりました。",
          pageVisualRole: "emotional_closeup",
          imagePromptTemplate:
            withSleepyMoon8pRoomPropGuardrail("Emotional close-up of the same child resting on pillow with peaceful eyes, moonlight softly illuminating the face. The child keeps the same short dark-brown bob haircut, the same pale blue pajamas with a tiny simple star pattern, and hugs the same small tan teddy bear plush with comfort. Outside the window, the moon appears gentle and protective as a plain luminous orb with no surface marks or symbols. A tiny star motif glows near the pillow seam. Intimate calm framing, watercolor picture book style, warm reassurance and quiet confidence, rich but uncluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark."),
        }),
        buildAgeSpecificPage({
          textTemplate: "{childName}は、ふとんの中にもぐりこみました。まぶたがそっとおもくなってきます。おやすみなさい。",
          baby_toddler: "ふとんに もぐって。まぶた おもい。おやすみ。",
          preschool_3_4:
            "{childName}は、ふとんの なかに もぐりこみました。まぶたが そっと おもくなってきます。おやすみなさい。",
          early_reader_5_6:
            "{childName}は、ふとんの 中に もぐりこみました。まぶたが そっと おもくなってきます。きょうの おやすみぼうけんも、これで おわりです。おやすみなさい。",
          early_elementary_7_8:
            "{childName}は、ふとんの 中に もぐりこみました。まぶたが そっと おもくなってきます。きょうの おやすみぼうけんで 感じた やさしい ひかりが、ゆめのなかにも つながっていきそうです。おやすみなさい。",
          general_child:
            "{childName}は、ふとんの中にもぐりこみました。まぶたがそっとおもくなってきます。おやすみなさい。",
          pageVisualRole: "quiet_ending",
          imagePromptTemplate:
            withSleepyMoon8pRoomPropGuardrail("Medium quiet shot of the same child nestled under a soft blanket on their side, eyes gently closing. The child keeps the same short dark-brown bob haircut and the same pale blue pajamas with a tiny simple star pattern. The same small tan teddy bear plush is tucked under the child's arm with no printed features, no appliqué patterns, and no labels. Moonlight casts a gentle silver glow across the pillow. A tiny star motif appears on the plain pillow corner. Any background shelf or bedside surface, if shown at all, contains only plain toys, plain blocks, or a plain basket, with no visible book covers, no spine writing, and no paper items with visible writing. The room is peaceful and still. Soft watercolor picture book style, near-sleep serenity, intimate and safe, rich but uncluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark."),
        }),
        buildAgeSpecificPage({
          textTemplate: "おつきさまの ふねに のって、ほしの うみを ぷかぷか。きもちいいな。",
          baby_toddler: "ほしの うみ。ぷかぷか。",
          preschool_3_4: "おつきさまの ふねに のって、ほしの うみを ぷかぷか。",
          pageVisualRole: "object_detail",
          imagePromptTemplate: withBedtimeGoodDay8pImagePromptGuardrail("Close-up: The child's favorite plush toy resting gently against the child in the dreamscape. Soft glowing light from the stars. Soft watercolor style."),
        }),
        buildAgeSpecificPage({
          textTemplate: "あ、ながれぼし！ {childName}は おねがいごとを しました。なにを おねがいしたのかな？",
          baby_toddler: "ながれぼし！ しゅーっ。きらきら。",
          preschool_3_4: "あ、ながれぼし！ そっと おねがいごとを しました。",
          pageVisualRole: "action",
          imagePromptTemplate: withBedtimeGoodDay8pImagePromptGuardrail("Action shot: The child reaching out to a falling star in the dreamscape. Eyes wide with wonder. Soft watercolor style."),
        }),
        buildAgeSpecificPage({
          textTemplate: "おつきさまが 「また あしたね」と やさしく わらってくれました。",
          baby_toddler: "おつきさま、にっこり。また あした。",
          preschool_3_4: "おつきさまが 「また あしたね」と やさしく わらってくれました。",
          pageVisualRole: "emotional_closeup",
          imagePromptTemplate: withBedtimeGoodDay8pImagePromptGuardrail("Close-up: The child's face lit by gentle moonlight, with a peaceful smile. Soft watercolor style."),
        }),
        buildAgeSpecificPage({
          textTemplate: "ふかふかの おふとんの なかへ。あたたかい ぬくもりに つつまれて。",
          baby_toddler: "ふかふか おふとん。ぽかぽか。",
          preschool_3_4: "ふかふかの おふとんの なかへ。あたたかい ぬくもりに つつまれます。",
          pageVisualRole: "quiet_ending",
          imagePromptTemplate: withBedtimeGoodDay8pImagePromptGuardrail("Medium shot: The child cuddling their blanket closely, looking very comfortable and asleep. Soft watercolor style."),
        }),
        buildAgeSpecificPage({
          textTemplate: "{parentMessage}",
          baby_toddler: "{parentMessage}",
          preschool_3_4: "{parentMessage}",
          early_reader_5_6: "{parentMessage}",
          early_elementary_7_8: "{parentMessage}",
          general_child: "{parentMessage}",
          pageVisualRole: "quiet_ending",
          imagePromptTemplate:
            withSleepyMoon8pRoomPropGuardrail(`Wide quiet ending shot of the same child asleep comfortably in bed under a soft blanket. The child keeps the same short dark-brown bob haircut and the same pale blue pajamas with a tiny simple star pattern. The same small tan teddy bear plush rests by the child's side. Moonlight paints gentle silver highlights across the room while warm ambient light remains subtle. A tiny star motif appears on the plain blanket edge. Final bedtime scene is visual-only with no message area, no cloud frame, and no invented writing surface. Serene bedtime stillness, safe and cozy environment, watercolor picture book style, balanced calm composition, rich but uncluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark. ${SLEEPY_MOON_8P_ENDING_NO_BUBBLE_CLAUSE}`),
        }),
      ],
    },
  },
  "blank-dream-job-8p": {
    name: "○○になりたい！",
    description: "なりたいものを一言入れるだけ。夢を持つよろこびの絵本。",
    icon: "🌈",
    categoryGroupId: "blank-templates",
    parentIntent: "自由に想像して、ワクワクしてほしい",
    recommendedAgeMin: 2,
    recommendedAgeMax: 8,
    requiredInputs: ["childName", "storyRequest"],
    optionalInputs: ["parentMessage"],
    themeTags: ["dream", "job", "imagination", "blank"],
    creationMode: "fixed_template",
    isBlankTemplate: true,
    blankLabel: "なりたいものは何ですか？",
    blankExample: "例：ケーキやさん、でんしゃのうんてんし、うちゅうひこうし、まほうつかい",
    priceTier: "take",
    storyCostLevel: "none",
    sampleImageUrl: "/images/templates/fantasy.webp",
    sampleImageAlt: "夢のおしごとを絵本にしたイメージ",
    visualDirection:
      "Bright imaginative picture-book mood celebrating a child's dream of who they want to become — full of wonder, possibility, and gentle encouragement.",
    order: 117,
    active: true,
    systemPrompt: "穴埋めテンプレートを使って、夢のおしごと絵本を作ります。",
    fixedStory: {
      previewImageUrl: "/images/templates/fantasy.webp",
      titleTemplate: "{childName}は {storyRequest}になりたい",
      coverImagePromptTemplate: withFixedImagePromptSafety(
        "Picture book cover illustration: a dreaming young child looking up at a bright rainbow sky with stars, imagining their bright future, rainbow motifs arching across the cover, a glowing dream bubble above their head full of wonder and possibility, warm inspiring light, soft watercolor picture book style, rounded child-safe composition, rich but not cluttered"
      ),
      titleSpreadTextTemplate: "ゆめは、おおきくひろがる！",
      openingNarrationTemplate:
        "{childName}には、大きな夢があります。それは、{storyRequest}になること！",
      pages: [
        buildAgeSpecificPage({
          textTemplate:
            "{childName}は、{storyRequest}になりたいです。ずっとずっと前から。",
          preschool_3_4:
            "{childName}は、{storyRequest}になりたいです。ずっとずっと前から。",
          early_reader_5_6:
            "{childName}の夢は、{storyRequest}になることです。ずっと前から、心に決めていました。",
          early_elementary_7_8:
            "{childName}の夢は、{storyRequest}になることです。小さいころからずっと、ずっと夢見ていました。",
          general_child:
            "{childName}は、{storyRequest}になりたいです。ずっとずっと前から。",
          pageVisualRole: "opening_establishing",
          imagePromptTemplate:
            "Wide establishing shot of a young child gazing up dreamily at a sky filled with rainbows and stars, their whole being radiating hope and imagination, a soft dream bubble glowing above their head, rainbow motifs arching overhead, warm inspiring light, soft watercolor picture book style, big dreaming establishing mood, rich but not cluttered",
        }),
        buildAgeSpecificPage({
          textTemplate:
            "どんな一日を過ごすんだろう？{childName}は想像します。",
          preschool_3_4:
            "どんな一日を過ごすんだろう？{childName}は想像します。",
          early_reader_5_6:
            "{storyRequest}になったら、どんな一日を過ごすんだろう？{childName}は想像します。",
          early_elementary_7_8:
            "{storyRequest}として働く一日を、{childName}は想像します。朝から夜まで、どんなことをするんだろう？",
          general_child:
            "どんな一日を過ごすんだろう？{childName}は想像します。",
          pageVisualRole: "discovery",
          imagePromptTemplate:
            "Daydream scene of a child with eyes slightly closed and a dreamy smile, a glowing dream bubble showing an imagined future day, rainbow motifs drifting gently around, soft warm light, soft watercolor picture book style, dreamy imaginative mood, rich but not cluttered",
        }),
        buildAgeSpecificPage({
          textTemplate: "朝起きたら、まず何をするかな。",
          preschool_3_4: "朝起きたら、まず何をするかな。",
          early_reader_5_6:
            "{storyRequest}になったら、朝起きたら何をするかな。{childName}はわくわくしながら考えます。",
          early_elementary_7_8:
            "{storyRequest}として働く朝は、きっとわくわくの連続でしょう。{childName}は朝ごとに心が弾みます。",
          general_child: "朝起きたら、まず何をするかな。",
          pageVisualRole: "action",
          imagePromptTemplate:
            "Morning imagination scene of a child stretching and waking up, looking out at a bright new day with dreams in their eyes, rainbow light streaming through a window, soft morning light, soft watercolor picture book style, hopeful morning mood, rich but not cluttered",
        }),
        buildAgeSpecificPage({
          textTemplate:
            "いろんな人を喜ばせることができるんだ。",
          preschool_3_4:
            "いろんな人を喜ばせることができるんだ。",
          early_reader_5_6:
            "{storyRequest}になれば、たくさんの人を喜ばせることができます。それが{childName}のいちばんの夢です。",
          early_elementary_7_8:
            "{storyRequest}になれば、いろんな人を喜ばせることができる。それが、{childName}の夢の中心にあることです。",
          general_child:
            "いろんな人を喜ばせることができるんだ。",
          pageVisualRole: "emotional_closeup",
          imagePromptTemplate:
            "Warm close-up of a child imagining bringing joy to others, a big heartfelt smile and glowing expression, small heart motifs and rainbow light floating around, soft watercolor picture book style, warm giving mood, rich but not cluttered",
        }),
        buildAgeSpecificPage({
          textTemplate:
            "そのためには、たくさん学んで、練習が必要かもしれない。",
          preschool_3_4:
            "そのためには、たくさんがんばる必要があるかもしれない。",
          early_reader_5_6:
            "夢をかなえるためには、たくさん学んで練習が必要かもしれない。でも{childName}はやる気満々です。",
          early_elementary_7_8:
            "夢に向かうには、努力と学びが必要です。でも{childName}には大きなやる気があります。",
          general_child:
            "そのためには、たくさん学んで、練習が必要かもしれない。",
          pageVisualRole: "action",
          imagePromptTemplate:
            "Determined action scene of a child earnestly practicing and learning something, a look of focused effort on their face, rainbow motif visible in the background encouraging them, warm soft light, soft watercolor picture book style, earnest learning mood, rich but not cluttered",
        }),
        buildAgeSpecificPage({
          textTemplate:
            "でも{childName}には夢がある。それが、いちばんの力です。",
          preschool_3_4:
            "でも{childName}には夢がある。それが、いちばんの力です。",
          early_reader_5_6:
            "でも{childName}には夢がある。それが、いちばんの力です。夢が、前に進む力をくれます。",
          early_elementary_7_8:
            "でも{childName}には大きな夢がある。夢を持つことが、何よりも大きな力になるのです。",
          general_child:
            "でも{childName}には夢がある。それが、いちばんの力です。",
          pageVisualRole: "payoff",
          imagePromptTemplate:
            "Inspiring wide shot of the child standing tall and confident, rainbow light surrounding them like a golden halo, star motifs and rainbow motifs bursting with energy behind them, a shining determined expression, soft watercolor picture book style, powerful inspiring mood, rich but not cluttered",
        }),
        buildAgeSpecificPage({
          textTemplate:
            "夢のことを考えると、{childName}はいつも笑顔になります。",
          preschool_3_4:
            "夢のことを考えると、{childName}はいつも笑顔になります。",
          early_reader_5_6:
            "夢のことを考えると、{childName}はいつも笑顔になります。夢って、不思議な力がありますね。",
          early_elementary_7_8:
            "夢のことを考えると、{childName}はいつも笑顔になります。それがあるだけで、毎日が輝いています。",
          general_child:
            "夢のことを考えると、{childName}はいつも笑顔になります。",
          pageVisualRole: "emotional_closeup",
          imagePromptTemplate:
            "Peaceful close-up of a child with a radiant warm smile, softly daydreaming about their future, rainbow light and small stars glowing gently around their face, soft watercolor picture book style, dreamy contented joy mood, rich but not cluttered",
        }),
        buildAgeSpecificPage({
          textTemplate:
            "{storyRequest}になる日を夢みながら、今日もがんばろう。{parentMessage}",
          baby_toddler:
            "ゆめに むかって、がんばろう！{parentMessage}",
          preschool_3_4:
            "{storyRequest}になる日を夢みながら、今日もがんばろう。{parentMessage}",
          early_reader_5_6:
            "{storyRequest}になる日を夢みながら、今日もがんばろう。夢は、きっとかなう！{parentMessage}",
          early_elementary_7_8:
            "{storyRequest}になる日を夢みながら、今日もがんばろう。{childName}の夢は、かならずかなうと思います。{parentMessage}",
          general_child:
            "{storyRequest}になる日を夢みながら、今日もがんばろう。{parentMessage}",
          pageVisualRole: "quiet_ending",
          imagePromptTemplate:
            "Peaceful inspiring ending shot of a child looking up at a soft twilight sky filled with gentle stars and rainbow glimmers, a serene hopeful smile on their face, rainbow motifs glowing softly like a promise from the future, soft watercolor picture book style, hopeful tender ending mood, rich but not cluttered",
        }),
      ],
    },
  },
};

const legacyTemplateIds = ["birthday", "seasons", "challenge", "family"];

const templateMetadata: Record<string, Partial<TemplateData>> = {
  animals: {
    categoryGroupId: "favorite-worlds",
    parentIntent: "この子の好きなものを伸ばしたい",
    recommendedAgeMin: 2,
    recommendedAgeMax: 7,
    requiredInputs: ["childName"],
    optionalInputs: ["favorites", "characterLook", "signatureItem", "colorMood"],
  },
  adventure: {
    categoryGroupId: "imagination",
    parentIntent: "自由に想像して、ワクワクしてほしい",
    recommendedAgeMin: 3,
    recommendedAgeMax: 8,
    requiredInputs: ["childName"],
    optionalInputs: ["favorites", "place", "parentMessage"],
  },
  fantasy: {
    categoryGroupId: "imagination",
    parentIntent: "自由に想像して、ワクワクしてほしい",
    recommendedAgeMin: 3,
    recommendedAgeMax: 8,
    requiredInputs: ["childName"],
    optionalInputs: ["favorites", "colorMood", "parentMessage"],
  },
  bedtime: {
    categoryGroupId: "bedtime",
    parentIntent: "今日も安心して眠ってほしい",
    recommendedAgeMin: 1,
    recommendedAgeMax: 6,
    requiredInputs: ["childName"],
    optionalInputs: ["parentMessage", "colorMood"],
  },
  "emotional-growth": {
    categoryGroupId: "emotional-growth",
    parentIntent: "優しい子に育ってほしい。自信を持ってほしい",
    recommendedAgeMin: 3,
    recommendedAgeMax: 8,
    requiredInputs: ["childName"],
    optionalInputs: ["lessonToTeach", "parentMessage", "favorites"],
  },
  "daily-habits": {
    categoryGroupId: "growth-support",
    parentIntent: "できるようになってほしい。でも怒らず応援したい",
    recommendedAgeMin: 2,
    recommendedAgeMax: 6,
    requiredInputs: ["childName", "lessonToTeach"],
    optionalInputs: ["favorites", "parentMessage"],
  },
  educational: {
    categoryGroupId: "learning",
    parentIntent: "勉強っぽくなく、自然に学んでほしい",
    recommendedAgeMin: 2,
    recommendedAgeMax: 7,
    requiredInputs: ["childName"],
    optionalInputs: ["favorites", "lessonToTeach"],
  },
  food: {
    categoryGroupId: "favorite-worlds",
    parentIntent: "この子の好きなものを伸ばしたい",
    recommendedAgeMin: 2,
    recommendedAgeMax: 7,
    requiredInputs: ["childName"],
    optionalInputs: ["favorites", "lessonToTeach"],
  },
  seasonal: {
    categoryGroupId: "seasonal-events",
    parentIntent: "季節の体験を特別な思い出にしたい",
    recommendedAgeMin: 2,
    recommendedAgeMax: 8,
    requiredInputs: ["childName"],
    optionalInputs: ["season", "memoryToRecreate", "familyMembers"],
  },
  "vehicles-robots": {
    categoryGroupId: "favorite-worlds",
    parentIntent: "この子の好きなものを伸ばしたい",
    recommendedAgeMin: 2,
    recommendedAgeMax: 8,
    requiredInputs: ["childName"],
    optionalInputs: ["favorites", "place"],
  },
};

const defaultTemplateMetadata: Partial<TemplateData> = {
  creationMode: "guided_ai",
  priceTier: "take",
  storyCostLevel: "standard",
};

async function seed(): Promise<void> {
  const batch = db.batch();
  for (const [id, data] of Object.entries(categoryGroups)) {
    batch.set(db.doc(`categoryGroups/${id}`), data);
  }
  for (const [id, data] of Object.entries(SEED_TEMPLATES)) {
    batch.set(db.doc(`templates/${id}`), {
      ...defaultTemplateMetadata,
      ...data,
      ...templateMetadata[id],
    });
  }
  for (const id of legacyTemplateIds) {
    batch.set(db.doc(`templates/${id}`), { active: false }, { merge: true });
  }
  await batch.commit();
  console.log(`Seeded ${Object.keys(SEED_TEMPLATES).length} templates.`);
}

export const seedTemplates = onCall(
  {
    region: "asia-northeast1",
  },
  async () => {
    await seed();
    return { message: "Templates seeded successfully" };
  }
);

// For local execution
if (require.main === module) {
  seed().catch(console.error);
}

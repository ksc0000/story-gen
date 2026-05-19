import type { IllustrationStyle, IllustrationStyleProfile } from "./types";

export const ILLUSTRATION_STYLE_PROFILES: IllustrationStyleProfile[] = [
  {
    id: "soft_watercolor",
    name: "やさしい水彩",
    previewImageUrl: "/images/styles/soft_watercolor.webp",
    styleBible:
      "Japanese children's picture book watercolor style, soft warm colors, pale colors, gentle pigment blooms, hand-painted paper texture, cozy lighting, tender child-friendly atmosphere.",
    negativeStyleRules: [
      "Do not add readable text, logos, or watermarks.",
      "Do not make the rendering harsh, metallic, or photorealistic.",
    ],
    usePreviewAsReference: false,
  },
  {
    id: "fluffy_pastel",
    name: "ふんわりパステル",
    previewImageUrl: "/images/styles/fluffy_pastel.webp",
    styleBible:
      "Fluffy pastel picture book style, soft rounded forms, airy colors, gentle edges, cute toddler-friendly design, plush and comforting mood.",
    negativeStyleRules: [
      "Do not add readable text, logos, or watermarks.",
      "Do not make the palette harsh or neon-heavy.",
    ],
    usePreviewAsReference: false,
  },
  {
    id: "crayon",
    name: "クレヨンで描いた絵本",
    previewImageUrl: "/images/styles/crayon.webp",
    styleBible:
      "Crayon storybook style, warm hand-drawn strokes, waxy texture, playful childlike marks, colorful but gentle page design.",
    negativeStyleRules: [
      "Do not add readable text, logos, or watermarks.",
      "Do not make the lines too mechanical or vector-clean.",
    ],
    usePreviewAsReference: false,
  },
  {
    id: "flat_illustration",
    name: "シンプルフラット",
    previewImageUrl: "/images/styles/flat_illustration.webp",
    styleBible:
      "Simple flat illustration style, bright clean colors, readable shapes, minimal shadows, modern child-friendly picture book layout.",
    negativeStyleRules: [
      "Do not add readable text, logos, or watermarks.",
      "Do not add gritty textures or realistic photographic detail.",
    ],
    usePreviewAsReference: false,
  },
  {
    id: "anime_storybook",
    name: "わくわくアニメ風",
    previewImageUrl: "/images/styles/anime_storybook.webp",
    styleBible:
      "Anime-inspired picture book style, expressive faces, sparkling eyes, lively framing, vivid but soft family-safe colors, warm fantasy energy.",
    negativeStyleRules: [
      "Do not add readable text, logos, or watermarks.",
      "Do not make the characters look too old or too dramatic.",
    ],
    usePreviewAsReference: false,
  },
  {
    id: "classic_picture_book",
    name: "クラシック絵本",
    previewImageUrl: "/images/styles/classic_picture_book.webp",
    styleBible:
      "Classic picture book illustration, traditional fairytale warmth, detailed linework, painterly textures, timeless storybook atmosphere.",
    negativeStyleRules: [
      "Do not add readable text, logos, or watermarks.",
      "Do not make the scene grim, dark, or threatening.",
    ],
    usePreviewAsReference: false,
  },
  {
    id: "toy_3d",
    name: "ぷっくり3Dトイ風",
    previewImageUrl: "/images/styles/toy_3d.webp",
    styleBible:
      "Rounded 3D toy storybook style, clay-like forms, playful miniature diorama feeling, soft plastic texture, bright child-safe lighting.",
    negativeStyleRules: [
      "Do not add readable text, logos, or watermarks.",
      "Do not make surfaces glossy in a hard commercial CG way.",
    ],
    usePreviewAsReference: false,
  },
  {
    id: "paper_collage",
    name: "紙あそびコラージュ",
    previewImageUrl: "/images/styles/paper_collage.webp",
    styleBible:
      "Paper cut collage picture book style, layered handmade paper textures, tactile edges, warm craft feeling, playful child-friendly composition.",
    negativeStyleRules: [
      "Do not add readable text, logos, or watermarks.",
      "Do not make the scene slick or photorealistic.",
    ],
    usePreviewAsReference: false,
  },
  {
    id: "pencil_sketch",
    name: "やさしい鉛筆スケッチ",
    previewImageUrl: "/images/styles/pencil_sketch.webp",
    styleBible:
      "Gentle pencil sketch picture book style, delicate line art, subtle color tinting, nostalgic quiet mood, soft hand-drawn feeling.",
    negativeStyleRules: [
      "Do not add readable text, logos, or watermarks.",
      "Do not make the sketch scratchy, harsh, or adult-oriented.",
    ],
    usePreviewAsReference: false,
  },
  {
    id: "colorful_pop",
    name: "カラフルポップ",
    previewImageUrl: "/images/styles/colorful_pop.webp",
    styleBible:
      "Colorful pop picture book style, vivid joyful colors, friendly rounded forms, playful graphic energy, clear child-safe staging.",
    negativeStyleRules: [
      "Do not add readable text, logos, or watermarks.",
      "Do not make the page cluttered or overstimulating.",
    ],
    usePreviewAsReference: false,
  },
  {
    id: "watercolor",
    name: "やさしい水彩",
    previewImageUrl: "/images/styles/soft_watercolor.webp",
    styleBible:
      "Japanese children's picture book watercolor style, soft warm colors, pale colors, gentle pigment blooms, hand-painted paper texture, cozy lighting, tender child-friendly atmosphere.",
    negativeStyleRules: [
      "Do not add readable text, logos, or watermarks.",
      "Do not make the rendering harsh, metallic, or photorealistic.",
    ],
    usePreviewAsReference: false,
  },
  {
    id: "flat",
    name: "シンプルフラット",
    previewImageUrl: "/images/styles/flat_illustration.webp",
    styleBible:
      "Simple flat illustration style, bright clean colors, readable shapes, minimal shadows, modern child-friendly picture book layout.",
    negativeStyleRules: [
      "Do not add readable text, logos, or watermarks.",
      "Do not add gritty textures or realistic photographic detail.",
    ],
    usePreviewAsReference: false,
  },
];

export function getIllustrationStyleProfile(
  style: IllustrationStyle
): IllustrationStyleProfile {
  return (
    ILLUSTRATION_STYLE_PROFILES.find((profile) => profile.id === style) ??
    ILLUSTRATION_STYLE_PROFILES[0]
  );
}


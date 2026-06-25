import type { IllustrationStyle, IllustrationStyleProfile } from "@/lib/types";

export const ILLUSTRATION_STYLE_PROFILES: IllustrationStyleProfile[] = [
  {
    id: "soft_watercolor",
    name: "やさしい水彩",
    previewImageUrl: "https://firebasestorage.googleapis.com/v0/b/story-gen-8a769.firebasestorage.app/o/style-previews%2Fsoft_watercolor.png?alt=media&token=stylepreview-gptimage2-v1",
    styleBible:
      "Japanese children's picture book watercolor style, soft warm colors, pale colors, gentle pigment blooms, soft wet-on-wet transitions, delicate washes, artful use of white space, subtle pencil under-drawing, hand-painted paper texture, cozy lighting, tender child-friendly atmosphere.",
    negativeStyleRules: [
      "Do not add readable text, logos, or watermarks.",
      "Do not make the rendering harsh, metallic, or photorealistic.",
      "Avoid heavy black outlines, sharp digital edges, or solid flat fills without texture.",
      "No neon or overly saturated colors.",
    ],
    usePreviewAsReference: false,
  },
  {
    id: "fluffy_pastel",
    name: "ふんわりパステル",
    previewImageUrl: "https://firebasestorage.googleapis.com/v0/b/story-gen-8a769.firebasestorage.app/o/style-previews%2Ffluffy_pastel.png?alt=media&token=stylepreview-gptimage2-v1",
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
    previewImageUrl: "https://firebasestorage.googleapis.com/v0/b/story-gen-8a769.firebasestorage.app/o/style-previews%2Fcrayon.png?alt=media&token=stylepreview-gptimage2-v1",
    styleBible:
      "Crayon storybook style, thick waxy crayon strokes with visible grainy crayon texture, bold chunky childlike outlines, uneven hand-pressed coloring with paper tooth showing through, warm hand-drawn marks, colorful but gentle page design.",
    negativeStyleRules: [
      "Do not add readable text, logos, or watermarks.",
      "Do not make the lines too mechanical or vector-clean.",
      "Do not render it as soft watercolor, smooth digital painting, or airbrushed gradients.",
    ],
    usePreviewAsReference: false,
  },
  {
    id: "flat_illustration",
    name: "シンプルフラット",
    previewImageUrl: "https://firebasestorage.googleapis.com/v0/b/story-gen-8a769.firebasestorage.app/o/style-previews%2Fflat_illustration.png?alt=media&token=stylepreview-gptimage2-v1",
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
    previewImageUrl: "https://firebasestorage.googleapis.com/v0/b/story-gen-8a769.firebasestorage.app/o/style-previews%2Fanime_storybook.png?alt=media&token=stylepreview-gptimage2-v1",
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
    previewImageUrl: "https://firebasestorage.googleapis.com/v0/b/story-gen-8a769.firebasestorage.app/o/style-previews%2Fclassic_picture_book.png?alt=media&token=stylepreview-gptimage2-v1",
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
    previewImageUrl: "https://firebasestorage.googleapis.com/v0/b/story-gen-8a769.firebasestorage.app/o/style-previews%2Ftoy_3d.png?alt=media&token=stylepreview-gptimage2-v1",
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
    previewImageUrl: "https://firebasestorage.googleapis.com/v0/b/story-gen-8a769.firebasestorage.app/o/style-previews%2Fpaper_collage.png?alt=media&token=stylepreview-gptimage2-v1",
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
    previewImageUrl: "https://firebasestorage.googleapis.com/v0/b/story-gen-8a769.firebasestorage.app/o/style-previews%2Fpencil_sketch.png?alt=media&token=stylepreview-gptimage2-v1",
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
    previewImageUrl: "https://firebasestorage.googleapis.com/v0/b/story-gen-8a769.firebasestorage.app/o/style-previews%2Fcolorful_pop.png?alt=media&token=stylepreview-gptimage2-v1",
    styleBible:
      "Colorful pop picture book style, highly saturated vivid bold colors, punchy bright high-contrast palette, friendly rounded forms, playful graphic energy, clear child-safe staging.",
    negativeStyleRules: [
      "Do not add readable text, logos, or watermarks.",
      "Do not make the page cluttered or overstimulating.",
    ],
    usePreviewAsReference: false,
  },
  {
    id: "watercolor",
    name: "やさしい水彩",
    previewImageUrl: "https://firebasestorage.googleapis.com/v0/b/story-gen-8a769.firebasestorage.app/o/style-previews%2Fsoft_watercolor.png?alt=media&token=stylepreview-gptimage2-v1",
    styleBible:
      "Japanese children's picture book watercolor style, soft warm colors, pale colors, gentle pigment blooms, soft wet-on-wet transitions, delicate washes, artful use of white space, subtle pencil under-drawing, hand-painted paper texture, cozy lighting, tender child-friendly atmosphere.",
    negativeStyleRules: [
      "Do not add readable text, logos, or watermarks.",
      "Do not make the rendering harsh, metallic, or photorealistic.",
      "Avoid heavy black outlines, sharp digital edges, or solid flat fills without texture.",
      "No neon or overly saturated colors.",
    ],
    usePreviewAsReference: false,
  },
  {
    id: "flat",
    name: "シンプルフラット",
    previewImageUrl: "https://firebasestorage.googleapis.com/v0/b/story-gen-8a769.firebasestorage.app/o/style-previews%2Fflat_illustration.png?alt=media&token=stylepreview-gptimage2-v1",
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


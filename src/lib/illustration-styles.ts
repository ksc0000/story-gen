import type { IllustrationStyle, IllustrationStyleProfile } from "@/lib/types";

export const ILLUSTRATION_STYLE_PROFILES: IllustrationStyleProfile[] = [
  {
    id: "soft_watercolor",
    name: "やさしい水彩",
    previewImageUrl: "https://firebasestorage.googleapis.com/v0/b/story-gen-8a769.firebasestorage.app/o/style-previews%2Fsoft_watercolor.png?alt=media&token=stylepreview-gptimage2-v1",
    styleBible:
      "Japanese children's picture book in soft watercolor paint. Translucent watercolor washes layered on white paper — gentle pigment blooms, wet-on-wet color bleeds, paper grain showing through. Soft pencil under-drawing visible beneath the washes. Colors are pale and muted: dusty pinks, sage greens, warm creams. Edges of shapes bleed softly into one another. The overall feel is hand-painted, intimate, and tender.",
    negativeStyleRules: [
      "Do not add readable text, logos, or watermarks.",
      "No sharp digital edges, no bold black outlines, no flat solid fills, no clean vector shapes.",
      "No photorealistic rendering, no neon or overly saturated colors.",
      "No 3D rendering, no crayon textures, no collage layers.",
    ],
    usePreviewAsReference: false,
  },
  {
    id: "fluffy_pastel",
    name: "ふんわりパステル",
    previewImageUrl: "https://firebasestorage.googleapis.com/v0/b/story-gen-8a769.firebasestorage.app/o/style-previews%2Ffluffy_pastel.png?alt=media&token=stylepreview-gptimage2-v1",
    styleBible:
      "Children's picture book with a soft, dreamy pastel aesthetic. Rounded, plush-looking forms like stuffed animals or soft toys. Cotton-candy pastel palette: baby pink, mint, lavender, peach, sky blue. Edges are soft and diffused, as if drawn with pastel chalk or a soft brush. Backgrounds feel airy and cloud-like. Every element looks squeezable and gentle — nothing angular or harsh.",
    negativeStyleRules: [
      "Do not add readable text, logos, or watermarks.",
      "No harsh outlines, no dark shadows, no saturated neon colors.",
      "No photorealistic rendering, no 3D hard surfaces, no crayon roughness.",
      "No flat bold vector fills — keep all shapes soft and rounded.",
    ],
    usePreviewAsReference: false,
  },
  {
    id: "crayon",
    name: "クレヨンで描いた絵本",
    previewImageUrl: "https://firebasestorage.googleapis.com/v0/b/story-gen-8a769.firebasestorage.app/o/style-previews%2Fcrayon.png?alt=media&token=stylepreview-gptimage2-v1",
    styleBible:
      "Children's picture book drawn entirely in wax crayons. Thick, waxy crayon strokes visible in every area. Bold chunky outlines drawn with a black or dark crayon, slightly uneven. Color fills are uneven and streaky with white paper tooth showing through the crayon pressure. The texture feels like a child's drawing done with real Crayola-style crayons. Warm, hand-made, imperfect energy.",
    negativeStyleRules: [
      "Do not add readable text, logos, or watermarks.",
      "No smooth digital rendering, no clean vector shapes, no photorealistic detail.",
      "No watercolor washes, no soft pastel blending, no airbrushed gradients.",
      "Keep all marks looking hand-pressed with a real wax crayon.",
    ],
    usePreviewAsReference: false,
  },
  {
    id: "flat_illustration",
    name: "シンプルフラット",
    previewImageUrl: "https://firebasestorage.googleapis.com/v0/b/story-gen-8a769.firebasestorage.app/o/style-previews%2Fflat_illustration.png?alt=media&token=stylepreview-gptimage2-v1",
    styleBible:
      "Modern flat digital illustration for children's picture book. Every shape is a clean, solid-filled area of color — like vector art or a clean 2D digital illustration. Bold simple outlines. No watercolor washes, no paint texture, no paper grain, no brush strokes, no wet bleeds. Colors are vivid and solid. Shadows are minimal — at most a single flat shadow shape. The overall look is clean, graphic, and modern like a high-quality picture book app illustration.",
    negativeStyleRules: [
      "Do not add readable text, logos, or watermarks.",
      "Absolutely no watercolor, no paint texture, no paper grain, no ink bleeds, no brushwork, no pigment blooms.",
      "No photorealistic rendering, no 3D shading, no gritty textures.",
      "No heavy gradients — use flat or very simple gradient fills only.",
      "Night and dark scenes must keep bright vivid colors — use flat ambient glow shapes. Do not darken the palette.",
    ],
    usePreviewAsReference: false,
  },
  {
    id: "anime_storybook",
    name: "わくわくアニメ風",
    previewImageUrl: "https://firebasestorage.googleapis.com/v0/b/story-gen-8a769.firebasestorage.app/o/style-previews%2Fanime_storybook.png?alt=media&token=stylepreview-gptimage2-v1",
    styleBible:
      "Children's picture book in a clean anime illustration style. Characters have large expressive eyes with sparkle highlights, clean bold outlines, and smooth cel-shaded coloring (flat color areas with one or two simple shadow tones). The look is like a high-quality Japanese anime children's show — vivid saturated colors, dynamic poses, lively facial expressions. Backgrounds are detailed and painterly but slightly softer than the characters.",
    negativeStyleRules: [
      "Do not add readable text, logos, or watermarks.",
      "No watercolor washes or paper textures — use clean digital cel-shading.",
      "No photorealistic rendering. Characters must look animated, not real.",
      "Do not make characters look too mature, dark, or dramatic — keep it family-friendly.",
    ],
    usePreviewAsReference: false,
  },
  {
    id: "classic_picture_book",
    name: "クラシック絵本",
    previewImageUrl: "https://firebasestorage.googleapis.com/v0/b/story-gen-8a769.firebasestorage.app/o/style-previews%2Fclassic_picture_book.png?alt=media&token=stylepreview-gptimage2-v1",
    styleBible:
      "Classic Western-style storybook illustration, like mid-20th century Golden Age picture books (think Beatrix Potter or classic Grimm fairy tale illustrations). Detailed pen-and-ink linework with rich gouache or oil-like painterly coloring. Warm amber, forest green, and earthy tones. Textures feel hand-painted with visible brushwork. Compositions are cozy and timeless — detailed but not chaotic.",
    negativeStyleRules: [
      "Do not add readable text, logos, or watermarks.",
      "No modern flat digital aesthetic, no neon colors, no anime-style linework.",
      "No grim, dark, or threatening imagery — keep the storybook mood warm and inviting.",
      "No photorealistic rendering.",
    ],
    usePreviewAsReference: false,
  },
  {
    id: "toy_3d",
    name: "ぷっくり3Dトイ風",
    previewImageUrl: "https://firebasestorage.googleapis.com/v0/b/story-gen-8a769.firebasestorage.app/o/style-previews%2Ftoy_3d.png?alt=media&token=stylepreview-gptimage2-v1",
    styleBible:
      "3D rendered children's picture book with a toy or clay animation aesthetic. Characters and objects look like physical miniature figurines or Claymation models — slightly rounded, plump forms with soft subsurface-like lighting. Studio lighting with gentle shadows. Colors are bright and plastic-like but not harsh. The overall feeling is like a stop-motion animated film or a 3D Pixar-style storybook.",
    negativeStyleRules: [
      "Do not add readable text, logos, or watermarks.",
      "No flat 2D illustration, no watercolor, no hand-drawn textures.",
      "Do not make surfaces mirror-glossy or hard-CG metallic.",
      "Night and dark scenes must keep bright child-safe lighting — use soft moonlight or warm indoor glow. Do not use dark moody photorealistic night lighting.",
    ],
    usePreviewAsReference: false,
  },
  {
    id: "paper_collage",
    name: "紙あそびコラージュ",
    previewImageUrl: "https://firebasestorage.googleapis.com/v0/b/story-gen-8a769.firebasestorage.app/o/style-previews%2Fpaper_collage.png?alt=media&token=stylepreview-gptimage2-v1",
    styleBible:
      "Children's picture book made of layered cut paper collage, like Eric Carle's illustration style. Every element looks like it was cut from colored tissue paper, construction paper, or painted newsprint and layered together. Visible paper edges, slight shadow from paper layers, visible paper grain and texture. Bold simple shapes built from overlapping paper pieces. Warm, craft-project feeling.",
    negativeStyleRules: [
      "Do not add readable text, logos, or watermarks.",
      "No smooth digital rendering, no 3D forms, no photorealistic detail.",
      "No hand-painted watercolor look — shapes must look like cut paper, not painted brushstrokes.",
      "No crayon textures.",
    ],
    usePreviewAsReference: false,
  },
  {
    id: "pencil_sketch",
    name: "やさしい鉛筆スケッチ",
    previewImageUrl: "https://firebasestorage.googleapis.com/v0/b/story-gen-8a769.firebasestorage.app/o/style-previews%2Fpencil_sketch.png?alt=media&token=stylepreview-gptimage2-v1",
    styleBible:
      "Children's picture book drawn in soft pencil on white paper. Delicate pencil lines with varying pressure — light hatching for shadows, gentle cross-hatching for textures. Mostly black-and-white with very subtle warm color tints added like a light wash over pencil. The paper is white and prominent. The feeling is like a beautiful illustrated journal or a classic pencil-illustrated storybook.",
    negativeStyleRules: [
      "Do not add readable text, logos, or watermarks.",
      "No full-color painting, no bold solid fills, no photorealistic rendering.",
      "No digital-clean vector look — keep all marks feeling like real pencil on paper.",
      "No harsh dark ink lines — use only soft pencil marks.",
    ],
    usePreviewAsReference: false,
  },
  {
    id: "colorful_pop",
    name: "カラフルポップ",
    previewImageUrl: "https://firebasestorage.googleapis.com/v0/b/story-gen-8a769.firebasestorage.app/o/style-previews%2Fcolorful_pop.png?alt=media&token=stylepreview-gptimage2-v1",
    styleBible:
      "Children's picture book with bold pop-art energy. Highly saturated, vivid colors — electric yellow, hot pink, bright cyan, vivid red-orange. Clean bold black outlines around every shape. Flat or simply-shaded color fills. Punchy, high-contrast, energetic composition like a retro pop poster or a graphic children's book. Everything pops and feels joyful.",
    negativeStyleRules: [
      "Do not add readable text, logos, or watermarks.",
      "No muted or pale colors — keep the palette vivid and saturated.",
      "No watercolor washes, no soft pastel blending, no muted tones.",
      "No photorealistic rendering. Night and dark scenes must keep the same vivid saturated palette — use bold glowing light sources.",
    ],
    usePreviewAsReference: false,
  },
  {
    id: "watercolor",
    name: "やさしい水彩",
    previewImageUrl: "https://firebasestorage.googleapis.com/v0/b/story-gen-8a769.firebasestorage.app/o/style-previews%2Fsoft_watercolor.png?alt=media&token=stylepreview-gptimage2-v1",
    styleBible:
      "Japanese children's picture book in soft watercolor paint. Translucent watercolor washes layered on white paper — gentle pigment blooms, wet-on-wet color bleeds, paper grain showing through. Soft pencil under-drawing visible beneath the washes. Colors are pale and muted: dusty pinks, sage greens, warm creams. Edges of shapes bleed softly into one another. The overall feel is hand-painted, intimate, and tender.",
    negativeStyleRules: [
      "Do not add readable text, logos, or watermarks.",
      "No sharp digital edges, no bold black outlines, no flat solid fills, no clean vector shapes.",
      "No photorealistic rendering, no neon or overly saturated colors.",
      "No 3D rendering, no crayon textures, no collage layers.",
    ],
    usePreviewAsReference: false,
  },
  {
    id: "flat",
    name: "シンプルフラット",
    previewImageUrl: "https://firebasestorage.googleapis.com/v0/b/story-gen-8a769.firebasestorage.app/o/style-previews%2Fflat_illustration.png?alt=media&token=stylepreview-gptimage2-v1",
    styleBible:
      "Modern flat digital illustration for children's picture book. Every shape is a clean, solid-filled area of color — like vector art or a clean 2D digital illustration. Bold simple outlines. No watercolor washes, no paint texture, no paper grain, no brush strokes, no wet bleeds. Colors are vivid and solid. Shadows are minimal — at most a single flat shadow shape. The overall look is clean, graphic, and modern like a high-quality picture book app illustration.",
    negativeStyleRules: [
      "Do not add readable text, logos, or watermarks.",
      "Absolutely no watercolor, no paint texture, no paper grain, no ink bleeds, no brushwork, no pigment blooms.",
      "No photorealistic rendering, no 3D shading, no gritty textures.",
      "No heavy gradients — use flat or very simple gradient fills only.",
      "Night and dark scenes must keep bright vivid colors — use flat ambient glow shapes. Do not darken the palette.",
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

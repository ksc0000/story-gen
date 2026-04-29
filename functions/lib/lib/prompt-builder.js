"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildSystemPrompt = buildSystemPrompt;
exports.buildUserPrompt = buildUserPrompt;
exports.buildImagePrompt = buildImagePrompt;
exports.getStyleReferenceImagePath = getStyleReferenceImagePath;
const STYLE_DESCRIPTIONS = {
    soft_watercolor: "やさしい水彩（淡い色、にじみ、手描き感のある柔らかなタッチ）",
    fluffy_pastel: "ふんわりパステル（柔らかい色、丸い形、かわいい雰囲気）",
    crayon: "クレヨンで描いた絵本（子どもが描いたような温かい線と手触り）",
    flat_illustration: "シンプルフラット（シンプル、影少なめ、現代的で見やすいタッチ）",
    anime_storybook: "わくわくアニメ風（表情が大きく、キャラクター性が強いタッチ）",
    classic_picture_book: "クラシック絵本（昔ながらの童話風、細かい描き込み）",
    toy_3d: "ぷっくり3Dトイ風（粘土・おもちゃのような立体感）",
    paper_collage: "紙あそびコラージュ（紙を貼ったような質感、温かい手作り感）",
    pencil_sketch: "やさしい鉛筆スケッチ（線画中心、淡い色づけ、素朴な雰囲気）",
    colorful_pop: "カラフルポップ（鮮やかで元気な配色、楽しい絵本風）",
    watercolor: "やさしい水彩（淡い色、にじみ、手描き感のある柔らかなタッチ）",
    flat: "シンプルフラット（シンプル、影少なめ、現代的で見やすいタッチ）",
};
const IMAGE_STYLE_KEYWORDS = {
    soft_watercolor: "soft watercolor painting style, soft warm colors, pale colors, gentle blooms, warm hand-painted texture, Japanese picture book style",
    fluffy_pastel: "fluffy pastel picture book style, soft rounded shapes, cute gentle mood, airy colors, toddler-friendly illustration",
    crayon: "crayon pastel drawing style, childlike warm lines, hand-drawn texture, wax texture, colorful, children's picture book style",
    flat_illustration: "flat illustration style, bright simple colors, clean shapes, minimal shadows, modern picture book style",
    anime_storybook: "anime storybook style, expressive faces, sparkling eyes, dynamic composition, vivid cheerful colors",
    classic_picture_book: "classic picture book style, traditional fairytale illustration, detailed linework, painterly forest textures",
    toy_3d: "3D toy style, clay-like rounded characters, playful miniature diorama, soft plastic texture, cheerful lighting",
    paper_collage: "paper cutout collage style, layered handmade paper texture, warm craft feeling, tactile edges",
    pencil_sketch: "gentle pencil sketch style, delicate line art, subtle watercolor tint, nostalgic quiet picture book mood",
    colorful_pop: "colorful pop picture book style, vivid colors, round friendly forms, energetic composition, playful graphics",
    watercolor: "soft watercolor painting style, soft warm colors, pale colors, gentle blooms, warm hand-painted texture, Japanese picture book style",
    flat: "flat illustration style, bright simple colors, clean shapes, minimal shadows, modern picture book style",
};
const STYLE_REFERENCE_IMAGE_PATHS = {
    soft_watercolor: "/images/styles/soft_watercolor.png",
    fluffy_pastel: "/images/styles/fluffy_pastel.png",
    crayon: "/images/styles/crayon.png",
    flat_illustration: "/images/styles/flat_illustration.png",
    anime_storybook: "/images/styles/anime_storybook.png",
    classic_picture_book: "/images/styles/classic_picture_book.png",
    toy_3d: "/images/styles/toy_3d.png",
    paper_collage: "/images/styles/paper_collage.png",
    pencil_sketch: "/images/styles/pencil_sketch.png",
    colorful_pop: "/images/styles/colorful_pop.png",
    watercolor: "/images/styles/soft_watercolor.png",
    flat: "/images/styles/flat_illustration.png",
};
const SAFETY_KEYWORDS = "safe for children, family friendly, wholesome, gentle";
function buildSystemPrompt(template, style) {
    const visualDirection = template.visualDirection
        ? `\n## カテゴリのビジュアル方向\n${template.visualDirection}\n`
        : "";
    return `${template.systemPrompt}
${visualDirection}

## 制約
- 子ども向けの安全な内容のみ生成してください。暴力、恐怖、悲しい結末は禁止です。
- 親の目的: ${template.parentIntent ?? "子どもに合った絵本を作る"}
- 挿絵のスタイル: ${STYLE_DESCRIPTIONS[style]}
- 各ページの imagePrompt は英語で、挿絵の内容を具体的に描写してください。
- characterBible は全ページで同じ主人公として見えるように、年齢感、髪型、服装、固定アイテム、表情の特徴を英語で具体化してください。
- styleBible は全ページで同じ画風として見えるように、カテゴリのビジュアル方向、線、色、質感、光、構図のルールを英語で具体化してください。
- imagePrompt にはページ固有の場面だけを書き、characterBible と styleBible の内容を重複させすぎないでください。

## 出力形式
以下のJSON形式で出力してください。JSON以外のテキストは含めないでください。

\`\`\`json
{
  "title": "絵本のタイトル",
  "characterBible": "Consistent English character design description used for every illustration",
  "styleBible": "Consistent English visual style guide used for every illustration",
  "pages": [
    {
      "text": "ページの本文（日本語・ひらがな多め・幼児が理解できる表現）",
      "imagePrompt": "English description of the illustration for this page"
    }
  ]
}
\`\`\``;
}
function buildUserPrompt(input, pageCount) {
    const lines = [];
    lines.push(`主人公の名前: ${input.childName}`);
    if (input.storyRequest)
        lines.push(`今回の絵本で描きたいこと: ${input.storyRequest}`);
    if (input.childAge !== undefined)
        lines.push(`年齢: ${input.childAge}歳`);
    if (input.favorites)
        lines.push(`好きなもの: ${input.favorites}`);
    if (input.lessonToTeach)
        lines.push(`教えたいこと: ${input.lessonToTeach}`);
    if (input.memoryToRecreate)
        lines.push(`再現したい思い出: ${input.memoryToRecreate}`);
    if (input.characterLook)
        lines.push(`主人公の見た目: ${input.characterLook}`);
    if (input.signatureItem)
        lines.push(`毎ページに出したい持ち物・服装: ${input.signatureItem}`);
    if (input.colorMood)
        lines.push(`色や雰囲気: ${input.colorMood}`);
    if (input.place)
        lines.push(`場所: ${input.place}`);
    if (input.familyMembers)
        lines.push(`一緒に登場させたい人: ${input.familyMembers}`);
    if (input.season)
        lines.push(`季節・時期: ${input.season}`);
    if (input.parentMessage)
        lines.push(`最後に伝えたい言葉: ${input.parentMessage}`);
    lines.push(`ページ数: ${pageCount}ページ`);
    return lines.join("\n");
}
function buildImagePrompt(basePrompt, style, characterBible, styleBible) {
    const consistency = [
        characterBible ? `Character consistency: ${characterBible}` : "",
        styleBible ? `Style consistency: ${styleBible}` : "",
        "Keep the same character design, outfit, colors, line quality, and illustration style across all pages.",
    ].filter(Boolean).join(" ");
    return [
        consistency,
        `Scene: ${basePrompt}`,
        IMAGE_STYLE_KEYWORDS[style],
        SAFETY_KEYWORDS,
        "no text, no letters, no watermark",
    ].join(", ");
}
function getStyleReferenceImagePath(style) {
    return STYLE_REFERENCE_IMAGE_PATHS[style];
}
//# sourceMappingURL=prompt-builder.js.map
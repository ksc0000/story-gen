import type { TemplateData, IllustrationStyle, BookInput, PageCount } from "./types";

const STYLE_DESCRIPTIONS: Record<IllustrationStyle, string> = {
  watercolor: "水彩画風（いわさきちひろ、ぐりとぐらのような柔らかく温かみのあるタッチ）",
  flat: "フラットイラスト風（ミッフィー、しろくまちゃんのような明るくシンプルなタッチ）",
  crayon: "クレヨン/パステル風（はらぺこあおむし、ノンタンのような手描き感のあるタッチ）",
};

const IMAGE_STYLE_KEYWORDS: Record<IllustrationStyle, string> = {
  watercolor: "watercolor painting style, soft warm colors, gentle illustration, Japanese picture book style",
  flat: "flat illustration style, bright simple colors, clean lines, minimalist picture book style",
  crayon: "crayon pastel drawing style, hand-drawn texture, colorful, children's picture book style",
};

const SAFETY_KEYWORDS = "safe for children, family friendly, wholesome, gentle";

export function buildSystemPrompt(template: TemplateData, style: IllustrationStyle): string {
  return `${template.systemPrompt}

## 制約
- 子ども向けの安全な内容のみ生成してください。暴力、恐怖、悲しい結末は禁止です。
- 挿絵のスタイル: ${STYLE_DESCRIPTIONS[style]}
- 各ページの imagePrompt は英語で、挿絵の内容を具体的に描写してください。

## 出力形式
以下のJSON形式で出力してください。JSON以外のテキストは含めないでください。

\`\`\`json
{
  "title": "絵本のタイトル",
  "pages": [
    {
      "text": "ページの本文（日本語・ひらがな多め・幼児が理解できる表現）",
      "imagePrompt": "English description of the illustration for this page"
    }
  ]
}
\`\`\``;
}

export function buildUserPrompt(input: BookInput, pageCount: PageCount): string {
  const lines: string[] = [];
  lines.push(`主人公の名前: ${input.childName}`);
  if (input.childAge !== undefined) lines.push(`年齢: ${input.childAge}歳`);
  if (input.favorites) lines.push(`好きなもの: ${input.favorites}`);
  if (input.lessonToTeach) lines.push(`教えたいこと: ${input.lessonToTeach}`);
  if (input.memoryToRecreate) lines.push(`再現したい思い出: ${input.memoryToRecreate}`);
  lines.push(`ページ数: ${pageCount}ページ`);
  return lines.join("\n");
}

export function buildImagePrompt(basePrompt: string, style: IllustrationStyle): string {
  return `${basePrompt}, ${IMAGE_STYLE_KEYWORDS[style]}, ${SAFETY_KEYWORDS}`;
}

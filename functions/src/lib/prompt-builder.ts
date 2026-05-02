import type {
  TemplateData,
  IllustrationStyle,
  BookInput,
  PageCount,
  AgeBand,
  PageVisualRole,
  ImageModelProfile,
  ImageQualityTier,
  StoryCharacter,
  ScenePolicy,
} from "./types";
import type { AgeReadingProfile } from "./age-reading-profile";
import type { StoryQualityReport } from "./story-quality";

const STYLE_DESCRIPTIONS: Record<IllustrationStyle, string> = {
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

const IMAGE_STYLE_KEYWORDS: Record<IllustrationStyle, string> = {
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

const STYLE_REFERENCE_IMAGE_PATHS: Record<IllustrationStyle, string> = {
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

const VISUAL_STORYTELLING_RULES = [
  "This is a narrative picture book scene, not a character portrait.",
  "Do not center the protagonist on every page.",
  "The protagonist does not need to be large or fully visible in every image.",
  "Vary the composition across pages: wide shots, medium shots, close-ups, detail shots, over-the-shoulder views, and bird's-eye views.",
  "Some pages may focus on the environment, objects, family members, animals, or secondary characters when it helps the story.",
  "Show what is happening around the protagonist, not only the protagonist's face.",
  "Use background details to tell part of the story.",
  "Keep the protagonist recognizable when present, but allow the scene itself to be the main focus.",
].join(" ");

const STORY_QUALITY_RULES = [
  "Do not generate overly thin pages.",
  "Each page should contain enough story substance for the target age.",
  "Use age-appropriate sentence count on every page.",
  "Include a repeated phrase or visual motif when appropriate.",
  "Include at least one small setup and payoff across the book.",
  "Make each page visually distinct.",
  "Avoid making every image a front-facing portrait.",
  "Use varied compositions: wide, medium, close-up, back view, object detail.",
  "Include meaningful background details children can notice.",
  "Use gentle humor, discovery, or emotional change.",
  "Keep the child protagonist visually consistent.",
].join(" ");

const JAPANESE_STORY_TEXT_RULES = [
  "pages[].text は、画像プロンプトではなく、親が読み聞かせる本文です。",
  "3歳以上では、単なる音遊びや擬音の羅列にしないでください。",
  "すべてのページに「場所」「行動」「気持ち」または「発見」のうち2つ以上を自然に含めてください。",
  "意味の通らない造語を使わないでください。",
  "「おもしろい こえ」「ふわふわ ふわりん」のような曖昧で説明不足な文を避けてください。",
  "擬音は1ページにつき最大1〜2個までにしてください。",
  "くり返し表現は、毎回少し物語が進む形で使ってください。",
  "3歳向けでも、1ページ2〜4文を基本にしてください。",
  "文章はやさしいが、内容は幼稚にしすぎないでください。",
  "情景描写を1文以上入れてください。",
  "子どもの行動または感情を1文以上入れてください。",
  "日本語として自然な文にしてください。",
  "ひらがなを多めにしても、意味が曖昧になりすぎないようにしてください。",
  "説明文ではなく、絵本らしい語り口にしてください。",
].join(" ");

const STORY_GOAL_CONSISTENCY_RULES = [
  "物語の中心目的 storyGoal を最初に決め、最後まで変えないでください。",
  "mainQuestObject を途中で別のものに変えないでください。",
  "hiddenDetail や背景小物を、物語の主目的にしてはいけません。",
  "visualMotif は本文と絵に出してよいが、hiddenDetail は基本的に絵だけの小さな発見要素です。",
  "例えば、hiddenDetail に『すいか模様の雲』がある場合でも、物語の目的を『すいか探し』に変えてはいけません。",
  "storyRequest が『なくした星を探す』なら、最後まで探す対象は『星』または『星のかけら』です。",
  "4ページ構成では、各ページが storyGoal に向かって少しずつ進む必要があります。",
].join(" ");

const PAGE_TEXT_ROLE_RULES = [
  "opening_establishing: 場所、主人公の行動、storyGoal につながる小さな異変や発見、次ページへの予感を入れる。",
  "discovery: 見つけたもの、それがなぜ不思議か、何に困っているか、主人公の反応を入れる。場所や手元の状況も1文入れる。",
  "action: mainQuestObject を探すための行動、探す場所、小さな手がかり、同じ目的に向かっていることを明確にする。",
  "emotional_closeup: 表情、手元、気持ち、何を感じて何を決めたかを自然に描く。",
  "object_detail: 小物の見た目と、その小物が storyGoal にどう関係するかを書く。",
  "setback_or_question: 見つからない、迷う、問いが生まれる場面を書く。ただし別目的に脱線しない。",
  "payoff: mainQuestObject が見つかる、visualMotif や setup が回収される場面にする。",
  "quiet_ending: 見つかった後の安心感、ありがとう、うれしさ、余韻を書く。別目的を持ち込まない。",
].join(" ");

const BAD_TEXT_EXAMPLE =
  "ころころ こりころ。まきまき まきば。まきまき むすんで、ふしぎな じゅうたん。";
const GOOD_TEXT_EXAMPLE = [
  "すなばの すみに、あかい スコップが ちょこんと ありました。",
  "〇〇ちゃんが すなを まるく あつめると、ふしぎな もようが できました。",
  "『これ、じゅうたんみたい』",
  "そのとき、さらさらの すなが 小さく ひかりました。",
].join("\n");

function getDefaultCompositionHint(pageNumber?: number): string {
  switch (pageNumber) {
    case 0:
      return "establishing wide shot";
    case 1:
      return "medium shot with action";
    case 2:
      return "close-up or emotional detail shot";
    case 3:
      return "warm ending shot, back view, or scenic emotional wide shot";
    default:
      return "varied storybook composition with a clear focal point";
  }
}

function getDefaultPageVisualRole(pageNumber?: number): PageVisualRole {
  switch (pageNumber) {
    case 0:
      return "opening_establishing";
    case 1:
      return "discovery";
    case 2:
      return "emotional_closeup";
    case 3:
      return "quiet_ending";
    default:
      return "action";
  }
}

function getPageVisualRoleGuidance(role: PageVisualRole): string {
  switch (role) {
    case "opening_establishing":
      return "Page visual role: opening_establishing. Use a wide establishing shot that clearly shows the place and the child's relationship to the world. The protagonist may appear small if that helps the scene.";
    case "discovery":
      return "Page visual role: discovery. Use a medium shot or guided composition where the protagonist notices something important, with the eye naturally led toward the discovery.";
    case "action":
      return "Page visual role: action. Show movement, body gesture, interaction, and a clear sense of what is happening in this moment.";
    case "emotional_closeup":
      return "Page visual role: emotional_closeup. Use a close-up of face, hands, or a meaningful gesture to highlight emotion without turning the page into a static portrait.";
    case "object_detail":
      return "Page visual role: object_detail. Focus on a meaningful object in the foreground, with the protagonist secondary or in the background if helpful.";
    case "setback_or_question":
      return "Page visual role: setback_or_question. Show a gentle child-safe moment of uncertainty, wondering, or small tension, with clear visual storytelling.";
    case "payoff":
      return "Page visual role: payoff. Bring back an earlier motif, object, or visual clue so the scene feels satisfying and story-driven.";
    case "quiet_ending":
      return "Page visual role: quiet_ending. Use a scenic wide shot, warm back view, or calm closure image with emotional afterglow.";
    default:
      return "Page visual role: action. Keep the scene dynamic and story-driven.";
  }
}

function sanitizeImagePromptText(value: string): string {
  return value
    .replace(/[「『][^」』]*[」』]/g, "")
    .replace(/"[^"]*"/g, "")
    .replace(/\b(repeated phrase|phrase|text|letters?|caption|speech bubbles?|labels?|signboards?|signage|written|writing|title on|words?|quotes?)\b/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function sanitizeSceneAgainstChildConstraints(
  scene: string,
  childProfileBasePrompt?: string,
  scenePolicy?: ScenePolicy
): string {
  if (!childProfileBasePrompt || scenePolicy?.backgroundMode === "story_flexible") {
    return scene;
  }

  let sanitized = scene;
  const normalizedConstraints = childProfileBasePrompt.toLowerCase();

  if (normalizedConstraints.includes("do not include playground equipment")) {
    sanitized = sanitized
      .replace(/\bred slide\b/gi, "")
      .replace(/\bslides?\b/gi, "")
      .replace(/\bswings?\b/gi, "")
      .replace(/\bplayground equipment\b/gi, "")
      .replace(/\bjungle gym\b/gi, "")
      .replace(/\bclimbing frame\b/gi, "");
  }

  if (normalizedConstraints.includes("do not include buildings")) {
    sanitized = sanitized.replace(/\bbuildings?\b/gi, "");
  }
  if (normalizedConstraints.includes("do not include roads")) {
    sanitized = sanitized.replace(/\broads?\b/gi, "");
  }
  if (normalizedConstraints.includes("do not include signs")) {
    sanitized = sanitized.replace(/\bsigns?\b/gi, "");
  }

  return sanitized.replace(/\s{2,}/g, " ").replace(/\s+,/g, ",").trim();
}

function buildFixedProfileConstraintGuidance(childProfileBasePrompt?: string): string {
  if (!childProfileBasePrompt?.trim()) {
    return "";
  }

  return [
    `Child profile scene constraints: ${childProfileBasePrompt.trim()}`,
    "Respect the child profile background constraints.",
    "If the child profile says sandbox or quiet neighborhood park only, do not add slides, swings, playground equipment, buildings, roads, signs, or indoor spaces.",
  ].join(" ");
}

function buildScenePolicyGuidance(
  scenePolicy: ScenePolicy | undefined,
  childProfileBasePrompt?: string
): string {
  const backgroundMode = scenePolicy?.backgroundMode ?? "story_flexible";

  if (backgroundMode === "fixed") {
    return [
      "Scene setting rules: keep the background fixed and repeatable for this generation.",
      childProfileBasePrompt?.trim()
        ? `Use this profile scene guidance as a hard constraint: ${childProfileBasePrompt.trim()}`
        : "",
      "Do not introduce new locations or unrelated setting elements.",
      "Do not contradict the fixed background rules.",
    ]
      .filter(Boolean)
      .join(" ");
  }

  if (backgroundMode === "profile_default") {
    return [
      "Scene setting rules: start from the child profile's familiar atmosphere, but allow small scene adjustments when the story needs them.",
      childProfileBasePrompt?.trim()
        ? `Use this profile scene guidance as a soft default, not a hard lock: ${childProfileBasePrompt.trim()}`
        : "",
      "Prefer coherent variations of the profile setting over abrupt location changes.",
      "Do not add unrelated objects that distract from the story.",
    ]
      .filter(Boolean)
      .join(" ");
  }

  return [
    "Scene setting rules: choose a setting that naturally supports this page's story beat.",
    "The setting may vary across pages when it improves the picture book.",
    "Keep the setting coherent with the storyGoal, page text, and previous pages.",
    "Do not add unrelated objects that distract from the story.",
    "Do not add readable text, signs, labels, logos, brand marks, numbers, watermarks, or random symbols.",
    "Do not add dangerous objects, traffic, roads, vehicles, or adult-only items unless explicitly required and child-safe.",
    "If playground equipment, furniture, buildings, or animals appear, they must be natural for the scene and must support the story.",
    "Hidden details are allowed only as subtle visual discoveries and must never become the story goal.",
  ].join(" ");
}

function getBackgroundRichnessGuidance(ageBand?: AgeBand): string {
  if (ageBand === "baby_toddler") {
    return "Background should stay soft and simple, with only a few clear supporting details.";
  }
  if (ageBand === "preschool_3_4") {
    return "Include cozy place details, simple toys, seasonal clues, or gentle nature elements children can easily notice.";
  }
  return "Include rich but not cluttered background details such as cozy room objects, books, small toys, family items, seasonal decorations, nature details, tiny animals, or a repeated visual motif.";
}

function getEmotionalExpressionGuidance(ageBand?: AgeBand): string {
  if (ageBand === "baby_toddler") {
    return "Use clear, simple, comforting emotions with easy-to-read expressions.";
  }
  if (ageBand === "preschool_3_4") {
    return "Show warm, readable emotions such as delight, surprise, relief, and gentle curiosity.";
  }
  if (ageBand === "early_reader_5_6") {
    return "Show a little more emotional nuance, such as trying again, feeling proud, sharing, or noticing someone else.";
  }
  return "Show age-appropriate emotional nuance, including thinking, deciding, noticing others, and a small sense of growth.";
}

export function buildSystemPrompt(
  template: TemplateData,
  style: IllustrationStyle,
  readingProfile?: AgeReadingProfile
): string {
  const visualDirection = template.visualDirection
    ? `\n## カテゴリのビジュアル方向\n${template.visualDirection}\n`
    : "";
  const resolvedReadingProfile = readingProfile;
  const ageReadingGuidance = resolvedReadingProfile
    ? `
## 年齢に合わせた文章レベル
- 対象年齢: ${resolvedReadingProfile.label}
- 1ページあたりの本文量: ${resolvedReadingProfile.targetCharsPerPage}
- 文数: ${resolvedReadingProfile.targetSentencesPerPage}
- 語彙: ${resolvedReadingProfile.vocabularyLevel}
- 表記: ${resolvedReadingProfile.kanjiPolicy}
- 物語の複雑さ: ${resolvedReadingProfile.storyComplexity}
- 文章の深さ: ${resolvedReadingProfile.narrativeComplexity}
- 会話: ${resolvedReadingProfile.dialoguePolicy}
- 感情表現: ${resolvedReadingProfile.emotionalDepth}
- 背景描写: ${resolvedReadingProfile.backgroundDetailLevel}
- くり返しやしかけ: ${resolvedReadingProfile.repetitionPolicy}
- 絵本らしい工夫: ${resolvedReadingProfile.recommendedDevices}
`
    : "";

  return `${template.systemPrompt}
${visualDirection}
${ageReadingGuidance}

## 制約
- 子ども向けの安全な内容のみ生成してください。暴力、恐怖、悲しい結末は禁止です。
- 親の目的: ${template.parentIntent ?? "子どもに合った絵本を作る"}
- 挿絵のスタイル: ${STYLE_DESCRIPTIONS[style]}
- 各ページの imagePrompt は英語で、挿絵の内容を具体的に描写してください。
- characterBible は全ページで同じ主人公として見えるように、年齢感、髪型、服装、固定アイテム、表情の特徴を英語で具体化してください。
- styleBible は全ページで同じ画風として見えるように、カテゴリのビジュアル方向、線、色、質感、光、構図のルールを英語で具体化してください。
- imagePrompt にはページ固有の場面だけを書き、characterBible と styleBible の内容を重複させすぎないでください。
- 各ページの imagePrompt は、主人公の見た目だけでなく、場面・背景・周囲の出来事・画面の焦点を具体的に書いてください。
- すべてのページで主人公を中央に大きく描く構図は禁止です。
- ページごとに wide shot / medium shot / close-up / detail shot / bird's-eye view などの視点を変えてください。
- ときには背景、物、家族、友だち、動物、サブキャラクターが絵の主役になっても構いません。
- imagePrompt には、そのページで何を一番見せたいかを明確に含めてください。
- imagePrompt では "wide establishing shot of...", "small child seen from behind...", "focus on the sandbox toys in the foreground...", "family members in the background...", "bird's-eye view of the park...", "close-up of tiny hands holding..." のように、視点や焦点が伝わる表現を歓迎します。
- Important: pages[].text is for the readable story text shown by the app. pages[].imagePrompt is only for generating a wordless illustration. Never ask the image model to render the story text, repeated phrase, labels, signs, books with readable titles, speech bubbles, captions, or any written characters inside the image.
- For each page, pageVisualRole must be exactly one of:
  - opening_establishing
  - discovery
  - action
  - emotional_closeup
  - object_detail
  - setback_or_question
  - payoff
  - quiet_ending
- Do not invent other pageVisualRole values.
- Use snake_case exactly.
- Story quality rules: ${STORY_QUALITY_RULES}
- 3歳以上では、文字数が少なすぎる「薄いページ」にならないようにしてください。行動、気持ち、場面描写のうち少なくとも2つ以上を自然に含めてください。
- 5歳以上では、小さな原因と結果、短い会話、場面の具体物を入れてください。
- 7歳以上では、小さな伏線、最後の回収、理由や気持ちの変化を入れてください。
- repeatedPhrase が自然な場合は短く覚えやすいものにしてください。
- visualMotif は小物、色、動物、光、模様など、絵でも文章でも繰り返し感じられるものにしてください。
- 年齢が低い場合は、短く、音やリズムが心地よい文章にしてください。
- 年齢が高い場合は、少しだけ理由、選択、気持ちの変化を含めてください。
- ただし、どの年齢でも説教臭くせず、絵本として自然な文章にしてください。
- 各ページの本文量は対象年齢の目安を大きく超えないでください。
- Japanese story text rules: ${JAPANESE_STORY_TEXT_RULES}
- Story goal consistency rules: ${STORY_GOAL_CONSISTENCY_RULES}
- pageVisualRole ごとの本文設計ルール: ${PAGE_TEXT_ROLE_RULES}
- 悪い例: 「${BAD_TEXT_EXAMPLE}」
- 理由: 意味が通りにくく、情景や行動が不足している。
- 良い例:
${GOOD_TEXT_EXAMPLE}
- 主要な登場人物は cast に定義してください。
- 子ども主人公以外に、相棒、魔法キャラ、動物キャラ、第三者キャラが出る場合は必ず cast に入れてください。
- 子ども主人公以外に、2ページ以上登場する存在は必ず cast に入れてください。
- 「ほしのこ」「魔法の友だち」「star-child」「star-creature」「動物」「相棒」は必ず cast に入れてください。
- 同じ存在として再登場するキャラクターは、毎ページ新しく作らず、同じ characterId を使ってください。
- 各キャラクターには visualBible / signatureItems / doNotChange を持たせてください。
- pages[].appearingCharacterIds には、そのページに出る characterId を入れてください。
- pages[].focusCharacterId には、そのページの主役になる characterId を入れてください。
- cast を省略してはいけません。ただし完全に主人公だけの話なら空配列は可です。

## 出力形式
以下のJSON形式で出力してください。JSON以外のテキストは含めないでください。

\`\`\`json
{
  "title": "絵本のタイトル",
  "characterBible": "Consistent English character design description used for every illustration",
  "styleBible": "Consistent English visual style guide used for every illustration",
  "storyGoal": "たっちゃんが、すなばで出会ったほしのこと一緒に、なくした星のかけらを探す",
  "mainQuestObject": "星のかけら",
  "forbiddenQuestObjects": ["すいか", "食べ物"],
  "cast": [
    {
      "characterId": "magic_friend_01",
      "displayName": "ひかりの ともだち",
      "role": "magical_friend",
      "visualBible": "A small glowing golden spirit child with translucent body, flowing blonde hair, tiny purple top hat, gold star necklace, warm green eyes, sparkling magical aura.",
      "silhouette": "floating translucent body with smoke-like tail and flowing hair",
      "colorPalette": ["gold", "cream", "soft purple", "warm white"],
      "signatureItems": ["tiny purple top hat", "gold star necklace", "sparkling golden aura"],
      "doNotChange": [
        "Do not remove the tiny purple top hat",
        "Do not change the glowing translucent body",
        "Do not change the gold star necklace"
      ],
      "canChangeByScene": ["pose", "facial expression", "camera angle"]
    }
  ],
  "narrativeDevice": {
    "repeatedPhrase": "A short memorable repeated phrase",
    "visualMotif": "A recurring visual motif such as a yellow star or red backpack",
    "setup": "A small early setup that can pay off later",
    "payoff": "A gentle payoff in the ending",
    "hiddenDetails": ["A small bird in the background", "A cloud shaped like a heart"]
  },
  "pages": [
    {
      "text": "ページの本文（日本語・ひらがな多め・幼児が理解できる表現）",
      "imagePrompt": "English description of a wordless illustration for this page, with no readable text inside the image",
      "pageVisualRole": "opening_establishing",
      "compositionHint": "wide establishing shot / medium action shot / close-up / back view / object-focused shot",
      "visualMotifUsage": "How the recurring visual motif appears on this page",
      "hiddenDetail": "One small background detail children can notice",
      "appearingCharacterIds": ["child_protagonist", "magic_friend_01"],
      "focusCharacterId": "magic_friend_01"
    }
  ]
}
\`\`\``;
}

export function buildUserPrompt(input: BookInput, pageCount: PageCount): string {
  const lines: string[] = [];
  lines.push(`主人公の名前: ${input.childName}`);
  if (input.storyRequest) lines.push(`今回の絵本で描きたいこと: ${input.storyRequest}`);
  if (input.childAge !== undefined) {
    lines.push(`年齢: ${input.childAge}歳`);
    lines.push(`対象年齢に合わせた文章レベルにしてください: ${input.childAge}歳`);
  }
  if (input.favorites) lines.push(`好きなもの: ${input.favorites}`);
  if (input.lessonToTeach) lines.push(`教えたいこと: ${input.lessonToTeach}`);
  if (input.memoryToRecreate) lines.push(`再現したい思い出: ${input.memoryToRecreate}`);
  if (input.characterLook) lines.push(`主人公の見た目: ${input.characterLook}`);
  if (input.signatureItem) lines.push(`毎ページに出したい持ち物・服装: ${input.signatureItem}`);
  if (input.colorMood) lines.push(`色や雰囲気: ${input.colorMood}`);
  if (input.place) lines.push(`場所: ${input.place}`);
  if (input.familyMembers) lines.push(`一緒に登場させたい人: ${input.familyMembers}`);
  if (input.season) lines.push(`季節・時期: ${input.season}`);
  if (input.parentMessage) lines.push(`最後に伝えたい言葉: ${input.parentMessage}`);
  lines.push(`ページ数: ${pageCount}ページ`);
  return lines.join("\n");
}

export function buildImagePrompt(
  basePrompt: string,
  style: IllustrationStyle,
  characterBible?: string,
  styleBible?: string,
  options?: {
    pageNumber?: number;
    pageVisualRole?: PageVisualRole;
    compositionHint?: string;
    visualMotif?: string;
    visualMotifUsage?: string;
    hiddenDetail?: string;
    ageBand?: AgeBand;
    imageModelProfile?: ImageModelProfile;
    imageQualityTier?: ImageQualityTier;
    cast?: StoryCharacter[];
    appearingCharacterIds?: string[];
    focusCharacterId?: string;
    childProfileBasePrompt?: string;
    scenePolicy?: ScenePolicy;
  }
): string {
  const compositionHint = sanitizeImagePromptText(
    options?.compositionHint || getDefaultCompositionHint(options?.pageNumber)
  );
  const pageVisualRole = options?.pageVisualRole || getDefaultPageVisualRole(options?.pageNumber);
  const visualMotif = sanitizeImagePromptText(options?.visualMotifUsage || options?.visualMotif || "");
  const hiddenDetail = sanitizeImagePromptText(options?.hiddenDetail || "");
  const ageBand = options?.ageBand;
  const imageModelProfile = options?.imageModelProfile;
  const scenePolicy = options?.scenePolicy;
  const sanitizedBasePrompt = sanitizeSceneAgainstChildConstraints(
    sanitizeImagePromptText(basePrompt),
    options?.childProfileBasePrompt
    ,
    scenePolicy
  );
  const appearingCharacters = (options?.cast ?? []).filter((character) =>
    options?.appearingCharacterIds?.includes(character.characterId) &&
    character.role !== "protagonist" &&
    character.characterId !== "child_protagonist"
  );
  const consistency = [
    characterBible ? `Character consistency: ${characterBible}` : "",
    "Character consistency rules: same child character across all pages, same age impression, same hairstyle, same face shape, same body proportions, same outfit unless the outfit rule says otherwise, keep the signature item when appropriate.",
    "If the child is seen from behind, in side view, or far away, preserve the same hairstyle, silhouette, outfit logic, and recognizable age impression.",
    "Keep identity consistent, but change pose, camera angle, distance, action, background, and focal point according to this page.",
    "Do not repeat the same pose or same framing from previous pages.",
    "The child can appear from behind, side view, far away, or partially visible, as long as hairstyle, outfit, silhouette, and age impression remain recognizable.",
    styleBible ? `Style consistency: ${styleBible}` : "",
  ].filter(Boolean).join(" ");

  const compositionGuidance = [
    getPageVisualRoleGuidance(pageVisualRole),
    `Composition variety: ${compositionHint}.`,
    "Avoid front-facing portrait composition unless the page genuinely needs it.",
    "Use a clear focal point with cinematic picture-book framing.",
  ].join(" ");

  const backgroundGuidance = [
    `Background richness: ${getBackgroundRichnessGuidance(ageBand)}`,
    "Show meaningful surroundings, not just the protagonist.",
    "Keep the scene rich but not cluttered.",
    buildScenePolicyGuidance(scenePolicy, options?.childProfileBasePrompt),
    scenePolicy?.backgroundMode === "fixed"
      ? buildFixedProfileConstraintGuidance(options?.childProfileBasePrompt)
      : "",
  ].join(" ");

  const motifGuidance = visualMotif
    ? `Visual motif: include ${visualMotif} as a physical object, color motif, or shape cue in a natural way on this page, never as written text.`
    : "Visual motif: if the story includes a recurring small motif, place it naturally in the scene as an object, color, or shape, never as written text.";
  const hiddenDetailGuidance = hiddenDetail
    ? `Hidden detail: include this subtle background detail for children to notice: ${hiddenDetail}. Keep it purely visual and never written as text.`
    : "Hidden detail: include one small child-friendly background detail that rewards careful looking.";
  const emotionGuidance = `Age-appropriate emotional expression: ${getEmotionalExpressionGuidance(ageBand)}`;
  const castGuidance = appearingCharacters.length
    ? [
        options?.focusCharacterId
          ? `Focus character: ${options.focusCharacterId}.`
          : "",
        ...appearingCharacters.map((character) =>
          [
            `Recurring character consistency: ${character.characterId} is the same character whenever it appears.`,
            character.visualBible,
            character.signatureItems?.length
              ? `Keep signature items: ${character.signatureItems.join(", ")}.`
              : "",
            character.doNotChange?.length
              ? `Do not change: ${character.doNotChange.join("; ")}.`
              : "",
            character.colorPalette?.length
              ? `Color palette: ${character.colorPalette.join(", ")}.`
              : "",
            character.silhouette
              ? `Preserve silhouette: ${character.silhouette}.`
              : "",
          ]
            .filter(Boolean)
            .join(" ")
        ),
        "Do not redesign recurring characters. Do not merge characters. Do not turn one character into another.",
        "If a recurring character appears from behind, far away, or partially visible, preserve silhouette and signature items.",
      ]
        .filter(Boolean)
        .join(" ")
    : "";
  const modelSpecificGuidance =
    imageModelProfile === "pro_consistent" || imageModelProfile === "kontext_reference"
      ? [
          backgroundGuidance,
          motifGuidance,
          hiddenDetailGuidance,
          "Avoid distorted hands, extra fingers, malformed faces, duplicated limbs, adult-looking children, uncanny expressions, unreadable text, and over-detailed busy backgrounds.",
        ].join(" ")
      : [
          "Keep the prompt simple and clear for the image model.",
          backgroundGuidance,
          visualMotif
            ? `Include only one recurring motif: ${visualMotif}.`
            : "At most one recurring motif or one hidden detail.",
          "Avoid distorted hands, extra fingers, malformed faces, duplicated limbs, adult-looking children, uncanny expressions, unreadable text, and cluttered backgrounds.",
        ].join(" ");

  return [
    consistency,
    castGuidance,
    compositionGuidance,
    modelSpecificGuidance,
    emotionGuidance,
    `Visual storytelling rules: ${VISUAL_STORYTELLING_RULES}`,
    `Scene: ${sanitizedBasePrompt}`,
    IMAGE_STYLE_KEYWORDS[style],
    SAFETY_KEYWORDS,
    "Use purely visual storytelling through characters, objects, colors, actions, and scenery.",
    "wordless picture book illustration, no written text anywhere, no letters, no captions, no speech bubbles, no labels, no signage, no readable marks, no watermark. Use plain objects and unlabeled backgrounds.",
  ].join(", ");
}

export function getStyleReferenceImagePath(style: IllustrationStyle): string | undefined {
  return STYLE_REFERENCE_IMAGE_PATHS[style];
}

export function appendQualityRetryInstruction(systemPrompt: string, report: StoryQualityReport): string {
  const issueLines = report.issues
    .filter((issue) => issue.severity === "error" || issue.code.startsWith("narrative_device") || issue.code.startsWith("composition_hint"))
    .map((issue) => {
      const pageText = issue.pageIndex !== undefined ? ` page=${issue.pageIndex + 1}` : "";
      const actualText = issue.actual !== undefined ? ` actual=${issue.actual}` : "";
      const expectedText = issue.expected !== undefined ? ` expected=${issue.expected}` : "";
      return `- ${issue.code}:${pageText}${actualText}${expectedText} ${issue.message}`;
    })
    .join("\n");

  return `${systemPrompt}

## Retry quality correction
- 前回の出力は年齢別の本文量または絵本品質の最低条件を満たしていません。
- 各ページで最低文数・最低文字数を満たしてください。
- 3歳以上では、薄すぎるページを作らないでください。各ページに行動、気持ち、場面描写のうち少なくとも2つ以上を自然に含めてください。
- compositionHint を各ページに入れてください。
- narrativeDevice を含めてください。
- repeatedPhrase または visualMotif を入れてください。
- 5歳以上では setup / payoff を入れてください。
- imagePrompt は各ページで十分に具体的にしてください。

${issueLines ? `### Previous issues\n${issueLines}\n` : ""}`.trimEnd();
}

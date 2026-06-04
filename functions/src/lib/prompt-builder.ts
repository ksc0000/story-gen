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
  StoryCharacterKind,
} from "./types";
import type { AgeReadingProfile } from "./age-reading-profile";
import type { StoryQualityReport } from "./story-quality";
import { getIllustrationStyleProfile } from "./illustration-styles";

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

const CHARACTER_METADATA_RULES = [
  'There is exactly one human child protagonist: "child_protagonist".',
  "Do not create additional human children unless cast explicitly includes another human_child character.",
  "Magical friends, star creatures, glowing companions, object characters, and recurring buddies should usually be non-human unless the story truly requires a human character.",
  "For non-human recurring characters, use characterKind such as magical_creature or object_character and describe a non-human silhouette clearly.",
  "Avoid words like child, boy, girl, person, human, or spirit child for non-human magical companions.",
  "pages[].appearingCharacterIds must contain only characterId strings from cast plus child_protagonist.",
  "pages[].focusCharacterId must be a single characterId string or omitted.",
].join(" ");

// P4-7: Explicit JSON field type contract to prevent field_type_mismatch errors.
// Addresses observed failure: 'mainQuestObject' must be a string when provided.
const STORY_JSON_FIELD_TYPE_CONTRACT = [
  'mainQuestObject must be a plain string, not an array or object.',
  'If there are multiple quest items, join them into one concise Japanese string.',
  'Invalid: "mainQuestObject": ["\u9375", "\u5730\u56f3"] — Valid: "mainQuestObject": "\u9375\u3068\u5730\u56f3"',
  'forbiddenQuestObjects must be an array of strings, not a single string.',
  'pages[].text must be a string, not an array or object.',
  'pages[].imagePrompt must be a string, not an array or object.',
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
    // L3: imagination-specific text-risk token replacements (T6-32)
    .replace(/\bstar charts?\b/gi, "night sky")
    .replace(/\btreasure maps?\b/gi, "illustrated landscape")
    .replace(/\bcelestial maps?\b/gi, "sky scene")
    .replace(/\bannotat(ed|ion[s]?)\b/gi, "")
    .replace(/\brune[s]?\b/gi, "")
    .replace(/\bglyph[s]?\b/gi, "")
    .replace(/\binscription[s]?\b/gi, "")
    .replace(/\bcompass\b/gi, "round object")
    .replace(/\bscroll with\b/gi, "scroll")
    .replace(/\bparchment with\b/gi, "parchment")
    .replace(/\b(magical|glowing|enchanted|mystical|ancient)\s+(text|writing|marks?|letters?|symbols?)\b/gi, "")
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

function buildSharedPrintedSurfaceNoTextGuidance(): string {
  return [
    "Printed-surface guardrail: keep books, book covers, book spines, labels, posters, framed prints, packaging, cards, storage bins, toy boxes, and shelf props plain, unlabeled, and non-readable.",
    "Do not add readable titles, spine writing, pseudo-writing, glyph-like marks, decorative letters, numbers, logo-like marks, or watermark-like printed details on background objects.",
  ].join(" ");
}

function buildBedtimeRoomPropNoTextGuidance(): string {
  return [
    "Bedtime room-prop guardrail: bedroom bookshelf objects, nursery cards, framed wall art, toy bins, storage containers, packaging, and paper items must stay visual-only, plain, and non-readable.",
    "Do not show readable book titles, spine writing, shelf labels, container labels, printed posters, word art, or printed packaging graphics anywhere in the bedroom scene.",
  ].join(" ");
}

function buildImaginationNoTextGuidance(): string {
  return [
    "Imagination scene guardrail: all fantasy objects must stay purely visual with no text-like surface markings.",
    "Do not render spell book titles or open text pages, scroll writing, rune carvings, glyph patterns, magical inscriptions,",
    "star chart annotations, treasure map labels, constellation name tags, or compass direction letters.",
    "A spell book may appear as a plain mysterious closed volume with no title.",
    "A map may appear as an unlabeled visual landscape. Stars may appear as light points without name labels.",
    "A compass may appear as a round decorative object with no visible letters or numbers.",
    "Use purely visual fantasy objects: glowing orbs, crystals, wands, portals, clouds, rocket shapes, planets — all without surface text marks.",
  ].join(" ");
}

function buildCategoryGroupNoTextGuidance(categoryGroupId?: string): string {
  if (categoryGroupId === "bedtime") {
    return buildBedtimeRoomPropNoTextGuidance();
  }
  if (categoryGroupId === "imagination") {
    return buildImaginationNoTextGuidance();
  }
  return "";
}

function describeCharacterKind(kind: StoryCharacterKind | undefined): string {
  switch (kind) {
    case "human_child":
      return "human child";
    case "human_adult":
      return "human adult";
    case "animal":
      return "animal";
    case "magical_creature":
      return "non-human magical creature";
    case "object_character":
      return "non-human object-like character";
    case "background":
      return "background recurring element";
    default:
      return "recurring story character";
  }
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
  const styleProfile = getIllustrationStyleProfile(style);
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
- 挿絵のスタイル: ${styleProfile.name}
- 生成時の絵柄制御は style preview 画像ではなく、styleBible とスタイル指示文で行ってください。
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
- Fantasy and imagination imagePrompt rules: do not describe spell books with visible titles or open text pages, scrolls with written content, rune stones or glyph carvings, magical inscriptions, star charts with symbol annotations or constellation name labels, treasure maps with text labels or compass direction marks, or any object whose surface would contain glyphs, symbols, or marks resembling writing. Fantasy objects (orbs, wands, crystals, rockets, glowing portals, planets, cloud formations) are allowed when they are purely visual with no text-like surface markings. A spell book may appear as a plain mysterious closed volume. A map may appear as an unlabeled visual landscape. Stars may appear as light points without name labels. A compass may appear as a round decorative object with no visible letters.
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
- Character metadata rules: ${CHARACTER_METADATA_RULES}
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
- pages[].appearingCharacterIds must be an array of characterId strings.
- pages[].focusCharacterId must be a single characterId string, not an array or object.
- If multiple characters are central, choose the most visually important one as focusCharacterId.
- Valid IDs are "child_protagonist" and ids from cast[].characterId.
- Omit focusCharacterId if unsure.
- cast を省略してはいけません。ただし完全に主人公だけの話なら空配列は可です。
- JSON field type contract (must follow exactly): ${STORY_JSON_FIELD_TYPE_CONTRACT}

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
  "titleSpreadText": "タイトル見開きに表示する導入テキスト（1〜2文・省略可）",
  "openingNarration": "読み聞かせの最初に読むナレーション（1文・省略可）",
  "coverImagePrompt": "English prompt for generating the book cover image. Describe the main character, setting, mood, and key visual elements in a single scene that represents the story. Do not include any text or title in the image description.",
  "cast": [
    {
      "characterId": "magic_friend_01",
      "displayName": "ひかりの ともだち",
      "role": "magical_friend",
      "characterKind": "magical_creature",
      "visualBible": "A tiny glowing non-human star creature, about the size of a child's hand, with a rounded five-point star silhouette, soft golden light, tiny expressive eyes, no human body, no clothing, and a faint trail of sparkles.",
      "silhouette": "small rounded five-point star silhouette with a soft floating glow",
      "colorPalette": ["gold", "cream", "soft purple", "warm white"],
      "signatureItems": ["soft golden glow", "tiny expressive eyes", "sparkling golden trail"],
      "doNotChange": [
        "Must remain a non-human glowing star creature",
        "Must not become a child, boy, girl, person, fairy child, or second protagonist",
        "Must keep the rounded five-point star silhouette"
      ],
      "negativeCharacterRules": [
        "Do not draw this character as a human child",
        "Do not create a second child protagonist",
        "Do not give it human hair, human clothes, or human body proportions"
      ],
      "canChangeByScene": ["expression", "glow intensity", "floating pose", "camera angle"]
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
    categoryGroupId?: string;
    hasAnimalCharacters?: boolean;
    hasStarCharacter?: boolean;
  }
): string {
  const styleProfile = getIllustrationStyleProfile(style);
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
    buildSharedPrintedSurfaceNoTextGuidance(),
    buildCategoryGroupNoTextGuidance(options?.categoryGroupId),
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
            character.characterKind
              ? `Character kind: ${describeCharacterKind(character.characterKind)}.`
              : "",
            character.nonHuman
              ? "This character must remain clearly non-human."
              : "",
            character.noHumanFace
              ? "Do not give this character a human face."
              : "",
            character.noHumanBody
              ? "Do not give this character a human body, human arms, or human legs."
              : "",
            character.scaleHint
              ? `Scale hint: ${character.scaleHint}.`
              : "",
            character.visualBible,
            character.signatureItems?.length
              ? `Keep signature items: ${character.signatureItems.join(", ")}.`
              : "",
            character.doNotChange?.length
              ? `Do not change: ${character.doNotChange.join("; ")}.`
              : "",
            character.negativeCharacterRules?.length
              ? `Negative character rules: ${character.negativeCharacterRules.join("; ")}.`
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

  const hasAnimalCharacters = options?.hasAnimalCharacters ?? options?.categoryGroupId === "animals";
  const visualContinuityGuard = buildVisualContinuityGuard({ hasAnimalCharacters });
  const starCharacter =
    options?.hasStarCharacter ?? hasStarCharacterInCast(options?.cast ?? []);
  const starGuard = starCharacter ? buildStarCharacterGuard() : "";

  // P5-fix: scene and style are placed first so the image model treats the per-page
  // scene description and selected illustration style as primary guides.  Character
  // consistency guidelines follow as secondary constraints.  This addresses 竹-plan
  // reports of "all pages same image" and "style not reflected" where the original
  // ordering buried the scene at position ~16 of ~20 prompt segments.
  return [
    `Illustration style: ${styleProfile.styleBible}`,
    styleBible ? `Story-specific style consistency: ${styleBible}` : "",
    styleProfile.negativeStyleRules?.length
      ? `Style guardrails: ${styleProfile.negativeStyleRules.join(" ")}`
      : "",
    `Scene: ${sanitizedBasePrompt}`,
    compositionGuidance,
    consistency,
    castGuidance,
    modelSpecificGuidance,
    emotionGuidance,
    "Global character count rule: there is exactly one human child protagonist: child_protagonist.",
    "Do not create additional human children unless storyCast explicitly includes another human_child character.",
    "Magical friends must not be drawn as human children unless characterKind is human_child.",
    "If a non-human magical creature appears, preserve its non-human silhouette.",
    "Do not clone the protagonist. Do not draw the protagonist twice in the same image unless the page explicitly requires a reflection, memory, or picture-within-picture.",
    options?.appearingCharacterIds?.length
      ? `Only draw these recurring characters when relevant: ${options.appearingCharacterIds.join(", ")}. Do not add other recurring characters.`
      : "",
    `Visual storytelling rules: ${VISUAL_STORYTELLING_RULES}`,
    visualContinuityGuard,
    starGuard,
    SAFETY_KEYWORDS,
    "Use purely visual storytelling through characters, objects, colors, actions, and scenery.",
    "wordless picture book illustration, no written text anywhere, no letters, no captions, no speech bubbles, no labels, no signage, no readable marks, no watermark. Use plain objects and unlabeled backgrounds.",
  ].join(", ");
}

export function getStyleReferenceImagePath(style: IllustrationStyle): string | undefined {
  return getIllustrationStyleProfile(style).previewImageUrl;
}

function hasStarCharacterInCast(cast: StoryCharacter[]): boolean {
  return cast.some(
    (c) =>
      c.characterId !== "child_protagonist" &&
      (/\bstar\b/i.test(c.characterId) ||
        /\bstar\b/i.test(c.displayName) ||
        /\bstar\b/i.test(c.visualBible ?? ""))
  );
}

export function buildStarCharacterGuard(): string {
  return [
    "Star character guard:",
    "If the story includes a star character, it must appear as one independent recurring character with its own face, eyes, expression, and body.",
    "It is not a background star, decoration, star pattern, or accessory.",
    "Do not replace the star character with a star decoration, background star, or star-shaped accessory.",
    "Do not transform the child, any animal, toy, dinosaur, or other favorite object into the star character.",
    "Do not place star-shaped faces, star-shaped heads, star eyes, or star body parts onto another character.",
    "A favorite thing such as a dinosaur must remain itself and must not become the star character.",
    "If both a favorite thing and a star character appear, draw them as two clearly separate entities with no visual merging.",
    "The star character must keep the same shape, face, expression style, and color palette across all pages.",
    "Do not create multiple different star characters unless the story explicitly requires multiple stars.",
  ].join(" ");
}

export function buildVisualContinuityGuard({
  hasAnimalCharacters,
}: {
  hasAnimalCharacters: boolean;
}): string {
  const parts: string[] = [
    // A. Style consistency
    "Style consistency: Use the exact same illustration style across every page. Keep the same line weight, color palette, brush texture, lighting, shading, and level of detail. Every page must look like it was illustrated by the same artist for the same picture book. Do not shift style between pages.",
  ];
  if (hasAnimalCharacters) {
    // B. Secondary animal character consistency + cast-count guard
    parts.push(
      "Secondary animal character consistency: Recurring animal characters must keep the same appearance across all pages. If a fox, bear, bunny, or other animal appears more than once, it must remain the same character with the same body size, fur color, markings, ears, face shape, and expression. Do not redesign recurring animals from page to page. Do not duplicate recurring animal companions. Each recurring animal character should appear exactly once in a scene unless the current page explicitly requires multiple instances. Do not introduce extra foxes, bears, bunnies, birds, or other animal companions beyond what the story page describes."
    );
    // C. Child-animal boundary (strengthened)
    parts.push(
      "Child-animal boundary: The child protagonist must remain an ordinary fully human child on every single page. Do not dress the child as an animal. Do not give the child animal ears, an animal tail, an animal hood, an animal costume, an animal headband, paws, a snout, whiskers, claws, or fur. The child must not visually merge with any animal character. Animal features may appear only on actual animal characters. If animals appear, they must be clearly separate companions beside or near the child, never fused with or overlaid on the child's body."
    );
  }
  // D. Object grounding
  parts.push(
    "Object grounding: Only draw objects explicitly described in the current scene. Do not add mysterious glowing objects, jewels, artifacts, floating lights, magic devices, or shiny symbolic items unless they are named and clearly explained in the story. Every prominent object must be recognizable and relevant to the scene."
  );
  return parts.join(" ");
}

export function buildP5SimplifiedPagePrompt(
  scenePrompt: string,
  style: IllustrationStyle,
  options?: { hasAnimalCharacters?: boolean; hasStarCharacter?: boolean }
): string {
  const styleProfile = getIllustrationStyleProfile(style);
  const guard = buildVisualContinuityGuard({ hasAnimalCharacters: options?.hasAnimalCharacters ?? false });
  const starGuard = options?.hasStarCharacter ? buildStarCharacterGuard() : "";
  return [
    `Illustration style: ${styleProfile.styleBible}`,
    `Scene: ${scenePrompt.replace(/\s+/g, " ").trim()}`,
    "Avoid distorted hands, extra fingers, malformed faces, duplicated limbs, adult-looking children, uncanny expressions, and unreadable text.",
    guard,
    starGuard,
  ].filter(Boolean).join(" ");
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

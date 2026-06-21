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
  ChildProfileSnapshot,
  CharacterUsage,
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

const GLOBAL_NEGATIVE_CHARACTER_PROMPT = "Negative character guardrail: do not add extra people, unrequested children, unrequested animals, ghost companions, crowds, or random background figures. Do not draw the protagonist twice in the same scene. No character duplication. No unmentioned pets.";

const STORY_QUALITY_RULES = [
  "Do not generate overly thin pages.",
  "Each page should contain enough story substance for the target age.",
  "For age 3 and above, each page must contain at least two of the four semantic elements: Location, Action, Emotion, and Discovery.",
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
  "すべてのページに以下の4つの「意味内容」のうち2つ以上を自然に含めて、読み応えのある内容にしてください。",
  "- 「場所」(Location): どこで起きているか、周囲の情景",
  "- 「行動」(Action): キャラクターの具体的な動きや振る舞い",
  "- 「気持ち」(Emotion): キャラクターの感情や心の声",
  "- 「発見」(Discovery): 何かに気づいたり、新しいことが起きたりする変化",
  "意味の通らない造語を使わないでください。特に「〜たん」「〜りる」「〜ぴぴ」「〜ぱぱ」といった安易な語尾の変形や、意味のない音の羅列による造語は厳禁です。",
  "「おもしろい こえ」「ふわふわ ふわりん」のような曖昧で説明不足な文や、安易な赤ちゃん言葉（「〜りん」や、何にでも「お」をつける「おめめ」「おてて」「あんよ」「おみみ」など）を避けてください（0-2歳向けを除く）。",
  "擬音（オノマトペ）に頼りすぎず、具体的な動詞や形容詞を使って情景を描写してください。擬音は効果的なものに厳選し、1ページにつき最大1〜2個までにしてください。",
  "くり返し表現は、毎回少し物語が進む形で使ってください。",
  "3歳向けでも、1ページ2〜4文を基本にしてください。",
  "文章はやさしいが、内容は幼稚にしすぎないでください。",
  "文末の表現（「〜した」「〜だった」など）が連続して単調にならないよう、語尾にバリエーションを持たせてリズムを整えてください。",
  "5歳以上では、出来事の理由や原因と結果のつながりを自然に含め、深みのある文章にしてください。",
  "「すると」「でも」「やがて」「ところが」などの接続詞を使って、ページ内・ページ間に物語の流れと展開を作ってください。",
  "文体は絵本の語り部スタイル（「〜のです」「〜でした」「〜ましたが」「〜ましょう」など）を基本にしてください。",
  "5歳以上では、1ページに「出来事→反応→感情」の流れを自然に込めてください。",
  "情景描写を1文以上入れてください。",
  "子どもの行動または感情を1文以上入れてください。",
  "物語の冒頭（1ページ目）では、いきなり事件を起こすのではなく、まず「どこで」「だれが」「何をしていたか」という情景と日常の様子を丁寧に描写し、読み手を物語の世界へ引き込んでください。「急に物語が始まる感」を抑え、自然な導入を心がけてください。",
  "物語の結末（最後のページ）では、出来事の解決だけでなく、主人公の気持ちの安らぎや、物語のテーマ（storyGoal）を振り返るような余韻のある表現で締めくくってください。単に「解決してよかった」で終わらず、温かい気持ちが残るような一文を入れてください。",
  "日本語として自然で、かつ情緒豊かな文にしてください。",
  "ひらがなを多めにしても、意味が曖昧になりすぎないようにしてください。",
  "特に低年齢（0-4歳）向けでは、ひらがなを主体にし、難しい漢字は一切使用しないでください。",
  "説明文ではなく、絵本の語り部が読み聞かせるような口調にしてください。",
].join(" ");

const STORY_GOAL_CONSISTENCY_RULES = [
  "物語の中心目的 storyGoal を最初に決め、最後まで変えないでください。",
  "mainQuestObject を途中で別のものに変えないでください。",
  "hiddenDetail や背景小物を、物語の主目的にしてはいけません。",
  "visualMotif は本文と絵に出してよいが、hiddenDetail は基本的に絵だけの小さな発見要素です。",
  "例えば、hiddenDetail に『すいか模様の雲』がある場合でも、物語の目的を『すいか探し』に変えてはいけません。",
  "storyRequest が『なくした星を探す』なら、最後まで探す対象は『星』または『星のかけら』です。",
  "4ページ構成では、各ページが storyGoal に向かって少しずつ進む必要があります。",
  "forbiddenQuestObjects は「クエストの探し物・目標物にしてはいけないもの」のみを入れてください。",
  "主人公の signatureItem・好きなもの（favorites）・服装・colorMood は forbiddenQuestObjects に含めてはいけません。それらはキャラクターのアイデンティティです。",
  "例: 主人公が MacBook を持っていても「パソコン」「MacBook」を forbiddenQuestObjects に入れてはいけません。",
].join(" ");

const CHARACTER_METADATA_RULES = [
  'There is exactly one human child protagonist: "child_protagonist".',
  "Do not create additional human children unless cast explicitly includes another human_child character.",
  "Magical friends, star creatures, glowing companions, object characters, and recurring buddies should usually be non-human unless the story truly requires a human character.",
  "For non-human recurring characters, use characterKind such as magical_creature or object_character and describe a non-human silhouette clearly.",
  "Avoid words like child, boy, girl, person, human, or spirit child for non-human magical companions.",
  "pages[].appearingCharacterIds must contain only characterId strings from cast plus child_protagonist.",
  "pages[].focusCharacterId must be a single characterId string or omitted.",
  "Do not introduce any unrequested companions, extra pets, random animals, or background people not mentioned in the story.",
  "If the narrative implies a private or solo moment, strictly omit any secondary characters or crowds.",
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
  "opening_establishing: Focus on 'Where, Who, and When'. Set the scene and the child's peaceful initial state before any conflict or adventure begins. Use evocative language to establish atmosphere and ground the reader in the story's world. Avoid jumping into action too quickly.",
  "discovery: Describe the moment of noticing something new, surprising, or mysterious. Focus on the child's reaction (wonder, curiosity) and why the discovery is significant to the story.",
  "action: Focus on physical movement, effort, or an active search. Use energetic verbs to describe the child's engagement with the world as they move toward their goal.",
  "emotional_closeup: Delve into the child's inner feelings—joy, determination, or a quiet realization. Use descriptive language to convey the depth of the emotional moment.",
  "object_detail: Highlight a specific item's texture, color, or importance. Explain how this object connects to the larger story or the child's current task.",
  "setback_or_question: A moment of pause, doubt, or a small obstacle. Frame it as a natural part of the journey that leads to deeper thinking or a new approach, without losing momentum.",
  "payoff: The peak of the narrative where the goal is reached or a mystery is solved. Celebrate the achievement with a sense of fulfillment and positive resolution.",
  "quiet_ending: A gentle wrap-up that leaves a lasting warm feeling of 'Peace and Reflection'. Connect the resolution back to the story's beginning or the child's growth. Use soft, rhythmic language to signal the end of the journey and provide a satisfying emotional conclusion.",
].join(" ");

const BAD_TEXT_EXAMPLE =
  "ころころ こりころ。まきまき まきば。ふわりん ぴかりん、ふしぎな じゅうたん。たっちゃん、おててを ぎゅっ。";
const GOOD_TEXT_EXAMPLE = [
  "【良い導入の例 (opening_establishing)】",
  "ぽかぽかと あたたかい ごごのことです。さくらちゃんは、おにわで おはなを ながめていました。",
  "ちょうちょが ひらひらと まっています。「どこへ いくのかな？」",
  "さくらちゃんは、そっと ちょうちょの あとを おいかけてみました。",
  "",
  "【良い結末の例 (quiet_ending)】",
  "おそらが オレンジいろに そまり、おうちに かえる じかんです。",
  "さくらちゃんは、みつけた ぴかぴかの いしを ぎゅっと にぎりしめました。",
  "「きょうは たのしかったね」",
  "あしたは どんな すてきなことが まっているでしょうか。さくらちゃんは しあわせな きもちで いっぱいに なりました。",
].join("\n");

/** @internal Exported for testing */
export function getDefaultCompositionHint(pageNumber?: number): string {
  // Enhanced composition hints to ensure variety even when LLM doesn't specify.
  const hints: string[] = [
    "cinematic wide establishing shot, low-angle perspective", // 0
    "dynamic medium shot, asymmetrical framing",            // 1
    "close-up with shallow depth of field",                 // 2
    "macro detail focus with soft-focus background",        // 3
    "over-the-shoulder view, medium shot",                  // 4
    "bird's-eye view looking down, wide shot",              // 5
    "side-view profile, medium action shot",                // 6
    "heroic centered framing, vibrant wide shot",           // 7
    "back-view wide shot walking into distance",            // 8
    "extreme close-up on hands or a meaningful gesture",    // 9
    "dynamic diagonal composition, low-angle action",       // 10
    "peaceful wide scenic shot with warm lighting",         // 11
  ];

  if (pageNumber !== undefined && pageNumber >= 0) {
    return hints[pageNumber % hints.length];
  }
  return "varied storybook composition with a clear focal point and distinct camera angle";
}

/** @internal Exported for testing */
export function getDefaultPageVisualRole(pageNumber?: number): PageVisualRole {
  // Mirroring the logic from gemini.ts for consistency.
  // This logic is mostly for 4-page books; gemini.ts handles 8 and 12-page variety.
  switch (pageNumber) {
    case 0:
      return "opening_establishing";
    case 1:
      return "discovery";
    case 2:
      return "payoff";
    case 3:
      return "quiet_ending";
    default:
      // Cycle through roles for longer books if somehow triggered.
      const roles: PageVisualRole[] = [
        "action",
        "emotional_closeup",
        "object_detail",
        "setback_or_question",
        "discovery",
      ];
      return pageNumber !== undefined ? roles[(pageNumber - 4) % roles.length] : "action";
  }
}

function getPageVisualRoleGuidance(role: PageVisualRole): string {
  switch (role) {
    case "opening_establishing":
      return "Page visual role: opening_establishing. Use a cinematic wide establishing shot, either a low-angle perspective to emphasize scale or a high-angle view to reveal the surroundings. Define the setting and atmosphere clearly. Show the child character within a spacious, inviting environment with rich background details.";
    case "discovery":
      return "Page visual role: discovery. Use a medium shot or an over-the-shoulder view where the child notices something new. Focus the viewer's eye on the object of discovery using leading lines or a shallow depth of field. Capture a sense of wonder and curiosity.";
    case "action":
      return "Page visual role: action. Use a dynamic medium or wide shot with a clear sense of movement (running, reaching, jumping). Employ diagonal compositions, active poses, or asymmetrical framing to convey energy, momentum, and purposeful motion.";
    case "emotional_closeup":
      return "Page visual role: emotional_closeup. Use an intimate close-up or extreme close-up of the face, hands, or a meaningful gesture. Apply a shallow depth of field with a soft-focus background to create an eye-level emotional connection. Focus on a specific, expressive reaction.";
    case "object_detail":
      return "Page visual role: object_detail. Use a macro focus or extreme close-up on a key story object or recurring motif. Emphasize tactile textures and fine details. The child may be partially visible in the soft-focus foreground or background, keeping the object as the primary focal point.";
    case "setback_or_question":
      return "Page visual role: setback_or_question. Use a thoughtful medium shot, an over-the-shoulder view, or an asymmetrical composition to show a moment of pause or doubt. Use gentle shadows and soft, muted lighting to emphasize a reflective, contemplative mood.";
    case "payoff":
      return "Page visual role: payoff. Use a triumphant medium or wide shot with a centered heroic framing. The child must be present, showing a clear reaction to success with an expressive, joyful pose. Use vibrant colors, bright radiant lighting, and dynamic upward camera angles to mark the visual climax.";
    case "quiet_ending":
      return "Page visual role: quiet_ending. Use a peaceful wide shot, a scenic back view of the child walking away, or a cozy bird's-eye view of a resting scene. Emphasize closure and warmth with soft golden hour lighting or gentle silhouettes. The child must be present to provide emotional resonance.";
    default:
      return "Page visual role: action. Keep the scene dynamic, story-driven, and visually distinct from previous pages using varied camera angles.";
  }
}

function sanitizeImagePromptText(value: string): string {
  return value
    .replace(/[「『][^」』]*[」』]/g, "")
    .replace(/"[^"]*"/g, "")
    .replace(/\b(repeated phrase|phrase|text|letters?|caption|speech bubbles?|labels?|posters?|banners?|signboards?|signage|signs?|storefront signs?|written|writing|title on|words?|quotes?|typography|graffiti|logos?|brand names?|word-like marks?)\b/gi, "")
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

/**
 * The child profile base prompt is the AVATAR-generation prompt. It is designed
 * to render a clean, reusable character on a plain background, so it carries
 * avatar-specific directives that are wrong for story pages:
 *  - "Illustration style: soft watercolor..." / "Color mood: ...pastel" → fight
 *    the book's selected styleBible, causing per-page style inconsistency.
 *  - "Use a clean white background...", "front-facing... almost full-body
 *    composition", reference-image rules, "...so the character can be reused..."
 *    → leak the avatar's plain/sandbox background and locked framing into pages,
 *    replacing the actual story scene.
 *
 * Strip the style/palette directives so the scene-filtering step doesn't carry
 * them, while keeping the background-restriction phrases that step relies on.
 */
function stripStyleDirectivesFromProfilePrompt(childProfileBasePrompt?: string): string | undefined {
  if (!childProfileBasePrompt) return childProfileBasePrompt;
  return childProfileBasePrompt
    .split("\n")
    .filter((line) => {
      const l = line.trim().toLowerCase();
      return !l.startsWith("illustration style:") && !l.startsWith("color mood:");
    })
    .join("\n")
    .trim();
}

// Identity lines worth keeping when the profile prompt is INJECTED into page
// scene/background guidance. Everything else (background, composition, framing,
// reference-image rules, style, palette) is avatar-specific and must be dropped
// so the book styleBible controls style and the story scene controls background.
const PROFILE_IDENTITY_LINE_PREFIXES = [
  "name or nickname:",
  "age impression:",
  "gender expression:",
  "personality:",
  "favorite things:",
  "appearance:",
  "usual outfit:",
  "signature item:",
];

/**
 * Extract ONLY character-identity lines from the avatar prompt for use as page
 * scene/background guidance. Returns undefined when nothing identity-relevant
 * remains, so the caller injects no avatar background/composition at all.
 */
function extractProfileIdentityForPageScene(childProfileBasePrompt?: string): string | undefined {
  if (!childProfileBasePrompt) return undefined;
  const kept = childProfileBasePrompt
    .split("\n")
    .map((line) => line.trim())
    .filter((line) =>
      PROFILE_IDENTITY_LINE_PREFIXES.some((prefix) => line.toLowerCase().startsWith(prefix))
    );
  return kept.length > 0 ? kept.join(" ") : undefined;
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
    "Do not add readable text, signs, labels, posters, banners, logos, brand marks, numbers, watermarks, or random symbols.",
    "Do not add dangerous objects, traffic, roads, vehicles, or adult-only items unless explicitly required and child-safe.",
    "If playground equipment, furniture, buildings, or animals appear, they must be natural for the scene and must support the story.",
    "Hidden details are allowed only as subtle visual discoveries and must never become the story goal.",
  ].join(" ");
}

function buildSharedPrintedSurfaceNoTextGuidance(): string {
  return [
    "Printed-surface guardrail: keep books, book covers, book spines, labels, posters, banners, framed prints, packaging, cards, storage bins, toy boxes, and shelf props plain, unlabeled, and non-readable.",
    "Do not add readable titles, spine writing, pseudo-writing, glyph-like marks, decorative letters, numbers, logo-like marks, or watermark-like printed details on background objects.",
  ].join(" ");
}

function buildBedtimeRoomPropNoTextGuidance(): string {
  return [
    "Bedtime room-prop guardrail: bedroom bookshelf objects, nursery cards, framed wall art, toy bins, storage containers, packaging, and paper items must stay visual-only, plain, and non-readable.",
    "Do not show readable book titles, spine writing, shelf labels, container labels, printed posters, printed banners, word art, or printed packaging graphics anywhere in the bedroom scene.",
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
  readingProfile?: AgeReadingProfile,
  input?: BookInput
): string {
  const styleProfile = getIllustrationStyleProfile(style);
  const childName = input?.childName || "{childName}";
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
- 主人公の名前は必ず「${childName}」を使ってください。他の名前（たっちゃん、はなちゃん、けんくん など）に変えることは絶対に禁止です。title・storyGoal・openingNarration・titleSpreadText・pages[].text のすべてで同じ名前を一貫して使ってください。
- 子ども向けの安全な内容のみ生成してください。暴力、恐怖、悲しい結末は禁止です。
- 親の目的: ${template.parentIntent ?? "子どもに合った絵本を作る"}
- 挿絵のスタイル: ${styleProfile.name}
- 生成時の絵柄制御は style preview 画像ではなく、styleBible とスタイル指示文で行ってください。
- 各ページの imagePrompt は英語で、挿絵の内容を具体的に描写してください。
- characterBible は全ページで同じ主人公として見えるように、年齢感、髪型、服装、固定アイテム、表情の特徴、頭身（head-to-body ratio）や体格などの身体的特徴を英語で具体化してください。
- coverImagePrompt には、主人公の服装とシグネチャアイテムを必ず反映してください。characterBible に記載された服装と持ち物は coverImagePrompt でも省略・変更しないでください。
- coverImagePrompt で主人公の服装を新たに創作しないでください。登録された服装をそのまま使ってください。
- styleBible は全ページで同じ画風として見えるように、カテゴリのビジュアル方向、キャラクターのデフォルメ具合（degree of deformation）、線、色、質感、光、構図のルールを英語で具体化してください。
- imagePrompt にはページ固有の場面だけを書き、characterBible と styleBible の内容を重複させすぎないでください。
- 【重要】imagePrompt の中に画材・画風・スタイルを表す語を絶対に書かないでください（例: "watercolor", "watercolor picture book style", "3D", "clay", "crayon", "pastel", "oil painting", "anime style", "flat illustration" など）。絵柄・画材・色調の制御は styleBible とスタイル指示文に一元化されており、imagePrompt にスタイル語を入れると選択スタイルと矛盾してページごとに絵柄がバラつきます。imagePrompt は「被写体・動作・場所・構図・焦点・雰囲気」など場面の内容だけを記述してください。
- imagePrompt のシーン記述に、主人公の年齢を具体的な数字（例: "around 7-8 years old", "12-year-old child" など）で書き込まないでください。年齢感の管理は characterBible に一元化します。imagePrompt に年齢数字を入れると characterBible と矛盾し、画像生成で別人になります。
- 各ページの imagePrompt は、主人公の見た目だけでなく、場面・背景・周囲の出来事・画面の焦点を具体的に書いてください。
- すべてのページで主人公を中央に大きく描く構図は禁止です。
- ページごとに wide shot / medium shot / close-up / detail shot / bird's-eye view などの視点を変えて、絵本全体の視覚的なリズムを作ってください。
- 同じ pageVisualRole や compositionHint を連続して使用することは避けてください。8ページ以上の構成では、少なくとも5種類以上の異なる pageVisualRole を組み合わせて、構図の多様性を最大化してください。
- compositionHint には、選択した pageVisualRole を補完する具体的なカメラアングル（low-angle, high-angle, side-view, over-the-shoulder, bird's-eye view, macro focus など）を明記してください。
- ときには背景、物、家族、友だち、動物、サブキャラクターが絵の主役になっても構いません。
- imagePrompt には、そのページで何を一番見せたいかを明確に含めてください。
- 屋内シーン（家の中、お風呂、寝室、リビングなど）では主人公は裸足または靴下を着用させ、屋外シーン（公園、庭、道路など）では靴を着用させてください。状況に合わない靴（屋内で土足など）は禁止です。
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
- pageVisualRole が opening_establishing のページは、物語世界の第一印象を決める重要なページです。styleBible に定義されたアートスタイル・色調・線質を特に忠実に守り、以降のページとの視覚的統一感の基準点となるよう imagePrompt を組み立ててください。
- Story quality rules: ${STORY_QUALITY_RULES}
- 3歳以上では、文字数が少なすぎる「薄いページ」にならないようにしてください。すべてのページに「場所」「行動」「気持ち」「発見」のうち少なくとも2つ以上を自然に含めて、意味の詰まった内容にしてください。
- 5歳以上では、小さな原因と結果、短い会話、場面の具体物を入れてください。
- 7歳以上では、小さな伏線、最後の回収、理由や気持ちの変化を入れてください。
- repeatedPhrase が自然な場合は短く覚えやすいものにしてください。
- visualMotif は小物、色、動物、光、模様など、絵でも文章でも繰り返し感じられるものにしてください。
- 年齢が低い場合は、短く、音やリズムが心地よい文章にしてください。
- 年齢が高い場合は、少しだけ理由、選択、気持ちの変化を含めてください。
- ただし、どの年齢でも説教臭くせず、絵本として自然な文章にしてください。
- 各ページの本文量は対象年齢の目安を大きく超えないでください。
- Japanese story text rules: ${JAPANESE_STORY_TEXT_RULES}
- 日本語の読みやすさ: 子どもが自分で読んだり、親が読み聞かせたりしやすいよう、ひらがな主体の読みやすい日本語を優先してください。
- Story goal consistency rules: ${STORY_GOAL_CONSISTENCY_RULES}
- pageVisualRole が payoff または quiet_ending のページでは、主人公を必ず画面内に存在させてください。payoff は達成・喜び・感情のクライマックスであり、主人公の反応・表情・ポーズが必須です。物や背景だけを描くことは禁止です。
- pageVisualRole ごとの本文設計ルール: ${PAGE_TEXT_ROLE_RULES}
- Character metadata rules: ${CHARACTER_METADATA_RULES}
- 悪い例: 「${BAD_TEXT_EXAMPLE}」
- 理由: 意味が通りにくく、情景や行動が不足している。
- 良い例:
${GOOD_TEXT_EXAMPLE}
- 主要な登場人物は cast に定義してください。
- ユーザーから指定された「相棒」キャラクターは、必ず cast に追加し、物語の中で重要な役割を与えてください。
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
- cast に定義されたキャラクターは、登場するすべてのページで visualBible に記述された見た目を守ってください。主人公以外のキャラクターも、体の大きさ・色・特徴的なアイテムをページ間で統一してください。
- imagePrompt に cast キャラクターを登場させる場合は、そのキャラクターの visualBible の要点（色、体格、特徴）を imagePrompt 内に必ず反映してください。
- 各ページの imagePrompt では、appearingCharacterIds に指定されたキャラクターのみを描写してください。cast 外の人物、勝手に追加されたペットや動物、群衆などを描写することは厳禁です。
- JSON field type contract (must follow exactly): ${STORY_JSON_FIELD_TYPE_CONTRACT}

## 出力形式
以下のJSON形式で出力してください。JSON以外のテキストは含めないでください。

\`\`\`json
{
  "title": "絵本のタイトル",
  "characterBible": "Consistent English character design description used for every illustration. Must include age impression, hairstyle, outfit, and physical proportions (e.g., head-to-body ratio).",
  "styleBible": "Consistent English visual style guide used for every illustration. Must include artistic style, line weight, color palette, degree of character deformation, and lighting rules.",
  "storyGoal": "たっちゃんが、すなばで出会ったほしのこと一緒に、なくした星のかけらを探す",
  "mainQuestObject": "星のかけら",
  "forbiddenQuestObjects": ["すいか", "食べ物"], // 「クエストの探し物・目標物にしてはいけないもの」のみを入れてください。主人公の signatureItem・好きなもの・服装・colorMood は含めてはいけません。例: 主人公が MacBook を持っていても「パソコン」「MacBook」を入れてはいけません。
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

  if (input.protagonistType === "companion" && input.companionName) {
    // なかよしキャラが主人公モード
    lines.push(`主人公: 「${input.companionName}」（なかよしキャラ・動物や生き物）`);
    lines.push(`【重要】この絵本の主人公は人間の子どもではなく、なかよしキャラ（動物・生き物）の「${input.companionName}」です。子どもは登場させないでください。`);
    if (input.companionVisualDescription) {
      lines.push(`主人公の見た目: ${input.companionVisualDescription}`);
    }
    lines.push(`「${input.companionName}」が全ページの主人公として活躍する物語を作ってください。characterBibleは「${input.companionName}」の動物・生き物としての外見を英語で詳細に記述してください。`);
  } else {
    lines.push(`主人公の名前: ${input.childName}`);
    if (input.characterLook) lines.push(`主人公の見た目: ${input.characterLook}`);
  }

  if (input.storyRequest) lines.push(`今回の絵本で描きたいこと: ${input.storyRequest}`);
  if (input.childAge !== undefined) {
    lines.push(`年齢: ${input.childAge}歳`);
    lines.push(`対象年齢に合わせた文章レベルにしてください: ${input.childAge}歳`);
  }
  if (input.favorites) lines.push(`好きなもの: ${input.favorites}`);
  if (input.lessonToTeach) lines.push(`教えたいこと: ${input.lessonToTeach}`);
  if (input.memoryToRecreate) lines.push(`再現したい思い出: ${input.memoryToRecreate}`);
  if (input.signatureItem) lines.push(`毎ページに出したい持ち物・服装: ${input.signatureItem}`);
  if (input.colorMood) lines.push(`色や雰囲気: ${input.colorMood}`);
  if (input.place) lines.push(`場所: ${input.place}`);
  if (input.familyMembers) lines.push(`一緒に登場させたい人: ${input.familyMembers}`);
  if (input.season) lines.push(`季節・時期: ${input.season}`);
  if (input.parentMessage) lines.push(`最後に伝えたい言葉: ${input.parentMessage}`);
  if (input.freeInput) lines.push(`ユーザーからの追加リクエスト: ${input.freeInput}`);

  // companion主人公モードでは「相棒」として再掲しない
  if (input.protagonistType !== "companion" && input.companionName && input.companionVisualDescription) {
    lines.push(`相棒キャラクター（必ず絵本に登場させてください）: "${input.companionName}" — ${input.companionVisualDescription}`);
    lines.push(`"${input.companionName}"はcastに必ず含め、半数以上のページのappearingCharacterIdsに入れてください。`);
  }

  lines.push(`ページ数: ${pageCount}ページ`);
  return lines.join("\n");
}

export function buildFinalCharacterBible(params: {
  storyCharacterBible: string;
  childProfileSnapshot?: ChildProfileSnapshot;
  characterUsage?: CharacterUsage;
  childAge?: number;
}): string {
  const visual = params.childProfileSnapshot?.visualProfile;
  const outfitRule = buildOutfitRule(params.characterUsage, visual);
  return [
    visual?.characterBible ? `Approved child profile: ${visual.characterBible}` : "",
    params.storyCharacterBible,
    buildCharacterConsistencyRules({
      childProfileSnapshot: params.childProfileSnapshot,
      childAge: params.childAge,
    }),
    outfitRule,
  ].filter(Boolean).join(" ");
}

export function buildCharacterConsistencyRules(params: {
  childProfileSnapshot?: ChildProfileSnapshot;
  childAge?: number;
}): string {
  const visual = params.childProfileSnapshot?.visualProfile;
  const age = params.childProfileSnapshot?.age ?? params.childAge;

  return [
    "Character consistency rules:",
    "The protagonist must be the same child on every page.",
    age ? `Keep the same age impression: around ${age} years old.` : "",
    "Do not change hairstyle, hair length, face shape, age impression, or body proportions.",
    visual?.outfit
      ? `Keep the same outfit unless the outfit mode explicitly allows adaptation: ${visual.outfit}.`
      : "Keep the same outfit unless the outfit mode explicitly allows adaptation.",
    visual?.signatureItem
      ? `Keep the same signature item when appropriate: ${visual.signatureItem}.`
      : "Keep the same signature item when appropriate.",
    "If the child is seen from behind, from the side, or far away, preserve hairstyle, silhouette, outfit logic, and recognizable body proportions.",
    "Do not redesign the protagonist between pages.",
  ]
    .filter(Boolean)
    .join(" ");
}

export function buildOutfitRule(
  usage?: CharacterUsage,
  visual?: ChildProfileSnapshot["visualProfile"]
): string {
  if (!usage) return "";

  const signatureRule = usage.keepSignatureItem && visual?.signatureItem
    ? `Keep the signature item when appropriate: ${visual.signatureItem}.`
    : "Do not force the signature item if it does not fit the scene.";

  if (usage.outfitMode === "profile_default") {
    return `Outfit rule: use the child's registered default outfit: ${visual?.outfit || "the approved profile outfit"}. ${signatureRule}`;
  }
  if (usage.outfitMode === "theme_auto") {
    return `Outfit rule: keep the same face and age impression, but adapt the outfit to the story theme in a cute child-safe way. ${signatureRule}`;
  }
  return `Outfit rule: use this custom outfit: ${usage.customOutfit || visual?.outfit || "a cute child-safe outfit"}. ${signatureRule}`;
}

function buildCharacterConsistencyGuidance(characterBible?: string): string {
  return [
    characterBible ? `Character consistency: ${characterBible}` : "",
    "Character consistency rules: same child character across all pages, same age impression, same hairstyle, same face shape, same body proportions, same outfit unless the outfit rule says otherwise, keep the signature item when appropriate.",
    "If the child is seen from behind, in side view, or far away, preserve the same hairstyle, silhouette, outfit logic, and recognizable age impression.",
    "Keep identity consistent, but change pose, camera angle, distance, action, background, and focal point according to this page.",
    "Do not repeat the same pose or same framing from previous pages.",
    "The child can appear from behind, side view, far away, or partially visible, as long as hairstyle, outfit, silhouette, and age impression remain recognizable.",
  ].filter(Boolean).join(" ");
}

function buildCastGuidance(
  cast: StoryCharacter[] | undefined,
  appearingCharacterIds?: string[],
  focusCharacterId?: string
): string {
  if (!appearingCharacterIds || appearingCharacterIds.length === 0) {
    return "";
  }

  const charactersToDescribe = (cast ?? []).filter((character) =>
    appearingCharacterIds.includes(character.characterId) &&
    character.role !== "protagonist" &&
    character.characterId !== "child_protagonist"
  );

  if (charactersToDescribe.length === 0) {
    return "";
  }

  return [
    focusCharacterId ? `Focus character: ${focusCharacterId}.` : "",
    ...charactersToDescribe.map((character) =>
      [
        `Recurring character consistency: ${character.characterId} is the same character whenever it appears.`,
        character.characterKind ? `Character kind: ${describeCharacterKind(character.characterKind)}.` : "",
        character.nonHuman ? "This character must remain clearly non-human." : "",
        character.noHumanFace ? "Do not give this character a human face." : "",
        character.noHumanBody ? "Do not give this character a human body, human arms, or human legs." : "",
        character.scaleHint ? `Scale hint: ${character.scaleHint}.` : "",
        character.visualBible,
        character.signatureItems?.length ? `Keep signature items: ${character.signatureItems.join(", ")}.` : "",
        character.doNotChange?.length ? `Do not change: ${character.doNotChange.join("; ")}.` : "",
        character.negativeCharacterRules?.length ? `Negative character rules: ${character.negativeCharacterRules.join("; ")}.` : "",
        character.colorPalette?.length ? `Color palette: ${character.colorPalette.join(", ")}.` : "",
        character.silhouette ? `Preserve silhouette: ${character.silhouette}.` : "",
      ]
        .filter(Boolean)
        .join(" ")
    ),
    "Do not redesign recurring characters. Do not merge characters. Do not turn one character into another.",
    "Keep each recurring character's face shape and proportions consistent with the reference across pages; vary only pose, expression, and camera angle.",
    "If a recurring character appears from behind, far away, or partially visible, preserve silhouette and signature items.",
  ]
    .filter(Boolean)
    .join(" ");
}

export function buildCoverImagePrompt(
  baseCoverPrompt: string,
  style: IllustrationStyle,
  characterBible: string | undefined,
  styleBible: string | undefined,
  options: {
    cast?: StoryCharacter[];
    childProfileBasePrompt?: string | undefined;
    imageModelProfile?: ImageModelProfile;
    imageQualityTier?: ImageQualityTier;
    ageBand?: AgeBand;
    categoryGroupId?: string;
  }
): string {
  const styleProfile = getIllustrationStyleProfile(style);
  // Strip the avatar prompt's own style/color directives so they don't override
  // the book's selected styleBible on the cover either.
  const profileScenePrompt = stripStyleDirectivesFromProfilePrompt(options?.childProfileBasePrompt);
  const profileIdentityForGuidance = extractProfileIdentityForPageScene(options?.childProfileBasePrompt);
  const sanitizedBasePrompt = sanitizeSceneAgainstChildConstraints(
    sanitizeImagePromptText(baseCoverPrompt),
    profileScenePrompt
  );

  const consistency = buildCharacterConsistencyGuidance(characterBible);
  const castIds = options.cast?.map((c) => c.characterId);
  const castGuidance = buildCastGuidance(options?.cast, castIds);

  const coverCompositionGuidance = [
    "Book cover composition: single striking focal point, iconic masterpiece framing, eye-catching and vibrant, masterpiece quality.",
    "The protagonist should be clearly visible and ideally centered or placed according to the rule of thirds for maximum impact.",
    "Ensure a clean and balanced layout suitable for a book cover.",
  ].join(" ");

  const backgroundGuidance = [
    `Background richness: ${getBackgroundRichnessGuidance(options?.ageBand)}`,
    "Show meaningful surroundings, not just the protagonist.",
    buildScenePolicyGuidance(undefined, profileIdentityForGuidance),
    buildSharedPrintedSurfaceNoTextGuidance(),
    buildCategoryGroupNoTextGuidance(options?.categoryGroupId),
  ].join(" ");

  const emotionGuidance = `Age-appropriate emotional expression: ${getEmotionalExpressionGuidance(options?.ageBand)}`;

  const modelSpecificGuidance =
    options?.imageModelProfile === "pro_consistent" || options?.imageModelProfile === "kontext_reference"
      ? [
          backgroundGuidance,
          "Avoid distorted hands, extra fingers, malformed faces, duplicated limbs, adult-looking children, uncanny expressions, unreadable text, and over-detailed busy backgrounds.",
        ].join(" ")
      : [
          "Keep the prompt simple and clear for the image model.",
          backgroundGuidance,
          "Avoid distorted hands, extra fingers, malformed faces, duplicated limbs, adult-looking children, uncanny expressions, unreadable text, and cluttered backgrounds.",
        ].join(" ");

  const starCharacter = hasStarCharacterInCast(options?.cast ?? []);
  const starGuard = starCharacter ? buildStarCharacterGuard() : "";
  const hasAnimalCharacters =
    options?.categoryGroupId === "animals" ||
    hasAnimalCharactersInCast(options?.cast ?? []);
  const visualContinuityGuard = buildVisualContinuityGuard({ hasAnimalCharacters });

  // P5-fix: reordered to prioritize composition, style, and scene first (following buildImagePrompt success pattern).
  return [
    "Book cover: text-free, no letters, no logos, no watermarks",
    coverCompositionGuidance,
    `Illustration style: ${styleProfile.styleBible}`,
    styleBible ? `Story-specific style consistency: ${styleBible}` : "",
    styleProfile.negativeStyleRules?.length
      ? `Style guardrails: ${styleProfile.negativeStyleRules.join(" ")}`
      : "",
    `Scene: ${sanitizedBasePrompt}`,
    consistency,
    castGuidance,
    modelSpecificGuidance,
    emotionGuidance,
    "Global character count rule: there is exactly one human child protagonist: child_protagonist.",
    "Do not create additional human children unless storyCast explicitly includes another human_child character.",
    "Magical friends must not be drawn as human children unless characterKind is human_child.",
    "If a non-human magical creature appears, preserve its non-human silhouette.",
    "Do not clone the protagonist. Do not draw the protagonist twice in the same image.",
    GLOBAL_NEGATIVE_CHARACTER_PROMPT,
    `Visual storytelling rules: ${VISUAL_STORYTELLING_RULES}`,
    visualContinuityGuard,
    starGuard,
    SAFETY_KEYWORDS,
    "Use purely visual storytelling through characters, objects, colors, actions, and scenery.",
    "wordless picture book illustration, no written text anywhere, no letters, no captions, no speech bubbles, no labels, no signage, no readable marks, no watermark. Use plain objects and unlabeled backgrounds.",
  ].join(", ");
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
  // Strip the avatar prompt's own style/color directives so they don't fight the
  // book's selected styleBible (cause of per-page style inconsistency).
  const profileScenePrompt = stripStyleDirectivesFromProfilePrompt(options?.childProfileBasePrompt);
  // For guidance INJECTED into the page prompt, keep only character identity —
  // never the avatar's background/composition/style — so the story scene drives
  // the background and the book styleBible drives the style.
  const profileIdentityForGuidance = extractProfileIdentityForPageScene(options?.childProfileBasePrompt);
  const sanitizedBasePrompt = sanitizeSceneAgainstChildConstraints(
    sanitizeImagePromptText(basePrompt),
    profileScenePrompt
    ,
    scenePolicy
  );
  const consistency = buildCharacterConsistencyGuidance(characterBible);

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
    buildScenePolicyGuidance(scenePolicy, profileIdentityForGuidance),
    buildSharedPrintedSurfaceNoTextGuidance(),
    buildCategoryGroupNoTextGuidance(options?.categoryGroupId),
    scenePolicy?.backgroundMode === "fixed"
      ? buildFixedProfileConstraintGuidance(profileIdentityForGuidance)
      : "",
  ].join(" ");

  const motifGuidance = visualMotif
    ? `Visual motif: include ${visualMotif} as a physical object, color motif, or shape cue in a natural way on this page, never as written text.`
    : "Visual motif: if the story includes a recurring small motif, place it naturally in the scene as an object, color, or shape, never as written text.";
  const hiddenDetailGuidance = hiddenDetail
    ? `Hidden detail: include this subtle background detail for children to notice: ${hiddenDetail}. Keep it purely visual and never written as text.`
    : "Hidden detail: include one small child-friendly background detail that rewards careful looking.";
  const emotionGuidance = `Age-appropriate emotional expression: ${getEmotionalExpressionGuidance(ageBand)}`;
  const castGuidance = buildCastGuidance(
    options?.cast,
    options?.appearingCharacterIds,
    options?.focusCharacterId
  );
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

  const hasAnimalCharacters =
    options?.hasAnimalCharacters ??
    (options?.categoryGroupId === "animals" ||
      hasAnimalCharactersInCast(options?.cast ?? []));
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
    compositionGuidance,
    `Illustration style: ${styleProfile.styleBible}`,
    styleBible ? `Story-specific style consistency: ${styleBible}` : "",
    styleProfile.negativeStyleRules?.length
      ? `Style guardrails: ${styleProfile.negativeStyleRules.join(" ")}`
      : "",
    `Scene: ${sanitizedBasePrompt}`,
    // Child-animal boundary placed immediately after the scene so FLUX weights it early.
    // Previously placed only at the end of the prompt (in visualContinuityGuard), which
    // allowed face-feature leakage when two reference images (child + animal) were given.
    hasAnimalCharacters
      ? "Child-animal boundary: Keep the child fully human with human features. The animal companion is physically separate — never merge, overlay, or blend the animal's face, fur, or ears onto the child's body."
      : "",
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
      ? `Strict character list for this page: ${options.appearingCharacterIds.join(", ")}. Draw ONLY these characters. Do not add any other people or creatures.`
      : "Strict character list for this page: child_protagonist. Draw ONLY the protagonist. Do not add any other people or creatures.",
    GLOBAL_NEGATIVE_CHARACTER_PROMPT,
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

/**
 * P5-fix: Detect animal characters in cast to apply animal continuity guardrails.
 * Checks characterKind, role, and visualBible for animal keywords.
 */
export function hasAnimalCharactersInCast(cast: StoryCharacter[]): boolean {
  return cast.some(
    (c) =>
      c.characterId !== "child_protagonist" &&
      (c.characterKind === "animal" ||
        c.role === "animal" ||
        /\b(animal|creature|cat|dog|bear|rabbit|fox|bird|dragon|wolf|lion|tiger|elephant|giraffe|monkey|panda|penguin|sheep|horse|cow|pig|chicken|mouse|hamster|frog|turtle|whale|dolphin|shark|fish|insect|butterfly|bee|spider|monster)\b/i.test(c.characterId) ||
        /\b(animal|creature|cat|dog|bear|rabbit|fox|bird|dragon|wolf|lion|tiger|elephant|giraffe|monkey|panda|penguin|sheep|horse|cow|pig|chicken|mouse|hamster|frog|turtle|whale|dolphin|shark|fish|insect|butterfly|bee|spider|monster)\b/i.test(c.displayName) ||
        /\b(animal|creature|cat|dog|bear|rabbit|fox|bird|dragon|wolf|lion|tiger|elephant|giraffe|monkey|panda|penguin|sheep|horse|cow|pig|chicken|mouse|hamster|frog|turtle|whale|dolphin|shark|fish|insect|butterfly|bee|spider|monster)\b/i.test(c.visualBible ?? ""))
  );
}

export function buildStarCharacterGuard(): string {
  return [
    "Star character: The star character is one independent recurring creature with its own face, body, and expression — not a decoration, background star, or pattern.",
    "Do not transform any other character or favorite object, including a dinosaur, into the star character; each must remain visually separate.",
    "The star character keeps the same shape, color, and face across all pages.",
    "Do not create multiple different star characters.",
  ].join(" ");
}

export function buildVisualContinuityGuard({
  hasAnimalCharacters,
}: {
  hasAnimalCharacters: boolean;
}): string {
  const parts: string[] = [
    // A. Style consistency
    "Style consistency: Keep the same illustration style, color palette, line weight, lighting, character proportions and anatomy on every page — one consistent artist throughout. Do not shift style or character scale between pages.",
  ];
  if (hasAnimalCharacters) {
    // B. Animal character consistency + cast-count guard (compressed P5-3j)
    parts.push(
      "Animal character consistency: Each recurring animal keeps the same appearance, size, and expression across pages. Do not redesign, duplicate, or add extra animal companions beyond what the scene requires."
    );
    // C. Child-animal boundary: also placed early in buildImagePrompt for FLUX weighting.
    // Kept here as a reinforcing reminder at the end of the prompt.
    parts.push(
      "Child-animal boundary: The child remains a fully human child on every page — no animal features, costume, or body parts. Animals appear only as separate companions beside the child, never merged with the child's body."
    );
  }
  // D. Object grounding (compressed P5-3j)
  parts.push(
    "Object grounding: Draw only objects named in the scene. No unexplained glowing items, artifacts, or decorative additions unless the story names them."
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
- 3歳以上では、薄すぎるページを作らないでください。各ページに「場所」「行動」「気持ち」「発見」のうち少なくとも2つ以上を自然に含めてください。
- compositionHint を各ページに入れてください。
- narrativeDevice を含めてください。
- repeatedPhrase または visualMotif を入れてください。
- 5歳以上では setup / payoff を入れてください。
- imagePrompt は各ページで十分に具体的にしてください。

${issueLines ? `### Previous issues\n${issueLines}\n` : ""}`.trimEnd();
}

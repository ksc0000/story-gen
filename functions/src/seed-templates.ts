import { onCall } from "firebase-functions/v2/https";
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import type { CategoryGroupData, TemplateData, FixedStoryPageTemplate } from "./lib/types";

if (getApps().length === 0) initializeApp();
const db = getFirestore();

function buildAgeSpecificPage(params: {
  textTemplate: string;
  imagePromptTemplate: string;
  baby_toddler?: string;
  preschool_3_4?: string;
  early_reader_5_6?: string;
  early_elementary_7_8?: string;
  general_child?: string;
}): FixedStoryPageTemplate {
  const textTemplatesByAge = {
    baby_toddler: params.baby_toddler,
    preschool_3_4: params.preschool_3_4,
    early_reader_5_6: params.early_reader_5_6,
    early_elementary_7_8: params.early_elementary_7_8,
    general_child: params.general_child,
  };

  return {
    textTemplate: params.textTemplate,
    textTemplatesByAge: Object.values(textTemplatesByAge).some(Boolean)
      ? textTemplatesByAge
      : undefined,
    imagePromptTemplate: params.imagePromptTemplate,
  };
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
};

const templates: Record<string, TemplateData> = {
  animals: {
    name: "どうぶつのおはなし",
    description: "ふわふわ動物たちと友だちになるやさしい物語",
    icon: "🐾",
    genre: "Animal",
    sampleImageUrl: "/images/templates/animals.png",
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
    sampleImageUrl: "/images/templates/adventure.png",
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
    sampleImageUrl: "/images/templates/fantasy.png",
    sampleImages: {
      premium: "/images/templates/fantasy.png",
    },
    sampleImageAlt: "星空の魔法学校で魔法使いの子とドラゴンが見上げている絵本表紙",
    visualDirection:
      "Dreamy magical night fantasy with starry skies, crescent moon, glowing wand, floating books, friendly baby dragon, luminous castle windows, deep navy and gold palette, ornate but child-friendly details.",
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
    sampleImageUrl: "/images/templates/bedtime.png",
    sampleImages: {
      premium: "/images/templates/bedtime.png",
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
    sampleImageUrl: "/images/templates/emotional-growth.png",
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
    sampleImageUrl: "/images/templates/daily-habits.png",
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
    sampleImageUrl: "/images/templates/educational.png",
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
    sampleImageUrl: "/images/templates/food.png",
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
    sampleImageUrl: "/images/templates/seasonal.png",
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
    sampleImageUrl: "/images/templates/vehicles-robots.png",
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
    sampleImageUrl: "/images/templates/animals.png",
    sampleImageAlt: "家族と動物園を楽しむ子どものやさしい絵本イメージ",
    visualDirection:
      "Gentle family memory picture-book cover with warm daylight, friendly zoo atmosphere, soft smiles, and a keepsake-photo feeling.",
    order: 3,
    active: true,
    systemPrompt: "固定テンプレートを使って、家族の思い出をやさしく残す絵本です。",
    fixedStory: {
      titleTemplate: "{childName}とはじめてのどうぶつえん",
      pages: [
        buildAgeSpecificPage({
          textTemplate: "{childName}は、{familyMembers}といっしょに{place}へでかけました。",
          baby_toddler: "{childName}、{place}へ しゅっぱつ。わくわく。",
          preschool_3_4: "{childName}は、{familyMembers}といっしょに{place}へでかけました。どんな どうぶつに あえるかな。",
          early_reader_5_6:
            "{childName}は、{familyMembers}といっしょに{place}へでかけました。いりぐちの ちずを見ながら、つぎは どこへいこうかと うれしそうに そうぞうします。",
          early_elementary_7_8:
            "{childName}は、{familyMembers}といっしょに{place}へでかけました。いりぐちに あった きいろい ほしの しるしを見つけて、きょうの ぼうけんには ひみつがありそうだと 感じます。",
          general_child: "{childName}は、{familyMembers}といっしょに{place}へでかけました。どんな どうぶつに あえるかな。",
          imagePromptTemplate:
            "Establishing wide shot of a young child arriving at a friendly Japanese zoo with family, entrance path and map visible, a small yellow star motif near the sign, rich but not cluttered background details, child-safe picture book illustration, no text, no letters, no readable signs, no watermark",
        }),
        buildAgeSpecificPage({
          textTemplate: "大きなどうぶつ、小さなどうぶつ。{childName}の目はきらきらです。",
          baby_toddler: "ぞうさん。ことりさん。きらきら。",
          preschool_3_4:
            "大きなどうぶつ、小さなどうぶつ。{childName}の目はきらきらです。みみをすますと、たのしい こえが きこえます。",
          early_reader_5_6:
            "大きなどうぶつ、小さなどうぶつ。{childName}の目は きらきらです。とおくで ゆれる しっぽや、ちいさな あしあとまで 見つけて、つぎつぎに しらせてくれました。",
          early_elementary_7_8:
            "大きなどうぶつ、小さなどうぶつ。{childName}は、うごきかたや くらしかたの ちがいに きづいて 夢中になります。さっき見つけた きいろい ほしの しるしが、ここにも そっと かくれていました。",
          general_child:
            "大きなどうぶつ、小さなどうぶつ。{childName}の目はきらきらです。つぎは どこを見ようかと こころが はずみます。",
          imagePromptTemplate:
            "Medium action shot of a child safely watching friendly zoo animals, focus on curious eyes and nearby animal footprints, family members in the background, recurring yellow star motif hidden in the scene, rich but not cluttered environment details, child-safe picture book illustration, no text, no letters, no readable signs, no watermark",
        }),
        buildAgeSpecificPage({
          textTemplate: "いちばんうれしかったのは、{childName}がにっこり笑ったその瞬間でした。",
          baby_toddler: "{childName}、にこっ。うれしいね。",
          preschool_3_4:
            "いちばんうれしかったのは、{childName}がにっこり笑ったその瞬間でした。みんなの こころも ぽかぽかに なります。",
          early_reader_5_6:
            "いちばんうれしかったのは、{childName}が にっこり笑った そのしゅんかんでした。さっき ちょっぴり こわかった どうぶつにも、もう一ど あってみたいと 言えたのです。",
          early_elementary_7_8:
            "いちばんうれしかったのは、{childName}が にっこり笑った そのしゅんかんでした。はじめは どきどきしていたけれど、よく見てみると どうぶつたちにも それぞれの やさしい しぐさが あると 分かったのでした。",
          general_child:
            "いちばんうれしかったのは、{childName}がにっこり笑ったその瞬間でした。みんなの こころも ぽかぽかに なります。",
          imagePromptTemplate:
            "Close-up emotional moment of the child smiling after a meaningful zoo discovery, focus on face and small hands holding a zoo keepsake, warm family reactions in the background, recurring yellow star motif, rich but not cluttered picture book scene, no text, no letters, no readable signs, no watermark",
        }),
        buildAgeSpecificPage({
          textTemplate: "{parentMessage}",
          baby_toddler: "{parentMessage}",
          preschool_3_4: "{parentMessage}",
          early_reader_5_6: "{parentMessage}",
          early_elementary_7_8: "{parentMessage}",
          general_child: "{parentMessage}",
          imagePromptTemplate:
            "Warm ending back-view shot of the child and family leaving the zoo at golden hour, beautiful scenery, gentle path, recurring yellow star motif softly visible, rich but not cluttered, child-safe picture book finale, no text, no letters, no readable signs, no watermark",
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
    sampleImageUrl: "/images/templates/bedtime.png",
    sampleImageAlt: "寝る前に安心して眠る子どものやさしい絵本イメージ",
    visualDirection:
      "Cozy sleepy bedtime storybook mood with moonlight, soft blankets, tiny stars, quiet room, and reassuring end-of-day warmth.",
    order: 2,
    active: true,
    systemPrompt: "固定テンプレートを使って、寝る前に安心して眠れる短い絵本を作ります。",
    fixedStory: {
      titleTemplate: "きょうもいい日だったね、{childName}",
      pages: [
        buildAgeSpecificPage({
          textTemplate: "{childName}は、きょうもたのしいじかんをすごしました。",
          baby_toddler: "{childName}、きょうも たのしかったね。",
          preschool_3_4:
            "{childName}は、きょうもたのしいじかんをすごしました。おへやには やさしい よるが やってきます。",
          early_reader_5_6:
            "{childName}は、きょうもたのしいじかんを すごしました。おもちゃを みわたしながら、どんなことが いちばん うれしかったかなと そっと 思いだします。",
          early_elementary_7_8:
            "{childName}は、きょうもたのしいじかんを すごしました。ゆっくり くらくなる まどのそとを見ながら、きょうの できごとを ひとつずつ こころの本だなへ しまっていきます。",
          general_child:
            "{childName}は、きょうもたのしいじかんをすごしました。おへやには やさしい よるが やってきます。",
          imagePromptTemplate:
            "Establishing wide shot of a cozy child bedroom at the end of a happy day, toys and books softly visible, moonlight beginning outside the window, a small star motif tucked into the room, rich but not cluttered, child-safe picture book illustration, no text, no letters, no readable signs, no watermark",
        }),
        buildAgeSpecificPage({
          textTemplate: "うれしかったことを、ひとつずつこころにあつめます。",
          baby_toddler: "うれしいね。ぽかぽか。",
          preschool_3_4:
            "うれしかったことを、ひとつずつ こころに あつめます。にこにこした ことが、まだ きらきらしています。",
          early_reader_5_6:
            "うれしかったことを、ひとつずつ こころに あつめます。いちばん たのしかった しゅんかんを 思いだすと、むねのなかで ほしが ひとつ 光るようでした。",
          early_elementary_7_8:
            "うれしかったことを、ひとつずつ こころに あつめます。ちいさな できごとにも それぞれの いろがあり、いちばん だいじにしたい しゅんかんが はっきりしてきました。",
          general_child:
            "うれしかったことを、ひとつずつ こころに あつめます。にこにこした ことが、まだ きらきらしています。",
          imagePromptTemplate:
            "Medium shot of a child quietly remembering the day, warm lamp glow, small objects from the day visible in the room, focus on a star-shaped motif or keepsake, rich but not cluttered background, child-safe bedtime picture book scene, no text, no letters, no readable signs, no watermark",
        }),
        buildAgeSpecificPage({
          textTemplate: "おふとんに入ると、こころがふわっとやわらかくなりました。",
          baby_toddler: "おふとん ふわっ。おやすみ。",
          preschool_3_4:
            "おふとんに入ると、こころが ふわっと やわらかくなりました。もう だいじょうぶ、おやすみの じかんです。",
          early_reader_5_6:
            "おふとんに入ると、こころが ふわっと やわらかくなりました。きょうの ちいさな できたことが、あしたも がんばれる ひかりに かわっていきます。",
          early_elementary_7_8:
            "おふとんに入ると、こころが ふわっと やわらかくなりました。きょうの うれしさも ちょっぴりの くやしさも、あしたへ つながる だいじな きおくとして しずかに おさまっていきます。",
          general_child:
            "おふとんに入ると、こころが ふわっと やわらかくなりました。もう だいじょうぶ、おやすみの じかんです。",
          imagePromptTemplate:
            "Close-up of a child snuggling into bed, focus on small hands holding a favorite stuffed toy, moon and stars outside, recurring star motif, rich but not cluttered bedtime details, child-safe illustration, no text, no letters, no readable signs, no watermark",
        }),
        buildAgeSpecificPage({
          textTemplate: "{parentMessage}",
          baby_toddler: "{parentMessage}",
          preschool_3_4: "{parentMessage}",
          early_reader_5_6: "{parentMessage}",
          early_elementary_7_8: "{parentMessage}",
          general_child: "{parentMessage}",
          imagePromptTemplate:
            "Warm ending back-view or peaceful sleeping scene, gentle moonlight, calm room full of soft meaningful objects, recurring star motif near the window, rich but not cluttered, child-safe picture book finale, no text, no letters, no readable signs, no watermark",
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
    creationMode: "fixed_template",
    priceTier: "ume",
    storyCostLevel: "none",
    sampleImageUrl: "/images/templates/daily-habits.png",
    sampleImageAlt: "はみがきをがんばる子どものやさしい絵本イメージ",
    visualDirection:
      "Bright but calm daily-habit picture-book mood with clean bathroom setting, rounded shapes, friendly routine support, and reassuring smiles.",
    order: 7,
    active: true,
    systemPrompt: "固定テンプレートを使って、はみがきをやさしく応援する短い絵本を作ります。",
    fixedStory: {
      titleTemplate: "{childName}のはみがきできたよ",
      pages: [
        {
          textTemplate: "{childName}は、きょうもおくちをあーん。",
          textTemplatesByAge: {
            baby_toddler: "{childName}、あーん。",
            preschool_3_4: "{childName}は、きょうもおくちをあーん。",
            early_reader_5_6:
              "{childName}は、きょうもおくちをあーん。じぶんで はぶらしを もって、やってみるきもちになりました。",
            early_elementary_7_8:
              "{childName}は、きょうもおくちをあーん。きれいな はにするために、じぶんで はぶらしをにぎって はじめてみます。",
            general_child: "{childName}は、きょうもおくちをあーん。",
          },
          imagePromptTemplate:
            "Establishing wide shot of a preschool child getting ready to brush teeth in a bright safe bathroom, toothbrush and cup visible, recurring shining star motif, rich but not cluttered background details, child-safe picture book mood, no text, no letters, no readable signs, no watermark",
        },
        {
          textTemplate: "しゃかしゃか、こしこし。すこしずつ、おくちがきれいになります。",
          textTemplatesByAge: {
            baby_toddler: "しゃかしゃか。ぴかぴか。",
            preschool_3_4: "しゃかしゃか、こしこし。すこしずつ、おくちがきれいになります。",
            early_reader_5_6:
              "しゃかしゃか、こしこし。みがきにくい ところも、ゆっくり うごかすと すこしずつ きれいになります。",
            early_elementary_7_8:
              "しゃかしゃか、こしこし。おくばや はのうらも わすれないように、かがみを見ながら ていねいに みがいていきます。",
            general_child: "しゃかしゃか、こしこし。すこしずつ、おくちがきれいになります。",
          },
          imagePromptTemplate:
            "Medium action shot of a child brushing teeth carefully, soft foam, focus on hand movement and mirror reflection, recurring shining star motif, rich but not cluttered child-safe bathroom details, no text, no letters, no readable signs, no watermark",
        },
        {
          textTemplate: "おわったあと、{childName}はちょっぴりうれしそうでした。",
          textTemplatesByAge: {
            baby_toddler: "{childName}、にこっ。",
            preschool_3_4: "おわったあと、{childName}はちょっぴりうれしそうでした。",
            early_reader_5_6:
              "おわったあと、{childName}は にっこり。じぶんで できたことが うれしくて、むねが ぽっと あたたかくなりました。",
            early_elementary_7_8:
              "みがきおわると、{childName}は にっこりしました。すこし むずかしくても さいごまでできたことが、自信につながったのです。",
            general_child: "おわったあと、{childName}はちょっぴりうれしそうでした。",
          },
          imagePromptTemplate:
            "Close-up emotional moment of a child smiling with pride after brushing teeth, focus on expression and tiny toothbrush, warm daily routine success, recurring shining star motif, rich but not cluttered picture book illustration, no text, no letters, no readable signs, no watermark",
        },
        {
          textTemplate: "{parentMessage}",
          imagePromptTemplate:
            "Warm ending shot after brushing teeth, parent and child together in a calm bathroom doorway or bedtime hall, back view or side view, recurring shining star motif, child-safe rich but not cluttered picture book finale, no text, no letters, no readable signs, no watermark",
        },
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
    sampleImageUrl: "/images/templates/seasonal.png",
    sampleImageAlt: "家族でクリスマスを楽しむ子どものやさしい絵本イメージ",
    visualDirection:
      "Warm Christmas picture-book mood with soft lights, family warmth, festive decorations, child-safe wonder, and cozy winter colors.",
    order: 10,
    active: true,
    systemPrompt: "固定テンプレートを使って、はじめてのクリスマスをやさしく残す絵本を作ります。",
    fixedStory: {
      titleTemplate: "{childName}のはじめてのクリスマス",
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
          imagePromptTemplate:
            "Establishing wide shot of a preschool child celebrating Christmas with family in a cozy home, warm lights, tree, small golden bell motif, rich but not cluttered child-safe festive picture book scene, no text, no letters, no readable signs, no watermark",
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
          imagePromptTemplate:
            "Medium shot of a gentle Christmas room full of soft lights and festive warmth, focus on decorations and family objects, small golden bell motif hidden in the background, rich but not cluttered, safe magical picture book atmosphere, no text, no letters, no readable signs, no watermark",
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
          imagePromptTemplate:
            "Close-up emotional moment of a happy child smiling during Christmas celebration, focus on expression and hands near a small gift or ornament, family sharing warm joy, golden bell motif, rich but not cluttered tender picture book composition, no text, no letters, no readable signs, no watermark",
        },
        {
          textTemplate: "{parentMessage}",
          imagePromptTemplate:
            "Warm ending back-view or scenic Christmas night shot with family warmth, soft winter glow, golden bell motif, memorable gentle picture book finale, rich but not cluttered, no text, no letters, no readable signs, no watermark",
        },
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
    sampleImageUrl: "/images/templates/fantasy.png",
    sampleImageAlt: "自由なアイデアから広がるオリジナル絵本イメージ",
    visualDirection:
      "Flexible premium storybook mood that can adapt to many scenes while staying warm, child-friendly, expressive, and visually cohesive.",
    order: 20,
    active: true,
    systemPrompt: `あなたは子ども向け絵本の作家です。親の自由入力を中心に、主人公の個性と家族の思いを生かしたオリジナル絵本を作ってください。
- 内容は自由でも、幼児が安心して読めるやさしい構成にしてください。
- 主人公の好きなもの、思い出、教えたいことを必要に応じて自然に織り込んでください。`,
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
  for (const [id, data] of Object.entries(templates)) {
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
  console.log(`Seeded ${Object.keys(templates).length} templates.`);
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

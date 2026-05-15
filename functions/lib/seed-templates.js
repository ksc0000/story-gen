"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedTemplates = exports.SEED_TEMPLATES = void 0;
const https_1 = require("firebase-functions/v2/https");
const app_1 = require("firebase-admin/app");
const firestore_1 = require("firebase-admin/firestore");
if ((0, app_1.getApps)().length === 0)
    (0, app_1.initializeApp)();
const db = (0, firestore_1.getFirestore)();
const FIXED_IMAGE_PROMPT_STANDARD_SUFFIX = "no readable writing anywhere, no signage, no storefront signs, no text-like marks";
const FIXED_IMAGE_PROMPT_REF_ISOLATION_SUFFIX = "use reference image for child's face and identity only, ignore reference image background and setting";
function withFixedImagePromptSafety(prompt) {
    let result = prompt;
    if (!result.includes(FIXED_IMAGE_PROMPT_STANDARD_SUFFIX)) {
        result = `${result}, ${FIXED_IMAGE_PROMPT_STANDARD_SUFFIX}`;
    }
    if (!result.includes(FIXED_IMAGE_PROMPT_REF_ISOLATION_SUFFIX)) {
        result = `${result}, ${FIXED_IMAGE_PROMPT_REF_ISOLATION_SUFFIX}`;
    }
    return result;
}
function buildAgeSpecificPage(params) {
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
        imagePromptTemplate: withFixedImagePromptSafety(params.imagePromptTemplate),
        pageVisualRole: params.pageVisualRole,
    };
}
const categoryGroups = {
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
exports.SEED_TEMPLATES = {
    animals: {
        name: "どうぶつのおはなし",
        description: "ふわふわ動物たちと友だちになるやさしい物語",
        icon: "🐾",
        genre: "Animal",
        sampleImageUrl: "/images/templates/animals.png",
        sampleImageAlt: "森の中でくま、うさぎ、きつね、小鳥が笑っている絵本表紙",
        visualDirection: "Soft woodland picture-book mood with fluffy friendly animals, warm sunlight, leafy greens, cream background, rounded character shapes, gentle smiling faces, and a cozy approachable cover-like composition.",
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
        visualDirection: "Bright adventurous picture-book mood with wide landscapes, sparkling compass motifs, blue sky, green hills, winding paths, dynamic running poses, clear sense of movement, discovery, and safe excitement.",
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
        visualDirection: "Dreamy magical night fantasy with starry skies, crescent moon, glowing wand, floating books, friendly baby dragon, luminous castle windows, deep navy and gold palette, ornate but child-friendly details.",
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
        visualDirection: "Calm bedtime picture-book atmosphere with deep blue night, smiling moon, tiny warm stars, soft lamp light, cozy bedroom textiles, slow peaceful composition, muted colors, and sleepy gentle expressions.",
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
        visualDirection: "Warm emotional-growth picture-book tone with golden sunlight, expressive child faces, gentle hand-holding, small glowing seed or heart motif, garden path, soft flowers, and an encouraging tender mood.",
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
        visualDirection: "Cheerful practical daily-habit picture-book style with clean bathroom or home scenes, bright primary colors, cute anthropomorphic tools, step-by-step visual clarity, rounded shapes, and a reassuring parent-child learning mood.",
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
        visualDirection: "Colorful educational picture-book mood with numbers, simple shapes, hiragana-like learning motifs, rainbow accents, blocks, cheerful animal helpers, diagram-like clarity, and playful classroom-adventure composition.",
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
        visualDirection: "Warm delicious food picture-book mood with cozy bakery or kitchen lighting, round cute smiling foods, golden browns, soft steam, gingham cloth, appetizing textures, and a pop yet gentle composition.",
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
        visualDirection: "Festive seasonal picture-book style with clearly readable spring, summer, autumn, and winter scenes, sakura, beach, autumn leaves, snow, holiday decorations, bright joyful children, and watercolor-like seasonal color blocks.",
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
        visualDirection: "Pop and exciting vehicles-and-robots picture-book mood with blue sky, friendly robot bus or trains, clean futuristic city, rounded mechanical shapes, white clouds, orange and blue accents, smiling children, and energetic safe motion.",
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
        visualDirection: "Gentle family memory picture-book cover with warm daylight, friendly zoo atmosphere, soft smiles, and a keepsake-photo feeling.",
        order: 3,
        active: true,
        systemPrompt: "固定テンプレートを使って、家族の思い出をやさしく残す絵本です。",
        fixedStory: {
            titleTemplate: "{childName}とはじめてのどうぶつえん",
            coverImagePromptTemplate: withFixedImagePromptSafety("Picture book cover illustration: a young child standing beside a decorative zoo entrance arch without readable text, with family nearby, gentle daylight, warm welcoming atmosphere, soft watercolor style, recurring small yellow star motif tucked into the scene, child-safe and inviting composition, rich but not cluttered details, no text, no letters, no Japanese characters, no readable signs, no logo, no watermark"),
            titleSpreadTextTemplate: "{childName}と はじめての どうぶつえん",
            openingNarrationTemplate: "きょうは とくべつな日。{childName}は {familyMembers}と いっしょに、はじめての どうぶつえんへ でかけます。",
            pages: [
                buildAgeSpecificPage({
                    textTemplate: "{childName}は、{familyMembers}といっしょに{place}へでかけました。",
                    baby_toddler: "{childName}、{place}へ しゅっぱつ。わくわく。",
                    preschool_3_4: "{childName}は、{familyMembers}といっしょに{place}へでかけました。どんな どうぶつに あえるかな。",
                    early_reader_5_6: "{childName}は、{familyMembers}といっしょに{place}へでかけました。いりぐちの ちずを見ながら、つぎは どこへいこうかと うれしそうに そうぞうします。",
                    early_elementary_7_8: "{childName}は、{familyMembers}といっしょに{place}へでかけました。いりぐちに あった きいろい ほしの しるしを見つけて、きょうの ぼうけんには ひみつがありそうだと 感じます。",
                    general_child: "{childName}は、{familyMembers}といっしょに{place}へでかけました。どんな どうぶつに あえるかな。",
                    pageVisualRole: "opening_establishing",
                    imagePromptTemplate: "Setting: zoo entrance grounds with decorative arch and tree-lined paths — NOT a sandbox, NOT an outdoor playground, NOT a park. Establishing wide shot of a young child arriving at a friendly zoo with family. The child stands near a tree-lined path just inside the entrance, looking up with excitement. Family members walk beside the child. A decorative entrance arch without readable text frames the top. A small yellow star motif is tucked into the arch. Gentle morning daylight with warm golden tones. Lush green trees and a winding path leading inward. Soft watercolor picture book style, rounded child-safe shapes, rich but not cluttered background details. No readable writing anywhere, no signage, no storefront signs, no text-like marks, no text, no letters, no Japanese characters, no readable signs, no logo, no watermark.",
                }),
                buildAgeSpecificPage({
                    textTemplate: "大きなどうぶつ、小さなどうぶつ。{childName}の目はきらきらです。",
                    baby_toddler: "ぞうさん。ことりさん。きらきら。",
                    preschool_3_4: "大きなどうぶつ、小さなどうぶつ。{childName}の目はきらきらです。みみをすますと、たのしい こえが きこえます。",
                    early_reader_5_6: "大きなどうぶつ、小さなどうぶつ。{childName}の目は きらきらです。とおくで ゆれる しっぽや、ちいさな あしあとまで 見つけて、つぎつぎに しらせてくれました。",
                    early_elementary_7_8: "大きなどうぶつ、小さなどうぶつ。{childName}は、うごきかたや くらしかたの ちがいに きづいて 夢中になります。さっき見つけた きいろい ほしの しるしが、ここにも そっと かくれていました。",
                    general_child: "大きなどうぶつ、小さなどうぶつ。{childName}の目はきらきらです。つぎは どこを見ようかと こころが はずみます。",
                    pageVisualRole: "discovery",
                    imagePromptTemplate: "Setting: zoo animal enclosure with fence and grass — NOT a sandbox, NOT a children's playground, NOT an outdoor play area. Medium shot of a child at a zoo animal enclosure, leaning forward with wide curious eyes. A friendly elephant or giraffe stands in the mid-ground, while small birds or butterflies add life to the foreground. The child points with one hand, the other holding a parent's hand. Family members stand behind the child, smiling. A small yellow star motif is hidden on a fence post. Warm daylight filtering through leaves. Soft watercolor picture book style, clear foreground-midground-background layering, rich but not cluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark.",
                }),
                buildAgeSpecificPage({
                    textTemplate: "いちばんうれしかったのは、{childName}がにっこり笑ったその瞬間でした。",
                    baby_toddler: "{childName}、にこっ。うれしいね。",
                    preschool_3_4: "いちばんうれしかったのは、{childName}がにっこり笑ったその瞬間でした。みんなの こころも ぽかぽかに なります。",
                    early_reader_5_6: "いちばんうれしかったのは、{childName}が にっこり笑った そのしゅんかんでした。さっき ちょっぴり こわかった どうぶつにも、もう一ど あってみたいと 言えたのです。",
                    early_elementary_7_8: "いちばんうれしかったのは、{childName}が にっこり笑った そのしゅんかんでした。はじめは どきどきしていたけれど、よく見てみると どうぶつたちにも それぞれの やさしい しぐさが あると 分かったのでした。",
                    general_child: "いちばんうれしかったのは、{childName}がにっこり笑ったその瞬間でした。みんなの こころも ぽかぽかに なります。",
                    pageVisualRole: "emotional_closeup",
                    imagePromptTemplate: "Setting: zoo grounds, close-up emotional moment — NOT a sandbox or outdoor playground. Close-up of the child's face beaming with a big joyful smile after a special zoo moment. The child holds a small zoo souvenir or leaf in both hands near their chest. Soft-focus background shows a friendly animal and family members reacting warmly. A small yellow star motif appears on the souvenir or nearby. Warm afternoon light with golden highlights on the child's cheeks. Soft watercolor picture book style, emotional warmth, intimate framing, rich but not cluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark.",
                }),
                buildAgeSpecificPage({
                    textTemplate: "{parentMessage}",
                    baby_toddler: "{parentMessage}",
                    preschool_3_4: "{parentMessage}",
                    early_reader_5_6: "{parentMessage}",
                    early_elementary_7_8: "{parentMessage}",
                    general_child: "{parentMessage}",
                    pageVisualRole: "quiet_ending",
                    imagePromptTemplate: "Setting: zoo exit path lined with trees at golden hour — NOT a sandbox or outdoor playground. Back-view wide shot of the child and family walking away from the zoo toward a golden-hour sunset. A gentle tree-lined path stretches ahead. The child holds a parent's hand, looking slightly back with a content smile. A small yellow star motif glows softly in the evening sky or on a nearby lantern. Warm amber and soft pink sunset tones. Soft watercolor picture book style, peaceful farewell composition, rich but not cluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark.",
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
        creationMode: "fixed_template",
        priceTier: "ume",
        storyCostLevel: "none",
        sampleImageUrl: "/images/templates/seasonal.png",
        sampleImageAlt: "家族で誕生日をお祝いする子どものやさしい絵本イメージ",
        visualDirection: "Warm birthday memory picture-book mood with soft candlelight, family smiles, pastel balloons, and a keepsake-photo feeling.",
        order: 4,
        active: true,
        systemPrompt: "固定テンプレートを使って、はじめての誕生日の思い出をやさしく残す絵本を作ります。",
        fixedStory: {
            titleTemplate: "{childName}のはじめてのたんじょうび",
            coverImagePromptTemplate: withFixedImagePromptSafety("Picture book cover illustration: a young child in front of a small birthday cake with family gathered close, warm indoor lights, soft pastel balloons, recurring tiny ribbon motif, joyful and tender keepsake mood, soft watercolor style, child-safe rounded composition, rich but not cluttered details, no text, no letters, no Japanese characters, no readable signs, no logo, no watermark"),
            titleSpreadTextTemplate: "{childName}の はじめての たんじょうび",
            openingNarrationTemplate: "きょうは とくべつな おいわいの日。{childName}と {familyMembers}の たんじょうびの思い出が はじまります。",
            pages: [
                buildAgeSpecificPage({
                    textTemplate: "{childName}は、{familyMembers}といっしょにおたんじょうびのじゅんびをはじめました。",
                    baby_toddler: "{childName}、おたんじょうび。わくわく。",
                    preschool_3_4: "{childName}は、{familyMembers}といっしょにおたんじょうびのじゅんびをはじめました。おへやが すこしずつ きらきらしてきます。",
                    early_reader_5_6: "{childName}は、{familyMembers}といっしょに おたんじょうびの じゅんびを はじめました。ふうせんや かざりを 見ながら、どんな いちにちになるのか 胸が どきどきします。",
                    early_elementary_7_8: "{childName}は、{familyMembers}といっしょに おたんじょうびの じゅんびを はじめました。いつもの へやが すこしずつ 特別な ばしょに 変わっていくのを見て、心が あたたかくなります。",
                    general_child: "{childName}は、{familyMembers}といっしょにおたんじょうびのじゅんびをはじめました。おへやが すこしずつ きらきらしてきます。",
                    pageVisualRole: "opening_establishing",
                    imagePromptTemplate: withFixedImagePromptSafety("Establishing wide shot of a cozy home living room before a birthday celebration. A young child stands near a low table while family members decorate with pastel balloons and paper garlands. Soft warm light fills the room. A tiny ribbon motif appears on one balloon knot. Picture-book watercolor style, layered foreground-midground-background, rich but not cluttered details. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark."),
                }),
                buildAgeSpecificPage({
                    textTemplate: "ろうそくのひかりがゆれて、{childName}の目もきらきらひかりました。",
                    baby_toddler: "ろうそく きらきら。{childName}、にこっ。",
                    preschool_3_4: "ろうそくのひかりがゆれて、{childName}の目も きらきらひかりました。みんなの えがおが まあるく あつまります。",
                    early_reader_5_6: "ろうそくの ひかりが ゆれて、{childName}の目も きらきら ひかりました。ふーっと 息を すう前に、しあわせな きもちを ぎゅっと あつめます。",
                    early_elementary_7_8: "ろうそくの ひかりが ゆれて、{childName}の目も きらきら ひかりました。みんなの まなざしが ひとつに 重なる その時間が、忘れたくない 記憶になります。",
                    general_child: "ろうそくのひかりがゆれて、{childName}の目もきらきらひかりました。みんなの えがおが まあるく あつまります。",
                    pageVisualRole: "discovery",
                    imagePromptTemplate: withFixedImagePromptSafety("Medium shot of a child leaning toward a small birthday cake with softly glowing candles. Family members gather behind and beside the child, smiling with gentle anticipation. Warm candlelight highlights the child's eyes and cheeks. A tiny ribbon motif is tucked on a plate edge or cake stand. Soft watercolor picture book style, emotional family celebration framing, rich but not cluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark."),
                }),
                buildAgeSpecificPage({
                    textTemplate: "おいわいのうたのあと、{childName}はとびきりのえがおを見せてくれました。",
                    baby_toddler: "{childName}、にこにこ。うれしいね。",
                    preschool_3_4: "おいわいのうたのあと、{childName}は とびきりの えがおを見せてくれました。みんなの こころも ぽかぽかです。",
                    early_reader_5_6: "おいわいのうたのあと、{childName}は とびきりの えがおを 見せてくれました。たくさんの「おめでとう」が、心のなかで ひかる ほしみたいに のこります。",
                    early_elementary_7_8: "おいわいのうたのあと、{childName}は とびきりの えがおを 見せてくれました。みんなに だいじに 思われていることが、ことばよりも まっすぐに 伝わる しゅんかんでした。",
                    general_child: "おいわいのうたのあと、{childName}はとびきりのえがおを見せてくれました。みんなの こころも ぽかぽかです。",
                    pageVisualRole: "emotional_closeup",
                    imagePromptTemplate: withFixedImagePromptSafety("Close-up of the child's delighted face after the birthday song, cheeks glowing and eyes bright. The child holds a small spoon or keepsake near the chest while family members lean in with warm smiles in soft focus. A tiny ribbon motif appears on nearby party decor. Golden warm light and gentle pastel accents. Soft watercolor picture book style, intimate emotional framing, rich but not cluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark."),
                }),
                buildAgeSpecificPage({
                    textTemplate: "{parentMessage}",
                    baby_toddler: "{parentMessage}",
                    preschool_3_4: "{parentMessage}",
                    early_reader_5_6: "{parentMessage}",
                    early_elementary_7_8: "{parentMessage}",
                    general_child: "{parentMessage}",
                    pageVisualRole: "quiet_ending",
                    imagePromptTemplate: withFixedImagePromptSafety("Back-view quiet ending shot of child and family sitting together at the end of the birthday evening, looking at a few softly glowing decorations in a calm room. The child leans gently on a family member's shoulder. A tiny ribbon motif catches the last warm light near the table. Soft watercolor picture book style, peaceful after-celebration mood, rich but not cluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark."),
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
        visualDirection: "Cozy sleepy bedtime storybook mood with moonlight, soft blankets, tiny stars, quiet room, and reassuring end-of-day warmth.",
        order: 2,
        active: true,
        systemPrompt: "固定テンプレートを使って、寝る前に安心して眠れる短い絵本を作ります。",
        fixedStory: {
            titleTemplate: "きょうもいい日だったね、{childName}",
            coverImagePromptTemplate: withFixedImagePromptSafety("Picture book cover illustration: a young child in cozy pajamas in a warm bedroom at dusk, soft moonlight through the window, favorite stuffed toy nearby, recurring small star motif, peaceful sleepy mood, soft watercolor style, child-safe gentle composition, rich but not cluttered details, no text, no letters, no Japanese characters, no readable signs, no logo, no watermark"),
            titleSpreadTextTemplate: "きょうも いい日だったね、{childName}",
            openingNarrationTemplate: "よるが やさしく やってきました。{childName}の きょう一日を、ゆっくり ふりかえってみましょう。",
            pages: [
                buildAgeSpecificPage({
                    textTemplate: "{childName}は、きょうもたのしいじかんをすごしました。",
                    baby_toddler: "{childName}、きょうも たのしかったね。",
                    preschool_3_4: "{childName}は、きょうもたのしいじかんをすごしました。おへやには やさしい よるが やってきます。",
                    early_reader_5_6: "{childName}は、きょうもたのしいじかんを すごしました。おもちゃを みわたしながら、どんなことが いちばん うれしかったかなと そっと 思いだします。",
                    early_elementary_7_8: "{childName}は、きょうもたのしいじかんを すごしました。ゆっくり くらくなる まどのそとを見ながら、きょうの できごとを ひとつずつ こころの本だなへ しまっていきます。",
                    general_child: "{childName}は、きょうもたのしいじかんをすごしました。おへやには やさしい よるが やってきます。",
                    pageVisualRole: "opening_establishing",
                    imagePromptTemplate: "Establishing wide shot of a cozy child bedroom at early evening. The child sits on the floor surrounded by toys and picture books, looking toward a window where dusk light streams in. A warm bedside lamp glows in the corner. Curtains frame the window with a deep blue-purple sky outside. A small star motif is tucked into the lampshade or blanket. Soft watercolor picture book style, warm amber and lavender tones, child-safe rounded shapes, rich but not cluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark.",
                }),
                buildAgeSpecificPage({
                    textTemplate: "うれしかったことを、ひとつずつこころにあつめます。",
                    baby_toddler: "うれしいね。ぽかぽか。",
                    preschool_3_4: "うれしかったことを、ひとつずつ こころに あつめます。にこにこした ことが、まだ きらきらしています。",
                    early_reader_5_6: "うれしかったことを、ひとつずつ こころに あつめます。いちばん たのしかった しゅんかんを 思いだすと、むねのなかで ほしが ひとつ 光るようでした。",
                    early_elementary_7_8: "うれしかったことを、ひとつずつ こころに あつめます。ちいさな できごとにも それぞれの いろがあり、いちばん だいじにしたい しゅんかんが はっきりしてきました。",
                    general_child: "うれしかったことを、ひとつずつ こころに あつめます。にこにこした ことが、まだ きらきらしています。",
                    pageVisualRole: "discovery",
                    imagePromptTemplate: "Medium shot of a child sitting cross-legged on a soft rug, holding a small keepsake from the day (a leaf, a drawing, or a toy). The child looks down at it with a gentle, reflective smile. A warm lamp casts a soft orange glow. Small meaningful objects from the day are scattered nearby. A glowing star motif appears on a cushion or picture frame. Soft watercolor picture book style, warm introspective mood, rich but not cluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark.",
                }),
                buildAgeSpecificPage({
                    textTemplate: "おふとんに入ると、こころがふわっとやわらかくなりました。",
                    baby_toddler: "おふとん ふわっ。おやすみ。",
                    preschool_3_4: "おふとんに入ると、こころが ふわっと やわらかくなりました。もう だいじょうぶ、おやすみの じかんです。",
                    early_reader_5_6: "おふとんに入ると、こころが ふわっと やわらかくなりました。きょうの ちいさな できたことが、あしたも がんばれる ひかりに かわっていきます。",
                    early_elementary_7_8: "おふとんに入ると、こころが ふわっと やわらかくなりました。きょうの うれしさも ちょっぴりの くやしさも、あしたへ つながる だいじな きおくとして しずかに おさまっていきます。",
                    general_child: "おふとんに入ると、こころが ふわっと やわらかくなりました。もう だいじょうぶ、おやすみの じかんです。",
                    pageVisualRole: "emotional_closeup",
                    imagePromptTemplate: "Close-up of a child snuggling into a fluffy blanket, hugging a favorite stuffed animal with both hands. Eyes half-closed with a peaceful, content expression. A pillow and soft sheets surround the child. Moonlight and stars are visible through a nearby window. A small star motif appears on the stuffed animal or pillowcase. Soft watercolor picture book style, intimate peaceful framing, warm ivory and soft blue tones, rich but not cluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark.",
                }),
                buildAgeSpecificPage({
                    textTemplate: "{parentMessage}",
                    baby_toddler: "{parentMessage}",
                    preschool_3_4: "{parentMessage}",
                    early_reader_5_6: "{parentMessage}",
                    early_elementary_7_8: "{parentMessage}",
                    general_child: "{parentMessage}",
                    pageVisualRole: "quiet_ending",
                    imagePromptTemplate: "Wide peaceful shot of the child asleep in bed, viewed from slightly above. The room is bathed in soft moonlight. A favorite stuffed toy rests beside the child. Stars twinkle outside the window. A small star motif glows gently near the windowsill or on the blanket edge. Calm, serene nighttime atmosphere. Soft watercolor picture book style, quiet lullaby composition, rich but not cluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark.",
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
        visualDirection: "Bright but calm daily-habit picture-book mood with clean bathroom setting, rounded shapes, friendly routine support, and reassuring smiles.",
        order: 7,
        active: true,
        systemPrompt: "固定テンプレートを使って、はみがきをやさしく応援する短い絵本を作ります。",
        fixedStory: {
            titleTemplate: "{childName}のはみがきできたよ",
            coverImagePromptTemplate: withFixedImagePromptSafety("Picture book cover illustration: a cheerful preschool child holding a toothbrush in a bright clean bathroom, fresh morning or evening light, friendly mirror reflection, recurring shining star motif, encouraging cheerful mood, soft watercolor style, child-safe rounded composition, rich but not cluttered details, no text, no letters, no Japanese characters, no readable signs, no logo, no watermark"),
            titleSpreadTextTemplate: "{childName}の はみがき できたよ",
            openingNarrationTemplate: "きょうも はみがきの じかんが やってきました。{childName}は どんなふうに がんばるかな。",
            pages: [
                {
                    textTemplate: "{childName}は、きょうもおくちをあーん。",
                    textTemplatesByAge: {
                        baby_toddler: "{childName}、あーん。",
                        preschool_3_4: "{childName}は、きょうもおくちをあーん。",
                        early_reader_5_6: "{childName}は、きょうもおくちをあーん。じぶんで はぶらしを もって、やってみるきもちになりました。",
                        early_elementary_7_8: "{childName}は、きょうもおくちをあーん。きれいな はにするために、じぶんで はぶらしをにぎって はじめてみます。",
                        general_child: "{childName}は、きょうもおくちをあーん。",
                    },
                    pageVisualRole: "opening_establishing",
                    imagePromptTemplate: withFixedImagePromptSafety("Establishing wide shot of a preschool child standing on a small step stool in a bright, clean bathroom. The child reaches for a colorful toothbrush in a cup on the sink counter. A friendly mirror reflects the child's eager face. Toothpaste, a rinse cup, and a hand towel are neatly arranged. A small shining star motif is tucked on the cup or mirror corner. Bright morning or evening light from a window. Soft watercolor picture book style, rounded child-safe shapes, rich but not cluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark."),
                },
                {
                    textTemplate: "しゃかしゃか、こしこし。すこしずつ、おくちがきれいになります。",
                    textTemplatesByAge: {
                        baby_toddler: "しゃかしゃか。ぴかぴか。",
                        preschool_3_4: "しゃかしゃか、こしこし。すこしずつ、おくちがきれいになります。",
                        early_reader_5_6: "しゃかしゃか、こしこし。みがきにくい ところも、ゆっくり うごかすと すこしずつ きれいになります。",
                        early_elementary_7_8: "しゃかしゃか、こしこし。おくばや はのうらも わすれないように、かがみを見ながら ていねいに みがいていきます。",
                        general_child: "しゃかしゃか、こしこし。すこしずつ、おくちがきれいになります。",
                    },
                    pageVisualRole: "action",
                    imagePromptTemplate: withFixedImagePromptSafety("Medium action shot of a child actively brushing teeth with concentration. The child holds the toothbrush with both small hands, mouth slightly open with gentle foam. A friendly mirror shows the child's focused expression from a slightly different angle. Soft bubbles float near the sink. A small shining star motif appears on the toothbrush handle or a nearby tile. Clean, bright bathroom setting with rounded edges. Soft watercolor picture book style, dynamic but gentle composition, rich but not cluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark."),
                },
                {
                    textTemplate: "おわったあと、{childName}はちょっぴりうれしそうでした。",
                    textTemplatesByAge: {
                        baby_toddler: "{childName}、にこっ。",
                        preschool_3_4: "おわったあと、{childName}はちょっぴりうれしそうでした。",
                        early_reader_5_6: "おわったあと、{childName}は にっこり。じぶんで できたことが うれしくて、むねが ぽっと あたたかくなりました。",
                        early_elementary_7_8: "みがきおわると、{childName}は にっこりしました。すこし むずかしくても さいごまでできたことが、自信につながったのです。",
                        general_child: "おわったあと、{childName}はちょっぴりうれしそうでした。",
                    },
                    pageVisualRole: "payoff",
                    imagePromptTemplate: withFixedImagePromptSafety("Close-up of a child's proud, beaming smile after finishing brushing teeth. The child holds up the toothbrush triumphantly with one hand, the other hand on their hip. Sparkling clean teeth visible in a wide grin. The mirror behind reflects the happy moment. A small shining star motif glows near the child or on the mirror. Warm encouraging light. Soft watercolor picture book style, celebratory intimate framing, rich but not cluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark."),
                },
                {
                    textTemplate: "{parentMessage}",
                    pageVisualRole: "quiet_ending",
                    imagePromptTemplate: withFixedImagePromptSafety("Wide warm shot of a parent and child together at the bathroom doorway, seen from behind or side view. The child holds the parent's hand, looking up with a satisfied smile. The bathroom is tidy behind them, with the toothbrush cup neatly placed. A hallway or bedroom beckons warmly ahead. A small shining star motif is visible on a doorframe or nightlight. Soft evening glow. Soft watercolor picture book style, peaceful transition composition, rich but not cluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark."),
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
        visualDirection: "Warm Christmas picture-book mood with soft lights, family warmth, festive decorations, child-safe wonder, and cozy winter colors.",
        order: 10,
        active: true,
        systemPrompt: "固定テンプレートを使って、はじめてのクリスマスをやさしく残す絵本を作ります。",
        fixedStory: {
            titleTemplate: "{childName}のはじめてのクリスマス",
            coverImagePromptTemplate: withFixedImagePromptSafety("Picture book cover illustration: a young child celebrating Christmas with family in a cozy living room, soft warm fairy lights, decorated Christmas tree, gentle winter glow, recurring small golden bell motif, festive but calm storybook mood, soft watercolor style, child-safe tender composition, rich but not cluttered details, no text, no letters, no Japanese characters, no readable signs, no logo, no watermark"),
            titleSpreadTextTemplate: "{childName}の はじめての クリスマス",
            openingNarrationTemplate: "きらきらの ひかりに つつまれた よる。{childName}と {familyMembers}の とくべつな クリスマスが はじまります。",
            pages: [
                {
                    textTemplate: "{childName}は、{familyMembers}といっしょに、きらきらのクリスマスをむかえました。",
                    textTemplatesByAge: {
                        baby_toddler: "{childName}、きらきら クリスマス。",
                        preschool_3_4: "{childName}は、{familyMembers}といっしょに、きらきらのクリスマスをむかえました。",
                        early_reader_5_6: "{childName}は、{familyMembers}といっしょに クリスマスをむかえました。おへやの ひかりが きらきらして、こころまで あたたかくなります。",
                        early_elementary_7_8: "{childName}は、{familyMembers}といっしょに クリスマスをむかえました。やわらかな ひかりに つつまれたへやで、いつもより とくべつな夜が はじまります。",
                        general_child: "{childName}は、{familyMembers}といっしょに、きらきらのクリスマスをむかえました。",
                    },
                    pageVisualRole: "opening_establishing",
                    imagePromptTemplate: withFixedImagePromptSafety("Establishing wide shot of a cozy living room decorated for Christmas. A young child stands near a sparkling Christmas tree, reaching up toward a low ornament with wide amazed eyes. Family members sit nearby on a sofa, smiling warmly. Soft fairy lights drape across the tree and mantle. Wrapped presents rest under the tree. A small golden bell motif hangs on a low branch. Warm candlelight and gentle winter evening tones. Soft watercolor picture book style, festive but calm atmosphere, rich but not cluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark."),
                },
                {
                    textTemplate: "おへやには、やさしいひかりと、うれしいきもちがいっぱいです。",
                    textTemplatesByAge: {
                        baby_toddler: "ぴかぴか。うれしいね。",
                        preschool_3_4: "おへやには、やさしいひかりと、うれしいきもちがいっぱいです。",
                        early_reader_5_6: "おへやには やさしいひかりが ゆれていて、みんなの えがおも なんだか いつもより まぶしく見えました。",
                        early_elementary_7_8: "おへやには やさしいひかりが ひろがり、みんなの たのしい声が そっと かさなります。クリスマスの あたたかさが へやじゅうに ひろがっていました。",
                        general_child: "おへやには、やさしいひかりと、うれしいきもちがいっぱいです。",
                    },
                    pageVisualRole: "discovery",
                    imagePromptTemplate: withFixedImagePromptSafety("Medium shot of a festive Christmas room glowing with soft light. Focus on the child kneeling near the tree, carefully examining a shiny ornament or a small wrapped gift. Stockings hang from a mantle. Candles flicker on a side table. Family members are visible in soft focus behind the child. A small golden bell motif is hidden among the ornaments. Warm amber and red holiday tones. Soft watercolor picture book style, wonder-filled composition, rich but not cluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark."),
                },
                {
                    textTemplate: "{childName}のにこにこえがおを見て、みんなもにっこりしました。",
                    textTemplatesByAge: {
                        baby_toddler: "{childName}、にこにこ。",
                        preschool_3_4: "{childName}のにこにこえがおを見て、みんなもにっこりしました。",
                        early_reader_5_6: "{childName}の にこにこえがおを 見て、みんなも にっこり。うれしいきもちが、ひとつの テーブルに ふわっと あつまりました。",
                        early_elementary_7_8: "{childName}の うれしそうな えがおを見て、みんなも にっこりしました。たのしい気持ちは、そばにいる人へ ひろがっていくのだと分かるような時間でした。",
                        general_child: "{childName}のにこにこえがおを見て、みんなもにっこりしました。",
                    },
                    pageVisualRole: "emotional_closeup",
                    imagePromptTemplate: withFixedImagePromptSafety("Close-up of the child's delighted face during Christmas celebration. The child holds a small gift or ornament with both hands near their chest, eyes sparkling with joy. Family members lean in close, sharing the moment with warm smiles. Soft fairy light bokeh in the background. A small golden bell motif is visible on the gift ribbon or nearby. Warm golden and soft white tones. Soft watercolor picture book style, intimate emotional framing, rich but not cluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark."),
                },
                {
                    textTemplate: "{parentMessage}",
                    pageVisualRole: "quiet_ending",
                    imagePromptTemplate: withFixedImagePromptSafety("Wide scenic shot of a family by a frosty window on Christmas night, viewed from behind. The child sits on a parent's lap, both gazing at softly falling snow outside. The Christmas tree glows gently in the background. A warm blanket drapes over them. A small golden bell motif catches the light near the windowsill. Quiet, magical winter night atmosphere with deep blue and warm gold tones. Soft watercolor picture book style, peaceful memorable finale, rich but not cluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark."),
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
        sampleImageUrl: "/images/templates/emotional-growth.png",
        sampleImageAlt: "おもちゃをわけっこして笑い合う子どもたちのやさしい絵本イメージ",
        visualDirection: "Warm emotional-growth picture-book mood with gentle eye contact, shared toys, supportive smiles, and a small kindness spark motif.",
        order: 6,
        active: true,
        systemPrompt: "固定テンプレートを使って、わけっこを通してやさしさと自信を育てる短い絵本を作ります。",
        fixedStory: {
            titleTemplate: "{childName}のわけっこできたね",
            coverImagePromptTemplate: withFixedImagePromptSafety("Picture book cover illustration: two children sharing toys with warm smiles in a bright playroom, one child is the protagonist, gentle sunlight, recurring tiny kindness spark motif, tender emotional-growth mood, soft watercolor style, child-safe rounded composition, rich but not cluttered details, no text, no letters, no Japanese characters, no readable signs, no logo, no watermark"),
            titleSpreadTextTemplate: "{childName}の わけっこ できたね",
            openingNarrationTemplate: "きょうの テーマは「{lessonToTeach}」。{childName}が ちいさな やさしさを 見つける おはなしです。",
            pages: [
                buildAgeSpecificPage({
                    textTemplate: "{childName}は、だいすきなおもちゃであそんでいました。",
                    baby_toddler: "{childName}、だいすき おもちゃ。",
                    preschool_3_4: "{childName}は、だいすきなおもちゃで あそんでいました。たのしくて、ぎゅっと だいじに もっています。",
                    early_reader_5_6: "{childName}は、だいすきな おもちゃで あそんでいました。たのしい時間だからこそ、だれにも わたしたくない きもちも ありました。",
                    early_elementary_7_8: "{childName}は、だいすきな おもちゃで あそんでいました。たいせつなものを ひとりで もっていたい気持ちと、だれかと 楽しみたい気持ちが 心のなかで ゆれていました。",
                    general_child: "{childName}は、だいすきなおもちゃであそんでいました。たのしくて、ぎゅっと だいじに もっています。",
                    pageVisualRole: "opening_establishing",
                    imagePromptTemplate: "Establishing wide shot of a bright child playroom. The protagonist child sits on a soft rug, holding a favorite toy close with both hands. Shelves with books and plush animals are in the background. A second child is visible nearby, watching with interest. A tiny kindness spark motif appears on a cushion corner. Soft watercolor picture book style, balanced foreground-midground-background composition, rich but not cluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark.",
                }),
                buildAgeSpecificPage({
                    textTemplate: "おともだちが「いっしょにあそびたいな」といいました。",
                    baby_toddler: "いっしょに あそぼ。どうしよう。",
                    preschool_3_4: "おともだちが「いっしょにあそびたいな」と いいました。{childName}は すこしだけ まよいます。",
                    early_reader_5_6: "おともだちが「いっしょにあそびたいな」と いいました。{childName}は ちょっぴり まよいながらも、どうしたら みんなが うれしいかを かんがえます。",
                    early_elementary_7_8: "おともだちが「いっしょに あそびたいな」と いいました。{childName}は まよいながらも、じぶんの気持ちと 相手の気持ちの どちらも たいせつに できる方法を さがしはじめます。",
                    general_child: "おともだちが「いっしょにあそびたいな」といいました。{childName}は すこしだけ まよいます。",
                    pageVisualRole: "discovery",
                    imagePromptTemplate: "Medium shot showing two children at eye level in a playroom. One child gently asks to join while the protagonist thinks for a moment, still holding the toy. Their facial expressions are soft and thoughtful, not upset. Warm daylight enters from a side window. A tiny kindness spark motif is tucked on a toy box edge. Soft watercolor picture book style, clear emotional storytelling framing, rich but not cluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark.",
                }),
                buildAgeSpecificPage({
                    textTemplate: "{childName}は、にっこりして「いっしょにあそぼ」といいました。",
                    baby_toddler: "いっしょに あそぼ。にこっ。",
                    preschool_3_4: "{childName}は、にっこりして「いっしょにあそぼ」と いいました。おへやに やさしい えがおが ふえました。",
                    early_reader_5_6: "{childName}は、にっこりして「いっしょにあそぼ」と いいました。わけっこしてみると、たのしさが ふたつに なって かえってきました。",
                    early_elementary_7_8: "{childName}は、にっこりして「いっしょにあそぼ」と いいました。勇気をだして わけっこしたことで、こころが ふわっと あたたかくなり、自分への 自信も すこし育ちました。",
                    general_child: "{childName}は、にっこりして「いっしょにあそぼ」といいました。おへやに やさしい えがおが ふえました。",
                    pageVisualRole: "emotional_closeup",
                    imagePromptTemplate: "Close-up of two children smiling as they share a favorite toy together, hands gently touching the same object. The protagonist's expression shows pride and kindness. Background is softly blurred with warm playroom colors. A tiny kindness spark motif glows near their joined hands. Soft watercolor picture book style, intimate emotional framing, rich but not cluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark.",
                }),
                buildAgeSpecificPage({
                    textTemplate: "{parentMessage}",
                    baby_toddler: "{parentMessage}",
                    preschool_3_4: "{parentMessage}",
                    early_reader_5_6: "{parentMessage}",
                    early_elementary_7_8: "{parentMessage}",
                    general_child: "{parentMessage}",
                    pageVisualRole: "quiet_ending",
                    imagePromptTemplate: "Wide quiet ending shot of the two children sitting side by side after playtime, toys neatly shared between them. The room is calm in soft late-afternoon light. The protagonist leans comfortably with a peaceful smile. A tiny kindness spark motif appears near a bookshelf or rug edge. Soft watercolor picture book style, serene reflective composition, rich but not cluttered. No text, no letters, no Japanese characters, no readable signs, no logo, no watermark.",
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
        sampleImageUrl: "/images/templates/fantasy.png",
        sampleImageAlt: "自由なアイデアから広がるオリジナル絵本イメージ",
        visualDirection: "Flexible premium storybook mood that can adapt to many scenes while staying warm, child-friendly, expressive, and visually cohesive.",
        order: 20,
        active: true,
        systemPrompt: `あなたは子ども向け絵本の作家です。親の自由入力を中心に、主人公の個性と家族の思いを生かしたオリジナル絵本を作ってください。
- 内容は自由でも、幼児が安心して読めるやさしい構成にしてください。
- 主人公の好きなもの、思い出、教えたいことを必要に応じて自然に織り込んでください。`,
    },
};
const legacyTemplateIds = ["birthday", "seasons", "challenge", "family"];
const templateMetadata = {
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
const defaultTemplateMetadata = {
    creationMode: "guided_ai",
    priceTier: "take",
    storyCostLevel: "standard",
};
async function seed() {
    const batch = db.batch();
    for (const [id, data] of Object.entries(categoryGroups)) {
        batch.set(db.doc(`categoryGroups/${id}`), data);
    }
    for (const [id, data] of Object.entries(exports.SEED_TEMPLATES)) {
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
    console.log(`Seeded ${Object.keys(exports.SEED_TEMPLATES).length} templates.`);
}
exports.seedTemplates = (0, https_1.onCall)({
    region: "asia-northeast1",
}, async () => {
    await seed();
    return { message: "Templates seeded successfully" };
});
// For local execution
if (require.main === module) {
    seed().catch(console.error);
}
//# sourceMappingURL=seed-templates.js.map
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = require("firebase-admin/app");
const firestore_1 = require("firebase-admin/firestore");
if ((0, app_1.getApps)().length === 0)
    (0, app_1.initializeApp)();
const db = (0, firestore_1.getFirestore)();
const JSON_FORMAT_INSTRUCTION = `

以下のJSON形式で出力してください。JSON以外のテキストは含めないでください。
\`\`\`json
{
  "title": "絵本のタイトル（日本語）",
  "pages": [
    {
      "text": "ページの本文（日本語・ひらがな多め）",
      "imagePrompt": "English description of the illustration"
    }
  ]
}
\`\`\``;
const templates = {
    birthday: {
        name: "おたんじょうび", description: "主人公の誕生日パーティーの冒険", icon: "🎂", order: 1, active: true,
        systemPrompt: `あなたは子ども向け絵本の作家です。主人公の誕生日をテーマにした心温まる物語を作ってください。
- 誕生日パーティー、プレゼント、ケーキ、友だちや家族のお祝いなど楽しい要素を入れてください。
- 主人公が特別な一日を過ごし、幸せな気持ちで終わる物語にしてください。
- 子ども向けの安全な内容のみ。暴力・恐怖・悲しい結末は禁止です。${JSON_FORMAT_INSTRUCTION}`,
    },
    bedtime: {
        name: "おやすみなさい", description: "眠りにつくまでの穏やかな物語", icon: "🌙", order: 2, active: true,
        systemPrompt: `あなたは子ども向け絵本の作家です。寝かしつけにぴったりの穏やかな物語を作ってください。
- 夜の静かな冒険、お月さまやお星さまとのやりとり、眠りの妖精など穏やかな要素を入れてください。
- ゆっくりとしたテンポで、最後は主人公が安心して眠りにつく場面で終わってください。
- 子ども向けの安全な内容のみ。暴力・恐怖・悲しい結末は禁止です。${JSON_FORMAT_INSTRUCTION}`,
    },
    adventure: {
        name: "おでかけぼうけん", description: "公園や動物園へのお出かけ冒険", icon: "🌳", order: 3, active: true,
        systemPrompt: `あなたは子ども向け絵本の作家です。お出かけをテーマにした楽しい冒険物語を作ってください。
- 公園、動物園、水族館、山や海など楽しいお出かけ先での冒険を描いてください。
- 新しい発見やちょっとしたハプニングを入れて、ワクワクする展開にしてください。
- 子ども向けの安全な内容のみ。暴力・恐怖・悲しい結末は禁止です。${JSON_FORMAT_INSTRUCTION}`,
    },
    seasons: {
        name: "きせつのおはなし", description: "春夏秋冬の季節イベント", icon: "🌸", order: 4, active: true,
        systemPrompt: `あなたは子ども向け絵本の作家です。日本の四季をテーマにした物語を作ってください。
- お花見、夏祭り、紅葉狩り、雪遊び、節分、七夕など季節の行事を取り入れてください。
- 季節の美しさや楽しさが伝わる描写を入れてください。
- 子ども向けの安全な内容のみ。暴力・恐怖・悲しい結末は禁止です。${JSON_FORMAT_INSTRUCTION}`,
    },
    animals: {
        name: "どうぶつのともだち", description: "動物たちと友だちになる物語", icon: "🐰", order: 5, active: true,
        systemPrompt: `あなたは子ども向け絵本の作家です。動物と友だちになるテーマの物語を作ってください。
- うさぎ、くま、ねこ、いぬ、ぞうなどかわいい動物たちを登場させてください。
- 動物たちと一緒に遊んだり助け合ったりする友情の物語にしてください。
- 子ども向けの安全な内容のみ。暴力・恐怖・悲しい結末は禁止です。${JSON_FORMAT_INSTRUCTION}`,
    },
    food: {
        name: "たべものだいぼうけん", description: "好き嫌い克服や食の楽しさ", icon: "🍙", order: 6, active: true,
        systemPrompt: `あなたは子ども向け絵本の作家です。食べ物をテーマにした楽しい物語を作ってください。
- 食べ物が擬人化されたり、料理を一緒に作ったり、新しい食べ物に挑戦する物語にしてください。
- 食べることの楽しさや、好き嫌いを少し克服するようなポジティブな展開にしてください。
- 子ども向けの安全な内容のみ。暴力・恐怖・悲しい結末は禁止です。${JSON_FORMAT_INSTRUCTION}`,
    },
    challenge: {
        name: "できたよ！チャレンジ", description: "トイレ・着替え・お片付けなど成長体験", icon: "💪", order: 7, active: true,
        systemPrompt: `あなたは子ども向け絵本の作家です。子どもの成長チャレンジをテーマにした物語を作ってください。
- トイレトレーニング、自分で着替える、お片付け、歯みがきなどの日常チャレンジを取り入れてください。
- 最初は難しくても頑張って「できた！」と達成感を感じる物語にしてください。
- 子ども向けの安全な内容のみ。暴力・恐怖・悲しい結末は禁止です。${JSON_FORMAT_INSTRUCTION}`,
    },
    family: {
        name: "かぞくのおはなし", description: "家族の絆や兄弟・祖父母との物語", icon: "👨‍👩‍👧", order: 8, active: true,
        systemPrompt: `あなたは子ども向け絵本の作家です。家族の絆をテーマにした温かい物語を作ってください。
- お父さん、お母さん、兄弟姉妹、おじいちゃん、おばあちゃんなど家族との交流を描いてください。
- 家族と一緒に過ごす時間の大切さや、愛情が伝わる物語にしてください。
- 子ども向けの安全な内容のみ。暴力・恐怖・悲しい結末は禁止です。${JSON_FORMAT_INSTRUCTION}`,
    },
};
async function seed() {
    const batch = db.batch();
    for (const [id, data] of Object.entries(templates)) {
        batch.set(db.doc(`templates/${id}`), data);
    }
    await batch.commit();
    console.log(`Seeded ${Object.keys(templates).length} templates.`);
}
seed().catch(console.error);
//# sourceMappingURL=seed-templates.js.map
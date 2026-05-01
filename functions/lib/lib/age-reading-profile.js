"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAgeReadingProfile = getAgeReadingProfile;
const AGE_READING_PROFILES = {
    baby_toddler: {
        ageBand: "baby_toddler",
        label: "0〜2歳",
        targetCharsPerPage: "5〜15文字程度",
        sentenceCountPerPage: "1文",
        vocabularyLevel: "音、色、もの、動きなど、感覚的で短い言葉",
        kanjiPolicy: "漢字は使わず、ほぼひらがな",
        storyComplexity: "反復、音のリズム、単純な出来事",
        dialoguePolicy: "会話はほぼ使わない",
        emotionalDepth: "うれしい、たのしい、ねむい、など単純な気持ち",
    },
    preschool_3_4: {
        ageBand: "preschool_3_4",
        label: "3〜4歳",
        targetCharsPerPage: "15〜35文字程度",
        sentenceCountPerPage: "1〜2文",
        vocabularyLevel: "日常語を中心に、幼児が理解しやすい言葉",
        kanjiPolicy: "ひらがな中心。漢字は原則使わない",
        storyComplexity: "はじまり、できごと、うれしい終わり",
        dialoguePolicy: "短い一言の会話なら使ってよい",
        emotionalDepth: "うれしい、びっくり、かなしい、ほっとした、など",
    },
    early_reader_5_6: {
        ageBand: "early_reader_5_6",
        label: "5〜6歳",
        targetCharsPerPage: "35〜70文字程度",
        sentenceCountPerPage: "2〜3文",
        vocabularyLevel: "日常語に加えて、少しだけ新しい言葉を入れる",
        kanjiPolicy: "ひらがな多め。簡単な漢字は少しだけ使ってよい",
        storyComplexity: "小さな問題、挑戦、工夫、気持ちの変化",
        dialoguePolicy: "短い会話を入れてよい",
        emotionalDepth: "くやしい、がんばる、ゆずる、安心する、など",
    },
    early_elementary_7_8: {
        ageBand: "early_elementary_7_8",
        label: "7〜8歳",
        targetCharsPerPage: "70〜120文字程度",
        sentenceCountPerPage: "3〜5文",
        vocabularyLevel: "小学校低学年が読める語彙。理由や考えを表す言葉も使う",
        kanjiPolicy: "ひらがな中心だが、小学校低学年向けの簡単な漢字を少し使ってよい",
        storyComplexity: "理由、選択、サブキャラ、小さな葛藤、伏線を少し含める",
        dialoguePolicy: "会話を自然に入れてよい",
        emotionalDepth: "迷う、考える、決める、相手を思う、成長する、など",
    },
    general_child: {
        ageBand: "general_child",
        label: "標準の子ども向け",
        targetCharsPerPage: "25〜50文字程度",
        sentenceCountPerPage: "1〜2文",
        vocabularyLevel: "日常語を中心に、ときどき少し新しい言葉を入れる",
        kanjiPolicy: "ひらがな中心。漢字はごく控えめ",
        storyComplexity: "できごとと気持ちの変化が分かりやすい構成",
        dialoguePolicy: "短い会話を入れてよい",
        emotionalDepth: "うれしい、びっくり、がんばる、安心する、など",
    },
};
function getAgeReadingProfile(age) {
    if (age === undefined || age === null || Number.isNaN(age)) {
        return AGE_READING_PROFILES.general_child;
    }
    if (age <= 2) {
        return AGE_READING_PROFILES.baby_toddler;
    }
    if (age <= 4) {
        return AGE_READING_PROFILES.preschool_3_4;
    }
    if (age <= 6) {
        return AGE_READING_PROFILES.early_reader_5_6;
    }
    if (age <= 8) {
        return AGE_READING_PROFILES.early_elementary_7_8;
    }
    return AGE_READING_PROFILES.early_elementary_7_8;
}
//# sourceMappingURL=age-reading-profile.js.map
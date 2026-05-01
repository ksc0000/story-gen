import type { AgeBand } from "./types";

export type AgeReadingProfile = {
  ageBand: AgeBand;
  label: string;
  targetCharsPerPage: string;
  targetSentencesPerPage: string;
  sentenceCountPerPage: string;
  vocabularyLevel: string;
  kanjiPolicy: string;
  storyComplexity: string;
  narrativeComplexity: string;
  dialoguePolicy: string;
  emotionalDepth: string;
  backgroundDetailLevel: string;
  repetitionPolicy: string;
  recommendedDevices: string;
};

const AGE_READING_PROFILES: Record<AgeBand, AgeReadingProfile> = {
  baby_toddler: {
    ageBand: "baby_toddler",
    label: "0〜2歳",
    targetCharsPerPage: "8〜20文字程度",
    targetSentencesPerPage: "1〜2文",
    sentenceCountPerPage: "1〜2文",
    vocabularyLevel: "音、色、もの、動きなど、感覚的で短い言葉",
    kanjiPolicy: "漢字は使わず、ほぼひらがな",
    storyComplexity: "反復、音のリズム、単純な出来事",
    narrativeComplexity: "安心感のあるくり返しと、分かりやすい1つの出来事",
    dialoguePolicy: "会話はほぼ使わない",
    emotionalDepth: "うれしい、たのしい、ねむい、など単純な気持ち",
    backgroundDetailLevel: "背景はやさしく分かりやすく、主役の行動が伝わる程度",
    repetitionPolicy: "短い反復フレーズや音のくり返しを積極的に使う",
    recommendedDevices: "反復、オノマトペ、安心する締め、身近な小物",
  },
  preschool_3_4: {
    ageBand: "preschool_3_4",
    label: "3〜4歳",
    targetCharsPerPage: "30〜60文字程度",
    targetSentencesPerPage: "2〜3文",
    sentenceCountPerPage: "2〜3文",
    vocabularyLevel: "日常語を中心に、幼児が理解しやすい言葉",
    kanjiPolicy: "ひらがな中心。漢字は原則使わない",
    storyComplexity: "はじまり、できごと、気持ちの変化、うれしい終わり",
    narrativeComplexity: "行動、気持ち、小さな発見が1ページにそろう程度",
    dialoguePolicy: "短い一言の会話なら使ってよい",
    emotionalDepth: "うれしい、びっくり、かなしい、ほっとした、など",
    backgroundDetailLevel: "背景に場所らしさや身近な小物を少し入れる",
    repetitionPolicy: "覚えやすい短いくり返しフレーズを入れてよい",
    recommendedDevices: "小さな発見、やさしい会話、反復フレーズ、探し要素を少し",
  },
  early_reader_5_6: {
    ageBand: "early_reader_5_6",
    label: "5〜6歳",
    targetCharsPerPage: "60〜110文字程度",
    targetSentencesPerPage: "3〜5文",
    sentenceCountPerPage: "3〜5文",
    vocabularyLevel: "日常語に加えて、少しだけ新しい言葉を入れる",
    kanjiPolicy: "ひらがな多め。簡単な漢字は少しだけ使ってよい",
    storyComplexity: "小さな問題、挑戦、工夫、気持ちの変化",
    narrativeComplexity: "小さな原因と結果、会話、場面描写を自然に含める",
    dialoguePolicy: "短い会話を入れてよい",
    emotionalDepth: "くやしい、がんばる、ゆずる、安心する、など",
    backgroundDetailLevel: "背景に場所を感じる小物や行動の手がかりをしっかり入れる",
    repetitionPolicy: "反復フレーズや小さなモチーフを入れて、次のページが楽しみになるようにする",
    recommendedDevices: "短い会話、原因と結果、小さな挑戦、背景の探し要素",
  },
  early_elementary_7_8: {
    ageBand: "early_elementary_7_8",
    label: "7〜8歳",
    targetCharsPerPage: "100〜170文字程度",
    targetSentencesPerPage: "4〜6文",
    sentenceCountPerPage: "4〜6文",
    vocabularyLevel: "小学校低学年が読める語彙。理由や考えを表す言葉も使う",
    kanjiPolicy: "ひらがな中心だが、小学校低学年向けの簡単な漢字を少し使ってよい",
    storyComplexity: "理由、選択、サブキャラ、小さな葛藤、伏線を少し含める",
    narrativeComplexity: "小さな葛藤、伏線と回収、感情の理由を入れて読みごたえを出す",
    dialoguePolicy: "会話を自然に入れてよい",
    emotionalDepth: "迷う、考える、決める、相手を思う、成長する、など",
    backgroundDetailLevel: "背景に意味のある小物、季節感、サブキャラの動きを入れる",
    repetitionPolicy: "反復フレーズや視覚モチーフを使い、最後で回収する",
    recommendedDevices: "伏線、回収、会話、視覚モチーフ、背景の小ネタ",
  },
  general_child: {
    ageBand: "general_child",
    label: "3〜6歳向けの標準設定",
    targetCharsPerPage: "45〜90文字程度",
    targetSentencesPerPage: "3〜4文",
    sentenceCountPerPage: "3〜4文",
    vocabularyLevel: "日常語を中心に、ときどき少し新しい言葉を入れる",
    kanjiPolicy: "ひらがな中心。漢字はごく控えめ",
    storyComplexity: "できごと、気持ちの変化、小さな発見が分かりやすい構成",
    narrativeComplexity: "短すぎず長すぎない標準的な絵本の読みごたえ",
    dialoguePolicy: "短い会話を入れてよい",
    emotionalDepth: "うれしい、びっくり、がんばる、安心する、など",
    backgroundDetailLevel: "背景に場所や暮らしが伝わる小物を入れる",
    repetitionPolicy: "短い反復フレーズや視覚モチーフを入れてよい",
    recommendedDevices: "反復フレーズ、小さな発見、やさしい会話、背景の探し要素",
  },
};

export function getAgeReadingProfile(age?: number): AgeReadingProfile {
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

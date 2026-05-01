import type { AgeBand } from "@/lib/types";

export type AgeReadingDisplayProfile = {
  ageBand: AgeBand;
  label: string;
  targetCharsPerPage: string;
  storyLevelSummary: string;
  uiDescription: string;
};

const AGE_READING_DISPLAY_PROFILES: Record<AgeBand, AgeReadingDisplayProfile> = {
  baby_toddler: {
    ageBand: "baby_toddler",
    label: "0〜2歳向け",
    targetCharsPerPage: "1ページ5〜15文字程度",
    storyLevelSummary: "音・色・動きが中心",
    uiDescription: "短い言葉とリズムで、絵を見ながら楽しめる文章にします。",
  },
  preschool_3_4: {
    ageBand: "preschool_3_4",
    label: "3〜4歳向け",
    targetCharsPerPage: "1ページ15〜35文字程度",
    storyLevelSummary: "日常と小さな発見",
    uiDescription: "やさしい言葉で、できごとと気持ちが分かる文章にします。",
  },
  early_reader_5_6: {
    ageBand: "early_reader_5_6",
    label: "5〜6歳向け",
    targetCharsPerPage: "1ページ35〜70文字程度",
    storyLevelSummary: "小さな挑戦と気持ちの変化",
    uiDescription: "少し長めの文章で、工夫や成長が伝わるお話にします。",
  },
  early_elementary_7_8: {
    ageBand: "early_elementary_7_8",
    label: "7〜8歳向け",
    targetCharsPerPage: "1ページ70〜120文字程度",
    storyLevelSummary: "理由・選択・小さな葛藤",
    uiDescription: "会話や考える場面を入れて、読みごたえのあるお話にします。",
  },
  general_child: {
    ageBand: "general_child",
    label: "3〜6歳向けの標準設定",
    targetCharsPerPage: "1ページ25〜50文字程度",
    storyLevelSummary: "やさしい出来事と気持ちの変化",
    uiDescription: "やさしい言葉を中心に、少しずつ気持ちの流れが伝わる文章にします。",
  },
};

export function getAgeReadingDisplayProfile(age?: number): AgeReadingDisplayProfile {
  if (age === undefined || age === null || Number.isNaN(age)) {
    return AGE_READING_DISPLAY_PROFILES.general_child;
  }

  if (age <= 2) {
    return AGE_READING_DISPLAY_PROFILES.baby_toddler;
  }
  if (age <= 4) {
    return AGE_READING_DISPLAY_PROFILES.preschool_3_4;
  }
  if (age <= 6) {
    return AGE_READING_DISPLAY_PROFILES.early_reader_5_6;
  }
  if (age <= 8) {
    return AGE_READING_DISPLAY_PROFILES.early_elementary_7_8;
  }

  return AGE_READING_DISPLAY_PROFILES.early_elementary_7_8;
}

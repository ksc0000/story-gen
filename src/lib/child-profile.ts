import { serverTimestamp, type DocumentData } from "firebase/firestore";
import type { ChildProfileDoc, IllustrationStyle, PageCount } from "@/lib/types";
import type { ChildProfileFormValues } from "@/components/child-profile-form";

function splitJapaneseList(value: string): string[] {
  return value.split(/[、,]/).map((item) => item.trim()).filter(Boolean);
}

export function buildChildProfilePayload(values: ChildProfileFormValues, existingVisualProfile?: ChildProfileDoc["visualProfile"]): DocumentData {
  return {
    displayName: values.displayName.trim(),
    nickname: values.nickname.trim() || null,
    age: values.age ? Number(values.age) : null,
    birthYearMonth: values.birthYearMonth || null,
    genderExpression: values.genderExpression,
    personality: {
      traits: splitJapaneseList(values.traits),
      favoritePlay: values.favoritePlay.trim() || null,
      favoriteThings: splitJapaneseList(values.favoriteThings),
      dislikes: splitJapaneseList(values.dislikes),
      strengths: splitJapaneseList(values.strengths),
      currentChallenge: values.currentChallenge.trim() || null,
    },
    visualProfile: {
      ...existingVisualProfile,
      characterLook: values.characterLook.trim() || null,
      signatureItem: values.signatureItem.trim() || null,
      outfit: values.outfit.trim() || null,
      colorMood: values.colorMood.trim() || null,
      version: existingVisualProfile?.version ?? 1,
    },
    generationSettings: {
      defaultStyle: values.defaultStyle as IllustrationStyle,
      defaultPageCount: values.defaultPageCount as PageCount,
      avoidExpressions: [],
      allowedPersonalization: true,
    },
    updatedAt: serverTimestamp(),
    active: true,
  };
}

export function childProfileToSummary(child: ChildProfileDoc): string {
  const favoriteThings = child.personality.favoriteThings?.join("、");
  const challenge = child.personality.currentChallenge;
  return [favoriteThings ? `好き: ${favoriteThings}` : "", challenge ? `応援: ${challenge}` : ""]
    .filter(Boolean)
    .join(" / ");
}

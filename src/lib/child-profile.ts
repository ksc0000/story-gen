import { serverTimestamp, type DocumentData } from "firebase/firestore";
import type { ChildProfileDoc, IllustrationStyle, PageCount, ChildProfileSnapshot } from "@/lib/types";
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
    photoUrl: values.photoUrl || null,
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

/** 登録なし（名前だけ）の主人公スナップショット */
export function buildLegacyChildProfileSnapshot(params: { childName: string }): ChildProfileSnapshot {
  return {
    displayName: params.childName,
    personality: {},
    visualProfile: {
      version: 1,
    },
  };
}

/** 登録済みの子どもから、絵本に埋め込むスナップショットを作る（参照画像は承認済みアバターを優先） */
export function buildChildProfileSnapshot(child: ChildProfileSnapshot & { id?: string }): ChildProfileSnapshot {
  return {
    displayName: child.displayName,
    nickname: child.nickname,
    age: child.age,
    genderExpression: child.genderExpression,
    personality: child.personality ?? {},
    visualProfile: {
      ...(child.visualProfile ?? { version: 1 }),
      referenceImageUrl: child.visualProfile?.referenceImageUrl || child.visualProfile?.approvedImageUrl,
      version: child.visualProfile?.version ?? 1,
    },
  };
}


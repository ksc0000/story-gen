"use client";

import { useMemo, useState } from "react";
import type React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ChildProfileDoc, IllustrationStyle, PageCount } from "@/lib/types";

type ChildProfileFormValues = {
  displayName: string;
  nickname: string;
  age: string;
  birthYearMonth: string;
  genderExpression: "boy" | "girl" | "neutral" | "unspecified";
  traits: string;
  favoritePlay: string;
  favoriteThings: string;
  dislikes: string;
  strengths: string;
  currentChallenge: string;
  characterLook: string;
  signatureItem: string;
  outfit: string;
  colorMood: string;
  defaultStyle: IllustrationStyle;
  defaultPageCount: PageCount;
};

interface ChildProfileFormProps {
  initialChild?: Partial<ChildProfileDoc> | null;
  submitLabel: string;
  saving?: boolean;
  onSubmit: (values: ChildProfileFormValues) => Promise<void>;
}

const defaultValues: ChildProfileFormValues = {
  displayName: "",
  nickname: "",
  age: "",
  birthYearMonth: "",
  genderExpression: "unspecified",
  traits: "",
  favoritePlay: "",
  favoriteThings: "",
  dislikes: "",
  strengths: "",
  currentChallenge: "",
  characterLook: "",
  signatureItem: "",
  outfit: "",
  colorMood: "やさしいパステル",
  defaultStyle: "soft_watercolor",
  defaultPageCount: 8,
};

export function ChildProfileForm({ initialChild, submitLabel, saving = false, onSubmit }: ChildProfileFormProps) {
  const initialValues = useMemo<ChildProfileFormValues>(() => ({
    ...defaultValues,
    displayName: initialChild?.displayName ?? "",
    nickname: initialChild?.nickname ?? "",
    age: initialChild?.age ? String(initialChild.age) : "",
    birthYearMonth: initialChild?.birthYearMonth ?? "",
    genderExpression: initialChild?.genderExpression ?? "unspecified",
    traits: (initialChild?.personality?.traits ?? []).join("、"),
    favoritePlay: initialChild?.personality?.favoritePlay ?? "",
    favoriteThings: (initialChild?.personality?.favoriteThings ?? []).join("、"),
    dislikes: (initialChild?.personality?.dislikes ?? []).join("、"),
    strengths: (initialChild?.personality?.strengths ?? []).join("、"),
    currentChallenge: initialChild?.personality?.currentChallenge ?? "",
    characterLook: initialChild?.visualProfile?.characterLook ?? "",
    signatureItem: initialChild?.visualProfile?.signatureItem ?? "",
    outfit: initialChild?.visualProfile?.outfit ?? "",
    colorMood: initialChild?.visualProfile?.colorMood ?? "やさしいパステル",
    defaultStyle: initialChild?.generationSettings?.defaultStyle ?? "soft_watercolor",
    defaultPageCount: initialChild?.generationSettings?.defaultPageCount ?? 8,
  }), [initialChild]);

  const [values, setValues] = useState(initialValues);
  const [error, setError] = useState<string | null>(null);

  const update = (key: keyof ChildProfileFormValues, value: string | PageCount | IllustrationStyle) => {
    setValues((current) => ({ ...current, [key]: value }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!values.displayName.trim()) {
      setError("お子さんの名前を入力してください");
      return;
    }
    if (!values.age.trim()) {
      setError("年齢を入力してください");
      return;
    }
    setError(null);
    await onSubmit(values);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle>基本情報</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="お名前" value={values.displayName} onChange={(value) => update("displayName", value)} required />
          <Field label="呼び名" value={values.nickname} onChange={(value) => update("nickname", value)} placeholder="はるくん、さっちゃん など" />
          <Field label="年齢" value={values.age} onChange={(value) => update("age", value)} type="number" min="0" max="12" required />
          <Field label="生まれた年月" value={values.birthYearMonth} onChange={(value) => update("birthYearMonth", value)} type="month" />
          <div className="space-y-2 sm:col-span-2">
            <Label>性別表現</Label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                { value: "boy", label: "男の子" },
                { value: "girl", label: "女の子" },
                { value: "neutral", label: "中性的" },
                { value: "unspecified", label: "指定しない" },
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => update("genderExpression", option.value as ChildProfileFormValues["genderExpression"])}
                  className={`rounded-full border px-3 py-2 text-sm transition ${
                    values.genderExpression === option.value
                      ? "border-purple-400 bg-purple-50 text-purple-700"
                      : "border-[rgba(240,171,252,0.35)] text-violet-500 hover:border-purple-300"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>好きなこと・性格</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="性格" value={values.traits} onChange={(value) => update("traits", value)} placeholder="やさしい、好奇心旺盛" />
          <Field label="好きな遊び" value={values.favoritePlay} onChange={(value) => update("favoritePlay", value)} placeholder="電車ごっこ" />
          <Field label="好きなもの" value={values.favoriteThings} onChange={(value) => update("favoriteThings", value)} placeholder="恐竜、新幹線、いちご" />
          <Field label="苦手なもの" value={values.dislikes} onChange={(value) => update("dislikes", value)} placeholder="大きな音" />
          <Field label="すてきなところ" value={values.strengths} onChange={(value) => update("strengths", value)} placeholder="ありがとうが言える" />
          <Field label="いま応援したいこと" value={values.currentChallenge} onChange={(value) => update("currentChallenge", value)} placeholder="歯みがきを自分でする" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>絵本キャラクターの見た目</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="見た目" value={values.characterLook} onChange={(value) => update("characterLook", value)} placeholder="短い黒髪、丸いほっぺ" />
          <Field label="よく着る服" value={values.outfit} onChange={(value) => update("outfit", value)} placeholder="青いオーバーオール" />
          <Field label="毎回出したい持ち物" value={values.signatureItem} onChange={(value) => update("signatureItem", value)} placeholder="黄色い帽子" />
          <Field label="色や雰囲気" value={values.colorMood} onChange={(value) => update("colorMood", value)} placeholder="やさしいパステル" />
        </CardContent>
      </Card>

      {error ? <p className="rounded-2xl bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
      <div className="flex justify-center">
        <Button type="submit" size="lg" disabled={saving} className="px-8 py-6 text-base">
          {saving ? "保存しています..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}

function Field({
  label,
  value,
  onChange,
  ...props
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
} & Omit<React.ComponentProps<typeof Input>, "value" | "onChange">) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input value={value} onChange={(event) => onChange(event.target.value)} {...props} />
    </div>
  );
}

export type { ChildProfileFormValues };

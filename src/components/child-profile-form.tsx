"use client";

import { useMemo, useState } from "react";
import type React from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PhotoUploadInput } from "@/components/photo-upload-input";
import { ExtraPhotosInput } from "@/components/extra-photos-input";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { analyzeChildPhotoCallable } from "@/lib/functions";
import { downscaleImageToBase64 } from "@/lib/image-to-base64";
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
  photoUrl?: string;
  photoFile: File | null;
  /** 追加の参考写真（Phase 4）: 既存の保持URL＋新規ファイル。 */
  extraKeptUrls: string[];
  extraNewFiles: File[];
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
  photoFile: null,
  extraKeptUrls: [],
  extraNewFiles: [],
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
    photoUrl: initialChild?.photoUrl,
    extraKeptUrls: initialChild?.photoUrls ?? [],
  }), [initialChild]);

  const [values, setValues] = useState(initialValues);
  const [error, setError] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [autofillMsg, setAutofillMsg] = useState<string | null>(null);

  const update = (key: keyof ChildProfileFormValues, value: string | PageCount | IllustrationStyle) => {
    setValues((current) => ({ ...current, [key]: value }));
  };

  // 写真をVisionで解析し、見た目まわりのプロフィール項目を下書きする。
  const handleAutofillFromPhoto = async () => {
    const source: File | string | undefined = values.photoFile ?? values.photoUrl;
    if (!source || analyzing) return;
    setAnalyzing(true);
    setAutofillMsg(null);
    try {
      const { imageBase64, mimeType } = await downscaleImageToBase64(source);
      const draft = await analyzeChildPhotoCallable({ imageBase64, mimeType });
      setValues((current) => ({
        ...current,
        characterLook: draft.characterLook || current.characterLook,
        outfit: draft.outfit || current.outfit,
        colorMood: draft.colorMood || current.colorMood,
        age: draft.ageGuess != null ? String(draft.ageGuess) : current.age,
        genderExpression:
          draft.genderExpression !== "unspecified" ? draft.genderExpression : current.genderExpression,
      }));
      setAutofillMsg("写真から見た目を下書きしました。内容を確認して、必要なら直してください。");
    } catch (err) {
      const code = err instanceof Error ? err.message : "";
      setAutofillMsg(
        code === "image_fetch_failed"
          ? "登録済みの写真から読み込めませんでした。写真を選び直してからお試しください。"
          : "写真の解析に失敗しました。少し時間をおいて、もう一度お試しください。"
      );
    } finally {
      setAnalyzing(false);
    }
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

      <Card>
        <CardHeader>
          <CardTitle>お子さんの写真（任意）</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <PhotoUploadInput
            value={values.photoUrl}
            onChange={(file) =>
              setValues((current) => ({ ...current, photoFile: file }))
            }
          />
          {values.photoFile || values.photoUrl ? (
            <div className="space-y-2">
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={handleAutofillFromPhoto}
                disabled={analyzing}
              >
                {analyzing ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    写真を読み取っています...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 size-4" />
                    写真から見た目を自動入力
                  </>
                )}
              </Button>
              <p className="text-xs text-violet-400">
                髪型・顔立ち・年齢などの「見た目」項目だけAIが下書きします。お名前や性格は入力されません。写真はそのまま絵本に載りません。
              </p>
              {autofillMsg ? (
                <p className="rounded-xl bg-violet-50 px-3 py-2 text-xs text-violet-600">{autofillMsg}</p>
              ) : null}
            </div>
          ) : null}

          {values.photoFile || values.photoUrl ? (
            <div className="border-t border-violet-100 pt-3">
              <p className="text-sm font-semibold text-purple-900">参考写真を追加（任意）</p>
              <p className="mb-2 mt-0.5 text-xs text-violet-400">
                別角度の写真を足すと、キャラクターの似せ具合が上がりやすくなります（最大2枚）。
              </p>
              <ExtraPhotosInput
                keptUrls={values.extraKeptUrls}
                newFiles={values.extraNewFiles}
                max={2}
                onChange={({ keptUrls, newFiles }) =>
                  setValues((current) => ({
                    ...current,
                    extraKeptUrls: keptUrls,
                    extraNewFiles: newFiles,
                  }))
                }
              />
            </div>
          ) : null}
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
  id,
  ...props
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
} & Omit<React.ComponentProps<typeof Input>, "value" | "onChange">) {
  const fieldId = id || label;
  return (
    <div className="space-y-2">
      <Label htmlFor={fieldId}>{label}</Label>
      <Input id={fieldId} value={value} onChange={(event) => onChange(event.target.value)} {...props} />
    </div>
  );
}

export type { ChildProfileFormValues };

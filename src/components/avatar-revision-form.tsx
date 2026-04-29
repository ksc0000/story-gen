"use client";

import type { AvatarRevisionRequest } from "@/lib/types";
import { Label } from "@/components/ui/label";

interface AvatarRevisionFormProps {
  value: AvatarRevisionRequest;
  onChange: (value: AvatarRevisionRequest) => void;
  summary?: string[];
}

const REVISION_OPTIONS: Array<{
  key: Exclude<keyof AvatarRevisionRequest, "notes">;
  label: string;
  options: Array<{ value: string; label: string }>;
}> = [
  {
    key: "ageFeel",
    label: "年齢感",
    options: [
      { value: "younger", label: "もっと幼く" },
      { value: "slightly_younger", label: "少し幼く" },
      { value: "slightly_older", label: "少しお姉さん・お兄さんっぽく" },
      { value: "older", label: "もっと成長した印象に" },
    ],
  },
  {
    key: "hairStyle",
    label: "髪型",
    options: [
      { value: "shorter", label: "短めに" },
      { value: "longer", label: "長めに" },
      { value: "straighter", label: "まっすぐめに" },
      { value: "curlier", label: "ふんわり・くるっと" },
      { value: "neater", label: "整った印象に" },
    ],
  },
  {
    key: "faceMood",
    label: "顔の雰囲気",
    options: [
      { value: "gentler", label: "やさしく" },
      { value: "brighter", label: "明るく" },
      { value: "calmer", label: "落ち着いて" },
      { value: "more_expressive", label: "印象をはっきり" },
    ],
  },
  {
    key: "expression",
    label: "表情",
    options: [
      { value: "bigger_smile", label: "笑顔を大きく" },
      { value: "soft_smile", label: "ほほえみをやわらかく" },
      { value: "calm_expression", label: "穏やかな表情に" },
      { value: "more_playful", label: "元気で遊び心ある表情に" },
    ],
  },
  {
    key: "outfit",
    label: "服装",
    options: [
      { value: "more_casual", label: "もっと普段着っぽく" },
      { value: "more_colorful", label: "もう少し色を出す" },
      { value: "simpler", label: "シンプルに" },
      { value: "more_storybook_like", label: "絵本らしくかわいく" },
    ],
  },
  {
    key: "signatureItem",
    label: "固定アイテム",
    options: [
      { value: "more_visible", label: "もっと目立たせる" },
      { value: "smaller", label: "少し小さく" },
      { value: "better_positioned", label: "見えやすい位置に" },
      { value: "less_emphasized", label: "控えめに" },
    ],
  },
  {
    key: "colorTone",
    label: "色味",
    options: [
      { value: "warmer", label: "あたたかく" },
      { value: "softer", label: "やさしく" },
      { value: "brighter", label: "少し明るく" },
      { value: "less_saturated", label: "落ち着いた色味に" },
    ],
  },
  {
    key: "likeness",
    label: "本人らしさ",
    options: [
      { value: "closer_to_child", label: "もっと本人に寄せる" },
      { value: "keep_storybook_but_closer", label: "絵本らしさは残して近づける" },
      { value: "more_distinctive_features", label: "特徴をもう少しはっきり" },
      { value: "more_natural_balance", label: "全体の自然さを優先" },
    ],
  },
];

export function AvatarRevisionForm({ value, onChange, summary = [] }: AvatarRevisionFormProps) {
  const updateField = (key: keyof AvatarRevisionRequest, nextValue: string) => {
    onChange({
      ...value,
      [key]: nextValue || undefined,
    });
  };

  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-purple-50 p-4 text-sm text-violet-600">
        <p className="font-semibold text-purple-900">今回の補正内容</p>
        <ul className="mt-2 space-y-1">
          {summary.length > 0 ? summary.map((item) => <li key={item}>- {item}</li>) : <li>- まだ補正指定はありません</li>}
          <li>- 背景は公園の砂場のまま</li>
        </ul>
      </div>

      {REVISION_OPTIONS.map((section) => (
        <div key={section.key} className="space-y-2">
          <Label>{section.label}</Label>
          <div className="grid gap-2 sm:grid-cols-2">
            {section.options.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() =>
                  updateField(
                    section.key,
                    value[section.key] === option.value ? "" : option.value
                  )
                }
                className={`rounded-2xl border px-3 py-3 text-left text-sm transition ${
                  value[section.key] === option.value
                    ? "border-purple-400 bg-purple-50 text-purple-700"
                    : "border-[rgba(240,171,252,0.3)] text-violet-500 hover:border-purple-300"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      ))}

      <div className="space-y-2">
        <Label htmlFor="avatar-revision-notes">補足</Label>
        <textarea
          id="avatar-revision-notes"
          value={value.notes ?? ""}
          onChange={(event) => updateField("notes", event.target.value)}
          placeholder="例：前髪を少し軽くして、目元は今よりやさしい印象にしたいです"
          className="min-h-24 w-full rounded-[20px] border border-[rgba(240,171,252,0.3)] bg-background px-3 py-2 text-sm focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400/50"
          maxLength={300}
        />
      </div>
    </div>
  );
}

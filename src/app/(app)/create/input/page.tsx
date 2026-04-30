"use client";

import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { StepIndicator } from "@/components/step-indicator";
import { PageTransition } from "@/components/page-transition";
import { useAuth } from "@/lib/hooks/use-auth";
import { useChildren } from "@/lib/hooks/use-children";
import { useTemplates } from "@/lib/hooks/use-templates";
import type { CreationMode, OutfitMode } from "@/lib/types";

const PAGE_COUNT_OPTIONS = [
  { value: 4, label: "短い（4ページ）" },
  { value: 8, label: "ふつう（8ページ）" },
  { value: 12, label: "長い（12ページ）" },
] as const;

const STORY_REQUEST_PLACEHOLDERS: Record<string, string> = {
  memories: "例：初めて動物園に行った日のこと",
  "growth-support": "例：歯みがきを楽しくできるようになってほしい",
  bedtime: "例：今日がんばったことを思い出して安心して眠る話",
  imagination: "例：雲の上の国へ冒険に行く話",
  "seasonal-events": "例：クリスマスの日に家族で過ごした思い出",
};

const INPUT_LABELS: Record<string, string> = {
  childName: "お子さんの名前",
  place: "場所",
  familyMembers: "一緒に登場する人",
  parentMessage: "最後に伝えたい言葉",
  lessonToTeach: "教えたいこと",
  memoryToRecreate: "再現したい思い出",
  storyRequest: "作りたい内容",
};

function shouldShowTemplateField(field: string, requiredInputs: string[], optionalInputs: string[]) {
  return field === "parentMessage" || requiredInputs.includes(field) || optionalInputs.includes(field);
}

function getMissingTemplateFields(params: {
  requiredInputs: string[];
  place: string;
  familyMembers: string;
  parentMessage: string;
  lessonToTeach: string;
  memoryToRecreate: string;
  storyRequest: string;
}) {
  const fieldValues: Record<string, string> = {
    place: params.place,
    familyMembers: params.familyMembers,
    parentMessage: params.parentMessage,
    lessonToTeach: params.lessonToTeach,
    memoryToRecreate: params.memoryToRecreate,
    storyRequest: params.storyRequest,
  };

  return params.requiredInputs.filter((field) => field !== "childName" && !(fieldValues[field]?.trim()));
}

function InputPageContent() {
  const searchParams = useSearchParams();
  const theme = searchParams.get("theme") ?? "";
  const childId = searchParams.get("childId") ?? "";
  const mode = (searchParams.get("mode") as CreationMode | null) ?? "guided_ai";
  const router = useRouter();
  const { user } = useAuth();
  const { children, loading: childrenLoading } = useChildren(user?.uid);
  const { templates, loading: templatesLoading } = useTemplates();
  const child = children.find((item) => item.id === childId) ?? null;
  const template = templates.find((item) => item.id === theme);
  const creationMode = template?.creationMode ?? mode;
  const storyPlaceholder = STORY_REQUEST_PLACEHOLDERS[template?.categoryGroupId ?? ""] ?? "例：うちの子らしい冒険のおはなし";
  const requiredInputs = useMemo(() => template?.requiredInputs ?? [], [template]);
  const optionalInputs = useMemo(() => template?.optionalInputs ?? [], [template]);

  const [pageCount, setPageCount] = useState<number>(8);
  const [storyRequest, setStoryRequest] = useState("");
  const [lessonToTeach, setLessonToTeach] = useState("");
  const [memoryToRecreate, setMemoryToRecreate] = useState("");
  const [familyMembers, setFamilyMembers] = useState("");
  const [place, setPlace] = useState("");
  const [parentMessage, setParentMessage] = useState("");
  const [outfitMode, setOutfitMode] = useState<OutfitMode>("profile_default");
  const [customOutfit, setCustomOutfit] = useState("");
  const [keepSignatureItem, setKeepSignatureItem] = useState(true);
  const [showOptional, setShowOptional] = useState(creationMode === "fixed_template");
  const missingTemplateFields = getMissingTemplateFields({
    requiredInputs,
    place,
    familyMembers,
    parentMessage,
    lessonToTeach,
    memoryToRecreate,
    storyRequest,
  });
  const canProceed = Boolean(childId && child && theme) && (creationMode !== "fixed_template" || missingTemplateFields.length === 0);

  const handleNext = () => {
    const params = new URLSearchParams();
    params.set("theme", theme);
    params.set("mode", creationMode);
    params.set("childId", childId);
    params.set("outfitMode", outfitMode);
    params.set("keepSignatureItem", String(keepSignatureItem));
    if (creationMode !== "fixed_template") {
      params.set("pageCount", String(pageCount));
    }
    if (storyRequest) params.set("storyRequest", storyRequest);
    if (lessonToTeach) params.set("lessonToTeach", lessonToTeach);
    if (memoryToRecreate) params.set("memoryToRecreate", memoryToRecreate);
    if (familyMembers) params.set("familyMembers", familyMembers);
    if (place) params.set("place", place);
    if (parentMessage) params.set("parentMessage", parentMessage);
    if (customOutfit) params.set("customOutfit", customOutfit);
    router.push(`/create/style?${params.toString()}`);
  };

  const primaryFieldLabel =
    creationMode === "fixed_template"
      ? "このテンプレートに入れる情報"
      : creationMode === "original_ai"
        ? "どんな絵本にしたい？"
        : "今回の絵本で描きたいこと";

  return (
    <PageTransition className="mx-auto max-w-lg px-4 py-8">
      <StepIndicator currentStep={2} />
      <h1 className="mt-6 text-center text-xl font-bold text-purple-900">おしえてね</h1>
      <Card className="mt-6">
        <CardContent className="space-y-4 p-6">
          <div className="rounded-2xl bg-purple-50 p-4 text-sm text-violet-600">
            {childrenLoading
              ? "主人公を確認中..."
              : child
                ? `主人公: ${child.nickname || child.displayName}${child.age ? `（${child.age}歳）` : ""}`
                : "主人公が選択されていません。戻って選択してください。"}
          </div>

          {templatesLoading ? (
            <div className="rounded-2xl bg-violet-50 p-4 text-sm text-violet-500">テンプレート情報を読み込み中...</div>
          ) : template ? (
            <div className="rounded-2xl border border-[rgba(240,171,252,0.3)] bg-white p-4 text-sm text-violet-600">
              <p className="font-semibold text-purple-900">{template.name}</p>
              <p className="mt-1">{template.description}</p>
              {creationMode === "fixed_template" ? (
                <div className="mt-2 space-y-1 text-xs text-violet-500">
                  <p>このテンプレートは、決まった物語にお子さんの名前や思い出を差し込んで作ります。早く・安定して作れます。</p>
                  <p>
                    必須: {requiredInputs.map((item) => INPUT_LABELS[item] ?? item).join(" / ") || "お子さんの名前"}
                  </p>
                  <p>
                    任意: {optionalInputs.map((item) => INPUT_LABELS[item] ?? item).join(" / ") || "なし"}
                  </p>
                </div>
              ) : null}
            </div>
          ) : null}

          {creationMode === "original_ai" ? (
            <div>
              <Label htmlFor="storyRequest" className="text-purple-800">{primaryFieldLabel}</Label>
              <textarea
                id="storyRequest"
                value={storyRequest}
                onChange={(e) => setStoryRequest(e.target.value)}
                placeholder="自由に書いてOKです。主人公、場所、気持ち、起きてほしいことなどをまとめて書けます。"
                className="mt-1 min-h-40 w-full rounded-[20px] border border-[rgba(240,171,252,0.3)] bg-background px-3 py-3 text-sm focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400/50"
                rows={6}
                maxLength={800}
              />
            </div>
          ) : creationMode === "fixed_template" ? (
            <div className="space-y-3">
              <p className="text-sm text-violet-600">
                このテンプレートに必要な情報だけ入れると、早く安定して絵本を作れます。
              </p>
              <div className="rounded-2xl bg-violet-50 p-4 text-sm text-violet-600">
                <p className="font-medium text-purple-900">{primaryFieldLabel}</p>
                <p className="mt-1">このテンプレートは、決まった物語にお子さんの名前や思い出を差し込んで作ります。早く・安定して作れます。</p>
              </div>
              {shouldShowTemplateField("place", requiredInputs, optionalInputs) ? (
                <div>
                  <Label htmlFor="place-fixed" className="text-purple-800">どこでの思い出？</Label>
                  <Input
                    id="place-fixed"
                    value={place}
                    onChange={(e) => setPlace(e.target.value)}
                    placeholder="例：上野動物園、近所の公園"
                    className="mt-1"
                    maxLength={200}
                  />
                </div>
              ) : null}
              {shouldShowTemplateField("familyMembers", requiredInputs, optionalInputs) ? (
                <div>
                  <Label htmlFor="familyMembers-fixed" className="text-purple-800">だれと一緒だった？</Label>
                  <Input
                    id="familyMembers-fixed"
                    value={familyMembers}
                    onChange={(e) => setFamilyMembers(e.target.value)}
                    placeholder="例：ママ、パパ、おばあちゃん"
                    className="mt-1"
                    maxLength={200}
                  />
                </div>
              ) : null}
              <div>
                <Label htmlFor="parentMessage-fixed" className="text-purple-800">最後に伝えたい言葉</Label>
                <textarea
                  id="parentMessage-fixed"
                  value={parentMessage}
                  onChange={(e) => setParentMessage(e.target.value)}
                  placeholder="例：また一緒に行こうね"
                  className="mt-1 w-full rounded-[20px] border border-[rgba(240,171,252,0.3)] bg-background px-3 py-2 text-sm focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400/50"
                  rows={3}
                  maxLength={200}
                />
              </div>
            </div>
          ) : (
            <div>
              <Label htmlFor="storyRequest" className="text-purple-800">{primaryFieldLabel}</Label>
              <Input
                id="storyRequest"
                value={storyRequest}
                onChange={(e) => setStoryRequest(e.target.value)}
                placeholder={storyPlaceholder}
                className="mt-1"
                maxLength={200}
              />
            </div>
          )}

          <button
            type="button"
            onClick={() => setShowOptional(!showOptional)}
            className="text-sm text-violet-600 hover:underline"
          >
            {showOptional ? "▲ シンプルに戻す" : "▼ もっとカスタマイズ"}
          </button>

          {showOptional && (
            <div className="space-y-4 border-t border-[rgba(240,171,252,0.3)] pt-4">
              <div className="space-y-2">
                <Label className="text-purple-800">服装をどうしますか？</Label>
                <div className="grid gap-2">
                  {[
                    { value: "profile_default", label: "いつもの服装を使う" },
                    { value: "theme_auto", label: "絵本テーマに合わせてAIにおまかせ" },
                    { value: "user_custom", label: "自分で指定する" },
                  ].map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setOutfitMode(option.value as OutfitMode)}
                      className={`rounded-2xl border px-3 py-3 text-left text-sm transition ${
                        outfitMode === option.value
                          ? "border-purple-400 bg-purple-50 text-purple-700"
                          : "border-[rgba(240,171,252,0.3)] text-violet-500"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {outfitMode === "user_custom" ? (
                <div>
                  <Label htmlFor="customOutfit" className="text-purple-800">指定したい服装</Label>
                  <Input
                    id="customOutfit"
                    value={customOutfit}
                    onChange={(e) => setCustomOutfit(e.target.value)}
                    placeholder="例：赤いパーカー、黄色い長靴、白いリュック"
                    className="mt-1"
                    maxLength={200}
                  />
                </div>
              ) : null}

              <label className="flex items-center gap-2 rounded-2xl bg-purple-50 p-3 text-sm text-violet-600">
                <input type="checkbox" checked={keepSignatureItem} onChange={(e) => setKeepSignatureItem(e.target.checked)} />
                固定アイテムをできるだけ出す
              </label>

              {creationMode === "fixed_template" ? (
                <div className="rounded-2xl bg-violet-50 p-3 text-sm text-violet-600">
                  ページ数: テンプレートに合わせます
                </div>
              ) : (
                <div>
                  <Label className="text-purple-800">ページ数</Label>
                  <div className="mt-1 flex gap-2">
                    {PAGE_COUNT_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setPageCount(opt.value)}
                        className={`flex-1 rounded-full border px-2 py-2 text-xs transition ${
                          pageCount === opt.value
                            ? "border-purple-400 bg-[rgba(167,139,250,0.1)] font-medium text-purple-700"
                            : "border-[rgba(240,171,252,0.3)] text-violet-400 hover:border-purple-300"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {creationMode !== "fixed_template" ? (
                <div>
                  <Label htmlFor="lesson" className="text-purple-800">教えたいこと</Label>
                  <Input
                    id="lesson"
                    value={lessonToTeach}
                    onChange={(e) => setLessonToTeach(e.target.value)}
                    placeholder="例：はみがきをがんばる"
                    className="mt-1"
                    maxLength={200}
                  />
                </div>
              ) : null}

              {creationMode !== "fixed_template" ? (
                <>
                  <div>
                    <Label htmlFor="place-optional" className="text-purple-800">場所</Label>
                    <Input
                      id="place-optional"
                      value={place}
                      onChange={(e) => setPlace(e.target.value)}
                      placeholder="例：上野動物園、近所の公園"
                      className="mt-1"
                      maxLength={200}
                    />
                  </div>

                  <div>
                    <Label htmlFor="familyMembers" className="text-purple-800">一緒に登場させたい人</Label>
                    <Input
                      id="familyMembers"
                      value={familyMembers}
                      onChange={(e) => setFamilyMembers(e.target.value)}
                      placeholder="例：ママ、パパ、おばあちゃん"
                      className="mt-1"
                      maxLength={200}
                    />
                  </div>
                </>
              ) : null}

              {creationMode !== "fixed_template" ? (
                <div>
                  <Label htmlFor="memory" className="text-purple-800">再現したい思い出</Label>
                  <textarea
                    id="memory"
                    value={memoryToRecreate}
                    onChange={(e) => setMemoryToRecreate(e.target.value)}
                    placeholder="例：おばあちゃんの家に遊びに行った"
                    className="mt-1 w-full rounded-[20px] border border-[rgba(240,171,252,0.3)] bg-background px-3 py-2 text-sm focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400/50"
                    rows={3}
                    maxLength={200}
                  />
                </div>
              ) : null}

              {creationMode !== "fixed_template" ? (
                <div>
                  <Label htmlFor="parentMessage" className="text-purple-800">最後に伝えたい言葉</Label>
                  <textarea
                    id="parentMessage"
                    value={parentMessage}
                    onChange={(e) => setParentMessage(e.target.value)}
                    placeholder="例：これからもたくさん一緒に冒険しようね"
                    className="mt-1 w-full rounded-[20px] border border-[rgba(240,171,252,0.3)] bg-background px-3 py-2 text-sm focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400/50"
                    rows={3}
                    maxLength={200}
                  />
                </div>
              ) : null}
            </div>
          )}
        </CardContent>
      </Card>
      <div className="mt-8 flex justify-center">
        <div className="flex flex-col items-center gap-2">
          {creationMode === "fixed_template" && missingTemplateFields.length > 0 ? (
            <p className="text-sm text-rose-600">テンプレートに必要な情報を入力してください</p>
          ) : null}
          <Button onClick={handleNext} disabled={!canProceed} className="px-8">次へ</Button>
        </div>
      </div>
    </PageTransition>
  );
}

export default function InputPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-violet-400">読み込み中...</div>}>
      <InputPageContent />
    </Suspense>
  );
}

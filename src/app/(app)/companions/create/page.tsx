"use client";

import { Suspense, useState, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageTransition } from "@/components/page-transition";
import { useAuth } from "@/lib/hooks/use-auth";
import { useUserProfile } from "@/lib/hooks/use-user-profile";
import { useAdminClaim } from "@/lib/hooks/use-admin-claim";
import { PLAN_CONFIGS, resolveProductPlan } from "@/lib/plans";
import { useCompanions } from "../use-companions-hook";
import {
  SPECIES_OPTIONS,
  PERSONALITY_OPTIONS,
  ABILITY_OPTIONS,
  COLOR_OPTIONS,
  BODY_TYPE_OPTIONS,
  COLOR_DEPTH_OPTIONS,
  SIZE_OPTIONS,
  PATTERN_OPTIONS,
  ACCESSORY_OPTIONS,
  buildVisualDescription,
} from "../companions-utils";
import { cn } from "@/lib/utils";
import { Loader2, ChevronRight, ChevronLeft, Check, Sparkles } from "lucide-react";
import { CompanionSpecies } from "@/lib/types";

type Step =
  | "species"
  | "personality"
  | "ability"
  | "color"
  | "bodyType"
  | "colorDepth"
  | "pattern"
  | "accessory"
  | "size"
  | "name"
  | "confirm";
const STEPS: Step[] = [
  "species",
  "personality",
  "ability",
  "color",
  "bodyType",
  "colorDepth",
  "pattern",
  "accessory",
  "size",
  "name",
  "confirm",
];

function CreateCompanionContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get("returnTo");
  const { user } = useAuth();
  const { profile } = useUserProfile(user?.uid);
  const { isAdmin } = useAdminClaim();
  const { companions, addCompanion, loading: companionsLoading } = useCompanions(user?.uid);

  const [step, setStep] = useState<Step>("species");
  const [species, setSpecies] = useState<CompanionSpecies | "">("");
  const [personalities, setPersonalities] = useState<string[]>([]);
  const [ability, setAbility] = useState("");
  const [color, setColor] = useState("");
  const [bodyType, setBodyType] = useState("");
  const [colorDepth, setColorDepth] = useState("");
  const [pattern, setPattern] = useState("");
  const [accessories, setAccessories] = useState<string[]>([]);
  const [size, setSize] = useState<"small" | "medium" | "large" | "">("");
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const maxCompanions = useMemo(() => {
    // 管理者はなかよしキャラを無制限に作成できる（開発・全プラン確認用）。
    if (isAdmin) return Infinity;
    const productPlan = resolveProductPlan(profile);
    return PLAN_CONFIGS[productPlan]?.maxCompanions ?? 2;
  }, [profile, isAdmin]);

  const isLimitReached = companions.length >= maxCompanions;

  const currentStepIndex = STEPS.indexOf(step);
  const progress = ((currentStepIndex + 1) / STEPS.length) * 100;

  const canGoNext = useMemo(() => {
    if (step === "species") return !!species;
    if (step === "personality") return personalities.length > 0;
    if (step === "ability") return !!ability;
    if (step === "color") return !!color;
    if (step === "bodyType") return !!bodyType;
    if (step === "colorDepth") return !!colorDepth;
    if (step === "pattern") return !!pattern;
    if (step === "accessory") return true;
    if (step === "size") return !!size;
    if (step === "name") return name.trim().length > 0;
    return true;
  }, [step, species, personalities, ability, color, pattern, size, name, bodyType, colorDepth]);

  const handleNext = () => {
    const nextStep = STEPS[currentStepIndex + 1];
    if (nextStep) setStep(nextStep);
  };

  const handleBack = () => {
    const prevStep = STEPS[currentStepIndex - 1];
    if (prevStep) setStep(prevStep);
    else router.back();
  };

  const togglePersonality = (val: string) => {
    if (personalities.includes(val)) {
      setPersonalities(personalities.filter((p) => p !== val));
    } else if (personalities.length < 2) {
      setPersonalities([...personalities, val]);
    }
  };

  const toggleAccessory = (val: string) => {
    if (accessories.includes(val)) {
      setAccessories(accessories.filter((a) => a !== val));
    } else if (accessories.length < 2) {
      setAccessories([...accessories, val]);
    }
  };

  const handleSubmit = async () => {
    if (!species || !size || !user) return;
    setIsSubmitting(true);
    try {
      const visualDescription = buildVisualDescription({
        species: species as CompanionSpecies,
        personalities,
        ability,
        color,
        bodyType,
        colorDepth,
        size: size as "small" | "medium" | "large",
        pattern,
        accessories,
      });

      const companionId = await addCompanion({
        name,
        species: species as CompanionSpecies,
        personality: personalities,
        specialAbility: ABILITY_OPTIONS.find((o) => o.value === ability)?.label || "",
        colorMain: COLOR_OPTIONS.find((o) => o.value === color)?.hex || "#FFFFFF",
        bodyType,
        colorDepth,
        size: size as "small" | "medium" | "large",
        visualDescription,
      });

      try {
        const { db } = await import("@/lib/firebase");
        const { collection: col, doc, writeBatch, serverTimestamp: sts } = await import("firebase/firestore");
        const batch = writeBatch(db);
        const jobRef = doc(col(db, "companionImageJobs"));
        batch.set(jobRef, {
          userId: user.uid,
          companionId,
          status: "pending",
          createdAt: sts(),
          updatedAt: sts(),
        });
        batch.update(doc(db, "companions", companionId), {
          imageGenerationStatus: "pending",
        });
        await batch.commit();
      } catch {
        // 画像生成の失敗は致命的ではない
      }

      if (returnTo) {
        router.push(returnTo);
      } else {
        router.push(`/companions/profile?id=${companionId}`);
      }
    } catch (err) {
      console.error(err);
      alert("保存に失敗しました");
      setIsSubmitting(false);
    }
  };

  if (companionsLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-violet-400" />
      </div>
    );
  }

  if (isLimitReached) {
    return (
      <PageTransition className="mx-auto max-w-2xl px-4 py-8">
        <Card className="border-none shadow-xl shadow-purple-100/50">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 text-3xl">
              ⚠️
            </div>
            <CardTitle className="text-2xl text-purple-900">作成上限に達しています</CardTitle>
            <CardDescription className="text-lg">
              現在のプランでは、なかよしキャラは最大{maxCompanions}体まで作成できます。
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-violet-500">
              新しいなかよしキャラを作るには、既存のなかよしキャラを削除するか、プランをアップグレードしてください。
            </p>
            <div className="mt-8 flex flex-col gap-3">
              <Link href="/pricing">
                <Button size="lg" className="w-full gap-2">
                  <Sparkles className="size-4" />
                  プランをアップグレード
                </Button>
              </Link>
              <Link href="/companions">
                <Button variant="outline" className="w-full">
                  なかよし一覧に戻る
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </PageTransition>
    );
  }

  return (
    <PageTransition className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-purple-900">なかよしキャラを作る</h1>
          <span className="text-sm font-medium text-violet-400">
            ステップ {currentStepIndex + 1} / {STEPS.length}
          </span>
        </div>
        <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-violet-100">
          <div
            className="h-full bg-gradient-to-r from-purple-400 to-violet-400 transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <Card className="border-none shadow-xl shadow-purple-100/50">
        <CardHeader>
          <CardTitle className="text-2xl text-purple-900">
            {step === "species" && "どんな動物・生き物にする？"}
            {step === "personality" && "どんな性格かな？"}
            {step === "ability" && "とくいなことは？"}
            {step === "color" && "何色かな？"}
            {step === "bodyType" && "体型はどんなかな？"}
            {step === "colorDepth" && "色の濃さはどんなかな？"}
            {step === "pattern" && "もようはどんなかな？"}
            {step === "accessory" && "なにかつけてみる？"}
            {step === "size" && "大きさはどのくらい？"}
            {step === "name" && "名前をつけよう！"}
            {step === "confirm" && "これで決まり！"}
          </CardTitle>
          <CardDescription>
            {step === "personality" && "最大2つまで選べます。"}
            {step === "accessory" && "最大2つまで選べます。つけなくてもOK！"}
            {step === "name" && "呼びやすい名前をつけてあげてね。"}
          </CardDescription>
        </CardHeader>

        <CardContent className="min-h-[300px]">
          {step === "species" && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {SPECIES_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setSpecies(opt.value)}
                  className={cn(
                    "relative flex flex-col items-center justify-center gap-1.5 rounded-2xl border-2 p-3 transition-all",
                    species === opt.value
                      ? "border-purple-500 bg-purple-50 shadow-sm"
                      : "border-transparent bg-violet-50/50 hover:bg-violet-50"
                  )}
                >
                  {opt.imageUrl ? (
                    <div className="relative h-20 w-20 overflow-hidden rounded-xl">
                      <Image src={opt.imageUrl} alt={opt.label} fill className="object-cover" unoptimized />
                    </div>
                  ) : (
                    <span className="text-4xl leading-none py-2">{opt.emoji}</span>
                  )}
                  <span className="text-sm font-medium text-purple-900">{opt.label}</span>
                  {species === opt.value && (
                    <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-purple-500 text-white text-xs">✓</span>
                  )}
                </button>
              ))}
            </div>
          )}

          {step === "bodyType" && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {BODY_TYPE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setBodyType(opt.value)}
                  className={cn(
                    "rounded-2xl border-2 px-4 py-6 text-center transition-all",
                    bodyType === opt.value
                      ? "border-purple-500 bg-purple-50 text-purple-900"
                      : "border-transparent bg-violet-50/50 text-violet-600 hover:bg-violet-50"
                  )}
                >
                  <span className="font-medium">{opt.label}</span>
                </button>
              ))}
            </div>
          )}

          {step === "colorDepth" && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {COLOR_DEPTH_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setColorDepth(opt.value)}
                  className={cn(
                    "rounded-2xl border-2 px-4 py-6 text-center transition-all",
                    colorDepth === opt.value
                      ? "border-purple-500 bg-purple-50 text-purple-900"
                      : "border-transparent bg-violet-50/50 text-violet-600 hover:bg-violet-50"
                  )}
                >
                  <span className="font-medium">{opt.label}</span>
                </button>
              ))}
            </div>
          )}

          {step === "personality" && (
            <div className="grid grid-cols-2 gap-3">
              {PERSONALITY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => togglePersonality(opt.value)}
                  className={cn(
                    "rounded-2xl border-2 px-4 py-6 text-center transition-all",
                    personalities.includes(opt.value)
                      ? "border-purple-500 bg-purple-50 text-purple-900"
                      : "border-transparent bg-violet-50/50 text-violet-600 hover:bg-violet-50"
                  )}
                >
                  <span className="font-medium">{opt.label}</span>
                </button>
              ))}
            </div>
          )}

          {step === "ability" && (
            <div className="space-y-3">
              {ABILITY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setAbility(opt.value)}
                  className={cn(
                    "flex w-full items-center justify-between rounded-2xl border-2 px-6 py-4 transition-all",
                    ability === opt.value
                      ? "border-purple-500 bg-purple-50 text-purple-900"
                      : "border-transparent bg-violet-50/50 text-violet-600 hover:bg-violet-50"
                  )}
                >
                  <span className="font-medium">{opt.label}</span>
                  {ability === opt.value && <Check className="size-5 text-purple-500" />}
                </button>
              ))}
            </div>
          )}

          {step === "color" && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
              {COLOR_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setColor(opt.value)}
                  className={cn(
                    "flex flex-col items-center gap-2 rounded-2xl border-2 p-3 transition-all",
                    color === opt.value
                      ? "border-purple-500 bg-purple-50"
                      : "border-transparent bg-violet-50/50 hover:bg-violet-50"
                  )}
                >
                  <div className="size-8 rounded-full border border-violet-100" style={{ backgroundColor: opt.hex }} />
                  <span className="text-xs font-medium text-purple-900">{opt.label}</span>
                </button>
              ))}
            </div>
          )}

          {step === "pattern" && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {PATTERN_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setPattern(opt.value)}
                  className={cn(
                    "flex flex-col items-center gap-1.5 rounded-2xl border-2 p-3 transition-all",
                    pattern === opt.value
                      ? "border-purple-500 bg-purple-50"
                      : "border-transparent bg-violet-50/50 hover:bg-violet-50"
                  )}
                >
                  {opt.imageUrl ? (
                    <div className="relative h-14 w-14 overflow-hidden rounded-xl border border-violet-100 bg-white shadow-sm">
                      <Image src={opt.imageUrl} alt={`${opt.label}のもよう`} fill className="object-cover" />
                    </div>
                  ) : (
                    <span className="text-3xl leading-none">{opt.emoji}</span>
                  )}
                  <span className="text-xs font-medium text-purple-900">{opt.label}</span>
                </button>
              ))}
            </div>
          )}

          {step === "accessory" && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {ACCESSORY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => toggleAccessory(opt.value)}
                  className={cn(
                    "relative flex flex-col items-center gap-1.5 rounded-2xl border-2 p-3 transition-all",
                    accessories.includes(opt.value)
                      ? "border-purple-500 bg-purple-50"
                      : "border-transparent bg-violet-50/50 hover:bg-violet-50"
                  )}
                >
                  <span className="text-3xl leading-none">{opt.emoji}</span>
                  <span className="text-xs font-medium text-purple-900">{opt.label}</span>
                  {accessories.includes(opt.value) && (
                    <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-purple-500 text-white text-xs">✓</span>
                  )}
                </button>
              ))}
            </div>
          )}

          {step === "size" && (
            <div className="grid grid-cols-1 gap-3">
              {SIZE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setSize(opt.value)}
                  className={cn(
                    "flex items-center gap-4 rounded-2xl border-2 px-6 py-5 transition-all",
                    size === opt.value
                      ? "border-purple-500 bg-purple-50 text-purple-900"
                      : "border-transparent bg-violet-50/50 text-violet-600 hover:bg-violet-50"
                  )}
                >
                  <span className={cn(
                    "font-bold",
                    opt.value === "small" ? "text-lg" : opt.value === "large" ? "text-3xl" : "text-2xl"
                  )}>
                    {opt.value === "small" ? "🐭" : opt.value === "large" ? "🐘" : "🐕"}
                  </span>
                  <span className="font-medium">{opt.label}</span>
                </button>
              ))}
            </div>
          )}

          {step === "name" && (
            <div className="flex h-full flex-col justify-center gap-6">
              <div className="space-y-2">
                <Label htmlFor="companion-name">なまえ</Label>
                <Input
                  id="companion-name"
                  placeholder="例: モコ、チョコ、ピコ"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-14 rounded-2xl border-violet-100 text-lg focus-visible:ring-purple-400"
                  autoFocus
                />
              </div>
            </div>
          )}

          {step === "confirm" && (
            <div className="space-y-6">
              <div className="flex items-center gap-4 rounded-3xl bg-violet-50 p-6">
                <div className="relative h-20 w-20 overflow-hidden rounded-2xl bg-white shadow-sm">
                  {SPECIES_OPTIONS.find(o => o.value === species)?.imageUrl ? (
                    <Image
                      src={SPECIES_OPTIONS.find(o => o.value === species)!.imageUrl!}
                      alt={SPECIES_OPTIONS.find(o => o.value === species)?.label ?? ""}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center text-5xl">
                      {SPECIES_OPTIONS.find(o => o.value === species)?.emoji}
                    </span>
                  )}
                </div>
                <div>
                  <div className="text-2xl font-bold text-purple-900">{name}</div>
                  <div className="text-sm text-violet-500">
                    {SPECIES_OPTIONS.find(o => o.value === species)?.label}
                  </div>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-violet-100 p-4">
                  <div className="text-xs font-semibold text-violet-300">性格</div>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {personalities.map(p => (
                      <span key={p} className="text-sm font-medium text-purple-700">
                        {PERSONALITY_OPTIONS.find(o => o.value === p)?.label}
                      </span>
                    )).reduce<React.ReactNode[]>((acc, curr, i) => i === 0 ? [curr] : [...acc, " / ", curr], [])}
                  </div>
                </div>
                <div className="rounded-2xl border border-violet-100 p-4">
                  <div className="text-xs font-semibold text-violet-300">とくいなこと</div>
                  <div className="mt-1 text-sm font-medium text-purple-700">
                    {ABILITY_OPTIONS.find(o => o.value === ability)?.label}
                  </div>
                </div>
                <div className="rounded-2xl border border-violet-100 p-4">
                  <div className="text-xs font-semibold text-violet-300">カラー</div>
                  <div className="mt-1 flex items-center gap-2">
                    <div className="size-4 rounded-full border border-violet-100" style={{ backgroundColor: COLOR_OPTIONS.find(o => o.value === color)?.hex }} />
                    <span className="text-sm font-medium text-purple-700">{COLOR_OPTIONS.find(o => o.value === color)?.label}</span>
                  </div>
                </div>
                <div className="rounded-2xl border border-violet-100 p-4">
                  <div className="text-xs font-semibold text-violet-300">体型</div>
                  <div className="mt-1 text-sm font-medium text-purple-700">
                    {BODY_TYPE_OPTIONS.find(o => o.value === bodyType)?.label}
                  </div>
                </div>
                <div className="rounded-2xl border border-violet-100 p-4">
                  <div className="text-xs font-semibold text-violet-300">色の濃さ</div>
                  <div className="mt-1 text-sm font-medium text-purple-700">
                    {COLOR_DEPTH_OPTIONS.find(o => o.value === colorDepth)?.label}
                  </div>
                </div>
                <div className="rounded-2xl border border-violet-100 p-4">
                  <div className="text-xs font-semibold text-violet-300">大きさ</div>
                  <div className="mt-1 text-sm font-medium text-purple-700">
                    {SIZE_OPTIONS.find(o => o.value === size)?.label}
                  </div>
                </div>
                <div className="rounded-2xl border border-violet-100 p-4">
                  <div className="text-xs font-semibold text-violet-300">もよう</div>
                  <div className="mt-1 flex items-center gap-2 text-sm font-medium text-purple-700">
                    {PATTERN_OPTIONS.find(o => o.value === pattern)?.imageUrl ? (
                      <div className="relative size-6 overflow-hidden rounded-md border border-violet-100">
                        <Image
                          src={PATTERN_OPTIONS.find(o => o.value === pattern)!.imageUrl!}
                          alt={`${PATTERN_OPTIONS.find(o => o.value === pattern)?.label ?? "むじ"}のもよう`}
                          fill
                          className="object-cover"
                        />
                      </div>
                    ) : null}
                    <span>{PATTERN_OPTIONS.find(o => o.value === pattern)?.label ?? "むじ"}</span>
                  </div>
                </div>
                <div className="rounded-2xl border border-violet-100 p-4">
                  <div className="text-xs font-semibold text-violet-300">アクセサリ</div>
                  <div className="mt-1 text-sm font-medium text-purple-700">
                    {accessories.length > 0
                      ? accessories.map(a => ACCESSORY_OPTIONS.find(o => o.value === a)?.label).filter(Boolean).join(" / ")
                      : "なし"}
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>

        <div className="flex items-center justify-between border-t border-violet-50 p-6">
          <Button variant="ghost" onClick={handleBack} disabled={isSubmitting}>
            <ChevronLeft className="mr-2 size-4" />
            戻る
          </Button>
          {step === "confirm" ? (
            <Button onClick={handleSubmit} disabled={isSubmitting} size="lg" className="px-8">
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  保存中...
                </>
              ) : (
                "なかよしキャラを作る！"
              )}
            </Button>
          ) : (
            <Button onClick={handleNext} disabled={!canGoNext} size="lg" className="px-8">
              次へ
              <ChevronRight className="ml-2 size-4" />
            </Button>
          )}
        </div>
      </Card>
    </PageTransition>
  );
}

export default function CreateCompanionPage() {
  return (
    <Suspense fallback={<div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="size-8 animate-spin text-violet-400" /></div>}>
      <CreateCompanionContent />
    </Suspense>
  );
}

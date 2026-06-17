"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageTransition } from "@/components/page-transition";
import { useAuth } from "@/lib/hooks/use-auth";
import { useOriginalCharacters } from "@/lib/hooks/use-original-characters";
import { cn } from "@/lib/utils";
import { Loader2, ChevronRight, ChevronLeft, Check } from "lucide-react";
import {
  ROLE_OPTIONS,
  PERSONALITY_OPTIONS,
  MOOD_OPTIONS,
  COLOR_OPTIONS,
  POWER_OPTIONS,
  QUIRK_OPTIONS,
  buildCharacterBible,
  buildBasePrompt
} from "../original-characters-utils";
import { CharacterRole } from "@/lib/types";

type Step =
  | "role"
  | "personality"
  | "mood"
  | "color"
  | "power"
  | "quirk"
  | "species"
  | "name"
  | "confirm";

const STEPS: Step[] = [
  "role",
  "personality",
  "mood",
  "color",
  "power",
  "quirk",
  "species",
  "name",
  "confirm",
];

export default function CreateOriginalCharacterPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { addCharacter } = useOriginalCharacters(user?.uid);

  const [step, setStep] = useState<Step>("role");
  const [role, setRole] = useState<CharacterRole | "">("");
  const [personalities, setPersonalities] = useState<string[]>([]);
  const [mood, setMood] = useState("");
  const [color, setColor] = useState("");
  const [power, setPower] = useState("");
  const [quirk, setQuirk] = useState("");
  const [species, setSpecies] = useState("");
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentStepIndex = STEPS.indexOf(step);
  const progress = ((currentStepIndex + 1) / STEPS.length) * 100;

  const canGoNext = useMemo(() => {
    if (step === "role") return !!role;
    if (step === "personality") return personalities.length > 0;
    if (step === "mood") return !!mood;
    if (step === "color") return !!color;
    if (step === "power") return !!power;
    if (step === "quirk") return !!quirk;
    if (step === "species") return species.trim().length > 0;
    if (step === "name") return name.trim().length > 0;
    return true;
  }, [step, role, personalities, mood, color, power, quirk, species, name]);

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
    } else if (personalities.length < 3) {
      setPersonalities([...personalities, val]);
    }
  };

  const handleSubmit = async () => {
    if (!user || !role || !species || !name) return;
    setIsSubmitting(true);
    try {
      const characterBible = buildCharacterBible({
        name,
        species,
        role: ROLE_OPTIONS.find(o => o.value === role)?.label || role,
        personalityTraits: personalities,
        specialPower: power,
        weaknessOrQuirk: quirk,
        visualProfile: {
          bodyShape: mood,
          mainColor: COLOR_OPTIONS.find(o => o.value === color)?.label || color,
          faceFeatures: "expressive",
        }
      });

      const basePrompt = buildBasePrompt({
        name,
        species,
        personalityTraits: personalities,
        specialPower: power,
        mainColor: COLOR_OPTIONS.find(o => o.value === color)?.label || color,
        visualMood: mood,
      });

      const characterId = await addCharacter({
        name,
        species,
        role: role as CharacterRole,
        personalityTraits: personalities,
        specialPower: power,
        weaknessOrQuirk: quirk,
        visualProfile: {
          bodyShape: mood,
          mainColor: COLOR_OPTIONS.find(o => o.value === color)?.label || color,
          faceFeatures: "expressive",
          sizeFeeling: "standard",
          characterBible,
          basePrompt,
          version: 1,
        },
        storyUsage: {
          suitableThemes: [],
          avoidThemes: [],
          defaultRoleInStory: role,
        },
        active: true,
      });

      router.push(`/original-characters?id=${characterId}`);
    } catch (err) {
      console.error(err);
      alert("保存に失敗しました");
      setIsSubmitting(false);
    }
  };

  return (
    <PageTransition className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-purple-900">ふしぎな相棒をつくろう</h1>
          <span className="text-sm font-medium text-violet-400">
            {currentStepIndex + 1} / {STEPS.length}
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
            {step === "role" && "どんな役割の相棒にしたい？"}
            {step === "personality" && "どんな性格かな？"}
            {step === "mood" && "見た目の雰囲気は？"}
            {step === "color" && "メインカラーは何色？"}
            {step === "power" && "どんなとくべつな力がある？"}
            {step === "quirk" && "ちょっとしたクセはある？"}
            {step === "species" && "どんな種類の生き物・存在？"}
            {step === "name" && "なまえをつけよう！"}
            {step === "confirm" && "これで決まり！"}
          </CardTitle>
          <CardDescription>
            {step === "personality" && "最大3つまで選べます。"}
            {step === "species" && "例：くもの子、星の妖精、小さなドラゴン"}
          </CardDescription>
        </CardHeader>

        <CardContent className="min-h-[300px]">
          {step === "role" && (
            <div className="grid gap-3">
              {ROLE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setRole(opt.value)}
                  className={cn(
                    "flex w-full flex-col items-start gap-1 rounded-2xl border-2 px-6 py-4 text-left transition-all",
                    role === opt.value
                      ? "border-purple-500 bg-purple-50"
                      : "border-transparent bg-violet-50/50 hover:bg-violet-50"
                  )}
                >
                  <span className="font-bold text-purple-900">{opt.label}</span>
                  <span className="text-xs text-violet-500">{opt.description}</span>
                </button>
              ))}
            </div>
          )}

          {step === "personality" && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {PERSONALITY_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  onClick={() => togglePersonality(opt)}
                  className={cn(
                    "rounded-2xl border-2 px-4 py-6 text-center transition-all",
                    personalities.includes(opt)
                      ? "border-purple-500 bg-purple-50 text-purple-900"
                      : "border-transparent bg-violet-50/50 text-violet-600 hover:bg-violet-50"
                  )}
                >
                  <span className="font-medium">{opt}</span>
                </button>
              ))}
            </div>
          )}

          {step === "mood" && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {MOOD_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  onClick={() => setMood(opt)}
                  className={cn(
                    "rounded-2xl border-2 px-4 py-6 text-center transition-all",
                    mood === opt
                      ? "border-purple-500 bg-purple-50 text-purple-900"
                      : "border-transparent bg-violet-50/50 text-violet-600 hover:bg-violet-50"
                  )}
                >
                  <span className="font-medium">{opt}</span>
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
                  <div
                    className="size-8 rounded-full border border-violet-100"
                    style={{ backgroundColor: opt.hex }}
                  />
                  <span className="text-[10px] font-medium text-purple-900">{opt.label}</span>
                </button>
              ))}
            </div>
          )}

          {step === "power" && (
            <div className="grid gap-3">
              {POWER_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  onClick={() => setPower(opt)}
                  className={cn(
                    "flex w-full items-center justify-between rounded-2xl border-2 px-6 py-4 transition-all text-left",
                    power === opt
                      ? "border-purple-500 bg-purple-50 text-purple-900"
                      : "border-transparent bg-violet-50/50 text-violet-600 hover:bg-violet-50"
                  )}
                >
                  <span className="font-medium">{opt}</span>
                  {power === opt && <Check className="size-5 text-purple-500" />}
                </button>
              ))}
            </div>
          )}

          {step === "quirk" && (
            <div className="grid gap-3">
              {QUIRK_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  onClick={() => setQuirk(opt)}
                  className={cn(
                    "flex w-full items-center justify-between rounded-2xl border-2 px-6 py-4 transition-all text-left",
                    quirk === opt
                      ? "border-purple-500 bg-purple-50 text-purple-900"
                      : "border-transparent bg-violet-50/50 text-violet-600 hover:bg-violet-50"
                  )}
                >
                  <span className="font-medium">{opt}</span>
                  {quirk === opt && <Check className="size-5 text-purple-500" />}
                </button>
              ))}
            </div>
          )}

          {step === "species" && (
            <div className="flex h-full flex-col justify-center gap-6">
              <div className="space-y-2">
                <Label htmlFor="char-species">種類・そんざい</Label>
                <Input
                  id="char-species"
                  placeholder="例: こわい気持ちを食べる小さな雲の子"
                  value={species}
                  onChange={(e) => setSpecies(e.target.value)}
                  className="h-14 rounded-2xl border-violet-100 text-lg focus-visible:ring-purple-400"
                  autoFocus
                />
              </div>
            </div>
          )}

          {step === "name" && (
            <div className="flex h-full flex-col justify-center gap-6">
              <div className="space-y-2">
                <Label htmlFor="char-name">なまえ</Label>
                <Input
                  id="char-name"
                  placeholder="例: ほしもこ"
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
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-3xl shadow-sm">
                  ✨
                </div>
                <div>
                  <div className="text-2xl font-bold text-purple-900">{name}</div>
                  <div className="text-sm text-violet-500">{species}</div>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-violet-100 p-4">
                  <div className="text-xs font-semibold text-violet-300">役割</div>
                  <div className="mt-1 text-sm font-medium text-purple-700">
                    {ROLE_OPTIONS.find(o => o.value === role)?.label}
                  </div>
                </div>
                <div className="rounded-2xl border border-violet-100 p-4">
                  <div className="text-xs font-semibold text-violet-300">性格</div>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {personalities.map(p => (
                      <span key={p} className="text-sm font-medium text-purple-700">
                        {p}
                      </span>
                    )).reduce<React.ReactNode[]>((acc, curr, i) => i === 0 ? [curr] : [...acc, " / ", curr], [])}
                  </div>
                </div>
                <div className="rounded-2xl border border-violet-100 p-4">
                  <div className="text-xs font-semibold text-violet-300">雰囲気 / カラー</div>
                  <div className="mt-1 flex items-center gap-2">
                    <div className="size-4 rounded-full border border-violet-100" style={{ backgroundColor: COLOR_OPTIONS.find(o => o.value === color)?.hex }} />
                    <span className="text-sm font-medium text-purple-700">{mood} / {COLOR_OPTIONS.find(o => o.value === color)?.label}</span>
                  </div>
                </div>
                <div className="rounded-2xl border border-violet-100 p-4">
                  <div className="text-xs font-semibold text-violet-300">とくべつな力</div>
                  <div className="mt-1 text-sm font-medium text-purple-700">{power}</div>
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
            <Button onClick={handleSubmit} disabled={isSubmitting} size="lg" className="px-8 bg-gradient-to-r from-purple-600 to-violet-600">
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  保存中...
                </>
              ) : (
                "この相棒を登録する！"
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

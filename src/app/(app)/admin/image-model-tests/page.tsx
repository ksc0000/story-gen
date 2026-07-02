"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { PageTransition } from "@/components/page-transition";
import { AdminNav } from "@/components/admin/AdminNav";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/hooks/use-auth";
import { useAdminClaim } from "@/lib/hooks/use-admin-claim";
import { useConfirm } from "@/components/ui/use-confirm";
import { ILLUSTRATION_STYLE_PROFILES } from "@/lib/illustration-styles";
import {
  testImageModelsCallable,
  regenerateStylePreviewsCallable,
  type TestImageModelsResult,
  type RegenerateStylePreviewsResult,
} from "@/lib/functions";
import type {
  IllustrationStyle,
  ImageModelProfile,
  ImagePurpose,
  ImageQualityTier,
} from "@/lib/types";

const DEFAULT_PROMPT =
  "A warm Japanese children's picture book illustration of a preschool child playing in a quiet park sandbox, soft watercolor texture, gentle expression, safe and cozy mood, 4:3 composition, no text, no letters, no watermark.";

const PURPOSE_OPTIONS: Array<{ value: ImagePurpose; label: string }> = [
  { value: "book_page", label: "book_page" },
  { value: "book_cover", label: "book_cover" },
  { value: "memory_key_page", label: "memory_key_page" },
  { value: "child_avatar", label: "child_avatar" },
  { value: "child_avatar_revision", label: "child_avatar_revision" },
];

const QUALITY_TIER_OPTIONS: Array<{ value: ImageQualityTier; label: string }> = [
  { value: "light", label: "light" },
  { value: "standard", label: "standard" },
  { value: "premium", label: "premium" },
];
const MODEL_PROFILE_OPTIONS: Array<{
  value: ImageModelProfile;
  label: string;
  disabled?: boolean;
}> = [
  { value: "klein_fast", label: "klein_fast (flux-2-klein)" },
  { value: "klein_base", label: "klein_base (flux-2-klein-base)" },
  { value: "pro_consistent", label: "pro_consistent (flux-2-pro / 現Premium)" },
  { value: "kontext_max", label: "kontext_max (flux-kontext-max / 一貫性◎)" },
  { value: "openai_standard", label: "openai_standard (gpt-image-1)" },
  { value: "openai_gpt_image_2", label: "openai_gpt_image_2 (gpt-image-2 high / 単品・avatar)" },
  { value: "openai_gpt_image_2_medium", label: "openai_gpt_image_2_medium (Std/Premサブスク)" },
  { value: "openai_gpt_image_2_low", label: "openai_gpt_image_2_low (Free)" },
  { value: "openai_mini", label: "openai_mini (gpt-image-1-mini / 安価)" },
  { value: "kontext_reference", label: "kontext_reference", disabled: true },
];

const PRESET_PROMPTS = [
  {
    label: "砂場の子ども",
    prompt:
      "A warm Japanese children's picture book illustration of a preschool child playing in a quiet Japanese neighborhood park sandbox. The child is inside a square sandbox with beige sand and a low wooden border, soft green hedges behind, gentle smile, cozy mood, 4:3 composition, no text, no letters, no watermark.",
  },
  {
    label: "寝る前の絵本",
    prompt:
      "A soft Japanese bedtime picture book illustration of a small child sitting with a favorite stuffed animal under warm moonlight, cozy bedroom atmosphere, gentle pastel colors, calm expression, 4:3 composition, no text, no letters, no watermark.",
  },
  {
    label: "思い出絵本",
    prompt:
      "A heartwarming Japanese family memory picture book illustration of a preschool child walking with family in a sunny park, soft watercolor texture, warm emotional mood, gentle composition, 4:3 composition, no text, no letters, no watermark.",
  },
];

const RESULT_ORDER: ImageQualityTier[] = ["light", "standard", "premium"];
const PROFILE_RESULT_ORDER: ImageModelProfile[] = [
  "klein_fast",
  "klein_base",
  "pro_consistent",
  "kontext_max",
  "kontext_reference",
  "openai_mini",
  "openai_standard",
  "openai_gpt_image_2",
  "openai_gpt_image_2_medium",
  "openai_gpt_image_2_low",
];

function sortResults(results: TestImageModelsResult["results"]) {
  return [...results].sort((a, b) => {
    const aOrder = a.tier
      ? RESULT_ORDER.indexOf(a.tier)
      : PROFILE_RESULT_ORDER.indexOf(a.modelProfile ?? "klein_fast");
    const bOrder = b.tier
      ? RESULT_ORDER.indexOf(b.tier)
      : PROFILE_RESULT_ORDER.indexOf(b.modelProfile ?? "klein_fast");
    return aOrder - bOrder;
  });
}

export default function AdminImageModelTestsPage() {
  const { user, loading } = useAuth();
  const { checkingAdmin, isAdmin } = useAdminClaim();
  const confirm = useConfirm();
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT);
  const [purpose, setPurpose] = useState<ImagePurpose>("book_page");
  const [inputImageUrlsText, setInputImageUrlsText] = useState("");
  const [selectedTiers, setSelectedTiers] = useState<ImageQualityTier[]>([
    "light",
    "standard",
    "premium",
  ]);
  const [compareMode, setCompareMode] = useState<"qualityTiers" | "modelProfiles">(
    "qualityTiers"
  );
  const [selectedModelProfiles, setSelectedModelProfiles] = useState<ImageModelProfile[]>([
    "pro_consistent",
  ]);
  const [selectedStyle, setSelectedStyle] = useState<IllustrationStyle>("soft_watercolor");
  const [stylePreviewReference, setStylePreviewReference] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TestImageModelsResult | null>(null);
  const [executedAt, setExecutedAt] = useState<string | null>(null);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [selectedWinner, setSelectedWinner] = useState<string | null>(null);
  const [regenPreviews, setRegenPreviews] = useState<{
    running: boolean;
    progress: string;
    results: RegenerateStylePreviewsResult["results"];
    error: string | null;
  }>({ running: false, progress: "", results: [], error: null });

  const handleRegenerateStylePreviews = async () => {
    if (regenPreviews.running) return;
    // previewImageUrl が重複するスタイルは1回だけ（エイリアス対策）。
    const seen = new Set<string>();
    const styleIds: string[] = [];
    for (const p of ILLUSTRATION_STYLE_PROFILES) {
      if (seen.has(p.previewImageUrl)) continue;
      seen.add(p.previewImageUrl);
      styleIds.push(p.id);
    }
    if (
      !(await confirm({
        title: "スタイルプレビューを再生成",
        description: `${styleIds.length} スタイルのプレビューを gpt-image-2(high) で1件ずつ再生成します。数分かかり、画像生成コストが発生します。続けますか？`,
        confirmLabel: "再生成する",
      }))
    ) {
      return;
    }
    setRegenPreviews({ running: true, progress: `0/${styleIds.length}`, results: [], error: null });
    const acc: RegenerateStylePreviewsResult["results"] = [];
    // レート制限と request timeout を避けるため1スタイルずつ順次。
    // 1件が失敗(internal等)しても全体を止めず次へ進む（最後にまとめて成否表示）。
    for (let i = 0; i < styleIds.length; i++) {
      const styleId = styleIds[i];
      try {
        const res = await regenerateStylePreviewsCallable([styleId]);
        acc.push(...res.results);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        acc.push({ styleId, error: message });
      }
      setRegenPreviews({
        running: i + 1 < styleIds.length,
        progress: `${i + 1}/${styleIds.length}`,
        results: [...acc],
        error: null,
      });
    }
    const failed = acc.filter((r) => r.error).length;
    setRegenPreviews({
      running: false,
      progress: failed > 0 ? `完了（失敗 ${failed} 件・再実行で補完可）` : "完了",
      results: acc,
      error: null,
    });
  };
  const [tierMemos, setTierMemos] = useState<Record<ImageQualityTier, string>>({
    light: "",
    standard: "",
    premium: "",
  });

  const inputImageUrls = useMemo(
    () =>
      inputImageUrlsText
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
        .slice(0, 8),
    [inputImageUrlsText]
  );

  const canSubmit =
    isAdmin &&
    !submitting &&
    prompt.trim().length > 0 &&
    (compareMode === "qualityTiers"
      ? selectedTiers.length > 0
      : selectedModelProfiles.length > 0);

  const handleToggleTier = (tier: ImageQualityTier) => {
    setSelectedTiers((current) =>
      current.includes(tier)
        ? current.filter((item) => item !== tier)
        : [...current, tier]
    );
  };

  const handleToggleModelProfile = (profile: ImageModelProfile) => {
    setSelectedModelProfiles((current) =>
      current.includes(profile)
        ? current.filter((item) => item !== profile)
        : [...current, profile]
    );
  };

  const handleRun = async () => {
    if (!canSubmit) return;

    setSubmitting(true);
    setError(null);
    setCopiedUrl(null);

    try {
      const nextResult = await testImageModelsCallable({
        prompt: prompt.trim(),
        purpose,
        inputImageUrls,
        qualityTiers: compareMode === "qualityTiers" ? selectedTiers : undefined,
        modelProfiles: compareMode === "modelProfiles" ? selectedModelProfiles : undefined,
        style: selectedStyle,
        stylePreviewReference,
      });
      setResult({
        ...nextResult,
        results: sortResults(nextResult.results),
      });
      setExecutedAt(new Date().toLocaleString("ja-JP"));
    } catch (err) {
      console.error("Failed to compare image models:", err);
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(`比較生成に失敗しました: ${message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyUrl = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedUrl(url);
      setTimeout(() => setCopiedUrl((current) => (current === url ? null : current)), 2000);
    } catch (err) {
      console.error("Failed to copy image URL:", err);
    }
  };

  return (
    <>
      <AdminNav />
      <PageTransition className="mx-auto max-w-6xl px-4 py-8">
      <div className="space-y-3">
        <h1 className="text-2xl font-bold text-purple-900">画像モデル比較</h1>
        <p className="text-sm text-violet-600">
          同じプロンプトと参照画像で複数モデル（flux 系・gpt-image 系）を並列生成して横並び比較します。各モデルを跨いで同時実行し、生成時間と概算コストも表示。通常の絵本生成設定は変更されません。
        </p>
      </div>

      <Card className="mt-6 border-emerald-200 bg-emerald-50/30">
        <CardContent className="space-y-3 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-emerald-900">スタイルプレビュー画像の再生成</p>
              <p className="text-xs text-emerald-700">
                スタイル選択で表示する見本画像を gpt-image-2(high) で全スタイル再生成し、実出力と一致させます（固定URLに上書き）。
              </p>
            </div>
            <Button
              type="button"
              onClick={handleRegenerateStylePreviews}
              disabled={regenPreviews.running}
              className="bg-emerald-600 text-white hover:bg-emerald-700"
            >
              {regenPreviews.running ? `再生成中… ${regenPreviews.progress}` : "プレビューを再生成"}
            </Button>
          </div>
          {regenPreviews.error && (
            <p className="text-xs text-rose-600">失敗: {regenPreviews.error}（途中までの結果は下に表示）</p>
          )}
          {regenPreviews.results.length > 0 && (
            <div className="text-xs text-emerald-800">
              <p>進捗: {regenPreviews.progress}</p>
              <ul className="mt-1 space-y-0.5">
                {regenPreviews.results.map((r) => (
                  <li key={r.styleId}>
                    {r.error ? "❌" : "✅"} {r.styleId}
                    {r.error ? ` — ${r.error}` : ""}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardContent className="space-y-6 p-6">
          {loading || checkingAdmin ? (
            <p className="text-sm text-violet-500">権限を確認中...</p>
          ) : !user ? (
            <div className="space-y-3">
              <p className="text-sm text-rose-600">ログインが必要です</p>
              <div className="flex flex-wrap gap-3">
                <Link href="/login/">
                  <Button>ログインへ</Button>
                </Link>
                <Link href="/admin/login/">
                  <Button variant="outline">管理者ログインへ</Button>
                </Link>
              </div>
            </div>
          ) : !isAdmin ? (
            <div className="space-y-3 text-sm text-rose-600">
              <p>管理者権限が必要です。管理者ログイン画面で権限状態を確認してください。</p>
              <Link href="/admin/login/">
                <Button>管理者ログインへ</Button>
              </Link>
            </div>
          ) : (
            <>
              <div className="rounded-2xl bg-violet-50 p-4 text-sm text-violet-600">
                <p className="font-medium text-purple-900">管理者向けの内部検証画面です</p>
                <p className="mt-1">
                  admin権限を付与した直後は、再ログインまたはトークン更新が必要です。
                </p>
              </div>

              <div className="space-y-3">
                <Label className="text-purple-800">プリセット</Label>
                <div className="flex flex-wrap gap-2">
                  {PRESET_PROMPTS.map((preset) => (
                    <Button
                      key={preset.label}
                      type="button"
                      variant="outline"
                      onClick={() => setPrompt(preset.prompt)}
                    >
                      {preset.label}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="prompt" className="text-purple-800">
                  prompt
                </Label>
                <textarea
                  id="prompt"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  rows={6}
                  className="w-full rounded-[20px] border border-[rgba(240,171,252,0.3)] bg-background px-4 py-3 text-sm focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400/50"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="purpose" className="text-purple-800">
                  purpose
                </Label>
                <select
                  id="purpose"
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value as ImagePurpose)}
                  className="w-full rounded-[20px] border border-[rgba(240,171,252,0.3)] bg-background px-4 py-3 text-sm focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400/50"
                >
                  {PURPOSE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <p className="text-xs leading-relaxed text-violet-500">
                  book_page / book_cover / memory_key_page は quality tier に応じて flux-2-klein-9b または flux-2-pro を使います。child_avatar 系は常に flux-2-pro です。
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-purple-800">比較モード</Label>
                <div className="flex flex-wrap gap-3">
                  <label className="flex items-center gap-2 rounded-full border border-[rgba(240,171,252,0.3)] px-4 py-2 text-sm text-violet-700">
                    <input
                      type="radio"
                      checked={compareMode === "qualityTiers"}
                      onChange={() => setCompareMode("qualityTiers")}
                    />
                    quality tiers
                  </label>
                  <label className="flex items-center gap-2 rounded-full border border-[rgba(240,171,252,0.3)] px-4 py-2 text-sm text-violet-700">
                    <input
                      type="radio"
                      checked={compareMode === "modelProfiles"}
                      onChange={() => setCompareMode("modelProfiles")}
                    />
                    model profiles
                  </label>
                </div>
                <p className="text-xs leading-relaxed text-violet-500">
                  klein_fast / klein_base は Starting が長時間続く場合があります。まず pro_consistent 単独で確認してください。
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-purple-800">quality tiers</Label>
                <div className="flex flex-wrap gap-3">
                  {QUALITY_TIER_OPTIONS.map((option) => (
                    <label
                      key={option.value}
                      className="flex items-center gap-2 rounded-full border border-[rgba(240,171,252,0.3)] px-4 py-2 text-sm text-violet-700"
                    >
                      <input
                        type="checkbox"
                        checked={selectedTiers.includes(option.value)}
                        onChange={() => handleToggleTier(option.value)}
                        disabled={compareMode !== "qualityTiers"}
                      />
                      {option.label}
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-purple-800">model profiles</Label>
                <div className="flex flex-wrap gap-3">
                  {MODEL_PROFILE_OPTIONS.map((option) => (
                    <label
                      key={option.value}
                      className="flex items-center gap-2 rounded-full border border-[rgba(240,171,252,0.3)] px-4 py-2 text-sm text-violet-700"
                    >
                      <input
                        type="checkbox"
                        checked={selectedModelProfiles.includes(option.value)}
                        onChange={() => handleToggleModelProfile(option.value)}
                        disabled={compareMode !== "modelProfiles" || option.disabled}
                      />
                      {option.label}
                      {option.disabled ? " (準備中)" : ""}
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="style" className="text-purple-800">
                  style
                </Label>
                <select
                  id="style"
                  value={selectedStyle}
                  onChange={(e) => setSelectedStyle(e.target.value as IllustrationStyle)}
                  className="w-full rounded-[20px] border border-[rgba(240,171,252,0.3)] bg-background px-4 py-3 text-sm focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400/50"
                >
                  {ILLUSTRATION_STYLE_PROFILES.filter(
                    (profile) => profile.id !== "watercolor" && profile.id !== "flat"
                  ).map((profile) => (
                    <option key={profile.id} value={profile.id}>
                      {profile.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label className="text-purple-800">style preview reference</Label>
                <label className="flex items-center gap-2 rounded-full border border-[rgba(240,171,252,0.3)] px-4 py-2 text-sm text-violet-700">
                  <input
                    type="checkbox"
                    checked={stylePreviewReference}
                    onChange={(e) => setStylePreviewReference(e.target.checked)}
                  />
                  style preview image を input image に加えて比較する
                </label>
                <p className="text-xs leading-relaxed text-violet-500">
                  通常生成では off が既定です。on のときだけ style preview image を style reference として追加します。
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="inputImageUrls" className="text-purple-800">
                  inputImageUrls
                </Label>
                <textarea
                  id="inputImageUrls"
                  value={inputImageUrlsText}
                  onChange={(e) => setInputImageUrlsText(e.target.value)}
                  rows={5}
                  placeholder="https://example.com/reference-1.png&#10;https://example.com/reference-2.png"
                  className="w-full rounded-[20px] border border-[rgba(240,171,252,0.3)] bg-background px-4 py-3 text-sm focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400/50"
                />
                <p className="text-xs leading-relaxed text-violet-500">
                  参照画像URLを1行ずつ入力できます。quality tier 比較にも model profile 比較にも使えます。
                </p>
                <p className="text-xs text-violet-400">現在の対象件数: {inputImageUrls.length}件</p>
              </div>

              {error ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                  {error}
                </div>
              ) : null}

              <div className="space-y-3">
                <Button onClick={handleRun} disabled={!canSubmit} className="px-8">
                  {submitting ? "比較生成中..." : "比較生成する"}
                </Button>
                <div className="space-y-1 text-xs leading-relaxed text-violet-500">
                  <p>この画面は管理者向けの検証用です。実行すると実際に Replicate / OpenAI API を呼び出し、選択したモデルの枚数分の画像生成コストが発生します（gpt-image 系は高品質設定のため割高）。</p>
                  <p>現在、light と standard はどちらも flux-2-klein-9b を使用します。premium は flux-2-pro を使用します。</p>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {result ? (
        <div className="mt-8 space-y-6">
          <Card>
            <CardContent className="space-y-2 p-6 text-sm text-violet-600">
              <p>
                <span className="font-semibold text-purple-900">batchId:</span> {result.batchId}
              </p>
              <p>
                <span className="font-semibold text-purple-900">purpose:</span> {result.purpose}
              </p>
              <p>
                <span className="font-semibold text-purple-900">参照画像件数:</span> {result.inputImageUrls.length}
              </p>
              <p>
                <span className="font-semibold text-purple-900">inputImageRoles:</span>{" "}
                {result.inputImageRoles.length > 0 ? result.inputImageRoles.join(", ") : "none"}
              </p>
              <p>
                <span className="font-semibold text-purple-900">実行日時:</span> {executedAt ?? "不明"}
              </p>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-3">
            {result.results.map((item) => {
              const itemKey = item.modelProfile ?? item.tier ?? item.model;
              const isWinner = selectedWinner === itemKey;
              return (
              <Card
                key={`${result.batchId}-${itemKey}`}
                className={`overflow-hidden transition ${
                  isWinner ? "ring-2 ring-emerald-400 shadow-lg" : ""
                }`}
              >
                <CardContent className="space-y-4 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-purple-900">
                        {item.modelProfile ?? item.tier}
                        {isWinner && (
                          <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                            採用
                          </span>
                        )}
                      </p>
                      <p className="mt-1 break-all text-xs text-violet-500">{item.model}</p>
                    </div>
                    <div className="shrink-0 text-right text-[11px] text-violet-600">
                      {typeof item.latencyMs === "number" && (
                        <p>{(item.latencyMs / 1000).toFixed(1)}s</p>
                      )}
                      {typeof item.estimatedCostUsd === "number" && (
                        <p>≈${item.estimatedCostUsd.toFixed(3)}/枚</p>
                      )}
                    </div>
                  </div>

                  {item.error ? (
                    <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-700">
                      <p className="font-semibold">生成に失敗しました</p>
                      <p className="mt-1 break-all">{item.error}</p>
                    </div>
                  ) : item.imageUrl ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={item.imageUrl}
                        alt={`${item.modelProfile ?? item.tier} generated comparison`}
                        className="aspect-[4/3] w-full rounded-2xl border border-[rgba(240,171,252,0.3)] object-cover"
                      />
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedWinner(isWinner ? null : itemKey)}
                          className={`rounded-full px-3 py-1 text-xs font-medium ${
                            isWinner
                              ? "bg-emerald-500 text-white"
                              : "bg-emerald-100 text-emerald-700"
                          }`}
                        >
                          {isWinner ? "採用中（解除）" : "このモデルを採用"}
                        </button>
                        <a
                          href={item.imageUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-full bg-violet-100 px-3 py-1 text-xs font-medium text-violet-700"
                        >
                          画像URLを開く
                        </a>
                        <button
                          type="button"
                          onClick={() => handleCopyUrl(item.imageUrl!)}
                          className="rounded-full bg-pink-100 px-3 py-1 text-xs font-medium text-pink-700"
                        >
                          {copiedUrl === item.imageUrl ? "コピーしました" : "URLをコピー"}
                        </button>
                      </div>
                    </>
                  ) : null}
                </CardContent>
              </Card>
              );
            })}
          </div>
          {selectedWinner && (
            <p className="text-sm font-medium text-emerald-700">
              採用中のモデル: <span className="font-bold">{selectedWinner}</span>
            </p>
          )}

          <Card>
            <CardContent className="space-y-5 p-6">
              <h2 className="text-lg font-semibold text-purple-900">評価メモ</h2>
              <p className="text-sm text-violet-600">
                絵本らしさ / 子どもらしさ / 顔・髪型の安定 / 服装・小物の自然さ / 背景の自然さ / 破綻の少なさ などを見ながらメモできます。
              </p>
              {RESULT_ORDER.map((tier) => (
                <div key={tier} className="space-y-2">
                  <Label htmlFor={`memo-${tier}`} className="text-purple-800">
                    {tier} memo
                  </Label>
                  <textarea
                    id={`memo-${tier}`}
                    value={tierMemos[tier]}
                    onChange={(e) =>
                      setTierMemos((current) => ({ ...current, [tier]: e.target.value }))
                    }
                    rows={4}
                    placeholder="絵本らしさ / 子どもらしさ / 顔の安定 / 背景の自然さ / 総合メモ"
                    className="w-full rounded-[20px] border border-[rgba(240,171,252,0.3)] bg-background px-4 py-3 text-sm focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400/50"
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      ) : null}
      </PageTransition>
    </>
  );
}

"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { PageTransition } from "@/components/page-transition";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/hooks/use-auth";
import { useAdminClaim } from "@/lib/hooks/use-admin-claim";
import {
  testImageModelsCallable,
  type TestImageModelsResult,
} from "@/lib/functions";
import type { ImagePurpose, ImageQualityTier } from "@/lib/types";

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

function sortResults(results: TestImageModelsResult["results"]) {
  return [...results].sort(
    (a, b) => RESULT_ORDER.indexOf(a.tier) - RESULT_ORDER.indexOf(b.tier)
  );
}

export default function AdminImageModelTestsPage() {
  const { user, loading } = useAuth();
  const { checkingAdmin, isAdmin } = useAdminClaim();
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT);
  const [purpose, setPurpose] = useState<ImagePurpose>("book_page");
  const [inputImageUrlsText, setInputImageUrlsText] = useState("");
  const [selectedTiers, setSelectedTiers] = useState<ImageQualityTier[]>([
    "light",
    "standard",
    "premium",
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TestImageModelsResult | null>(null);
  const [executedAt, setExecutedAt] = useState<string | null>(null);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
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
    selectedTiers.length > 0;

  const handleToggleTier = (tier: ImageQualityTier) => {
    setSelectedTiers((current) =>
      current.includes(tier)
        ? current.filter((item) => item !== tier)
        : [...current, tier]
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
        qualityTiers: selectedTiers,
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
    <PageTransition className="mx-auto max-w-6xl px-4 py-8">
      <div className="space-y-3">
        <h1 className="text-2xl font-bold text-purple-900">画像モデル比較</h1>
        <p className="text-sm text-violet-600">
          同じプロンプトと参照画像で light / standard / premium を比較します。通常の絵本生成設定は変更されません。
        </p>
      </div>

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
                  book_page のときだけ light / standard / premium の違いが出やすいです。book_cover や child_avatar は現在すべて flux-2-pro になります。
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
                      />
                      {option.label}
                    </label>
                  ))}
                </div>
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
                  参照画像URLを1行ずつ入力できます。book_page + light では参照画像は使われません。standard/premium や child系の検証で使います。
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
                  <p>この画面は管理者向けの検証用です。実行すると実際にReplicate APIを呼び出し、画像生成コストが発生します。</p>
                  <p>standard は ENABLE_FLUX_KLEIN=true が設定されていない環境では light と同じ flux-schnell にフォールバックします。</p>
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
                <span className="font-semibold text-purple-900">実行日時:</span> {executedAt ?? "不明"}
              </p>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-3">
            {result.results.map((item) => (
              <Card key={`${result.batchId}-${item.tier}`} className="overflow-hidden">
                <CardContent className="space-y-4 p-4">
                  <div>
                    <p className="text-sm font-semibold text-purple-900">{item.tier}</p>
                    <p className="mt-1 break-all text-xs text-violet-500">{item.model}</p>
                  </div>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.imageUrl}
                    alt={`${item.tier} generated comparison`}
                    className="aspect-[4/3] w-full rounded-2xl border border-[rgba(240,171,252,0.3)] object-cover"
                  />
                  <div className="flex flex-wrap gap-2">
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
                      onClick={() => handleCopyUrl(item.imageUrl)}
                      className="rounded-full bg-pink-100 px-3 py-1 text-xs font-medium text-pink-700"
                    >
                      {copiedUrl === item.imageUrl ? "コピーしました" : "URLをコピー"}
                    </button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

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
  );
}

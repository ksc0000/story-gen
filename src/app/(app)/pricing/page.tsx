"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { httpsCallable } from "firebase/functions";
import { Check, Loader2, Sparkles, Star, X } from "lucide-react";
import { functions } from "@/lib/firebase";
import { PLAN_CONFIGS, resolveProductPlan } from "@/lib/plans";
import { useAuth } from "@/lib/hooks/use-auth";
import { useUserProfile } from "@/lib/hooks/use-user-profile";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ProductPlan } from "@/lib/types";

const PLAN_ORDER: Record<ProductPlan, number> = {
  free: 0,
  standard_paid: 1,
  premium_paid: 2,
};

const PLANS = [
  { id: "free" as ProductPlan, label: "フリー", price: 0 },
  { id: "standard_paid" as ProductPlan, label: "スタンダード", price: PLAN_CONFIGS.standard_paid.priceJpy ?? 1480, recommended: true },
  { id: "premium_paid" as ProductPlan, label: "プレミアム", price: PLAN_CONFIGS.premium_paid.priceJpy ?? 2980 },
];

type FeatureRow =
  | { label: string; values: [string, string, string] }
  | { label: string; values: [boolean, boolean, boolean] };

const FEATURE_ROWS: FeatureRow[] = [
  { label: "月間作成冊数", values: [`${PLAN_CONFIGS.free.monthlyBookQuota}冊`, `${PLAN_CONFIGS.standard_paid.monthlyBookQuota}冊`, `${PLAN_CONFIGS.premium_paid.monthlyBookQuota}冊`] },
  { label: "ページ数", values: ["4ページ", "4 / 8ページ", "4 / 8 / 12ページ"] },
  { label: "なかよしキャラ登録数", values: ["2体", "5体", "無制限"] },
  { label: "子どもプロフィール", values: ["1人", "3人", "無制限"] },
  { label: "画質", values: ["標準", "高画質", "最高画質"] },
  { label: "キャラクター一貫性", values: [true, true, true] },
  { label: "かんたんカスタムモード", values: [false, true, true] },
  { label: "写真からつくるモード", values: [false, false, true] },
];

const PLAN_HIGHLIGHTS: Record<ProductPlan, { emoji: string; title: string; points: string[] }> = {
  free: {
    emoji: "🎁",
    title: "まず試してみたい方に",
    points: [
      "登録・クレジットカード不要",
      "4ページのテンプレート絵本を作成",
      "なかよしキャラを2体まで登録",
      "10種類の公式キャラが使い放題",
    ],
  },
  standard_paid: {
    emoji: "⭐",
    title: "思い出をきれいに残したい方に",
    points: [
      "毎月5冊まで作成可能",
      "4 / 8ページで読み応えアップ",
      "「かんたんカスタム」モード対応",
      "なかよしキャラを5体まで登録",
      "高画質で仕上がりが段違い",
    ],
  },
  premium_paid: {
    emoji: "💎",
    title: "特別な思い出・ギフト向け",
    points: [
      "毎月10冊まで作成可能",
      "最大12ページのボリューム絵本",
      "写真から物語を作れるPhoto Story",
      "最高画質モデルで細部まで美しく",
      "なかよしキャラ無制限登録",
    ],
  },
};

export default function PricingPage() {
  const { user } = useAuth();
  const { profile } = useUserProfile(user?.uid);
  const router = useRouter();
  const [loading, setLoading] = useState<ProductPlan | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [singlePurchaseLoading, setSinglePurchaseLoading] = useState<string | null>(null);

  const currentPlan = resolveProductPlan(profile);

  async function handleUpgrade(productPlan: ProductPlan) {
    if (!user) { router.push("/login"); return; }
    setLoading(productPlan);
    setError(null);
    try {
      const createCheckoutSession = httpsCallable<{ productPlan: ProductPlan }, { url: string }>(
        functions, "createCheckoutSession"
      );
      const result = await createCheckoutSession({ productPlan });
      if (result.data.url) window.location.href = result.data.url;
    } catch (e) {
      console.error(e);
      setError("決済ページへの遷移に失敗しました。もう一度お試しください。");
    } finally {
      setLoading(null);
    }
  }

  async function handleSinglePurchase(purchaseType: "ai_guided" | "photo_story") {
    if (!user) { router.push("/login"); return; }
    setSinglePurchaseLoading(purchaseType);
    setError(null);
    try {
      const createSinglePurchaseCheckout = httpsCallable<{ purchaseType: string }, { url: string }>(
        functions, "createSinglePurchaseCheckout"
      );
      const result = await createSinglePurchaseCheckout({ purchaseType });
      if (result.data.url) window.location.href = result.data.url;
    } catch (e) {
      console.error(e);
      setError("決済ページへの遷移に失敗しました。もう一度お試しください。");
    } finally {
      setSinglePurchaseLoading(null);
    }
  }

  return (
    <div className="min-h-screen px-4 py-12 bg-slate-50/50">
      <div className="mx-auto max-w-4xl">

        {/* Header */}
        <div className="mb-10 text-center">
          <h1 className="text-3xl font-bold mb-3">プランを選んで、思い出をカタチに</h1>
          <p className="text-muted-foreground max-w-xl mx-auto text-sm">
            お子さんの成長や大切な思い出を、AIの力で世界に一つの絵本にします。
          </p>
        </div>

        {/* 比較表 */}
        <div className="overflow-x-auto rounded-3xl border border-slate-200 bg-white shadow-sm mb-10">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="py-5 pl-6 pr-2 text-left text-sm font-medium text-slate-400 w-[38%]">機能</th>
                {PLANS.map((plan) => {
                  const isCurrent = currentPlan === plan.id;
                  return (
                    <th key={plan.id} className="py-5 px-2 text-center w-[20%]">
                      <div className="flex flex-col items-center gap-1">
                        {plan.recommended && (
                          <Badge className="bg-violet-600 text-white border-none text-[10px] px-2 py-0.5 mb-0.5">おすすめ</Badge>
                        )}
                        <span className={cn("text-sm font-bold", plan.recommended ? "text-violet-700" : "text-slate-700")}>
                          {plan.label}
                        </span>
                        <span className="text-xs text-slate-500">
                          {plan.price === 0 ? "無料" : `¥${plan.price.toLocaleString()}/月`}
                        </span>
                        {isCurrent && (
                          <Badge variant="outline" className="text-[10px] border-slate-200 text-slate-400 mt-0.5">現在</Badge>
                        )}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {FEATURE_ROWS.map((row, i) => (
                <tr key={row.label} className={cn("border-b border-slate-50 last:border-0", i % 2 === 0 ? "" : "bg-slate-50/50")}>
                  <td className="py-3 pl-6 pr-2 text-sm text-slate-600">{row.label}</td>
                  {row.values.map((val, j) => (
                    <td key={j} className="py-3 px-2 text-center text-sm">
                      {typeof val === "boolean" ? (
                        val
                          ? <Check className="mx-auto size-4 text-violet-500" />
                          : <X className="mx-auto size-4 text-slate-200" />
                      ) : (
                        <span className={cn("font-medium", j === 1 ? "text-violet-700" : "text-slate-700")}>{val}</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
              {/* CTAボタン行 */}
              <tr>
                <td className="py-5 pl-6 pr-2" />
                {PLANS.map((plan) => {
                  const isCurrent = currentPlan === plan.id;
                  const isHigher = PLAN_ORDER[plan.id] > PLAN_ORDER[currentPlan];
                  const isLoading = loading === plan.id;
                  return (
                    <td key={plan.id} className="py-5 px-2 text-center">
                      {isCurrent ? (
                        <Button className="w-full" variant="secondary" disabled size="sm">現在のプラン</Button>
                      ) : isHigher ? (
                        <Button
                          className={cn("w-full", plan.recommended ? "bg-violet-600 hover:bg-violet-700 text-white" : "")}
                          size="sm"
                          variant={plan.recommended ? "default" : "outline"}
                          disabled={isLoading}
                          onClick={() => handleUpgrade(plan.id)}
                        >
                          {isLoading ? <Loader2 className="size-4 animate-spin" /> : <><Sparkles className="mr-1 size-3" />アップグレード</>}
                        </Button>
                      ) : plan.id === "free" ? (
                        <Button className="w-full" variant="ghost" size="sm" onClick={() => router.push("/create")}>
                          無料ではじめる
                        </Button>
                      ) : null}
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>

        {/* プラン別おすすめ機能 */}
        <div className="mb-12">
          <h2 className="text-lg font-bold text-center text-slate-700 mb-6">プラン別 おすすめポイント</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {PLANS.map((plan) => {
              const highlight = PLAN_HIGHLIGHTS[plan.id];
              const isCurrent = currentPlan === plan.id;
              const isHigher = PLAN_ORDER[plan.id] > PLAN_ORDER[currentPlan];
              return (
                <div
                  key={plan.id}
                  className={cn(
                    "rounded-3xl border bg-white p-6 transition-all",
                    plan.recommended ? "border-violet-300 shadow-md shadow-violet-100" : "border-slate-200 shadow-sm",
                    isCurrent ? "ring-2 ring-violet-200" : ""
                  )}
                >
                  <div className="mb-4">
                    <span className="text-3xl">{highlight.emoji}</span>
                    <div className="mt-2">
                      <span className={cn("text-sm font-bold", plan.recommended ? "text-violet-700" : "text-slate-700")}>
                        {plan.label}
                      </span>
                      {plan.recommended && (
                        <Badge className="ml-2 bg-violet-100 text-violet-600 border-none text-[10px]">
                          <Star className="size-2.5 mr-0.5" />おすすめ
                        </Badge>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-slate-500">{highlight.title}</p>
                  </div>
                  <ul className="space-y-2">
                    {highlight.points.map((point) => (
                      <li key={point} className="flex items-start gap-2 text-sm text-slate-600">
                        <Check className="mt-0.5 size-3.5 shrink-0 text-violet-400" />
                        {point}
                      </li>
                    ))}
                  </ul>
                  {isCurrent ? (
                    <div className="mt-5 text-center text-xs text-slate-400 font-medium">現在のプラン</div>
                  ) : isHigher ? (
                    <Button
                      className={cn("mt-5 w-full", plan.recommended ? "bg-violet-600 hover:bg-violet-700 text-white" : "")}
                      variant={plan.recommended ? "default" : "outline"}
                      size="sm"
                      disabled={loading === plan.id}
                      onClick={() => handleUpgrade(plan.id)}
                    >
                      {loading === plan.id ? <Loader2 className="size-4 animate-spin" /> : "このプランにする"}
                    </Button>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>

        {/* 単品購入 */}
        <div className="rounded-[2rem] border-2 border-dashed border-slate-200 p-8 bg-white/50 mb-8">
          <div className="mb-8 text-center">
            <Badge variant="outline" className="mb-3 border-slate-300 text-slate-500">単品購入オプション</Badge>
            <h2 className="text-xl font-bold mb-2">特別な1冊を、必要な時だけ</h2>
            <p className="text-muted-foreground text-sm max-w-md mx-auto">
              月額プランに加入せず、特定のモードで1冊ずつ作成できます。
              {profile?.singleBookCredits ? (
                <span className="ml-1 font-bold text-violet-600">（現在 {profile.singleBookCredits} クレジット保有中）</span>
              ) : null}
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-base font-bold">特別な1冊（かんたんカスタム）</h3>
                <span className="text-lg font-bold">¥1,500</span>
              </div>
              <p className="text-xs text-muted-foreground mb-5 leading-relaxed">
                「かんたんカスタム」でこだわりの1冊を。月額プランの上限を超えて作りたい場合にも便利です。
              </p>
              <Button className="w-full" variant="outline" disabled={!!singlePurchaseLoading} onClick={() => handleSinglePurchase("ai_guided")}>
                {singlePurchaseLoading === "ai_guided" ? <Loader2 className="size-4 animate-spin" /> : "単品購入する"}
              </Button>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-base font-bold">Photo Story 単品</h3>
                <span className="text-lg font-bold">¥2,000</span>
              </div>
              <p className="text-xs text-muted-foreground mb-5 leading-relaxed">
                お手持ちの写真からAIが物語を紡ぐ「Photo Story」を1冊分。イベントの思い出に。
              </p>
              <Button className="w-full" variant="outline" disabled={!!singlePurchaseLoading} onClick={() => handleSinglePurchase("photo_story")}>
                {singlePurchaseLoading === "photo_story" ? <Loader2 className="size-4 animate-spin" /> : "単品購入する"}
              </Button>
            </div>
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-destructive/10 text-destructive text-center text-sm font-medium">
            {error}
          </div>
        )}

        <p className="mt-6 text-center text-xs text-muted-foreground">
          いつでもプランの変更やキャンセルが可能です。決済は Stripe を通じて安全に行われます。
        </p>
      </div>
    </div>
  );
}

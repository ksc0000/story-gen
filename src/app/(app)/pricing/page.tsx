"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { httpsCallable } from "firebase/functions";
import { Check, Loader2, Sparkles, Star } from "lucide-react";
import { functions } from "@/lib/firebase";
import { PLAN_CONFIGS, resolveProductPlan } from "@/lib/plans";
import { useAuth } from "@/lib/hooks/use-auth";
import { useUserProfile } from "@/lib/hooks/use-user-profile";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ProductPlan } from "@/lib/types";

interface PlanDisplay {
  id: ProductPlan;
  label: string;
  price: number;
  description: string;
  recommended?: boolean;
  quota: string;
  companions: string;
  children: string;
  quality: string;
}

const PLAN_ORDER: Record<ProductPlan, number> = {
  free: 0,
  standard_paid: 1,
  premium_paid: 2,
};

const DISPLAY_PLANS: PlanDisplay[] = [
  {
    id: "free",
    label: "無料プラン",
    price: 0,
    description: "まずは体験してみたい方に",
    quota: `${PLAN_CONFIGS.free.monthlyBookQuota}冊`,
    companions: "2体",
    children: "1人",
    quality: "標準",
  },
  {
    id: "standard_paid",
    label: PLAN_CONFIGS.standard_paid.label,
    price: PLAN_CONFIGS.standard_paid.priceJpy ?? 1480,
    description: "一番人気のスタンダードなプラン",
    recommended: true,
    quota: `${PLAN_CONFIGS.standard_paid.monthlyBookQuota}冊`,
    companions: "5体",
    children: "3人",
    quality: "高画質",
  },
  {
    id: "premium_paid",
    label: PLAN_CONFIGS.premium_paid.label,
    price: PLAN_CONFIGS.premium_paid.priceJpy ?? 2980,
    description: "最高の品質でこだわりたい方に",
    quota: `${PLAN_CONFIGS.premium_paid.monthlyBookQuota}冊`,
    companions: "無制限",
    children: "無制限",
    quality: "最高画質",
  },
];

const COMPARISON_ITEMS = [
  { label: "月間作成冊数", key: "quota" },
  { label: "なかよしキャラ登録数", key: "companions" },
  { label: "子どもプロフィール", key: "children" },
  { label: "画質", key: "quality" },
] as const;

export default function PricingPage() {
  const { user } = useAuth();
  const { profile } = useUserProfile(user?.uid);
  const router = useRouter();
  const [loading, setLoading] = useState<ProductPlan | null>(null);
  const [error, setError] = useState<string | null>(null);

  const currentPlan = resolveProductPlan(profile);

  async function handleUpgrade(productPlan: ProductPlan) {
    if (!user) {
      router.push("/login");
      return;
    }
    setLoading(productPlan);
    setError(null);
    try {
      const createCheckoutSession = httpsCallable<
        { productPlan: ProductPlan },
        { url: string }
      >(functions, "createCheckoutSession");
      const result = await createCheckoutSession({ productPlan });
      if (result.data.url) {
        window.location.href = result.data.url;
      }
    } catch (e) {
      console.error(e);
      setError("決済ページへの遷移に失敗しました。もう一度お試しください。");
    } finally {
      setLoading(null);
    }
  }

  const [singlePurchaseLoading, setSinglePurchaseLoading] = useState<string | null>(null);

  async function handleSinglePurchase(purchaseType: "ai_guided" | "photo_story") {
    if (!user) {
      router.push("/login");
      return;
    }
    setSinglePurchaseLoading(purchaseType);
    setError(null);
    try {
      const createSinglePurchaseCheckout = httpsCallable<
        { purchaseType: string },
        { url: string }
      >(functions, "createSinglePurchaseCheckout");
      const result = await createSinglePurchaseCheckout({ purchaseType });
      if (result.data.url) {
        window.location.href = result.data.url;
      }
    } catch (e) {
      console.error(e);
      setError("決済ページへの遷移に失敗しました。もう一度お試しください。");
    } finally {
      setSinglePurchaseLoading(null);
    }
  }

  return (
    <div className="min-h-screen px-4 py-12 bg-slate-50/50">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-12 text-center">
          <h1 className="text-3xl font-bold mb-4">プランを選んで、思い出をカタチに</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            お子さんの成長や大切な思い出を、AIの力で世界に一つの絵本にします。
            用途に合わせて最適なプランをお選びください。
          </p>
        </div>

        {/* Comparison Table / Cards */}
        <div className="grid gap-6 lg:grid-cols-3">
          {DISPLAY_PLANS.map((plan) => {
            const isCurrentPlan = currentPlan === plan.id;
            const isLoading = loading === plan.id;
            const isHigherPlan = PLAN_ORDER[plan.id] > PLAN_ORDER[currentPlan];

            return (
              <div
                key={plan.id}
                className={cn(
                  "relative flex flex-col rounded-3xl border bg-white p-8 transition-all duration-200",
                  plan.recommended
                    ? "border-violet-500 shadow-xl shadow-violet-100 scale-105 z-10"
                    : "border-slate-200 shadow-sm hover:shadow-md"
                )}
              >
                {plan.recommended && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <Badge className="bg-violet-600 hover:bg-violet-600 text-white px-4 py-1.5 rounded-full shadow-lg border-none flex items-center gap-1.5 font-bold tracking-wider">
                      <Star className="h-4 w-4 fill-current" />
                      おすすめ
                    </Badge>
                  </div>
                )}

                <div className="mb-8 text-center">
                  <h2 className="text-xl font-bold mb-2">{plan.label}</h2>
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-4xl font-extrabold tracking-tight">
                      {plan.price === 0 ? "無料" : `¥${plan.price.toLocaleString()}`}
                    </span>
                    {plan.price > 0 && (
                      <span className="text-muted-foreground font-medium">/月</span>
                    )}
                  </div>
                  <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                    {plan.description}
                  </p>
                </div>

                {/* Comparison Items */}
                <div className="flex-1 space-y-4 mb-8">
                  {COMPARISON_ITEMS.map((item) => (
                    <div
                      key={item.label}
                      className="flex items-center justify-between py-3 border-b border-slate-50 last:border-0"
                    >
                      <span className="text-sm font-medium text-slate-600">{item.label}</span>
                      <span className="text-sm font-bold text-slate-900">
                        {plan[item.key as keyof typeof plan]}
                      </span>
                    </div>
                  ))}

                  {/* Additional features based on plan */}
                  <div className="pt-4 space-y-3">
                    <div className="flex items-start gap-2.5 text-sm">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-violet-500" />
                      <span className="text-slate-600">
                        {plan.id === "free" ? "4ページ対応" :
                         plan.id === "standard_paid" ? "4・8ページ対応" : "4・8・12ページ対応"}
                      </span>
                    </div>
                    {plan.id !== "free" && (
                      <div className="flex items-start gap-2.5 text-sm">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-violet-500" />
                        <span className="text-slate-600">キャラクター一貫性維持</span>
                      </div>
                    )}
                    {plan.id === "premium_paid" && (
                      <div className="flex items-start gap-2.5 text-sm">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-violet-500" />
                        <span className="text-slate-600 text-left">すべての作成モードに対応</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-auto pt-6">
                  {isCurrentPlan ? (
                    <Button className="w-full h-12 rounded-xl" variant="secondary" disabled>
                      現在のプラン
                    </Button>
                  ) : isHigherPlan ? (
                    <Button
                      className={cn(
                        "w-full h-12 rounded-xl font-bold text-base transition-all duration-200",
                        plan.recommended
                          ? "bg-violet-600 hover:bg-violet-700 text-white shadow-lg shadow-violet-200"
                          : "bg-white border-2 border-slate-200 hover:border-violet-200 hover:bg-slate-50 text-slate-900"
                      )}
                      disabled={isLoading}
                      onClick={() => handleUpgrade(plan.id)}
                    >
                      {isLoading ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <>
                          <Sparkles className="mr-2 h-4 w-4" />
                          アップグレード
                        </>
                      )}
                    </Button>
                  ) : plan.id === "free" ? (
                     <Button
                        className="w-full h-12 rounded-xl text-slate-600 hover:text-slate-900"
                        variant="ghost"
                        onClick={() => router.push("/create")}
                     >
                        無料ではじめる
                     </Button>
                  ) : (
                    <div className="h-12" /> // Empty space for lower plans
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Single Purchase Section */}
        <div className="mt-24 rounded-[2rem] border-2 border-dashed border-slate-200 p-10 bg-white/50">
          <div className="mb-10 text-center">
            <Badge variant="outline" className="mb-4 border-slate-300 text-slate-500">単品購入オプション</Badge>
            <h2 className="text-2xl font-bold mb-3">特別な1冊を、必要な時だけ</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              月額プランに加入せず、特定のモードで1冊ずつ作成できます。
              {profile?.singleBookCredits ? (
                <span className="ml-1 inline-block font-bold text-violet-600">
                  （現在 {profile.singleBookCredits} クレジット保有中）
                </span>
              ) : null}
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm hover:shadow-md transition-shadow">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-bold">特別な1冊（かんたんカスタム）</h3>
                <span className="text-xl font-bold text-slate-900">¥1,500</span>
              </div>
              <p className="text-sm text-muted-foreground mb-8 leading-relaxed">
                「かんたんカスタム」でこだわりの1冊を。月額プランの上限を超えて作りたい場合にも便利です。
              </p>
              <Button
                className="w-full h-12 rounded-xl"
                variant="outline"
                disabled={!!singlePurchaseLoading}
                onClick={() => handleSinglePurchase("ai_guided")}
              >
                {singlePurchaseLoading === "ai_guided" ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  "単品購入する"
                )}
              </Button>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm hover:shadow-md transition-shadow">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-bold">Photo Story 単品</h3>
                <span className="text-xl font-bold text-slate-900">¥2,000</span>
              </div>
              <p className="text-sm text-muted-foreground mb-8 leading-relaxed">
                お手持ちの写真からAIが物語を紡ぐ「Photo Story」を1冊分。イベントの思い出に。
              </p>
              <Button
                className="w-full h-12 rounded-xl"
                variant="outline"
                disabled={!!singlePurchaseLoading}
                onClick={() => handleSinglePurchase("photo_story")}
              >
                {singlePurchaseLoading === "photo_story" ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  "単品購入する"
                )}
              </Button>
            </div>
          </div>
        </div>

        {error && (
          <div className="mt-8 p-4 rounded-xl bg-destructive/10 text-destructive text-center text-sm font-medium">
            {error}
          </div>
        )}

        <div className="mt-12 text-center space-y-4">
          <p className="text-xs text-muted-foreground">
            いつでもプランの変更やキャンセルが可能です。決済は Stripe を通じて安全に行われます。
          </p>
          <div className="flex justify-center gap-8">
            {/* Trust badges or links could go here */}
          </div>
        </div>
      </div>
    </div>
  );
}

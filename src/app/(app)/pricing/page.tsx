"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { httpsCallable } from "firebase/functions";
import { Check, Loader2, Sparkles, Star } from "lucide-react";
import { functions } from "@/lib/firebase";
import { useAuth } from "@/lib/hooks/use-auth";
import { useUserProfile } from "@/lib/hooks/use-user-profile";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type ProductPlan = "free" | "standard_paid" | "premium_paid";

interface Plan {
  id: ProductPlan;
  label: string;
  price: number;
  description: string;
  features: string[];
  badge?: string;
  recommended?: boolean;
}

const PLANS: Plan[] = [
  {
    id: "free",
    label: "まずは無料で",
    price: 0,
    description: "絵本作りを体験してみたい方向け",
    features: [
      "テンプレートから選ぶだけで作れる",
      "毎月1冊まで",
      "4ページの絵本",
      "お子さんの写真・名前を反映",
    ],
  },
  {
    id: "standard_paid",
    label: "スタンダード",
    price: 980,
    description: "思い出や成長を、きれいな絵本として残したい方向け",
    badge: "おすすめ",
    recommended: true,
    features: [
      "月5冊まで作成",
      "4・8ページ対応",
      "高品質AI画像生成",
      "テンプレート＆かんたんカスタム",
      "キャラクター一貫性",
    ],
  },
  {
    id: "premium_paid",
    label: "プレミアム",
    price: 1980,
    description: "特別な思い出やギフト向け。最高品質の絵本を作りたい方に",
    badge: "高精細",
    features: [
      "月10冊まで作成",
      "4・8・12ページ対応",
      "高精細AI画像生成（FLUX Kontext）",
      "全作成モード対応（オリジナルも可）",
      "キャラクター一貫性",
    ],
  },
];

export default function PricingPage() {
  const { user } = useAuth();
  const { profile } = useUserProfile(user?.uid);
  const router = useRouter();
  const [loading, setLoading] = useState<ProductPlan | null>(null);
  const [error, setError] = useState<string | null>(null);

  const currentPlan = profile?.productPlan ?? (profile?.plan === "premium" ? "standard_paid" : "free");

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

  return (
    <div className="min-h-screen px-4 py-12">
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <div className="mb-12 text-center">
          <h1 className="app-title mb-3 text-3xl font-bold">プラン選択</h1>
          <p className="app-subtitle text-base">
            お子さんの思い出を、AIが美しい絵本に変えます
          </p>
          {profile?.plan === "premium" && (
            <Badge className="mt-3 bg-amber-500/20 text-amber-700">
              現在: {currentPlan === "premium_paid" ? "プレミアム" : "スタンダード"}プランご利用中
            </Badge>
          )}
        </div>

        {/* Paid plans */}
        <div className="grid gap-6 md:grid-cols-3">
          {PLANS.map((plan) => {
            const isCurrentPlan = currentPlan === plan.id;
            const isLoading = loading === plan.id;

            return (
              <div
                key={plan.id}
                className={cn(
                  "relative rounded-2xl border p-6 transition-shadow",
                  plan.id === "free"
                    ? "border-none bg-muted/50"
                    : plan.recommended
                    ? "border-primary bg-primary/5 shadow-md"
                    : "border-border bg-card"
                )}
              >
                {plan.recommended && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-primary text-primary-foreground px-3 py-1 text-xs">
                      <Star className="mr-1 h-3 w-3 fill-current" />
                      おすすめ
                    </Badge>
                  </div>
                )}

                <div className="mb-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold">{plan.label}</h2>
                    {plan.badge && !plan.recommended && (
                      <Badge variant="secondary">{plan.badge}</Badge>
                    )}
                  </div>
                  <div className="mt-2 flex items-baseline gap-1">
                    <span className="text-3xl font-bold">¥{plan.price.toLocaleString()}</span>
                    <span className="text-sm text-muted-foreground">/月</span>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{plan.description}</p>
                </div>

                <ul className="mb-6 space-y-2">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  className="w-full"
                  variant={plan.recommended ? "default" : "outline"}
                  disabled={isCurrentPlan || isLoading}
                  onClick={() =>
                    plan.id === "free"
                      ? router.push("/create")
                      : handleUpgrade(plan.id)
                  }
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      処理中...
                    </>
                  ) : isCurrentPlan ? (
                    "現在のプラン"
                  ) : plan.id === "free" ? (
                    "無料ではじめる"
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      このプランにアップグレード
                    </>
                  )}
                </Button>
              </div>
            );
          })}
        </div>

        {/* Premium Benefits Gallery */}
        <div className="mt-16">
          <h2 className="mb-8 text-center text-2xl font-bold">プレミアムでできること</h2>
          <div className="grid gap-6 md:grid-cols-3">
            <div className="rounded-2xl border bg-card p-6 shadow-sm">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-purple-100 text-2xl">
                📚
              </div>
              <h3 className="mb-2 font-bold">12ページの長編絵本</h3>
              <p className="text-sm text-muted-foreground">
                物語の深みが増す、ボリュームたっぷりの12ページ構成で、より豊かな読書体験を。
              </p>
            </div>
            <div className="rounded-2xl border bg-card p-6 shadow-sm">
              <div className="mb-4 aspect-video overflow-hidden rounded-xl bg-muted">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/images/samples/adventure_premium.webp"
                  alt="高品質イラスト例"
                  className="h-full w-full object-cover"
                />
              </div>
              <h3 className="mb-2 font-bold">高品質イラスト</h3>
              <p className="text-sm text-muted-foreground">
                FLUXエンジンによる、細部まで描き込まれた美しく鮮やかな挿絵が物語を彩ります。
              </p>
            </div>
            <div className="rounded-2xl border bg-card p-6 shadow-sm">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 text-2xl">
                👤
              </div>
              <h3 className="mb-2 font-bold">キャラクター一貫性</h3>
              <p className="text-sm text-muted-foreground">
                全ページを通して、主人公の見た目や服装をしっかり維持。没入感を高めます。
              </p>
            </div>
          </div>
        </div>

        {error && (
          <p className="mt-4 text-center text-sm text-destructive">{error}</p>
        )}

        <p className="mt-8 text-center text-xs text-muted-foreground">
          いつでもキャンセル可能です。Stripe の安全な決済を使用しています。
        </p>
      </div>
    </div>
  );
}

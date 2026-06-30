"use client";

import { useState } from "react";
import { doc, updateDoc, deleteField } from "firebase/firestore";
import { FlaskConical, Check } from "lucide-react";
import { db } from "@/lib/firebase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PLAN_CONFIGS, resolveProductPlan } from "@/lib/plans";
import { useAuth } from "@/lib/hooks/use-auth";
import { useUserProfile } from "@/lib/hooks/use-user-profile";
import { useAdminClaim } from "@/lib/hooks/use-admin-claim";
import type { ProductPlan } from "@/lib/types";

const PLAN_ORDER: ProductPlan[] = ["free", "standard_paid", "premium_paid"];

/**
 * 管理者専用の開発パネル。effective productPlan を free / standard / premium に
 * 切り替えて「全プランで見える景色」を確認できる。planOverride を自分の
 * users/{uid} ドキュメントに保存し、resolveProductPlan() が最優先で採用する。
 */
export function AdminPlanPanel() {
  const { user } = useAuth();
  const { profile } = useUserProfile(user?.uid);
  const { isAdmin, checkingAdmin } = useAdminClaim();
  const [saving, setSaving] = useState<ProductPlan | "clear" | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (checkingAdmin || !isAdmin || !user) return null;

  const override = profile?.planOverride;
  const effectivePlan = resolveProductPlan(profile);

  const applyOverride = async (plan: ProductPlan | "clear") => {
    setSaving(plan);
    setError(null);
    try {
      await updateDoc(doc(db, "users", user.uid), {
        planOverride: plan === "clear" ? deleteField() : plan,
      });
    } catch (err) {
      console.error("Failed to set planOverride:", err);
      setError(err instanceof Error ? err.message : "プランの切り替えに失敗しました。");
    } finally {
      setSaving(null);
    }
  };

  return (
    <Card className="border-amber-200 bg-amber-50/40 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg text-amber-900">
          <FlaskConical className="size-5 text-amber-500" />
          開発パネル（管理者限定）
        </CardTitle>
        <p className="mt-1 text-sm text-amber-700/80">
          プランを切り替えて、各プランで見える画面・機能を確認できます。なかよしキャラは管理者は無制限に作成できます。
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="mb-2 text-xs font-bold text-amber-700">現在の有効プラン</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {PLAN_ORDER.map((plan) => {
              const config = PLAN_CONFIGS[plan];
              const isActive = effectivePlan === plan;
              return (
                <button
                  key={plan}
                  onClick={() => applyOverride(plan)}
                  disabled={saving !== null}
                  className={cn(
                    "flex flex-col items-start gap-1 rounded-xl border p-3 text-left transition disabled:opacity-60",
                    isActive
                      ? "border-amber-400 bg-white shadow-sm ring-1 ring-amber-300"
                      : "border-amber-100 bg-white/60 hover:border-amber-300 hover:bg-white"
                  )}
                >
                  <span className="flex items-center gap-1.5 text-sm font-bold text-purple-900">
                    {isActive && <Check className="size-3.5 text-amber-500" />}
                    {config.label}
                  </span>
                  <span className="text-[11px] text-violet-500">
                    {config.priceJpy ? `¥${config.priceJpy.toLocaleString()}/月` : "無料"}・
                    なかよし{config.maxCompanions >= 9999 ? "無制限" : `${config.maxCompanions}体`}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center justify-between rounded-lg bg-white/60 p-3">
          <p className="text-xs text-amber-700">
            {override
              ? `上書き中: ${PLAN_CONFIGS[override].label}（実プラン: ${PLAN_CONFIGS[resolveProductPlan({ productPlan: profile?.productPlan, plan: profile?.plan })].label}）`
              : "上書きなし（実プランを使用中）"}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => applyOverride("clear")}
            disabled={saving !== null || !override}
            className="shrink-0 border-amber-300 text-amber-700"
          >
            上書きを解除
          </Button>
        </div>

        {error && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-600">
            {error}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

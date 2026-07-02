"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { doc, onSnapshot } from "firebase/firestore";
import { CreditCard, Loader2, Check, Sparkles } from "lucide-react";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageTransition } from "@/components/page-transition";
import { BackButton } from "@/components/back-button";
import { EnterpriseGate } from "@/components/enterprise-gate";
import { useAuth } from "@/lib/hooks/use-auth";
import { useUserProfile } from "@/lib/hooks/use-user-profile";
import { createOrgCheckoutSessionCallable } from "@/lib/functions";
import { ORG_PLAN_CONFIGS, getOrgPlanConfig, type OrgPlan } from "@/lib/plans";

function yearMonthJst(now = new Date()): string {
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return `${jst.getUTCFullYear()}-${String(jst.getUTCMonth() + 1).padStart(2, "0")}`;
}

const UPGRADE_PLANS: OrgPlan[] = ["enterprise_standard", "enterprise_pro"];

function BillingContent() {
  const params = useSearchParams();
  const orgId = params.get("orgId") ?? "";
  const { user } = useAuth();
  const { profile } = useUserProfile(user?.uid);
  const isOrgAdmin = profile?.orgRole === "org_admin" && profile?.orgId === orgId;

  const [orgPlan, setOrgPlan] = useState<string | undefined>(undefined);
  const [usedThisMonth, setUsedThisMonth] = useState(0);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!orgId) return;
    const unsubOrg = onSnapshot(doc(db, "organizations", orgId), (snap) => {
      setOrgPlan(snap.exists() ? (snap.data()?.plan as string | undefined) : undefined);
    });
    const unsubUsage = onSnapshot(
      doc(db, "organizations", orgId, "usage", yearMonthJst()),
      (snap) => setUsedThisMonth(snap.exists() ? ((snap.data()?.bulkBooks as number | undefined) ?? 0) : 0)
    );
    return () => {
      unsubOrg();
      unsubUsage();
    };
  }, [orgId]);

  const current = getOrgPlanConfig(orgPlan);

  const upgrade = async (plan: OrgPlan) => {
    if (busy) return;
    setBusy(plan);
    setNotice(null);
    try {
      const r = await createOrgCheckoutSessionCallable({
        orgId,
        orgPlan: plan as "enterprise_standard" | "enterprise_pro",
      });
      if (r.url) {
        window.location.href = r.url;
      } else {
        setNotice("法人プランの決済は現在準備中です。開始までしばらくお待ちください。");
      }
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "エラーが発生しました。");
    } finally {
      setBusy(null);
    }
  };

  if (!orgId) {
    return (
      <PageTransition className="mx-auto max-w-2xl px-4 py-8 text-center text-violet-500">
        団体が指定されていません。
        <div className="mt-4">
          <BackButton />
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition className="mx-auto max-w-2xl px-4 py-6">
      <BackButton className="mb-3" />
      <div className="mb-6 flex items-center gap-2">
        <CreditCard className="size-6 text-purple-600" />
        <h1 className="text-2xl font-bold text-purple-900">プランと請求</h1>
      </div>

      {/* 現在のプラン */}
      <Card className="mb-4">
        <CardContent className="p-6">
          <p className="text-xs font-semibold text-violet-400">現在のプラン</p>
          <p className="mt-1 text-xl font-bold text-purple-900">{current.label}</p>
          <div className="mt-4 space-y-1 text-sm text-violet-700">
            <p>今月の一括生成：{usedThisMonth} / {current.monthlyBooks} 冊</p>
            <p>1回あたりの人数上限：{current.studentsPerRun} 人</p>
          </div>
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-violet-100">
            <div
              className="h-full rounded-full bg-gradient-to-r from-purple-400 to-violet-400"
              style={{ width: `${Math.min(100, (usedThisMonth / current.monthlyBooks) * 100)}%` }}
            />
          </div>
        </CardContent>
      </Card>

      {notice ? (
        <p className="mb-4 rounded-2xl bg-amber-50 p-3 text-sm text-amber-700">{notice}</p>
      ) : null}

      {/* アップグレード */}
      {isOrgAdmin ? (
        <div className="space-y-4">
          <p className="text-sm font-semibold text-purple-900">プランをアップグレード</p>
          {UPGRADE_PLANS.map((p) => {
            const cfg = ORG_PLAN_CONFIGS[p];
            const isCurrent = current.plan === p;
            return (
              <Card key={p} className={isCurrent ? "ring-2 ring-purple-400" : ""}>
                <CardContent className="p-5">
                  <div className="flex items-baseline justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className="size-4 text-purple-500" />
                      <span className="text-lg font-bold text-purple-900">{cfg.label}</span>
                    </div>
                    <span className="text-lg font-bold text-purple-900">
                      ¥{cfg.priceJpy.toLocaleString()}
                      <span className="text-xs font-normal text-gray-500">/月</span>
                    </span>
                  </div>
                  <ul className="mt-3 space-y-1 text-sm text-purple-800">
                    <li className="flex items-center gap-2">
                      <Check className="size-4 text-violet-400" /> 月{cfg.monthlyBooks}冊まで一括生成
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="size-4 text-violet-400" /> 1回{cfg.studentsPerRun}人まで
                    </li>
                  </ul>
                  <Button
                    className="mt-4 w-full"
                    variant={isCurrent ? "outline" : "default"}
                    disabled={isCurrent || busy !== null}
                    onClick={() => upgrade(p)}
                  >
                    {busy === p ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                    {isCurrent ? "利用中のプラン" : "このプランにする"}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
          <p className="text-center text-xs text-violet-400">
            ※ 法人プランの決済は現在準備中です。金額は暫定で、開始時に確定します。
          </p>
        </div>
      ) : (
        <p className="text-center text-sm text-violet-400">
          プランの変更は団体の管理者のみ可能です。
        </p>
      )}
    </PageTransition>
  );
}

export default function OrgBillingPage() {
  return (
    <EnterpriseGate>
      <Suspense
        fallback={
          <div className="grid min-h-[50vh] place-items-center text-violet-400">
            <Loader2 className="size-6 animate-spin" />
          </div>
        }
      >
        <BillingContent />
      </Suspense>
    </EnterpriseGate>
  );
}

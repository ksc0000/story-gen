"use client";

import type { ReactNode } from "react";
import { Building2, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { BackButton } from "@/components/back-button";
import { PageTransition } from "@/components/page-transition";
import { useAdminClaim } from "@/lib/hooks/use-admin-claim";
import { ENTERPRISE_OPEN } from "@/lib/enterprise";

/**
 * エンタープライズ（園・団体）機能の公開ゲート。
 * 一般公開（NEXT_PUBLIC_ENTERPRISE_OPEN=true）までは admin のみアクセス可、
 * それ以外には「準備中」を表示する。
 */
export function EnterpriseGate({ children }: { children: ReactNode }) {
  const { checkingAdmin, isAdmin } = useAdminClaim();

  if (ENTERPRISE_OPEN || isAdmin) {
    return <>{children}</>;
  }

  if (checkingAdmin) {
    return (
      <div className="grid min-h-[50vh] place-items-center text-violet-400">
        <Loader2 className="size-6 animate-spin" />
      </div>
    );
  }

  return (
    <PageTransition className="mx-auto max-w-2xl px-4 py-8">
      <BackButton className="mb-4" />
      <Card className="border-violet-100">
        <CardContent className="flex flex-col items-center gap-4 p-10 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-violet-50 text-violet-400">
            <Building2 className="size-7" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-purple-900">団体契約は準備中です</h1>
            <p className="mt-2 text-sm leading-relaxed text-violet-500">
              保育園・幼稚園などの団体でクラスのみんなの絵本をまとめて作れる「団体契約」を準備しています。
              公開までもうしばらくお待ちください。
            </p>
          </div>
        </CardContent>
      </Card>
    </PageTransition>
  );
}

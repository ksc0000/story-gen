"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/hooks/use-auth";
import { useUserProfile } from "@/lib/hooks/use-user-profile";

export default function PricingSuccessPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { profile, loading } = useUserProfile(user?.uid);
  const [waited, setWaited] = useState(false);

  // Stripe webhook may take a few seconds — poll for plan update
  useEffect(() => {
    const timer = setTimeout(() => setWaited(true), 4000);
    return () => clearTimeout(timer);
  }, []);

  const isPremium = profile?.plan === "premium";

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12 text-center">
      {loading || (!waited && !isPremium) ? (
        <>
          <Loader2 className="mb-4 h-10 w-10 animate-spin text-primary" />
          <p className="text-muted-foreground">プランを確認しています...</p>
        </>
      ) : (
        <>
          <CheckCircle2 className="mb-4 h-16 w-16 text-green-500" />
          <h1 className="app-title mb-2 text-2xl font-bold">ご購入ありがとうございます！</h1>
          <p className="mb-8 text-muted-foreground">
            {isPremium
              ? "プランが有効になりました。さっそく絵本を作りましょう！"
              : "プランの反映には少し時間がかかる場合があります。しばらくお待ちください。"}
          </p>
          <Button onClick={() => router.push("/home")}>ホームへ</Button>
        </>
      )}
    </div>
  );
}

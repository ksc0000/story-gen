"use client";

import { useEffect, useMemo, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { StepIndicator } from "@/components/step-indicator";
import { StylePicker } from "@/components/style-picker";
import { PageTransition } from "@/components/page-transition";
import { useAuth } from "@/lib/hooks/use-auth";
import { useChildren } from "@/lib/hooks/use-children";
import { useTemplates } from "@/lib/hooks/use-templates";
import { getStylePickerProfilesForTemplate } from "@/lib/style-exposure";
import type {
  IllustrationStyle,
} from "@/lib/types";

function StyleSelectionPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const { children } = useChildren(user?.uid);
  const { templates } = useTemplates();
  const [selected, setSelected] = useState<IllustrationStyle | null>("soft_watercolor");

  const theme = searchParams.get("theme") ?? "";
  const childId = searchParams.get("childId");
  const child = children.find((item) => item.id === childId) ?? null;
  const template = templates.find((item) => item.id === theme);
  const childName = child?.nickname || child?.displayName || "";

  const visibleStyleProfiles = useMemo(
    () => getStylePickerProfilesForTemplate(template?.id),
    [template?.id]
  );

  useEffect(() => {
    const firstVisibleStyle = visibleStyleProfiles[0]?.id ?? null;
    if (!firstVisibleStyle) {
      if (selected !== null) {
        setSelected(null);
      }
      return;
    }

    if (!selected || !visibleStyleProfiles.some((profile) => profile.id === selected)) {
      setSelected(firstVisibleStyle);
    }
  }, [selected, visibleStyleProfiles]);

  const handleNext = () => {
    if (!selected) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("style", selected);
    router.push(`/create/input?${params.toString()}`);
  };

  return (
    <PageTransition className="mx-auto max-w-5xl px-4 py-8">
      <StepIndicator currentStep={2} />
      <div className="mt-6 text-center">
        <h1 className="text-xl font-bold text-purple-900">絵のタッチを選んでください</h1>
        <p className="mt-2 text-sm text-violet-500">
          迷ったら「やさしい水彩」のままで大丈夫です。
        </p>
      </div>

      <p className="mt-6 text-center text-sm text-violet-500">
        {childName ? `${childName}を主人公にします。` : "主人公が未選択です。"}
        {template ? ` ${template.name} をこのタッチで仕上げます。` : ""}
      </p>

      <div className="mt-6">
        <StylePicker
          selected={selected}
          onSelect={setSelected}
          styles={visibleStyleProfiles}
        />
      </div>

      <div className="mt-8 flex justify-center">
        <Button onClick={handleNext} disabled={!selected || !childName || !template} size="lg" className="px-8 py-6 text-lg">
          次へ
        </Button>
      </div>
    </PageTransition>
  );
}

export default function StyleSelectionPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-violet-400">読み込み中...</div>}>
      <StyleSelectionPageContent />
    </Suspense>
  );
}

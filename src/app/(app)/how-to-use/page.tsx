"use client";

import Link from "next/link";
import {
  UserCircle2,
  BookOpen,
  PawPrint,
  Share2,
  Sparkles,
  Zap,
  Camera
} from "lucide-react";
import { PageTransition } from "@/components/page-transition";
import { StaggerContainer } from "@/components/stagger-container";
import { StaggerItem } from "@/components/stagger-item";
import { Button } from "@/components/ui/button";

export default function HowToUsePage() {
  const steps = [
    {
      title: "1. 子どもプロフィールを作る",
      description: "まずは絵本の主人公となるお子さんのプロフィールを登録しましょう。お名前や年齢、そしてAIがイラストを描くための「ビジュアル」を設定します。",
      icon: <UserCircle2 className="h-6 w-6 text-blue-500" />,
      link: "/children",
      linkText: "子どもプロフィールへ"
    },
    {
      title: "2. 絵本を作成する",
      description: "「新しい絵本を作る」から、3つのモードで物語を作成できます。",
      icon: <BookOpen className="h-6 w-6 text-purple-500" />,
      details: [
        {
          label: "AIにおまかせ",
          desc: "テーマを伝えるだけで、AIがオリジナルの物語を書き下ろします。",
          icon: <Sparkles className="h-4 w-4 text-amber-500" />
        },
        {
          label: "できあがり絵本",
          desc: "完成済みのストーリーに、お子さんの名前や思い出を組み込めます。",
          icon: <Zap className="h-4 w-4 text-yellow-500" />
        },
        {
          label: "写真から作る",
          desc: "お手持ちの写真をもとに、AIが思い出を絵本として描き直します。",
          icon: <Camera className="h-4 w-4 text-rose-500" />
        }
      ],
      link: "/create/select-child",
      linkText: "絵本を作る"
    },
    {
      title: "3. 相棒（コンパニオン）を登場させる",
      description: "お子さんと一緒に物語に登場する、動物や妖精などの「相棒」を作ることができます。一度作れば、どの絵本にも呼び出せます。",
      icon: <PawPrint className="h-6 w-6 text-green-500" />,
      link: "/companions",
      linkText: "相棒を作る"
    },
    {
      title: "4. 作った絵本を見る・共有する",
      description: "完成した絵本は「本棚」に保存されます。いつでも読み返せるほか、家族や友人にリンクを送って共有することも可能です。",
      icon: <Share2 className="h-6 w-6 text-orange-500" />,
      link: "/bookshelf",
      linkText: "本棚を見る"
    }
  ];

  return (
    <PageTransition className="mx-auto max-w-2xl px-4 py-8 pb-20">
      <header className="mb-10 text-center">
        <h1 className="text-2xl font-bold text-purple-900">このアプリの使い方</h1>
        <p className="mt-2 text-violet-500">
          Ehoriaで、お子さんが主人公の特別な一冊を作りましょう。
        </p>
      </header>

      <StaggerContainer className="space-y-8">
        {steps.map((step, idx) => (
          <StaggerItem key={idx}>
            <div className="rounded-2xl border border-violet-100 bg-white/80 p-6 shadow-sm backdrop-blur-sm">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-50">
                  {step.icon}
                </div>
                <h2 className="text-lg font-bold text-purple-900">{step.title}</h2>
              </div>

              <p className="text-sm leading-relaxed text-violet-700">
                {step.description}
              </p>

              {step.details && (
                <div className="mt-4 space-y-3 rounded-xl bg-violet-50/50 p-4">
                  {step.details.map((detail, dIdx) => (
                    <div key={dIdx} className="flex gap-3">
                      <div className="mt-0.5 shrink-0">{detail.icon}</div>
                      <div>
                        <p className="text-xs font-bold text-purple-800">{detail.label}</p>
                        <p className="text-xs text-violet-600">{detail.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-6">
                <Link href={step.link}>
                  <Button variant="outline" size="sm" className="w-full sm:w-auto">
                    {step.linkText}
                  </Button>
                </Link>
              </div>
            </div>
          </StaggerItem>
        ))}
      </StaggerContainer>

      <footer className="mt-12 text-center">
        <Link href="/home">
          <Button className="px-12 py-6 text-lg shadow-lg">
            はじめる
          </Button>
        </Link>
      </footer>
    </PageTransition>
  );
}

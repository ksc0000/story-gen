import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FloatingParticles } from "@/components/floating-particles";
import { StaggerContainer } from "@/components/stagger-container";
import { StaggerItem } from "@/components/stagger-item";
import { AnimatedCard } from "@/components/animated-card";

const features = [
  {
    title: "AIが物語を紡ぐ",
    description: "お子さまの名前・好きなものを入力するだけ。AIが世界にひとつだけの物語を作ります。",
    icon: "/images/icons/book.webp",
    shadowColor: "rgba(167, 139, 250, 0.1)",
  },
  {
    title: "プロ品質の挿絵",
    description: "水彩画・フラット・クレヨン風から選べる挿絵をAIが自動生成。温かみのあるイラストをお届けします。",
    icon: "/images/icons/palette.webp",
    shadowColor: "rgba(103, 232, 249, 0.1)",
  },
  {
    title: "安心の安全設計",
    description: "多層コンテンツフィルタで、お子さまに安全な内容のみを生成。安心してお楽しみいただけます。",
    icon: "/images/icons/shield.webp",
    shadowColor: "rgba(253, 224, 71, 0.1)",
  },
];

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-[#fdf2f8] via-[#ede9fe] to-[#e0f2fe]">
      <section className="relative flex flex-col items-center justify-center px-4 pt-20 pb-16 text-center">
        <FloatingParticles />
        <StaggerContainer className="relative z-10 flex flex-col items-center">
          <StaggerItem>
            <Image
              src="/images/illustrations/hero.webp"
              alt="子どもが絵本を読んでいるイラスト"
              width={300}
              height={225}
              priority
              className="rounded-2xl"
            />
          </StaggerItem>
          <StaggerItem>
            <h1 className="mt-6 text-4xl font-bold tracking-tight text-purple-900 sm:text-5xl">
              EhoNAI
            </h1>
          </StaggerItem>
          <StaggerItem>
            <p className="mt-2 text-lg text-violet-600">えほんAI</p>
          </StaggerItem>
          <StaggerItem>
            <p className="mt-6 max-w-xl text-xl leading-relaxed text-gray-600">
              我が子が主人公になれる絵本を、
              <br className="hidden sm:inline" />
              誰でも5分で作れる。
            </p>
          </StaggerItem>
          <StaggerItem>
            <p className="mt-2 text-base text-gray-400">
              AIが紡ぐ物語と挿絵で、世界にひとつだけの思い出を。
            </p>
          </StaggerItem>
          <StaggerItem>
            <Link href="/login" className="mt-8 inline-block">
              <Button size="lg" className="text-lg px-8 py-6">
                無料で絵本を作る
              </Button>
            </Link>
          </StaggerItem>
          <StaggerItem>
            <p className="mt-3 text-sm text-gray-400">月3冊まで無料・登録かんたん</p>
          </StaggerItem>
        </StaggerContainer>
      </section>

      <section className="mx-auto max-w-4xl px-4 pb-20">
        <StaggerContainer className="grid gap-6 sm:grid-cols-3">
          {features.map((f) => (
            <StaggerItem key={f.title}>
              <AnimatedCard>
                <Card>
                  <CardContent className="flex flex-col items-center p-6 text-center">
                    <Image
                      src={f.icon}
                      alt={f.title}
                      width={64}
                      height={64}
                      className="rounded-lg"
                    />
                    <h3 className="mt-4 text-lg font-semibold text-purple-900">
                      {f.title}
                    </h3>
                    <p className="mt-2 text-sm text-gray-600">{f.description}</p>
                  </CardContent>
                </Card>
              </AnimatedCard>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </section>
    </main>
  );
}

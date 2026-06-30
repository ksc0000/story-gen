import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FloatingParticles } from "@/components/floating-particles";
import { StaggerContainer } from "@/components/stagger-container";
import { StaggerItem } from "@/components/stagger-item";
import { AnimatedCard } from "@/components/animated-card";
import { ThemeToggle } from "@/components/theme-toggle";

/** 3つの作り方（作成モード）。アプリの creationMode に対応。 */
const modes = [
  {
    badge: "いちばん簡単",
    title: "テンプレートで作る",
    description:
      "できあがりの物語にお子さまの名前や思い出を入れるだけ。最短数分で、すぐに1冊が完成します。",
    accent: "from-violet-400 to-purple-400",
  },
  {
    badge: "人気No.1",
    title: "かんたんカスタム",
    description:
      "いくつかの質問に答えるだけで、AIがお子さま専用の物語をやさしく組み立てます。",
    accent: "from-fuchsia-400 to-purple-400",
  },
  {
    badge: "自由自在",
    title: "オリジナル・写真から",
    description:
      "自由に書いた内容や、お子さまの写真をもとに、世界にひとつだけの物語と挿絵を生成します。",
    accent: "from-sky-400 to-violet-400",
  },
];

/** かんたん3ステップ。 */
const steps = [
  {
    no: "1",
    title: "お子さまを登録",
    description: "名前・年齢・好きなものを入力。写真を使うと、より本人らしいキャラクターに。",
  },
  {
    no: "2",
    title: "テーマを選ぶ",
    description: "誕生日・寝かしつけ・できたよ記念など、シーンに合わせて選ぶだけ。",
  },
  {
    no: "3",
    title: "5分でできあがり",
    description: "AIが物語と挿絵を自動生成。その場で読んで、何度でも楽しめます。",
  },
];

/** 3つの安心ポイント（切り抜き素材を使用）。 */
const features = [
  {
    title: "我が子だけの魔法の物語",
    description:
      "名前・見た目・好きなものを反映。お子さまが主人公になって冒険する、唯一無二の絵本に。",
    image: "/images/lp/cutout-magic-book.webp",
    shadow: "rgba(167, 139, 250, 0.25)",
  },
  {
    title: "贈り物にもぴったり",
    description:
      "誕生日・入園・卒園・お祝いに。世界にひとつの絵本は、心に残る特別なギフトになります。",
    image: "/images/lp/cutout-gift-book.webp",
    shadow: "rgba(244, 114, 182, 0.25)",
  },
  {
    title: "安心の安全設計",
    description:
      "多層コンテンツフィルタで、お子さまに安全な内容のみを生成。安心してお楽しみいただけます。",
    image: "/images/lp/cutout-safety-shield.webp",
    shadow: "rgba(253, 224, 71, 0.3)",
  },
];

export default function LandingPage() {
  return (
    <main className="app-shell overflow-x-hidden">
      {/* ───────────── Hero ───────────── */}
      <section className="relative flex flex-col items-center justify-center px-4 pt-16 pb-12 text-center sm:pt-20">
        <FloatingParticles />
        <StaggerContainer className="relative z-10 flex w-full flex-col items-center">
          <StaggerItem>
            <div className="mb-4">
              <ThemeToggle />
            </div>
          </StaggerItem>
          <StaggerItem>
            <Image
              src="/logo/ehoria-logo-512.png"
              alt="Ehoria"
              width={180}
              height={180}
              priority
              className="rounded-2xl"
            />
          </StaggerItem>
          <StaggerItem>
            <h1 className="sr-only">Ehoria — AIで絵本を作ろう</h1>
          </StaggerItem>
          <StaggerItem>
            <p className="app-subtitle mt-2 text-lg">AIで絵本を作ろう</p>
          </StaggerItem>
          <StaggerItem>
            <p className="app-copy mt-5 max-w-2xl text-2xl font-bold leading-relaxed sm:text-3xl">
              我が子が主人公になれる絵本を、
              <br className="hidden sm:inline" />
              誰でも5分で作れる。
            </p>
          </StaggerItem>
          <StaggerItem>
            <p className="app-copy-muted mt-3 max-w-xl text-base">
              AIが紡ぐ物語とあたたかい挿絵で、世界にひとつだけの思い出を。
            </p>
          </StaggerItem>
          <StaggerItem>
            <Link href="/login" className="mt-7 inline-block">
              <Button size="lg" className="text-lg px-8 py-6">
                無料で絵本を作る
              </Button>
            </Link>
          </StaggerItem>
          <StaggerItem>
            <p className="app-copy-muted mt-3 text-sm">無料ではじめられる・登録かんたん・クレカ不要</p>
          </StaggerItem>

          {/* ヒーロー画像 */}
          <StaggerItem>
            <div className="relative mt-10 w-full max-w-4xl">
              <div className="overflow-hidden rounded-[28px] shadow-2xl ring-1 ring-violet-200/60 sm:rounded-[36px]">
                <Image
                  src="/images/lp/hero-family-reading.webp"
                  alt="家族でEhoriaの絵本を読んで楽しむ様子"
                  width={1672}
                  height={941}
                  priority
                  className="h-auto w-full object-cover"
                />
              </div>
              {/* 浮かせた切り抜き */}
              <Image
                src="/images/lp/cutout-magic-book.webp"
                alt=""
                aria-hidden
                width={1254}
                height={1254}
                className="pointer-events-none absolute -bottom-8 -right-4 hidden w-28 drop-shadow-2xl sm:block md:w-36"
              />
            </div>
          </StaggerItem>
        </StaggerContainer>
      </section>

      {/* ───────────── 我が子が主人公 ───────────── */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:py-20">
        <div className="grid items-center gap-10 md:grid-cols-2">
          <AnimatedCard>
            <div className="overflow-hidden rounded-[28px] shadow-xl ring-1 ring-violet-200/60">
              <Image
                src="/images/lp/personalized-book-spread.webp"
                alt="お子さまの名前や見た目が反映された絵本の見開きページ"
                width={1672}
                height={941}
                className="h-auto w-full object-cover"
              />
            </div>
          </AnimatedCard>
          <div>
            <span className="inline-block rounded-full bg-violet-100 px-3 py-1 text-xs font-bold text-purple-700">
              世界にひとつだけ
            </span>
            <h2 className="mt-3 text-2xl font-bold text-purple-900 sm:text-3xl">
              名前も、見た目も、好きなものも。
              <br />
              絵本の中で“あの子”が動き出す。
            </h2>
            <p className="mt-4 text-base leading-relaxed text-gray-600">
              お子さまの名前・年齢・好きなものを物語に反映。お写真を使えば、
              本人らしさを残したやさしいキャラクターに変換します。読むたびに
              「これ、ぼく/わたしだ！」と笑顔がこぼれる1冊に。
            </p>
            <ul className="mt-6 space-y-2 text-sm text-purple-800">
              {[
                "主人公はいつもお子さま自身",
                "なかよしキャラと一緒に冒険も",
                "4・8・12ページから選べる読み応え",
              ].map((t) => (
                <li key={t} className="flex items-center gap-2">
                  <span className="grid size-5 shrink-0 place-items-center rounded-full bg-violet-400 text-[11px] font-bold text-white">
                    ✓
                  </span>
                  {t}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ───────────── 3つの作り方 ───────────── */}
      <section className="bg-gradient-to-b from-violet-50/60 to-transparent py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-purple-900 sm:text-3xl">3つの作り方から選べる</h2>
            <p className="mt-3 text-base text-gray-600">
              「とにかく簡単に」から「自由にこだわって」まで。今の気分にぴったりの方法で。
            </p>
          </div>

          <div className="mx-auto mt-10 max-w-4xl overflow-hidden rounded-[28px] shadow-xl ring-1 ring-violet-200/60">
            <Image
              src="/images/lp/three-magic-modes.webp"
              alt="テンプレート・かんたんカスタム・オリジナルの3つの作成モード"
              width={1672}
              height={941}
              className="h-auto w-full object-cover"
            />
          </div>

          <StaggerContainer className="mt-10 grid gap-6 sm:grid-cols-3">
            {modes.map((m) => (
              <StaggerItem key={m.title}>
                <AnimatedCard>
                  <Card className="h-full">
                    <CardContent className="flex h-full flex-col p-6">
                      <span
                        className={`inline-block w-fit rounded-full bg-gradient-to-r ${m.accent} px-3 py-1 text-xs font-bold text-white`}
                      >
                        {m.badge}
                      </span>
                      <h3 className="mt-3 text-lg font-bold text-purple-900">{m.title}</h3>
                      <p className="mt-2 text-sm leading-relaxed text-gray-600">{m.description}</p>
                    </CardContent>
                  </Card>
                </AnimatedCard>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* ───────────── かんたん3ステップ ───────────── */}
      <section className="mx-auto max-w-5xl px-4 py-16 sm:py-20">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-purple-900 sm:text-3xl">作り方はかんたん3ステップ</h2>
          <p className="mt-3 text-base text-gray-600">スマホひとつで、思い立ったその日に。</p>
        </div>
        <StaggerContainer className="mt-10 grid gap-6 sm:grid-cols-3">
          {steps.map((s) => (
            <StaggerItem key={s.no}>
              <Card className="h-full">
                <CardContent className="flex h-full flex-col items-center p-6 text-center">
                  <span className="grid size-12 place-items-center rounded-full bg-gradient-to-r from-purple-400 to-violet-400 text-xl font-bold text-white shadow-md">
                    {s.no}
                  </span>
                  <h3 className="mt-4 text-lg font-bold text-purple-900">{s.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-gray-600">{s.description}</p>
                </CardContent>
              </Card>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </section>

      {/* ───────────── 3つの安心ポイント ───────────── */}
      <section className="mx-auto max-w-6xl px-4 pb-16 sm:pb-20">
        <StaggerContainer className="grid gap-6 sm:grid-cols-3">
          {features.map((f) => (
            <StaggerItem key={f.title}>
              <AnimatedCard>
                <Card className="h-full">
                  <CardContent className="flex h-full flex-col items-center p-6 text-center">
                    <div
                      className="rounded-3xl p-2"
                      style={{ filter: `drop-shadow(0 10px 24px ${f.shadow})` }}
                    >
                      <Image
                        src={f.image}
                        alt={f.title}
                        width={1254}
                        height={1254}
                        className="h-28 w-28 object-contain"
                      />
                    </div>
                    <h3 className="mt-4 text-lg font-bold text-purple-900">{f.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-gray-600">{f.description}</p>
                  </CardContent>
                </Card>
              </AnimatedCard>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </section>

      {/* ───────────── 成長の記録 ───────────── */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:py-20">
        <div className="grid items-center gap-10 md:grid-cols-2">
          <div className="order-2 md:order-1">
            <span className="inline-block rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-700">
              読むほど、増えていく
            </span>
            <h2 className="mt-3 text-2xl font-bold text-purple-900 sm:text-3xl">
              作った絵本は、
              <br />
              成長の本棚に。
            </h2>
            <p className="mt-4 text-base leading-relaxed text-gray-600">
              できた絵本はマイ本棚にずらりと並びます。誕生日、はじめてのおつかい、
              できたよ記念——日々の思い出が1冊ずつ積み重なって、お子さまだけの
              “成長の物語”になっていきます。
            </p>
            <Link href="/login" className="mt-6 inline-block">
              <Button size="lg" variant="outline" className="px-7">
                本棚を作りはじめる
              </Button>
            </Link>
          </div>
          <AnimatedCard>
            <div className="order-1 overflow-hidden rounded-[28px] shadow-xl ring-1 ring-violet-200/60 md:order-2">
              <Image
                src="/images/lp/growth-bookshelf.webp"
                alt="作った絵本が並んだ成長の本棚"
                width={1672}
                height={941}
                className="h-auto w-full object-cover"
              />
            </div>
          </AnimatedCard>
        </div>
      </section>

      {/* ───────────── 最終CTA ───────────── */}
      <section className="px-4 pb-20">
        <div className="relative mx-auto max-w-4xl overflow-hidden rounded-[32px] bg-gradient-to-br from-purple-500 to-violet-500 px-6 py-14 text-center shadow-2xl">
          <Image
            src="/images/lp/cutout-gift-book.webp"
            alt=""
            aria-hidden
            width={1254}
            height={1254}
            className="pointer-events-none absolute -left-6 -top-6 w-28 opacity-90 drop-shadow-xl sm:w-36"
          />
          <Image
            src="/images/lp/cutout-magic-book.webp"
            alt=""
            aria-hidden
            width={1254}
            height={1254}
            className="pointer-events-none absolute -bottom-8 -right-6 w-28 opacity-90 drop-shadow-xl sm:w-36"
          />
          <div className="relative z-10">
            <h2 className="text-2xl font-bold text-white sm:text-3xl">
              さあ、はじめての1冊をつくろう。
            </h2>
            <p className="mt-3 text-base text-violet-50">
              無料ではじめられます。登録はかんたん、クレジットカードは不要です。
            </p>
            <Link href="/login" className="mt-7 inline-block">
              <Button size="lg" variant="secondary" className="bg-white px-8 py-6 text-lg text-purple-700 hover:bg-violet-50">
                無料で絵本を作る
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ───────────── Footer ───────────── */}
      <footer className="border-t border-violet-100 px-6 py-10">
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-4">
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-violet-500">
            <Link href="/legal/terms" className="hover:text-purple-700 hover:underline">
              利用規約
            </Link>
            <Link href="/legal/privacy" className="hover:text-purple-700 hover:underline">
              プライバシーポリシー
            </Link>
            <Link href="/legal/tokushoho" className="hover:text-purple-700 hover:underline">
              特定商取引法に基づく表記
            </Link>
          </div>
          <p className="text-xs text-violet-400">© 2026 Ehoria</p>
        </div>
      </footer>
    </main>
  );
}

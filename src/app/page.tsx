import Link from "next/link";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { FloatingParticles } from "@/components/floating-particles";
import { StaggerContainer } from "@/components/stagger-container";
import { StaggerItem } from "@/components/stagger-item";
import { ThemeToggle } from "@/components/theme-toggle";
import { CtaButton } from "@/components/lp/cta-button";
import { PLAN_CONFIGS } from "@/lib/plans";
import {
  Reveal,
  RevealGroup,
  RevealItem,
  Parallax,
  Float,
  Lift,
  ScrollProgressBar,
} from "@/components/lp/motion-bits";

const modes = [
  {
    emoji: "⏱️",
    badge: "最短1分",
    title: "おまかせテンプレート",
    description:
      "テーマを選ぶだけで完成。疲れている夜のベッドタイムに最適な物語を、すぐにお届けします。",
    accent: "from-violet-400 to-purple-400",
  },
  {
    emoji: "💬",
    badge: "人気No.1",
    title: "いっしょにAI作成",
    description:
      "親子で会話しながら「次はどうなる？」と選んで進める、インタラクティブな作成モードです。",
    accent: "from-fuchsia-400 to-purple-400",
  },
  {
    emoji: "✨",
    badge: "本格派",
    title: "完全オリジナル",
    description:
      "誕生日や特別な行事に。登場人物から細かなストーリーまで、すべて自由に作り込めます。",
    accent: "from-sky-400 to-violet-400",
  },
];

const ageBands = [
  {
    emoji: "🌱",
    age: "1〜2歳",
    title: "オノマトペとリズム",
    example: "「わんわん、だーれだ？」「ぽんぽん、ころころ！」",
  },
  {
    emoji: "🌿",
    age: "3〜4歳",
    title: "シンプルな起承転結",
    example: "「おもちゃをかしてあげる、やさしいライオンさんのおはなし。」",
  },
  {
    emoji: "🌳",
    age: "5〜6歳",
    title: "豊かな語彙と選択",
    example: "「迷いの森で、勇気を出して正しい道を選ぶ大冒険。」",
  },
];

const useCases = [
  {
    image: "/images/lp/usecase-bedtime.webp",
    title: "おやすみ前の共創タイム",
    description:
      "トイレトレーニングやお友達とのけんかなど、いま直面している子育ての課題を、やさしい物語にして心に寄り添います。",
  },
  {
    image: "/images/lp/usecase-keepsake.webp",
    title: "記念日のオーダーメイド絵本",
    description:
      "誕生日・発表会・卒園に。大切な思い出を世界にひとつの絵本にして、特別な贈り物にできます。",
  },
];

const bookshelf = [
  { age: "3歳", title: "電車の大冒険", emoji: "🚃" },
  { age: "4歳", title: "はじめての恐竜", emoji: "🦕" },
  { age: "5歳", title: "妹がやってきた日", emoji: "👶" },
  { age: "6歳", title: "お友達に貸してあげる", emoji: "🤝" },
];

const trust = [
  {
    image: "/images/lp/cutout-safety-shield.webp",
    title: "安心のプライバシー",
    description:
      "お子さまの名前や物語のデータは、銀行レベルの厳格なセキュリティで保護。外部に漏れることはありません。",
  },
];

// 料金プラン（金額・冊数・ページ数は PLAN_CONFIGS を単一の真実として参照）。
const plans = [
  {
    cfg: PLAN_CONFIGS.free,
    tagline: "まずは無料でお試し",
    highlight: false,
    features: ["テンプレートで作成", "やさしい水彩の挿絵", "なかよしキャラ"],
  },
  {
    cfg: PLAN_CONFIGS.standard_paid,
    tagline: "いちばん人気",
    highlight: true,
    features: ["＋かんたんカスタムモード", "高品質生成", "お子さま3人まで登録"],
  },
  {
    cfg: PLAN_CONFIGS.premium_paid,
    tagline: "特別な1冊・ギフトに",
    highlight: false,
    features: ["全モード＋写真からつくる", "高精細生成", "登録人数・なかよし無制限"],
  },
];

function formatYen(n?: number): string {
  return `¥${(n ?? 0).toLocaleString()}`;
}

function Check() {
  return (
    <span className="grid size-5 shrink-0 place-items-center rounded-full bg-violet-400 text-[11px] font-bold text-white">
      ✓
    </span>
  );
}

export default function LandingPage() {
  return (
    <main className="app-shell overflow-x-hidden">
      <ScrollProgressBar />

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
              width={168}
              height={168}
              priority
              className="rounded-2xl"
            />
          </StaggerItem>
          <StaggerItem>
            <h1 className="sr-only">Ehoria — 世界にひとつだけの絵本を、AIと魔法で。</h1>
          </StaggerItem>
          <StaggerItem>
            <p className="app-subtitle mt-2 text-base">AIで絵本を作ろう</p>
          </StaggerItem>
          <StaggerItem>
            <p className="app-copy mt-5 max-w-2xl text-2xl font-bold leading-snug sm:text-4xl">
              世界にひとつだけの絵本を、
              <br />
              <span className="bg-gradient-to-r from-purple-500 via-fuchsia-500 to-violet-500 bg-clip-text text-transparent">
                AIと魔法で。
              </span>
            </p>
          </StaggerItem>
          <StaggerItem>
            <p className="app-copy-muted mt-4 max-w-xl text-base leading-relaxed">
              お子さまが主人公になって冒険する物語を、誰でも5分で。
              <br className="hidden sm:inline" />
              AIが紡ぐ物語とあたたかい挿絵で、忘れられない思い出を。
            </p>
          </StaggerItem>
          <StaggerItem>
            <div className="mt-7">
              <CtaButton location="hero" className="text-lg px-8 py-6" />
            </div>
          </StaggerItem>
          <StaggerItem>
            <p className="app-copy-muted mt-3 text-sm">月3冊まで無料・登録かんたん・クレカ不要</p>
          </StaggerItem>
        </StaggerContainer>

        {/* ヒーロー画像（パララックス＋浮遊する魔法の本） */}
        <Reveal className="relative z-10 mt-10 w-full max-w-4xl" amount={0.1}>
          <Parallax strength={36}>
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
          </Parallax>
          <Float className="pointer-events-none absolute -bottom-8 -right-3 hidden sm:block" distance={16}>
            <Image
              src="/images/lp/cutout-magic-book.webp"
              alt=""
              aria-hidden
              width={1254}
              height={1254}
              className="w-28 drop-shadow-2xl md:w-36"
            />
          </Float>
        </Reveal>
      </section>

      {/* ───────────── 問題提起 → 解決 ───────────── */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:py-24">
        <Reveal className="text-center">
          <h2 className="text-2xl font-bold text-purple-900 sm:text-4xl">
            もしも、お子さん自身が
            <br className="sm:hidden" />
            絵本の主人公になれたら？
          </h2>
        </Reveal>
        <div className="mt-12 grid items-stretch gap-6 md:grid-cols-2">
          <Reveal direction="left">
            <Card className="h-full bg-slate-50/80">
              <CardContent className="flex h-full flex-col items-center p-8 text-center">
                <div className="w-full overflow-hidden rounded-2xl shadow-sm ring-1 ring-slate-200">
                  <Image
                    src="/images/lp/ordinary-bedtime.webp"
                    alt="いつもの絵本での寝かしつけの様子"
                    width={1672}
                    height={941}
                    className="h-44 w-full object-cover"
                  />
                </div>
                <h3 className="mt-5 text-lg font-bold text-slate-600">いつもの読み聞かせ</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">
                  毎晩の読み聞かせは親子の特別な時間。でも、ときには
                  「また同じ絵本？」と感じてしまうことも。
                </p>
              </CardContent>
            </Card>
          </Reveal>
          <Reveal direction="right" delay={0.1}>
            <Card className="relative h-full overflow-hidden ring-2 ring-violet-300">
              <CardContent className="flex h-full flex-col items-center p-8 text-center">
                <div className="w-full overflow-hidden rounded-2xl shadow-md ring-1 ring-violet-200/60">
                  <Image
                    src="/images/lp/personalized-book-spread.webp"
                    alt="お子さまの名前や見た目が反映された絵本の見開き"
                    width={1672}
                    height={941}
                    className="h-44 w-full object-cover"
                  />
                </div>
                <h3 className="mt-5 text-lg font-bold text-purple-900">Ehoria なら</h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-600">
                  お子さまの名前・今の興味・無限の想像力を組み合わせて、
                  その子のためだけの新しい物語を数分で紡ぎ出します。
                </p>
              </CardContent>
            </Card>
          </Reveal>
        </div>
      </section>

      {/* ───────────── 仕組み（入力 → 絵本） ───────────── */}
      <section className="bg-gradient-to-b from-violet-50/70 to-transparent py-16 sm:py-24">
        <div className="mx-auto max-w-5xl px-4">
          <Reveal className="text-center">
            <h2 className="text-2xl font-bold text-purple-900 sm:text-4xl">
              想像力を、美しい物語に紡ぐ。
            </h2>
            <p className="mt-3 text-base text-gray-600">
              難しい操作は一切不要。スマホでいくつかの質問に答えるだけで、
              プロのようなイラストとやさしい物語が自動で完成します。
            </p>
          </Reveal>

          <Reveal className="mx-auto mt-12 max-w-4xl" amount={0.15}>
            <Parallax strength={24}>
              <div className="overflow-hidden rounded-[28px] shadow-xl ring-1 ring-violet-200/60">
                <Image
                  src="/images/lp/inputs-to-book-flow.webp"
                  alt="名前・今日の出来事・好きな恐竜が、AIによって1冊の絵本に紡がれていく流れ"
                  width={1672}
                  height={941}
                  className="h-auto w-full object-cover"
                />
              </div>
            </Parallax>
          </Reveal>

          {/* 入力例チップ（軽いモーションは維持） */}
          <RevealGroup className="mt-8 flex flex-wrap justify-center gap-3">
            {[
              { emoji: "🧒", label: "お子さんの名前" },
              { emoji: "🌤️", label: "今日の出来事" },
              { emoji: "🦕", label: "大好きな恐竜" },
            ].map((chip) => (
              <RevealItem key={chip.label}>
                <div className="flex items-center gap-2 rounded-full bg-white px-4 py-2 shadow-md ring-1 ring-violet-100">
                  <span className="text-lg">{chip.emoji}</span>
                  <span className="text-sm font-semibold text-purple-800">{chip.label}</span>
                </div>
              </RevealItem>
            ))}
          </RevealGroup>
        </div>
      </section>

      {/* ───────────── 3つの作り方 ───────────── */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:py-24">
        <Reveal className="text-center">
          <h2 className="text-2xl font-bold text-purple-900 sm:text-4xl">
            その日のペースで選べる、3つの魔法。
          </h2>
          <p className="mt-3 text-base text-gray-600">
            「とにかく簡単に」から「自由にこだわって」まで。今の気分にぴったりの方法で。
          </p>
        </Reveal>

        <Reveal className="mx-auto mt-10 max-w-4xl" amount={0.15}>
          <Parallax strength={24}>
            <div className="overflow-hidden rounded-[28px] shadow-xl ring-1 ring-violet-200/60">
              <Image
                src="/images/lp/three-magic-modes.webp"
                alt="テンプレート・かんたんカスタム・オリジナルの3つの作成モード"
                width={1672}
                height={941}
                className="h-auto w-full object-cover"
              />
            </div>
          </Parallax>
        </Reveal>

        <RevealGroup className="mt-10 grid gap-6 sm:grid-cols-3">
          {modes.map((m) => (
            <RevealItem key={m.title}>
              <Lift className="h-full">
                <Card className="h-full">
                  <CardContent className="flex h-full flex-col p-6">
                    <div className="flex items-center gap-3">
                      <span className="grid size-11 place-items-center rounded-2xl bg-violet-50 text-2xl">
                        {m.emoji}
                      </span>
                      <span
                        className={`rounded-full bg-gradient-to-r ${m.accent} px-3 py-1 text-xs font-bold text-white`}
                      >
                        {m.badge}
                      </span>
                    </div>
                    <h3 className="mt-4 text-lg font-bold text-purple-900">{m.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-gray-600">{m.description}</p>
                  </CardContent>
                </Card>
              </Lift>
            </RevealItem>
          ))}
        </RevealGroup>
      </section>

      {/* ───────────── 年齢で育つ ───────────── */}
      <section className="bg-gradient-to-b from-emerald-50/50 to-transparent py-16 sm:py-24">
        <div className="mx-auto max-w-6xl px-4">
          <Reveal className="text-center">
            <h2 className="text-2xl font-bold text-purple-900 sm:text-4xl">
              成長に合わせて、言葉も物語も一緒に育つ。
            </h2>
            <p className="mt-3 text-base text-gray-600">
              年齢に合わせて、文章のレベルも物語のテーマもAIが自動で調整します。
            </p>
          </Reveal>

          <Reveal className="mx-auto mt-10 max-w-4xl" amount={0.15}>
            <Parallax strength={24}>
              <div className="overflow-hidden rounded-[28px] shadow-xl ring-1 ring-emerald-200/50">
                <Image
                  src="/images/lp/growth-tree-stages.webp"
                  alt="芽から大樹へ。成長に合わせて物語が育っていくイメージ"
                  width={1672}
                  height={941}
                  className="h-auto w-full object-cover"
                />
              </div>
            </Parallax>
          </Reveal>

          <RevealGroup className="mt-10 grid gap-6 sm:grid-cols-3">
            {ageBands.map((b, i) => (
              <RevealItem key={b.age}>
                <Lift className="h-full">
                  <Card className="h-full">
                    <CardContent className="flex h-full flex-col items-center p-6 text-center">
                      <Float distance={8} delay={i * 0.3}>
                        <span className="text-5xl">{b.emoji}</span>
                      </Float>
                      <span className="mt-3 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
                        {b.age}向け
                      </span>
                      <h3 className="mt-3 text-lg font-bold text-purple-900">{b.title}</h3>
                      <p className="mt-2 text-sm leading-relaxed text-gray-600">{b.example}</p>
                    </CardContent>
                  </Card>
                </Lift>
              </RevealItem>
            ))}
          </RevealGroup>
        </div>
      </section>

      {/* ───────────── 相棒キャラ ───────────── */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:py-24">
        <div className="grid items-center gap-10 md:grid-cols-2">
          <Reveal direction="left">
            <span className="inline-block rounded-full bg-fuchsia-100 px-3 py-1 text-xs font-bold text-fuchsia-700">
              いつも隣に
            </span>
            <h2 className="mt-3 text-2xl font-bold text-purple-900 sm:text-4xl">
              どんな物語でも、
              <br />
              「自分だけの相棒」が一緒。
            </h2>
            <p className="mt-4 text-base leading-relaxed text-gray-600">
              お子さま専用の相棒キャラクターを作成できます。宇宙の冒険でも、
              森の探検でも、いつも同じお友達が登場することで、物語の世界に
              深い安心感と愛着が生まれます。
            </p>
          </Reveal>
          <Reveal direction="right">
            <Parallax strength={24}>
              <div className="overflow-hidden rounded-[28px] shadow-xl ring-1 ring-fuchsia-200/50">
                <Image
                  src="/images/lp/companion-scenes.webp"
                  alt="宇宙・森・おうちの3つの場面で、同じ相棒キャラが子どもと一緒にいる様子"
                  width={1672}
                  height={941}
                  className="h-auto w-full object-cover"
                />
              </div>
            </Parallax>
          </Reveal>
        </div>
      </section>

      {/* ───────────── 利用シーン ───────────── */}
      <section className="bg-gradient-to-b from-violet-50/70 to-transparent py-16 sm:py-24">
        <div className="mx-auto max-w-5xl px-4">
          <Reveal className="text-center">
            <h2 className="text-2xl font-bold text-purple-900 sm:text-4xl">
              毎日のベッドタイムから、特別な記念日まで。
            </h2>
          </Reveal>
          <RevealGroup className="mt-10 grid gap-6 sm:grid-cols-2">
            {useCases.map((u) => (
              <RevealItem key={u.title}>
                <Lift className="h-full">
                  <Card className="h-full overflow-hidden">
                    <div className="overflow-hidden">
                      <Image
                        src={u.image}
                        alt={u.title}
                        width={1672}
                        height={941}
                        className="h-44 w-full object-cover transition duration-500 hover:scale-105"
                      />
                    </div>
                    <CardContent className="flex flex-col p-7">
                      <h3 className="text-lg font-bold text-purple-900">{u.title}</h3>
                      <p className="mt-2 text-sm leading-relaxed text-gray-600">{u.description}</p>
                    </CardContent>
                  </Card>
                </Lift>
              </RevealItem>
            ))}
          </RevealGroup>
        </div>
      </section>

      {/* ───────────── 成長の記録（本棚） ───────────── */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:py-24">
        <div className="grid items-center gap-10 md:grid-cols-2">
          <Reveal direction="left" className="md:order-2">
            <Parallax strength={28}>
              <div className="overflow-hidden rounded-[28px] shadow-xl ring-1 ring-violet-200/60">
                <Image
                  src="/images/lp/growth-bookshelf.webp"
                  alt="作った絵本が並んだ成長の本棚"
                  width={1672}
                  height={941}
                  className="h-auto w-full object-cover"
                />
              </div>
            </Parallax>
          </Reveal>
          <div className="md:order-1">
            <Reveal>
              <span className="inline-block rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-700">
                読むほど、増えていく
              </span>
              <h2 className="mt-3 text-2xl font-bold text-purple-900 sm:text-4xl">
                作った絵本は、
                <br />
                かけがえのない成長の記録に。
              </h2>
              <p className="mt-4 text-base leading-relaxed text-gray-600">
                数年後に本棚を振り返れば、その時々の興味や成長の軌跡がそのまま残る、
                家族だけのデジタルアルバムになります。
              </p>
            </Reveal>
            <RevealGroup className="mt-6 space-y-2">
              {bookshelf.map((b) => (
                <RevealItem key={b.age}>
                  <div className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3 shadow-sm ring-1 ring-violet-100">
                    <span className="text-2xl">{b.emoji}</span>
                    <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-bold text-purple-700">
                      {b.age}
                    </span>
                    <span className="text-sm font-medium text-purple-900">{b.title}</span>
                  </div>
                </RevealItem>
              ))}
            </RevealGroup>
          </div>
        </div>
      </section>

      {/* ───────────── 安心設計 ───────────── */}
      <section className="mx-auto max-w-5xl px-4 pb-16 sm:pb-24">
        <Reveal className="text-center">
          <h2 className="text-2xl font-bold text-purple-900 sm:text-4xl">
            眠る前の安心感と、家族のデータを守る設計。
          </h2>
        </Reveal>
        <RevealGroup className="mt-10 grid gap-6 sm:grid-cols-2">
          <RevealItem>
            <Lift className="h-full">
              <Card className="h-full">
                <CardContent className="flex h-full flex-col items-center p-7 text-center">
                  <span className="text-5xl">😌</span>
                  <h3 className="mt-3 text-lg font-bold text-purple-900">やさしいデザイン</h3>
                  <p className="mt-2 text-sm leading-relaxed text-gray-600">
                    睡眠前の興奮を抑えるため、画面はすべて目にやさしいパステルカラーで統一。
                    丸みを帯びた読みやすいフォントを採用しています。
                  </p>
                </CardContent>
              </Card>
            </Lift>
          </RevealItem>
          {trust.map((t) => (
            <RevealItem key={t.title}>
              <Lift className="h-full">
                <Card className="h-full">
                  <CardContent className="flex h-full flex-col items-center p-7 text-center">
                    <Float distance={8}>
                      <Image
                        src={t.image}
                        alt={t.title}
                        width={1254}
                        height={1254}
                        className="h-16 w-16 object-contain"
                      />
                    </Float>
                    <h3 className="mt-3 text-lg font-bold text-purple-900">{t.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-gray-600">{t.description}</p>
                  </CardContent>
                </Card>
              </Lift>
            </RevealItem>
          ))}
        </RevealGroup>
      </section>

      {/* ───────────── 料金プラン ───────────── */}
      <section className="bg-gradient-to-b from-violet-50/70 to-transparent py-16 sm:py-24">
        <div className="mx-auto max-w-6xl px-4">
          <Reveal className="text-center">
            <h2 className="text-2xl font-bold text-purple-900 sm:text-4xl">
              まずは無料で、気軽にはじめる。
            </h2>
            <p className="mt-3 text-base text-gray-600">
              いつでもアップグレード・解約できます。クレジットカードの登録は無料プランでは不要です。
            </p>
          </Reveal>

          <RevealGroup className="mt-12 grid items-stretch gap-6 md:grid-cols-3">
            {plans.map((p) => (
              <RevealItem key={p.cfg.productPlan}>
                <Lift className="h-full">
                  <Card
                    className={`relative flex h-full flex-col ${
                      p.highlight ? "ring-2 ring-purple-400 shadow-lg" : ""
                    }`}
                  >
                    {p.highlight ? (
                      <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-purple-500 to-violet-500 px-4 py-1 text-xs font-bold text-white shadow-md">
                        {p.tagline}
                      </span>
                    ) : null}
                    <CardContent className="flex h-full flex-col p-7">
                      {!p.highlight ? (
                        <span className="text-xs font-bold text-violet-500">{p.tagline}</span>
                      ) : (
                        <span className="text-xs font-bold text-transparent">.</span>
                      )}
                      <h3 className="mt-1 text-xl font-bold text-purple-900">{p.cfg.label}</h3>
                      <div className="mt-3 flex items-baseline gap-1">
                        <span className="text-3xl font-bold text-purple-900">
                          {formatYen(p.cfg.priceJpy)}
                        </span>
                        {p.cfg.isPaid ? (
                          <span className="text-sm text-gray-500">/月</span>
                        ) : null}
                      </div>
                      <ul className="mt-5 space-y-2 text-sm text-purple-800">
                        <li className="flex items-center gap-2">
                          <Check />
                          月{p.cfg.monthlyBookQuota}冊まで作成
                        </li>
                        <li className="flex items-center gap-2">
                          <Check />
                          {p.cfg.allowedPageCounts.join("・")}ページ
                        </li>
                        {p.features.map((f) => (
                          <li key={f} className="flex items-center gap-2">
                            <Check />
                            {f}
                          </li>
                        ))}
                      </ul>
                      <div className="mt-7 pt-2">
                        <CtaButton
                          location={`pricing_${p.cfg.productPlan}`}
                          variant={p.highlight ? "default" : "outline"}
                          className="w-full"
                        >
                          {p.cfg.isPaid ? "このプランを選ぶ" : "無料ではじめる"}
                        </CtaButton>
                      </div>
                    </CardContent>
                  </Card>
                </Lift>
              </RevealItem>
            ))}
          </RevealGroup>
          <Reveal className="mt-6 text-center">
            <p className="text-xs text-violet-400">
              ※ 表示は税込価格です。プラン内容は予告なく変更される場合があります。
            </p>
          </Reveal>
        </div>
      </section>

      {/* ───────────── 最終CTA ───────────── */}
      <section className="px-4 pb-20">
        <Reveal>
          <div className="relative mx-auto max-w-4xl overflow-hidden rounded-[32px] bg-gradient-to-br from-purple-500 to-violet-500 px-6 py-16 text-center shadow-2xl">
            <Float className="pointer-events-none absolute -left-6 -top-6" distance={14}>
              <Image
                src="/images/lp/cutout-gift-book.webp"
                alt=""
                aria-hidden
                width={1254}
                height={1254}
                className="w-28 opacity-90 drop-shadow-xl sm:w-36"
              />
            </Float>
            <Float className="pointer-events-none absolute -bottom-8 -right-6" distance={16} delay={0.5}>
              <Image
                src="/images/lp/cutout-magic-book.webp"
                alt=""
                aria-hidden
                width={1254}
                height={1254}
                className="w-28 opacity-90 drop-shadow-xl sm:w-36"
              />
            </Float>
            <div className="relative z-10">
              <h2 className="text-2xl font-bold text-white sm:text-4xl">
                さあ、最初のページを開きましょう。
              </h2>
              <p className="mt-4 text-base text-violet-50">
                お子さまの笑顔と、無限の想像力が待っています。
                <br className="hidden sm:inline" />
                今すぐ、家族だけの特別な物語を作りはじめませんか？
              </p>
              <div className="mt-8">
                <CtaButton
                  location="final"
                  variant="secondary"
                  className="bg-white px-8 py-6 text-lg text-purple-700 hover:bg-violet-50"
                />
              </div>
              <p className="mt-3 text-sm text-violet-100">登録かんたん・クレカ不要</p>
            </div>
          </div>
        </Reveal>
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

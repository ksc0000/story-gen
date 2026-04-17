import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const features = [
  { title: "AIが物語を紡ぐ", description: "お子さまの名前・好きなものを入力するだけ。AIが世界にひとつだけの物語を作ります。", icon: "📖" },
  { title: "プロ品質の挿絵", description: "水彩画・フラット・クレヨン風から選べる挿絵をAIが自動生成。温かみのあるイラストをお届けします。", icon: "🎨" },
  { title: "安心の安全設計", description: "多層コンテンツフィルタで、お子さまに安全な内容のみを生成。安心してお楽しみいただけます。", icon: "🛡️" },
];

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-50">
      <section className="flex flex-col items-center justify-center px-4 pt-20 pb-16 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-amber-900 sm:text-5xl">EhoNAI</h1>
        <p className="mt-2 text-lg text-amber-700">えほんAI</p>
        <p className="mt-6 max-w-xl text-xl leading-relaxed text-gray-700">
          我が子が主人公になれる絵本を、<br className="hidden sm:inline" />誰でも5分で作れる。
        </p>
        <p className="mt-2 text-base text-gray-500">AIが紡ぐ物語と挿絵で、世界にひとつだけの思い出を。</p>
        <Link href="/login" className="mt-8">
          <Button size="lg" className="bg-amber-600 hover:bg-amber-700 text-white text-lg px-8 py-6">無料で絵本を作る</Button>
        </Link>
        <p className="mt-3 text-sm text-gray-400">月3冊まで無料・登録かんたん</p>
      </section>
      <section className="mx-auto max-w-4xl px-4 pb-20">
        <div className="grid gap-6 sm:grid-cols-3">
          {features.map((f) => (
            <Card key={f.title} className="border-amber-200 bg-white/80">
              <CardContent className="flex flex-col items-center p-6 text-center">
                <span className="text-4xl">{f.icon}</span>
                <h3 className="mt-4 text-lg font-semibold text-amber-900">{f.title}</h3>
                <p className="mt-2 text-sm text-gray-600">{f.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </main>
  );
}

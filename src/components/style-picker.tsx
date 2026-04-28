import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { AnimatedCard } from "@/components/animated-card";
import type { IllustrationStyle } from "@/lib/types";

const styles = [
  {
    id: "soft_watercolor" as IllustrationStyle,
    name: "やさしい水彩",
    description: "淡い色、にじみ、手描き感",
    examples: "おやすみ・どうぶつ・こころの成長に",
    imageUrl: "/images/styles/soft_watercolor.png",
  },
  {
    id: "fluffy_pastel" as IllustrationStyle,
    name: "ふんわりパステル",
    description: "柔らかい色、丸い形、かわいい雰囲気",
    examples: "幼児向け・生活習慣・食べものに",
    imageUrl: "/images/styles/fluffy_pastel.png",
  },
  {
    id: "crayon" as IllustrationStyle,
    name: "クレヨンで描いた絵本",
    description: "子どもが描いたような温かい線",
    examples: "生活習慣・学び・親子向けに",
    imageUrl: "/images/styles/crayon.png",
  },
  {
    id: "flat_illustration" as IllustrationStyle,
    name: "シンプルフラット",
    description: "シンプル、影少なめ、現代的",
    examples: "知育・UIになじむサンプルに",
    imageUrl: "/images/styles/flat_illustration.png",
  },
  {
    id: "anime_storybook" as IllustrationStyle,
    name: "わくわくアニメ風",
    description: "表情が大きくキャラクター性が強い",
    examples: "冒険・ファンタジー・のりものに",
    imageUrl: "/images/styles/anime_storybook.png",
  },
  {
    id: "classic_picture_book" as IllustrationStyle,
    name: "クラシック絵本",
    description: "昔ながらの童話風、細かい描き込み",
    examples: "ファンタジー・季節・森の物語に",
    imageUrl: "/images/styles/classic_picture_book.png",
  },
  {
    id: "toy_3d" as IllustrationStyle,
    name: "ぷっくり3Dトイ風",
    description: "粘土・おもちゃのような立体感",
    examples: "のりもの・ロボット・食べものに",
    imageUrl: "/images/styles/toy_3d.png",
  },
  {
    id: "paper_collage" as IllustrationStyle,
    name: "紙あそびコラージュ",
    description: "紙を貼ったような手作り感",
    examples: "季節・知育・イベントに",
    imageUrl: "/images/styles/paper_collage.png",
  },
  {
    id: "pencil_sketch" as IllustrationStyle,
    name: "やさしい鉛筆スケッチ",
    description: "線画中心、淡い色づけ、素朴",
    examples: "こころの成長・親子・静かな物語に",
    imageUrl: "/images/styles/pencil_sketch.png",
  },
  {
    id: "colorful_pop" as IllustrationStyle,
    name: "カラフルポップ",
    description: "鮮やか、元気な配色、楽しい絵本風",
    examples: "学び・生活習慣・乗りものに",
    imageUrl: "/images/styles/colorful_pop.png",
  },
];

interface StylePickerProps { selected: IllustrationStyle | null; onSelect: (style: IllustrationStyle) => void; }

export function StylePicker({ selected, onSelect }: StylePickerProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      {styles.map((s) => (
        <AnimatedCard key={s.id} onClick={() => onSelect(s.id)}>
          <Card className={`h-full cursor-pointer overflow-hidden transition ${selected === s.id ? "ring-2 ring-purple-500 border-purple-400" : ""}`}>
            <CardContent className="flex h-full flex-col p-0 text-center">
              <div className="relative aspect-[2/3] w-full overflow-hidden bg-violet-50">
                <Image
                  src={s.imageUrl}
                  alt={`${s.name}のサンプル画像`}
                  fill
                  sizes="(min-width: 1024px) 180px, (min-width: 640px) 45vw, 90vw"
                  className="object-cover transition duration-300 hover:scale-105"
                />
              </div>
              <div className="flex flex-1 flex-col p-3">
                <h3 className="text-sm font-semibold text-purple-900">{s.name}</h3>
                <p className="mt-1 text-xs leading-relaxed text-violet-500">{s.description}</p>
                <p className="mt-1 text-xs leading-relaxed text-violet-400">{s.examples}</p>
              </div>
            </CardContent>
          </Card>
        </AnimatedCard>
      ))}
    </div>
  );
}

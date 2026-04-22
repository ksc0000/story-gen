import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { AnimatedCard } from "@/components/animated-card";
import type { IllustrationStyle } from "@/lib/types";

const styles = [
  {
    id: "watercolor" as IllustrationStyle,
    name: "水彩画風",
    description: "柔らかく温かみのあるタッチ",
    examples: "いわさきちひろ、ぐりとぐら風",
    icon: "/images/icons/watercolor-brush.webp",
  },
  {
    id: "flat" as IllustrationStyle,
    name: "フラットイラスト風",
    description: "明るくシンプルなタッチ",
    examples: "ミッフィー、しろくまちゃん風",
    icon: "/images/icons/digital-pen.webp",
  },
  {
    id: "crayon" as IllustrationStyle,
    name: "クレヨン/パステル風",
    description: "手描き感のあるカラフルなタッチ",
    examples: "はらぺこあおむし、ノンタン風",
    icon: "/images/icons/crayon.webp",
  },
];

interface StylePickerProps { selected: IllustrationStyle | null; onSelect: (style: IllustrationStyle) => void; }

export function StylePicker({ selected, onSelect }: StylePickerProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {styles.map((s) => (
        <AnimatedCard key={s.id} onClick={() => onSelect(s.id)}>
          <Card className={`cursor-pointer transition ${selected === s.id ? "ring-2 ring-purple-500 border-purple-400" : ""}`}>
            <CardContent className="p-4 text-center">
              <div className="flex justify-center">
                <Image src={s.icon} alt={s.name} width={48} height={48} className="rounded-lg" />
              </div>
              <h3 className="mt-3 text-sm font-semibold text-purple-900">{s.name}</h3>
              <p className="mt-1 text-xs text-violet-500">{s.description}</p>
              <p className="mt-1 text-xs text-violet-400">{s.examples}</p>
            </CardContent>
          </Card>
        </AnimatedCard>
      ))}
    </div>
  );
}

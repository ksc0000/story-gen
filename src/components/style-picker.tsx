import { Card, CardContent } from "@/components/ui/card";
import type { IllustrationStyle } from "@/lib/types";

const styles = [
  { id: "watercolor" as IllustrationStyle, name: "水彩画風", description: "柔らかく温かみのあるタッチ", examples: "いわさきちひろ、ぐりとぐら風", colors: ["bg-blue-200", "bg-pink-200", "bg-yellow-100", "bg-green-200"] },
  { id: "flat" as IllustrationStyle, name: "フラットイラスト風", description: "明るくシンプルなタッチ", examples: "ミッフィー、しろくまちゃん風", colors: ["bg-red-400", "bg-yellow-400", "bg-blue-400", "bg-green-400"] },
  { id: "crayon" as IllustrationStyle, name: "クレヨン/パステル風", description: "手描き感のあるカラフルなタッチ", examples: "はらぺこあおむし、ノンタン風", colors: ["bg-orange-300", "bg-purple-300", "bg-lime-300", "bg-rose-300"] },
];

interface StylePickerProps { selected: IllustrationStyle | null; onSelect: (style: IllustrationStyle) => void; }

export function StylePicker({ selected, onSelect }: StylePickerProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {styles.map((s) => (
        <Card key={s.id} onClick={() => onSelect(s.id)} className={`cursor-pointer transition hover:shadow-md ${selected === s.id ? "ring-2 ring-amber-500 border-amber-500" : "border-amber-200"}`}>
          <CardContent className="p-4 text-center">
            <div className="flex justify-center gap-1">{s.colors.map((c, i) => <div key={i} className={`h-6 w-6 rounded-full ${c}`} />)}</div>
            <h3 className="mt-3 text-sm font-semibold text-amber-900">{s.name}</h3>
            <p className="mt-1 text-xs text-gray-500">{s.description}</p>
            <p className="mt-1 text-xs text-gray-400">{s.examples}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

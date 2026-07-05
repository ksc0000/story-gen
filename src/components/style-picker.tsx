import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { AnimatedCard } from "@/components/animated-card";
import type { IllustrationStyle, IllustrationStyleProfile } from "@/lib/types";
import { ILLUSTRATION_STYLE_PROFILES } from "@/lib/illustration-styles";

const STYLE_CARD_COPY: Record<
  IllustrationStyle,
  { description: string; examples: string }
> = {
  soft_watercolor: {
    description: "淡い色、にじみ、手描き感",
    examples: "おやすみ・どうぶつ・こころの成長に",
  },
  fluffy_pastel: {
    description: "柔らかい色、丸い形、かわいい雰囲気",
    examples: "幼児向け・生活習慣・食べものに",
  },
  crayon: {
    description: "子どもが描いたような温かい線",
    examples: "生活習慣・学び・ご家族向けに",
  },
  flat_illustration: {
    description: "シンプル、影少なめ、現代的",
    examples: "知育・UIになじむサンプルに",
  },
  anime_storybook: {
    description: "表情が大きくキャラクター性が強い",
    examples: "冒険・ファンタジー・のりものに",
  },
  classic_picture_book: {
    description: "昔ながらの童話風、細かい描き込み",
    examples: "ファンタジー・季節・森の物語に",
  },
  toy_3d: {
    description: "粘土・おもちゃのような立体感",
    examples: "のりもの・ロボット・食べものに",
  },
  paper_collage: {
    description: "紙を貼ったような手作り感",
    examples: "季節・知育・イベントに",
  },
  pencil_sketch: {
    description: "線画中心、淡い色づけ、素朴",
    examples: "こころの成長・ご家族・静かな物語に",
  },
  colorful_pop: {
    description: "鮮やか、元気な配色、楽しい絵本風",
    examples: "学び・生活習慣・乗りものに",
  },
  watercolor: {
    description: "淡い色、にじみ、手描き感",
    examples: "おやすみ・どうぶつ・こころの成長に",
  },
  flat: {
    description: "シンプル、影少なめ、現代的",
    examples: "知育・UIになじむサンプルに",
  },
};

interface StylePickerProps {
  selected: IllustrationStyle | null;
  onSelect: (style: IllustrationStyle) => void;
  styles?: IllustrationStyleProfile[];
}

export function StylePicker({ selected, onSelect, styles }: StylePickerProps) {
  const visibleStyles = styles ?? ILLUSTRATION_STYLE_PROFILES.filter(
    (profile) => profile.id !== "watercolor" && profile.id !== "flat"
  );

  return (
    /* テンプレ選択と同じ縦スクロールのグリッド（モバイル2列 → 3列 → 5列） */
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
      {visibleStyles.map((s) => (
        <AnimatedCard key={s.id} onClick={() => onSelect(s.id)}>
          <Card className={`h-full cursor-pointer overflow-hidden transition ${selected === s.id ? "ring-2 ring-purple-500 border-purple-400 shadow-lg" : "shadow-sm sm:shadow-none"}`}>
            <CardContent className="flex h-full flex-col p-0 text-center">
              <div className="relative aspect-[2/3] w-full overflow-hidden bg-violet-50">
                <Image
                  src={s.previewImageUrl}
                  alt={`${s.name}のサンプル画像`}
                  fill
                  sizes="(min-width: 1024px) 180px, (min-width: 640px) 45vw, 44vw"
                  className="object-cover transition duration-300 hover:scale-105"
                />
                {selected === s.id && (
                  <div className="absolute inset-0 flex items-end justify-center pb-3 sm:hidden">
                    <span className="rounded-full bg-purple-600 px-3 py-1 text-xs font-bold text-white shadow">選択中</span>
                  </div>
                )}
              </div>
              <div className="flex flex-1 flex-col p-3">
                <h3 className="text-sm font-semibold text-purple-900">{s.name}</h3>
                <p className="mt-1 text-xs leading-relaxed text-violet-500">
                  {STYLE_CARD_COPY[s.id].description}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-violet-400">
                  {STYLE_CARD_COPY[s.id].examples}
                </p>
              </div>
            </CardContent>
          </Card>
        </AnimatedCard>
      ))}
    </div>
  );
}

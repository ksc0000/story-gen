import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { AnimatedCard } from "@/components/animated-card";
import type { TemplateDoc } from "@/lib/types";

const ICON_MAP: Record<string, string> = {
  "🎂": "🎂",
  "🌙": "🌙",
  "⛰️": "⛰️",
  "🌸": "🌸",
  "🐾": "🐾",
  "🍳": "🍳",
  "⭐": "⭐",
  "🏠": "🏠",
  "🪄": "🪄",
  "🪥": "🪥",
  "🔤": "🔤",
  "🤖": "🤖",
};

interface ThemeCardProps { template: TemplateDoc & { id: string }; selected: boolean; onSelect: () => void; }

export function ThemeCard({ template, selected, onSelect }: ThemeCardProps) {
  const iconSrc = ICON_MAP[template.icon];
  return (
    <AnimatedCard onClick={onSelect}>
      <Card className={`h-full cursor-pointer overflow-hidden transition ${selected ? "ring-2 ring-purple-500 border-purple-400" : ""}`}>
        <CardContent className="flex h-full flex-col p-0 text-center">
          {template.sampleImageUrl ? (
            <div className="relative aspect-[3/4] w-full overflow-hidden bg-violet-50">
              <Image
                src={template.sampleImageUrl}
                alt={template.sampleImageAlt ?? template.name}
                fill
                sizes="(min-width: 640px) 180px, 45vw"
                className="object-cover transition duration-300 hover:scale-105"
              />
              <div className="absolute left-2 top-2 rounded-full bg-white/85 px-2 py-1 text-lg shadow-sm">{iconSrc || template.icon}</div>
            </div>
          ) : (
            <div className="flex aspect-[3/4] w-full items-center justify-center bg-violet-50 text-5xl">{iconSrc || template.icon}</div>
          )}
          <div className="flex flex-1 flex-col p-3">
            <h3 className="text-sm font-semibold text-purple-900">{template.name}</h3>
            <p className="mt-1 text-xs leading-relaxed text-violet-500">{template.description}</p>
          </div>
        </CardContent>
      </Card>
    </AnimatedCard>
  );
}

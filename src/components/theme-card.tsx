import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { AnimatedCard } from "@/components/animated-card";
import type { TemplateDoc } from "@/lib/types";

const ICON_MAP: Record<string, string> = {
  "🎂": "/images/icons/cake.webp",
  "🌙": "/images/icons/moon.webp",
  "⛰️": "/images/icons/mountain.webp",
  "🌸": "/images/icons/sakura.webp",
  "🐾": "/images/icons/paw.webp",
  "🍳": "/images/icons/pan.webp",
  "⭐": "/images/icons/star.webp",
  "🏠": "/images/icons/house.webp",
};

interface ThemeCardProps { template: TemplateDoc & { id: string }; selected: boolean; onSelect: () => void; }

export function ThemeCard({ template, selected, onSelect }: ThemeCardProps) {
  const iconSrc = ICON_MAP[template.icon];
  return (
    <AnimatedCard onClick={onSelect}>
      <Card className={`cursor-pointer transition ${selected ? "ring-2 ring-purple-500 border-purple-400" : ""}`}>
        <CardContent className="flex flex-col items-center p-4 text-center">
          {iconSrc ? (
            <Image src={iconSrc} alt={template.name} width={48} height={48} className="rounded-lg" />
          ) : (
            <span className="text-4xl">{template.icon}</span>
          )}
          <h3 className="mt-2 text-sm font-semibold text-purple-900">{template.name}</h3>
          <p className="mt-1 text-xs text-violet-500">{template.description}</p>
        </CardContent>
      </Card>
    </AnimatedCard>
  );
}

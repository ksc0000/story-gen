import { Card, CardContent } from "@/components/ui/card";
import type { TemplateDoc } from "@/lib/types";

interface ThemeCardProps { template: TemplateDoc & { id: string }; selected: boolean; onSelect: () => void; }

export function ThemeCard({ template, selected, onSelect }: ThemeCardProps) {
  return (
    <Card onClick={onSelect} className={`cursor-pointer transition hover:shadow-md ${selected ? "ring-2 ring-amber-500 border-amber-500" : "border-amber-200"}`}>
      <CardContent className="flex flex-col items-center p-4 text-center">
        <span className="text-4xl">{template.icon}</span>
        <h3 className="mt-2 text-sm font-semibold text-amber-900">{template.name}</h3>
        <p className="mt-1 text-xs text-gray-500">{template.description}</p>
      </CardContent>
    </Card>
  );
}

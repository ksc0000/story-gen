"use client";

import { cn } from "@/lib/utils";

type StatTone = "neutral" | "good" | "warning" | "bad";

const TONE_STYLES: Record<StatTone, { value: string; chip: string }> = {
  neutral: { value: "text-purple-900", chip: "bg-violet-100 text-violet-600" },
  good: { value: "text-emerald-600", chip: "bg-emerald-100 text-emerald-700" },
  warning: { value: "text-amber-600", chip: "bg-amber-100 text-amber-700" },
  bad: { value: "text-rose-600", chip: "bg-rose-100 text-rose-700" },
};

export function StatCard({
  label,
  value,
  unit,
  hint,
  tone = "neutral",
  badge,
}: {
  label: string;
  value: string | number;
  unit?: string;
  hint?: string;
  tone?: StatTone;
  badge?: string;
}) {
  const styles = TONE_STYLES[tone];
  return (
    <div className="rounded-2xl border border-violet-100 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium text-violet-400">{label}</p>
        {badge && (
          <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold", styles.chip)}>
            {badge}
          </span>
        )}
      </div>
      <p className={cn("mt-2 text-2xl font-bold leading-none", styles.value)}>
        {value}
        {unit && <span className="ml-1 text-base font-semibold text-violet-400">{unit}</span>}
      </p>
      {hint && <p className="mt-1.5 text-[11px] leading-snug text-violet-400">{hint}</p>}
    </div>
  );
}

export function SectionTitle({ title, description }: { title: string; description?: string }) {
  return (
    <div className="mb-3 mt-8 first:mt-0">
      <h2 className="text-sm font-bold text-purple-900">{title}</h2>
      {description && <p className="mt-0.5 text-xs text-violet-400">{description}</p>}
    </div>
  );
}

/** 横棒（割合表示）。value は 0-100 想定。 */
export function BarRow({
  label,
  value,
  display,
  tone = "neutral",
}: {
  label: string;
  value: number;
  display?: string;
  tone?: StatTone;
}) {
  const barColor =
    tone === "good"
      ? "bg-emerald-400"
      : tone === "warning"
      ? "bg-amber-400"
      : tone === "bad"
      ? "bg-rose-400"
      : "bg-violet-400";
  return (
    <div className="flex items-center gap-3 py-1">
      <span className="w-32 shrink-0 truncate text-xs text-violet-500">{label}</span>
      <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-violet-50">
        <div
          className={cn("h-full rounded-full transition-all", barColor)}
          style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
        />
      </div>
      <span className="w-16 shrink-0 text-right text-xs font-semibold text-purple-900">
        {display ?? `${value.toFixed(1)}%`}
      </span>
    </div>
  );
}

/** 数値配列からSVGスパークラインを描画。 */
export function Sparkline({
  points,
  width = 240,
  height = 44,
  color = "#7c3aed",
}: {
  points: number[];
  width?: number;
  height?: number;
  color?: string;
}) {
  if (points.length < 2) {
    return <div className="text-[11px] text-violet-300">データ不足</div>;
  }
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const stepX = width / (points.length - 1);
  const coords = points.map((p, i) => {
    const x = i * stepX;
    const y = height - ((p - min) / range) * (height - 6) - 3;
    return [x, y] as const;
  });
  const path = coords.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const areaPath = `${path} L${width},${height} L0,${height} Z`;
  return (
    <svg width={width} height={height} className="overflow-visible">
      <path d={areaPath} fill={color} fillOpacity={0.08} />
      <path d={path} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={coords[coords.length - 1][0]} cy={coords[coords.length - 1][1]} r={3} fill={color} />
    </svg>
  );
}

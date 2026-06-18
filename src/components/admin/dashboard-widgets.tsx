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

/* ------------------------------------------------------------------ */
/*  円グラフ（ドーナツ）                                                */
/* ------------------------------------------------------------------ */

export interface DonutDatum {
  label: string;
  value: number;
  color: string;
}

export function DonutChart({
  data,
  size = 160,
  thickness = 26,
  centerLabel,
  centerValue,
}: {
  data: DonutDatum[];
  size?: number;
  thickness?: number;
  centerLabel?: string;
  centerValue?: string;
}) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const cx = size / 2;
  const cy = size / 2;

  if (total <= 0) {
    return <p className="text-xs text-violet-300">データなし</p>;
  }

  let offset = 0;
  const segments = data
    .filter((d) => d.value > 0)
    .map((d) => {
      const fraction = d.value / total;
      const dash = fraction * circumference;
      const seg = {
        color: d.color,
        dasharray: `${dash} ${circumference - dash}`,
        dashoffset: -offset,
      };
      offset += dash;
      return seg;
    });

  return (
    <div className="flex flex-wrap items-center gap-5">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
        <g transform={`rotate(-90 ${cx} ${cy})`}>
          <circle cx={cx} cy={cy} r={radius} fill="none" stroke="#f1ecfb" strokeWidth={thickness} />
          {segments.map((s, i) => (
            <circle
              key={i}
              cx={cx}
              cy={cy}
              r={radius}
              fill="none"
              stroke={s.color}
              strokeWidth={thickness}
              strokeDasharray={s.dasharray}
              strokeDashoffset={s.dashoffset}
              strokeLinecap="butt"
            />
          ))}
        </g>
        {(centerValue || centerLabel) && (
          <>
            <text x={cx} y={cy - 2} textAnchor="middle" className="fill-purple-900" fontSize={22} fontWeight={700}>
              {centerValue}
            </text>
            <text x={cx} y={cy + 16} textAnchor="middle" className="fill-violet-400" fontSize={11}>
              {centerLabel}
            </text>
          </>
        )}
      </svg>
      <ul className="flex-1 space-y-1.5">
        {data
          .filter((d) => d.value > 0)
          .map((d) => (
            <li key={d.label} className="flex items-center gap-2 text-xs">
              <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: d.color }} />
              <span className="flex-1 truncate text-violet-600">{d.label}</span>
              <span className="font-semibold text-purple-900">{d.value}</span>
              <span className="w-12 text-right text-violet-400">
                {((d.value / total) * 100).toFixed(0)}%
              </span>
            </li>
          ))}
      </ul>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  折れ線（時系列）チャート                                            */
/* ------------------------------------------------------------------ */

export interface LineSeries {
  label: string;
  color: string;
  points: number[];
}

export function LineChart({
  labels,
  series,
  height = 200,
  yMin,
  yMax,
  unit = "",
  yTickCount = 4,
}: {
  labels: string[];
  series: LineSeries[];
  height?: number;
  yMin?: number;
  yMax?: number;
  unit?: string;
  yTickCount?: number;
}) {
  const allValues = series.flatMap((s) => s.points).filter((v) => Number.isFinite(v));
  if (allValues.length === 0 || labels.length < 2) {
    return <div className="text-xs text-violet-300">データ不足</div>;
  }
  const dataMin = yMin ?? Math.min(...allValues);
  const dataMax = yMax ?? Math.max(...allValues);
  const range = dataMax - dataMin || 1;

  const padL = 40;
  const padR = 12;
  const padT = 10;
  const padB = 26;
  const width = 520;
  const innerW = width - padL - padR;
  const innerH = height - padT - padB;
  const n = labels.length;
  const stepX = innerW / (n - 1);

  const xPos = (i: number) => padL + i * stepX;
  const yPos = (v: number) => padT + innerH - ((v - dataMin) / range) * innerH;

  const yTicks = Array.from({ length: yTickCount + 1 }, (_, i) => dataMin + (range * i) / yTickCount);
  const labelEvery = Math.ceil(n / 6);

  return (
    <svg width="100%" viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
      {yTicks.map((t, i) => {
        const y = yPos(t);
        return (
          <g key={i}>
            <line x1={padL} y1={y} x2={width - padR} y2={y} stroke="#f1ecfb" strokeWidth={1} />
            <text x={padL - 6} y={y + 3} textAnchor="end" fontSize={10} className="fill-violet-400">
              {t.toFixed(t >= 100 ? 0 : 1)}
              {unit}
            </text>
          </g>
        );
      })}
      {labels.map((lab, i) =>
        i % labelEvery === 0 || i === n - 1 ? (
          <text key={i} x={xPos(i)} y={height - 8} textAnchor="middle" fontSize={10} className="fill-violet-400">
            {lab}
          </text>
        ) : null
      )}
      {series.map((s) => {
        const path = s.points
          .map((v, i) => `${i === 0 ? "M" : "L"}${xPos(i).toFixed(1)},${yPos(v).toFixed(1)}`)
          .join(" ");
        return (
          <g key={s.label}>
            <path d={path} fill="none" stroke={s.color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
            {s.points.map((v, i) => (
              <circle key={i} cx={xPos(i)} cy={yPos(v)} r={2.5} fill={s.color} />
            ))}
          </g>
        );
      })}
    </svg>
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

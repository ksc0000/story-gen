"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  collection,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
} from "firebase/firestore";
import { Briefcase, Cpu, Sparkles, RefreshCw } from "lucide-react";
import { db } from "@/lib/firebase";
import { useAdminClaim } from "@/lib/hooks/use-admin-claim";
import { getPlanDisplayLabel } from "@/lib/plans";
import { computeSloMetrics, SLO_TARGETS, EMPTY_SLO } from "@/lib/admin-slo-metrics";
import { computeProviderCostMetrics } from "@/lib/admin-cost-metrics";
import { computeQualityTrend } from "@/lib/admin-quality-trend";
import { AdminNav } from "@/components/admin/AdminNav";
import {
  StatCard,
  SectionTitle,
  BarRow,
  Sparkline,
} from "@/components/admin/dashboard-widgets";
import { cn } from "@/lib/utils";
import { isDemoMode } from "@/lib/demo";
import type { BookDoc, PageDoc, ProductPlan } from "@/lib/types";

type BookWithId = BookDoc & { id: string };
type PageWithId = PageDoc & { id: string };

/** デモモード用の代表的なダミーデータ（プレビュー・デモ表示用）。 */
function buildDemoData(): { books: BookWithId[]; pagesMap: Map<string, PageWithId[]> } {
  const plans: ProductPlan[] = ["free", "free", "free", "standard_paid", "premium_paid"];
  const modes = ["guided_ai", "fixed_template", "original_ai", "photo_story"] as const;
  const models = ["black-forest-labs/flux-2-pro", "black-forest-labs/flux-2-klein-9b", "black-forest-labs/flux-kontext-max"];
  const now = Date.now();
  const books: BookWithId[] = [];
  const pagesMap = new Map<string, PageWithId[]>();

  for (let i = 0; i < 32; i++) {
    const r = (i * 9301 + 49297) % 233280 / 233280; // deterministic pseudo-random
    const status = r < 0.82 ? "completed" : r < 0.93 ? "partial_completed" : "failed";
    const plan = plans[i % plans.length];
    const reviewed = i % 3 === 0;
    const base = 3.4 + ((i % 5) * 0.32);
    books.push({
      id: `demo-${i}`,
      status,
      productPlan: plan,
      creationMode: modes[i % modes.length],
      createdAtMs: now - i * 36 * 60 * 60 * 1000,
      ...(reviewed
        ? {
            overallQualityScore: Math.min(5, base),
            storyQualityScore: Math.min(5, base + 0.2),
            illustrationQualityScore: Math.min(5, base - 0.1),
            characterConsistencyScore: Math.min(5, base - 0.3),
            personalizationScore: Math.min(5, base + 0.1),
            safetyScore: 4.8,
            qualityReviewedAtMs: now - i * 36 * 60 * 60 * 1000,
          }
        : {}),
    } as BookWithId);

    const pageCount = 8;
    const pages: PageWithId[] = [];
    for (let p = 0; p < pageCount; p++) {
      const pr = ((i + p) * 7919) % 1000 / 1000;
      pages.push({
        id: `demo-${i}-p${p}`,
        pageNumber: p,
        status: pr < 0.04 ? "image_failed" : "completed",
        imageModel: models[(i + p) % models.length],
        imageModelProfile: "pro_consistent",
        imageFallbackUsed: pr > 0.9,
        imageDurationMs: 18000 + Math.round(pr * 90000),
      } as PageWithId);
    }
    pagesMap.set(`demo-${i}`, pages);
  }
  return { books, pagesMap };
}

type Lens = "business" | "system" | "ai";

const LENSES: { id: Lens; label: string; icon: typeof Briefcase; accent: string }[] = [
  { id: "business", label: "経営", icon: Briefcase, accent: "from-amber-400 to-orange-400" },
  { id: "system", label: "システム", icon: Cpu, accent: "from-sky-400 to-indigo-400" },
  { id: "ai", label: "生成AI品質", icon: Sparkles, accent: "from-fuchsia-400 to-purple-500" },
];

const SAMPLE_SIZES = [100, 200, 500] as const;

function getBookMs(b: BookWithId): number {
  if (typeof b.createdAtMs === "number") return b.createdAtMs;
  const ts = b.createdAt as unknown as { seconds?: number } | undefined;
  return ts?.seconds ? ts.seconds * 1000 : 0;
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const { isAdmin, checkingAdmin } = useAdminClaim();

  const [lens, setLens] = useState<Lens>("business");
  const [sampleSize, setSampleSize] = useState<(typeof SAMPLE_SIZES)[number]>(200);
  const [books, setBooks] = useState<BookWithId[]>([]);
  const [pagesMap, setPagesMap] = useState<Map<string, PageWithId[]>>(new Map());
  const [sloHistory, setSloHistory] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Redirect non-admins to the admin login.
  useEffect(() => {
    if (!checkingAdmin && !isAdmin) {
      router.replace("/admin/login");
    }
  }, [checkingAdmin, isAdmin, router]);

  // Load recent books.
  useEffect(() => {
    if (!isAdmin) return;
    if (isDemoMode) {
      const demo = buildDemoData();
      setBooks(demo.books);
      setPagesMap(demo.pagesMap);
      setSloHistory([95.2, 96.1, 94.8, 97.0, 96.5, 98.1, 97.4, 98.6, 97.9, 98.2]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const booksQuery = query(
      collection(db, "books"),
      orderBy("createdAt", "desc"),
      limit(sampleSize)
    );
    const unsub = onSnapshot(
      booksQuery,
      (snap) => {
        setBooks(snap.docs.map((d) => ({ id: d.id, ...(d.data() as BookDoc) })));
        setError(null);
        setLoading(false);
      },
      (err) => {
        console.error("Failed to load books:", err);
        setError("絵本データの読み込みに失敗しました。管理者権限をご確認ください。");
        setLoading(false);
      }
    );
    return () => unsub();
  }, [isAdmin, sampleSize]);

  const bookIdsKey = useMemo(() => books.map((b) => b.id).join(","), [books]);

  // Batch-load pages for loaded books.
  useEffect(() => {
    if (isDemoMode) return;
    const ids = bookIdsKey.split(",").filter(Boolean);
    if (!isAdmin || ids.length === 0) {
      setPagesMap(new Map());
      return;
    }
    let cancelled = false;
    Promise.all(
      ids.map(async (bookId) => {
        const snap = await getDocs(collection(db, "books", bookId, "pages"));
        return { bookId, pages: snap.docs.map((d) => ({ id: d.id, ...(d.data() as PageDoc) })) };
      })
    )
      .then((results) => {
        if (cancelled) return;
        const map = new Map<string, PageWithId[]>();
        for (const r of results) map.set(r.bookId, r.pages);
        setPagesMap(map);
      })
      .catch((err) => {
        if (!cancelled) console.error("Failed to load pages:", err);
      });
    return () => {
      cancelled = true;
    };
  }, [isAdmin, bookIdsKey]);

  // Load daily SLO snapshot history for the system sparkline (readable rate trend).
  useEffect(() => {
    if (!isAdmin || isDemoMode) return;
    const q = query(
      collection(db, "adminMetrics", "sloSnapshots", "items"),
      orderBy("createdAtMs", "desc"),
      limit(14)
    );
    getDocs(q)
      .then((snap) => {
        const rates = snap.docs
          .map((d) => d.data() as { bookReadableRate?: number })
          .map((d) => d.bookReadableRate ?? 0)
          .reverse();
        setSloHistory(rates);
      })
      .catch(() => setSloHistory([]));
  }, [isAdmin]);

  const slo = useMemo(
    () => (books.length ? computeSloMetrics(books, pagesMap) : EMPTY_SLO),
    [books, pagesMap]
  );
  const cost = useMemo(
    () => computeProviderCostMetrics(books, pagesMap),
    [books, pagesMap]
  );
  const quality = useMemo(() => computeQualityTrend(books), [books]);

  // Business aggregations.
  const business = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const thisMonth = books.filter((b) => getBookMs(b) >= monthStart).length;
    const planCounts: Record<string, number> = {};
    const modeCounts: Record<string, number> = {};
    for (const b of books) {
      const plan = (b.productPlan ?? "free") as ProductPlan;
      planCounts[plan] = (planCounts[plan] ?? 0) + 1;
      const mode = b.creationMode ?? "unknown";
      modeCounts[mode] = (modeCounts[mode] ?? 0) + 1;
    }
    const paid = (planCounts["standard_paid"] ?? 0) + (planCounts["premium_paid"] ?? 0);
    const paidShare = books.length ? (paid / books.length) * 100 : 0;
    return { thisMonth, planCounts, modeCounts, paidShare };
  }, [books]);

  if (checkingAdmin) {
    return (
      <div className="grid min-h-screen place-items-center text-violet-400">権限を確認中...</div>
    );
  }
  if (!isAdmin) {
    return (
      <div className="grid min-h-screen place-items-center text-violet-400">
        管理者ページへリダイレクト中...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-violet-50/40 to-white">
      <AdminNav />

      <main className="mx-auto max-w-7xl px-4 py-6">
        {/* Header + perspective switcher */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-purple-950">ダッシュボード</h1>
            <p className="mt-1 text-sm text-violet-400">
              直近 {books.length} 冊の絵本データを集計（視点を切り替えて確認できます）
            </p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={sampleSize}
              onChange={(e) => setSampleSize(Number(e.target.value) as (typeof SAMPLE_SIZES)[number])}
              className="rounded-lg border border-violet-200 bg-white px-3 py-1.5 text-sm text-purple-900"
            >
              {SAMPLE_SIZES.map((s) => (
                <option key={s} value={s}>
                  直近 {s} 冊
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Lens tabs */}
        <div className="mt-5 inline-flex rounded-2xl border border-violet-100 bg-white p-1 shadow-sm">
          {LENSES.map((l) => {
            const Icon = l.icon;
            const active = lens === l.id;
            return (
              <button
                key={l.id}
                onClick={() => setLens(l.id)}
                className={cn(
                  "flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition-all",
                  active
                    ? `bg-gradient-to-r ${l.accent} text-white shadow`
                    : "text-violet-500 hover:text-purple-700"
                )}
              >
                <Icon className="size-4" />
                {l.label}
              </button>
            );
          })}
        </div>

        {error && (
          <div className="mt-6 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-600">
            {error}
          </div>
        )}

        {loading && !books.length ? (
          <div className="mt-10 flex items-center gap-2 text-violet-400">
            <RefreshCw className="size-4 animate-spin" /> 集計中...
          </div>
        ) : (
          <div className="mt-6">
            {lens === "business" && <BusinessLens slo={slo} cost={cost} business={business} totalBooks={books.length} />}
            {lens === "system" && <SystemLens slo={slo} sloHistory={sloHistory} />}
            {lens === "ai" && <AiLens quality={quality} cost={cost} />}
          </div>
        )}
      </main>
    </div>
  );
}

/* ─────────────────────────────  経営ビュー  ───────────────────────────── */

function BusinessLens({
  slo,
  cost,
  business,
  totalBooks,
}: {
  slo: ReturnType<typeof computeSloMetrics>;
  cost: ReturnType<typeof computeProviderCostMetrics>;
  business: {
    thisMonth: number;
    planCounts: Record<string, number>;
    modeCounts: Record<string, number>;
    paidShare: number;
  };
  totalBooks: number;
}) {
  const planEntries = Object.entries(business.planCounts).sort((a, b) => b[1] - a[1]);
  return (
    <>
      <SectionTitle title="事業サマリー" description="作成ボリュームとコスト効率の全体像" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="総作成数（対象期間）" value={totalBooks.toLocaleString()} unit="冊" />
        <StatCard label="今月の作成数" value={business.thisMonth.toLocaleString()} unit="冊" tone="good" />
        <StatCard
          label="有料プラン比率"
          value={business.paidShare.toFixed(1)}
          unit="%"
          tone={business.paidShare >= 20 ? "good" : "neutral"}
          hint="standard / premium の割合"
        />
        <StatCard
          label="完読率"
          value={slo.bookReadableRate.toFixed(1)}
          unit="%"
          tone={slo.bookReadableRate >= SLO_TARGETS.bookReadableRate ? "good" : "warning"}
          hint="完成して読める絵本の割合"
        />
      </div>

      <SectionTitle title="生成コスト" description="画像生成の推定コスト（USD）" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="推定総コスト" value={`$${cost.totalCostUsd.toFixed(2)}`} />
        <StatCard label="1冊あたりコスト" value={`$${cost.avgCostPerBook.toFixed(3)}`} hint="画像生成のみ" />
        <StatCard label="生成画像数" value={cost.totalImages.toLocaleString()} unit="枚" />
        <StatCard
          label="ハード失敗率"
          value={slo.bookHardFailedRate.toFixed(1)}
          unit="%"
          tone={slo.bookHardFailedRate <= SLO_TARGETS.bookHardFailedRate ? "good" : "bad"}
          hint="完全に失敗した割合（コスト損失）"
        />
      </div>

      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-violet-100 bg-white p-4 shadow-sm">
          <h3 className="mb-3 text-sm font-bold text-purple-900">プラン別内訳</h3>
          {planEntries.length ? (
            planEntries.map(([plan, count]) => (
              <BarRow
                key={plan}
                label={getPlanDisplayLabel(plan as ProductPlan)}
                value={totalBooks ? (count / totalBooks) * 100 : 0}
                display={`${count}冊`}
                tone={plan === "free" ? "neutral" : "good"}
              />
            ))
          ) : (
            <p className="text-xs text-violet-300">データなし</p>
          )}
        </div>
        <div className="rounded-2xl border border-violet-100 bg-white p-4 shadow-sm">
          <h3 className="mb-3 text-sm font-bold text-purple-900">作成モード別内訳</h3>
          {Object.entries(business.modeCounts)
            .sort((a, b) => b[1] - a[1])
            .map(([mode, count]) => (
              <BarRow
                key={mode}
                label={mode}
                value={totalBooks ? (count / totalBooks) * 100 : 0}
                display={`${count}冊`}
              />
            ))}
        </div>
      </div>
    </>
  );
}

/* ─────────────────────────────  システムビュー  ───────────────────────────── */

function SystemLens({
  slo,
  sloHistory,
}: {
  slo: ReturnType<typeof computeSloMetrics>;
  sloHistory: number[];
}) {
  const p95Sec = slo.imageP95Ms / 1000;
  const p90Sec = slo.imageP90Ms / 1000;
  const p50Sec = slo.imageP50Ms / 1000;
  return (
    <>
      <SectionTitle title="信頼性 SLO" description="目標値との比較（緑=達成 / 赤=未達）" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="完読率"
          value={slo.bookReadableRate.toFixed(1)}
          unit="%"
          badge={`目標 ${SLO_TARGETS.bookReadableRate}%`}
          tone={slo.bookReadableRate >= SLO_TARGETS.bookReadableRate ? "good" : "bad"}
        />
        <StatCard
          label="ページ画像失敗率"
          value={slo.pageImageFailureRate.toFixed(1)}
          unit="%"
          badge={`目標 ≤${SLO_TARGETS.pageImageFailureRate}%`}
          tone={slo.pageImageFailureRate <= SLO_TARGETS.pageImageFailureRate ? "good" : "bad"}
        />
        <StatCard
          label="画像生成 P95"
          value={p95Sec.toFixed(1)}
          unit="秒"
          badge={`目標 ≤${SLO_TARGETS.imageP95Sec}秒`}
          tone={p95Sec <= SLO_TARGETS.imageP95Sec ? "good" : "bad"}
        />
        <StatCard
          label="再生成成功率"
          value={slo.regenerationSuccessRate.toFixed(1)}
          unit="%"
          badge={`目標 ${SLO_TARGETS.regenerationSuccessRate}%`}
          tone={slo.regenerationSuccessRate >= SLO_TARGETS.regenerationSuccessRate ? "good" : "warning"}
        />
      </div>

      <SectionTitle title="レイテンシ / 失敗の内訳" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="画像生成 P50" value={p50Sec.toFixed(1)} unit="秒" />
        <StatCard label="画像生成 P90" value={p90Sec.toFixed(1)} unit="秒" />
        <StatCard
          label="フォールバック率"
          value={slo.fallbackRate.toFixed(1)}
          unit="%"
          tone={slo.fallbackRate > 10 ? "warning" : "neutral"}
          hint="代替モデルに切替えた割合"
        />
        <StatCard
          label="タイムアウト率"
          value={slo.timeoutRate.toFixed(1)}
          unit="%"
          tone={slo.timeoutRate > 5 ? "warning" : "neutral"}
        />
      </div>

      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-violet-100 bg-white p-4 shadow-sm">
          <h3 className="mb-1 text-sm font-bold text-purple-900">完読率の推移</h3>
          <p className="mb-3 text-xs text-violet-400">日次SLOスナップショット（直近14回）</p>
          <Sparkline points={sloHistory} width={300} color="#6366f1" />
        </div>
        <div className="rounded-2xl border border-violet-100 bg-white p-4 shadow-sm">
          <h3 className="mb-3 text-sm font-bold text-purple-900">絵本ステータス内訳</h3>
          <BarRow label="完了" value={pct(slo.completedBooks, slo.totalBooks)} display={`${slo.completedBooks}`} tone="good" />
          <BarRow label="部分完了" value={pct(slo.partialCompletedBooks, slo.totalBooks)} display={`${slo.partialCompletedBooks}`} tone="warning" />
          <BarRow label="失敗" value={pct(slo.failedBooks, slo.totalBooks)} display={`${slo.failedBooks}`} tone="bad" />
        </div>
      </div>
    </>
  );
}

/* ─────────────────────────────  生成AI品質ビュー  ───────────────────────────── */

function AiLens({
  quality,
  cost,
}: {
  quality: ReturnType<typeof computeQualityTrend>;
  cost: ReturnType<typeof computeProviderCostMetrics>;
}) {
  const dist = quality.scoreDistribution;
  const distMax = Math.max(1, ...Object.values(dist));
  const modelEntries = Object.entries(cost.providers).flatMap(([provider, stats]) =>
    Object.entries(stats.models).map(([model, m]) => ({
      label: `${provider} / ${model}`,
      count: m.imageCount,
    }))
  ).sort((a, b) => b.count - a.count).slice(0, 6);
  const modelMax = Math.max(1, ...modelEntries.map((m) => m.count));

  return (
    <>
      <SectionTitle title="品質スコア（5段階・レビュー済み平均）" description={`レビュー済み ${quality.totalReviewed} 冊`} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatCard label="総合" value={quality.avgOverall.toFixed(2)} tone={scoreTone(quality.avgOverall)} />
        <StatCard label="物語" value={quality.avgStory.toFixed(2)} tone={scoreTone(quality.avgStory)} />
        <StatCard label="挿絵" value={quality.avgIllustration.toFixed(2)} tone={scoreTone(quality.avgIllustration)} />
        <StatCard label="キャラ一貫性" value={quality.avgCharacterConsistency.toFixed(2)} tone={scoreTone(quality.avgCharacterConsistency)} />
        <StatCard label="パーソナライズ" value={quality.avgPersonalization.toFixed(2)} tone={scoreTone(quality.avgPersonalization)} />
        <StatCard label="安全性" value={quality.avgSafety.toFixed(2)} tone={scoreTone(quality.avgSafety)} />
      </div>

      {quality.regressions.length > 0 && (
        <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <h3 className="mb-2 text-sm font-bold text-amber-700">⚠️ 品質の低下アラート</h3>
          <ul className="space-y-1 text-xs text-amber-700">
            {quality.regressions.map((r, i) => (
              <li key={i}>
                {r.axis}: {r.previousAvg.toFixed(2)} → {r.currentAvg.toFixed(2)}（-{r.dropPct.toFixed(1)}%）
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-violet-100 bg-white p-4 shadow-sm">
          <h3 className="mb-3 text-sm font-bold text-purple-900">総合スコア分布</h3>
          {([5, 4, 3, 2, 1] as const).map((score) => (
            <BarRow
              key={score}
              label={`★${score}`}
              value={(dist[score] / distMax) * 100}
              display={`${dist[score]}冊`}
              tone={score >= 4 ? "good" : score === 3 ? "warning" : "bad"}
            />
          ))}
        </div>
        <div className="rounded-2xl border border-violet-100 bg-white p-4 shadow-sm">
          <h3 className="mb-3 text-sm font-bold text-purple-900">画像モデル別生成数</h3>
          {modelEntries.length ? (
            modelEntries.map((m) => (
              <BarRow key={m.label} label={m.label} value={(m.count / modelMax) * 100} display={`${m.count}枚`} />
            ))
          ) : (
            <p className="text-xs text-violet-300">データなし</p>
          )}
        </div>
      </div>
    </>
  );
}

/* ─────────────────────────────  helpers  ───────────────────────────── */

function pct(n: number, total: number): number {
  return total > 0 ? (n / total) * 100 : 0;
}

function scoreTone(score: number): "good" | "warning" | "bad" | "neutral" {
  if (score <= 0) return "neutral";
  if (score >= 4) return "good";
  if (score >= 3) return "warning";
  return "bad";
}

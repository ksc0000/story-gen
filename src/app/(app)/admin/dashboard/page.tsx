"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  collection,
  getCountFromServer,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { Briefcase, Cpu, Sparkles, RefreshCw, TrendingUp } from "lucide-react";
import { db } from "@/lib/firebase";
import { useAdminClaim } from "@/lib/hooks/use-admin-claim";
import { backfillDailyMetricsCallable } from "@/lib/functions";
import { getPlanDisplayLabel, CREATION_MODE_LABELS, PLAN_CONFIGS } from "@/lib/plans";
import { computeSloMetrics, SLO_TARGETS, EMPTY_SLO } from "@/lib/admin-slo-metrics";
import { computeProviderCostMetrics } from "@/lib/admin-cost-metrics";
import { computeQualityTrend } from "@/lib/admin-quality-trend";
import { AdminNav } from "@/components/admin/AdminNav";
import { CouponGenerator } from "@/components/admin/CouponGenerator";
import {
  StatCard,
  SectionTitle,
  BarRow,
  LineChart,
  DonutChart,
  type DonutDatum,
  type LineSeries,
} from "@/components/admin/dashboard-widgets";
import { cn } from "@/lib/utils";
import { isDemoMode } from "@/lib/demo";
import type { BookDoc, CreationMode, PageDoc, ProductPlan } from "@/lib/types";

/** チャート用カラーパレット */
const CHART_COLORS = ["#7c3aed", "#22c55e", "#f59e0b", "#06b6d4", "#ec4899", "#6366f1", "#94a3b8"];

/** システム値を「表示名 (system値)」形式に整形 */
function labelCreationMode(mode: string): string {
  const display = CREATION_MODE_LABELS[mode as CreationMode];
  return display ? `${display} (${mode})` : mode;
}

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

type Lens = "business" | "system" | "ai" | "analytics";

const LENSES: { id: Lens; label: string; icon: typeof Briefcase; accent: string }[] = [
  { id: "analytics", label: "アナリティクス", icon: TrendingUp, accent: "from-emerald-400 to-teal-500" },
  { id: "business", label: "経営", icon: Briefcase, accent: "from-amber-400 to-orange-400" },
  { id: "system", label: "システム", icon: Cpu, accent: "from-sky-400 to-indigo-400" },
  { id: "ai", label: "生成AI品質", icon: Sparkles, accent: "from-fuchsia-400 to-purple-500" },
];

const SAMPLE_SIZES = [100, 200, 500] as const;

/** 日次メトリクス・スナップショットの1行（adminMetrics/dailyMetrics/items） */
interface DailyMetricsRow {
  date: string;
  dateMs: number;
  totalUsers: number;
  newUsers: number;
  activeCreators: number;
  booksCreated: number;
  booksCompleted: number;
  singlePurchaseRevenueJpy: number;
  paidUsersStandard: number;
  paidUsersPremium: number;
  estimatedMrrJpy: number;
}

const PERIOD_OPTIONS = [7, 30, 90] as const;

/**
 * Firestore 集計クエリ（getCountFromServer）で取得する「実数」。
 * 日次スナップショットの鮮度・createdAt 欠損に依存しない現在値で、
 * ダッシュボードの見出し（利用者数・MRR など）を実績に一致させるために使う。
 */
interface LiveCounts {
  totalUsers: number;
  paidStandard: number;
  paidPremium: number;
  totalBooks: number;
  loadedAtMs: number;
}

/** 円（JPY）を「¥1,480」形式に整形 */
function formatJpy(n: number): string {
  return `¥${Math.round(n).toLocaleString()}`;
}

/** デモ用の日次メトリクス時系列（90日分） */
function buildDemoDailyMetrics(): DailyMetricsRow[] {
  const rows: DailyMetricsRow[] = [];
  const dayMs = 24 * 60 * 60 * 1000;
  const todayStart = (() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  })();
  let cumulative = 40;
  let paidStd = 3;
  let paidPrem = 1;
  for (let i = 89; i >= 0; i--) {
    const dateMs = todayStart - i * dayMs;
    const d = new Date(dateMs);
    const wave = Math.sin(i / 7) * 1.5;
    const newUsers = Math.max(0, Math.round(2 + wave + (89 - i) * 0.05));
    cumulative += newUsers;
    if ((89 - i) % 9 === 0) paidStd += 1;
    if ((89 - i) % 17 === 0) paidPrem += 1;
    const booksCreated = Math.max(0, Math.round(4 + Math.sin(i / 5) * 3 + (89 - i) * 0.08));
    const singles = (89 - i) % 4 === 0 ? (i % 8 === 0 ? 2000 : 1500) : 0;
    rows.push({
      date: `${d.getMonth() + 1}/${d.getDate()}`,
      dateMs,
      totalUsers: cumulative,
      newUsers,
      activeCreators: Math.max(1, Math.round(booksCreated * 0.7)),
      booksCreated,
      booksCompleted: Math.round(booksCreated * 0.9),
      singlePurchaseRevenueJpy: singles,
      paidUsersStandard: i === 0 ? paidStd : 0,
      paidUsersPremium: i === 0 ? paidPrem : 0,
      estimatedMrrJpy: i === 0 ? paidStd * 1480 + paidPrem * 2980 : 0,
    });
  }
  return rows;
}

function getBookMs(b: BookWithId): number {
  if (typeof b.createdAtMs === "number") return b.createdAtMs;
  const ts = b.createdAt as unknown as { seconds?: number } | undefined;
  return ts?.seconds ? ts.seconds * 1000 : 0;
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const { isAdmin, checkingAdmin } = useAdminClaim();

  const [lens, setLens] = useState<Lens>("analytics");
  const [sampleSize, setSampleSize] = useState<(typeof SAMPLE_SIZES)[number]>(200);
  const [books, setBooks] = useState<BookWithId[]>([]);
  const [pagesMap, setPagesMap] = useState<Map<string, PageWithId[]>>(new Map());
  const [sloHistory, setSloHistory] = useState<number[]>([]);
  const [dailyMetrics, setDailyMetrics] = useState<DailyMetricsRow[]>([]);
  const [liveCounts, setLiveCounts] = useState<LiveCounts | null>(null);
  const [period, setPeriod] = useState<(typeof PERIOD_OPTIONS)[number]>(30);
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

  // Load daily metrics snapshots (analytics lens time-series).
  useEffect(() => {
    if (!isAdmin) return;
    if (isDemoMode) {
      setDailyMetrics(buildDemoDailyMetrics());
      return;
    }
    const q = query(
      collection(db, "adminMetrics", "dailyMetrics", "items"),
      orderBy("dateMs", "desc"),
      limit(90)
    );
    getDocs(q)
      .then((snap) => {
        const rows = snap.docs
          .map((d) => {
            const data = d.data() as Partial<DailyMetricsRow>;
            const dateMs = data.dateMs ?? 0;
            const dd = new Date(dateMs);
            return {
              date: `${dd.getMonth() + 1}/${dd.getDate()}`,
              dateMs,
              totalUsers: data.totalUsers ?? 0,
              newUsers: data.newUsers ?? 0,
              activeCreators: data.activeCreators ?? 0,
              booksCreated: data.booksCreated ?? 0,
              booksCompleted: data.booksCompleted ?? 0,
              singlePurchaseRevenueJpy: data.singlePurchaseRevenueJpy ?? 0,
              paidUsersStandard: data.paidUsersStandard ?? 0,
              paidUsersPremium: data.paidUsersPremium ?? 0,
              estimatedMrrJpy: data.estimatedMrrJpy ?? 0,
            } satisfies DailyMetricsRow;
          })
          .reverse();
        setDailyMetrics(rows);
      })
      .catch(() => setDailyMetrics([]));
  }, [isAdmin]);

  // Load live actual counts via Firestore aggregation (getCountFromServer).
  // スナップショット非依存の現在値。利用者数・有料内訳・絵本数を実績と一致させる。
  useEffect(() => {
    if (!isAdmin || isDemoMode) return;
    let cancelled = false;
    Promise.all([
      getCountFromServer(collection(db, "users")),
      getCountFromServer(query(collection(db, "users"), where("productPlan", "==", "standard_paid"))),
      getCountFromServer(query(collection(db, "users"), where("productPlan", "==", "premium_paid"))),
      getCountFromServer(collection(db, "books")),
    ])
      .then(([usersC, stdC, premC, booksC]) => {
        if (cancelled) return;
        setLiveCounts({
          totalUsers: usersC.data().count,
          paidStandard: stdC.data().count,
          paidPremium: premC.data().count,
          totalBooks: booksC.data().count,
          loadedAtMs: Date.now(),
        });
      })
      .catch(() => {
        if (!cancelled) setLiveCounts(null);
      });
    return () => {
      cancelled = true;
    };
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

    // 直近14日の日次作成数（時系列）
    const days = 14;
    const dayMs = 24 * 60 * 60 * 1000;
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const dailyCounts = new Array(days).fill(0);
    const dailyLabels: string[] = [];
    for (let i = 0; i < days; i++) {
      const d = new Date(todayStart - (days - 1 - i) * dayMs);
      dailyLabels.push(`${d.getMonth() + 1}/${d.getDate()}`);
    }
    for (const b of books) {
      const ms = getBookMs(b);
      if (ms <= 0) continue;
      const dayIndex = Math.floor((ms - (todayStart - (days - 1) * dayMs)) / dayMs);
      if (dayIndex >= 0 && dayIndex < days) dailyCounts[dayIndex] += 1;
    }
    return { thisMonth, planCounts, modeCounts, paidShare, dailyCounts, dailyLabels };
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
              {lens === "analytics"
                ? "ユーザー・売上・生成の推移を時系列で確認できます"
                : `直近 ${books.length} 冊の絵本データを集計（視点を切り替えて確認できます）`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {lens === "analytics" ? (
              <div className="inline-flex rounded-lg border border-violet-200 bg-white p-0.5">
                {PERIOD_OPTIONS.map((p) => (
                  <button
                    key={p}
                    onClick={() => setPeriod(p)}
                    className={cn(
                      "rounded-md px-3 py-1 text-sm font-medium transition-colors",
                      period === p ? "bg-emerald-500 text-white" : "text-violet-500 hover:text-purple-700"
                    )}
                  >
                    {p}日
                  </button>
                ))}
              </div>
            ) : (
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
            )}
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

        {lens === "analytics" ? (
          <div className="mt-6">
            <AnalyticsLens rows={dailyMetrics} period={period} isAdmin={isAdmin} live={liveCounts} />
          </div>
        ) : loading && !books.length ? (
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

/* ─────────────────────────────  アナリティクスビュー  ───────────────────────────── */

function deltaBadge(current: number, previous: number): { badge?: string; tone: "good" | "bad" | "neutral" } {
  if (previous <= 0) return { tone: "neutral" };
  const pct = ((current - previous) / previous) * 100;
  const sign = pct >= 0 ? "+" : "";
  return { badge: `${sign}${pct.toFixed(0)}%`, tone: pct >= 0 ? "good" : "bad" };
}

function AnalyticsLens({
  rows,
  period,
  isAdmin,
  live,
}: {
  rows: DailyMetricsRow[];
  period: number;
  isAdmin: boolean;
  live: LiveCounts | null;
}) {
  const [backfilling, setBackfilling] = useState(false);
  const [backfillMsg, setBackfillMsg] = useState<string | null>(null);

  const view = rows.slice(-period);
  const prev = rows.slice(-period * 2, -period);
  const labels = view.map((r) => r.date);

  if (rows.length === 0) {
    return (
      <div className="space-y-4">
        {live ? (
          <>
            <SectionTitle title="現在の実数" description="users / books コレクションの集計値" />
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <StatCard label="利用者数（実数）" value={live.totalUsers.toLocaleString()} unit="人" tone="good" />
              <StatCard label="絵本累計（実数）" value={live.totalBooks.toLocaleString()} unit="冊" />
              <StatCard label="有料ユーザー" value={(live.paidStandard + live.paidPremium).toLocaleString()} unit="人" hint={`標準${live.paidStandard}/プレ${live.paidPremium}`} />
              <StatCard
                label="推定MRR（現在）"
                value={formatJpy(live.paidStandard * (PLAN_CONFIGS.standard_paid.priceJpy ?? 0) + live.paidPremium * (PLAN_CONFIGS.premium_paid.priceJpy ?? 0))}
                tone="good"
              />
            </div>
          </>
        ) : null}
        <div className="rounded-2xl border border-violet-100 bg-white p-8 text-center">
          <p className="text-sm text-violet-500">
            日次メトリクスの時系列がまだありません。下のボタンで過去データを集計するとグラフが表示されます。
          </p>
          <BackfillButton
            isAdmin={isAdmin}
            backfilling={backfilling}
            setBackfilling={setBackfilling}
            backfillMsg={backfillMsg}
            setBackfillMsg={setBackfillMsg}
          />
        </div>
      </div>
    );
  }

  const latest = view[view.length - 1] ?? rows[rows.length - 1];
  const newUsersSum = view.reduce((s, r) => s + r.newUsers, 0);
  const newUsersPrevSum = prev.reduce((s, r) => s + r.newUsers, 0);
  const revenueSum = view.reduce((s, r) => s + r.singlePurchaseRevenueJpy, 0);
  const revenuePrevSum = prev.reduce((s, r) => s + r.singlePurchaseRevenueJpy, 0);
  // 実数（live 集計）を優先し、未取得時のみスナップショット値にフォールバックする。
  const stdPrice = PLAN_CONFIGS.standard_paid.priceJpy ?? 0;
  const premPrice = PLAN_CONFIGS.premium_paid.priceJpy ?? 0;
  const totalUsers = live?.totalUsers ?? latest.totalUsers;
  const paidStandard = live?.paidStandard ?? latest.paidUsersStandard;
  const paidPremium = live?.paidPremium ?? latest.paidUsersPremium;
  const paidTotal = paidStandard + paidPremium;
  const estimatedMrr = live
    ? paidStandard * stdPrice + paidPremium * premPrice
    : latest.estimatedMrrJpy;
  const usesLive = Boolean(live);
  const snapshotDate = rows[rows.length - 1]?.date;

  return (
    <>
      <div className="flex items-center justify-between gap-2">
        <SectionTitle title="サマリー" description={`直近 ${period} 日間（前期間比）`} />
        <span
          className={cn(
            "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold",
            usesLive ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
          )}
          title={usesLive ? "users / books コレクションの実件数を集計" : "日次スナップショットの最新値"}
        >
          {usesLive ? "● 実数（リアルタイム集計）" : "○ スナップショット値"}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="利用者数（実数）"
          value={totalUsers.toLocaleString()}
          unit="人"
          tone="good"
          hint={usesLive ? "users コレクション実件数" : `スナップショット ${snapshotDate ?? "—"} 時点`}
        />
        <StatCard
          label="新規ユーザー"
          value={newUsersSum.toLocaleString()}
          unit="人"
          {...deltaBadge(newUsersSum, newUsersPrevSum)}
          hint="期間内の合計"
        />
        <StatCard
          label="単品購入売上"
          value={formatJpy(revenueSum)}
          {...deltaBadge(revenueSum, revenuePrevSum)}
          hint="期間内の合計"
        />
        <StatCard
          label="推定MRR（現在）"
          value={formatJpy(estimatedMrr)}
          tone="good"
          hint={`有料 ${paidTotal}人（標準${paidStandard}/プレ${paidPremium}）`}
        />
      </div>
      {live ? (
        <p className="mt-2 text-[11px] text-violet-400">
          実数は users / books コレクションの集計値（{new Date(live.loadedAtMs).toLocaleString("ja-JP", { hour: "2-digit", minute: "2-digit" })} 時点）。
          絵本累計 {live.totalBooks.toLocaleString()}冊。グラフの時系列は日次スナップショット由来です。
        </p>
      ) : null}

      <SectionTitle title="ユーザー成長" description="累積ユーザー数の推移" />
      <div className="rounded-2xl border border-violet-100 bg-white p-4 shadow-sm">
        <LineChart
          labels={labels}
          series={[{ label: "累積ユーザー", color: "#10b981", points: view.map((r) => r.totalUsers) }]}
          unit="人"
          height={200}
        />
      </div>

      <SectionTitle title="日々の動き" description="新規ユーザー・アクティブ作成者・絵本作成数" />
      <div className="rounded-2xl border border-violet-100 bg-white p-4 shadow-sm">
        <LineChart
          labels={labels}
          series={[
            { label: "新規ユーザー", color: "#7c3aed", points: view.map((r) => r.newUsers) },
            { label: "アクティブ作成者", color: "#06b6d4", points: view.map((r) => r.activeCreators) },
            { label: "絵本作成数", color: "#f59e0b", points: view.map((r) => r.booksCreated) },
          ]}
          height={220}
        />
        <div className="mt-2 flex flex-wrap gap-4">
          {[
            { label: "新規ユーザー", color: "#7c3aed" },
            { label: "アクティブ作成者", color: "#06b6d4" },
            { label: "絵本作成数", color: "#f59e0b" },
          ].map((s) => (
            <span key={s.label} className="flex items-center gap-1.5 text-xs text-violet-500">
              <span className="size-2.5 rounded-full" style={{ backgroundColor: s.color }} />
              {s.label}
            </span>
          ))}
        </div>
        <p className="mt-2 text-[11px] text-violet-400">
          ※ アクティブ作成者は「その日に絵本を作成した人数」の近似値です（閲覧のみの利用者は含みません）。
        </p>
      </div>

      <SectionTitle title="売上（単品購入）" description="日次の単品購入売上" />
      <div className="rounded-2xl border border-violet-100 bg-white p-4 shadow-sm">
        <LineChart
          labels={labels}
          series={[{ label: "単品売上", color: "#22c55e", points: view.map((r) => r.singlePurchaseRevenueJpy) }]}
          unit="円"
          height={200}
        />
        <p className="mt-2 text-[11px] text-violet-400">
          ※ サブスクの売上推移は履歴が蓄積され次第表示します。現時点では推定MRR（現在値）のみ算出しています。
        </p>
      </div>

      {isAdmin && (
        <div className="mt-8 rounded-2xl border border-violet-100 bg-violet-50/40 p-4">
          <h3 className="text-sm font-bold text-purple-900">データの再集計</h3>
          <p className="mt-1 text-xs text-violet-500">
            過去のユーザー登録・絵本作成・単品購入から日次メトリクスを再構築します（既存データから遡れる範囲）。
          </p>
          <BackfillButton
            isAdmin={isAdmin}
            backfilling={backfilling}
            setBackfilling={setBackfilling}
            backfillMsg={backfillMsg}
            setBackfillMsg={setBackfillMsg}
          />
        </div>
      )}
    </>
  );
}

function BackfillButton({
  isAdmin,
  backfilling,
  setBackfilling,
  backfillMsg,
  setBackfillMsg,
}: {
  isAdmin: boolean;
  backfilling: boolean;
  setBackfilling: (v: boolean) => void;
  backfillMsg: string | null;
  setBackfillMsg: (v: string | null) => void;
}) {
  if (!isAdmin) return null;
  const run = async () => {
    setBackfilling(true);
    setBackfillMsg(null);
    try {
      const res = await backfillDailyMetricsCallable(90);
      setBackfillMsg(`完了：${res.saved}日分を集計しました。ページを再読み込みすると反映されます。`);
    } catch {
      setBackfillMsg("再集計に失敗しました。時間をおいて再度お試しください。");
    } finally {
      setBackfilling(false);
    }
  };
  return (
    <div className="mt-3">
      <button
        onClick={run}
        disabled={backfilling}
        className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-600 disabled:opacity-50"
      >
        {backfilling && <RefreshCw className="size-4 animate-spin" />}
        過去90日を再集計
      </button>
      {backfillMsg && <p className="mt-2 text-xs text-violet-600">{backfillMsg}</p>}
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
    dailyCounts: number[];
    dailyLabels: string[];
  };
  totalBooks: number;
}) {
  const planEntries = Object.entries(business.planCounts).sort((a, b) => b[1] - a[1]);
  const planDonut: DonutDatum[] = planEntries.map(([plan, count], i) => ({
    label: getPlanDisplayLabel(plan as ProductPlan),
    value: count,
    color: plan === "free" ? "#94a3b8" : CHART_COLORS[i % CHART_COLORS.length],
  }));
  const modeDonut: DonutDatum[] = Object.entries(business.modeCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([mode, count], i) => ({
      label: labelCreationMode(mode),
      value: count,
      color: CHART_COLORS[i % CHART_COLORS.length],
    }));
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

      <SectionTitle title="作成数の推移" description="直近14日の日次作成数" />
      <div className="rounded-2xl border border-violet-100 bg-white p-4 shadow-sm">
        <LineChart
          labels={business.dailyLabels}
          series={[{ label: "作成数", color: "#7c3aed", points: business.dailyCounts }]}
          unit="冊"
          height={200}
        />
      </div>

      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-violet-100 bg-white p-4 shadow-sm">
          <h3 className="mb-4 text-sm font-bold text-purple-900">プラン別内訳</h3>
          <DonutChart data={planDonut} centerValue={`${totalBooks}`} centerLabel="冊" />
        </div>
        <div className="rounded-2xl border border-violet-100 bg-white p-4 shadow-sm">
          <h3 className="mb-4 text-sm font-bold text-purple-900">作成モード別内訳</h3>
          <DonutChart data={modeDonut} centerValue={`${totalBooks}`} centerLabel="冊" />
        </div>
      </div>

      <SectionTitle title="グロース施策" description="テスター向けクーポンの発行" />
      <div className="grid gap-4 lg:grid-cols-2">
        <CouponGenerator />
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
  const sloLabels = sloHistory.map((_, i) =>
    i === sloHistory.length - 1 ? "最新" : `-${sloHistory.length - 1 - i}`
  );
  const statusDonut: DonutDatum[] = [
    { label: "完了", value: slo.completedBooks, color: "#22c55e" },
    { label: "部分完了", value: slo.partialCompletedBooks, color: "#f59e0b" },
    { label: "失敗", value: slo.failedBooks, color: "#ef4444" },
  ];
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
          <p className="mb-3 text-xs text-violet-400">日次SLOスナップショット（直近{sloHistory.length}回）</p>
          {sloHistory.length >= 2 ? (
            <LineChart
              labels={sloLabels}
              series={[{ label: "完読率", color: "#6366f1", points: sloHistory }]}
              unit="%"
              height={200}
              yMin={Math.max(0, Math.min(...sloHistory) - 3)}
              yMax={100}
            />
          ) : (
            <p className="py-8 text-center text-xs text-violet-300">
              スナップショットが蓄積されると推移を表示します
            </p>
          )}
        </div>
        <div className="rounded-2xl border border-violet-100 bg-white p-4 shadow-sm">
          <h3 className="mb-4 text-sm font-bold text-purple-900">絵本ステータス内訳</h3>
          <DonutChart data={statusDonut} centerValue={`${slo.totalBooks}`} centerLabel="冊" />
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
  const modelDonut: DonutDatum[] = Object.entries(cost.providers)
    .flatMap(([, stats]) =>
      Object.entries(stats.models).map(([model, m]) => ({
        // モデル名は表示用に短縮（提供元プレフィックスを除去）
        label: model.replace(/^.*\//, ""),
        value: m.imageCount,
      }))
    )
    .sort((a, b) => b.value - a.value)
    .slice(0, 6)
    .map((m, i) => ({ ...m, color: CHART_COLORS[i % CHART_COLORS.length] }));
  const modelTotal = modelDonut.reduce((s, m) => s + m.value, 0);

  // 品質スコアの時系列（バケット）
  const buckets = quality.buckets ?? [];
  const trendLabels = buckets.map((b) => b.label);
  const trendSeries: LineSeries[] = [
    { label: "総合", color: "#7c3aed", points: buckets.map((b) => b.avgOverall) },
    { label: "物語", color: "#22c55e", points: buckets.map((b) => b.avgStory) },
    { label: "挿絵", color: "#06b6d4", points: buckets.map((b) => b.avgIllustration) },
  ];

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

      <SectionTitle title="品質スコアの推移" description="レビュー期間ごとの平均スコア（5段階）" />
      <div className="rounded-2xl border border-violet-100 bg-white p-4 shadow-sm">
        {trendLabels.length >= 2 ? (
          <>
            <LineChart labels={trendLabels} series={trendSeries} height={220} yMin={1} yMax={5} />
            <div className="mt-2 flex flex-wrap gap-4">
              {trendSeries.map((s) => (
                <span key={s.label} className="flex items-center gap-1.5 text-xs text-violet-500">
                  <span className="size-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                  {s.label}
                </span>
              ))}
            </div>
          </>
        ) : (
          <p className="py-8 text-center text-xs text-violet-300">
            レビューが蓄積されると推移を表示します
          </p>
        )}
      </div>

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
          <h3 className="mb-4 text-sm font-bold text-purple-900">画像モデル別生成数</h3>
          <DonutChart data={modelDonut} centerValue={`${modelTotal}`} centerLabel="枚" />
        </div>
      </div>
    </>
  );
}

/* ─────────────────────────────  helpers  ───────────────────────────── */

function scoreTone(score: number): "good" | "warning" | "bad" | "neutral" {
  if (score <= 0) return "neutral";
  if (score >= 4) return "good";
  if (score >= 3) return "warning";
  return "bad";
}

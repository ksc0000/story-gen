"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import { PageTransition } from "@/components/page-transition";
import { AdminNav } from "@/components/admin/AdminNav";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { db, functions } from "@/lib/firebase";
import { httpsCallable } from "firebase/functions";
import { useAdminClaim } from "@/lib/hooks/use-admin-claim";
import { useAuth } from "@/lib/hooks/use-auth";
import { PLAN_CONFIGS } from "@/lib/plans";
import {
  formatResolvedDate,
  normalizeFirestoreDate,
} from "@/lib/date";
import type {
  BookDoc,
  BookFeedbackDoc,
  ImageModelProfile,
  PageDoc,
  ProductPlan,
  RegenerationHistoryEntry,
  StoryCharacter,
  StoryQualityReportData,
  Timestamp,
} from "@/lib/types";
import { QualityReviewPanel } from "@/components/admin/QualityReviewPanel";
import { CharacterConsistencyDiagnostics } from "@/components/admin/CharacterConsistencyDiagnostics";
import { QualityRecommendationPanel, QualityRecommendationBadge } from "@/components/admin/QualityRecommendationPanel";
import { RecommendationTaskDraftPanel } from "@/components/admin/RecommendationTaskDraftPanel";
import { QualityTasksPanel } from "@/components/admin/QualityTasksPanel";
import type { QualityReviewForm, QualityReviewWithId } from "@/lib/quality-review";
import type { QualityRecommendationIntent } from "@/lib/quality-review";
import {
  normalizeQualityReviewForm,
  validateQualityReviewForm,
  buildQualityReviewPayload,
  buildQualitySummaryPayload,
  formatQualityScore,
  getQualityReviewStatusLabel,
  getQualityReviewStatusBadgeClass,
  RECOMMENDATION_INTENT_DESCRIPTIONS,
  getPageHighlightLevel,
  getSectionHighlights,
} from "@/lib/quality-review";
import { ProviderCostDashboard } from "@/components/admin/ProviderCostDashboard";
import { computeProviderCostMetrics } from "@/lib/admin-cost-metrics";

type BookWithId = BookDoc & { id: string };
type PageWithId = PageDoc & { id: string };
type FeedbackWithId = BookFeedbackDoc & { id: string };
type ReviewStatusFilter = "all" | "completed" | "partial_completed" | "failed";
type ReviewQualityFilter = "all" | "ok" | "warning" | "failed";
type ReviewPlanFilter = "all" | ProductPlan;
type ReviewModelFilter = "all" | ImageModelProfile;
type ReviewQualityReviewFilter = "all" | "not_reviewed" | "human_reviewed" | "llm_reviewed" | "needs_fix" | "approved";
type ReviewQualitySortOrder = "default" | "low_first" | "high_first";
type ReviewSourceFilter = "all" | "fixed_template" | "smoke";

interface SloSnapshot extends Partial<SloMetrics> {
  id: string;
  createdAtMs?: number;
  createdBy?: string;
  bookCount?: number;
  pageCount?: number;
  sampleSize?: number;
  sampleUnit?: string;
  source?: string;
  window?: string;
}

type SloSampleSize = 50 | 100 | 200;

interface StaleCleanupStatus {
  lastRunAtMs?: number;
  lastSummary?: {
    checkedPages: number;
    checkedBooks: number;
    updatedBooks: number;
    updatedPages: number;
    skippedBooks: number;
    skippedPages: number;
  };
}

interface StaleCleanupRun {
  runKey: string;
  createdAtMs: number;
  checkedPages: number;
  checkedBooks: number;
  updatedBooks: number;
  updatedPages: number;
  skippedBooks: number;
  skippedPages: number;
}

type AdminReviewForm = {
  adminTextQualityScore: string;
  adminImageQualityScore: string;
  adminCharacterConsistencyScore: string;
  adminStorySatisfactionScore: string;
  adminMemo: string;
};

const PRODUCT_PLAN_OPTIONS: Array<{ value: ReviewPlanFilter; label: string }> = [
  { value: "all", label: "all" },
  { value: "free", label: "free" },
  { value: "standard_paid", label: "standard_paid" },
  { value: "premium_paid", label: "premium_paid" },
];

const MODEL_PROFILE_OPTIONS: Array<{ value: ReviewModelFilter; label: string }> = [
  { value: "all", label: "all" },
  { value: "klein_fast", label: "klein_fast" },
  { value: "klein_base", label: "klein_base" },
  { value: "pro_consistent", label: "pro_consistent" },
  { value: "kontext_reference", label: "kontext_reference" },
];

function formatTimestamp(ts: Timestamp | null | undefined, ms?: number): string {
  const date = normalizeFirestoreDate(ts) ?? (ms ? new Date(ms) : null);
  if (!date) return "—";
  return formatResolvedDate(date);
}

function formatBookTimestamp(book: BookWithId, field: keyof BookWithId): string {
  const value = book[field];
  if (value && typeof value === "object" && "seconds" in value) {
    return formatTimestamp(value as Timestamp);
  }
  if (typeof value === "number") {
    return formatTimestamp(undefined, value);
  }
  return "—";
}

function formatMs(ms: number | undefined): string {
  if (ms === undefined || ms === 0) return "—";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function getStoryQualityWarnings(report?: StoryQualityReportData) {
  return report?.issues.filter((issue) => issue.severity === "warning") ?? [];
}

function getStoryQualityStatus(book: BookWithId): "ok" | "warning" | "failed" {
  const report = book.storyQualityReport;
  if (!report) {
    return book.status === "failed" ? "failed" : "warning";
  }
  if (report.issues.some((issue) => issue.severity === "error")) {
    return "failed";
  }
  if (report.ok && getStoryQualityWarnings(report).length === 0) {
    return "ok";
  }
  return "warning";
}

function countByStatus(books: BookWithId[]) {
  return books.reduce<Record<string, number>>((acc, book) => {
    acc[book.status] = (acc[book.status] ?? 0) + 1;
    return acc;
  }, {});
}

function countByProductPlan(books: BookWithId[]) {
  return books.reduce<Record<string, number>>((acc, book) => {
    const key = book.productPlan ?? "unknown";
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
}

function countByStoryQualityStatus(books: BookWithId[]) {
  return books.reduce<Record<string, number>>((acc, book) => {
    const key = getStoryQualityStatus(book);
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
}

function countByImageModelProfile(books: BookWithId[]) {
  return books.reduce<Record<string, number>>((acc, book) => {
    const key = resolveEffectiveImageModelProfile(book);
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
}

function averageRewriteAttempts(books: BookWithId[]) {
  const values = books
    .map((book) => book.storyTextRewriteAttempts)
    .filter((value): value is number => typeof value === "number");
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function averageTextChars(books: BookWithId[]) {
  const values = books
    .map((book) => book.storyQualityReport?.summary.averageCharsPerPage)
    .filter((value): value is number => typeof value === "number");
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function averageImageDuration(books: BookWithId[]) {
  const values = books
    .map((book) => book.averageImageDurationMs)
    .filter((value): value is number => typeof value === "number" && value > 0);
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function imageFailureRate(books: BookWithId[]) {
  const withData = books.filter(
    (book) => typeof book.totalImageCount === "number" && book.totalImageCount > 0
  );
  if (withData.length === 0) return 0;
  const totalImages = withData.reduce((sum, book) => sum + (book.totalImageCount ?? 0), 0);
  const failedImages = withData.reduce((sum, book) => sum + (book.imageFailureCount ?? 0), 0);
  return totalImages > 0 ? (failedImages / totalImages) * 100 : 0;
}

function slowImageCount(books: BookWithId[]) {
  return books.filter((book) => (book.maxImageDurationMs ?? 0) > 120_000).length;
}

function resolveEffectiveImageModelProfile(
  book: BookWithId,
  pages?: PageWithId[]
): ImageModelProfile | "unknown" {
  if (book.imageModelProfile) {
    return book.imageModelProfile;
  }

  if (pages?.length) {
    const pageZeroProfile = pages.find((page) => page.pageNumber === 0)?.imageModelProfile;
    if (pageZeroProfile) {
      return pageZeroProfile;
    }

    const counts = pages.reduce<Record<string, number>>((acc, page) => {
      if (!page.imageModelProfile) return acc;
      acc[page.imageModelProfile] = (acc[page.imageModelProfile] ?? 0) + 1;
      return acc;
    }, {});
    const mostFrequentProfile = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0];
    if (mostFrequentProfile) {
      return mostFrequentProfile as ImageModelProfile;
    }
  }

  const planConfig = book.productPlan ? PLAN_CONFIGS[book.productPlan] : null;
  return planConfig?.imageModelProfile ?? "unknown";
}

function compactJson(value: unknown) {
  return JSON.stringify(value, null, 2);
}

function getStatusBadgeClass(status: string) {
  if (status === "completed") return "bg-emerald-100 text-emerald-700";
  if (status === "failed") return "bg-rose-100 text-rose-700";
  return "bg-amber-100 text-amber-700";
}

function getQualityBadgeClass(status: "ok" | "warning" | "failed") {
  if (status === "ok") return "bg-emerald-100 text-emerald-700";
  if (status === "failed") return "bg-rose-100 text-rose-700";
  return "bg-amber-100 text-amber-700";
}

function normalizeReviewForm(book?: BookWithId): AdminReviewForm {
  return {
    adminTextQualityScore: book?.adminTextQualityScore ? String(book.adminTextQualityScore) : "",
    adminImageQualityScore: book?.adminImageQualityScore
      ? String(book.adminImageQualityScore)
      : book?.adminQualityScore
        ? String(book.adminQualityScore)
        : "",
    adminCharacterConsistencyScore: book?.adminCharacterConsistencyScore
      ? String(book.adminCharacterConsistencyScore)
      : book?.adminImageConsistencyScore
        ? String(book.adminImageConsistencyScore)
        : "",
    adminStorySatisfactionScore: book?.adminStorySatisfactionScore
      ? String(book.adminStorySatisfactionScore)
      : "",
    adminMemo: book?.adminMemo ?? "",
  };
}

function BookStatCard({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <Card>
      <CardContent className="space-y-1 p-4">
        <p className="text-xs uppercase tracking-wide text-violet-500">{label}</p>
        <p className="text-2xl font-semibold text-purple-950">{value}</p>
        {hint ? <p className="text-xs text-violet-500">{hint}</p> : null}
      </CardContent>
    </Card>
  );
}

import {
  computeSloMetrics,
  SLO_TARGETS,
  type SloMetrics,
} from "@/lib/admin-slo-metrics";

import { computeQualityTrend, type QualityTrendSummary } from "@/lib/admin-quality-trend";
import { computeQualityComparison, type QualityComparisonMetrics } from "@/lib/admin-quality-comparison";
import { QualityComparisonDashboard } from "@/components/admin/QualityComparisonDashboard";

interface QualitySnapshot extends QualityTrendSummary {
  id: string;
  /** Human-readable date label for the snapshot row (derived from createdAtMs). */
  label?: string;
  /** Start of the snapshot window in epoch ms (used for ordering/display). */
  startMs?: number;
  createdAtMs?: number;
  createdBy?: string;
  source?: string;
  window?: string;
}

function SloCard({
  label,
  value,
  target,
  pass,
}: {
  label: string;
  value: string;
  target: string;
  pass: boolean | null;
}) {
  return (
    <Card>
      <CardContent className="space-y-1 p-4">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs uppercase tracking-wide text-violet-500">{label}</p>
          {pass !== null && (
            <span
              className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                pass ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
              }`}
            >
              {pass ? "PASS" : "FAIL"}
            </span>
          )}
        </div>
        <p className="text-2xl font-semibold text-purple-950">{value}</p>
        <p className="text-xs text-violet-500">target: {target}</p>
      </CardContent>
    </Card>
  );
}

function StoryCastCard({ character }: { character: StoryCharacter }) {
  return (
    <Card className="border-violet-100">
      <CardContent className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-semibold text-purple-950">{character.displayName}</p>
            <p className="text-xs text-violet-500">{character.characterId}</p>
          </div>
          <Badge className="bg-violet-100 text-violet-700">{character.role}</Badge>
        </div>
        <p className="text-sm leading-relaxed text-violet-800">{character.visualBible}</p>
        {character.silhouette ? (
          <p className="text-xs text-violet-600">
            <span className="font-medium text-purple-900">silhouette:</span> {character.silhouette}
          </p>
        ) : null}
        {character.colorPalette?.length ? (
          <div className="flex flex-wrap gap-2">
            {character.colorPalette.map((color) => (
              <span key={color} className="rounded-full bg-pink-50 px-3 py-1 text-xs text-pink-700">
                {color}
              </span>
            ))}
          </div>
        ) : null}
        {character.signatureItems?.length ? (
          <div className="space-y-1">
            <p className="text-xs font-medium text-purple-900">signatureItems</p>
            <div className="flex flex-wrap gap-2">
              {character.signatureItems.map((item) => (
                <span key={item} className="rounded-full bg-amber-50 px-3 py-1 text-xs text-amber-700">
                  {item}
                </span>
              ))}
            </div>
          </div>
        ) : null}
        {character.doNotChange?.length ? (
          <div className="space-y-1">
            <p className="text-xs font-medium text-purple-900">doNotChange</p>
            <ul className="list-disc pl-5 text-xs text-violet-700">
              {character.doNotChange.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        ) : null}
        <div className="grid gap-3 sm:grid-cols-2">
          {character.referenceImageUrl ? (
            <a href={character.referenceImageUrl} target="_blank" rel="noreferrer" className="space-y-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={character.referenceImageUrl}
                alt={`${character.displayName} reference`}
                className="aspect-square w-full rounded-2xl border border-violet-100 object-cover"
              />
              <p className="text-xs text-violet-500">referenceImageUrl</p>
            </a>
          ) : null}
          {character.approvedImageUrl ? (
            <a href={character.approvedImageUrl} target="_blank" rel="noreferrer" className="space-y-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={character.approvedImageUrl}
                alt={`${character.displayName} approved`}
                className="aspect-square w-full rounded-2xl border border-violet-100 object-cover"
              />
              <p className="text-xs text-violet-500">approvedImageUrl</p>
            </a>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminBookQualityReviewPage() {
  const { user, loading } = useAuth();
  const { checkingAdmin, isAdmin, refreshAdminClaim } = useAdminClaim();
  const [books, setBooks] = useState<BookWithId[]>([]);
  const [booksLoading, setBooksLoading] = useState(true);
  const [booksError, setBooksError] = useState<string | null>(null);
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null);
  const [pages, setPages] = useState<PageWithId[]>([]);
  const [pagesLoading, setPagesLoading] = useState(false);
  const [pagesError, setPagesError] = useState<string | null>(null);
  const [feedbacks, setFeedbacks] = useState<FeedbackWithId[]>([]);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<ReviewStatusFilter>("all");
  const [planFilter, setPlanFilter] = useState<ReviewPlanFilter>("all");
  const [qualityFilter, setQualityFilter] = useState<ReviewQualityFilter>("all");
  const [modelFilter, setModelFilter] = useState<ReviewModelFilter>("all");
  const [sourceFilter, setSourceFilter] = useState<ReviewSourceFilter>("all");
  const [qualityReviewFilter, setQualityReviewFilter] = useState<ReviewQualityReviewFilter>("all");
  const [qualitySortOrder, setQualitySortOrder] = useState<ReviewQualitySortOrder>("default");
  const [searchText, setSearchText] = useState("");
  const [reviewForm, setReviewForm] = useState<AdminReviewForm>(normalizeReviewForm());
  const [savingReview, setSavingReview] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [copyMessage, setCopyMessage] = useState<string | null>(null);
  const [regeneratingPageIds, setRegeneratingPageIds] = useState<Set<string>>(new Set());
  const [regenerationMessages, setRegenerationMessages] = useState<Record<string, string>>({});
  const [regeneratingCover, setRegeneratingCover] = useState(false);
  const [coverRegenMessage, setCoverRegenMessage] = useState<string | null>(null);
  const [allPagesMap, setAllPagesMap] = useState<Map<string, PageWithId[]>>(new Map());
  const [allPagesLoading, setAllPagesLoading] = useState(false);
  const [allReviewsMap, setAllReviewsMap] = useState<Map<string, QualityReviewWithId[]>>(new Map());
  const [allReviewsLoading, setAllReviewsLoading] = useState(false);
  const [savingSnapshot, setSavingSnapshot] = useState(false);
  const [snapshotMessage, setSnapshotMessage] = useState<string | null>(null);
  const [snapshotHistory, setSnapshotHistory] = useState<SloSnapshot[]>([]);
  const [snapshotHistoryLoading, setSnapshotHistoryLoading] = useState(false);
  const [qualitySnapshotHistory, setQualitySnapshotHistory] = useState<QualitySnapshot[]>([]);
  const [qualitySnapshotHistoryLoading, setQualitySnapshotHistoryLoading] = useState(false);
  const [sloSampleSize, setSloSampleSize] = useState<SloSampleSize>(200);
  const [regenHistory, setRegenHistory] = useState<RegenerationHistoryEntry[]>([]);
  const [regenHistoryLoading, setRegenHistoryLoading] = useState(false);
  const [regenHistoryPageId, setRegenHistoryPageId] = useState<string | null>(null);
  const [staleCleanupStatus, setStaleCleanupStatus] = useState<StaleCleanupStatus | null>(null);
  const [staleCleanupRuns, setStaleCleanupRuns] = useState<StaleCleanupRun[]>([]);
  const [staleCleanupLoading, setStaleCleanupLoading] = useState(false);
  const [qualityReviewForm, setQualityReviewForm] = useState<QualityReviewForm>(normalizeQualityReviewForm());
  const [qualityReviews, setQualityReviews] = useState<QualityReviewWithId[]>([]);
  const [qualityReviewsLoading, setQualityReviewsLoading] = useState(false);
  const [qualityReviewsError, setQualityReviewsError] = useState<string | null>(null);
  const [savingQualityReview, setSavingQualityReview] = useState(false);
  const [qualityReviewMessage, setQualityReviewMessage] = useState<string | null>(null);
  const [batchReviewMessage, setBatchReviewMessage] = useState<string | null>(null);
  const [intentMessage, setIntentMessage] = useState<string | null>(null);
  const [activeIntent, setActiveIntent] = useState<QualityRecommendationIntent | null>(null);

  const sectionHighlights = getSectionHighlights(activeIntent);

  function getPermissionHelpMessage(message: string) {
    if (!/Missing or insufficient permissions/i.test(message)) {
      return message;
    }
    return `${message} Firestore rules が管理者読み取り/更新を許可していない、または admin claim がID tokenに反映されていない可能性があります。`;
  }

  useEffect(() => {
    if (!isAdmin) return;

    if (process.env.NEXT_PUBLIC_EHORIA_DEMO_MODE === "true") {
      setQualitySnapshotHistory([
        {
          id: "demo-q-1",
          label: "2026-05-11",
          startMs: Date.now() - 86400000 * 7,
          totalReviewed: 10,
          avgOverall: 4.2,
          avgStory: 4.3,
          avgIllustration: 4.1,
          avgCharacterConsistency: 4.2,
          avgPersonalization: 4.0,
          avgSafety: 4.5,
          scoreDistribution: { 1: 0, 2: 0, 3: 0, 4: 8, 5: 2 },
          avgStoryByPlan: { free: 4.1, standard_paid: 4.3, premium_paid: 4.5 },
          avgOverallByPlan: { free: 4.0, standard_paid: 4.2, premium_paid: 4.4 },
          buckets: [],
          regressions: [],
          source: "scheduled-weekly-quality",
        },
        {
          id: "demo-q-2",
          label: "2026-05-04",
          startMs: Date.now() - 86400000 * 14,
          totalReviewed: 8,
          avgOverall: 4.5,
          avgStory: 4.4,
          avgIllustration: 4.6,
          avgCharacterConsistency: 4.5,
          avgPersonalization: 4.3,
          avgSafety: 4.6,
          scoreDistribution: { 1: 0, 2: 0, 3: 0, 4: 4, 5: 4 },
          avgStoryByPlan: { free: 4.2, standard_paid: 4.4, premium_paid: 4.6 },
          avgOverallByPlan: { free: 4.3, standard_paid: 4.5, premium_paid: 4.7 },
          buckets: [],
          regressions: [{ axis: "illustration", currentAvg: 4.1, previousAvg: 4.6, dropPct: 10.8 }],
          source: "scheduled-weekly-quality",
        }
      ] as QualitySnapshot[]);

      const demoBooks = [
        {
          id: "demo-book-1",
          title: "Demo Book (Premium)",
          status: "completed",
          productPlan: "premium_paid",
          creationMode: "guided_ai",
          hasCoverPage: true,
          coverStatus: "completed",
          coverImageModelProfile: "pro_consistent",
          createdAt: { seconds: Date.now() / 1000, nanoseconds: 0 } as unknown as import("firebase/firestore").Timestamp,
          overallQualityScore: 4.5,
          qualityReviewStatus: "llm_reviewed",
          characterConsistencyScore: 4,
          storyCast: [
            { characterId: "char1", displayName: "Test Character", role: "protagonist", visualBible: "A small blue robot" }
          ]
        } as BookWithId,
        {
          id: "demo-book-2",
          title: "Demo Book (Free)",
          status: "completed",
          productPlan: "free",
          creationMode: "fixed_template",
          createdAt: { seconds: Date.now() / 1000 - 86400, nanoseconds: 0 } as unknown as import("firebase/firestore").Timestamp,
          overallQualityScore: 3.8,
          qualityReviewStatus: "human_reviewed",
        } as BookWithId,
      ];

      setBooks(demoBooks);
      setBooksLoading(false);

      // Mock pages for cost dashboard
      const mockPagesMap = new Map<string, PageWithId[]>();
      mockPagesMap.set("demo-book-1", [
        { id: "p1", pageNumber: 0, status: "completed", imageModel: "black-forest-labs/flux-2-pro", imageQualityTier: "premium" } as PageWithId,
        { id: "p2", pageNumber: 1, status: "completed", imageModel: "black-forest-labs/flux-2-pro", imageQualityTier: "premium" } as PageWithId,
      ]);
      mockPagesMap.set("demo-book-2", [
        { id: "p3", pageNumber: 0, status: "completed", imageModel: "black-forest-labs/flux-2-klein-9b", imageQualityTier: "light" } as PageWithId,
      ]);
      setAllPagesMap(mockPagesMap);

      return;
    }

    const booksQuery = query(collection(db, "books"), orderBy("createdAt", "desc"), limit(sloSampleSize));
    const unsubscribe = onSnapshot(
      booksQuery,
      (snapshot) => {
        const nextBooks = snapshot.docs.map((snapshotDoc) => ({
          id: snapshotDoc.id,
          ...(snapshotDoc.data() as BookDoc),
        }));
        setBooks(nextBooks);
        setBooksLoading(false);
        setBooksError(null);
      },
      (error) => {
        console.error("Failed to load books for review:", error);
        setBooksError(getPermissionHelpMessage(error.message));
        setBooksLoading(false);
      }
    );

    return () => unsubscribe();
  }, [isAdmin, sloSampleSize]);

// // Stable key for the set of loaded book IDs – avoids reloading pages
//    when only book fields (status, scores) change via onSnapshot.
  const bookIdsKey = useMemo(() => books.map((b) => b.id).join(","), [books]);

// Batch-load pages for all loaded books (one-time getDocs per book).
// ~50 books × ~4 pages = ~200 docs – bounded and admin-only.
  useEffect(() => {
    const ids = bookIdsKey.split(",").filter(Boolean);
    if (!isAdmin || ids.length === 0) {
      setAllPagesMap(new Map());
      return;
    }
    let cancelled = false;
    setAllPagesLoading(true);

    Promise.all(
      ids.map(async (bookId) => {
        const snap = await getDocs(collection(db, "books", bookId, "pages"));
        return {
          bookId,
          pages: snap.docs.map((d) => ({ id: d.id, ...(d.data() as PageDoc) })),
        };
      }),
    )
      .then((results) => {
        if (cancelled) return;
        const map = new Map<string, PageWithId[]>();
        for (const r of results) {
          map.set(r.bookId, r.pages);
        }
        setAllPagesMap(map);
        setAllPagesLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error("Failed to load pages for SLO metrics:", err);
        setAllPagesLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isAdmin, bookIdsKey]);

  // Batch-load qualityReviews for all loaded books.
  useEffect(() => {
    const ids = bookIdsKey.split(",").filter(Boolean);
    if (!isAdmin || ids.length === 0) {
      setAllReviewsMap(new Map());
      return;
    }
    let cancelled = false;
    setAllReviewsLoading(true);

    Promise.all(
      ids.map(async (bookId) => {
        const snap = await getDocs(collection(db, "books", bookId, "qualityReviews"));
        return {
          bookId,
          reviews: snap.docs.map((d) => ({ id: d.id, ...d.data() } as QualityReviewWithId)),
        };
      }),
    )
      .then((results) => {
        if (cancelled) return;
        const map = new Map<string, QualityReviewWithId[]>();
        for (const r of results) {
          map.set(r.bookId, r.reviews);
        }
        setAllReviewsMap(map);
        setAllReviewsLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error("Failed to load reviews for quality comparison:", err);
        setAllReviewsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isAdmin, bookIdsKey]);

  const filteredBooks = useMemo(() => {
    const normalizedSearch = searchText.trim().toLowerCase();
    const filtered = books.filter((book) => {
      if (statusFilter !== "all" && book.status !== statusFilter) return false;
      if (planFilter !== "all" && book.productPlan !== planFilter) return false;
      if (qualityFilter !== "all" && getStoryQualityStatus(book) !== qualityFilter) return false;
      if (modelFilter !== "all" && resolveEffectiveImageModelProfile(book) !== modelFilter) return false;
      if (sourceFilter === "fixed_template" && book.creationMode !== "fixed_template") return false;
      if (sourceFilter === "smoke" && !book.smokeTestMetadata?.isSmokeTest) return false;
      if (qualityReviewFilter !== "all") {
        const bookQrStatus = book.qualityReviewStatus ?? "not_reviewed";
        if (bookQrStatus !== qualityReviewFilter) return false;
      }
      if (!normalizedSearch) return true;

      const haystack = [
        book.id,
        book.title,
        book.userId,
        book.childId,
        book.templateId,
        book.creationMode,
        book.theme,
        book.smokeTestMetadata?.suite,
        book.smokeTestMetadata?.runId,
        book.smokeTestMetadata?.sourceScript,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(normalizedSearch);
    });
    if (qualitySortOrder === "low_first") {
      filtered.sort((a, b) => (a.overallQualityScore ?? 0) - (b.overallQualityScore ?? 0));
    } else if (qualitySortOrder === "high_first") {
      filtered.sort((a, b) => (b.overallQualityScore ?? 0) - (a.overallQualityScore ?? 0));
    }
    return filtered;
  }, [books, modelFilter, planFilter, qualityFilter, qualityReviewFilter, qualitySortOrder, searchText, sourceFilter, statusFilter]);

  useEffect(() => {
    if (filteredBooks.length === 0) {
      setSelectedBookId(null);
      return;
    }
    if (!selectedBookId || !filteredBooks.some((book) => book.id === selectedBookId)) {
      setSelectedBookId(filteredBooks[0].id);
    }
  }, [filteredBooks, selectedBookId]);

  const selectedBook = useMemo(
    () => filteredBooks.find((book) => book.id === selectedBookId) ?? null,
    [filteredBooks, selectedBookId]
  );
  const selectedBookEffectiveImageModelProfile = useMemo(
    () => (selectedBook ? resolveEffectiveImageModelProfile(selectedBook, pages) : "unknown"),
    [pages, selectedBook]
  );

  useEffect(() => {
    setReviewForm(normalizeReviewForm(selectedBook ?? undefined));
    setSaveMessage(null);
    setQualityReviewForm(normalizeQualityReviewForm());
    setQualityReviewMessage(null);
  }, [selectedBook]);

  // Quality reviews subscription
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_EHORIA_DEMO_MODE === "true") {
      setQualityReviews([
        {
          id: "demo-qr-1",
          reviewerType: "llm",
          reviewerId: "system_llm",
          characterConsistencyScore: 4,
          overallScore: 4.5,
          status: "llm_reviewed",
          reviewReason: "Test review reason",
          flaggedIssues: [{ area: "character", severity: "medium", message: "Demo character issue" }],
          characterAxes: {
            visualBibleReflected: 4,
            characterIdConsistency: 5,
            appearingCharacterConsistency: 4,
            focusCharacterConsistency: 3,
            pageLevelCharacterLinkage: 5,
            outfitHairstyleConsistency: 4,
            colorPaletteConsistency: 4,
          }
        } as unknown as QualityReviewWithId
      ]);
      setQualityReviewsLoading(false);
      return;
    }
    if (process.env.NEXT_PUBLIC_EHORIA_DEMO_MODE === "true") {
      setPages([
        {
          id: "demo-page-1",
          pageNumber: 0,
          text: "Test page 1 text",
          imagePrompt: "Test character appearing in a room",
          status: "completed",
          appearingCharacterIds: ["char1"],
          focusCharacterId: "char1",
          usedCharacterReference: true,
        } as unknown as PageWithId
      ]);
      setPagesLoading(false);
      return;
    }
    if (!selectedBookId || !isAdmin) {
      setQualityReviews([]);
      setQualityReviewsLoading(false);
      setQualityReviewsError(null);
      return;
    }
    setQualityReviewsLoading(true);
    setQualityReviewsError(null);
    const qrQuery = query(
      collection(db, "books", selectedBookId, "qualityReviews"),
      orderBy("createdAtMs", "desc"),
      limit(5)
    );
    const unsubscribe = onSnapshot(
      qrQuery,
      (snapshot) => {
        const reviews = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })) as QualityReviewWithId[];
        setQualityReviews(reviews);
        setQualityReviewsLoading(false);
      },
      (err) => {
        console.error("Failed to load quality reviews:", err);
        setQualityReviewsError(err.message);
        setQualityReviewsLoading(false);
      }
    );
    return () => unsubscribe();
  }, [selectedBookId, isAdmin]);

  useEffect(() => {
    if (process.env.NEXT_PUBLIC_EHORIA_DEMO_MODE === "true") {
      setQualityReviews([
        {
          id: "demo-qr-1",
          reviewerType: "llm",
          reviewerId: "system_llm",
          characterConsistencyScore: 4,
          overallScore: 4.5,
          status: "llm_reviewed",
          reviewReason: "Test review reason",
          flaggedIssues: [{ area: "character", severity: "medium", message: "Demo character issue" }],
          characterAxes: {
            visualBibleReflected: 4,
            characterIdConsistency: 5,
            appearingCharacterConsistency: 4,
            focusCharacterConsistency: 3,
            pageLevelCharacterLinkage: 5,
            outfitHairstyleConsistency: 4,
            colorPaletteConsistency: 4,
          }
        } as unknown as QualityReviewWithId
      ]);
      setQualityReviewsLoading(false);
      return;
    }
    if (process.env.NEXT_PUBLIC_EHORIA_DEMO_MODE === "true") {
      setPages([
        {
          id: "demo-page-1",
          pageNumber: 0,
          text: "Test page 1 text",
          imagePrompt: "Test character appearing in a room",
          status: "completed",
          appearingCharacterIds: ["char1"],
          focusCharacterId: "char1",
          usedCharacterReference: true,
        } as unknown as PageWithId
      ]);
      setPagesLoading(false);
      return;
    }
    if (!selectedBookId || !isAdmin) {
      setPages([]);
      setFeedbacks([]);
      return;
    }
    setPagesLoading(true);
    const pagesQuery = query(
      collection(db, "books", selectedBookId, "pages"),
      orderBy("pageNumber", "asc")
    );
    const unsubscribe = onSnapshot(
      pagesQuery,
      (snapshot) => {
        setPages(
          snapshot.docs.map((snapshotDoc) => ({
            id: snapshotDoc.id,
            ...(snapshotDoc.data() as PageDoc),
          }))
        );
        setPagesLoading(false);
        setPagesError(null);
      },
      (error) => {
        console.error("Failed to load page review data:", error);
        setPagesError(getPermissionHelpMessage(error.message));
        setPagesLoading(false);
      }
    );
    return () => unsubscribe();
  }, [isAdmin, selectedBookId]);

  useEffect(() => {
    if (process.env.NEXT_PUBLIC_EHORIA_DEMO_MODE === "true") {
      setQualityReviews([
        {
          id: "demo-qr-1",
          reviewerType: "llm",
          reviewerId: "system_llm",
          characterConsistencyScore: 4,
          overallScore: 4.5,
          status: "llm_reviewed",
          reviewReason: "Test review reason",
          flaggedIssues: [{ area: "character", severity: "medium", message: "Demo character issue" }],
          characterAxes: {
            visualBibleReflected: 4,
            characterIdConsistency: 5,
            appearingCharacterConsistency: 4,
            focusCharacterConsistency: 3,
            pageLevelCharacterLinkage: 5,
            outfitHairstyleConsistency: 4,
            colorPaletteConsistency: 4,
          }
        } as unknown as QualityReviewWithId
      ]);
      setQualityReviewsLoading(false);
      return;
    }
    if (process.env.NEXT_PUBLIC_EHORIA_DEMO_MODE === "true") {
      setPages([
        {
          id: "demo-page-1",
          pageNumber: 0,
          text: "Test page 1 text",
          imagePrompt: "Test character appearing in a room",
          status: "completed",
          appearingCharacterIds: ["char1"],
          focusCharacterId: "char1",
          usedCharacterReference: true,
        } as unknown as PageWithId
      ]);
      setPagesLoading(false);
      return;
    }
    if (!selectedBookId || !isAdmin) {
      setFeedbacks([]);
      return;
    }
    setFeedbackLoading(true);
    const unsubscribe = onSnapshot(
      collection(db, "books", selectedBookId, "feedback"),
      (snapshot) => {
        const nextFeedbacks = snapshot.docs
          .map((snapshotDoc) => ({
            id: snapshotDoc.id,
            ...(snapshotDoc.data() as BookFeedbackDoc),
          }))
          .sort((a, b) => {
            const aTime =
              normalizeFirestoreDate(a.updatedAt)?.getTime() ??
              normalizeFirestoreDate(a.createdAt)?.getTime() ??
              a.updatedAtMs ??
              a.createdAtMs ??
              0;
            const bTime =
              normalizeFirestoreDate(b.updatedAt)?.getTime() ??
              normalizeFirestoreDate(b.createdAt)?.getTime() ??
              b.updatedAtMs ??
              b.createdAtMs ??
              0;
            return bTime - aTime;
          });
        setFeedbacks(nextFeedbacks);
        setFeedbackLoading(false);
        setFeedbackError(null);
      },
      (error) => {
        console.error("Failed to load feedback review data:", error);
        setFeedbackError(getPermissionHelpMessage(error.message));
        setFeedbackLoading(false);
      }
    );
    return () => unsubscribe();
  }, [isAdmin, selectedBookId]);

  const summaryByStatus = useMemo(() => countByStatus(books), [books]);
  const summaryByPlan = useMemo(() => countByProductPlan(books), [books]);
  const summaryByQuality = useMemo(() => countByStoryQualityStatus(books), [books]);
  const summaryByModel = useMemo(() => countByImageModelProfile(books), [books]);
  const qualityReviewSummary = useMemo(() => {
    const counts = { not_reviewed: 0, human_reviewed: 0, llm_reviewed: 0, needs_fix: 0, approved: 0 };
    for (const book of books) {
      const s = book.qualityReviewStatus ?? "not_reviewed";
      if (s in counts) counts[s as keyof typeof counts]++;
    }
    return counts;
  }, [books]);
  const qualityReportNgCount = useMemo(
    () => books.filter((book) => book.storyQualityReport?.ok === false).length,
    [books]
  );

  const qualityTrend = useMemo(() => computeQualityTrend(books), [books]);

  const qualityVitals = useMemo(() => {
    return {
      standard: {
        avgStory: qualityTrend.avgStoryByPlan["standard_paid"] || 0,
        target: 4.0,
        pass: (qualityTrend.avgStoryByPlan["standard_paid"] || 0) >= 4.0,
      },
      premium: {
        avgStory: qualityTrend.avgStoryByPlan["premium_paid"] || 0,
        target: 4.4,
        pass: (qualityTrend.avgStoryByPlan["premium_paid"] || 0) >= 4.4,
      },
    };
  }, [qualityTrend]);

  const qualityComparison = useMemo(() => {
    const pairs: { human: QualityReviewWithId; llm: QualityReviewWithId }[] = [];
    for (const reviews of allReviewsMap.values()) {
      const human = reviews.find((r) => r.reviewerType === "human");
      const llm = reviews.find((r) => r.reviewerType === "llm");
      if (human && llm) {
        pairs.push({ human, llm });
      }
    }
    return computeQualityComparison(pairs);
  }, [allReviewsMap]);

  const sloMetrics = useMemo(
    () => computeSloMetrics(books, allPagesMap),
    [books, allPagesMap],
  );

  const costMetrics = useMemo(
    () => computeProviderCostMetrics(books, allPagesMap),
    [books, allPagesMap]
  );

  const sloByPlan = useMemo(() => {
    const planKeys = ["free", "standard_paid", "premium_paid", "unknown"] as const;
    const result: Record<string, SloMetrics> = {};
    for (const plan of planKeys) {
      const planBooks = books.filter((b) => (b.productPlan ?? "unknown") === plan);
      if (planBooks.length === 0) continue;
      const planPagesMap = new Map<string, PageWithId[]>();
      for (const book of planBooks) {
        const bp = allPagesMap.get(book.id);
        if (bp) planPagesMap.set(book.id, bp);
      }
      result[plan] = computeSloMetrics(planBooks, planPagesMap);
    }
    return result;
  }, [books, allPagesMap]);

  const fetchSnapshotHistory = async () => {
    setSnapshotHistoryLoading(true);
    try {
      const q = query(
        collection(db, "adminMetrics", "sloSnapshots", "items"),
        orderBy("createdAtMs", "desc"),
        limit(20),
      );
      const snap = await getDocs(q);
      setSnapshotHistory(
        snap.docs.map((d) => ({ id: d.id, ...d.data() } as SloSnapshot)),
      );
    } catch (err) {
      console.error("Failed to fetch snapshot history:", err);
    } finally {
      setSnapshotHistoryLoading(false);
    }
  };

  const fetchQualitySnapshotHistory = async () => {
    setQualitySnapshotHistoryLoading(true);
    try {
      const q = query(
        collection(db, "adminMetrics", "qualitySnapshots", "items"),
        orderBy("createdAtMs", "desc"),
        limit(20),
      );
      const snap = await getDocs(q);
      setQualitySnapshotHistory(
        snap.docs.map((d) => {
          const data = d.data() as Omit<QualitySnapshot, "id">;
          // Saved snapshots carry createdAtMs but no display label; derive a
          // YYYY-MM-DD label so the history table shows a real date.
          const createdAtMs = data.createdAtMs ?? data.startMs;
          const label =
            data.label ??
            (createdAtMs ? new Date(createdAtMs).toISOString().slice(0, 10) : d.id);
          return { id: d.id, ...data, label, startMs: data.startMs ?? createdAtMs };
        }),
      );
    } catch (err) {
      console.error("Failed to fetch quality snapshot history:", err);
    } finally {
      setQualitySnapshotHistoryLoading(false);
    }
  };

  const fetchStaleCleanupStatus = async () => {
    setStaleCleanupLoading(true);
    try {
      const statusDoc = await getDoc(doc(db, "adminMetrics", "staleCleanup"));
      if (statusDoc.exists()) {
        setStaleCleanupStatus(statusDoc.data() as StaleCleanupStatus);
      }
      const runsQ = query(
        collection(db, "adminMetrics", "staleCleanup", "runs"),
        orderBy("createdAtMs", "desc"),
        limit(10),
      );
      const runsSnap = await getDocs(runsQ);
      setStaleCleanupRuns(
        runsSnap.docs.map((d) => d.data() as StaleCleanupRun),
      );
    } catch (err) {
      console.error("Failed to fetch stale cleanup status:", err);
    } finally {
      setStaleCleanupLoading(false);
    }
  };

  // Load snapshot history on mount (admin only)
  useEffect(() => {
    if (!isAdmin) return;
    fetchSnapshotHistory();
    fetchQualitySnapshotHistory();
    fetchStaleCleanupStatus();
  }, [isAdmin]);

  const handleSaveSnapshot = async () => {
    if (!user || savingSnapshot || sloMetrics.totalBooks === 0) return;
    setSavingSnapshot(true);
    setSnapshotMessage(null);
    try {
      await addDoc(collection(db, "adminMetrics", "sloSnapshots", "items"), {
        ...sloMetrics,
        source: "admin-book-quality-review",
        createdAt: serverTimestamp(),
        createdAtMs: Date.now(),
        createdBy: user.uid,
        bookCount: sloMetrics.totalBooks,
        pageCount: sloMetrics.totalPages,
        sampleSize: sloSampleSize,
        sampleUnit: "books",
      });
      setSnapshotMessage("SLO snapshot を保存しました");
      window.setTimeout(() => setSnapshotMessage(null), 3000);
      // Refresh history
      await fetchSnapshotHistory();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "保存に失敗しました";
      setSnapshotMessage(`失敗: ${msg}`);
    } finally {
      setSavingSnapshot(false);
    }
  };

  const handleCopy = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopyMessage(`${label} をコピーしました`);
      window.setTimeout(() => setCopyMessage(null), 1500);
    } catch (error) {
      console.error("Failed to copy text:", error);
      setCopyMessage("コピーに失敗しました");
    }
  };

  const handleRegeneratePage = async (page: PageWithId) => {
    if (!selectedBookId || regeneratingPageIds.has(page.id)) return;
    setRegeneratingPageIds((prev) => new Set(prev).add(page.id));
    setRegenerationMessages((prev) => ({ ...prev, [page.id]: "再生成中..." }));
    try {
      const regenerate = httpsCallable(functions, "regeneratePageImage");
      await regenerate({ bookId: selectedBookId, pageNumber: page.pageNumber });
      setRegenerationMessages((prev) => ({ ...prev, [page.id]: "再生成完了" }));
    } catch (err) {
      const message = err instanceof Error ? err.message : "再生成に失敗しました";
      setRegenerationMessages((prev) => ({ ...prev, [page.id]: `失敗: ${message}` }));
    } finally {
      setRegeneratingPageIds((prev) => {
        const next = new Set(prev);
        next.delete(page.id);
        return next;
      });
    }
  };

  const handleRegenerateCover = async () => {
    if (!selectedBookId || regeneratingCover) return;
    setRegeneratingCover(true);
    setCoverRegenMessage("カバー再生成中...");
    try {
      const regenerate = httpsCallable(functions, "regenerateCoverImage");
      await regenerate({ bookId: selectedBookId });
      setCoverRegenMessage("カバー再生成完了");
    } catch (err) {
      const message = err instanceof Error ? err.message : "カバー再生成に失敗しました";
      setCoverRegenMessage(`失敗: ${message}`);
    } finally {
      setRegeneratingCover(false);
    }
  };

  const handleSaveReview = async () => {
    if (!selectedBook || !user) return;
    setSavingReview(true);
    setSaveMessage(null);
    try {
      await updateDoc(doc(db, "books", selectedBook.id), {
        adminTextQualityScore: reviewForm.adminTextQualityScore
          ? Number(reviewForm.adminTextQualityScore)
          : null,
        adminImageQualityScore: reviewForm.adminImageQualityScore
          ? Number(reviewForm.adminImageQualityScore)
          : null,
        adminCharacterConsistencyScore: reviewForm.adminCharacterConsistencyScore
          ? Number(reviewForm.adminCharacterConsistencyScore)
          : null,
        adminQualityScore: reviewForm.adminImageQualityScore
          ? Number(reviewForm.adminImageQualityScore)
          : null,
        adminImageConsistencyScore: reviewForm.adminCharacterConsistencyScore
          ? Number(reviewForm.adminCharacterConsistencyScore)
          : null,
        adminStorySatisfactionScore: reviewForm.adminStorySatisfactionScore
          ? Number(reviewForm.adminStorySatisfactionScore)
          : null,
        adminMemo: reviewForm.adminMemo.trim(),
        adminReviewedAt: serverTimestamp(),
        adminReviewedBy: user.uid,
      });
      setSaveMessage("管理者レビューを保存しました");
    } catch (error) {
      console.error("Failed to save admin review:", error);
      const message = error instanceof Error ? error.message : "保存に失敗しました";
      setSaveMessage(getPermissionHelpMessage(message));
    } finally {
      setSavingReview(false);
    }
  };

  const findNextUnreviewed = (excludeId?: string) => {
    return books.find(
      (b) => b.id !== excludeId && (!b.qualityReviewStatus || b.qualityReviewStatus === "not_reviewed")
    );
  };

  const handleSelectNextUnreviewed = () => {
    setBatchReviewMessage(null);
    const next = findNextUnreviewed(selectedBookId ?? undefined);
    if (next) {
      setSelectedBookId(next.id);
    } else {
      setBatchReviewMessage("未レビューの book はありません");
    }
  };

  const handleSelectNextNeedsFix = () => {
    setBatchReviewMessage(null);
    const next = books.find((b) => b.id !== selectedBookId && b.qualityReviewStatus === "needs_fix");
    if (next) {
      setSelectedBookId(next.id);
    } else {
      setBatchReviewMessage("needs_fix の book はありません");
    }
  };

  const handleSelectLowestScore = () => {
    setBatchReviewMessage(null);
    const scored = books.filter((b) => b.id !== selectedBookId && b.overallQualityScore != null);
    if (scored.length === 0) {
      setBatchReviewMessage("quality score 付きの book はありません");
      return;
    }
    scored.sort((a, b) => (a.overallQualityScore ?? 0) - (b.overallQualityScore ?? 0));
    setSelectedBookId(scored[0].id);
  };

  const handleIntentAction = (intent: QualityRecommendationIntent) => {
    setIntentMessage(null);
    const description = RECOMMENDATION_INTENT_DESCRIPTIONS[intent];

     // Toggle: clicking the same intent again clears highlighting
    if (activeIntent === intent) {
      setActiveIntent(null);
      setIntentMessage(null);
      return;
    }

    setActiveIntent(intent);

    // Scroll to draft panel area (below recommendation panel)
    // so the user sees the task draft + save button immediately.
    // Highlighted sections are marked with ring-2 ring-amber-300.
    setTimeout(() => {
      const el = document.getElementById("task-draft-area");
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 50);

    setIntentMessage(`💡 ${description}`);
  };

  const handleClearIntent = () => {
    setActiveIntent(null);
    setIntentMessage(null);
  };

  const handleSaveQualityReview = async () => {
    if (!selectedBook || !user) return;
    const validationError = validateQualityReviewForm(qualityReviewForm);
    if (validationError) {
      setQualityReviewMessage(validationError);
      return;
    }
    setSavingQualityReview(true);
    setQualityReviewMessage(null);
    try {
      const now = Date.now();
      const reviewRef = doc(collection(db, "books", selectedBook.id, "qualityReviews"));
      const bookRef = doc(db, "books", selectedBook.id);
      const reviewPayload = buildQualityReviewPayload({
        reviewId: reviewRef.id,
        form: qualityReviewForm,
        bookId: selectedBook.id,
        reviewerId: user.uid,
        now,
        serverTimestamp: serverTimestamp() as unknown as Timestamp,
      });
      const summaryPayload = buildQualitySummaryPayload({
        reviewId: reviewRef.id,
        form: qualityReviewForm,
        reviewerId: user.uid,
        now,
        serverTimestamp: serverTimestamp() as unknown as Timestamp,
      });
      const batch = writeBatch(db);
      batch.set(reviewRef, reviewPayload);
      batch.update(bookRef, summaryPayload);
      await batch.commit();
      setQualityReviewMessage("Quality review を保存しました");
      setQualityReviewForm(normalizeQualityReviewForm());

       // Auto-next: when filter is "not_reviewed", jump to next unreviewed book
      if (qualityReviewFilter === "not_reviewed") {
        const next = findNextUnreviewed(selectedBook.id);
        if (next) {
          setSelectedBookId(next.id);
          setBatchReviewMessage("次の未レビュー book に移動しました");
        } else {
          setBatchReviewMessage("全ての book をレビュー済みです 🎉");
        }
      }
    } catch (error) {
      console.error("Failed to save quality review:", error);
      const message = error instanceof Error ? error.message : "保存に失敗しました";
      setQualityReviewMessage(getPermissionHelpMessage(message));
    } finally {
      setSavingQualityReview(false);
    }
  };

  return (
    <>
      <AdminNav />
      <PageTransition className="mx-auto max-w-[1600px] px-4 py-8">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-purple-900">Book 品質レビュー</h1>
            <p className="text-sm text-violet-600">
              Firestore を直接開かずに、Book / pages / storyCast / quality issues を確認できます。
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/admin/image-model-tests">
              <Button variant="outline">画像モデル比較へ</Button>
            </Link>
            <Link href="/home">
              <Button variant="outline">本棚へ戻る</Button>
            </Link>
          </div>
        </div>
      </div>

      <Card className="mt-6">
        <CardContent className="space-y-6 p-6">
          {loading || checkingAdmin ? (
            <p className="text-sm text-violet-500">権限を確認中...</p>
          ) : !user ? (
            <div className="space-y-3">
              <p className="text-sm text-rose-600">ログインが必要です</p>
              <div className="flex flex-wrap gap-3">
                <Link href="/login">
                  <Button>ログインへ</Button>
                </Link>
                <Link href="/admin/login">
                  <Button variant="outline">管理者ログインへ</Button>
                </Link>
              </div>
            </div>
          ) : !isAdmin ? (
            <div className="space-y-3 text-sm text-rose-600">
              <p>管理者権限が必要です。admin claim を確認してください。</p>
              <Link href="/admin/login">
                <Button>管理者ログインへ</Button>
              </Link>
            </div>
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-6">
                <BookStatCard label="total loaded" value={books.length} />
                <BookStatCard label="completed" value={summaryByStatus.completed ?? 0} />
                <BookStatCard label="partial_completed" value={summaryByStatus.partial_completed ?? 0} />
                <BookStatCard label="failed" value={summaryByStatus.failed ?? 0} />
                <BookStatCard label="quality ok=false" value={qualityReportNgCount} />
              </div>
              <div className="grid gap-3 md:grid-cols-5">
                <BookStatCard
                  label="avg image time"
                  value={formatMs(Math.round(averageImageDuration(books)))}
                  hint="直近50件の平均画像生成時間"
                />
                <BookStatCard
                  label="img failure rate"
                  value={`${imageFailureRate(books).toFixed(1)}%`}
                  hint="直近50件の画像失敗率"
                />
                <BookStatCard
                  label="slow images (>2min)"
                  value={slowImageCount(books)}
                  hint="maxImageDurationMs > 120s"
                />
                <BookStatCard
                  label="premium"
                  value={summaryByPlan.premium_paid ?? 0}
                  hint={`avg rewrite ${averageRewriteAttempts(books).toFixed(1)}`}
                />
                <BookStatCard
                  label="avg chars"
                  value={averageTextChars(books).toFixed(0)}
                  hint="storyQualityReport.averageCharsPerPage"
                />
              </div>

              {/* SLO Dashboard */}
              <div className="space-y-4 rounded-2xl border border-violet-200 bg-violet-50/30 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-base font-semibold text-purple-900">
                    SLO Dashboard
                    <span className="ml-2 text-xs font-normal text-violet-500">
                      {sloMetrics.totalBooks}冊完了 / {sloMetrics.totalPages}ページ
                    </span>
                  </h3>
                  <div className="flex flex-wrap items-center gap-2">
                    {allPagesLoading && (
                      <span className="text-xs text-violet-500">ページデータ読み込み中...</span>
                    )}
                    <select
                      value={sloSampleSize}
                      onChange={(e) => setSloSampleSize(Number(e.target.value) as SloSampleSize)}
                      className="rounded-lg border border-input bg-background px-2 py-1 text-xs"
                      aria-label="Book sample size"
                    >
                      <option value={50}>50 books</option>
                      <option value={100}>100 books</option>
                      <option value={200}>200 books</option>
                    </select>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={savingSnapshot || sloMetrics.totalBooks === 0}
                      onClick={handleSaveSnapshot}
                    >
                      {savingSnapshot ? "保存中..." : "Save SLO Snapshot"}
                    </Button>
                    {snapshotMessage && (
                      <span className="text-xs text-violet-600">{snapshotMessage}</span>
                    )}
                  </div>
                </div>
                <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
                  <SloCard
                    label="Book Readable"
                    value={`${sloMetrics.bookReadableRate.toFixed(1)}%`}
                    target="≥ 98%"
                    pass={sloMetrics.totalBooks > 0 ? sloMetrics.bookReadableRate >= SLO_TARGETS.bookReadableRate : null}
                  />
                  <SloCard
                    label="Book Hard Failed"
                    value={`${sloMetrics.bookHardFailedRate.toFixed(1)}%`}
                    target="≤ 2%"
                    pass={sloMetrics.totalBooks > 0 ? sloMetrics.bookHardFailedRate <= SLO_TARGETS.bookHardFailedRate : null}
                  />
                  <SloCard
                    label="Image p95"
                    value={formatMs(Math.round(sloMetrics.imageP95Ms))}
                    target="≤ 120s"
                    pass={sloMetrics.totalPages > 0 ? sloMetrics.imageP95Ms <= SLO_TARGETS.imageP95Sec * 1000 : null}
                  />
                  <SloCard
                    label="Image Failed"
                    value={`${sloMetrics.pageImageFailureRate.toFixed(1)}%`}
                    target="≤ 2%"
                    pass={sloMetrics.totalPages > 0 ? sloMetrics.pageImageFailureRate <= SLO_TARGETS.pageImageFailureRate : null}
                  />
                  <SloCard
                    label="Regen Success"
                    value={sloMetrics.regenerationCount > 0 ? `${sloMetrics.regenerationSuccessRate.toFixed(1)}%` : "—"}
                    target="≥ 95%"
                    pass={sloMetrics.regenerationCount > 0 ? sloMetrics.regenerationSuccessRate >= SLO_TARGETS.regenerationSuccessRate : null}
                  />
                  <SloCard
                    label="Fallback Rate"
                    value={`${sloMetrics.fallbackRate.toFixed(1)}%`}
                    target="(参考)"
                    pass={null}
                  />
                </div>
                <div className="grid gap-3 md:grid-cols-4">
                  <BookStatCard label="image p50" value={formatMs(Math.round(sloMetrics.imageP50Ms))} />
                  <BookStatCard label="image p90" value={formatMs(Math.round(sloMetrics.imageP90Ms))} />
                  <BookStatCard label="timeout pages" value={sloMetrics.timeoutPages} hint={`${sloMetrics.timeoutRate.toFixed(1)}%`} />
                  <BookStatCard
                    label="regen count"
                    value={`${sloMetrics.regenerationSuccessCount}/${sloMetrics.regenerationCount}`}
                    hint="成功/試行"
                  />
                </div>
                {Object.keys(sloByPlan).length > 0 && (
                  <div className="overflow-x-auto rounded-xl bg-white p-3">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-violet-500">Plan別 SLO</p>
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-left text-xs uppercase tracking-wide text-violet-500">
                          <th className="pb-2 pr-4">Plan</th>
                          <th className="pb-2 pr-4">Books</th>
                          <th className="pb-2 pr-4">Readable</th>
                          <th className="pb-2 pr-4">Failed</th>
                          <th className="pb-2 pr-4">Pages</th>
                          <th className="pb-2 pr-4">Img Fail</th>
                          <th className="pb-2 pr-4">Fallback</th>
                          <th className="pb-2 pr-4">p95</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(sloByPlan).map(([plan, m]) => (
                          <tr key={plan} className="border-b border-violet-50 text-violet-800">
                            <td className="py-2 pr-4 font-medium text-purple-900">{plan}</td>
                            <td className="py-2 pr-4">{m.totalBooks}</td>
                            <td className="py-2 pr-4">{m.bookReadableRate.toFixed(1)}%</td>
                            <td className="py-2 pr-4">{m.bookHardFailedRate.toFixed(1)}%</td>
                            <td className="py-2 pr-4">{m.totalPages}</td>
                            <td className="py-2 pr-4">{m.pageImageFailureRate.toFixed(1)}%</td>
                            <td className="py-2 pr-4">{m.fallbackRate.toFixed(1)}%</td>
                            <td className="py-2 pr-4">{formatMs(Math.round(m.imageP95Ms))}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* SLO Snapshot History */}
                <div className="overflow-x-auto rounded-xl bg-white p-3">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-violet-500">SLO Snapshot History</p>
                  {snapshotHistoryLoading ? (
                    <p className="py-4 text-center text-xs text-violet-400">読み込み中...</p>
                  ) : snapshotHistory.length === 0 ? (
                    <p className="py-4 text-center text-xs text-violet-400">スナップショットがありません。「Save SLO Snapshot」ボタンで保存してください。</p>
                  ) : (
                    <>
                      {/* Trend indicators: compare latest vs previous */}
                      {snapshotHistory.length >= 2 && (() => {
                        const latest = snapshotHistory[0];
                        const prev = snapshotHistory[1];
                        const trends: { label: string; curr: number; prev: number; higherIsBetter: boolean; unit: string }[] = [
                          { label: "Readable", curr: latest.bookReadableRate ?? 0, prev: prev.bookReadableRate ?? 0, higherIsBetter: true, unit: "%" },
                          { label: "Hard Failed", curr: latest.bookHardFailedRate ?? 0, prev: prev.bookHardFailedRate ?? 0, higherIsBetter: false, unit: "%" },
                          { label: "Image p95", curr: latest.imageP95Ms ?? 0, prev: prev.imageP95Ms ?? 0, higherIsBetter: false, unit: "ms" },
                          { label: "Img Fail", curr: latest.pageImageFailureRate ?? 0, prev: prev.pageImageFailureRate ?? 0, higherIsBetter: false, unit: "%" },
                          { label: "Timeout", curr: latest.timeoutRate ?? 0, prev: prev.timeoutRate ?? 0, higherIsBetter: false, unit: "%" },
                        ];
                        return (
                          <div className="mb-3 flex flex-wrap gap-3">
                            {trends.map((t) => {
                              const diff = t.curr - t.prev;
                              const improved = t.higherIsBetter ? diff > 0 : diff < 0;
                              const arrow = diff === 0 ? "→" : improved ? "↑" : "↓";
                              const color = diff === 0 ? "text-violet-500" : improved ? "text-emerald-600" : "text-rose-600";
                              const formatted = t.unit === "ms" ? formatMs(Math.round(t.curr)) : `${t.curr.toFixed(1)}%`;
                              return (
                                <div key={t.label} className="rounded-lg border border-violet-100 bg-violet-50/50 px-3 py-1.5 text-xs">
                                  <span className="text-violet-500">{t.label}</span>{" "}
                                  <span className="font-medium text-violet-800">{formatted}</span>{" "}
                                  <span className={`font-semibold ${color}`}>{arrow}</span>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })()}
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b text-left text-xs uppercase tracking-wide text-violet-500">
                            <th className="pb-2 pr-4">Date</th>
                            <th className="pb-2 pr-4">Readable</th>
                            <th className="pb-2 pr-4">Failed</th>
                            <th className="pb-2 pr-4">p95</th>
                            <th className="pb-2 pr-4">Img Fail</th>
                            <th className="pb-2 pr-4">Timeout</th>
                            <th className="pb-2 pr-4">Regen</th>
                            <th className="pb-2 pr-4">Fallback</th>
                            <th className="pb-2 pr-4">Books</th>
                            <th className="pb-2 pr-4">Pages</th>
                            <th className="pb-2 pr-4">Book Sample</th>
                            <th className="pb-2 pr-4">Source</th>
                            <th className="pb-2 pr-4">By</th>
                          </tr>
                        </thead>
                        <tbody>
                          {snapshotHistory.map((s) => (
                            <tr key={s.id} className="border-b border-violet-50 text-violet-800">
                              <td className="py-2 pr-4 text-xs">
                                {s.createdAtMs ? new Date(s.createdAtMs).toLocaleDateString("ja-JP", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—"}
                              </td>
                              <td className="py-2 pr-4">{(s.bookReadableRate ?? 0).toFixed(1)}%</td>
                              <td className="py-2 pr-4">{(s.bookHardFailedRate ?? 0).toFixed(1)}%</td>
                              <td className="py-2 pr-4">{formatMs(Math.round(s.imageP95Ms ?? 0))}</td>
                              <td className="py-2 pr-4">{(s.pageImageFailureRate ?? 0).toFixed(1)}%</td>
                              <td className="py-2 pr-4">{(s.timeoutRate ?? 0).toFixed(1)}%</td>
                              <td className="py-2 pr-4">{(s.regenerationSuccessRate ?? 0).toFixed(1)}%</td>
                              <td className="py-2 pr-4">{(s.fallbackRate ?? 0).toFixed(1)}%</td>
                              <td className="py-2 pr-4">{s.bookCount ?? s.totalBooks ?? "—"}</td>
                              <td className="py-2 pr-4">{s.pageCount ?? s.totalPages ?? "—"}</td>
                              <td className="py-2 pr-4 text-xs">{s.sampleSize ?? s.bookCount ?? "—"}</td>
                              <td className="py-2 pr-4 text-xs">
                                {(() => {
                                  const src = s.source ?? "manual";
                                  const isAuto = src === "scheduled-daily-slo" || src === "scheduled-weekly-slo";
                                  const label = src === "scheduled-daily-slo" ? "daily auto"
                                    : src === "scheduled-weekly-slo" ? "weekly auto"
                                    : src === "admin-book-quality-review" ? "manual"
                                    : src;
                                  return (
                                    <span className={isAuto ? "rounded bg-blue-100 px-1.5 py-0.5 text-blue-700" : "text-violet-600"}>
                                      {label}
                                      {s.sampleUnit && s.sampleUnit !== "books" ? ` [${s.sampleUnit}]` : ""}
                                    </span>
                                  );
                                })()}
                              </td>
                              <td className="py-2 pr-4 text-xs text-violet-500">{s.createdBy ? s.createdBy.slice(0, 8) : "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </>
                  )}
                </div>
              </div>

              {/* Provider Cost Dashboard */}
              <div className="space-y-4 rounded-2xl border border-pink-200 bg-pink-50/30 p-4">
                <h3 className="text-base font-semibold text-pink-900">
                  Provider Cost Comparison (Estimated)
                </h3>
                <ProviderCostDashboard metrics={costMetrics} loading={allPagesLoading} />
              </div>

              {/* Quality Trend Dashboard */}
              <div className="space-y-4 rounded-2xl border border-indigo-200 bg-indigo-50/30 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-base font-semibold text-indigo-900">
                    Quality Trend (Current Sample)
                    <span className="ml-2 text-xs font-normal text-indigo-500">
                      {qualityTrend.totalReviewed}冊レビュー済み
                    </span>
                  </h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={fetchQualitySnapshotHistory}
                    disabled={qualitySnapshotHistoryLoading}
                  >
                    Refresh History
                  </Button>
                </div>

                {qualityTrend.totalReviewed === 0 ? (
                  <p className="text-sm text-indigo-500">レビューデータがありません</p>
                ) : (
                  <>
                    {/* Quality Vitals (Roadmap Targets) */}
                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="rounded-xl border border-indigo-200 bg-white p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-xs font-bold uppercase tracking-wide text-indigo-500">Standard Story Quality</h4>
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${qualityVitals.standard.pass ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                            {qualityVitals.standard.pass ? "TARGET REACHED" : "IN PROGRESS"}
                          </span>
                        </div>
                        <div className="flex items-baseline gap-2">
                          <p className="text-2xl font-bold text-indigo-900">{qualityVitals.standard.avgStory.toFixed(2)}</p>
                          <p className="text-xs text-indigo-400">target: {qualityVitals.standard.target.toFixed(1)}</p>
                        </div>
                      </div>
                      <div className="rounded-xl border border-indigo-200 bg-white p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-xs font-bold uppercase tracking-wide text-indigo-500">Premium Story Quality</h4>
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${qualityVitals.premium.pass ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                            {qualityVitals.premium.pass ? "TARGET REACHED" : "IN PROGRESS"}
                          </span>
                        </div>
                        <div className="flex items-baseline gap-2">
                          <p className="text-2xl font-bold text-indigo-900">{qualityVitals.premium.avgStory.toFixed(2)}</p>
                          <p className="text-xs text-indigo-400">target: {qualityVitals.premium.target.toFixed(1)}</p>
                        </div>
                      </div>
                    </div>

                    {/* Regression Alerts */}
                    {qualityTrend.regressions.length > 0 && (
                      <div className="rounded-lg border border-rose-300 bg-rose-50 p-3">
                        <p className="mb-1 text-xs font-semibold text-rose-800">⚠️ Regression Detected (Recent Sample)</p>
                        {qualityTrend.regressions.map((r) => (
                          <p key={r.axis} className="text-xs text-rose-700">
                            <strong>{r.axis}</strong>: {r.previousAvg.toFixed(2)} → {r.currentAvg.toFixed(2)} (−{r.dropPct}%)
                          </p>
                        ))}
                      </div>
                    )}

                    {/* Global Averages */}
                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                      <div className="rounded-lg border border-indigo-200 bg-white p-2 text-center">
                        <p className="text-[10px] text-indigo-500">Overall</p>
                        <p className="text-lg font-bold text-indigo-800">{qualityTrend.avgOverall.toFixed(2)}</p>
                      </div>
                      <div className="rounded-lg border border-indigo-200 bg-white p-2 text-center">
                        <p className="text-[10px] text-indigo-500">Story</p>
                        <p className="text-lg font-bold text-indigo-800">{qualityTrend.avgStory.toFixed(2)}</p>
                      </div>
                      <div className="rounded-lg border border-indigo-200 bg-white p-2 text-center">
                        <p className="text-[10px] text-indigo-500">Illustration</p>
                        <p className="text-lg font-bold text-indigo-800">{qualityTrend.avgIllustration.toFixed(2)}</p>
                      </div>
                      <div className="rounded-lg border border-indigo-200 bg-white p-2 text-center">
                        <p className="text-[10px] text-indigo-500">Character</p>
                        <p className="text-lg font-bold text-indigo-800">{qualityTrend.avgCharacterConsistency.toFixed(2)}</p>
                      </div>
                      <div className="rounded-lg border border-indigo-200 bg-white p-2 text-center">
                        <p className="text-[10px] text-indigo-500">Personal.</p>
                        <p className="text-lg font-bold text-indigo-800">{qualityTrend.avgPersonalization.toFixed(2)}</p>
                      </div>
                      <div className="rounded-lg border border-indigo-200 bg-white p-2 text-center">
                        <p className="text-[10px] text-indigo-500">Safety</p>
                        <p className="text-lg font-bold text-indigo-800">{qualityTrend.avgSafety.toFixed(2)}</p>
                      </div>
                    </div>

                    {/* Score Distribution */}
                    <div>
                      <p className="mb-1 text-xs font-semibold text-indigo-700">Score Distribution (overall rounded)</p>
                      <div className="flex items-end gap-1">
                        {([1, 2, 3, 4, 5] as const).map((score) => {
                          const count = qualityTrend.scoreDistribution[score];
                          const maxCount = Math.max(...Object.values(qualityTrend.scoreDistribution), 1);
                          const height = Math.max((count / maxCount) * 60, 4);
                          return (
                            <div key={score} className="flex flex-col items-center gap-0.5">
                              <span className="text-[10px] text-indigo-600">{count}</span>
                              <div
                                className="w-8 rounded-t bg-indigo-400"
                                style={{ height: `${height}px` }}
                              />
                              <span className="text-[10px] text-indigo-500">{score}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Weekly Trend Table */}
                    {qualityTrend.buckets.length > 0 && (
                      <div>
                        <p className="mb-1 text-xs font-semibold text-indigo-700">Weekly Trend (Current Sample)</p>
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="border-b border-indigo-200 text-left text-indigo-600">
                                <th className="py-1 pr-3">Week</th>
                                <th className="py-1 pr-3">N</th>
                                <th className="py-1 pr-3">Overall</th>
                                <th className="py-1 pr-3">Story</th>
                                <th className="py-1 pr-3">Illust.</th>
                                <th className="py-1 pr-3">Char.</th>
                                <th className="py-1 pr-3">Person.</th>
                                <th className="py-1 pr-3">Safety</th>
                              </tr>
                            </thead>
                            <tbody>
                              {qualityTrend.buckets.map((bucket) => (
                                <tr key={bucket.startMs} className="border-b border-indigo-50 text-indigo-800">
                                  <td className="py-1 pr-3">{bucket.label}</td>
                                  <td className="py-1 pr-3">{bucket.count}</td>
                                  <td className="py-1 pr-3 font-medium">{bucket.avgOverall.toFixed(2)}</td>
                                  <td className="py-1 pr-3">{bucket.avgStory.toFixed(2)}</td>
                                  <td className="py-1 pr-3">{bucket.avgIllustration.toFixed(2)}</td>
                                  <td className="py-1 pr-3">{bucket.avgCharacterConsistency.toFixed(2)}</td>
                                  <td className="py-1 pr-3">{bucket.avgPersonalization.toFixed(2)}</td>
                                  <td className="py-1 pr-3">{bucket.avgSafety.toFixed(2)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* Human vs. LLM Comparison Dashboard */}
                    {allReviewsLoading ? (
                      <p className="text-xs text-indigo-500 py-4 text-center">レビュー比較データを読み込み中...</p>
                    ) : qualityComparison.matchedPairs > 0 ? (
                      <QualityComparisonDashboard metrics={qualityComparison} />
                    ) : (
                      <p className="text-xs text-indigo-400 py-4 text-center border border-dashed border-indigo-100 rounded-xl">
                        比較可能なペアがありません（Human と LLM 両方のレビューが必要です）
                      </p>
                    )}
                  </>
                )}

                {/* Quality Snapshot History */}
                <div className="mt-6 space-y-4 rounded-xl bg-white p-4">
                  <h4 className="text-sm font-semibold text-indigo-900">Historical Quality Snapshots</h4>
                  {qualitySnapshotHistoryLoading ? (
                    <p className="py-4 text-center text-xs text-indigo-400">読み込み中...</p>
                  ) : qualitySnapshotHistory.length === 0 ? (
                    <p className="py-4 text-center text-xs text-indigo-400">履歴がありません。毎週月曜日に自動保存されます。</p>
                  ) : (
                    <>
                      {/* Regression Alerts from Snapshots */}
                      {(() => {
                        const allRegressions = qualitySnapshotHistory.flatMap(s => s.regressions.map(r => ({ ...r, date: s.label })));
                        if (allRegressions.length === 0) return null;
                        return (
                          <div className="rounded-lg border border-rose-200 bg-rose-50/50 p-3">
                            <p className="mb-2 text-xs font-semibold text-rose-800">⚠️ Historical Regression Alerts</p>
                            <div className="space-y-1">
                              {allRegressions.slice(0, 5).map((r, i) => (
                                <p key={i} className="text-xs text-rose-700">
                                  <span className="font-medium">[{r.date}]</span> <strong>{r.axis}</strong>: {r.previousAvg.toFixed(2)} → {r.currentAvg.toFixed(2)} (−{r.dropPct}%)
                                </p>
                              ))}
                            </div>
                          </div>
                        );
                      })()}

                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="border-b border-indigo-100 text-left text-indigo-600">
                              <th className="py-2 pr-3">Date</th>
                              <th className="py-2 pr-3">N</th>
                              <th className="py-2 pr-3">Overall</th>
                              <th className="py-2 pr-3">Story</th>
                              <th className="py-2 pr-3">Illust.</th>
                              <th className="py-2 pr-3">Char.</th>
                              <th className="py-2 pr-3">Person.</th>
                              <th className="py-2 pr-3">Safety</th>
                              <th className="py-2 pr-3">Alerts</th>
                            </tr>
                          </thead>
                          <tbody>
                            {qualitySnapshotHistory.map((s) => (
                              <tr key={s.id} className="border-b border-indigo-50 text-indigo-800 hover:bg-indigo-50/30">
                                <td className="py-2 pr-3 font-medium">{s.label}</td>
                                <td className="py-2 pr-3">{s.totalReviewed}</td>
                                <td className="py-2 pr-3 font-bold">{s.avgOverall.toFixed(2)}</td>
                                <td className="py-2 pr-3">{s.avgStory.toFixed(2)}</td>
                                <td className="py-2 pr-3">{s.avgIllustration.toFixed(2)}</td>
                                <td className="py-2 pr-3">{s.avgCharacterConsistency.toFixed(2)}</td>
                                <td className="py-2 pr-3">{s.avgPersonalization.toFixed(2)}</td>
                                <td className="py-2 pr-3">{s.avgSafety.toFixed(2)}</td>
                                <td className="py-2 pr-3">
                                  {s.regressions.length > 0 ? (
                                    <span className="rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-bold text-rose-700">
                                      {s.regressions.length} ALERT
                                    </span>
                                  ) : (
                                    <span className="text-emerald-600">✓</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Stale Cleanup Status */}
              <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="font-semibold text-amber-900">🧹 Stale Cleanup Status</h3>
                  <button
                    onClick={fetchStaleCleanupStatus}
                    disabled={staleCleanupLoading}
                    className="rounded border border-amber-300 bg-amber-100 px-2 py-0.5 text-xs text-amber-800 hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {staleCleanupLoading ? "読み込み中…" : "Refresh"}
                  </button>
                </div>
                {staleCleanupLoading ? (
                  <p className="text-sm text-amber-700">読み込み中…</p>
                ) : !staleCleanupStatus ? (
                  <p className="text-sm text-amber-600">クリーンアップ実行履歴がありません</p>
                ) : (
                  <div className="space-y-3">
                    <div className="flex flex-wrap gap-4 text-sm">
                      <span className="text-amber-800">
                        最終実行:{" "}
                        <strong>
                          {staleCleanupStatus.lastRunAtMs
                            ? new Date(staleCleanupStatus.lastRunAtMs).toLocaleString("ja-JP")
                            : "—"}
                        </strong>
                      </span>
                      {staleCleanupStatus.lastSummary && (
                        <>
                          <span className="text-amber-800">
                            修正ページ: <strong>{staleCleanupStatus.lastSummary.updatedPages ?? 0}</strong>
                          </span>
                          <span className="text-amber-800">
                            修正ブック: <strong>{staleCleanupStatus.lastSummary.updatedBooks ?? 0}</strong>
                          </span>
                          <span className="text-amber-800">
                            確認ページ: <strong>{staleCleanupStatus.lastSummary.checkedPages ?? 0}</strong>
                          </span>
                        </>
                      )}
                    </div>

                    {staleCleanupRuns.length > 0 && (
                      <>
                        <h4 className="text-xs font-medium text-amber-700">直近の実行履歴</h4>
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-amber-200 text-left text-xs text-amber-600">
                              <th className="py-1 pr-3">日時</th>
                              <th className="py-1 pr-3">確認P</th>
                              <th className="py-1 pr-3">確認B</th>
                              <th className="py-1 pr-3">修正P</th>
                              <th className="py-1 pr-3">修正B</th>
                              <th className="py-1 pr-3">スキップP</th>
                              <th className="py-1 pr-3">スキップB</th>
                            </tr>
                          </thead>
                          <tbody>
                            {staleCleanupRuns.map((r) => (
                              <tr key={r.runKey} className="border-b border-amber-100 text-amber-800">
                                <td className="py-1 pr-3 text-xs">
                                  {r.createdAtMs
                                    ? new Date(r.createdAtMs).toLocaleString("ja-JP", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })
                                    : "—"}
                                </td>
                                <td className="py-1 pr-3">{r.checkedPages ?? 0}</td>
                                <td className="py-1 pr-3">{r.checkedBooks ?? 0}</td>
                                <td className="py-1 pr-3 font-medium">{r.updatedPages ?? 0}</td>
                                <td className="py-1 pr-3 font-medium">{r.updatedBooks ?? 0}</td>
                                <td className="py-1 pr-3 text-amber-500">{r.skippedPages ?? 0}</td>
                                <td className="py-1 pr-3 text-amber-500">{r.skippedBooks ?? 0}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </>
                    )}
                  </div>
                )}
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                <div className="space-y-2">
                  <Label htmlFor="statusFilter">status</Label>
                  <select
                    id="statusFilter"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as ReviewStatusFilter)}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="all">all</option>
                    <option value="completed">completed</option>
                    <option value="partial_completed">partial_completed</option>
                    <option value="failed">failed</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="planFilter">productPlan</Label>
                  <select
                    id="planFilter"
                    value={planFilter}
                    onChange={(e) => setPlanFilter(e.target.value as ReviewPlanFilter)}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                  >
                    {PRODUCT_PLAN_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="qualityFilter">storyQualityStatus</Label>
                  <select
                    id="qualityFilter"
                    value={qualityFilter}
                    onChange={(e) => setQualityFilter(e.target.value as ReviewQualityFilter)}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="all">all</option>
                    <option value="ok">ok</option>
                    <option value="warning">warning</option>
                    <option value="failed">failed</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="modelFilter">imageModelProfile</Label>
                  <select
                    id="modelFilter"
                    value={modelFilter}
                    onChange={(e) => setModelFilter(e.target.value as ReviewModelFilter)}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                  >
                    {MODEL_PROFILE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sourceFilter">source</Label>
                  <select
                    id="sourceFilter"
                    value={sourceFilter}
                    onChange={(e) => setSourceFilter(e.target.value as ReviewSourceFilter)}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="all">all</option>
                    <option value="fixed_template">fixed_template</option>
                    <option value="smoke">smoke</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="searchText">bookId / title / templateId / runId / userId / childId</Label>
                  <Input
                    id="searchText"
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    placeholder="検索"
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="qualityReviewFilter">qualityReviewStatus</Label>
                  <select
                    id="qualityReviewFilter"
                    value={qualityReviewFilter}
                    onChange={(e) => setQualityReviewFilter(e.target.value as ReviewQualityReviewFilter)}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="all">all ({books.length})</option>
                    <option value="not_reviewed">not_reviewed ({qualityReviewSummary.not_reviewed})</option>
                    <option value="human_reviewed">human_reviewed ({qualityReviewSummary.human_reviewed})</option>
                    <option value="llm_reviewed">llm_reviewed ({qualityReviewSummary.llm_reviewed})</option>
                    <option value="needs_fix">needs_fix ({qualityReviewSummary.needs_fix})</option>
                    <option value="approved">approved ({qualityReviewSummary.approved})</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="qualitySortOrder">quality sort</Label>
                  <select
                    id="qualitySortOrder"
                    value={qualitySortOrder}
                    onChange={(e) => setQualitySortOrder(e.target.value as ReviewQualitySortOrder)}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="default">default (current order)</option>
                    <option value="low_first">low quality first</option>
                    <option value="high_first">high quality first</option>
                  </select>
                </div>
                <div className="flex items-end gap-4 text-xs text-violet-700">
                  <span>not reviewed: <strong>{qualityReviewSummary.not_reviewed}</strong></span>
                  <span className="font-medium text-rose-600">needs fix: <strong>{qualityReviewSummary.needs_fix}</strong></span>
                  <span>reviewed: <strong>{qualityReviewSummary.human_reviewed + qualityReviewSummary.llm_reviewed}</strong></span>
                  <span className="text-emerald-700">approved: <strong>{qualityReviewSummary.approved}</strong></span>
                </div>
              </div>

              {/* Batch Review Workflow */}
              <div className="flex flex-wrap items-center gap-3 rounded-lg border border-violet-200 bg-violet-50 px-4 py-2">
                <span className="text-xs font-semibold text-violet-800">Batch:</span>
                <button
                  type="button"
                  onClick={handleSelectNextUnreviewed}
                  className="rounded border border-violet-300 bg-white px-3 py-1 text-xs font-medium text-violet-700 hover:bg-violet-100"
                >
                  Next Unreviewed
                </button>
                <button
                  type="button"
                  onClick={handleSelectNextNeedsFix}
                  className="rounded border border-rose-300 bg-white px-3 py-1 text-xs font-medium text-rose-700 hover:bg-rose-50"
                >
                  Next Needs Fix
                </button>
                <button
                  type="button"
                  onClick={handleSelectLowestScore}
                  className="rounded border border-amber-300 bg-white px-3 py-1 text-xs font-medium text-amber-700 hover:bg-amber-50"
                >
                  Lowest Score
                </button>
                {batchReviewMessage && (
                  <span className="text-xs text-violet-600">{batchReviewMessage}</span>
                )}
              </div>

              <div className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
                <Card className="h-fit">
                  <CardContent className="space-y-4 p-4">
                    <div className="flex items-center justify-between">
                      <h2 className="text-lg font-semibold text-purple-900">Books</h2>
                      <span className="text-xs text-violet-500">{filteredBooks.length}件</span>
                    </div>
                    {booksLoading ? (
                      <p className="text-sm text-violet-500">読み込み中...</p>
                    ) : booksError ? (
                      <p className="text-sm text-rose-600">{booksError}</p>
                    ) : filteredBooks.length === 0 ? (
                      <p className="text-sm text-violet-500">該当する Book がありません。</p>
                    ) : (
                      <div className="max-h-[900px] space-y-3 overflow-y-auto pr-1">
                        {filteredBooks.map((book) => {
                          const qualityStatus = getStoryQualityStatus(book);
                          const warningCount = getStoryQualityWarnings(book.storyQualityReport).length;
                          const issueCount = book.storyQualityReport?.issues.length ?? 0;
                          const isSelected = book.id === selectedBookId;
                          return (
                            <button
                              key={book.id}
                              type="button"
                              onClick={() => { setSelectedBookId(book.id); setActiveIntent(null); setIntentMessage(null); }}
                              className={`w-full rounded-2xl border p-4 text-left transition ${
                                isSelected
                                  ? "border-purple-400 bg-purple-50"
                                  : "border-violet-100 bg-white hover:border-violet-300"
                              }`}
                            >
                              <div className="flex flex-wrap items-start justify-between gap-2">
                                <div>
                                  <p className="font-semibold text-purple-950">{book.title || "Untitled"}</p>
                                  <p className="text-xs text-violet-500">{book.id}</p>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  <span className={`rounded-full px-3 py-1 text-xs font-medium ${getStatusBadgeClass(book.status)}`}>
                                    {book.status}
                                  </span>
                                  <span className={`rounded-full px-3 py-1 text-xs font-medium ${getQualityBadgeClass(qualityStatus)}`}>
                                    {qualityStatus}
                                  </span>
                                  {book.smokeTestMetadata?.isSmokeTest ? (
                                    <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-medium text-sky-700">
                                      smoke
                                    </span>
                                  ) : null}
                                </div>
                              </div>
                              <div className="mt-3 grid gap-2 text-xs text-violet-700 sm:grid-cols-2">
                                <p>productPlan: {book.productPlan ?? "—"}</p>
                                <p>creationMode: {book.creationMode ?? "—"}</p>
                                  <p>templateId: {book.templateId ?? "—"}</p>
                                  <p>smokeRunId: {book.smokeTestMetadata?.runId ?? "—"}</p>
                                <p>imageTier: {book.imageQualityTier ?? "—"}</p>
                                <p>modelProfile: {resolveEffectiveImageModelProfile(book)}</p>
                                <p>storyModel: {book.storyModel ?? "—"}</p>
                                <p>rewrite: {book.storyTextRewriteUsed ? `yes (${book.storyTextRewriteAttempts ?? 0})` : "no"}</p>
                                <p>quality ok: {typeof book.storyQualityReport?.ok === "boolean" ? String(book.storyQualityReport.ok) : "—"}</p>
                                <p>issues: {issueCount}</p>
                                <p>warnings: {warningCount}</p>
                                <p>reliability: {book.generationReliabilityStatus ?? "—"}</p>
                                <p>Q score: {formatQualityScore(book.overallQualityScore)}{book.qualityReviewStatus ? ` (${getQualityReviewStatusLabel(book.qualityReviewStatus)})` : ""} <QualityRecommendationBadge book={book} /></p>
                                <p>img {book.imageSuccessCount ?? "?"}/{book.totalImageCount ?? "?"} avgTime:{formatMs(book.averageImageDurationMs)}</p>
                                {book.status === "partial_completed" && (book.imageFailureCount ?? 0) > 0 && (
                                  <p className="font-medium text-rose-600">failed pages: {book.imageFailureCount} ({book.failedPageNumbers?.join(", ") ?? "?"})</p>
                                )}
                                {book.recoveredFromPartialCompleted && (
                                  <p className="font-medium text-emerald-600">recovered ✓</p>
                                )}
                                <p>createdAt: {formatBookTimestamp(book, "createdAt")}</p>
                                <p>userId: {book.userId}</p>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
                {booksError && /Missing or insufficient permissions/i.test(booksError) ? (
                  <div className="mt-3 flex flex-wrap items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                    <p>
                      Firestore rules が管理者読み取りを許可していない、または admin claim がID tokenに反映されていない可能性があります。
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={async () => {
                        await refreshAdminClaim();
                      }}
                    >
                      admin claim を再確認
                    </Button>
                  </div>
                ) : null}

                <div className="space-y-6">
                  {!selectedBook ? (
                    <Card>
                      <CardContent className="p-6 text-sm text-violet-500">
                        Book を選ぶと詳細が表示されます。
                      </CardContent>
                    </Card>
                  ) : (
                    <>
                      <Card className={sectionHighlights.bookDetail ? "ring-2 ring-amber-300" : ""}>
                        <CardContent className="space-y-5 p-6">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <h2 className="text-xl font-semibold text-purple-950">{selectedBook.title}</h2>
                              <p className="mt-1 text-xs text-violet-500">{selectedBook.id}</p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <span className={`rounded-full px-3 py-1 text-xs font-medium ${getStatusBadgeClass(selectedBook.status)}`}>
                                {selectedBook.status}
                              </span>
                              <span className={`rounded-full px-3 py-1 text-xs font-medium ${getQualityBadgeClass(getStoryQualityStatus(selectedBook))}`}>
                                {getStoryQualityStatus(selectedBook)}
                              </span>
                            </div>
                          </div>

                          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 text-sm text-violet-800">
                            <p><span className="font-medium text-purple-900">storyTitleCandidate:</span> {selectedBook.storyTitleCandidate ?? "—"}</p>
                            <p><span className="font-medium text-purple-900">progress:</span> {selectedBook.progress}</p>
                            <p><span className="font-medium text-purple-900">createdAt:</span> {formatBookTimestamp(selectedBook, "createdAt")}</p>
                            <p><span className="font-medium text-purple-900">updatedAt:</span> {formatBookTimestamp(selectedBook, "updatedAt")}</p>
                            <p><span className="font-medium text-purple-900">generationStartedAt:</span> {formatBookTimestamp(selectedBook, "generationStartedAt")}</p>
                            <p><span className="font-medium text-purple-900">completedAt:</span> {formatBookTimestamp(selectedBook, "completedAt")}</p>
                            <p><span className="font-medium text-purple-900">failedAt:</span> {formatBookTimestamp(selectedBook, "failedAt")}</p>
                            <p><span className="font-medium text-purple-900">storyGoal:</span> {selectedBook.storyGoal ?? "—"}</p>
                            <p><span className="font-medium text-purple-900">mainQuestObject:</span> {selectedBook.mainQuestObject ?? "—"}</p>
                            <p><span className="font-medium text-purple-900">forbiddenQuestObjects:</span> {selectedBook.forbiddenQuestObjects?.join(", ") ?? "—"}</p>
                            <p><span className="font-medium text-purple-900">titleSpreadText:</span> {selectedBook.titleSpreadText ?? "—"}</p>
                            <p><span className="font-medium text-purple-900">openingNarration:</span> {selectedBook.openingNarration ?? "—"}</p>
                            <p><span className="font-medium text-purple-900">coverImagePrompt:</span> {selectedBook.coverImagePrompt ?? "—"}</p>
                            <p><span className="font-medium text-purple-900">coverStatus:</span> {selectedBook.coverStatus ?? "—"}</p>
                            <p><span className="font-medium text-purple-900">coverImageDurationMs:</span> {selectedBook.coverImageDurationMs ?? "—"}</p>
                            <p><span className="font-medium text-purple-900">coverImageModelProfile:</span> {selectedBook.coverImageModelProfile ?? "—"}</p>
                            <p><span className="font-medium text-purple-900">coverImageFallbackUsed:</span> {typeof selectedBook.coverImageFallbackUsed === "boolean" ? String(selectedBook.coverImageFallbackUsed) : "—"}</p>
                            <p><span className="font-medium text-purple-900">coverFailureReason:</span> {selectedBook.coverFailureReason ?? "—"}</p>
                            <p><span className="font-medium text-purple-900">hasCoverPage:</span> {typeof selectedBook.hasCoverPage === "boolean" ? String(selectedBook.hasCoverPage) : "—"}</p>
                            <p><span className="font-medium text-purple-900">readingStructureVersion:</span> {selectedBook.readingStructureVersion ?? "—"}</p>
                            {selectedBook.coverImagePrompt && (
                              <div className="mt-2 flex items-center gap-3">
                                <button
                                  type="button"
                                  onClick={handleRegenerateCover}
                                  disabled={regeneratingCover}
                                  className="rounded-lg border border-violet-300 bg-white px-3 py-1.5 text-xs font-medium text-violet-700 transition hover:bg-violet-50 disabled:opacity-50"
                                >
                                  {regeneratingCover ? "カバー再生成中..." : "カバー画像を再生成"}
                                </button>
                                {coverRegenMessage && (
                                  <span className={`text-xs ${coverRegenMessage.startsWith("失敗") ? "text-rose-600" : "text-emerald-600"}`}>
                                    {coverRegenMessage}
                                  </span>
                                )}
                              </div>
                            )}
                            <p><span className="font-medium text-purple-900">templateId:</span> {selectedBook.templateId ?? "—"}</p>
                            <p><span className="font-medium text-purple-900">theme:</span> {selectedBook.theme}</p>
                            <p><span className="font-medium text-purple-900">categoryGroupId:</span> {selectedBook.categoryGroupId ?? "—"}</p>
                            <p><span className="font-medium text-purple-900">storyCostLevel:</span> {selectedBook.storyCostLevel ?? "—"}</p>
                            <p><span className="font-medium text-purple-900">priceTier:</span> {selectedBook.priceTier ?? "—"}</p>
                            <p><span className="font-medium text-purple-900">storyModel:</span> {selectedBook.storyModel ?? "—"}</p>
                            <p><span className="font-medium text-purple-900">storyModelFallbackUsed:</span> {selectedBook.storyModelFallbackUsed ? "true" : "false"}</p>
                            <p><span className="font-medium text-purple-900">storyGenerationAttempts:</span> {selectedBook.storyGenerationAttempts ?? "—"}</p>
                            <p><span className="font-medium text-purple-900">storyTextRewriteUsed:</span> {selectedBook.storyTextRewriteUsed ? "true" : "false"}</p>
                            <p><span className="font-medium text-purple-900">storyTextRewriteModel:</span> {selectedBook.storyTextRewriteModel ?? "—"}</p>
                            <p><span className="font-medium text-purple-900">storyTextRewriteAttempts:</span> {selectedBook.storyTextRewriteAttempts ?? "—"}</p>
                            <p><span className="font-medium text-purple-900">imageQualityTier:</span> {selectedBook.imageQualityTier ?? "—"}</p>
                            <p><span className="font-medium text-purple-900">imageModelProfile:</span> {selectedBookEffectiveImageModelProfile}</p>
                            <p><span className="font-medium text-purple-900">characterConsistencyMode:</span> {selectedBook.characterConsistencyMode ?? "—"}</p>
                            <p><span className="font-medium text-purple-900">generationMode:</span> {selectedBook.generationMode ?? "—"}</p>
                            <p><span className="font-medium text-purple-900">generationReliabilityStatus:</span> {selectedBook.generationReliabilityStatus ?? "—"}</p>
                            <p><span className="font-medium text-purple-900">overallQualityScore:</span> {formatQualityScore(selectedBook.overallQualityScore)}</p>
                            <p><span className="font-medium text-purple-900">qualityReviewStatus:</span>{" "}
                              <span className={`inline-block rounded-full px-2 py-0.5 text-xs ${getQualityReviewStatusBadgeClass(selectedBook.qualityReviewStatus)}`}>
                                {getQualityReviewStatusLabel(selectedBook.qualityReviewStatus)}
                              </span>
                            </p>
                            <p><span className="font-medium text-purple-900">storyQualityScore:</span> {formatQualityScore(selectedBook.storyQualityScore)}</p>
                            <p><span className="font-medium text-purple-900">illustrationQualityScore:</span> {formatQualityScore(selectedBook.illustrationQualityScore)}</p>
                            <p><span className="font-medium text-purple-900">characterConsistencyScore:</span> {formatQualityScore(selectedBook.characterConsistencyScore)}</p>
                            <p><span className="font-medium text-purple-900">personalizationScore:</span> {formatQualityScore(selectedBook.personalizationScore)}</p>
                            <p><span className="font-medium text-purple-900">safetyScore:</span> {formatQualityScore(selectedBook.safetyScore)}</p>
                            <p><span className="font-medium text-purple-900">imageSuccess/Total:</span> {selectedBook.imageSuccessCount ?? "—"} / {selectedBook.totalImageCount ?? "—"}
                              {selectedBook.status !== "generating" && (selectedBook.totalImageCount === 0 || selectedBook.totalImageCount == null) && (
                                <span className="ml-1 text-xs font-semibold text-red-600">⚠ ページ0件</span>
                              )}
                            </p>
                            <p><span className="font-medium text-purple-900">imageFailureCount:</span> {selectedBook.imageFailureCount ?? "—"}</p>
                            <p><span className="font-medium text-purple-900">failedPageNumbers:</span> {selectedBook.failedPageNumbers?.join(", ") ?? "—"}</p>
                            <p><span className="font-medium text-purple-900">recoveredFromPartialCompleted:</span> {selectedBook.recoveredFromPartialCompleted ? "true" : "—"}</p>
                            {selectedBook.recoveredAtMs && (
                              <p><span className="font-medium text-purple-900">recoveredAt:</span> {formatTimestamp(undefined, selectedBook.recoveredAtMs)}</p>
                            )}
                            {selectedBook.lastCompletionCheckedAtMs && (
                              <p><span className="font-medium text-purple-900">lastCompletionCheckedAt:</span> {formatTimestamp(undefined, selectedBook.lastCompletionCheckedAtMs)}</p>
                            )}
                            {selectedBook.status === "partial_completed" && (
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="mt-1"
                                onClick={async () => {
                                  try {
                                    const checkCompletion = httpsCallable(functions, "checkBookCompletion");
                                    const result = await checkCompletion({ bookId: selectedBook.id });
                                    const data = result.data as { bookStatus: string; recovered: boolean };
                                    if (data.recovered) {
                                      setCopyMessage("復旧しました: completed");
                                    } else {
                                      setCopyMessage(`確認完了: ${data.bookStatus}`);
                                    }
                                    window.setTimeout(() => setCopyMessage(null), 3000);
                                  } catch (err) {
                                    const msg = err instanceof Error ? err.message : "確認に失敗";
                                    setCopyMessage(msg);
                                    window.setTimeout(() => setCopyMessage(null), 3000);
                                  }
                                }}
                              >
                                Check completion
                              </Button>
                            )}
                            <p><span className="font-medium text-purple-900">generationDurationMs:</span> {formatMs(selectedBook.generationDurationMs)}</p>
                            <p><span className="font-medium text-purple-900">avgImageDurationMs:</span> {formatMs(selectedBook.averageImageDurationMs)}</p>
                            <p><span className="font-medium text-purple-900">maxImageDurationMs:</span> {formatMs(selectedBook.maxImageDurationMs)}</p>
                          </div>

                          <div className="grid gap-4 xl:grid-cols-2">
                            <Card className="border-violet-100">
                              <CardContent className="space-y-3 p-4">
                                <h3 className="font-semibold text-purple-900">storyQualityReport</h3>
                                <div className="grid gap-2 text-sm text-violet-800 md:grid-cols-2">
                                  <p>ok: {selectedBook.storyQualityReport?.ok ? "true" : "false"}</p>
                                  <p>qualityStatus: {getStoryQualityStatus(selectedBook)}</p>
                                  <p>pageCount: {selectedBook.storyQualityReport?.summary.pageCount ?? "—"}</p>
                                  <p>averageCharsPerPage: {selectedBook.storyQualityReport?.summary.averageCharsPerPage ?? "—"}</p>
                                  <p>minCharsPerPage: {selectedBook.storyQualityReport?.summary.minCharsPerPage ?? "—"}</p>
                                  <p>averageSentencesPerPage: {selectedBook.storyQualityReport?.summary.averageSentencesPerPage ?? "—"}</p>
                                  <p>minSentencesPerPage: {selectedBook.storyQualityReport?.summary.minSentencesPerPage ?? "—"}</p>
                                  <p>warningCount: {getStoryQualityWarnings(selectedBook.storyQualityReport).length}</p>
                                </div>
                                <div className="overflow-x-auto">
                                  <table className="min-w-full text-left text-xs text-violet-800">
                                    <thead className="text-violet-500">
                                      <tr>
                                        <th className="pr-3 py-2">severity</th>
                                        <th className="pr-3 py-2">code</th>
                                        <th className="pr-3 py-2">page</th>
                                        <th className="pr-3 py-2">message</th>
                                        <th className="pr-3 py-2">actual</th>
                                        <th className="py-2">expected</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {selectedBook.storyQualityReport?.issues.length ? (
                                        selectedBook.storyQualityReport.issues.map((issue, index) => (
                                          <tr key={`${issue.code}-${index}`} className="border-t border-violet-100">
                                            <td className="pr-3 py-2">
                                              <span
                                                className={`rounded-full px-2 py-1 text-[11px] font-medium ${
                                                  issue.severity === "error"
                                                    ? "bg-rose-100 text-rose-700"
                                                    : "bg-amber-100 text-amber-700"
                                                }`}
                                              >
                                                {issue.severity}
                                              </span>
                                            </td>
                                            <td className="pr-3 py-2 font-medium">{issue.code}</td>
                                            <td className="pr-3 py-2">{typeof issue.pageIndex === "number" ? issue.pageIndex + 1 : "—"}</td>
                                            <td className="pr-3 py-2">{issue.message}</td>
                                            <td className="pr-3 py-2">{issue.actual ?? "—"}</td>
                                            <td className="py-2">{issue.expected ?? "—"}</td>
                                          </tr>
                                        ))
                                      ) : (
                                        <tr>
                                          <td className="py-2 text-violet-500" colSpan={6}>
                                            issues はありません。
                                          </td>
                                        </tr>
                                      )}
                                    </tbody>
                                  </table>
                                </div>
                              </CardContent>
                            </Card>

                            <Card id="input-and-profile" className={`border-violet-100${sectionHighlights.inputAndProfile ? " ring-2 ring-amber-300" : ""}`}>
                              <CardContent className="space-y-3 p-4">
                                <h3 className="font-semibold text-purple-900">input / childProfileSnapshot</h3>
                                <details className="rounded-xl border border-violet-100 p-3">
                                  <summary className="cursor-pointer text-sm font-medium text-purple-900">input</summary>
                                  <pre className="mt-3 overflow-x-auto whitespace-pre-wrap text-xs text-violet-800">
                                    {compactJson(selectedBook.input)}
                                  </pre>
                                </details>
                                <details className="rounded-xl border border-violet-100 p-3">
                                  <summary className="cursor-pointer text-sm font-medium text-purple-900">childProfileSnapshot summary</summary>
                                  <pre className="mt-3 overflow-x-auto whitespace-pre-wrap text-xs text-violet-800">
                                    {compactJson(selectedBook.childProfileSnapshot ?? null)}
                                  </pre>
                                </details>
                                <details id="story-text" className={`rounded-xl border p-3${sectionHighlights.storyText ? " border-amber-300 bg-amber-50/50" : " border-violet-100"}`}>
                                  <summary className="cursor-pointer text-sm font-medium text-purple-900">generatedTextPreview</summary>
                                  <pre className="mt-3 overflow-x-auto whitespace-pre-wrap text-xs text-violet-800">
                                    {compactJson(selectedBook.generatedTextPreview ?? [])}
                                  </pre>
                                </details>
                              </CardContent>
                            </Card>
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardContent className="space-y-4 p-6">
                          <h3 className="text-lg font-semibold text-purple-900">storyCast</h3>
                          {selectedBook.storyCast?.length ? (
                            <div className="grid gap-4 xl:grid-cols-2">
                              {selectedBook.storyCast.map((character) => (
                                <StoryCastCard key={character.characterId} character={character} />
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-violet-500">storyCast は保存されていません。</p>
                          )}
                        </CardContent>
                      </Card>

                      <Card>
                        <CardContent className="space-y-4 p-6">
                          <h3 className="text-lg font-semibold text-purple-900">ユーザーフィードバック</h3>
                          {feedbackLoading ? (
                            <p className="text-sm text-violet-500">フィードバックを読み込み中...</p>
                          ) : feedbackError ? (
                            <p className="text-sm text-rose-600">{feedbackError}</p>
                          ) : feedbacks.length === 0 ? (
                            <p className="text-sm text-violet-500">まだフィードバックはありません。</p>
                          ) : (
                            <div className="space-y-4">
                              {feedbacks.map((feedback) => (
                                <Card key={feedback.id} className="border-violet-100">
                                  <CardContent className="space-y-3 p-4">
                                    <div className="flex flex-wrap items-start justify-between gap-3">
                                      <div>
                                        <p className="font-semibold text-purple-950">{feedback.userId}</p>
                                        <p className="text-xs text-violet-500">{feedback.id}</p>
                                      </div>
                                      <div className="text-right text-xs text-violet-600">
                                        <p>createdAt: {formatTimestamp(feedback.createdAt, feedback.createdAtMs)}</p>
                                        <p>updatedAt: {formatTimestamp(feedback.updatedAt, feedback.updatedAtMs)}</p>
                                      </div>
                                    </div>
                                    <div className="flex flex-wrap gap-2 text-xs">
                                      <span className="rounded-full bg-violet-100 px-3 py-1 text-violet-700">
                                        overall: {feedback.rating}
                                      </span>
                                      <span className="rounded-full bg-pink-50 px-3 py-1 text-pink-700">
                                        story {feedback.storyRating}
                                      </span>
                                      <span className="rounded-full bg-pink-50 px-3 py-1 text-pink-700">
                                        image {feedback.illustrationRating}
                                      </span>
                                      <span className="rounded-full bg-pink-50 px-3 py-1 text-pink-700">
                                        consistency {feedback.consistencyRating}
                                      </span>
                                      <span className="rounded-full bg-pink-50 px-3 py-1 text-pink-700">
                                        likeness {feedback.childLikenessRating}
                                      </span>
                                      <span className="rounded-full bg-pink-50 px-3 py-1 text-pink-700">
                                        create-again {feedback.wantToCreateAgain}
                                      </span>
                                    </div>
                                    <div className="grid gap-2 text-xs text-violet-700 md:grid-cols-3">
                                      <p>productPlan: {feedback.productPlan ?? "—"}</p>
                                      <p>imageModelProfile: {feedback.imageModelProfile ?? "—"}</p>
                                      <p>storyModel: {feedback.storyModel ?? "—"}</p>
                                    </div>
                                    <div className="rounded-2xl bg-violet-50 p-4 text-sm text-violet-900">
                                      {feedback.comment?.trim() ? feedback.comment : "コメントなし"}
                                    </div>
                                  </CardContent>
                                </Card>
                              ))}
                            </div>
                          )}
                        </CardContent>
                      </Card>

                      <Card id="pages" className={sectionHighlights.pages ? "ring-2 ring-amber-300" : ""}>
                        <CardContent className="space-y-4 p-6">
                          <div className="flex items-center justify-between gap-3">
                            <h3 className="text-lg font-semibold text-purple-900">pages</h3>
                            {copyMessage ? <span className="text-xs text-violet-500">{copyMessage}</span> : null}
                          </div>
                          {pagesLoading ? (
                            <p className="text-sm text-violet-500">ページを読み込み中...</p>
                          ) : pagesError ? (
                            <p className="text-sm text-rose-600">{pagesError}</p>
                          ) : pages.length === 0 ? (
                            <p className="text-sm text-violet-500">pages subcollection がまだありません。</p>
                          ) : (
                            <div className="space-y-4">
                              {pages.map((page) => {
                                const highlightLevel = getPageHighlightLevel(activeIntent, page);
                                const pageHighlightClass =
                                  highlightLevel === "strong"
                                    ? "border-amber-400 bg-amber-50 ring-1 ring-amber-300"
                                    : highlightLevel === "subtle"
                                      ? "border-amber-200 bg-amber-50/40"
                                      : "border-violet-100";
                                return (
                                <Card key={page.id} className={pageHighlightClass}>
                                  <CardContent className="space-y-4 p-4">
                                    <div className="flex flex-wrap items-center justify-between gap-3">
                                      <div>
                                        <p className="font-semibold text-purple-950">page {page.pageNumber + 1}</p>
                                        <p className="text-xs text-violet-500">{page.id}</p>
                                      </div>
                                      <div className="flex flex-wrap items-center gap-2">
                                        <span className={`rounded-full px-3 py-1 text-xs font-medium ${getStatusBadgeClass(page.status)}`}>
                                          {page.status}
                                        </span>
                                        {page.pageVisualRole ? (
                                          <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-medium text-violet-700">
                                            {page.pageVisualRole}
                                          </span>
                                        ) : null}
                                        <Button
                                          type="button"
                                          size="sm"
                                          variant="outline"
                                          onClick={() => handleRegeneratePage(page)}
                                          disabled={regeneratingPageIds.has(page.id)}
                                        >
                                          {regeneratingPageIds.has(page.id) ? "再生成中..." : "再生成"}
                                        </Button>
                                        {regenerationMessages[page.id] ? (
                                          <span className={`text-xs ${regenerationMessages[page.id].startsWith("失敗") ? "text-rose-600" : "text-emerald-600"}`}>
                                            {regenerationMessages[page.id]}
                                          </span>
                                        ) : null}
                                      </div>
                                    </div>
                                    <div className="grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)]">
                                      <div className="space-y-3">
                                        {page.imageUrl ? (
                                          // eslint-disable-next-line @next/next/no-img-element
                                          <img
                                            src={page.imageUrl}
                                            alt={`page ${page.pageNumber + 1}`}
                                            className="aspect-[4/3] w-full rounded-2xl border border-violet-100 object-cover"
                                          />
                                        ) : (
                                          <div className="flex aspect-[4/3] items-center justify-center rounded-2xl border border-dashed border-violet-200 bg-violet-50 text-sm text-violet-500">
                                            no image
                                          </div>
                                        )}
                                        <div className="grid gap-2 text-xs text-violet-700">
                                          <p>textCharCount: {page.textCharCount ?? "—"}</p>
                                          <p>textSentenceCount: {page.textSentenceCount ?? "—"}</p>
                                          <p>imageModel: {page.imageModel ?? "—"}</p>
                                          <p>imageModelProfile: {page.imageModelProfile ?? "—"}</p>
                                          <p>inputImageUrlsCount: {page.inputImageUrlsCount ?? "—"}</p>
                                          <p>inputReferenceCount: {page.inputReferenceCount ?? "—"}</p>
                                          <p>usedCharacterReference: {page.usedCharacterReference ? "true" : "false"}</p>
                                          <p>imagePurpose: {page.imagePurpose ?? "—"}</p>
                                          <p>focusCharacterId: {page.focusCharacterId ?? "—"}</p>
                                          <p>appearingCharacterIds: {page.appearingCharacterIds?.join(", ") ?? "—"}</p>
                                          <p className="col-span-full border-t border-violet-100 pt-2 font-medium text-purple-900">生成メトリクス</p>
                                          <p>imageDurationMs: <span className={(page.imageDurationMs ?? 0) > 120_000 ? "font-semibold text-rose-600" : ""}>{formatMs(page.imageDurationMs)}</span></p>
                                          <p>imageAttemptCount: {page.imageAttemptCount ?? "—"}</p>
                                          <p>imageTimeoutCount: {page.imageTimeoutCount ?? "—"}</p>
                                          <p>imageFallbackUsed: {page.imageFallbackUsed ? "true" : "false"}</p>
                                          <p>fallbackFromProfile: {page.fallbackFromModelProfile ?? "—"}</p>
                                          <p>imageFailureReason: {page.imageFailureReason ?? "—"}</p>
                                          <p>replicateModel: {page.replicateModel ?? "—"}</p>
                                          {(page.regenerationAttemptCount ?? 0) > 0 ? (
                                            <>
                                              <p className="col-span-full border-t border-violet-100 pt-2 font-medium text-purple-900">再生成履歴</p>
                                              <p>regenerationAttemptCount: {page.regenerationAttemptCount}</p>
                                              <p>triggeredBy: {page.regenerationTriggeredBy ?? "—"}</p>
                                              <p>imageRegeneratedAtMs: {page.imageRegeneratedAtMs ? formatTimestamp(undefined, page.imageRegeneratedAtMs) : "—"}</p>
                                              <p>lastRegenerationSucceeded: {page.lastRegenerationSucceeded === true ? "true" : page.lastRegenerationSucceeded === false ? "false" : "—"}</p>
                                              <Button
                                                type="button"
                                                size="sm"
                                                variant="ghost"
                                                className="mt-1 h-6 px-2 text-xs"
                                                disabled={regenHistoryLoading}
                                                onClick={async () => {
                                                  if (regenHistoryPageId === page.id) {
                                                    setRegenHistoryPageId(null);
                                                    setRegenHistory([]);
                                                    return;
                                                  }
                                                  setRegenHistoryLoading(true);
                                                  setRegenHistoryPageId(page.id);
                                                  try {
                                                    const snap = await getDocs(
                                                      query(
                                                        collection(db, "books", selectedBookId!, "pages", page.id, "regenerationHistory"),
                                                        orderBy("attemptedAtMs", "desc"),
                                                        limit(10),
                                                      ),
                                                    );
                                                    setRegenHistory(snap.docs.map((d) => ({ id: d.id, ...d.data() } as RegenerationHistoryEntry)));
                                                  } catch (err) {
                                                    console.error("Failed to load regen history:", err);
                                                    setRegenHistory([]);
                                                  } finally {
                                                    setRegenHistoryLoading(false);
                                                  }
                                                }}
                                              >
                                                {regenHistoryLoading && regenHistoryPageId === page.id ? "読込中..." : regenHistoryPageId === page.id ? "hide history" : "show history"}
                                              </Button>
                                              {regenHistoryPageId === page.id && regenHistory.length > 0 && (
                                                <div className="col-span-full mt-1 space-y-1">
                                                  {regenHistory.map((h, i) => (
                                                    <div key={h.id ?? i} className="rounded border border-violet-100 bg-violet-50/50 px-2 py-1 text-xs">
                                                      <span className={h.success ? "text-emerald-600" : "text-rose-600"}>{h.success ? "✓" : "✗"}</span>{" "}
                                                      <span>{h.attemptedAtMs ? new Date(h.attemptedAtMs).toLocaleString("ja-JP") : "—"}</span>{" "}
                                                      <span className="text-violet-500">{h.triggeredBy ?? "—"}</span>{" "}
                                                      <span>{h.beforeStatus} → {h.afterStatus}</span>{" "}
                                                      <span>{formatMs(h.durationMs)}</span>{" "}
                                                      {h.imageModelProfile && <span className="text-violet-500">{h.imageModelProfile}</span>}
                                                      {h.fallbackUsed && <span className="ml-1 text-amber-600">fallback</span>}
                                                      {h.failureReason && <span className="ml-1 text-rose-500">{h.failureReason}</span>}
                                                    </div>
                                                  ))}
                                                </div>
                                              )}
                                              {regenHistoryPageId === page.id && regenHistory.length === 0 && !regenHistoryLoading && (
                                                <p className="text-xs text-violet-400">履歴データなし（基盤追加前の再生成）</p>
                                              )}
                                            </>
                                          ) : null}
                                        </div>
                                      </div>
                                      <div className="space-y-4">
                                        <div>
                                          <p className="mb-2 text-sm font-medium text-purple-900">text</p>
                                          <div className="rounded-2xl bg-violet-50 p-4 text-sm leading-relaxed text-violet-900">
                                            {page.text}
                                          </div>
                                        </div>
                                        <div>
                                          <p className="mb-2 text-sm font-medium text-purple-900">textQualityWarnings</p>
                                          {page.textQualityWarnings?.length ? (
                                            <div className="flex flex-wrap gap-2">
                                              {page.textQualityWarnings.map((warning) => (
                                                <span key={warning} className="rounded-full bg-amber-50 px-3 py-1 text-xs text-amber-700">
                                                  {warning}
                                                </span>
                                              ))}
                                            </div>
                                          ) : (
                                            <p className="text-xs text-violet-500">warning なし</p>
                                          )}
                                        </div>
                                        <details className="rounded-2xl border border-violet-100 p-4">
                                          <summary className="cursor-pointer text-sm font-medium text-purple-900">
                                            imagePrompt
                                          </summary>
                                          <div className="mt-3 space-y-3">
                                            <pre className="overflow-x-auto whitespace-pre-wrap text-xs leading-relaxed text-violet-800">
                                              {page.imagePrompt}
                                            </pre>
                                            <Button
                                              type="button"
                                              variant="outline"
                                              onClick={() => handleCopy(page.imagePrompt, `page ${page.pageNumber + 1} imagePrompt`)}
                                            >
                                              imagePrompt をコピー
                                            </Button>
                                          </div>
                                        </details>
                                      </div>
                                    </div>
                                  </CardContent>
                                </Card>
                                );
                              })}
                            </div>
                          )}
                        </CardContent>
                      </Card>

                      <Card>
                        <CardContent className="space-y-4 p-6">
                          <h3 className="text-lg font-semibold text-purple-900">管理者評価</h3>
                          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                            {[
                              ["adminTextQualityScore", "本文品質"],
                              ["adminImageQualityScore", "画像品質"],
                              ["adminCharacterConsistencyScore", "キャラ一貫性"],
                              ["adminStorySatisfactionScore", "物語満足度"],
                            ].map(([key, label]) => (
                              <div key={key} className="space-y-2">
                                <Label htmlFor={key}>{label}</Label>
                                <select
                                  id={key}
                                  value={reviewForm[key as keyof AdminReviewForm] as string}
                                  onChange={(e) =>
                                    setReviewForm((current) => ({
                                      ...current,
                                      [key]: e.target.value,
                                    }))
                                  }
                                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                                >
                                  <option value="">未設定</option>
                                  {[1, 2, 3, 4, 5].map((score) => (
                                    <option key={score} value={score}>
                                      {score}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            ))}
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="adminMemo">adminMemo</Label>
                            <textarea
                              id="adminMemo"
                              value={reviewForm.adminMemo}
                              onChange={(e) =>
                                setReviewForm((current) => ({
                                  ...current,
                                  adminMemo: e.target.value,
                                }))
                              }
                              rows={6}
                              className="w-full rounded-2xl border border-input bg-background px-4 py-3 text-sm"
                              placeholder="本文の意味量 / cast の一貫性 / 背景の自然さ / hiddenDetail の出方など"
                            />
                          </div>
                          <div className="flex flex-wrap items-center gap-3">
                            <Button onClick={handleSaveReview} disabled={savingReview}>
                              {savingReview ? "保存中..." : "管理者レビューを保存"}
                            </Button>
                            {saveMessage ? <p className="text-sm text-violet-600">{saveMessage}</p> : null}
                          </div>
                        </CardContent>
                      </Card>

                      {/* Quality Review Panel (Phase 2) */}
                      <QualityReviewPanel
                        qualityReviews={qualityReviews}
                        loading={qualityReviewsLoading}
                        error={qualityReviewsError}
                        saving={savingQualityReview}
                        message={qualityReviewMessage}
                        form={qualityReviewForm}
                        onFormChange={setQualityReviewForm}
                        onSave={handleSaveQualityReview}
                      />

                      <QualityRecommendationPanel
                        book={selectedBook}
                        onIntentAction={(intent) => handleIntentAction(intent)}
                      />

                      <CharacterConsistencyDiagnostics
                        book={selectedBook}
                        pages={pages}
                        qualityReviews={qualityReviews}
                      />
                      <div id="task-draft-area">
                      {intentMessage && (
                        <div className="flex items-center justify-between gap-3 rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2 text-xs text-indigo-800">
                          <span>{intentMessage}</span>
                          <button
                            type="button"
                            onClick={handleClearIntent}
                            className="shrink-0 rounded px-2 py-0.5 text-indigo-600 hover:bg-indigo-100"
                          >
                            ✕ クリア
                          </button>
                        </div>
                      )}
                      {activeIntent && activeIntent !== "confirm_approval" && selectedBook && (
                        <RecommendationTaskDraftPanel
                          key={`${selectedBook.id}-${activeIntent}`}
                          intent={activeIntent}
                          book={selectedBook}
                          pages={pages}
                          adminUid={user?.uid}
                        />
                      )}
                      </div>

                      <Card>
                        <CardContent className="p-6">
                          <details className="rounded-2xl border border-violet-100 p-4">
                            <summary className="cursor-pointer text-sm font-medium text-purple-900">
                              Debug summary
                            </summary>
                            <pre className="mt-3 overflow-x-auto whitespace-pre-wrap text-xs text-violet-600">
{compactJson({
  countByStatus: summaryByStatus,
  countByProductPlan: summaryByPlan,
  countByStoryQualityStatus: summaryByQuality,
  countByImageModelProfile: summaryByModel,
  averageRewriteAttempts: Number(averageRewriteAttempts(books).toFixed(2)),
  averageTextChars: Number(averageTextChars(books).toFixed(2)),
})}
                            </pre>
                          </details>
                        </CardContent>
                      </Card>
                    </>
                  )}
                </div>
              </div>

              <QualityTasksPanel adminUid={user?.uid} />
            </>
          )}
        </CardContent>
      </Card>
      </PageTransition>
    </>
  );
}

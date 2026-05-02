"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { PageTransition } from "@/components/page-transition";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { db } from "@/lib/firebase";
import { useAdminClaim } from "@/lib/hooks/use-admin-claim";
import { useAuth } from "@/lib/hooks/use-auth";
import type {
  BookDoc,
  ImageModelProfile,
  PageDoc,
  ProductPlan,
  StoryCharacter,
  StoryQualityReportData,
} from "@/lib/types";

type BookWithId = BookDoc & { id: string };
type PageWithId = PageDoc & { id: string };
type ReviewStatusFilter = "all" | "completed" | "failed";
type ReviewQualityFilter = "all" | "ok" | "warning" | "failed";
type ReviewPlanFilter = "all" | ProductPlan;
type ReviewModelFilter = "all" | ImageModelProfile;

type AdminReviewForm = {
  adminQualityScore: string;
  adminTextQualityScore: string;
  adminImageConsistencyScore: string;
  adminStorySatisfactionScore: string;
  adminMemo: string;
};

const PRODUCT_PLAN_OPTIONS: Array<{ value: ReviewPlanFilter; label: string }> = [
  { value: "all", label: "all" },
  { value: "free", label: "free" },
  { value: "light_paid", label: "light_paid" },
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
    const key = book.imageModelProfile ?? "unknown";
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

function formatTimestamp(value: unknown) {
  if (!value) return "—";
  if (typeof value === "object" && value !== null && "toDate" in value) {
    try {
      const date = (value as { toDate: () => Date }).toDate();
      return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString("ja-JP");
    } catch {
      return "—";
    }
  }
  if (value instanceof Date) {
    return value.toLocaleString("ja-JP");
  }
  return "—";
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
    adminQualityScore: book?.adminQualityScore ? String(book.adminQualityScore) : "",
    adminTextQualityScore: book?.adminTextQualityScore ? String(book.adminTextQualityScore) : "",
    adminImageConsistencyScore: book?.adminImageConsistencyScore
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
  const { checkingAdmin, isAdmin } = useAdminClaim();
  const [books, setBooks] = useState<BookWithId[]>([]);
  const [booksLoading, setBooksLoading] = useState(true);
  const [booksError, setBooksError] = useState<string | null>(null);
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null);
  const [pages, setPages] = useState<PageWithId[]>([]);
  const [pagesLoading, setPagesLoading] = useState(false);
  const [pagesError, setPagesError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<ReviewStatusFilter>("all");
  const [planFilter, setPlanFilter] = useState<ReviewPlanFilter>("all");
  const [qualityFilter, setQualityFilter] = useState<ReviewQualityFilter>("all");
  const [modelFilter, setModelFilter] = useState<ReviewModelFilter>("all");
  const [searchText, setSearchText] = useState("");
  const [reviewForm, setReviewForm] = useState<AdminReviewForm>(normalizeReviewForm());
  const [savingReview, setSavingReview] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [copyMessage, setCopyMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isAdmin) return;
    const booksQuery = query(collection(db, "books"), orderBy("createdAt", "desc"), limit(50));
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
        setBooksError(error.message);
        setBooksLoading(false);
      }
    );

    return () => unsubscribe();
  }, [isAdmin]);

  const filteredBooks = useMemo(() => {
    const normalizedSearch = searchText.trim().toLowerCase();
    return books.filter((book) => {
      if (statusFilter !== "all" && book.status !== statusFilter) return false;
      if (planFilter !== "all" && book.productPlan !== planFilter) return false;
      if (qualityFilter !== "all" && getStoryQualityStatus(book) !== qualityFilter) return false;
      if (modelFilter !== "all" && book.imageModelProfile !== modelFilter) return false;
      if (!normalizedSearch) return true;

      const haystack = [book.title, book.userId, book.childId]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(normalizedSearch);
    });
  }, [books, modelFilter, planFilter, qualityFilter, searchText, statusFilter]);

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

  useEffect(() => {
    setReviewForm(normalizeReviewForm(selectedBook ?? undefined));
    setSaveMessage(null);
  }, [selectedBook]);

  useEffect(() => {
    if (!selectedBookId || !isAdmin) {
      setPages([]);
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
        setPagesError(error.message);
        setPagesLoading(false);
      }
    );
    return () => unsubscribe();
  }, [isAdmin, selectedBookId]);

  const summaryByStatus = useMemo(() => countByStatus(books), [books]);
  const summaryByPlan = useMemo(() => countByProductPlan(books), [books]);
  const summaryByQuality = useMemo(() => countByStoryQualityStatus(books), [books]);
  const summaryByModel = useMemo(() => countByImageModelProfile(books), [books]);

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

  const handleSaveReview = async () => {
    if (!selectedBook || !user) return;
    setSavingReview(true);
    setSaveMessage(null);
    try {
      await updateDoc(doc(db, "books", selectedBook.id), {
        adminQualityScore: reviewForm.adminQualityScore
          ? Number(reviewForm.adminQualityScore)
          : null,
        adminTextQualityScore: reviewForm.adminTextQualityScore
          ? Number(reviewForm.adminTextQualityScore)
          : null,
        adminImageConsistencyScore: reviewForm.adminImageConsistencyScore
          ? Number(reviewForm.adminImageConsistencyScore)
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
      setSaveMessage(error instanceof Error ? error.message : "保存に失敗しました");
    } finally {
      setSavingReview(false);
    }
  };

  return (
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
              <div className="grid gap-3 md:grid-cols-5">
                <BookStatCard label="total loaded" value={books.length} />
                <BookStatCard label="completed" value={summaryByStatus.completed ?? 0} />
                <BookStatCard label="failed" value={summaryByStatus.failed ?? 0} />
                <BookStatCard label="warning" value={summaryByQuality.warning ?? 0} />
                <BookStatCard
                  label="premium"
                  value={summaryByPlan.premium_paid ?? 0}
                  hint={`avg rewrite ${averageRewriteAttempts(books).toFixed(1)}`}
                />
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
                  <Label htmlFor="searchText">title / userId / childId</Label>
                  <Input
                    id="searchText"
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    placeholder="検索"
                  />
                </div>
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
                          const isSelected = book.id === selectedBookId;
                          return (
                            <button
                              key={book.id}
                              type="button"
                              onClick={() => setSelectedBookId(book.id)}
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
                                </div>
                              </div>
                              <div className="mt-3 grid gap-2 text-xs text-violet-700 sm:grid-cols-2">
                                <p>productPlan: {book.productPlan ?? "—"}</p>
                                <p>creationMode: {book.creationMode ?? "—"}</p>
                                <p>imageTier: {book.imageQualityTier ?? "—"}</p>
                                <p>modelProfile: {book.imageModelProfile ?? "—"}</p>
                                <p>storyModel: {book.storyModel ?? "—"}</p>
                                <p>rewrite: {book.storyTextRewriteUsed ? `yes (${book.storyTextRewriteAttempts ?? 0})` : "no"}</p>
                                <p>warnings: {warningCount}</p>
                                <p>createdAt: {formatTimestamp(book.createdAt)}</p>
                                <p>userId: {book.userId}</p>
                                <p>childId: {book.childId ?? "—"}</p>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <div className="space-y-6">
                  {!selectedBook ? (
                    <Card>
                      <CardContent className="p-6 text-sm text-violet-500">
                        Book を選ぶと詳細が表示されます。
                      </CardContent>
                    </Card>
                  ) : (
                    <>
                      <Card>
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
                            <p><span className="font-medium text-purple-900">createdAt:</span> {formatTimestamp(selectedBook.createdAt)}</p>
                            <p><span className="font-medium text-purple-900">storyGoal:</span> {selectedBook.storyGoal ?? "—"}</p>
                            <p><span className="font-medium text-purple-900">mainQuestObject:</span> {selectedBook.mainQuestObject ?? "—"}</p>
                            <p><span className="font-medium text-purple-900">forbiddenQuestObjects:</span> {selectedBook.forbiddenQuestObjects?.join(", ") ?? "—"}</p>
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
                            <p><span className="font-medium text-purple-900">imageModelProfile:</span> {selectedBook.imageModelProfile ?? "—"}</p>
                            <p><span className="font-medium text-purple-900">characterConsistencyMode:</span> {selectedBook.characterConsistencyMode ?? "—"}</p>
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
                                            <td className="pr-3 py-2">{issue.severity}</td>
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

                            <Card className="border-violet-100">
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
                                <details className="rounded-xl border border-violet-100 p-3">
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
                              {pages.map((page) => (
                                <Card key={page.id} className="border-violet-100">
                                  <CardContent className="space-y-4 p-4">
                                    <div className="flex flex-wrap items-center justify-between gap-3">
                                      <div>
                                        <p className="font-semibold text-purple-950">page {page.pageNumber + 1}</p>
                                        <p className="text-xs text-violet-500">{page.id}</p>
                                      </div>
                                      <div className="flex flex-wrap gap-2">
                                        <span className={`rounded-full px-3 py-1 text-xs font-medium ${getStatusBadgeClass(page.status)}`}>
                                          {page.status}
                                        </span>
                                        {page.pageVisualRole ? (
                                          <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-medium text-violet-700">
                                            {page.pageVisualRole}
                                          </span>
                                        ) : null}
                                      </div>
                                    </div>
                                    <div className="grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)]">
                                      <div className="space-y-3">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img
                                          src={page.imageUrl}
                                          alt={`page ${page.pageNumber + 1}`}
                                          className="aspect-[4/3] w-full rounded-2xl border border-violet-100 object-cover"
                                        />
                                        <div className="grid gap-2 text-xs text-violet-700">
                                          <p>textCharCount: {page.textCharCount ?? "—"}</p>
                                          <p>textSentenceCount: {page.textSentenceCount ?? "—"}</p>
                                          <p>imageModel: {page.imageModel ?? "—"}</p>
                                          <p>imageModelProfile: {page.imageModelProfile ?? "—"}</p>
                                          <p>inputImageUrlsCount: {page.inputImageUrlsCount ?? "—"}</p>
                                          <p>usedCharacterReference: {page.usedCharacterReference ? "true" : "false"}</p>
                                          <p>focusCharacterId: {page.focusCharacterId ?? "—"}</p>
                                          <p>appearingCharacterIds: {page.appearingCharacterIds?.join(", ") ?? "—"}</p>
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
                              ))}
                            </div>
                          )}
                        </CardContent>
                      </Card>

                      <Card>
                        <CardContent className="space-y-4 p-6">
                          <h3 className="text-lg font-semibold text-purple-900">管理者評価</h3>
                          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                            {[
                              ["adminQualityScore", "総合品質"],
                              ["adminTextQualityScore", "本文品質"],
                              ["adminImageConsistencyScore", "画像一貫性"],
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

                      <Card>
                        <CardContent className="space-y-2 p-6 text-xs text-violet-600">
                          <p>countByStatus: {compactJson(summaryByStatus)}</p>
                          <p>countByProductPlan: {compactJson(summaryByPlan)}</p>
                          <p>countByStoryQualityStatus: {compactJson(summaryByQuality)}</p>
                          <p>countByImageModelProfile: {compactJson(summaryByModel)}</p>
                          <p>averageRewriteAttempts: {averageRewriteAttempts(books).toFixed(2)}</p>
                          <p>averageTextChars: {averageTextChars(books).toFixed(2)}</p>
                        </CardContent>
                      </Card>
                    </>
                  )}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </PageTransition>
  );
}

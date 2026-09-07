import { getFirestore, FieldValue } from "firebase-admin/firestore";
import * as logger from "firebase-functions/logger";
import { SERVER_PLAN_CONFIGS, SINGLE_PURCHASE_PRICES } from "./plans";
import type { ProductPlan } from "./types";
import { isInternalAccount, isPayingUser } from "./internal-accounts";

/**
 * 日次メトリクス・スナップショット
 * ───────────────────────────────────────────────────────────────
 * クラウドコンソール風の分析ダッシュボードの土台。
 * 毎日のユーザー成長・絵本生成・売上を 1 ドキュメント/日 で事前集計し、
 * adminMetrics/dailyMetrics/items/{YYYY-MM-DD} に保存する。
 *
 * 「過去に遡れる指標」と「現在値しか取れない指標」を区別して扱う:
 *   - 遡れる: 累積/新規ユーザー、絵本作成/完了、アクティブ作成者、単品売上
 *   - 現在値のみ: 有料ユーザー内訳・推定MRR（過去のプラン状態は記録が無いため）
 */

const JST_OFFSET_MS = 9 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** epoch ms を JST の "YYYY-MM-DD" に変換 */
export function jstDayKey(ms: number): string {
  const d = new Date(ms + JST_OFFSET_MS);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** JST の "YYYY-MM-DD" の 0:00 JST を epoch ms で返す */
export function jstDayStartMs(dateKey: string): number {
  const [y, m, d] = dateKey.split("-").map(Number);
  return Date.UTC(y, m - 1, d) - JST_OFFSET_MS;
}

export interface DailyMetricsDoc {
  date: string;
  dateMs: number;
  // ── ユーザー成長（遡及可能）──
  totalUsers: number;
  newUsers: number;
  activeCreators: number;
  // ── 生成（遡及可能）──
  booksCreated: number;
  booksCompleted: number;
  // ── 売上 ──
  singlePurchaseRevenueJpy: number; // 当日の単品購入売上（遡及可能）
  // ── 現在値スナップショット（最新日のみ書き込まれる。過去日は当時の記録を保持）──
  paidUsersStandard?: number;
  paidUsersPremium?: number;
  estimatedMrrJpy?: number;
  // ── 透明性（内部アカウント = スモーク/管理者検証/Stripe テスト。上の各値からは除外済み）──
  internalUsers?: number;
  internalBooksCreated?: number;
  booksFailed?: number;
  source: string;
}

interface UserRow {
  uid: string;
  createdAtMs: number;
  productPlan: ProductPlan;
  internal: boolean;
  paying: boolean;
}

function toMs(value: unknown): number {
  if (!value) return 0;
  if (typeof value === "number") return value;
  const ts = value as { toMillis?: () => number; seconds?: number };
  if (typeof ts.toMillis === "function") return ts.toMillis();
  if (typeof ts.seconds === "number") return ts.seconds * 1000;
  return 0;
}

/**
 * 指定した日付範囲（JST日単位）の日次メトリクスを計算して保存する。
 * @param startDayKey 範囲開始日（含む） "YYYY-MM-DD"
 * @param endDayKey   範囲終了日（含む） "YYYY-MM-DD"
 */
export async function computeAndSaveDailyMetrics(params: {
  startDayKey: string;
  endDayKey: string;
  source: string;
}): Promise<{ saved: number }> {
  const db = getFirestore();
  const { startDayKey, endDayKey, source } = params;
  const rangeStartMs = jstDayStartMs(startDayKey);
  const rangeEndMs = jstDayStartMs(endDayKey) + DAY_MS;

  logger.info("Computing daily metrics", { startDayKey, endDayKey, source });

  // 1. 全ユーザーを取得（累積・新規・有料内訳・MRR）
  const usersSnap = await db.collection("users").get();
  const allUsers: UserRow[] = usersSnap.docs.map((d) => {
    const data = d.data() as {
      createdAt?: unknown;
      createdAtMs?: number;
      productPlan?: ProductPlan;
      plan?: string;
      internal?: boolean;
      generationOverride?: { bypassMonthlyLimit?: boolean } | null;
      stripeSubscriptionId?: string | null;
    };
    const createdAtMs = typeof data.createdAtMs === "number" ? data.createdAtMs : toMs(data.createdAt);
    const productPlan: ProductPlan = data.productPlan ?? "free";
    return {
      uid: d.id,
      createdAtMs,
      productPlan,
      internal: isInternalAccount(d.id, data),
      paying: isPayingUser(d.id, data),
    };
  });
  // 内部アカウント（スモーク/管理者検証/Stripe テスト）は全指標から除外する。
  // 以前は legacy plan==="premium" を有料扱いしていたため、スモーク 11 件が「有料 12 人・MRR ¥17,760」になっていた。
  const internalUids = new Set(allUsers.filter((u) => u.internal).map((u) => u.uid));
  const users = allUsers.filter((u) => !u.internal);

  // 現在の有料内訳・MRR（最新日のみに付与）。有料 = Stripe 契約あり かつ productPlan 有料 かつ 非内部
  const paidStandard = users.filter((u) => u.paying && u.productPlan === "standard_paid").length;
  const paidPremium = users.filter((u) => u.paying && u.productPlan === "premium_paid").length;
  const estimatedMrrJpy =
    paidStandard * (SERVER_PLAN_CONFIGS.standard_paid.priceJpy ?? 0) +
    paidPremium * (SERVER_PLAN_CONFIGS.premium_paid.priceJpy ?? 0);

  // 2. 範囲内に作成された絵本（作成/完了/アクティブ作成者）
  const booksSnap = await db
    .collection("books")
    .where("createdAtMs", ">=", rangeStartMs)
    .where("createdAtMs", "<", rangeEndMs)
    .get();
  const allBooks = booksSnap.docs.map((d) => {
    const data = d.data() as { userId?: string; createdAtMs?: number; createdAt?: unknown; status?: string };
    return {
      userId: data.userId ?? "",
      createdAtMs: typeof data.createdAtMs === "number" ? data.createdAtMs : toMs(data.createdAt),
      status: data.status ?? "",
    };
  });
  const isInternalBook = (b: { userId: string }) => !b.userId || internalUids.has(b.userId);
  const books = allBooks.filter((b) => !isInternalBook(b));

  // 3. 範囲内の単品購入（売上）
  const sessionsSnap = await db
    .collection("processedStripeSessions")
    .where("processedAt", ">=", new Date(rangeStartMs))
    .where("processedAt", "<", new Date(rangeEndMs))
    .get();
  const sessions = sessionsSnap.docs.map((d) => {
    const data = d.data() as { purchaseType?: "ai_guided" | "photo_story"; processedAt?: unknown };
    return { purchaseType: data.purchaseType, processedAtMs: toMs(data.processedAt) };
  });

  // 4. 日ごとに集計
  const latestDayKey = jstDayKey(Date.now());
  const itemsRef = db.collection("adminMetrics").doc("dailyMetrics").collection("items");
  let saved = 0;

  for (let dayMs = rangeStartMs; dayMs < rangeEndMs; dayMs += DAY_MS) {
    const dayKey = jstDayKey(dayMs + 1); // 境界の丸め対策
    const dayStart = jstDayStartMs(dayKey);
    const dayEnd = dayStart + DAY_MS;

    const isLatest = dayKey === latestDayKey;
    const newUsers = users.filter((u) => u.createdAtMs >= dayStart && u.createdAtMs < dayEnd).length;
    // 最新日は実ユーザー総数（createdAt 欠損ドキュメントも含む全件）に合わせ、
    // ダッシュボードの実数表示と一致させる。過去日は createdAt ベースの累積推計。
    const totalUsers = isLatest
      ? users.length
      : users.filter((u) => u.createdAtMs > 0 && u.createdAtMs < dayEnd).length;

    const dayBooks = books.filter((b) => b.createdAtMs >= dayStart && b.createdAtMs < dayEnd);
    const booksCreated = dayBooks.length;
    const booksCompleted = dayBooks.filter(
      (b) => b.status === "completed" || b.status === "partial_completed"
    ).length;
    const booksFailed = dayBooks.filter((b) => b.status === "failed").length;
    const activeCreators = new Set(dayBooks.map((b) => b.userId).filter(Boolean)).size;
    const internalBooksCreated = allBooks.filter(
      (b) => isInternalBook(b) && b.createdAtMs >= dayStart && b.createdAtMs < dayEnd
    ).length;

    const singlePurchaseRevenueJpy = sessions
      .filter((s) => s.processedAtMs >= dayStart && s.processedAtMs < dayEnd)
      .reduce((sum, s) => sum + (s.purchaseType ? SINGLE_PURCHASE_PRICES[s.purchaseType] ?? 0 : 0), 0);

    const doc: DailyMetricsDoc = {
      date: dayKey,
      dateMs: dayStart,
      totalUsers,
      newUsers,
      activeCreators,
      booksCreated,
      booksCompleted,
      booksFailed,
      internalBooksCreated,
      internalUsers: internalUids.size,
      singlePurchaseRevenueJpy,
      // 有料内訳・MRR は「現在値」しか取れないため、最新日のみ書き込む。
      // 過去日はフィールドごと省略し、merge:true でその日に記録された値を保持する。
      // （以前は 0 で上書きしていたため、毎晩の再計算で前日以前の MRR が消えていた）
      ...(isLatest
        ? {
            paidUsersStandard: paidStandard,
            paidUsersPremium: paidPremium,
            estimatedMrrJpy,
          }
        : {}),
      source,
    };

    const docRef = itemsRef.doc(dayKey);
    const existing = await docRef.get();
    const existingCreatedAtMs = existing.exists
      ? ((existing.data() as Record<string, unknown>).createdAtMs as number | undefined)
      : undefined;
    const nowMs = Date.now();
    await docRef.set(
      {
        ...doc,
        createdAtMs: existingCreatedAtMs ?? nowMs,
        updatedAtMs: nowMs,
        updatedAt: FieldValue.serverTimestamp(),
        ...(existing.exists ? {} : { createdAt: FieldValue.serverTimestamp() }),
      },
      { merge: true }
    );
    saved += 1;
  }

  logger.info("Daily metrics saved", { saved, startDayKey, endDayKey });
  return { saved };
}

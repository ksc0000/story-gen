/**
 * KGI「定着家庭数」と主要 KPI の算出（純関数）。
 *
 * KGI = その月に 2 冊以上作り（完成/部分完了）、うち 1 冊を最後まで読んだ家庭（内部アカウント除外）
 * 入力はダッシュボードが読む users（内部判定済み）と、直近数か月の books。
 */
export interface KgiUser {
  uid: string;
  createdAtMs: number;
  lastActiveAtMs?: number;
}

export interface KgiBook {
  userId: string;
  createdAtMs: number;
  status: string;
  readCompletedAtMs?: number;
  readCompletedCount?: number;
}

export interface KgiMetrics {
  monthKey: string;
  /** 定着家庭数（KGI） */
  retainedHouseholds: number;
  /** 当月に 1 冊以上完成した家庭 */
  activeHouseholds: number;
  /** 当月に完成した本のうち、所有者が最後まで読んだ割合（%） */
  readThroughRate: number | null;
  /** 当月の新規のうち、登録から 24 時間以内に 1 冊完成した割合（%） */
  firstBookWithin24hRate: number | null;
  /** 当月に 1 冊以上完成した家庭のうち、2 冊以上の割合（%） */
  secondBookRate: number | null;
  /** 前月に本を作った家庭のうち、当月にアクティブだった割合（%） */
  returnRate: number | null;
  newHouseholds: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const JST = 9 * 60 * 60 * 1000;

export function jstMonthKey(ms: number): string {
  const d = new Date(ms + JST);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

function jstMonthStartMs(ms: number): number {
  const d = new Date(ms + JST);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1) - JST;
}

function pct(numer: number, denom: number): number | null {
  return denom > 0 ? Math.round((numer / denom) * 1000) / 10 : null;
}

const isDone = (b: KgiBook) => b.status === "completed" || b.status === "partial_completed";

export function computeKgiMetrics(params: { users: KgiUser[]; books: KgiBook[]; nowMs?: number }): KgiMetrics {
  const nowMs = params.nowMs ?? Date.now();
  const monthStart = jstMonthStartMs(nowMs);
  const prevMonthStart = jstMonthStartMs(monthStart - DAY_MS);
  const inMonth = (ms: number) => ms >= monthStart && ms <= nowMs;
  const inPrevMonth = (ms: number) => ms >= prevMonthStart && ms < monthStart;

  const doneThisMonth = params.books.filter((b) => b.userId && isDone(b) && inMonth(b.createdAtMs));
  const perUser = new Map<string, KgiBook[]>();
  for (const b of doneThisMonth) {
    const arr = perUser.get(b.userId) ?? [];
    arr.push(b);
    perUser.set(b.userId, arr);
  }
  const activeHouseholds = perUser.size;
  let retainedHouseholds = 0;
  let secondBookHouseholds = 0;
  for (const books of perUser.values()) {
    const readOne = books.some((b) => (b.readCompletedCount ?? 0) > 0 || (b.readCompletedAtMs != null && inMonth(b.readCompletedAtMs)));
    if (books.length >= 2) {
      secondBookHouseholds += 1;
      if (readOne) retainedHouseholds += 1;
    }
  }
  const readCompleted = doneThisMonth.filter((b) => (b.readCompletedCount ?? 0) > 0).length;

  const newUsers = params.users.filter((u) => inMonth(u.createdAtMs));
  const within24h = newUsers.filter((u) =>
    params.books.some((b) => b.userId === u.uid && isDone(b) && b.createdAtMs >= u.createdAtMs && b.createdAtMs <= u.createdAtMs + DAY_MS)
  ).length;

  const prevCreators = new Set(params.books.filter((b) => b.userId && inPrevMonth(b.createdAtMs)).map((b) => b.userId));
  const userById = new Map(params.users.map((u) => [u.uid, u] as const));
  let returned = 0;
  for (const uid of prevCreators) {
    const u = userById.get(uid);
    const activeNow = (u?.lastActiveAtMs != null && inMonth(u.lastActiveAtMs)) || perUser.has(uid);
    if (activeNow) returned += 1;
  }

  return {
    monthKey: jstMonthKey(nowMs),
    retainedHouseholds,
    activeHouseholds,
    readThroughRate: pct(readCompleted, doneThisMonth.length),
    firstBookWithin24hRate: pct(within24h, newUsers.length),
    secondBookRate: pct(secondBookHouseholds, activeHouseholds),
    returnRate: pct(returned, prevCreators.size),
    newHouseholds: newUsers.length,
  };
}

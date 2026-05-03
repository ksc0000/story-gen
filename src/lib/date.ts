type TimestampLikeObject = {
  seconds?: number;
  nanoseconds?: number;
  _seconds?: number;
  _nanoseconds?: number;
  _methodName?: string;
  toDate?: () => Date;
  toMillis?: () => number;
};

function parseTimestampParts(value: TimestampLikeObject): Date | null {
  const seconds =
    typeof value.seconds === "number"
      ? value.seconds
      : typeof value._seconds === "number"
        ? value._seconds
        : undefined;
  const nanoseconds =
    typeof value.nanoseconds === "number"
      ? value.nanoseconds
      : typeof value._nanoseconds === "number"
        ? value._nanoseconds
        : 0;

  if (typeof seconds !== "number") {
    return null;
  }

  const milliseconds = seconds * 1000 + Math.floor(nanoseconds / 1_000_000);
  const date = new Date(milliseconds);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function normalizeFirestoreDate(value: unknown): Date | null {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value === "number") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  if (typeof value === "string") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  if (typeof value === "object" && value !== null) {
    const timestampLike = value as TimestampLikeObject;

    if (timestampLike._methodName === "serverTimestamp") {
      return null;
    }

    if (typeof timestampLike.toDate === "function") {
      try {
        const date = timestampLike.toDate();
        return date instanceof Date && !Number.isNaN(date.getTime()) ? date : null;
      } catch {
        return null;
      }
    }

    if (typeof timestampLike.toMillis === "function") {
      try {
        const date = new Date(timestampLike.toMillis());
        return Number.isNaN(date.getTime()) ? null : date;
      } catch {
        return null;
      }
    }

    return parseTimestampParts(timestampLike);
  }

  return null;
}

export function estimateCreatedAtFromExpiresAt(expiresAt: unknown): Date | null {
  const expiresDate = normalizeFirestoreDate(expiresAt);
  if (!expiresDate) {
    return null;
  }
  const estimated = new Date(expiresDate.getTime() - 30 * 24 * 60 * 60 * 1000);
  return Number.isNaN(estimated.getTime()) ? null : estimated;
}

export function getBookTimestampValue(
  book: Record<string, unknown>,
  field:
    | "createdAt"
    | "updatedAt"
    | "generationStartedAt"
    | "completedAt"
    | "failedAt"
): unknown {
  const createdAt =
    book.createdAt ??
    book.createdAtMs ??
    book.generationStartedAt ??
    book.generationStartedAtMs ??
    book.completedAt ??
    book.completedAtMs ??
    book.updatedAt ??
    book.updatedAtMs ??
    estimateCreatedAtFromExpiresAt(book.expiresAt);

  switch (field) {
    case "createdAt":
      return createdAt;
    case "updatedAt":
      return book.updatedAt ?? book.updatedAtMs ?? createdAt;
    case "generationStartedAt":
      return book.generationStartedAt ?? book.generationStartedAtMs ?? createdAt;
    case "completedAt":
      return book.completedAt ?? book.completedAtMs ?? undefined;
    case "failedAt":
      return book.failedAt ?? book.failedAtMs ?? undefined;
    default:
      return undefined;
  }
}

export function formatResolvedDate(
  value: unknown,
  fallbackValue?: unknown,
  locale = "ja-JP"
): string {
  const date = normalizeFirestoreDate(value) ?? normalizeFirestoreDate(fallbackValue);
  return date ? date.toLocaleString(locale) : "日付不明";
}

export function formatBookDate(
  book: Record<string, unknown>,
  field:
    | "createdAt"
    | "updatedAt"
    | "generationStartedAt"
    | "completedAt"
    | "failedAt" = "createdAt"
): string {
  return formatResolvedDate(getBookTimestampValue(book, field));
}


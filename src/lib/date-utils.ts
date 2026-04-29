function fromSecondsAndNanos(seconds: number, nanoseconds: number): number | null {
  if (!Number.isFinite(seconds) || !Number.isFinite(nanoseconds)) return null;
  return seconds * 1000 + Math.floor(nanoseconds / 1_000_000);
}

export function toMillisSafe(value: unknown): number | null {
  if (value == null) return null;

  if (typeof value === "object" && "toMillis" in value && typeof value.toMillis === "function") {
    const millis = value.toMillis();
    return Number.isFinite(millis) ? millis : null;
  }

  if (value instanceof Date) {
    const millis = value.getTime();
    return Number.isFinite(millis) ? millis : null;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === "string") {
    const millis = Date.parse(value);
    return Number.isFinite(millis) ? millis : null;
  }

  if (typeof value === "object") {
    const timestamp = value as Record<string, unknown>;
    const seconds = timestamp.seconds;
    const nanoseconds = timestamp.nanoseconds;
    const legacySeconds = timestamp._seconds;
    const legacyNanoseconds = timestamp._nanoseconds;

    if (typeof seconds === "number") {
      return fromSecondsAndNanos(seconds, typeof nanoseconds === "number" ? nanoseconds : 0);
    }

    if (typeof legacySeconds === "number") {
      return fromSecondsAndNanos(legacySeconds, typeof legacyNanoseconds === "number" ? legacyNanoseconds : 0);
    }
  }

  return null;
}

export function formatDateSafe(value: unknown): string {
  const millis = toMillisSafe(value);
  if (millis === null) return "日付不明";

  const date = new Date(millis);
  if (Number.isNaN(date.getTime())) return "日付不明";

  return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
}

export function getRemainingDaysSafe(value: unknown): number | null {
  const millis = toMillisSafe(value);
  if (millis === null) return null;

  return Math.max(0, Math.ceil((millis - Date.now()) / (1000 * 60 * 60 * 24)));
}

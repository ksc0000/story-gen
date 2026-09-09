function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== "object") return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

/**
 * Recursively removes keys whose value is `undefined` so the result is safe
 * to pass to Firestore's setDoc/updateDoc (which rejects `undefined`).
 *
 * Only recurses into plain objects. Recursing into class instances such as
 * Firestore's FieldValue (serverTimestamp) or Timestamp would strip their
 * prototype and persist a broken plain object like {_methodName:"serverTimestamp"},
 * which never resolves server-side and breaks date display.
 */
export function stripUndefined<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => stripUndefined(item)) as T;
  }
  if (isPlainObject(value)) {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, entryValue]) => entryValue !== undefined)
        .map(([key, entryValue]) => [key, stripUndefined(entryValue)])
    ) as T;
  }
  return value;
}

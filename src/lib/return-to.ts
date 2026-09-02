const RETURN_TO_STORAGE_KEY = "ehoria_return_to";

/**
 * Validates a returnTo candidate URL to prevent Open Redirect vulnerabilities.
 * Only relative paths starting with a single '/' are allowed.
 * Scheme-relative URLs (//), backslash paths (/\\), javascript:, data:, and external URLs are rejected.
 *
 * @param url Candidate URL string
 * @param fallback Fallback relative path (defaults to "/home")
 * @returns Safe relative URL or fallback
 */
export function validateReturnTo(url?: string | null, fallback = "/home"): string {
  if (!url || typeof url !== "string") {
    return fallback;
  }

  const trimmed = url.trim();

  if (trimmed.length === 0) {
    return fallback;
  }

  // Must start with '/'
  if (!trimmed.startsWith("/")) {
    return fallback;
  }

  // ログイン画面自身を戻り先にすると、ログイン後に同一ルートへ replace して固着する
  if (/^\/login(?:[/?#]|$)/.test(trimmed)) {
    return fallback;
  }

  // Reject scheme-relative URLs '//' or backslash tricks '/\' or '/\\'
  if (trimmed.startsWith("//") || trimmed.startsWith("/\\") || trimmed.startsWith("/\\")) {
    return fallback;
  }

  // Reject control characters or newlines
  if (/[\x00-\x1F\x7F-\x9F]/.test(trimmed)) {
    return fallback;
  }

  // Check for dangerous protocol prefixes anywhere or invalid characters
  const lower = trimmed.toLowerCase();
  if (
    lower.includes("javascript:") ||
    lower.includes("data:") ||
    lower.includes("vbscript:")
  ) {
    return fallback;
  }

  try {
    // Parse relative to a dummy origin to verify host/origin isolation
    const parsed = new URL(trimmed, "http://localhost");

    // Ensure the URL parsed back to the dummy localhost origin
    if (parsed.origin !== "http://localhost") {
      return fallback;
    }

    // Ensure protocol didn't get overridden
    if (parsed.protocol !== "http:") {
      return fallback;
    }

    const safePath = parsed.pathname + parsed.search + parsed.hash;

    // Double check safePath starts with '/' and not '//' or '/\'
    if (!safePath.startsWith("/") || safePath.startsWith("//") || safePath.startsWith("/\\")) {
      return fallback;
    }

    return safePath;
  } catch {
    return fallback;
  }
}

/**
 * Saves a validated returnTo URL in sessionStorage.
 */
export function saveReturnTo(url: string): void {
  if (typeof window === "undefined" || !window.sessionStorage) return;
  const safeUrl = validateReturnTo(url);
  if (safeUrl !== "/home") {
    try {
      window.sessionStorage.setItem(RETURN_TO_STORAGE_KEY, safeUrl);
    } catch {
      // Ignore storage errors (e.g. private mode restrictions)
    }
  }
}

/**
 * Gets the stored returnTo URL from sessionStorage and clears it.
 */
export function getAndClearReturnTo(): string | null {
  if (typeof window === "undefined" || !window.sessionStorage) return null;
  try {
    const stored = window.sessionStorage.getItem(RETURN_TO_STORAGE_KEY);
    if (stored) {
      window.sessionStorage.removeItem(RETURN_TO_STORAGE_KEY);
      const validated = validateReturnTo(stored);
      return validated !== "/home" ? validated : null;
    }
  } catch {
    // Ignore storage errors
  }
  return null;
}

/**
 * Gets the stored returnTo URL from sessionStorage without clearing it.
 */
export function getStoredReturnTo(): string | null {
  if (typeof window === "undefined" || !window.sessionStorage) return null;
  try {
    const stored = window.sessionStorage.getItem(RETURN_TO_STORAGE_KEY);
    if (stored) {
      const validated = validateReturnTo(stored);
      return validated !== "/home" ? validated : null;
    }
  } catch {
    // Ignore storage errors
  }
  return null;
}

/**
 * Clears the stored returnTo URL from sessionStorage.
 */
export function clearReturnTo(): void {
  if (typeof window === "undefined" || !window.sessionStorage) return;
  try {
    window.sessionStorage.removeItem(RETURN_TO_STORAGE_KEY);
  } catch {
    // Ignore storage errors
  }
}

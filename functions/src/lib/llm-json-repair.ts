/**
 * P4-4: Pure JSON extraction / repair helper for Gemini LLM responses.
 *
 * Attempts to recover a parseable JSON structure from raw LLM output that may be
 * wrapped in markdown code fences, preceded by prose preamble, or followed by
 * trailing commentary.
 *
 * CONSERVATIVE SCOPE (P4-4):
 *  - Strips markdown code fences (```json...```, ```...```, or other language tags)
 *  - Strips leading prose preamble before the first `{` or `[` delimiter
 *  - Strips trailing text after the last matching `}` or `]` delimiter
 *  - Does NOT repair field values, guess missing fields, or make semantic corrections
 *  - Does NOT accept truncated or syntactically invalid JSON as valid
 *
 * Status "repaired" is reserved for future P4-5+ repair passes (e.g. trailing-comma
 * removal, quote normalisation). P4-4 only produces "valid_original", "extracted",
 * or "unrepairable".
 *
 * Privacy rules (MUST NOT be relaxed):
 *  - Never logs the raw input string or any fragment of it
 *  - `safeMessage` contains only generic descriptions — never echoes raw content
 *  - `repairActions` contains only repair type names — never contains field values
 *
 * Not yet wired into production generation path. Will be connected to GeminiClient
 * or the generate-book.ts catch block in P4-5.
 */

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/**
 * Overall outcome of the extraction / repair attempt.
 *
 * - `valid_original`  — Input string parsed as-is; no repair needed.
 * - `extracted`       — Valid JSON was found by stripping wrapper, preamble, or trailer.
 * - `repaired`        — JSON was syntactically repaired (reserved; not returned in P4-4).
 * - `unrepairable`    — No valid JSON structure found; caller should hard-fail.
 */
export type LlmJsonRepairStatus =
  | "valid_original"
  | "extracted"
  | "repaired"
  | "unrepairable";

/** Structured result from {@link extractJsonFromLLMResponse}. */
export interface LlmJsonRepairResult {
  /** Overall extraction / repair outcome. */
  status: LlmJsonRepairStatus;
  /** The clean JSON text that was successfully parsed (absent when `unrepairable`). */
  jsonText?: string;
  /** The parsed JavaScript value (absent when `unrepairable`). */
  parsed?: unknown;
  /**
   * Ordered list of repair action tokens applied.
   * Empty when `valid_original` or `unrepairable`.
   * Possible tokens (P4-4):
   *   "strip_markdown_fence"  — removed ```[lang]...``` wrapper
   *   "strip_preamble"        — removed text before first JSON delimiter
   *   "strip_trailing_text"   — removed text after last JSON closing delimiter
   */
  repairActions: string[];
  /**
   * Safe, generic description for observability.
   * Present when `unrepairable`.
   * Never echoes raw input content — only describes the failure category.
   */
  safeMessage?: string;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Attempt JSON.parse without surfacing exceptions to the caller.
 * Returns the parsed value or `null` on failure.
 */
function tryParse(text: string): unknown | null {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/**
 * Extract the content inside the first markdown code fence block.
 * Supports ``` ```json ```, ``` ``` ```, ``` ```ts ```, or any other language tag (case-insensitive).
 * Returns `null` if no fence block is detected.
 */
function extractFromMarkdownFence(text: string): string | null {
  // Matches: ```[optional lang]\n  ... content ...  \n```
  // Non-greedy inner match so we capture the first complete fence block only.
  const match = text.match(/```[a-zA-Z]*\s*\n([\s\S]*?)\n\s*```/);
  if (match !== null && match[1] !== undefined) {
    return match[1].trim();
  }
  return null;
}

/**
 * Extract the substring from the first opening delimiter (`{` or `[`) to the
 * last corresponding closing delimiter (`}` or `]`).
 *
 * Chooses object delimiters `{...}` or array delimiters `[...]` based on
 * whichever opening delimiter appears first in the string.
 *
 * Returns `null` if no complete delimiter pair is found.
 *
 * Note: "last closing delimiter" heuristic is conservative — it assumes the JSON
 * object/array is the largest contiguous `{...}` span in the string, which covers
 * the common case of preamble before and commentary after the JSON block.
 */
function extractOuterJsonDelimiters(text: string): string | null {
  const objOpen = text.indexOf("{");
  const arrOpen = text.indexOf("[");

  if (objOpen === -1 && arrOpen === -1) return null;

  let openIdx: number;
  let closeChar: string;

  if (objOpen === -1) {
    openIdx = arrOpen;
    closeChar = "]";
  } else if (arrOpen === -1) {
    openIdx = objOpen;
    closeChar = "}";
  } else if (objOpen <= arrOpen) {
    openIdx = objOpen;
    closeChar = "}";
  } else {
    openIdx = arrOpen;
    closeChar = "]";
  }

  const closeIdx = text.lastIndexOf(closeChar);
  if (closeIdx <= openIdx) return null;

  return text.slice(openIdx, closeIdx + 1);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Attempt to extract and parse a JSON value from a raw LLM response string.
 *
 * Strategies tried in order:
 *  1. JSON.parse the trimmed input as-is → `valid_original`
 *  2. Strip markdown code fence, then JSON.parse → `extracted`
 *  3. Extract between first `{`/`[` and last `}`/`]`, then JSON.parse → `extracted`
 *
 * If all strategies fail, returns `{ status: "unrepairable" }`.
 *
 * @param raw  Raw string from the LLM API. Must NOT be logged by the caller.
 * @returns    Structured result with status, parsed value, and repair metadata.
 */
export function extractJsonFromLLMResponse(raw: string): LlmJsonRepairResult {
  // Guard: null / empty / whitespace-only input
  if (raw == null || raw.trim().length === 0) {
    return {
      status: "unrepairable",
      repairActions: [],
      safeMessage: "Input string was empty or contained only whitespace",
    };
  }

  const trimmed = raw.trim();

  // Strategy 1: Parse as-is — no repair needed
  const parsed1 = tryParse(trimmed);
  if (parsed1 !== null) {
    return {
      status: "valid_original",
      jsonText: trimmed,
      parsed: parsed1,
      repairActions: [],
    };
  }

  // Strategy 2: Strip markdown code fence wrapper
  const fenceText = extractFromMarkdownFence(trimmed);
  if (fenceText !== null) {
    const parsed2 = tryParse(fenceText);
    if (parsed2 !== null) {
      return {
        status: "extracted",
        jsonText: fenceText,
        parsed: parsed2,
        repairActions: ["strip_markdown_fence"],
      };
    }
  }

  // Strategy 3: Extract by outer delimiter match (first { / last })
  const delimText = extractOuterJsonDelimiters(trimmed);
  if (delimText !== null) {
    const parsed3 = tryParse(delimText);
    if (parsed3 !== null) {
      const actions: string[] = [];
      const startIdx = trimmed.indexOf(delimText);
      if (startIdx > 0) {
        actions.push("strip_preamble");
      }
      const endIdx = startIdx + delimText.length;
      if (endIdx < trimmed.length) {
        actions.push("strip_trailing_text");
      }
      // Safety net: if neither action applied but we still got here, trimmed ≠ delimText
      // must differ only in leading/trailing whitespace (already handled by step 1).
      // Emit a trim action so repairActions is never empty on "extracted".
      if (actions.length === 0) {
        actions.push("trim_whitespace");
      }
      return {
        status: "extracted",
        jsonText: delimText,
        parsed: parsed3,
        repairActions: actions,
      };
    }
  }

  // All strategies exhausted
  return {
    status: "unrepairable",
    repairActions: [],
    safeMessage: "No valid JSON structure found after extraction attempts",
  };
}

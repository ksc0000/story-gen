"use client";

type AnalyticsEventName =
  | "select_product_plan"
  | "select_story_theme"
  | "start_book_generation"
  | "complete_book_generation"
  | "fail_book_generation"
  | "submit_book_feedback"
  | "view_quality_sample";

type AnalyticsPayload = Record<string, string | number | boolean | undefined>;

// TODO: Connect these events to Firebase Analytics or a server-side data pipeline.
// Keep payloads free of personal data such as child names or free-form story text.
export function trackAnalyticsEvent(
  eventName: AnalyticsEventName,
  payload: AnalyticsPayload = {}
) {
  if (typeof window === "undefined") {
    return;
  }

  if (process.env.NODE_ENV !== "production") {
    console.debug("[analytics]", eventName, payload);
  }
}

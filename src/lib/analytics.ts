"use client";

import { logEvent } from "firebase/analytics";

import { analytics } from "@/lib/firebase";

type AnalyticsEventName =
  | "select_product_plan"
  | "select_story_theme"
  | "start_book_generation"
  | "complete_book_generation"
  | "partial_complete_book_generation"
  | "fail_book_generation"
  | "retry_book_generation"
  | "submit_book_feedback"
  | "view_quality_sample"
  | "submit_ai_brief"
  | "submit_app_feedback"
  | "lp_cta_click";

type AnalyticsPayload = Record<string, string | number | boolean | undefined>;

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

  if (analytics) {
    logEvent(analytics, eventName, payload);
  }
}

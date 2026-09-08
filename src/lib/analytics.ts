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
  | "lp_cta_click"
  | "first_run_track_selected"
  | "first_run_completed"
  // KPI 計測（2026-09-08 追加）: 獲得・読了・共有・収益の各ステップ
  | "signup_completed"
  | "child_registered"
  | "open_book"
  | "complete_reading"
  | "toggle_public"
  | "copy_share_link"
  | "share_book"
  | "download_pdf"
  | "download_offline"
  | "view_pricing"
  | "start_checkout";

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

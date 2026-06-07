"use client";

import { getAnalytics, isSupported, logEvent, type Analytics } from "firebase/analytics";
import { app } from "./firebase";

type AnalyticsEventName =
  | "select_product_plan"
  | "select_story_theme"
  | "start_book_generation"
  | "complete_book_generation"
  | "partial_complete_book_generation"
  | "fail_book_generation"
  | "submit_book_feedback"
  | "view_quality_sample";

type AnalyticsPayload = Record<string, string | number | boolean | undefined>;

let analyticsPromise: Promise<Analytics | null> | null = null;

function getAnalyticsInstance(): Promise<Analytics | null> {
  if (typeof window === "undefined") {
    return Promise.resolve(null);
  }

  if (!analyticsPromise) {
    analyticsPromise = isSupported().then((supported) => {
      if (supported) {
        return getAnalytics(app);
      }
      return null;
    }).catch((err) => {
      console.warn("Failed to check or initialize Firebase Analytics", err);
      return null;
    });
  }

  return analyticsPromise;
}

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

  getAnalyticsInstance().then((analytics) => {
    if (analytics) {
      logEvent(analytics, eventName, payload);
    }
  }).catch((error) => {
    console.error("Error logging analytics event", error);
  });
}

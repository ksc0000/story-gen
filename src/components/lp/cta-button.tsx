"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { trackAnalyticsEvent } from "@/lib/analytics";

/**
 * Landing-page CTA that records a conversion event before navigating to /login.
 * `location` identifies which CTA was clicked (hero / final / etc.) for funnel analysis.
 */
export function CtaButton({
  location,
  children = "無料で絵本を作る",
  variant = "default",
  className,
}: {
  location: string;
  children?: React.ReactNode;
  variant?: "default" | "secondary" | "outline";
  className?: string;
}) {
  return (
    <Link
      href="/login"
      className="inline-block"
      onClick={() => trackAnalyticsEvent("lp_cta_click", { location })}
    >
      <Button size="lg" variant={variant} className={className}>
        {children}
      </Button>
    </Link>
  );
}

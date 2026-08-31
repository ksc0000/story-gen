"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { trackAnalyticsEvent } from "@/lib/analytics";
import { saveReturnTo } from "@/lib/return-to";

/**
 * Landing-page CTA that records a conversion event before navigating to /login.
 * `location` identifies which CTA was clicked (hero / final / etc.) for funnel analysis.
 * Stores returnTo in sessionStorage so user lands directly in creation flow (/create/select-child) after login.
 */
export function CtaButton({
  location,
  children = "無料で絵本を作る",
  variant = "default",
  className,
  returnTo = "/create/select-child",
}: {
  location: string;
  children?: React.ReactNode;
  variant?: "default" | "secondary" | "outline";
  className?: string;
  returnTo?: string;
}) {
  const handleClick = () => {
    trackAnalyticsEvent("lp_cta_click", { location });
    if (returnTo) {
      saveReturnTo(returnTo);
    }
  };

  const loginHref = returnTo
    ? `/login?returnTo=${encodeURIComponent(returnTo)}`
    : "/login";

  return (
    <Link
      href={loginHref}
      className="inline-block"
      onClick={handleClick}
    >
      <Button size="lg" variant={variant} className={className}>
        {children}
      </Button>
    </Link>
  );
}

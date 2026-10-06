import { LogoMark } from "@/components/nav/top-bar";
import { PRODUCT_NAME, PRODUCT_TAGLINE } from "@/lib/tenant/shell-branding-shared";
import { cn } from "@/lib/utils";

/**
 * Logo mark + "SE ENABLEMENT / FIELD READINESS" wordmark for pages outside the app shell
 * (sign-in, MFA, errors). Sits on blue only: the tagline is amber.
 */
export function BrandLockup({ className }: { className?: string }) {
  return (
    <span className={cn("flex items-center gap-3", className)}>
      <LogoMark />
      <span className="flex flex-col">
        <span className="wordmark">{PRODUCT_NAME}</span>
        <span className="wordmark__sub">{PRODUCT_TAGLINE}</span>
      </span>
    </span>
  );
}

"use client";

import { SignalMark } from "@/components/shell/signal-mark";
import { useTenantBranding } from "@/components/tenant/tenant-branding-provider";
import { cn } from "@/lib/utils";

/** Tenant logo when one is set, otherwise the 26px signal "SE" mark. */
export function TenantBrandMark({ className }: { className?: string }) {
  const branding = useTenantBranding();

  if (branding.logoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img alt="" className={cn("h-[26px] w-[26px] rounded-[8px] object-contain", className)} src={branding.logoUrl} />
    );
  }

  return <SignalMark className={className} />;
}

export function TenantBrandText({
  layout = "stacked",
  className,
  taglineClassName,
  titleClassName,
}: {
  layout?: "stacked" | "inline";
  className?: string;
  titleClassName?: string;
  taglineClassName?: string;
}) {
  const branding = useTenantBranding();

  if (layout === "inline") {
    return (
      <span className={className}>
        <span className={titleClassName}>{branding.productName}</span>
        {branding.productTagline ? <span className={taglineClassName}> {branding.productTagline}</span> : null}
      </span>
    );
  }

  return (
    <span className={className}>
      <span className={cn("block text-base leading-tight font-bold", titleClassName)}>{branding.productName}</span>
      {branding.productTagline ? (
        <span className={cn("block font-mono text-xs text-on-blue-muted", taglineClassName)}>
          {branding.productTagline}
        </span>
      ) : null}
    </span>
  );
}

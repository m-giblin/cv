"use client";

import { SailPointLogoMark } from "@/components/shell/sailpoint-logo-mark";
import { useTenantBranding } from "@/components/tenant/tenant-branding-provider";
import { cn } from "@/lib/utils";

export function TenantBrandMark({
 className,
 variant = "boxed",
}: {
 className?: string;
 variant?: "boxed" | "flat" | "flat-white";
}) {
 const branding = useTenantBranding();

 if (branding.logoUrl) {
 return (
 // eslint-disable-next-line @next/next/no-img-element
      <img alt="" className={cn("h-9 w-9 object-contain", className)} src={branding.logoUrl} />
 );
 }

 return <SailPointLogoMark className={className} variant={variant} />;
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
 {branding.productTagline ? (
 <span className={taglineClassName}> {branding.productTagline}</span>
 ) : null}
 </span>
 );
 }

 return (
 <span className={className}>
 <span className={cn("block font-display font-extrabold leading-tight tracking-tight", titleClassName)}>
 {branding.productName}
 </span>
 {branding.productTagline ? (
 <span className={cn("block font-medium tracking-wide", taglineClassName)}>{branding.productTagline}</span>
 ) : null}
 </span>
 );
}

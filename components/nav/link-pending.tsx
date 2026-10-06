"use client";

import { useLinkStatus } from "next/link";

/**
 * Place inside a <Link>. While that link's navigation is in flight it shows a small spinner, so a
 * click visibly registers even before the next page's data arrives.
 */
export function LinkPending({ className = "" }: { className?: string }) {
  const { pending } = useLinkStatus();
  return (
    <span
      aria-hidden
      className={`inline-block h-3 w-3 shrink-0 rounded-full border-2 border-blue/25 border-t-blue transition-opacity motion-safe:animate-spin ${
        pending ? "opacity-100" : "opacity-0"
      } ${className}`}
    />
  );
}

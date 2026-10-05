import { SignalMark } from "@/components/shell/signal-mark";

/**
 * @deprecated The SailPoint sail logo is gone (this is not an official SailPoint product).
 * This shim renders the product SignalMark so the remaining SE-workspace imports
 * (se-workspace-northstar.tsx, content-library-browser.tsx) show no vendor logo.
 * Import SignalMark from components/shell/signal-mark instead, then delete this file.
 */
export function SailPointLogoMark({
  className,
}: {
  className?: string;
  variant?: "boxed" | "flat" | "flat-white";
}) {
  return <SignalMark className={className} />;
}

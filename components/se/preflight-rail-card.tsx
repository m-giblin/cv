import Link from "next/link";

/** Rail prompt into Practice › Pre-flight: 2px dashed blue border, radius 14. */
export function PreflightRailCard() {
  return (
    <div className="flex flex-col gap-1.5 rounded-[14px] border-2 border-dashed border-blue px-4 py-3.5">
      <span className="font-mono text-xs font-medium uppercase text-blue">Pre-flight</span>
      <span className="text-base font-bold text-ink">Customer call coming up?</span>
      <span className="text-sm leading-[1.45] text-ink-2">Brief, rehearse, check. About 30 min.</span>
      <Link className="link self-start text-sm" href="/practice">
        Run pre-flight
      </Link>
    </div>
  );
}

import type { ReactNode } from "react";
import { Stamp, type StampState } from "@/components/ui/stamp";
import { cn } from "@/lib/utils";

export type BadgeGate = { id: string; label: string; state: StampState };

/** Credential card: ink background, lanyard slot, avatar, name, ID line and gate stamps. */
export function IdBadge({
  initials,
  name,
  idLine,
  gates,
  footer,
  className,
}: {
  initials: string;
  name: string;
  idLine: string;
  gates: BadgeGate[];
  footer?: ReactNode;
  className?: string;
}) {
  const cleared = gates.filter((gate) => gate.state === "earned").length;
  return (
    <div className={cn("relative flex flex-col gap-3.5 rounded-[18px] bg-badge p-[18px] pt-7 text-white", className)}>
      <span aria-hidden className="absolute top-2.5 left-1/2 h-2 w-[54px] -translate-x-1/2 rounded-[4px] bg-bg" />
      <div className="flex items-center gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-[12px] bg-signal text-base font-extrabold text-ink">
          {initials}
        </span>
        <span className="flex min-w-0 flex-col">
          <span className="truncate text-[17px] font-bold">{name}</span>
          <span className="truncate font-mono text-xs text-signal uppercase">{idLine}</span>
        </span>
      </div>
      <span className="font-mono text-xs text-on-blue-muted uppercase">
        Gates · {cleared} of {gates.length} cleared
      </span>
      <ul className="flex justify-between gap-1">
        {gates.map((gate) => (
          <li className="flex flex-col items-center gap-1.5" key={gate.id}>
            <Stamp label={`${gate.label}: ${gate.state}`} onDark state={gate.state} />
            <span
              className={cn(
                "text-xs",
                gate.state === "ready" ? "font-bold text-signal" : "text-on-blue",
              )}
            >
              {gate.label}
            </span>
          </li>
        ))}
      </ul>
      {footer ? (
        <div className="flex flex-col gap-1 border-t border-dashed border-badge-line pt-3 text-[15px]">{footer}</div>
      ) : null}
    </div>
  );
}

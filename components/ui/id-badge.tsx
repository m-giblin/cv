import type { ReactNode } from "react";
import { Stamp, type StampState } from "@/components/ui/stamp";
import { cn } from "@/lib/utils";

export type BadgeGate = { id: string; label: string; state: StampState };

/** Gate summary card: name, ID line and five stamps with captions. */
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
    <div className={cn("flex flex-col gap-4 rounded-[14px] border border-line bg-white p-5", className)}>
      <div className="flex items-center gap-3">
        <span className="grid h-[34px] w-[34px] place-items-center rounded-full bg-blue-soft text-[13px] font-bold text-blue">
          {initials}
        </span>
        <span className="flex min-w-0 flex-col">
          <span className="truncate text-[15px] font-bold">{name}</span>
          <span className="truncate text-[13px] text-muted">{idLine}</span>
        </span>
      </div>
      <span className="text-sm text-ink-2">
        <span className="font-bold text-ink">{cleared} of {gates.length}</span> gates cleared
      </span>
      <ul className="flex justify-between gap-1">
        {gates.map((gate) => (
          <li className="flex flex-col items-center gap-1.5" key={gate.id}>
            <Stamp label={`${gate.label}: ${gate.state}`} size={34} state={gate.state} />
            <span className={cn("text-xs", gate.state === "ready" ? "font-bold text-ink" : "text-muted")}>{gate.label}</span>
          </li>
        ))}
      </ul>
      {footer ? <div className="flex flex-col gap-1 border-t border-divider pt-3 text-sm">{footer}</div> : null}
    </div>
  );
}

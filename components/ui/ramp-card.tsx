import { cn } from "@/lib/utils";

/** Blocks: done blue, current amber, remaining track. */
export function ProgressBlocks({ done, total, className }: { done: number; total: number; className?: string }) {
  return (
    <div aria-label={`${done} of ${total}`} className={cn("flex gap-[3px]", className)} role="img">
      {Array.from({ length: total }, (_, i) => (
        <span
          className={cn("h-2 flex-1 rounded-[2px]", i < done ? "bg-blue" : i === done ? "bg-signal" : "bg-track")}
          key={i}
        />
      ))}
    </div>
  );
}

export function RampCard({
  done,
  total,
  label = "Validated",
  note,
  caption,
  className,
}: {
  done: number;
  total: number;
  label?: string;
  note?: string;
  caption?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-3 rounded-[14px] border border-line bg-white p-5", className)}>
      <div className="flex justify-between gap-3">
        <span className="label-caps">{label}</span>
        {note ? <span className="text-[13px] text-muted">{note}</span> : null}
      </div>
      <div className="flex items-baseline gap-2">
        <span className="num text-[44px] leading-none font-extrabold tracking-[-0.03em] text-blue">{done}</span>
        <span className="text-[15px] text-ink-2">of {total}{caption ? ` ${caption}` : ""}</span>
      </div>
      <ProgressBlocks done={done} total={total} />
    </div>
  );
}

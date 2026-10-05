import { cn } from "@/lib/utils";

export function RampCard({
  done,
  total,
  label = "RAMP",
  note,
  caption = "validated",
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
    <div className={cn("flex flex-col gap-2 rounded-[14px] border-[1.5px] border-ink bg-white px-4 py-3.5", className)}>
      <div className="flex justify-between font-mono text-xs text-muted uppercase">
        <span>{label}</span>
        {note ? <span>{note}</span> : null}
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-[40px] leading-none font-extrabold tracking-[-0.03em] text-blue">
          {done}/{total}
        </span>
        <span className="text-sm text-ink-2">{caption}</span>
      </div>
      <div aria-hidden className="flex gap-[3px]">
        {Array.from({ length: total }, (_, i) => (
          <span
            className={cn(
              "h-2 flex-1 rounded-[2px]",
              i < done && "bg-blue",
              i === done && "bg-signal outline-1 outline-ink",
              i > done && "bg-[#DCE2EC]",
            )}
            key={i}
          />
        ))}
      </div>
    </div>
  );
}

import { cn } from "@/lib/utils";

const tones = {
  success: { dot: "bg-success", text: "text-success" },
  warning: { dot: "bg-warning-dot", text: "text-warning" },
  danger: { dot: "bg-danger", text: "text-danger" },
  blue: { dot: "bg-blue", text: "text-blue" },
  neutral: { dot: "bg-faint", text: "text-muted" },
};

export type StatusTone = keyof typeof tones;

/** Dot + word, no background. The word carries the meaning; the colour only supports it. */
export function StatusPill({ tone, children, className }: { tone: StatusTone; children: React.ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-[7px] text-[13px] font-semibold whitespace-nowrap", tones[tone].text, className)}>
      <span aria-hidden className={cn("h-[7px] w-[7px] shrink-0 rounded-full", tones[tone].dot)} />
      {children}
    </span>
  );
}

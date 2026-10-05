import { Loader2 } from "lucide-react";
import type { ReactNode } from "react";
import { Stat } from "@/components/ui/stat";
import { Tag } from "@/components/ui/tag";
import { cn } from "@/lib/utils";

/**
 * Platform console building blocks. The designer gave no platform artboards, so these follow the
 * tenant-admin artboards: line cards, blue-header line tables, mono labels, KPI strips, 40×22 toggles.
 */

/** Blue-header line table. Wrap in `TABLE_WRAP` so wide tables scroll inside their own container. */
export const TABLE_WRAP = "overflow-hidden rounded-[14px] border border-line bg-white";
export const TABLE_SCROLL = "overflow-x-auto";
export const TABLE = "w-full min-w-[760px] border-collapse text-left text-[15px] text-ink";
export const THEAD_ROW = "bg-blue text-white";
export const TH = "px-[18px] py-[11px] font-mono text-xs font-medium uppercase tracking-[0.03em] whitespace-nowrap";
export const TR = "border-b border-divider last:border-b-0";
export const TD = "px-[18px] py-3 align-middle";
export const TD_MUTED = "px-[18px] py-3 align-middle text-ink-2";
export const TD_MONO = "px-[18px] py-3 align-middle font-mono text-xs text-ink-2 whitespace-nowrap";

/** Field label + control classes for platform forms. Always pair labels with `htmlFor`. */
export const FIELD_LABEL = "mb-1.5 block text-sm font-semibold text-ink";
export const FIELD_HINT = "mt-1 text-[13px] leading-[1.45] text-muted";
export const SELECT =
  "h-10 w-full rounded-[10px] border-[1.5px] border-ink bg-white px-3 text-[15px] text-ink focus:border-blue disabled:border-line-strong disabled:text-muted";

/** Secondary button on the blue action bar. */
export const BTN_ON_BLUE =
  "rounded-full border-[1.5px] border-white px-4 py-2 text-sm font-bold text-white hover:bg-blue-2 disabled:opacity-60";

export function Spinner({ label = "Loading", className }: { label?: string; className?: string }) {
  return (
    <div className={cn("flex items-center justify-center gap-2 py-16 text-muted", className)} role="status">
      <Loader2 aria-hidden className="h-6 w-6 animate-spin text-blue" />
      <span className="text-sm">{label}…</span>
    </div>
  );
}

export function EmptyLine({ children }: { children: ReactNode }) {
  return <p className="px-[18px] py-6 text-sm text-muted">{children}</p>;
}

/** White line card with an optional header row (h2 18/800 + meta + one action). */
export function LineCard({
  title,
  meta,
  action,
  children,
  className,
  bodyClassName,
}: {
  title?: ReactNode;
  meta?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={cn("overflow-hidden rounded-[14px] border border-line bg-white", className)}>
      {title ? (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-divider px-5 py-3.5">
          <div className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1">
            <h2 className="text-lg leading-[1.3] font-extrabold text-ink">{title}</h2>
            {meta ? <span className="label-mono">{meta}</span> : null}
          </div>
          {action}
        </div>
      ) : null}
      <div className={bodyClassName}>{children}</div>
    </section>
  );
}

export type KpiItem = { label: string; value: ReactNode; tone?: "blue" | "danger"; note?: ReactNode };

/** KPI strip: equal cells, mono label over a large blue numeral. */
export function KpiStrip({ items, className }: { items: KpiItem[]; className?: string }) {
  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-px overflow-hidden rounded-[14px] border border-line bg-divider",
        items.length >= 5 ? "md:grid-cols-5" : items.length === 3 ? "md:grid-cols-3" : "md:grid-cols-4",
        className,
      )}
    >
      {items.map((item) => (
        <div className="bg-white px-5 py-4" key={item.label}>
          <Stat label={item.label} note={item.note} tone={item.tone} value={item.value} />
        </div>
      ))}
    </div>
  );
}

/** 40×22 switch. On: blue with white knob. Off: white, 1.5px faint border, grey knob. Changed rows get a signal ring. */
export function Toggle({
  checked,
  onChange,
  label,
  changed = false,
  disabled = false,
  id,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  /** Accessible name, e.g. the feature label. */
  label: string;
  changed?: boolean;
  disabled?: boolean;
  id?: string;
}) {
  return (
    <button
      aria-checked={checked}
      aria-label={label}
      className={cn(
        "relative inline-block h-[22px] w-10 shrink-0 rounded-full border-[1.5px] transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        checked ? "border-blue bg-blue" : "border-faint bg-white",
        changed && "ring-[3px] ring-signal",
      )}
      disabled={disabled}
      id={id}
      onClick={() => onChange(!checked)}
      role="switch"
      type="button"
    >
      <span
        aria-hidden
        className={cn(
          "absolute top-[2px] h-[15px] w-[15px] rounded-full transition-[left]",
          checked ? "left-[20px] bg-white" : "left-[2px] bg-faint",
        )}
      />
    </button>
  );
}

/** "CHANGED" marker for rows with unsaved edits. */
export function ChangedMark() {
  return (
    <span className="ml-2 rounded-[4px] bg-signal px-1.5 py-px font-mono text-xs font-medium text-ink uppercase">
      Changed
    </span>
  );
}

export function formatDate(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export function formatDateTime(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

type TagTone = "neutral" | "blue" | "success" | "warning" | "danger" | "signal";

const TENANT_STATUS: Record<string, { tone: TagTone; symbol: string }> = {
  active: { tone: "success", symbol: "✓" },
  provisioning: { tone: "warning", symbol: "•" },
  suspended: { tone: "danger", symbol: "▲" },
  offboarded: { tone: "neutral", symbol: "○" },
};

const BILLING_STATUS: Record<string, { tone: TagTone; symbol: string }> = {
  active: { tone: "success", symbol: "✓" },
  trial: { tone: "blue", symbol: "•" },
  past_due: { tone: "danger", symbol: "▲" },
  canceled: { tone: "neutral", symbol: "○" },
  exempt: { tone: "neutral", symbol: "●" },
};

function humanize(value: string) {
  return value.replace(/_/g, " ");
}

export function TenantStatusTag({ status }: { status: string }) {
  const meta = TENANT_STATUS[status] ?? { tone: "neutral" as TagTone, symbol: "•" };
  return (
    <Tag tone={meta.tone}>
      <span aria-hidden>{meta.symbol}</span> {humanize(status)}
    </Tag>
  );
}

export function BillingStatusTag({ status }: { status: string }) {
  const meta = BILLING_STATUS[status] ?? { tone: "neutral" as TagTone, symbol: "•" };
  return (
    <Tag tone={meta.tone}>
      <span aria-hidden>{meta.symbol}</span> {humanize(status)}
    </Tag>
  );
}

/** Ticket priority: critical/high read as danger/warning, with symbols so colour is never the only cue. */
export function PriorityTag({ priority }: { priority: string }) {
  const tone: TagTone = priority === "critical" ? "danger" : priority === "high" ? "warning" : "neutral";
  const symbol = priority === "critical" ? "▲" : priority === "high" ? "●" : "•";
  return (
    <Tag tone={tone}>
      <span aria-hidden>{symbol}</span> {humanize(priority)}
    </Tag>
  );
}

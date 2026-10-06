import { Loader2 } from "lucide-react";
import type { ReactNode } from "react";
import { Stat } from "@/components/ui/stat";
import { StatusPill, type StatusTone } from "@/components/ui/status-pill";
import { Tag } from "@/components/ui/tag";
import { cn } from "@/lib/utils";

/**
 * Platform console building blocks. The designer gave no platform artboards, so these follow the
 * v3 tenant-admin artboards: line cards, white tables with caps headers, stat strips, 40×22 toggles,
 * and dot + word status.
 */

/** v3 table: white card, caps header row with a 1px line under it, 1px row dividers. Wide tables scroll inside `TABLE_SCROLL`. */
export const TABLE_WRAP = "overflow-hidden rounded-[14px] border border-line bg-white";
export const TABLE_SCROLL = "overflow-x-auto";
export const TABLE = "w-full min-w-[760px] border-collapse text-left text-[15px] text-ink";
export const THEAD_ROW = "border-b border-line";
export const TH = "th px-5 py-3 text-left align-bottom whitespace-nowrap";
export const TR = "border-b border-divider last:border-b-0";
export const TD = "px-5 py-[13px] align-middle";
export const TD_MUTED = "px-5 py-[13px] align-middle text-ink-2";
/** Secondary cell: dates, ids, durations. 13px ink-2, tabular numerals. */
export const TD_META = "num px-5 py-[13px] align-middle text-[13px] text-ink-2 whitespace-nowrap";

/** Clickable row title (first cell of a table): 15/700 ink, blue on hover. */
export const ROW_LINK = "text-left text-[15px] font-bold text-ink hover:text-blue hover:underline";

/** Field label + control classes for platform forms. Always pair labels with `htmlFor`. */
export const FIELD_LABEL = "mb-1.5 block text-sm font-semibold text-ink";
export const FIELD_HINT = "mt-1 text-[13px] leading-[1.45] text-muted";
export const SELECT =
  "h-10 w-full rounded-[10px] border border-line-strong bg-white px-3 text-[15px] text-ink focus:border-blue disabled:border-line disabled:bg-divider disabled:text-muted";

/** Quiet button on the navy action bar: white text, 1px navy-line border. */
export const BTN_ON_NAVY =
  "rounded-full border border-on-navy-muted px-4 py-2 text-sm font-semibold text-white hover:border-white disabled:opacity-60";

/** Inline notices: 1px border on the soft fill, no glyphs. The text says what happened. */
export const NOTICE = {
  danger: "rounded-[10px] border border-danger/30 bg-danger-soft px-3.5 py-2.5 text-sm text-danger",
  warning: "rounded-[10px] border border-signal-edge/40 bg-signal-soft px-3.5 py-2.5 text-sm text-ink",
  success: "rounded-[10px] border border-success/30 bg-success-soft px-3.5 py-2.5 text-sm text-success",
};

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
            {meta ? <span className="text-[13px] text-muted">{meta}</span> : null}
          </div>
          {action}
        </div>
      ) : null}
      <div className={bodyClassName}>{children}</div>
    </section>
  );
}

export type KpiItem = { label: string; value: ReactNode; tone?: "blue" | "danger"; note?: ReactNode };

/** KPI strip: equal cells, caps label over a large blue numeral. */
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
          <Stat
            label={item.label}
            note={item.note}
            noteTone={item.tone === "danger" ? "danger" : "muted"}
            tone={item.tone}
            value={item.value}
          />
        </div>
      ))}
    </div>
  );
}

/** "Changed" marker for rows with unsaved edits. */
export function ChangedMark() {
  return (
    <Tag className="ml-2" tone="signal">
      Changed
    </Tag>
  );
}

/** "Thu, Oct 9" (plus the year when it isn't this year). */
export function formatDate(iso: string | null | undefined) {
  if (!iso) return "—";
  const date = new Date(iso);
  const sameYear = date.getFullYear() === new Date().getFullYear();
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    ...(sameYear ? {} : { year: "numeric" }),
  });
}

/** "Thu, Oct 9, 3:05 PM". */
export function formatDateTime(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

const TENANT_STATUS: Record<string, StatusTone> = {
  active: "success",
  provisioning: "warning",
  suspended: "danger",
  offboarded: "neutral",
};

const BILLING_STATUS: Record<string, StatusTone> = {
  active: "success",
  trial: "blue",
  past_due: "danger",
  canceled: "neutral",
  exempt: "neutral",
};

/** "past_due" → "Past due". */
export function humanize(value: string) {
  const text = value.replace(/_/g, " ");
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function TenantStatusTag({ status }: { status: string }) {
  return <StatusPill tone={TENANT_STATUS[status] ?? "neutral"}>{humanize(status)}</StatusPill>;
}

export function BillingStatusTag({ status }: { status: string }) {
  return <StatusPill tone={BILLING_STATUS[status] ?? "neutral"}>{humanize(status)}</StatusPill>;
}

/** Ticket priority as dot + word: critical is danger, high is warning. */
export function PriorityTag({ priority }: { priority: string }) {
  const tone: StatusTone = priority === "critical" ? "danger" : priority === "high" ? "warning" : "neutral";
  return <StatusPill tone={tone}>{humanize(priority)}</StatusPill>;
}

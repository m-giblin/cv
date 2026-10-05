import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Admin console building blocks on the v2 system (tokens only, no raw hex).
 * Line cards and tables follow the handoff: white, 1px line border, radius 14, blue table headers.
 */

export function AdminBody({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-col gap-6 px-[var(--gutter)] pb-10", className)} {...props} />;
}

export function SectionHeading({
  title,
  meta,
  actions,
  className,
  as: Tag = "h2",
}: {
  title: React.ReactNode;
  meta?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
  as?: "h2" | "h3";
}) {
  return (
    <div className={cn("flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2", className)}>
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <Tag className="text-lg leading-[1.3] font-extrabold text-ink">{title}</Tag>
        {meta ? <span className="label-mono">{meta}</span> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-3">{actions}</div> : null}
    </div>
  );
}

/** White line card. Pass `title` for a header row separated by a divider. */
export function LineCard({
  title,
  meta,
  actions,
  children,
  className,
  bodyClassName,
  id,
}: {
  title?: React.ReactNode;
  meta?: React.ReactNode;
  actions?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  id?: string;
}) {
  return (
    <section className={cn("overflow-hidden rounded-[14px] border border-line bg-white", className)} id={id}>
      {title ? (
        <div className="border-b border-divider px-5 py-3.5">
          <SectionHeading actions={actions} meta={meta} title={title} />
        </div>
      ) : null}
      {children !== undefined ? <div className={cn("px-5 py-4", bodyClassName)}>{children}</div> : null}
    </section>
  );
}

/** Row inside a line list: 12–14px × 18–20px, divider between rows. */
export function LineRow({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("border-b border-divider px-5 py-3 text-[15px] text-ink last:border-b-0", className)}
      {...props}
    />
  );
}

/** Scrolls inside its own container so wide tables never push the page wider. */
export function AdminTable({
  children,
  className,
  minWidth = 760,
  caption,
}: {
  children: React.ReactNode;
  className?: string;
  minWidth?: number;
  caption?: string;
}) {
  return (
    <div className={cn("overflow-hidden rounded-[14px] border border-line bg-white", className)}>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left" style={{ minWidth }}>
          {caption ? <caption className="sr-only">{caption}</caption> : null}
          {children}
        </table>
      </div>
    </div>
  );
}

export function Th({ className, ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cn(
        "bg-blue px-[18px] py-[11px] font-mono text-xs font-medium tracking-[0.03em] whitespace-nowrap text-white uppercase",
        className,
      )}
      scope="col"
      {...props}
    />
  );
}

export function Td({ className, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td
      className={cn("border-b border-divider px-[18px] py-3 align-middle text-[15px] text-ink", className)}
      {...props}
    />
  );
}

/** Mono 12 cell text (dates, ids, counts). */
export function Mono({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return <span className={cn("font-mono text-xs text-ink-2 uppercase", className)} {...props} />;
}

const fieldControl =
  "w-full rounded-[10px] border-[1.5px] border-line-strong bg-white px-3 py-[9px] text-[15px] text-ink placeholder:text-muted disabled:bg-surface-2 disabled:text-muted";

export const TextInput = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function TextInput({ className, ...props }, ref) {
    return <input className={cn(fieldControl, className)} ref={ref} {...props} />;
  },
);

export const SelectInput = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  function SelectInput({ className, ...props }, ref) {
    return <select className={cn(fieldControl, "pr-8", className)} ref={ref} {...props} />;
  },
);

export const TextArea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function TextArea({ className, ...props }, ref) {
    return <textarea className={cn(fieldControl, "min-h-24 leading-[1.5]", className)} ref={ref} {...props} />;
  },
);

/** Label 14/700 above its control. Always pass `htmlFor` matching the control id. */
export function Field({
  label,
  htmlFor,
  hint,
  children,
  className,
}: {
  label: React.ReactNode;
  htmlFor: string;
  hint?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-1.5", className)}>
      <label className="text-sm font-bold text-ink" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
      {hint ? <span className="text-[13px] leading-[1.45] text-muted">{hint}</span> : null}
    </div>
  );
}

/** 40×22 switch. On: blue with white knob. Off: white, faint border, grey knob. `changed` adds the signal ring. */
export function Switch({
  checked,
  onChange,
  label,
  changed = false,
  disabled = false,
  id,
  className,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  changed?: boolean;
  disabled?: boolean;
  id?: string;
  className?: string;
}) {
  return (
    <button
      aria-checked={checked}
      aria-label={label}
      className={cn(
        "relative inline-block h-[22px] w-10 shrink-0 rounded-[11px] border-[1.5px] transition-colors disabled:cursor-not-allowed disabled:opacity-60",
        checked ? "border-blue bg-blue" : "border-faint bg-white",
        changed && "shadow-[0_0_0_3px_var(--color-signal)]",
        className,
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
          "absolute top-0.5 h-[15px] w-[15px] rounded-full transition-[left,right]",
          checked ? "right-0.5 bg-white" : "left-0.5 bg-faint",
        )}
      />
    </button>
  );
}

/** KPI strip: mono label over a 36/800 blue numeral with an optional faint suffix. */
export function KpiStrip({
  items,
  className,
}: {
  items: { label: string; value: React.ReactNode; suffix?: React.ReactNode; href?: string }[];
  className?: string;
}) {
  return (
    <dl
      className={cn(
        "grid grid-cols-2 rounded-[14px] border border-line bg-white sm:grid-cols-4",
        className,
      )}
    >
      {items.map((item) => (
        <div className="flex flex-col gap-1 px-[18px] py-4" key={item.label}>
          <dt className="font-mono text-xs text-muted uppercase">{item.label}</dt>
          <dd className="text-4xl leading-none font-extrabold tracking-[-0.03em] text-blue">
            {item.href ? (
              <a className="no-underline hover:underline" href={item.href}>
                {item.value}
              </a>
            ) : (
              item.value
            )}
            {item.suffix !== undefined ? (
              <span className="text-[15px] font-bold tracking-normal text-faint">{item.suffix}</span>
            ) : null}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/** Quiet bordered note (info, empty states). */
export function Notice({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("rounded-[14px] border border-line bg-surface-2 px-4 py-3 text-sm leading-[1.5] text-ink-2", className)}
      {...props}
    />
  );
}

export function EmptyState({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("px-5 py-8 text-center text-sm text-muted", className)} {...props} />;
}

export function LoadingState({ label = "Loading…", className }: { label?: string; className?: string }) {
  return (
    <p aria-busy="true" className={cn("label-mono px-5 py-8 text-center", className)} role="status">
      {label}
    </p>
  );
}

/** Small secondary pill (14px). Use `.btn-primary` for the single primary action per view. */
export function SecondaryButton({ className, type = "button", ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn("btn-secondary inline-flex items-center gap-1.5 disabled:opacity-50", className)}
      type={type}
      {...props}
    />
  );
}

/** Text-styled action button using the `.link` treatment. */
export function LinkButton({
  className,
  type = "button",
  tone = "default",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { tone?: "default" | "danger" }) {
  return (
    <button
      className={cn(
        "link text-sm disabled:opacity-50",
        tone === "danger" && "text-danger decoration-danger hover:text-ink",
        className,
      )}
      type={type}
      {...props}
    />
  );
}

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Admin console building blocks on the v3 system (tokens only, no raw hex, no monospace).
 * Cards and tables: white, 1px warm line, radius 14. Table headers are 11px caps labels on white.
 */

export function AdminBody({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-col gap-6 px-[var(--page-pad-x)] pb-10 max-sm:px-4", className)} {...props} />;
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
        <Tag className="text-xl leading-[1.3] font-extrabold text-ink">{title}</Tag>
        {meta ? <span className="text-sm text-muted">{meta}</span> : null}
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
        <div className="border-b border-line px-[22px] py-[18px]">
          <SectionHeading actions={actions} meta={meta} title={title} />
        </div>
      ) : null}
      {children !== undefined ? <div className={cn("px-[22px] py-[18px]", bodyClassName)}>{children}</div> : null}
    </section>
  );
}

/** Row inside a line list: 12–14px × 18–20px, divider between rows. */
export function LineRow({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("border-b border-divider px-5 py-[13px] text-[15px] text-ink last:border-b-0", className)}
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
        "th border-b border-line bg-white px-5 py-3 text-left align-bottom whitespace-nowrap",
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
      className={cn(
        "border-t border-divider px-5 py-[13px] align-middle text-[15px] text-ink [tr:first-child>&]:border-t-0",
        className,
      )}
      {...props}
    />
  );
}

/** Secondary cell text (dates, ids, counts): 14px ink-2 with tabular numbers. No monospace in v3. */
export function Meta({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return <span className={cn("num text-sm text-ink-2", className)} {...props} />;
}

/** @deprecated v2 name; renders as {@link Meta}. */
export const Mono = Meta;

const fieldControl =
  "w-full rounded-[10px] border border-line-strong bg-white px-3.5 py-[9px] text-[15px] text-ink placeholder:text-muted disabled:bg-divider disabled:text-muted";

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

/** KPI strip: 11px caps label over a 36/800 blue numeral with an optional faint suffix. */
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
        "grid grid-cols-2 overflow-hidden rounded-[14px] border border-line bg-white sm:grid-cols-4",
        className,
      )}
    >
      {items.map((item) => (
        <div className="relative flex flex-col gap-1 border-divider px-5 py-[18px] hover:bg-bg [&+&]:border-l" key={item.label}>
          <dt className="th whitespace-nowrap">{item.label}</dt>
          <dd className="num text-4xl leading-none font-extrabold tracking-[-0.03em] text-blue">
            {item.value}
            {item.suffix !== undefined ? (
              <span className="text-base font-extrabold tracking-normal text-faint">{item.suffix}</span>
            ) : null}
          </dd>
          {item.href ? (
            // The whole tile opens the list behind the number.
            <a className="text-[12px] font-semibold text-blue no-underline after:absolute after:inset-0 hover:underline" href={item.href}>
              View list
            </a>
          ) : null}
        </div>
      ))}
    </dl>
  );
}

/** Quiet dashed aside for context the admin does not have to act on. */
export function Notice({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-[12px] border border-dashed border-line-strong px-[18px] py-4 text-sm leading-normal text-ink-2",
        className,
      )}
      {...props}
    />
  );
}

export function EmptyState({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("px-5 py-8 text-center text-sm text-muted", className)} {...props} />;
}

export function LoadingState({ label = "Loading…", className }: { label?: string; className?: string }) {
  return (
    <p aria-busy="true" className={cn("px-5 py-8 text-center text-sm text-muted", className)} role="status">
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

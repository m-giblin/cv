import * as React from "react";
import { cn } from "@/lib/utils";

type PageHeaderProps = {
  /** Blue caps eyebrow, e.g. "Week 5 of 13 / Field skills". */
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  /** One serif accent phrase per page, rendered after the title in blue italic. */
  accent?: React.ReactNode;
  subtitle?: React.ReactNode;
  /** One primary button, a view toggle, or stats. */
  actions?: React.ReactNode;
  /** Today pages use the larger 52px title. */
  size?: "default" | "hero";
  className?: string;
};

export function PageHeader({ eyebrow, title, accent, subtitle, actions, size = "default", className }: PageHeaderProps) {
  return (
    <header
      className={cn(
        "flex flex-wrap items-end justify-between gap-6 px-[var(--page-pad-x)] pt-[var(--page-pad-y)] pb-6 max-sm:px-4",
        className,
      )}
    >
      <div className="flex min-w-0 flex-col gap-3">
        {eyebrow ? <p className="label-caps label-caps--blue">{eyebrow}</p> : null}
        <h1
          className={cn(
            "page-title text-ink max-sm:text-[32px] max-sm:whitespace-normal",
            size === "hero" && "text-[52px]",
          )}
        >
          {title}
          {accent ? (
            <>
              {" "}
              <span className="page-title__accent">{accent}</span>
            </>
          ) : null}
        </h1>
        {subtitle ? <p className="max-w-[640px] text-base leading-normal text-ink-2 sm:text-lg">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-4">{actions}</div> : null}
    </header>
  );
}

/** Page body padding matching the header. Use around the main content of a page. */
export function PageBody({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("px-[var(--page-pad-x)] max-sm:px-4", className)} {...props} />;
}

/** Main column + right rail. The rail stacks under the main column on narrow screens. */
export function MainWithRail({
  children,
  rail,
  railWidth = 340,
  className,
}: {
  children: React.ReactNode;
  rail: React.ReactNode;
  railWidth?: number;
  className?: string;
}) {
  return (
    <div
      className={cn("grid items-start gap-[var(--rail-gap)] max-xl:grid-cols-1", className)}
      style={{ gridTemplateColumns: `minmax(0,1fr) ${railWidth}px` }}
    >
      <div className="flex min-w-0 flex-col gap-8">{children}</div>
      <aside className="flex min-w-0 flex-col gap-6">{rail}</aside>
    </div>
  );
}

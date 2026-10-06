"use client";

import Link from "next/link";
import { LinkPending } from "@/components/nav/link-pending";
import { cn } from "@/lib/utils";

export type TabItem = { id: string; label: string; href?: string; count?: number | string };

/** Text tabs: 28px apart, active ink 700 with a 3px blue underline. */
export function Tabs({
  items,
  value,
  onChange,
  label,
  className,
}: {
  items: TabItem[];
  value: string;
  onChange?: (id: string) => void;
  label: string;
  className?: string;
}) {
  return (
    <nav aria-label={label} className={cn("flex gap-7 overflow-x-auto border-b border-line", className)}>
      {items.map((item) => {
        const active = item.id === value;
        const cls = cn(
          "-mb-px pb-3 text-[15px] whitespace-nowrap no-underline",
          active ? "font-bold text-ink shadow-[inset_0_-3px_0_var(--color-blue)]" : "font-medium text-muted hover:text-ink",
        );
        const content = (
          <>
            {item.label}
            {item.count !== undefined ? <span className="num ml-1.5 font-medium text-muted">{item.count}</span> : null}
          </>
        );
        return item.href ? (
          <Link aria-current={active ? "page" : undefined} className={cls} href={item.href} key={item.id}>
            {content}
            <LinkPending className="ml-1.5 align-middle" />
          </Link>
        ) : (
          <button aria-pressed={active} className={cls} key={item.id} onClick={() => onChange?.(item.id)} type="button">
            {content}
          </button>
        );
      })}
    </nav>
  );
}

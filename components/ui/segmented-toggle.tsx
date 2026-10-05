"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

type Option = { id: string; label: string; href?: string };

/** Pill toggle ("LIST | CALENDAR"). Uses links when options carry hrefs, buttons otherwise. */
export function SegmentedToggle({
  options,
  value,
  onChange,
  label,
  className,
}: {
  options: Option[];
  value: string;
  onChange?: (id: string) => void;
  label: string;
  className?: string;
}) {
  return (
    <div
      aria-label={label}
      className={cn("inline-flex overflow-hidden rounded-full border-[1.5px] border-ink bg-white", className)}
      role="group"
    >
      {options.map((option) => {
        const active = option.id === value;
        const cls = cn(
          "px-4 py-1.5 font-mono text-xs font-medium uppercase no-underline",
          active ? "bg-blue text-white" : "text-ink hover:bg-blue-soft",
        );
        return option.href ? (
          <Link aria-current={active ? "page" : undefined} className={cls} href={option.href} key={option.id}>
            {option.label}
          </Link>
        ) : (
          <button aria-pressed={active} className={cls} key={option.id} onClick={() => onChange?.(option.id)} type="button">
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

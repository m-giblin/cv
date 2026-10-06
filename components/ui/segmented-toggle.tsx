"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

type Option = { id: string; label: string; href?: string };

/** View toggle: white pill, active segment ink with white text. */
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
    <div aria-label={label} className={cn("inline-flex gap-0.5 rounded-full border border-line bg-white p-[3px]", className)} role="group">
      {options.map((option) => {
        const active = option.id === value;
        const cls = cn(
          "rounded-full px-4 py-1.5 text-sm font-semibold whitespace-nowrap no-underline",
          active ? "bg-ink text-white" : "text-ink-2 hover:text-ink",
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

export { SegmentedToggle as ViewToggle };

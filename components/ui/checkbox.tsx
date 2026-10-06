"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/** 18px checkbox. Native input for keyboard and forms; drawn box for the look. */
export function Checkbox({ className, label, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label?: string }) {
  return (
    <span className={cn("relative inline-grid h-[18px] w-[18px] shrink-0", className)}>
      <input
        aria-label={label}
        className="peer absolute inset-0 m-0 cursor-pointer appearance-none rounded-[5px] border-[1.5px] border-[#B9B1A4] bg-white checked:border-blue checked:bg-blue disabled:cursor-not-allowed disabled:opacity-50"
        type="checkbox"
        {...props}
      />
      <span
        aria-hidden
        className="pointer-events-none absolute top-[3px] left-[6px] hidden h-[9px] w-[5px] rotate-45 border-r-2 border-b-2 border-white peer-checked:block"
      />
    </span>
  );
}

/** 40×22 switch. `changed` adds the amber ring for unsaved rows. */
export function Toggle({
  checked,
  onChange,
  label,
  changed = false,
  disabled = false,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  changed?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      aria-checked={checked}
      aria-label={label}
      className={cn(
        "relative h-[22px] w-10 shrink-0 rounded-full transition-colors disabled:opacity-50",
        checked ? "bg-blue" : "border-[1.5px] border-faint bg-white",
        changed && "ring-[3px] ring-signal",
      )}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      role="switch"
      type="button"
    >
      <span
        aria-hidden
        className={cn(
          "absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full transition-[left]",
          checked ? "left-[21px] bg-white" : "left-[2px] border-[1.5px] border-faint bg-white",
        )}
      />
    </button>
  );
}

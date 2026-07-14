"use client";

import { cn } from "@/lib/utils";

const ROLES = ["se", "ae", "dsr", "advisory"] as const;

export type DemoRole = (typeof ROLES)[number];

/** Design-demo role switcher (SE Experience v1). Production roles still come from auth. */
export function RoleSwitcher({
  value,
  onChange,
  className,
}: {
  value: DemoRole;
  onChange: (role: DemoRole) => void;
  className?: string;
}) {
  return (
    <div className={cn("flex border border-[#E2DFD9]", className)}>
      {ROLES.map((role) => {
        const active = value === role;
        return (
          <button
            className={cn(
              "px-2.5 py-1 font-mono text-[9.5px] font-semibold tracking-[0.04em] transition",
              active ? "bg-[#00143A] text-white" : "bg-white text-[#6B6860] hover:bg-[#F5F4F0]",
            )}
            key={role}
            onClick={() => onChange(role)}
            type="button"
          >
            {role.toUpperCase()}
          </button>
        );
      })}
    </div>
  );
}

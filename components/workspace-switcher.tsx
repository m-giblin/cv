"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  WORKSPACE_HAT_DESCRIPTIONS,
  WORKSPACE_HAT_LABELS,
  getWorkspaceHome,
  type WorkspaceHat,
} from "@/lib/auth/workspace";
import { cn } from "@/lib/utils";

export function WorkspaceSwitcher({
  hats,
  activeHat,
}: {
  hats: WorkspaceHat[];
  activeHat: WorkspaceHat;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [switching, setSwitching] = useState(false);

  if (hats.length <= 1) {
    return (
      <div className="mb-2 border border-white/[0.08] bg-white/[0.04] px-2.5 py-2">
        <p className="font-mono text-[8px] uppercase tracking-[0.1em] text-white/35">Workspace</p>
        <p className="mt-0.5 text-[11px] font-semibold text-white/85">
          {WORKSPACE_HAT_LABELS[activeHat]}
        </p>
      </div>
    );
  }

  async function switchTo(hat: WorkspaceHat) {
    if (hat === activeHat || switching) return;
    setSwitching(true);
    try {
      const response = await fetch("/api/workspace/switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hat }),
      });
      if (!response.ok) {
        setSwitching(false);
        return;
      }
      setOpen(false);
      router.push(getWorkspaceHome(hat));
      router.refresh();
    } finally {
      setSwitching(false);
    }
  }

  return (
    <div className="mb-2">
      <button
        className="flex w-full items-center justify-between border border-white/[0.08] bg-white/[0.04] px-2.5 py-2 text-left hover:bg-white/[0.07]"
        onClick={() => setOpen((value) => !value)}
        type="button"
      >
        <div className="min-w-0">
          <p className="font-mono text-[8px] uppercase tracking-[0.1em] text-white/35">Workspace</p>
          <p className="mt-0.5 truncate text-[11px] font-semibold text-white/90">
            {WORKSPACE_HAT_LABELS[activeHat]}
          </p>
        </div>
        <span className="shrink-0 font-mono text-[10px] text-white/40">{open ? "▴" : "▾"}</span>
      </button>
      {open ? (
        <div className="mt-1 border border-white/[0.08] bg-[#00102e]">
          {hats.map((hat) => (
            <button
              className={cn(
                "block w-full border-b border-white/[0.05] px-2.5 py-2 text-left last:border-b-0",
                hat === activeHat ? "bg-white/[0.08]" : "hover:bg-white/[0.05]",
              )}
              disabled={switching}
              key={hat}
              onClick={() => void switchTo(hat)}
              title={WORKSPACE_HAT_DESCRIPTIONS[hat]}
              type="button"
            >
              <p
                className={cn(
                  "text-[11px] font-semibold",
                  hat === activeHat ? "text-white" : "text-white/75",
                )}
              >
                {WORKSPACE_HAT_LABELS[hat]}
              </p>
              <p className="mt-0.5 text-[9px] leading-snug text-white/35">
                {WORKSPACE_HAT_DESCRIPTIONS[hat]}
              </p>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

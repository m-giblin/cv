"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  WORKSPACE_HAT_DESCRIPTIONS,
  WORKSPACE_HAT_LABELS,
  getWorkspaceHome,
  type WorkspaceHat,
} from "@/lib/auth/workspace";
import { cn } from "@/lib/utils";

/** Dashed pill in the top bar. Shown only to people with more than one workspace. */
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
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (hats.length <= 1) return null;

  async function switchTo(hat: WorkspaceHat) {
    if (hat === activeHat || switching) return;
    setSwitching(true);
    try {
      const response = await fetch("/api/workspace/switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hat }),
      });
      if (!response.ok) return;
      setOpen(false);
      router.push(getWorkspaceHome(hat));
      router.refresh();
    } finally {
      setSwitching(false);
    }
  }

  return (
    <div className="relative" ref={rootRef}>
      <button
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={`Workspace: ${WORKSPACE_HAT_LABELS[activeHat]}. Switch workspace`}
        className="inline-flex items-center gap-2 rounded-full border border-dashed border-[#6E8ED6] px-3.5 py-1.5 text-[13px] font-semibold whitespace-nowrap text-white hover:bg-blue-2"
        onClick={() => setOpen((value) => !value)}
        type="button"
      >
        {WORKSPACE_HAT_LABELS[activeHat]}
        <span aria-hidden className="h-1.5 w-1.5 -translate-y-0.5 rotate-45 border-r-[1.5px] border-b-[1.5px] border-white" />
      </button>
      {open ? (
        <div
          className="absolute top-[calc(100%+10px)] right-0 z-50 w-72 overflow-hidden rounded-[14px] border border-line bg-white shadow-[var(--shadow-drag)]"
          role="menu"
        >
          {hats.map((hat) => (
            <button
              className={cn(
                "block w-full border-b border-divider px-4 py-3 text-left last:border-b-0",
                hat === activeHat ? "bg-blue-soft shadow-[inset_3px_0_0_var(--color-blue)]" : "hover:bg-bg",
              )}
              disabled={switching}
              key={hat}
              onClick={() => void switchTo(hat)}
              role="menuitem"
              type="button"
            >
              <span className={cn("block text-[15px] font-bold", hat === activeHat ? "text-blue" : "text-ink")}>
                {WORKSPACE_HAT_LABELS[hat]}
              </span>
              <span className="block text-[13px] leading-snug text-muted">{WORKSPACE_HAT_DESCRIPTIONS[hat]}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

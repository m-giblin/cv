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
      <div className="rounded-[10px] border border-blue-line px-2.5 py-2">
        <p className="font-mono text-xs uppercase text-on-blue-muted">Workspace</p>
        <p className="text-sm font-semibold text-white">{WORKSPACE_HAT_LABELS[activeHat]}</p>
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
    <div>
      <button
        aria-expanded={open}
        className="flex w-full items-center justify-between rounded-[10px] border border-blue-line px-2.5 py-2 text-left hover:bg-blue-2"
        onClick={() => setOpen((value) => !value)}
        type="button"
      >
        <span className="min-w-0">
          <span className="block font-mono text-xs uppercase text-on-blue-muted">Workspace</span>
          <span className="block truncate text-sm font-semibold text-white">
            {WORKSPACE_HAT_LABELS[activeHat]}
          </span>
        </span>
        <span className="shrink-0 text-xs text-on-blue-muted">Switch</span>
      </button>
      {open ? (
        <div className="mt-1 overflow-hidden rounded-[10px] border border-blue-line bg-blue-2">
          {hats.map((hat) => (
            <button
              className={cn(
                "block w-full border-b border-blue-line px-2.5 py-2 text-left last:border-b-0",
                hat === activeHat ? "bg-blue-line" : "hover:bg-blue-line/60",
              )}
              disabled={switching}
              key={hat}
              onClick={() => void switchTo(hat)}
              type="button"
            >
              <span className="block text-sm font-semibold text-white">
                {WORKSPACE_HAT_LABELS[hat]}
              </span>
              <span className="block text-xs leading-snug text-on-blue-muted">
                {WORKSPACE_HAT_DESCRIPTIONS[hat]}
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

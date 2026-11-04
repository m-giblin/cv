"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useEffect, useRef, useState } from "react";
import {
  WORKSPACE_HAT_DESCRIPTIONS,
  WORKSPACE_HAT_LABELS,
  getWorkspaceHome,
  type WorkspaceHat,
} from "@/lib/auth/workspace";
import { cn } from "@/lib/utils";

export type MemberWorkspace = { id: string; name: string };

/**
 * Dashed pill in the top bar. Shown to people with more than one workspace hat, and to super
 * admins who belong to workspaces (listed under "Your workspaces" so one sign-in reaches them all).
 */
export function WorkspaceSwitcher({
  hats,
  activeHat,
  workspaces = [],
  activeTenantId = null,
}: {
  hats: WorkspaceHat[];
  activeHat: WorkspaceHat;
  workspaces?: MemberWorkspace[];
  /** The workspace a super admin is inside right now, if any. */
  activeTenantId?: string | null;
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

  if (hats.length <= 1 && workspaces.length === 0) return null;
  const activeWorkspace = workspaces.find((entry) => entry.id === activeTenantId) ?? null;

  async function enterWorkspace(tenantId: string) {
    if (switching) return;
    if (tenantId === activeTenantId) {
      setOpen(false);
      return;
    }
    setSwitching(true);
    try {
      const response = await fetch("/api/platform/shadow", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-requested-with": "XMLHttpRequest" },
        body: JSON.stringify({ tenantId, mode: "admin" }),
      });
      const body = (await response.json().catch(() => null)) as { error?: string; redirect?: string } | null;
      if (!response.ok) {
        toast.error(body?.error ?? "Couldn't open that workspace. Try again.");
        return;
      }
      setOpen(false);
      // A new tenant changes the whole shell (branding, people, navigation), so load it fresh.
      window.location.assign(body?.redirect ?? "/admin");
    } finally {
      setSwitching(false);
    }
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
        const body = (await response.json().catch(() => null)) as { error?: string; enter?: string } | null;
        // Entering another tenant sets cookies on a redirect, so it's a full navigation.
        if (body?.enter) {
          window.location.assign(body.enter);
          return;
        }
        toast.error(body?.error ?? "Couldn't switch workspace. Try again.");
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
    <div className="relative" ref={rootRef}>
      <button
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={`Workspace: ${WORKSPACE_HAT_LABELS[activeHat]}. Switch workspace`}
        className="inline-flex items-center gap-2 rounded-full border border-dashed border-[#6E8ED6] px-3.5 py-1.5 text-[13px] font-semibold whitespace-nowrap text-white hover:bg-blue-2"
        onClick={() => setOpen((value) => !value)}
        type="button"
      >
        {activeWorkspace ? <span className="max-w-[160px] truncate font-normal opacity-80">{activeWorkspace.name} ·</span> : null}
        {WORKSPACE_HAT_LABELS[activeHat]}
        <span aria-hidden className="h-1.5 w-1.5 -translate-y-0.5 rotate-45 border-r-[1.5px] border-b-[1.5px] border-white" />
      </button>
      {open ? (
        <div
          className="absolute top-[calc(100%+10px)] right-0 z-50 w-72 overflow-hidden rounded-[14px] border border-line bg-white shadow-[var(--shadow-drag)]"
          role="menu"
        >
          {hats.length > 1 ? hats.map((hat) => (
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
          )) : null}
          {workspaces.length > 0 ? (
            <div className={cn(hats.length > 1 && "border-t-4 border-bg")}>
              <p className="px-4 pt-3 pb-1 text-[11px] font-bold tracking-[0.08em] text-muted uppercase">Your workspaces</p>
              {workspaces.map((entry) => (
                <button
                  className={cn(
                    "block w-full px-4 py-2.5 text-left",
                    entry.id === activeTenantId ? "bg-blue-soft shadow-[inset_3px_0_0_var(--color-blue)]" : "hover:bg-bg",
                  )}
                  disabled={switching}
                  key={entry.id}
                  onClick={() => void enterWorkspace(entry.id)}
                  role="menuitem"
                  type="button"
                >
                  <span className={cn("block truncate text-[15px] font-bold", entry.id === activeTenantId ? "text-blue" : "text-ink")}>
                    {entry.name}
                  </span>
                  <span className="block text-[13px] leading-snug text-muted">
                    {entry.id === activeTenantId ? "You're here" : "Open as yourself"}
                  </span>
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

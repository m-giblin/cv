"use client";

import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Lightweight, hand-rolled confirm dialog — no Radix/shadcn dialog primitive
 * exists in this repo yet, and this is the one shared piece both platform
 * destructive-action flows (suspend, offboard) need. Kept intentionally
 * small rather than pulling in a new dependency for two call sites.
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive = false,
  busy = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onClick={onCancel}
      role="presentation"
    >
      <div
        className="w-full max-w-sm border border-[#E2DFD9] bg-white p-5 shadow-lg"
        onClick={(event) => event.stopPropagation()}
        role="alertdialog"
      >
        <h3 className="text-sm font-bold text-[#0D0E12]">{title}</h3>
        {description ? <p className="mt-1.5 text-xs leading-relaxed text-[#6B6860]">{description}</p> : null}
        <div className="mt-4 flex justify-end gap-2">
          <Button disabled={busy} onClick={onCancel} size="sm" type="button" variant="outline">
            {cancelLabel}
          </Button>
          <Button
            disabled={busy}
            onClick={onConfirm}
            size="sm"
            type="button"
            variant={destructive ? "destructive" : "default"}
          >
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

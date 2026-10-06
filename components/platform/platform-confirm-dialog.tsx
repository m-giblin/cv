"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useId, useRef } from "react";

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Confirm step for destructive tenant actions (suspend, offboard). Esc cancels, focus starts on Cancel,
 * stays inside the dialog, and returns to the trigger on close.
 */
export function PlatformConfirmDialog({
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
  const titleId = useId();
  const descriptionId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const onCancelRef = useRef(onCancel);
  onCancelRef.current = onCancel;

  useEffect(() => {
    if (!open) return;
    const trigger = document.activeElement as HTMLElement | null;
    cancelRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCancelRef.current();
        return;
      }
      if (event.key !== "Tab" || !panelRef.current) return;
      const items = [...panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)];
      if (items.length === 0) return;
      const first = items[0]!;
      const last = items[items.length - 1]!;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      trigger?.focus();
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div aria-hidden className="absolute inset-0 bg-[rgb(11_23_51/0.45)]" onClick={onCancel} />
      <div
        aria-describedby={description ? descriptionId : undefined}
        aria-labelledby={titleId}
        aria-modal="true"
        className="relative w-full max-w-md rounded-[16px] border border-line bg-white p-6 shadow-[0_24px_60px_rgb(11_23_51/0.25)]"
        ref={panelRef}
        role="alertdialog"
      >
        <h2 className="text-lg leading-[1.3] font-extrabold text-ink" id={titleId}>
          {title}
        </h2>
        {description ? (
          <p className="mt-2 text-[15px] leading-normal text-ink-2" id={descriptionId}>
            {description}
          </p>
        ) : null}
        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <button className="btn-secondary" disabled={busy} onClick={onCancel} ref={cancelRef} type="button">
            {cancelLabel}
          </button>
          <button
            className={
              destructive
                ? "inline-flex items-center gap-2 rounded-full border border-danger bg-danger px-[22px] py-2.5 text-[15px] font-bold text-white hover:bg-[color-mix(in_srgb,var(--color-danger),black_12%)] disabled:opacity-60"
                : "btn-primary inline-flex items-center gap-2"
            }
            disabled={busy}
            onClick={onConfirm}
            type="button"
          >
            {busy ? <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> : null}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

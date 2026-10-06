"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Centered modal (wizard shell): paper background, focus trap, Esc closes, focus returns to the trigger. */
export function Modal({
  open,
  onClose,
  labelledBy,
  children,
  width = 980,
  height = 700,
}: {
  open: boolean;
  onClose: () => void;
  labelledBy?: string;
  children: ReactNode;
  width?: number;
  height?: number;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const fallbackId = useId();
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const trigger = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    panel?.querySelector<HTMLElement>(FOCUSABLE)?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab" || !panel) return;
      const items = [...panel.querySelectorAll<HTMLElement>(FOCUSABLE)];
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
    <div className="fixed inset-0 z-50 grid place-items-center p-4">
      <div aria-hidden className="absolute inset-0 bg-[rgb(11_23_51/0.45)]" onClick={() => onCloseRef.current()} />
      <div
        aria-labelledby={labelledBy ?? fallbackId}
        aria-modal="true"
        className="relative flex max-h-full max-w-full flex-col overflow-hidden rounded-[16px] border border-line bg-bg shadow-[var(--shadow-modal)]"
        ref={panelRef}
        role="dialog"
        style={{ width, height }}
      >
        {children}
      </div>
    </div>
  );
}

"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** 440px side drawer: focus-trapped, Esc closes, focus returns to the trigger. */
export function Drawer({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const trigger = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    panel?.querySelector<HTMLElement>(FOCUSABLE)?.focus();

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
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
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40">
      <div aria-hidden className="absolute inset-0 bg-[rgba(10,26,63,0.25)]" onClick={onClose} />
      <div
        aria-labelledby={titleId}
        aria-modal="true"
        className="absolute inset-y-0 right-0 flex w-[440px] max-w-full flex-col border-l-[1.5px] border-ink bg-white shadow-[var(--shadow-drawer)]"
        ref={panelRef}
        role="dialog"
      >
        <div className="flex items-start justify-between gap-4 border-b border-divider px-6 py-5">
          <h2 className="text-lg font-extrabold text-ink" id={titleId}>
            {title}
          </h2>
          <button
            aria-label="Close"
            className="rounded-full px-2 text-lg text-muted hover:text-ink"
            onClick={onClose}
            type="button"
          >
            ✕
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {footer ? <div className="flex gap-3 border-t border-divider px-6 py-4">{footer}</div> : null}
      </div>
    </div>
  );
}

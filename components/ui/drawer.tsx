"use client";

import { X } from "lucide-react";
import { useEffect, useId, useRef, type ReactNode } from "react";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Workbench: the near full-screen popup every detail, review and edit view opens in
 * (side flyouts are retired). Header with title and close, a scrolling body, and a footer
 * whose first child (the primary action) sits at the far right.
 *
 * Pass `side` for a two-column workbench: `children` is the main column on paper, `side`
 * is the white working column on the right (stacks under the main column on narrow screens).
 * `size="form"` keeps the same popup but narrower, for single forms.
 *
 * Focus-trapped, Esc closes, focus returns to the trigger.
 */
export function Drawer({
  open,
  onClose,
  title,
  eyebrow,
  subtitle,
  children,
  footer,
  footerNote,
  side,
  mainLabel,
  sideLabel,
  size = "full",
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  eyebrow?: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  footerNote?: ReactNode;
  side?: ReactNode;
  mainLabel?: string;
  sideLabel?: string;
  size?: "full" | "form";
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const trigger = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    panel?.querySelector<HTMLElement>(FOCUSABLE)?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

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
      document.body.style.overflow = previousOverflow;
      trigger?.focus();
    };
  }, [open]);

  if (!open) return null;

  const isForm = size === "form";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
      <div aria-hidden className="absolute inset-0 bg-[rgb(11_23_51/0.45)]" onClick={onClose} />
      <div
        aria-labelledby={titleId}
        aria-modal="true"
        className={`relative flex max-h-full w-full flex-col overflow-hidden rounded-[16px] border border-line bg-bg shadow-[var(--shadow-modal)] ${
          isForm ? "max-w-[880px]" : "h-full max-w-[1360px]"
        }`}
        ref={panelRef}
        role="dialog"
      >
        <header className="flex shrink-0 items-start justify-between gap-6 border-b border-line bg-white px-5 py-4 sm:px-8 sm:py-5">
          <div className="flex min-w-0 flex-col gap-1.5">
            {eyebrow ? <span className="label-caps label-caps--blue">{eyebrow}</span> : null}
            <h2
              className="m-0 text-[24px] leading-[1.1] font-extrabold tracking-[-0.02em] text-ink sm:text-[28px]"
              id={titleId}
            >
              {title}
            </h2>
            {subtitle ? <div className="text-sm text-muted">{subtitle}</div> : null}
          </div>
          <button
            aria-label="Close"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-line-strong bg-white text-ink hover:border-blue hover:text-blue"
            onClick={onClose}
            type="button"
          >
            <X aria-hidden className="h-5 w-5" />
          </button>
        </header>

        {side ? (
          <div className="grid min-h-0 flex-1 overflow-y-auto lg:grid-cols-[minmax(0,1fr)_minmax(400px,500px)] lg:overflow-hidden">
            <section
              aria-label={mainLabel}
              className="flex min-w-0 flex-col gap-5 px-5 py-6 *:shrink-0 text-[15px] leading-normal text-ink-2 sm:px-8 lg:overflow-y-auto"
            >
              {mainLabel ? <p className="label-caps">{mainLabel}</p> : null}
              {children}
            </section>
            <section
              aria-label={sideLabel}
              className="flex min-w-0 flex-col gap-5 border-t border-line bg-white *:shrink-0 px-5 py-6 text-[15px] leading-normal text-ink-2 sm:px-7 lg:overflow-y-auto lg:border-t-0 lg:border-l"
            >
              {sideLabel ? <p className="label-caps">{sideLabel}</p> : null}
              {side}
            </section>
          </div>
        ) : (
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-6 sm:px-8">
            <div className={isForm ? "w-full" : "mx-auto w-full max-w-[920px]"}>{children}</div>
          </div>
        )}

        {footer || footerNote ? (
          <footer className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-line bg-white px-5 py-4 sm:px-8">
            <span className="text-[13px] text-muted">{footerNote}</span>
            <div className="flex flex-row-reverse flex-wrap items-center gap-3">{footer}</div>
          </footer>
        ) : null}
      </div>
    </div>
  );
}

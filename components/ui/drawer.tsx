"use client";

import { X } from "lucide-react";
import { createContext, useCallback, useContext, useEffect, useId, useRef, type ReactNode } from "react";

/** Open workbenches, innermost last: a popup opened from another popup must be the only one Esc and Tab act on. */
export const openStack: symbol[] = [];

/** Editors inside a workbench report unsaved text here, so closing it asks before throwing it away. */
const UnsavedContext = createContext<((key: symbol, dirty: boolean) => void) | null>(null);

/**
 * Call in any editor that sits in a workbench with `dirty` true while it holds text that isn't saved.
 * Closing the workbench (Esc, the close button or a click outside) then asks before discarding it.
 */
export function useUnsavedChanges(dirty: boolean) {
  const report = useContext(UnsavedContext);
  const key = useRef(Symbol("editor"));
  useEffect(() => {
    if (!report) return;
    const id = key.current;
    report(id, dirty);
    return () => report(id, false);
  }, [report, dirty]);
}

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
  breadcrumb,
  headerExtra,
  subtitle,
  children,
  footer,
  footerNote,
  side,
  mainLabel,
  sideLabel,
  size = "full",
  bodyWidth = "reading",
  dirty = false,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  eyebrow?: ReactNode;
  /** Replaces the eyebrow with a trail back through the views that led here. */
  breadcrumb?: ReactNode;
  /** Sits in the header's free space between the title and the close button, e.g. a stats strip. */
  headerExtra?: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  footerNote?: ReactNode;
  side?: ReactNode;
  mainLabel?: string;
  sideLabel?: string;
  size?: "full" | "form";
  /** Single-column bodies keep a reading width by default; "full" uses the whole workbench for grids. */
  bodyWidth?: "reading" | "full";
  /** The workbench's own form holds unsaved text (for forms that render this Drawer themselves). */
  dirty?: boolean;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const dirtyEditors = useRef(new Set<symbol>());
  const reportDirty = useCallback((key: symbol, dirty: boolean) => {
    if (dirty) dirtyEditors.current.add(key);
    else dirtyEditors.current.delete(key);
  }, []);
  const requestClose = useCallback(() => {
    if ((dirty || dirtyEditors.current.size > 0) && !window.confirm("You have unsaved changes. Close and discard them?")) return;
    dirtyEditors.current.clear();
    onClose();
  }, [dirty, onClose]);
  const onCloseRef = useRef(requestClose);
  onCloseRef.current = requestClose;

  useEffect(() => {
    if (!open) return;
    const self = Symbol("drawer");
    openStack.push(self);
    const trigger = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    panel?.querySelector<HTMLElement>(FOCUSABLE)?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKey = (event: KeyboardEvent) => {
      if (openStack[openStack.length - 1] !== self) return;
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
      openStack.splice(openStack.indexOf(self), 1);
      document.body.style.overflow = previousOverflow;
      trigger?.focus();
    };
  }, [open]);

  if (!open) return null;

  const isForm = size === "form";

  return (
    <UnsavedContext.Provider value={reportDirty}>
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
      <div aria-hidden className="absolute inset-0 bg-[rgb(11_23_51/0.45)]" onClick={requestClose} />
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
            {breadcrumb ? (
              <div className="label-caps label-caps--blue">{breadcrumb}</div>
            ) : eyebrow ? (
              <span className="label-caps label-caps--blue">{eyebrow}</span>
            ) : null}
            <h2
              className="m-0 text-[24px] leading-[1.1] font-extrabold tracking-[-0.02em] text-ink sm:text-[28px]"
              id={titleId}
            >
              {title}
            </h2>
            {subtitle ? <div className="text-sm text-muted">{subtitle}</div> : null}
          </div>
          {headerExtra ? <div className="ml-auto hidden min-w-0 self-center md:block">{headerExtra}</div> : null}
          <button
            aria-label="Close"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-line-strong bg-white text-ink hover:border-blue hover:text-blue"
            onClick={requestClose}
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
              className="flex min-w-0 flex-col gap-5 border-t border-line bg-bg *:shrink-0 px-5 py-6 text-[15px] leading-normal text-ink-2 sm:px-7 lg:overflow-y-auto lg:border-t-0 lg:border-l lg:shadow-[inset_1px_0_0_rgb(18_26_46/0.04)]"
            >
              {sideLabel ? <p className="label-caps">{sideLabel}</p> : null}
              {side}
            </section>
          </div>
        ) : (
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-6 sm:px-8">
            <div className={isForm || bodyWidth === "full" ? "w-full" : "mx-auto w-full max-w-[920px]"}>{children}</div>
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
    </UnsavedContext.Provider>
  );
}

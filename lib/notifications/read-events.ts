import type { Notification } from "@/lib/types";

/**
 * The shell loads notifications once and stays mounted, so the bell and the sidebar badge learn
 * about reads from this browser event instead of waiting for a reload.
 */
export const NOTIFICATIONS_READ_EVENT = "notifications:read";

export type NotificationsRead = { ids?: string[]; all?: boolean; actionUrlPrefix?: string };

export function announceNotificationsRead(detail: NotificationsRead) {
  window.dispatchEvent(new CustomEvent<NotificationsRead>(NOTIFICATIONS_READ_EVENT, { detail }));
}

/** Marks the notifications the event covers as read. */
export function applyNotificationsRead(items: Notification[], detail: NotificationsRead): Notification[] {
  const now = new Date().toISOString();
  return items.map((item) =>
    !item.readAt &&
    (detail.all ||
      detail.ids?.includes(item.id) ||
      (detail.actionUrlPrefix && item.actionUrl?.startsWith(detail.actionUrlPrefix)))
      ? { ...item, readAt: now }
      : item,
  );
}

/** Keeps a list in step with reads announced elsewhere on the page. */
export function onNotificationsRead(handler: (detail: NotificationsRead) => void) {
  const listener = (event: Event) => handler((event as CustomEvent<NotificationsRead>).detail);
  window.addEventListener(NOTIFICATIONS_READ_EVENT, listener);
  return () => window.removeEventListener(NOTIFICATIONS_READ_EVENT, listener);
}

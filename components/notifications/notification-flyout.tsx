"use client";

import { useRouter } from "next/navigation";
import { Bell, CheckCheck, Loader2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Notification } from "@/lib/types";
import { cn } from "@/lib/utils";

function NotificationList({
  items,
  onOpen,
}: {
  items: Notification[];
  onOpen: (item: Notification) => void;
}) {
  if (items.length === 0) {
    return <p className="px-4 py-8 text-center text-sm text-sp-navy-muted">No notifications yet.</p>;
  }

  return (
    <div className="max-h-[min(24rem,60vh)] space-y-2 overflow-y-auto p-3">
      {items.map((item) => (
        <button
          className={cn(
            "w-full rounded-xl border p-3 text-left text-sm transition hover:bg-sp-blue-soft/30",
            item.readAt ? "border-sp-blue/5 bg-white/50" : "border-sp-blue/15 bg-white",
          )}
          key={item.id}
          onClick={() => onOpen(item)}
          type="button"
        >
          <div className="flex items-start justify-between gap-2">
            <span className="font-semibold text-sp-navy">{item.title}</span>
            {!item.readAt ? <Badge tone="magenta">New</Badge> : null}
          </div>
          <p className="mt-1 text-xs leading-5 text-sp-navy-muted">{item.body}</p>
        </button>
      ))}
    </div>
  );
}

export function NotificationFlyout({
  notifications,
  align = "sidebar",
}: {
  notifications: Notification[];
  align?: "sidebar" | "header";
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState(notifications);
  const [isMarking, setIsMarking] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const unread = items.filter((item) => !item.readAt);

  useEffect(() => {
    setItems(notifications);
  }, [notifications]);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (
        panelRef.current &&
        !panelRef.current.contains(target) &&
        triggerRef.current &&
        !triggerRef.current.contains(target)
      ) {
        setOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  async function markRead(id: string) {
    const response = await fetch(`/api/notifications/${id}`, { method: "PATCH" });

    if (!response.ok) {
      toast.error("Could not mark as read.");
      return;
    }

    setItems((current) =>
      current.map((item) => (item.id === id ? { ...item, readAt: new Date().toISOString() } : item)),
    );
  }

  async function openNotification(item: Notification) {
    if (!item.readAt) {
      await markRead(item.id);
    }

    setOpen(false);

    if (item.actionUrl) {
      router.push(item.actionUrl);
    }
  }

  async function markAllRead() {
    setIsMarking(true);
    const response = await fetch("/api/notifications/read-all", { method: "POST" });

    if (!response.ok) {
      toast.error("Could not mark all as read.");
      setIsMarking(false);
      return;
    }

    setItems((current) =>
      current.map((item) => ({ ...item, readAt: item.readAt ?? new Date().toISOString() })),
    );
    setIsMarking(false);
  }

  return (
    <div className="relative">
      <button
        aria-expanded={open}
        aria-label={`Notifications${unread.length > 0 ? `, ${unread.length} unread` : ""}`}
        className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-sp-blue/15 bg-white text-sp-navy transition hover:bg-sp-blue-soft/40"
        onClick={() => setOpen((current) => !current)}
        ref={triggerRef}
        type="button"
      >
        <Bell className="h-4 w-4" />
        {unread.length > 0 ? (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-sp-magenta px-1 text-[10px] font-bold text-white">
            {unread.length > 9 ? "9+" : unread.length}
          </span>
        ) : null}
      </button>

      {open ? (
        <>
          <div aria-hidden className="fixed inset-0 z-40 bg-sp-navy/10 lg:bg-transparent" />
          <div
            className={cn(
              "fixed z-50 flex w-[min(22rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-sp-blue/15 bg-white shadow-xl shadow-sp-navy/10",
              align === "sidebar"
                ? "bottom-4 left-4 lg:bottom-6 lg:left-[19rem]"
                : "right-4 top-16",
            )}
            ref={panelRef}
            role="dialog"
            aria-label="Notifications"
          >
            <div className="flex items-center justify-between border-b border-sp-blue/10 px-4 py-3">
              <div>
                <p className="text-sm font-bold text-sp-navy">Notifications</p>
                {unread.length > 0 ? (
                  <p className="text-xs text-sp-navy-muted">{unread.length} unread</p>
                ) : null}
              </div>
              <div className="flex items-center gap-1">
                {unread.length > 0 ? (
                  <Button disabled={isMarking} onClick={() => void markAllRead()} size="sm" variant="ghost">
                    {isMarking ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <CheckCheck className="h-3.5 w-3.5" />
                    )}
                    <span className="sr-only sm:not-sr-only">Mark all read</span>
                  </Button>
                ) : null}
                <Button onClick={() => setOpen(false)} size="sm" variant="ghost">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <NotificationList items={items} onOpen={(item) => void openNotification(item)} />
          </div>
        </>
      ) : null}
    </div>
  );
}

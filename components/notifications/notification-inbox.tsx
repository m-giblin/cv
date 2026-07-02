"use client";

import { useRouter } from "next/navigation";
import { Bell, CheckCheck, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Notification } from "@/lib/types";

export function NotificationInbox({ notifications }: { notifications: Notification[] }) {
  const router = useRouter();
  const [items, setItems] = useState(notifications);
  const [isMarking, setIsMarking] = useState(false);

  const unread = items.filter((item) => !item.readAt);

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

    setItems((current) => current.map((item) => ({ ...item, readAt: item.readAt ?? new Date().toISOString() })));
    setIsMarking(false);
  }

  return (
    <div className="mt-4 border-t border-sp-blue/10 pt-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-sp-navy-muted">
          <Bell className="h-3.5 w-3.5" />
          Notifications
        </span>
        {unread.length > 0 ? (
          <Button disabled={isMarking} onClick={() => void markAllRead()} size="sm" variant="ghost">
            {isMarking ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCheck className="h-3 w-3" />}
            Mark all read
          </Button>
        ) : null}
      </div>
      <div className="max-h-40 space-y-2 overflow-y-auto">
        {items.length === 0 ? (
          <p className="text-xs text-sp-navy-muted">No notifications yet.</p>
        ) : (
          items.slice(0, 5).map((item) => {
            const content = (
              <>
                <div className="flex items-start justify-between gap-2">
                  <span className="font-semibold text-sp-navy">{item.title}</span>
                  {!item.readAt ? <Badge tone="magenta">New</Badge> : null}
                </div>
                <p className="mt-1 text-sp-navy-muted">{item.body}</p>
              </>
            );

            if (item.actionUrl) {
              return (
                <button
                  className="w-full rounded-xl border border-sp-blue/10 bg-white/70 p-2 text-left text-xs transition hover:bg-sp-blue-soft/30"
                  key={item.id}
                  onClick={() => void openNotification(item)}
                  type="button"
                >
                  {content}
                </button>
              );
            }

            return (
              <button
                className="w-full rounded-xl border border-sp-blue/10 bg-white/70 p-2 text-left text-xs transition hover:bg-sp-blue-soft/30"
                key={item.id}
                onClick={() => !item.readAt && void markRead(item.id)}
                type="button"
              >
                {content}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

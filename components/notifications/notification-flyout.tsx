"use client";

import { useRouter } from "next/navigation";
import { Bell, CheckCheck, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { Notification } from "@/lib/types";
import { cn } from "@/lib/utils";

function formatWhen(iso: string | null | undefined) {
 if (!iso) return null;
 return new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function NotificationList({
 items,
 onOpen,
}: {
 items: Notification[];
 onOpen: (item: Notification) => void;
}) {
 if (items.length === 0) {
 return (
 <p className="rounded-[14px] border border-dashed border-line-strong p-7 text-center text-[15px] text-muted">
 No notifications yet.
 </p>
 );
 }

 return (
 <ul className="overflow-hidden rounded-[14px] border border-line bg-white">
 {items.map((item) => (
 <li className="border-b border-divider last:border-b-0" key={item.id}>
 <button
 className={cn(
 "w-full px-5 py-3 text-left transition-colors hover:bg-blue-soft",
 !item.readAt && "bg-signal-soft",
 )}
 onClick={() => onOpen(item)}
 type="button"
 >
 <span className="flex items-start justify-between gap-3">
 <span className={cn("text-[15px] text-ink", item.readAt ? "font-semibold" : "font-bold")}>{item.title}</span>
 {!item.readAt ? (
 <span className="shrink-0 rounded-full bg-signal px-2 text-xs leading-[18px] font-medium text-ink uppercase">
 New
 </span>
 ) : null}
 </span>
 <span className="mt-0.5 block text-sm leading-normal text-ink-2">{item.body}</span>
 {formatWhen(item.createdAt) ? (
 <span className="mt-1 block text-xs text-muted">{formatWhen(item.createdAt)}</span>
 ) : null}
 </button>
 </li>
 ))}
 </ul>
 );
}

export function NotificationFlyout({
 notifications,
 appearance = "default",
}: {
 notifications: Notification[];
 /** Kept for callers; the list now opens as a workbench, so placement no longer applies. */
 align?: "sidebar" | "header";
 appearance?: "default" | "sidebar-dark" | "header";
}) {
 const router = useRouter();
 const [open, setOpen] = useState(false);
 const [items, setItems] = useState(notifications);
 const [isMarking, setIsMarking] = useState(false);
 const unread = items.filter((item) => !item.readAt);

 useEffect(() => {
 setItems(notifications);
 }, [notifications]);

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

 const onDark = appearance === "sidebar-dark";

 return (
 <>
 <button
 aria-haspopup="dialog"
 aria-label={`Notifications${unread.length > 0 ? `, ${unread.length} unread` : ""}`}
 className={cn(
 "relative grid h-9 w-9 shrink-0 place-items-center rounded-[10px] transition-colors",
 onDark
 ? "text-on-blue hover:bg-blue-2 hover:text-white"
 : "border-[1.5px] border-ink bg-white text-ink hover:bg-blue-soft",
 )}
 onClick={() => setOpen(true)}
 type="button"
 >
 <Bell aria-hidden className="h-[18px] w-[18px]" strokeWidth={1.75} />
 {unread.length > 0 ? (
 onDark ? (
 <span aria-hidden className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full border-[1.5px] border-blue bg-signal" />
 ) : (
 <span
 aria-hidden
 className="absolute -top-1 -right-1 min-w-[18px] rounded-full bg-signal px-1 text-center text-xs leading-[18px] font-bold text-ink ring-2 ring-white"
 >
 {unread.length > 9 ? "9+" : unread.length}
 </span>
 )
 ) : null}
 </button>

 <Drawer
 eyebrow="Inbox"
 footer={
 unread.length > 0 ? (
 <Button disabled={isMarking} onClick={() => void markAllRead()} variant="primary">
 {isMarking ? (
 <Loader2 aria-hidden className="h-3.5 w-3.5 animate-spin" />
 ) : (
 <CheckCheck aria-hidden className="h-3.5 w-3.5" />
 )}
 Mark all read
 </Button>
 ) : null
 }
 onClose={() => setOpen(false)}
 open={open}
 size="form"
 subtitle={unread.length > 0 ? `${unread.length} unread` : "You're all caught up."}
 title="Notifications"
 >
 <NotificationList items={items} onOpen={(item) => void openNotification(item)} />
 </Drawer>
 </>
 );
}

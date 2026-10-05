"use client";

import { useRouter } from "next/navigation";
import { Bell, CheckCheck, Loader2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
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
 return <p className="px-5 py-8 text-center text-sm text-muted">No notifications yet.</p>;
 }

 return (
 <ul className="max-h-[min(26rem,60vh)] overflow-y-auto">
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
 <span className="shrink-0 rounded-full bg-signal px-2 font-mono text-xs leading-[18px] font-medium text-ink uppercase">
 New
 </span>
 ) : null}
 </span>
 <span className="mt-0.5 block text-sm leading-normal text-ink-2">{item.body}</span>
 {formatWhen(item.createdAt) ? (
 <span className="mt-1 block font-mono text-xs text-muted">{formatWhen(item.createdAt)}</span>
 ) : null}
 </button>
 </li>
 ))}
 </ul>
 );
}

export function NotificationFlyout({
 notifications,
 align = "sidebar",
 appearance = "default",
}: {
 notifications: Notification[];
 align?: "sidebar" | "header";
 appearance?: "default" | "sidebar-dark" | "header";
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

 const onDark = appearance === "sidebar-dark";

 return (
 <div className="relative">
 <button
 aria-expanded={open}
 aria-haspopup="dialog"
 aria-label={`Notifications${unread.length > 0 ? `, ${unread.length} unread` : ""}`}
 className={cn(
 "relative grid h-9 w-9 shrink-0 place-items-center rounded-[10px] transition-colors",
 onDark
 ? "text-on-blue hover:bg-blue-2 hover:text-white"
 : "border-[1.5px] border-ink bg-white text-ink hover:bg-blue-soft",
 )}
 onClick={() => setOpen((current) => !current)}
 ref={triggerRef}
 type="button"
 >
 <Bell aria-hidden className="h-[18px] w-[18px]" strokeWidth={1.75} />
 {unread.length > 0 ? (
 <span
 aria-hidden
 className={cn(
 "absolute -top-1 -right-1 min-w-[18px] rounded-full bg-signal px-1 text-center font-mono text-xs leading-[18px] font-medium text-ink",
 onDark ? "ring-2 ring-blue" : "ring-2 ring-white",
 )}
 >
 {unread.length > 9 ? "9+" : unread.length}
 </span>
 ) : null}
 </button>

 {open ? (
 <>
 <div aria-hidden className="fixed inset-0 z-40 bg-[rgba(10,26,63,0.25)] lg:bg-transparent" />
 <div
 aria-label="Notifications"
 className={cn(
 "fixed z-50 flex w-[min(24rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-[14px] border-[1.5px] border-ink bg-white text-ink",
 align === "sidebar" ? "bottom-4 left-4 lg:bottom-6 lg:left-[calc(var(--rail-width)+12px)]" : "top-16 right-4",
 )}
 ref={panelRef}
 role="dialog"
 >
 <div className="flex items-center justify-between gap-3 border-b border-divider px-5 py-3.5">
 <div>
 <p className="text-lg leading-[1.3] font-extrabold">Notifications</p>
 {unread.length > 0 ? <p className="label-mono">{unread.length} unread</p> : null}
 </div>
 <div className="flex items-center gap-2">
 {unread.length > 0 ? (
 <button
 className="link inline-flex items-center gap-1.5 text-sm disabled:opacity-60"
 disabled={isMarking}
 onClick={() => void markAllRead()}
 type="button"
 >
 {isMarking ? (
 <Loader2 aria-hidden className="h-3.5 w-3.5 animate-spin" />
 ) : (
 <CheckCheck aria-hidden className="h-3.5 w-3.5" />
 )}
 Mark all read
 </button>
 ) : null}
 <button
 aria-label="Close notifications"
 className="grid h-8 w-8 place-items-center rounded-full text-muted hover:bg-blue-soft hover:text-ink"
 onClick={() => setOpen(false)}
 type="button"
 >
 <X aria-hidden className="h-4 w-4" />
 </button>
 </div>
 </div>

 <NotificationList items={items} onOpen={(item) => void openNotification(item)} />
 </div>
 </>
 ) : null}
 </div>
 );
}

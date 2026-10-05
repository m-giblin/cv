"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, KeyRound, LogOut, UserCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { AUTH_ROUTES } from "@/lib/auth/routes";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/types";
import { cn, initials } from "@/lib/utils";

type MenuItem = {
 label: string;
 href?: string;
 icon: typeof UserCircle;
 onClick?: () => void;
 destructive?: boolean;
};

export function UserAccountMenu({
 currentUser,
 appearance = "header",
}: {
 currentUser: Profile;
 appearance?: "header" | "sidebar-dark";
}) {
 const router = useRouter();
 const [open, setOpen] = useState(false);
 const [isSigningOut, setIsSigningOut] = useState(false);
 const panelRef = useRef<HTMLDivElement>(null);
 const triggerRef = useRef<HTMLButtonElement>(null);

 useEffect(() => {
 if (!open) return;

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
 if (event.key === "Escape") setOpen(false);
 }

 document.addEventListener("mousedown", handleClickOutside);
 document.addEventListener("keydown", handleEscape);
 return () => {
 document.removeEventListener("mousedown", handleClickOutside);
 document.removeEventListener("keydown", handleEscape);
 };
 }, [open]);

 async function handleSignOut() {
 setIsSigningOut(true);
 const supabase = createClient();
 if (supabase) {
 await supabase.auth.signOut();
 }
 router.push(AUTH_ROUTES.login);
 router.refresh();
 }

 const items: MenuItem[] = [
 { label: "Account", href: "/account", icon: UserCircle },
 { label: "Change password", href: "/account/change-password", icon: KeyRound },
 { label: "Sign out", icon: LogOut, onClick: () => void handleSignOut(), destructive: true },
 ];

 const isSidebar = appearance === "sidebar-dark";

 return (
 <div className="relative min-w-0 flex-1">
 <button
 aria-expanded={open}
 aria-haspopup="menu"
 aria-label={`Account menu for ${currentUser.fullName}`}
 className={cn(
 "flex w-full min-w-0 items-center gap-2.5 rounded-[10px] px-1.5 py-1.5 text-left transition-colors",
 isSidebar ? "hover:bg-blue-2" : "hover:bg-blue-soft",
 )}
 onClick={() => setOpen((current) => !current)}
 ref={triggerRef}
 type="button"
 >
 <span
 aria-hidden
 className={cn(
 "grid h-[30px] w-[30px] shrink-0 place-items-center rounded-full text-xs font-bold",
 isSidebar ? "bg-blue-soft text-blue" : "bg-blue text-white",
 )}
 >
 {initials(currentUser.fullName)}
 </span>
 <span className={cn("min-w-0 flex-1", isSidebar ? "block" : "hidden sm:block")}>
 <span className={cn("block truncate text-sm font-semibold", isSidebar ? "text-white" : "text-ink")}>
 {currentUser.fullName}
 </span>
 <span className={cn("block truncate font-mono text-xs", isSidebar ? "text-on-blue-muted" : "text-muted")}>
 {currentUser.email}
 </span>
 </span>
 <ChevronDown
 aria-hidden
 className={cn(
 "h-4 w-4 shrink-0 transition-transform",
 isSidebar ? "text-on-blue-muted" : "text-muted",
 open && "rotate-180",
 )}
 />
 </button>

 {open ? (
 <>
 <div aria-hidden className="fixed inset-0 z-40 bg-[rgba(10,26,63,0.25)] lg:bg-transparent" />
 <div
 aria-label="Account menu"
 className={cn(
 "absolute z-50 w-[min(15rem,calc(100vw-2rem))] overflow-hidden rounded-[14px] border-[1.5px] border-ink bg-white",
 isSidebar ? "bottom-full left-0 mb-2" : "top-[calc(100%+6px)] right-0",
 )}
 ref={panelRef}
 role="menu"
 >
 <div className="border-b border-divider px-4 py-3">
 <p className="truncate text-sm font-bold text-ink">{currentUser.fullName}</p>
 <p className="truncate font-mono text-xs text-muted">{currentUser.email}</p>
 </div>
 <div className="p-1.5">
 {items.map((item) => {
 const Icon = item.icon;
 const className = cn(
 "flex w-full items-center gap-2.5 rounded-[10px] px-3 py-2 text-left text-sm font-semibold transition-colors",
 item.destructive ? "text-danger hover:bg-danger-soft" : "text-ink hover:bg-blue-soft",
 );

 if (item.href) {
 return (
 <Link
 className={className}
 href={item.href}
 key={item.label}
 onClick={() => setOpen(false)}
 role="menuitem"
 >
 <Icon aria-hidden className="h-4 w-4 shrink-0" />
 {item.label}
 </Link>
 );
 }

 return (
 <button
 className={className}
 disabled={isSigningOut && item.destructive}
 key={item.label}
 onClick={() => {
 setOpen(false);
 item.onClick?.();
 }}
 role="menuitem"
 type="button"
 >
 <Icon aria-hidden className="h-4 w-4 shrink-0" />
 {isSigningOut && item.destructive ? "Signing out…" : item.label}
 </button>
 );
 })}
 </div>
 </div>
 </>
 ) : null}
 </div>
 );
}

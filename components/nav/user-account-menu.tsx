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
 <div className="relative">
 <button
 aria-expanded={open}
 aria-haspopup="menu"
 aria-label={`Account menu for ${currentUser.fullName}`}
 className={cn(
 "flex max-w-[220px] items-center gap-2 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0071ce]",
 isSidebar
 ? "min-w-0 flex-1 px-0 py-0 text-left hover:bg-white/[0.06]"
 : "px-1.5 py-1 hover:bg-[#F5F4F0]",
 )}
 onClick={() => setOpen((current) => !current)}
 ref={triggerRef}
 type="button"
 >
 <span
 className={cn(
 "flex shrink-0 items-center justify-center rounded-full font-bold text-white",
 isSidebar ? "h-[34px] w-[34px] text-xs" : "h-8 w-8 text-[11px]",
 )}
 style={{
 background: isSidebar
 ? "linear-gradient(135deg, #0057a8, #cd27b0)"
 : "linear-gradient(135deg, #0033a1, #cc27b0)",
 }}
 >
 {initials(currentUser.fullName)}
 </span>
 <span className={cn("min-w-0 flex-1", isSidebar ? "block" : "hidden sm:block")}>
 <span
 className={cn(
 "block truncate font-semibold",
 isSidebar ? "text-xs text-white/90" : "text-[12px] text-[#0D0E12]",
 )}
 >
 {currentUser.fullName}
 </span>
 {!isSidebar ? (
 <span className="block truncate text-[10px] text-[#A09D98]">{currentUser.email}</span>
 ) : (
 <span className="block truncate text-[10px] text-white/40">{currentUser.email}</span>
 )}
 </span>
 <ChevronDown
 className={cn(
 "h-3.5 w-3.5 shrink-0 transition",
 isSidebar ? "text-white/40" : "text-[#A09D98]",
 open && "rotate-180",
 )}
 />
 </button>

 {open ? (
 <>
 <div aria-hidden className="fixed inset-0 z-40 bg-sp-navy/10 lg:bg-transparent" />
 <div
 aria-label="Account menu"
 className={cn(
 "absolute z-50 w-[min(15rem,calc(100vw-2rem))] overflow-hidden border bg-white shadow-sp-navy/10",
 isSidebar
 ? "bottom-full left-0 mb-2 border-white/10"
 : "right-0 top-[calc(100%+6px)] border-[#E2DFD9]",
 )}
 ref={panelRef}
 role="menu"
 >
 <div className="border-b border-[#ECEAE6] px-3 py-2.5">
 <p className="truncate text-[12px] font-semibold text-[#0D0E12]">{currentUser.fullName}</p>
 <p className="truncate text-[10.5px] text-[#A09D98]">{currentUser.email}</p>
 </div>
 <div className="p-1">
 {items.map((item) => {
 const Icon = item.icon;
 const className = cn(
 "flex w-full items-center gap-2 px-2.5 py-2 text-left text-[12px] font-semibold transition",
 item.destructive
 ? "text-[#dc2626] hover:bg-[#fef2f2]"
 : "text-[#3D3C38] hover:bg-[#F5F4F0]",
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
 <Icon className="h-4 w-4 shrink-0 opacity-70" />
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
 <Icon className="h-4 w-4 shrink-0 opacity-70" />
 {item.label}
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

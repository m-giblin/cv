"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bot, Clapperboard, Sparkles, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

const PRACTICE_LINKS = [
  { href: "/simulations?focus=simulation", label: "Sim", icon: Bot },
  { href: "/challenges", label: "Challenge", icon: Zap },
  { href: "/prep", label: "Prep", icon: Sparkles },
  { href: "/pitch", label: "Pitch", icon: Clapperboard },
];

export function MobilePracticeShell() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Mobile practice"
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-[#e2eaf5] bg-white/95 px-2 pb-[env(safe-area-inset-bottom)] pt-2 backdrop-blur md:hidden"
    >
      <div className="mx-auto flex max-w-lg justify-around gap-1">
        {PRACTICE_LINKS.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href.split("?")[0]}/`);
          const Icon = item.icon;
          return (
            <Link
              className={cn(
                "flex min-w-[72px] flex-col items-center gap-1 rounded-lg px-2 py-2 text-[10px] font-semibold",
                active ? "text-[#0071ce]" : "text-slate-500",
              )}
              href={item.href}
              key={item.href}
            >
              <Icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

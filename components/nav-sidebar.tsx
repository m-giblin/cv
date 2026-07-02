"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  BookOpen,
  Bot,
  BrainCircuit,
  ClipboardCheck,
  LayoutDashboard,
  MessageSquare,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  Trophy,
  UserCircle,
  Users,
} from "lucide-react";
import { getNavItemsForTier, type AccessTier } from "@/lib/auth/rbac";
import { cn } from "@/lib/utils";

const iconMap = {
  dashboard: LayoutDashboard,
  manager: Users,
  development: Target,
  prep: Sparkles,
  certifications: Trophy,
  resources: BookOpen,
  feedback: MessageSquare,
  growth: TrendingUp,
  plans: ClipboardCheck,
  challenges: BrainCircuit,
  simulations: Bot,
  admin: ShieldCheck,
  account: UserCircle,
};

export function NavSidebar({ tier }: { tier: AccessTier }) {
  const pathname = usePathname();
  const navItems = getNavItemsForTier(tier);

  return (
    <nav className="mt-8 space-y-1">
      {navItems.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icon = iconMap[item.icon];

        return (
          <Link
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition",
              active
                ? "sp-nav-active"
                : "text-sp-navy-muted hover:bg-white/70 hover:text-sp-navy",
            )}
            href={item.href}
            key={item.href}
          >
            <Icon className={cn("h-4 w-4", active ? "text-sp-blue" : "text-sp-navy-muted")} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function NavMobile({ tier }: { tier: AccessTier }) {
  const pathname = usePathname();
  const navItems = getNavItemsForTier(tier);

  return (
    <nav className="mt-3 flex gap-2 overflow-x-auto pb-1">
      {navItems.map((item) => {
        const active = pathname === item.href;

        return (
          <Link
            className={cn(
              "whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold transition",
              active
                ? "bg-sp-blue text-white shadow-sm shadow-sp-blue/25"
                : "bg-sp-blue-soft text-sp-blue-deep",
            )}
            href={item.href}
            key={item.href}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export { Activity };

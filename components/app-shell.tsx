import Link from "next/link";
import { ReactNode } from "react";
import {
  Activity,
  Bot,
  BrainCircuit,
  ClipboardCheck,
  LayoutDashboard,
  ShieldCheck,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getDashboardData } from "@/lib/demo-data";
import { initials } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "SE Dashboard", icon: LayoutDashboard },
  { href: "/manager", label: "Manager", icon: Users },
  { href: "/plans", label: "Plans", icon: ClipboardCheck },
  { href: "/challenges", label: "Challenges", icon: BrainCircuit },
  { href: "/simulations", label: "Simulations", icon: Bot },
  { href: "/admin", label: "Admin", icon: ShieldCheck },
];

export function AppShell({ children }: { children: ReactNode }) {
  const { currentUser, notifications } = getDashboardData();
  const unread = notifications.filter((notification) => !notification.readAt).length;

  return (
    <div className="min-h-screen bg-slate-50">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-72 border-r border-slate-200 bg-white p-6 lg:block">
        <Link className="flex items-center gap-3" href="/dashboard">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600 text-lg font-bold text-white">
            SE
          </span>
          <span>
            <span className="block text-sm font-semibold text-slate-950">SE Enablement</span>
            <span className="block text-xs text-slate-500">SailPoint internal MVP</span>
          </span>
        </Link>

        <nav className="mt-10 space-y-1">
          {navItems.map((item) => (
            <Link
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-950"
              href={item.href}
              key={item.href}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="absolute bottom-6 left-6 right-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-sm font-bold text-white">
              {initials(currentUser.fullName)}
            </span>
            <div>
              <p className="text-sm font-semibold text-slate-950">{currentUser.fullName}</p>
              <p className="text-xs capitalize text-slate-500">{currentUser.role.replaceAll("_", " ")}</p>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
            <span className="inline-flex items-center gap-1">
              <Activity className="h-3.5 w-3.5" />
              Notifications
            </span>
            <Badge tone={unread > 0 ? "blue" : "slate"}>{unread} unread</Badge>
          </div>
        </div>
      </aside>

      <div className="lg:pl-72">
        <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur lg:hidden">
          <div className="flex items-center justify-between">
            <Link className="font-semibold text-slate-950" href="/dashboard">
              SE Enablement
            </Link>
            <Badge tone="blue">{unread} alerts</Badge>
          </div>
          <nav className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {navItems.map((item) => (
              <Link
                className="whitespace-nowrap rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700"
                href={item.href}
                key={item.href}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </header>

        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}

import Link from "next/link";
import type { LucideIcon } from "lucide-react";

export const NS_PRIMARY = "#0033a1";

export type NorthstarRole = "se" | "manager" | "admin";

export type NorthstarNavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  mockActive?: boolean;
};

export function NorthstarBackground() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <svg className="absolute right-0 top-0 h-[280px] w-[55%] opacity-20" preserveAspectRatio="none" viewBox="0 0 720 420" fill="none">
        <path d="M0 280C120 220 240 320 360 260C480 200 600 300 720 240V420H0V280Z" fill="url(#wave-blue)" />
        <defs>
          <linearGradient id="wave-blue" x1="0" x2="720" y1="0" y2="420">
            <stop stopColor="#0033a1" stopOpacity="0.08" />
            <stop offset="1" stopColor="#FDFBF7" stopOpacity="0" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}

export function NorthstarRoleSwitcher({ role }: { role: NorthstarRole }) {
  return (
    <div className="flex flex-wrap items-center rounded-lg border border-stone-200 bg-[#FDFBF7] p-0.5">
      <Link
        className={`rounded-md px-2 py-1 text-[10px] font-semibold transition sm:px-2.5 ${
          role === "se" ? "bg-[#0033a1] text-white" : "text-stone-600 hover:text-stone-900"
        }`}
        href="/design/northstar"
      >
        SE
      </Link>
      <Link
        className={`rounded-md px-2 py-1 text-[10px] font-semibold transition sm:px-2.5 ${
          role === "manager" ? "bg-[#0033a1] text-white" : "text-stone-600 hover:text-stone-900"
        }`}
        href="/design/northstar/manager"
      >
        Manager
      </Link>
      <Link
        className={`rounded-md px-2 py-1 text-[10px] font-semibold transition sm:px-2.5 ${
          role === "admin" ? "bg-[#0033a1] text-white" : "text-stone-600 hover:text-stone-900"
        }`}
        href="/design/northstar/admin"
      >
        Admin
      </Link>
    </div>
  );
}

export function NorthstarShell({
  role,
  userLine,
  navItems,
  toolbar,
  workspaceHeader,
  children,
}: {
  role: NorthstarRole;
  userLine: string;
  navItems: NorthstarNavItem[];
  toolbar?: React.ReactNode;
  workspaceHeader: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="design-northstar relative min-h-screen font-[family-name:var(--font-ns-body)]">
      <NorthstarBackground />
      <div className="relative z-10 flex min-h-screen flex-col">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-200/80 bg-white/90 px-4 py-2 lg:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#0033a1] text-xs font-bold text-white">
              SE
            </div>
            <div>
              <p className="text-sm font-bold text-stone-900">SE Enablement</p>
              <p className="text-[10px] text-stone-500">{userLine}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <NorthstarRoleSwitcher role={role} />
            {role === "manager" ? (
              <span className="rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-[10px] font-semibold text-violet-800">
                flag: manager_home
              </span>
            ) : null}
            {role === "admin" ? (
              <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-900">
                flag: admin_home
              </span>
            ) : null}
            {toolbar}
            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
              AAL2
            </span>
            <Link className="text-xs text-stone-500 hover:text-[#0033a1]" href="/design">
              Lab
            </Link>
          </div>
        </div>

        <nav className="border-b border-stone-200/80 bg-[#FDFBF7]/95 px-4 lg:px-6">
          <div className="flex gap-1 overflow-x-auto py-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition ${
                    item.mockActive
                      ? "bg-[#e8f2fc] text-[#0033a1]"
                      : "text-stone-600 hover:bg-white hover:text-stone-900"
                  }`}
                  href={item.href}
                  key={item.label}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </nav>

        <header className="border-b border-stone-200/80 bg-white/60 px-4 py-3 lg:px-6">{workspaceHeader}</header>

        <main className="flex-1 overflow-y-auto p-4 lg:p-5 xl:p-6">{children}</main>
      </div>
    </div>
  );
}

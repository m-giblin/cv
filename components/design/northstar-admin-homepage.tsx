"use client";

import Link from "next/link";
import {
  BarChart3,
  BookOpen,
  Bot,
  BrainCircuit,
  ChevronRight,
  ClipboardCheck,
  FileText,
  KeyRound,
  LayoutDashboard,
  ShieldCheck,
  Sparkles,
  Trophy,
  Upload,
  UserCog,
  Users,
} from "lucide-react";
import { MOCK_TEAM } from "@/components/design/mock-data";
import { NorthstarShell } from "@/components/design/northstar-shell";

const ADMIN_NAV = [
  { label: "Admin", href: "/design/northstar/admin", icon: ShieldCheck, mockActive: true },
  { label: "Team", href: "/manager", icon: Users },
  { label: "Plans", href: "/plans", icon: ClipboardCheck },
  { label: "Console", href: "/admin", icon: LayoutDashboard },
  { label: "Deal Prep", href: "/prep", icon: Sparkles },
  { label: "Simulations", href: "/simulations", icon: Bot },
  { label: "Challenges", href: "/challenges", icon: BrainCircuit },
  { label: "Resources", href: "/resources", icon: BookOpen },
  { label: "Certifications", href: "/certifications", icon: Trophy },
];

const ADMIN_SHORTCUTS = [
  { label: "Users & roles", desc: "Invite, assign manager, bulk import", href: "/admin", icon: UserCog, tab: "users" },
  { label: "Plan templates", desc: "Ramp library & assignments", href: "/admin", icon: ClipboardCheck, tab: "plans" },
  { label: "AI & sim templates", desc: "Provider keys, personas", href: "/admin", icon: KeyRound, tab: "ai" },
  { label: "Content assets", desc: "Resources library CMS", href: "/admin", icon: BookOpen, tab: "corpus" },
  { label: "Audit log", desc: "Security & compliance trail", href: "/admin", icon: FileText, tab: "audit" },
  { label: "Analytics", desc: "Adoption, completions, export CSV", href: "/admin", icon: BarChart3, tab: "analytics" },
];

const AUDIT_EVENTS = [
  { event: "User role changed → manager", actor: "Admin", time: "1h ago" },
  { event: "Plan template published · Week 3", actor: "Admin", time: "3h ago" },
  { event: "Bulk import · 5 users", actor: "Admin", time: "Yesterday" },
  { event: "AAL2 policy enforced", actor: "System", time: "Mon" },
];

const ORG_RAMP = [
  { manager: "Alex Rivera", ses: 3, avgProgress: 66, activePlans: 3 },
  { manager: "Morgan Lee", ses: 5, avgProgress: 74, activePlans: 4 },
  { manager: "Chris Patel", ses: 2, avgProgress: 81, activePlans: 2 },
];

/** Mock AI telemetry — production would come from usage logs / provider billing. */
const AI_USAGE = {
  requests30d: 1847,
  requestsToday: 62,
  tokens30d: "2.1M",
  model: "grok-3-mini",
  trend: "+12%",
  byFeature: [
    { label: "Sim roleplay turns", count: 1203 },
    { label: "Deal prep briefs", count: 412 },
    { label: "Objection practice", count: 232 },
  ],
};

export function NorthstarAdminHomepage() {
  return (
    <NorthstarShell
      navItems={ADMIN_NAV}
      role="admin"
      userLine="Director Enablement · Admin"
      workspaceHeader={
        <div className="flex flex-wrap items-center justify-between gap-x-8 gap-y-2">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-[#0033a1]">Platform admin</p>
            <h1 className="font-[family-name:var(--font-ns-display)] text-xl font-bold text-stone-900 sm:text-2xl">
              Organization command center
            </h1>
            <p className="text-sm text-stone-600">47 users · 9 active onboarding ramps · enablement health at a glance</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <div className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-center">
              <p className="text-[10px] font-medium uppercase text-stone-500">SEs</p>
              <p className="font-[family-name:var(--font-ns-display)] text-xl font-bold text-stone-900">32</p>
            </div>
            <div className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-center">
              <p className="text-[10px] font-medium uppercase text-stone-500">Managers</p>
              <p className="font-[family-name:var(--font-ns-display)] text-xl font-bold text-stone-900">8</p>
            </div>
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-center">
              <p className="text-[10px] font-medium uppercase text-emerald-800">MFA</p>
              <p className="font-[family-name:var(--font-ns-display)] text-xl font-bold text-emerald-900">94%</p>
            </div>
            <div className="rounded-lg border border-[#0033a1]/20 bg-[#e8f2fc]/50 px-3 py-2 text-center">
              <p className="text-[10px] font-medium uppercase text-[#0033a1]">Sims (30d)</p>
              <p className="font-[family-name:var(--font-ns-display)] text-xl font-bold text-[#0033a1]">218</p>
            </div>
            <Link
              className="rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-center transition hover:border-violet-300 hover:bg-violet-100/80"
              href="/admin"
              title="View AI provider settings and usage"
            >
              <p className="text-[10px] font-medium uppercase text-violet-800">AI requests</p>
              <p className="font-[family-name:var(--font-ns-display)] text-xl font-bold text-violet-900">
                {AI_USAGE.requests30d.toLocaleString()}
              </p>
              <p className="text-[9px] font-medium text-violet-700">
                30d · {AI_USAGE.requestsToday} today
              </p>
            </Link>
            <div className="rounded-lg border border-violet-200/80 bg-white px-3 py-2 text-center">
              <p className="text-[10px] font-medium uppercase text-violet-700">AI tokens</p>
              <p className="font-[family-name:var(--font-ns-display)] text-xl font-bold text-violet-900">
                {AI_USAGE.tokens30d}
              </p>
              <p className="text-[9px] font-medium text-violet-600">
                30d · {AI_USAGE.trend} vs prior
              </p>
            </div>
          </div>
        </div>
      }
    >
      <div className="grid grid-cols-12 gap-4 xl:gap-5">
        {/* Do this now */}
        <div className="ns-card ns-card-primary col-span-12 p-4 lg:col-span-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <span className="inline-block rounded-full bg-[#0033a1]/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#0033a1]">
                Do this now
              </span>
              <h2 className="mt-1.5 font-[family-name:var(--font-ns-display)] text-lg font-bold text-stone-900">
                Complete bulk user import
              </h2>
              <p className="mt-1 text-xs text-stone-600">5 rows pending role assignment · CSV uploaded yesterday</p>
            </div>
            <Link
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-[#0033a1] px-4 py-2 text-sm font-semibold text-white hover:bg-[#002878]"
              href="/admin"
            >
              <Upload className="h-4 w-4" />
              Review import
            </Link>
          </div>
        </div>

        {/* Admin console shortcuts */}
        <div className="ns-card ns-card-lavender col-span-12 p-4 lg:col-span-5">
          <h2 className="text-sm font-bold text-stone-900">Admin console</h2>
          <p className="text-xs text-stone-500">Jump to production tabs — same areas as /admin</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {ADMIN_SHORTCUTS.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  className="flex items-start gap-2.5 rounded-lg border border-stone-200 bg-white px-3 py-2.5 transition hover:border-[#0033a1]/25 hover:bg-[#e8f2fc]/40"
                  href={item.href}
                  key={item.label}
                >
                  <Icon className="mt-0.5 h-4 w-4 shrink-0 text-[#0033a1]" />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-stone-900">{item.label}</p>
                    <p className="text-[10px] leading-snug text-stone-500">{item.desc}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Platform health */}
        <div className="col-span-12 grid grid-cols-2 gap-3 lg:col-span-3 lg:grid-cols-1">
          <div className="ns-card ns-card-blue p-4">
            <p className="text-[10px] font-medium uppercase text-stone-500">Avg ramp progress</p>
            <p className="mt-1 font-[family-name:var(--font-ns-display)] text-2xl font-bold text-stone-900">71%</p>
            <p className="text-[10px] text-stone-500">Across active plans</p>
          </div>
          <div className="ns-card ns-card-sage p-4">
            <p className="text-[10px] font-medium uppercase text-stone-500">Reviews pending</p>
            <p className="mt-1 font-[family-name:var(--font-ns-display)] text-2xl font-bold text-stone-900">14</p>
            <Link className="mt-1 text-[11px] font-semibold text-[#0033a1] hover:underline" href="/manager">
              Org-wide →
            </Link>
          </div>
          <div className="ns-card ns-card-peach col-span-2 p-4 lg:col-span-1">
            <p className="text-[10px] font-medium uppercase text-violet-700">AI usage · 30 days</p>
            <p className="mt-1 text-sm font-semibold text-stone-900">{AI_USAGE.model}</p>
            <p className="text-[10px] text-emerald-700">Connected · keys in env</p>
            <ul className="mt-3 space-y-1.5 border-t border-stone-200/80 pt-2">
              {AI_USAGE.byFeature.map((row) => (
                <li className="flex justify-between text-[11px]" key={row.label}>
                  <span className="text-stone-600">{row.label}</span>
                  <span className="font-semibold text-violet-900">{row.count.toLocaleString()} req</span>
                </li>
              ))}
            </ul>
            <Link className="mt-2 inline-block text-[11px] font-semibold text-[#0033a1] hover:underline" href="/admin">
              AI settings →
            </Link>
          </div>
        </div>

        {/* Org ramp by manager */}
        <div className="ns-card col-span-12 border border-stone-200 bg-white p-4 lg:col-span-7">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-bold text-stone-900">Onboarding by manager</h2>
            <Link className="text-xs font-semibold text-[#0033a1] hover:underline" href="/admin">
              Analytics export →
            </Link>
          </div>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[480px] text-left text-sm">
              <thead>
                <tr className="border-b border-stone-200 text-[10px] font-semibold uppercase tracking-wide text-stone-500">
                  <th className="pb-2 pr-4">Manager</th>
                  <th className="pb-2 pr-4">SEs</th>
                  <th className="pb-2 pr-4">Active plans</th>
                  <th className="pb-2">Avg progress</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {ORG_RAMP.map((row) => (
                  <tr key={row.manager}>
                    <td className="py-2.5 pr-4 font-semibold text-stone-900">{row.manager}</td>
                    <td className="py-2.5 pr-4 text-stone-700">{row.ses}</td>
                    <td className="py-2.5 pr-4 text-stone-700">{row.activePlans}</td>
                    <td className="py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-20 overflow-hidden rounded-full bg-[#e8f2fc]">
                          <div className="h-full bg-[#0033a1]" style={{ width: `${row.avgProgress}%` }} />
                        </div>
                        <span className="text-xs">{row.avgProgress}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Sample SE roster (Alex's team) */}
        <div className="ns-card ns-card-blue col-span-12 p-4 lg:col-span-5">
          <h2 className="text-sm font-bold text-stone-900">Spot check · Alex Rivera&apos;s team</h2>
          <ul className="mt-3 space-y-2">
            {MOCK_TEAM.map((m) => (
              <li className="flex items-center justify-between rounded-lg border border-stone-200 px-3 py-2" key={m.name}>
                <span className="text-sm font-medium text-stone-900">{m.name}</span>
                <span className="text-xs text-stone-600">{m.progress}% · sim {m.sim}</span>
              </li>
            ))}
          </ul>
          <Link className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-[#0033a1] hover:underline" href="/manager">
            Open team overview
            <ChevronRight className="h-3 w-3" />
          </Link>
        </div>

        {/* Audit log */}
        <div className="ns-card ns-card-lavender col-span-12 p-4 md:col-span-6 lg:col-span-4">
          <h2 className="text-sm font-bold text-stone-900">Recent audit events</h2>
          <ul className="mt-3 space-y-2">
            {AUDIT_EVENTS.map((e) => (
              <li className="rounded-lg border border-stone-200/80 bg-white px-3 py-2" key={e.event}>
                <p className="text-sm font-medium text-stone-900">{e.event}</p>
                <p className="text-[10px] text-stone-500">
                  {e.actor} · {e.time}
                </p>
              </li>
            ))}
          </ul>
          <Link className="mt-2 inline-block text-xs font-semibold text-[#0033a1] hover:underline" href="/admin">
            Full audit log →
          </Link>
        </div>

        {/* Adoption snapshot */}
        <div className="ns-card ns-card-peach col-span-12 p-4 md:col-span-6 lg:col-span-4">
          <h2 className="text-sm font-bold text-stone-900">Adoption · 30 days</h2>
          <div className="mt-3 space-y-3">
            {[
              { label: "Deal prep sessions", value: 86, max: 120 },
              { label: "Sim completions", value: 218, max: 280 },
              { label: "Cert submissions", value: 44, max: 60 },
            ].map((metric) => (
              <div key={metric.label}>
                <div className="flex justify-between text-xs">
                  <span className="text-stone-700">{metric.label}</span>
                  <span className="font-semibold text-stone-900">{metric.value}</span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-stone-100">
                  <div
                    className="h-full rounded-full bg-[#0033a1]"
                    style={{ width: `${Math.round((metric.value / metric.max) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
          <Link className="mt-3 inline-block text-xs font-semibold text-[#0033a1] hover:underline" href="/api/admin/analytics?format=csv">
            Export CSV →
          </Link>
        </div>

        {/* Competencies + content quick status */}
        <div className="ns-card ns-card-sage col-span-12 p-4 lg:col-span-4">
          <h2 className="text-sm font-bold text-stone-900">Content & competencies</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-stone-600">Resource assets</dt>
              <dd className="font-semibold text-stone-900">124</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-stone-600">Competency definitions</dt>
              <dd className="font-semibold text-stone-900">18</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-stone-600">Sim templates</dt>
              <dd className="font-semibold text-stone-900">12</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-stone-600">Plan templates</dt>
              <dd className="font-semibold text-stone-900">6</dd>
            </div>
          </dl>
          <Link className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-[#0033a1] hover:underline" href="/plans">
            Edit plan templates
            <ChevronRight className="h-3 w-3" />
          </Link>
        </div>
      </div>
    </NorthstarShell>
  );
}

"use client";

import Link from "next/link";
import { useState } from "react";
import {
  BookOpen,
  Bot,
  BrainCircuit,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Sparkles,
  Target,
  Trophy,
  UserCheck,
  Users,
} from "lucide-react";
import { MOCK_TEAM, MOCK_USER } from "@/components/design/mock-data";
import { NorthstarShell } from "@/components/design/northstar-shell";

const MANAGER_NAME = MOCK_USER.manager;

const MANAGER_NAV = [
  { label: "Team", href: "/design/northstar/manager", icon: Users, mockActive: true },
  { label: "Deal Prep", href: "/prep", icon: Sparkles },
  { label: "Simulations", href: "/simulations", icon: Bot },
  { label: "Challenges", href: "/challenges", icon: BrainCircuit },
  { label: "Plans", href: "/plans", icon: ClipboardCheck },
  { label: "Development", href: "/development", icon: Target },
  { label: "Certifications", href: "/certifications", icon: Trophy },
  { label: "Resources", href: "/resources", icon: BookOpen },
];

const REVIEW_QUEUE = [
  {
    se: "Sam Okonkwo",
    item: "SLED roleplay simulation",
    type: "Plan step",
    submitted: "3h ago",
    href: "/manager?profile=sam",
  },
  {
    se: "Riley Park",
    item: "ISC discovery cert evidence",
    type: "Certification",
    submitted: "Yesterday",
    href: "/manager?profile=riley",
  },
];

const TEAM_ACTIVITY = [
  { label: "Jordan completed ISC challenge", time: "Mon", href: "/manager" },
  { label: "Sam submitted SLED roleplay", time: "3h ago", href: "/manager" },
  { label: "Riley shared deal prep — Acme", time: "Yesterday", href: "/prep" },
  { label: "Jordan sim score 82", time: "2h ago", href: "/simulations" },
];

const RAMP_TEMPLATES = ["Week 1", "Week 2", "Week 3", "60-day", "90-day"];

export function NorthstarManagerHomepage() {
  const [assignStep, setAssignStep] = useState(1);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [selectedSe, setSelectedSe] = useState<string | null>(null);

  const reviewsPending = REVIEW_QUEUE.length;
  const coachNow = MOCK_TEAM.filter((m) => m.health === "coach_now").length;
  const avgProgress = Math.round(MOCK_TEAM.reduce((s, m) => s + m.progress, 0) / MOCK_TEAM.length);

  return (
    <NorthstarShell
      navItems={MANAGER_NAV}
      role="manager"
      userLine={`${MANAGER_NAME} · Manager`}
      workspaceHeader={
        <div className="flex flex-wrap items-center justify-between gap-x-8 gap-y-2">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-[#0033a1]">Team command</p>
            <h1 className="font-[family-name:var(--font-ns-display)] text-xl font-bold text-stone-900 sm:text-2xl">
              Hi Alex — triage, review, assign
            </h1>
            <p className="text-sm text-stone-600">{MOCK_TEAM.length} SEs on your roster · avg {avgProgress}% onboarding progress</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-center">
              <p className="text-[10px] font-medium uppercase text-amber-800">Reviews</p>
              <p className="font-[family-name:var(--font-ns-display)] text-xl font-bold text-amber-900">{reviewsPending}</p>
            </div>
            <div className="rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-center">
              <p className="text-[10px] font-medium uppercase text-violet-800">Coach now</p>
              <p className="font-[family-name:var(--font-ns-display)] text-xl font-bold text-violet-900">{coachNow}</p>
            </div>
            <div className="rounded-lg border border-[#0033a1]/20 bg-[#e8f2fc]/50 px-3 py-2 text-center">
              <p className="text-[10px] font-medium uppercase text-[#0033a1]">Team avg</p>
              <p className="font-[family-name:var(--font-ns-display)] text-xl font-bold text-[#0033a1]">{avgProgress}%</p>
            </div>
          </div>
        </div>
      }
    >
      <div className="grid grid-cols-12 gap-4 xl:gap-5">
        {/* Do this now — manager's next action */}
        <div className="ns-card ns-card-primary col-span-12 p-4 lg:col-span-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <span className="inline-block rounded-full bg-[#0033a1]/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#0033a1]">
                Do this now
              </span>
              <h2 className="mt-1.5 font-[family-name:var(--font-ns-display)] text-lg font-bold text-stone-900">
                Review Sam&apos;s SLED roleplay
              </h2>
              <p className="mt-1 text-xs text-stone-600">Oldest in queue · submitted 3h ago · Week 2 ramp step</p>
            </div>
            <Link
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-[#0033a1] px-4 py-2 text-sm font-semibold text-white hover:bg-[#002878]"
              href="/manager"
            >
              Open review
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        {/* Review queue */}
        <div className="ns-card ns-card-lavender col-span-12 p-4 lg:col-span-5">
          <h2 className="text-sm font-bold text-stone-900">Review queue</h2>
          <p className="text-xs text-stone-500">Plan steps, certs, and submissions awaiting your sign-off</p>
          <ul className="mt-3 space-y-2">
            {REVIEW_QUEUE.map((item) => (
              <li key={item.item}>
                <Link
                  className="flex items-center gap-3 rounded-lg border border-stone-200 bg-white px-3 py-2.5 transition hover:border-[#0033a1]/25 hover:bg-[#e8f2fc]/30"
                  href={item.href}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-stone-900">{item.item}</p>
                    <p className="text-xs text-stone-500">
                      {item.se} · {item.type} · {item.submitted}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs font-semibold text-[#0033a1]">Review →</span>
                </Link>
              </li>
            ))}
          </ul>
          <Link className="mt-3 inline-block text-xs font-semibold text-[#0033a1] hover:underline" href="/manager">
            Full manager console →
          </Link>
        </div>

        {/* Coach now */}
        <div className="col-span-12 grid grid-cols-1 gap-3 lg:col-span-3">
          <div className="ns-card ns-card-peach p-4">
            <p className="text-[10px] font-medium uppercase tracking-wide text-orange-700/80">Coach now</p>
            <p className="mt-1 text-sm font-semibold text-stone-900">Sam Okonkwo</p>
            <p className="text-xs text-stone-600">Sim avg 71 · 41% ramp · behind cohort</p>
            <Link className="mt-2 inline-block text-[11px] font-semibold text-[#0033a1] hover:underline" href="/manager">
              Open SE profile →
            </Link>
          </div>
          <div className="ns-card ns-card-sage p-4">
            <p className="text-[10px] font-medium uppercase tracking-wide text-stone-500">Graduate SE</p>
            <p className="mt-1 text-xs text-stone-600">Mark ramp complete — swaps their home to everboarding view</p>
            <button
              className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 py-2 text-xs font-semibold text-emerald-900"
              type="button"
            >
              <UserCheck className="h-3.5 w-3.5" />
              Graduate Jordan (mock)
            </button>
          </div>
        </div>

        {/* Assign onboarding plan */}
        <div className="ns-card ns-card-blue col-span-12 p-4 lg:col-span-4">
          <h2 className="text-sm font-bold text-stone-900">Assign onboarding plan</h2>
          <p className="text-xs text-stone-500">Template → SE → confirm</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {[1, 2, 3].map((n) => (
              <button
                className={`rounded-md px-2.5 py-1 text-[10px] font-semibold ${
                  assignStep === n ? "bg-[#0033a1] text-white" : "border border-stone-200 text-stone-600"
                }`}
                key={n}
                onClick={() => setAssignStep(n)}
                type="button"
              >
                {n === 1 ? "Template" : n === 2 ? "SE" : "Confirm"}
              </button>
            ))}
          </div>
          {assignStep === 1 ? (
            <div className="mt-3 grid grid-cols-2 gap-2">
              {RAMP_TEMPLATES.map((t) => (
                <button
                  className={`rounded-lg border px-2 py-2 text-left text-xs font-semibold ${
                    selectedTemplate === t ? "border-[#0033a1] bg-[#e8f2fc]" : "border-stone-200 hover:border-[#0033a1]/30"
                  }`}
                  key={t}
                  onClick={() => {
                    setSelectedTemplate(t);
                    setAssignStep(2);
                  }}
                  type="button"
                >
                  {t}
                </button>
              ))}
            </div>
          ) : null}
          {assignStep === 2 ? (
            <ul className="mt-3 space-y-1.5">
              {MOCK_TEAM.map((m) => (
                <li key={m.name}>
                  <button
                    className="flex w-full items-center justify-between rounded-lg border border-stone-200 px-3 py-2 text-sm hover:border-[#0033a1]/30"
                    onClick={() => {
                      setSelectedSe(m.name);
                      setAssignStep(3);
                    }}
                    type="button"
                  >
                    {m.name}
                    <ChevronRight className="h-4 w-4 text-stone-400" />
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          {assignStep === 3 && selectedTemplate && selectedSe ? (
            <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
              <p className="text-sm font-semibold text-emerald-900">
                {selectedTemplate} → {selectedSe}
              </p>
              <Link
                className="mt-2 inline-flex rounded-lg bg-[#0033a1] px-3 py-1.5 text-xs font-semibold text-white"
                href="/manager#onboarding-plans"
              >
                Assign in production →
              </Link>
            </div>
          ) : null}
        </div>

        {/* Team roster — full width table feel */}
        <div className="ns-card col-span-12 border border-stone-200 bg-white p-4 lg:col-span-8">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-bold text-stone-900">Team roster</h2>
            <Link className="text-xs font-semibold text-[#0033a1] hover:underline" href="/manager">
              Open command center →
            </Link>
          </div>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead>
                <tr className="border-b border-stone-200 text-[10px] font-semibold uppercase tracking-wide text-stone-500">
                  <th className="pb-2 pr-4">SE</th>
                  <th className="pb-2 pr-4">Ramp</th>
                  <th className="pb-2 pr-4">Sim</th>
                  <th className="pb-2 pr-4">Status</th>
                  <th className="pb-2">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {MOCK_TEAM.map((member) => (
                  <tr key={member.name}>
                    <td className="py-2.5 pr-4 font-semibold text-stone-900">{member.name}</td>
                    <td className="py-2.5 pr-4">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-16 overflow-hidden rounded-full bg-[#e8f2fc]">
                          <div className="h-full bg-[#0033a1]" style={{ width: `${member.progress}%` }} />
                        </div>
                        <span className="text-xs text-stone-600">{member.progress}%</span>
                      </div>
                    </td>
                    <td className="py-2.5 pr-4 text-stone-700">{member.sim}</td>
                    <td className="py-2.5 pr-4">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                          member.health === "coach_now"
                            ? "bg-violet-100 text-violet-800"
                            : "bg-emerald-100 text-emerald-800"
                        }`}
                      >
                        {member.health.replace("_", " ")}
                      </span>
                    </td>
                    <td className="py-2.5">
                      <Link className="text-xs font-semibold text-[#0033a1] hover:underline" href="/manager">
                        Profile →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Team activity + deal prep oversight */}
        <div className="ns-card ns-card-blue col-span-12 p-4 md:col-span-6 lg:col-span-4">
          <h2 className="text-sm font-bold text-stone-900">Team activity</h2>
          <ul className="mt-3 space-y-2">
            {TEAM_ACTIVITY.map((item) => (
              <li key={item.label}>
                <Link className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-[#e8f2fc]/50" href={item.href}>
                  <span className="truncate font-medium text-stone-800">{item.label}</span>
                  <span className="shrink-0 text-[10px] text-stone-500">{item.time}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="ns-card ns-card-peach col-span-12 p-4 md:col-span-6 lg:col-span-4">
          <h2 className="text-sm font-bold text-stone-900">Shared deal prep</h2>
          <p className="text-xs text-stone-500">SEs who shared briefs for your review</p>
          <ul className="mt-3 space-y-2">
            <li className="rounded-lg border border-stone-200 px-3 py-2">
              <p className="text-sm font-semibold text-stone-900">Riley · Acme Health</p>
              <p className="text-xs text-stone-500">Shared yesterday</p>
            </li>
            <li className="rounded-lg border border-stone-200 px-3 py-2">
              <p className="text-sm font-semibold text-stone-900">Jordan · USF discovery</p>
              <p className="text-xs text-stone-500">Draft · not shared</p>
            </li>
          </ul>
          <Link className="mt-2 inline-block text-xs font-semibold text-[#0033a1] hover:underline" href="/prep">
            All prep sessions →
          </Link>
        </div>

        <div className="ns-card ns-card-lavender col-span-12 p-4 lg:col-span-4">
          <h2 className="text-sm font-bold text-stone-900">Plan templates</h2>
          <p className="text-xs text-stone-500">Edit ramps on Plans · assign from panel above</p>
          <Link
            className="mt-3 inline-flex items-center gap-1 rounded-lg border border-[#0033a1]/20 bg-white px-3 py-2 text-xs font-semibold text-[#0033a1] hover:bg-[#e8f2fc]"
            href="/plans"
          >
            <ClipboardCheck className="h-3.5 w-3.5" />
            Manage templates →
          </Link>
          <Link
            className="mt-2 block text-xs font-semibold text-stone-600 hover:text-[#0033a1]"
            href="/manager#onboarding-plans"
          >
            Production assign panel →
          </Link>
        </div>
      </div>
    </NorthstarShell>
  );
}

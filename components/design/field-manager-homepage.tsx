"use client";

import Link from "next/link";
import {
  BookOpen,
  Bot,
  BrainCircuit,
  ChevronRight,
  ClipboardCheck,
  LayoutDashboard,
  Sparkles,
  Trophy,
  Users,
} from "lucide-react";
import { MOCK_TEAM } from "@/components/design/mock-data";
import { NorthstarShell } from "@/components/design/northstar-shell";

const INBOX = [
  { person: "Alex Rivera", item: "SLED roleplay coaching card", type: "Sim", urgent: true },
  { person: "Casey Morgan", item: "ISC challenge submission", type: "Challenge", urgent: true },
  { person: "Alex Rivera", item: "Week 3 · DemoHub tenant step", type: "Plan", urgent: false },
];

const PROGRAM_TRACKER = [
  { week: "W1–2", label: "Boots on the ground", team: 5, complete: 5 },
  { week: "W2–3", label: "First steps", team: 5, complete: 2 },
  { week: "W3–4", label: "Second step", team: 5, complete: 0 },
];

const MANAGER_NAV = [
  { label: "Team", href: "/design/field/manager", icon: Users, mockActive: true },
  { label: "Plans", href: "/plans", icon: ClipboardCheck },
  { label: "Deal Prep", href: "/prep", icon: Sparkles },
  { label: "Simulations", href: "/simulations", icon: Bot },
  { label: "Certifications", href: "/certifications", icon: Trophy },
  { label: "Resources", href: "/resources", icon: BookOpen },
];

export function FieldManagerHomepage() {
  return (
    <NorthstarShell
      navItems={MANAGER_NAV}
      role="manager"
      userLine="John Barrett · Manager"
      toolbar={
        <Link
          className="rounded-md border border-stone-200 bg-white px-2 py-1 text-[10px] font-semibold text-stone-600 hover:border-[#0033a1]/30 hover:text-[#0033a1]"
          href="/design/field/research"
        >
          Competitive research
        </Link>
      }
      workspaceHeader={
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-[#0033a1]">Team command</p>
            <h1 className="text-xl font-bold text-stone-900 sm:text-2xl">2 items need your review</h1>
            <p className="text-sm text-stone-600">SalesHood command-center pattern · triage first</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-center">
              <p className="text-[10px] font-medium uppercase text-amber-800">Inbox</p>
              <p className="text-xl font-bold text-amber-900">2</p>
            </div>
            <div className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-center">
              <p className="text-[10px] font-medium uppercase text-stone-500">SEs</p>
              <p className="text-xl font-bold text-stone-900">5</p>
            </div>
            <div className="rounded-lg border border-[#0033a1]/20 bg-[#e8f2fc]/50 px-3 py-2 text-center">
              <p className="text-[10px] font-medium uppercase text-[#0033a1]">Avg week</p>
              <p className="text-xl font-bold text-[#0033a1]">2.4</p>
            </div>
          </div>
        </div>
      }
    >
      <div className="grid grid-cols-12 gap-4 xl:gap-5">
        <div className="ns-card ns-card-primary col-span-12 p-4 lg:col-span-7">
          <h2 className="text-sm font-bold text-stone-900">Review inbox</h2>
          <ul className="mt-3 space-y-2">
            {INBOX.map((row) => (
              <li
                className="flex items-center justify-between rounded-lg border border-stone-200 bg-white px-3 py-2.5"
                key={`${row.person}-${row.item}`}
              >
                <div>
                  <p className="text-sm font-semibold text-stone-900">{row.item}</p>
                  <p className="text-[10px] text-stone-500">
                    {row.person} · {row.type}
                  </p>
                </div>
                <button
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                    row.urgent
                      ? "bg-[#0033a1] text-white hover:bg-[#002878]"
                      : "border border-stone-200 text-stone-700"
                  }`}
                  type="button"
                >
                  Review
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="ns-card ns-card-lavender col-span-12 p-4 lg:col-span-5" id="onboarding-plans">
          <h2 className="text-sm font-bold text-stone-900">Assign ramp · 3 steps</h2>
          <ol className="mt-3 space-y-2 text-sm">
            <li className="rounded-lg border border-stone-200 bg-white px-3 py-2">
              <span className="font-semibold text-[#0033a1]">1.</span> Pick template — Week 3–4 Second step
            </li>
            <li className="rounded-lg border border-stone-200 bg-white px-3 py-2">
              <span className="font-semibold text-[#0033a1]">2.</span> Select SE — Alex Rivera
            </li>
            <li className="rounded-lg border border-stone-200 bg-white px-3 py-2">
              <span className="font-semibold text-[#0033a1]">3.</span> Confirm start date — Mon Jul 7
            </li>
          </ol>
          <button className="mt-3 w-full rounded-lg bg-[#0033a1] py-2 text-sm font-semibold text-white" type="button">
            Assign plan
          </button>
        </div>

        <div className="ns-card ns-card-blue col-span-12 p-4 lg:col-span-8">
          <h2 className="text-sm font-bold text-stone-900">Program tracker · SalesHood pattern</h2>
          <div className="mt-4 space-y-4">
            {PROGRAM_TRACKER.map((stage) => (
              <div key={stage.week}>
                <div className="flex justify-between text-xs">
                  <span className="font-semibold text-stone-900">
                    {stage.week} — {stage.label}
                  </span>
                  <span className="text-stone-500">
                    {stage.complete}/{stage.team} complete
                  </span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-stone-100">
                  <div
                    className="h-full rounded-full bg-[#0033a1]"
                    style={{ width: `${(stage.complete / stage.team) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="ns-card ns-card-sage col-span-12 p-4 lg:col-span-4">
          <h2 className="text-sm font-bold text-stone-900">Team roster</h2>
          <ul className="mt-3 space-y-2">
            {MOCK_TEAM.map((member, index) => (
              <li className="flex items-center justify-between rounded-lg border border-stone-200 px-3 py-2" key={member.name}>
                <div>
                  <p className="text-sm font-medium text-stone-900">{member.name}</p>
                  <p className="text-[10px] text-stone-500">Week {index + 2}</p>
                </div>
                <span className="text-xs font-semibold text-[#0033a1]">{member.progress}%</span>
              </li>
            ))}
          </ul>
          <Link className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-[#0033a1]" href="/manager">
            Open production manager
            <ChevronRight className="h-3 w-3" />
          </Link>
        </div>
      </div>
    </NorthstarShell>
  );
}

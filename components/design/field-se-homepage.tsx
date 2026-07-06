"use client";

import Link from "next/link";
import {
  BookOpen,
  Bot,
  BrainCircuit,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  LayoutDashboard,
  Mic,
  Sparkles,
  Target,
  Trophy,
  Users,
} from "lucide-react";
import { NorthstarShell } from "@/components/design/northstar-shell";

const WEEKS = [
  { n: 1, label: "Boots", status: "done" as const },
  { n: 2, label: "Boots", status: "done" as const },
  { n: 3, label: "First steps", status: "current" as const },
  { n: 4, label: "Second", status: "upcoming" as const },
  { n: 5, label: "Third", status: "upcoming" as const },
  { n: 6, label: "Third", status: "upcoming" as const },
  { n: 7, label: "Fourth", status: "upcoming" as const },
  { n: 8, label: "Fourth", status: "upcoming" as const },
];

const CHECKLIST = [
  { title: "ISC platform video + discussion", type: "Content", done: true },
  { title: "Request DemoHub tenant", type: "Challenge", done: true },
  { title: "SLED roleplay — flight simulator", type: "Practice", done: false, active: true },
  { title: "Shadow SE discovery call", type: "Shadow", done: false },
  { title: "Elevator pitch to mentor", type: "Review", done: false },
];

const SE_NAV = [
  { label: "Home", href: "/design/field", icon: LayoutDashboard, mockActive: true },
  { label: "Deal Prep", href: "/prep", icon: Sparkles },
  { label: "Simulations", href: "/simulations", icon: Bot },
  { label: "Challenges", href: "/challenges", icon: BrainCircuit },
  { label: "Resources", href: "/resources", icon: BookOpen },
  { label: "Certifications", href: "/certifications", icon: Trophy },
];

function WeekRunway() {
  return (
    <div className="ns-card col-span-12 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-[#0033a1]">Ramp runway</p>
          <p className="text-sm text-stone-600">SailPoint onboarding · Week 3 of 8</p>
        </div>
        <span className="rounded-full border border-stone-200 bg-stone-50 px-2.5 py-1 text-[10px] font-semibold text-stone-600">
          Auto-assigned · Mindtickle / Rippling pattern
        </span>
      </div>
      <div className="mt-4 flex gap-1 overflow-x-auto pb-1">
        {WEEKS.map((week) => (
          <div className="min-w-[72px] flex-1" key={week.n}>
            <div
              className={`h-2 rounded-full ${
                week.status === "done"
                  ? "bg-[#0033a1]"
                  : week.status === "current"
                    ? "bg-gradient-to-r from-[#0033a1] to-[#d70fb6]"
                    : "bg-stone-200"
              }`}
            />
            <p
              className={`mt-1.5 text-center text-[10px] font-semibold ${
                week.status === "current" ? "text-[#0033a1]" : "text-stone-500"
              }`}
            >
              W{week.n}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function FieldSeHomepage() {
  return (
    <NorthstarShell
      navItems={SE_NAV}
      role="se"
      userLine="Alex Rivera · Basic SE · Week 3"
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
            <p className="text-[10px] font-semibold uppercase tracking-wide text-[#0033a1]">My workspace</p>
            <h1 className="text-xl font-bold text-stone-900 sm:text-2xl">Week 3 — First steps</h1>
            <p className="text-sm text-stone-600">Manager: John Barrett · 2 items awaiting review</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-center">
              <p className="text-[10px] font-medium uppercase text-stone-500">Plan</p>
              <p className="text-lg font-bold text-[#0033a1]">42%</p>
            </div>
            <div className="rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-center">
              <p className="text-[10px] font-medium uppercase text-violet-700">Sim avg</p>
              <p className="text-lg font-bold text-violet-900">78</p>
            </div>
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-center">
              <p className="text-[10px] font-medium uppercase text-amber-800">Cert</p>
              <p className="text-lg font-bold text-amber-900">1/3</p>
            </div>
          </div>
        </div>
      }
    >
      <div className="grid grid-cols-12 gap-4 xl:gap-5">
        <WeekRunway />

        <div className="ns-card ns-card-primary col-span-12 p-4 lg:col-span-5">
          <span className="inline-block rounded-full bg-[#0033a1]/10 px-2 py-0.5 text-[10px] font-bold uppercase text-[#0033a1]">
            Do this now
          </span>
          <h2 className="mt-2 text-lg font-bold text-stone-900">SLED roleplay — flight simulator</h2>
          <p className="mt-1 text-xs text-stone-600">
            Hyperbound pattern: practice the discovery call before your shadow session Thursday. Private AI feedback
            first, then manager review.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#0033a1] px-4 py-2 text-sm font-semibold text-white hover:bg-[#002878]"
              href="/simulations"
            >
              <Bot className="h-4 w-4" />
              Start roleplay
            </Link>
            <button
              className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs font-semibold text-stone-700"
              type="button"
            >
              View scorecard
            </button>
          </div>
        </div>

        <div className="ns-card ns-card-lavender col-span-12 p-4 lg:col-span-4">
          <h2 className="text-sm font-bold text-stone-900">Last practice · Seismic / Hyperbound</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-stone-600">Talk-to-listen</dt>
              <dd className="font-semibold text-amber-700">Needs work</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-stone-600">Discovery questions</dt>
              <dd className="font-semibold text-emerald-700">Strong</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-stone-600">Objection handling</dt>
              <dd className="font-semibold text-stone-800">72 / 100</dd>
            </div>
          </dl>
          <p className="mt-2 text-[10px] text-stone-500">Revision requested on prior sim — redo after review</p>
        </div>

        <div className="ns-card ns-card-sage col-span-12 p-4 lg:col-span-3">
          <h2 className="text-sm font-bold text-stone-900">Ramp readiness</h2>
          <p className="mt-1 text-3xl font-bold text-[#0033a1]">71%</p>
          <p className="text-[10px] text-stone-500">Lagging motivator — not your task list</p>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-stone-100">
            <div className="h-full w-[71%] rounded-full bg-[#0033a1]" />
          </div>
        </div>

        <div className="ns-card ns-card-blue col-span-12 p-4 lg:col-span-7">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-stone-900">Onboarding checklist</h2>
            <span className="text-xs font-semibold text-[#0033a1]">2 of 5 done</span>
          </div>
          <ul className="mt-3 space-y-2">
            {CHECKLIST.map((step) => (
              <li
                className={`flex items-center justify-between rounded-lg border px-3 py-2.5 ${
                  step.active ? "border-[#0033a1]/30 bg-[#e8f2fc]/40" : "border-stone-200 bg-white"
                }`}
                key={step.title}
              >
                <div className="flex items-center gap-2.5">
                  {step.done ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <Target className={`h-4 w-4 ${step.active ? "text-[#0033a1]" : "text-stone-400"}`} />
                  )}
                  <div>
                    <p className="text-sm font-medium text-stone-900">{step.title}</p>
                    <p className="text-[10px] text-stone-500">{step.type}</p>
                  </div>
                </div>
                {step.active ? (
                  <ChevronRight className="h-4 w-4 text-[#0033a1]" />
                ) : null}
              </li>
            ))}
          </ul>
        </div>

        <div className="ns-card ns-card-peach col-span-12 p-4 lg:col-span-5">
          <div className="flex items-center gap-2">
            <Mic className="h-4 w-4 text-[#0033a1]" />
            <h2 className="text-sm font-bold text-stone-900">Shadow log · Siro pattern</h2>
          </div>
          <p className="mt-2 text-xs text-stone-600">
            Log takeaways from your last shadow — business pain, what landed, follow-up questions.
          </p>
          <textarea
            className="mt-3 w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-800 placeholder:text-stone-400"
            placeholder="CISO cared about audit readiness. Demo on access reviews resonated…"
            rows={3}
          />
          <button
            className="mt-2 rounded-lg border border-[#0033a1]/25 bg-white px-3 py-1.5 text-xs font-semibold text-[#0033a1]"
            type="button"
          >
            Save shadow notes
          </button>
        </div>
      </div>
    </NorthstarShell>
  );
}

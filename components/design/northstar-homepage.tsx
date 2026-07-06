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
  LayoutDashboard,
  Mail,
  MessageSquare,
  Sparkles,
  Target,
  Trophy,
  TrendingUp,
  UserCheck,
  Users,
} from "lucide-react";
import { MOCK_PLAN_STEPS, MOCK_TEAM, MOCK_USER } from "@/components/design/mock-data";
import { NorthstarShell } from "@/components/design/northstar-shell";

const PLAN_NAME = "Week 2 ramp";
const RAMP_READINESS = 87;
const PLAN_PROGRESS = 68;

const SE_NAV = [
  { label: "Home", href: "/design/northstar", icon: LayoutDashboard, mockActive: true },
  { label: "Deal Prep", href: "/prep", icon: Sparkles },
  { label: "Simulations", href: "/simulations", icon: Bot },
  { label: "Challenges", href: "/challenges", icon: BrainCircuit },
  { label: "Resources", href: "/resources", icon: BookOpen },
  { label: "Feedback", href: "/feedback", icon: MessageSquare },
  { label: "Certifications", href: "/certifications", icon: Trophy },
  { label: "Growth", href: "/growth", icon: TrendingUp },
];

const STEP_HREF: Record<string, string> = {
  "ISC discovery challenge": "/challenges",
  "SLED roleplay simulation": "/simulations",
  "Deal prep — Acme Health": "/prep",
  "Shadow customer call": "/dashboard",
};

const STEP_ACTION: Record<string, string> = {
  "ISC discovery challenge": "View challenge",
  "SLED roleplay simulation": "Start roleplay",
  "Deal prep — Acme Health": "Open deal prep",
  "Shadow customer call": "View details",
};

const RECENT_ACTIVITY = [
  { label: "SLED roleplay completed", time: "2h ago", href: "/simulations" },
  { label: "ISC challenge submitted", time: "Mon", href: "/challenges" },
  { label: "Manager feedback on sim", time: "Mon", href: "/feedback" },
  { label: "Deal prep — draft saved", time: "Sun", href: "/prep" },
];

function ReadinessSparkline() {
  const points = "4,28 20,22 36,26 52,14 68,18 84,8 100,12 116,4";
  return (
    <svg className="h-9 w-full" viewBox="0 0 120 32">
      <defs>
        <linearGradient id="ns-spark-fill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#0033a1" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#0033a1" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline fill="none" points={points} stroke="#0033a1" strokeLinecap="round" strokeWidth="2" />
      <polygon fill="url(#ns-spark-fill)" points={`${points} 116,32 4,32`} />
    </svg>
  );
}

function SimBarChart() {
  const bars = [42, 68, 55, 82, 71, 88, 76];
  return (
    <div className="flex h-20 items-end justify-between gap-1">
      {bars.map((h, i) => (
        <div
          className="flex-1 rounded-t-sm"
          key={i}
          style={{
            height: `${h}%`,
            background: i === bars.length - 1 ? "#0033a1" : `rgba(0, 51, 161, ${0.1 + i * 0.07})`,
          }}
        />
      ))}
    </div>
  );
}

export function NorthstarHomepage() {
  const [graduated, setGraduated] = useState(false);
  const activeStep = MOCK_PLAN_STEPS.find((s) => s.status === "active");
  const actionStepsDone = MOCK_PLAN_STEPS.filter((s) => s.status === "done").length;
  const onboardingActive = !graduated;

  return (
    <NorthstarShell
      navItems={SE_NAV}
      role="se"
      toolbar={
        <div className="hidden items-center rounded-lg border border-stone-200 bg-[#FDFBF7] p-0.5 sm:flex">
          <button
            className={`rounded-md px-2.5 py-1 text-[10px] font-semibold transition ${onboardingActive ? "bg-[#0033a1] text-white" : "text-stone-600"}`}
            onClick={() => setGraduated(false)}
            type="button"
          >
            Onboarding
          </button>
          <button
            className={`rounded-md px-2.5 py-1 text-[10px] font-semibold transition ${!onboardingActive ? "bg-[#0033a1] text-white" : "text-stone-600"}`}
            onClick={() => setGraduated(true)}
            type="button"
          >
            Graduated
          </button>
        </div>
      }
      userLine={`${MOCK_USER.name} · ${MOCK_USER.level}`}
      workspaceHeader={
        <div className="flex flex-wrap items-center justify-between gap-x-8 gap-y-2">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-[#0033a1]">
              {onboardingActive ? "My workspace · onboarding" : "My workspace · field ready"}
            </p>
            <h1 className="font-[family-name:var(--font-ns-display)] text-xl font-bold text-stone-900 sm:text-2xl">
              {onboardingActive ? "Hi Jordan — here's what's next" : "Hi Jordan — keep building mastery"}
            </h1>
            <p className="text-sm text-stone-600">
              {onboardingActive
                ? `${PLAN_NAME} · Manager: ${MOCK_USER.manager}`
                : `Onboarding complete · Manager: ${MOCK_USER.manager}`}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-5">
            {onboardingActive ? (
              <div className="w-44">
                <div className="flex justify-between text-xs">
                  <span className="text-stone-600">Plan validated</span>
                  <span className="font-bold text-[#0033a1]">{PLAN_PROGRESS}%</span>
                </div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-[#e8f2fc]">
                  <div className="h-full rounded-full bg-[#0033a1]" style={{ width: `${PLAN_PROGRESS}%` }} />
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                <span className="text-sm font-semibold text-emerald-900">Ramp complete</span>
              </div>
            )}
            <div>
              <p className="text-[10px] uppercase tracking-wide text-stone-500">Ramp readiness</p>
              <p className="font-[family-name:var(--font-ns-display)] text-2xl font-bold leading-none text-[#0033a1]">
                {graduated ? 94 : RAMP_READINESS}%
              </p>
            </div>
          </div>
        </div>
      }
    >
      <div className="grid grid-cols-12 gap-4 xl:gap-5">
        {onboardingActive ? (
          <>
            {activeStep ? (
              <div className="ns-card ns-card-primary col-span-12 p-4 lg:col-span-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <span className="inline-block rounded-full bg-[#0033a1]/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#0033a1]">
                      Do this now
                    </span>
                    <h2 className="mt-1.5 font-[family-name:var(--font-ns-display)] text-lg font-bold text-stone-900">
                      {activeStep.title}
                    </h2>
                    <p className="mt-1 text-xs text-stone-600">
                      Step {actionStepsDone + 1}/{MOCK_PLAN_STEPS.length} · Due {activeStep.due}
                    </p>
                  </div>
                  <Link
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-[#0033a1] px-4 py-2 text-sm font-semibold text-white hover:bg-[#002878]"
                    href={STEP_HREF[activeStep.title] ?? "/simulations"}
                  >
                    {STEP_ACTION[activeStep.title] ?? "Continue"}
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            ) : null}

            <div className="ns-card ns-card-lavender col-span-12 p-4 lg:col-span-5">
              <h2 className="text-sm font-bold text-stone-900">Onboarding checklist</h2>
              <p className="text-xs text-stone-500">
                {actionStepsDone}/{MOCK_PLAN_STEPS.length} validated · removed when manager graduates you
              </p>
              <ul className="mt-3 space-y-2">
                {MOCK_PLAN_STEPS.map((step, index) => {
                  const isCurrent = step.status === "active";
                  const isDone = step.status === "done";
                  return (
                    <li key={step.title}>
                      <Link
                        className={`flex items-center gap-2.5 rounded-lg border px-3 py-2 text-sm transition ${
                          isCurrent
                            ? "border-[#0033a1]/30 bg-[#e8f2fc]/60"
                            : isDone
                              ? "border-stone-200 bg-stone-50/80 opacity-65"
                              : "border-stone-200 bg-white hover:border-[#0033a1]/20"
                        }`}
                        href={STEP_HREF[step.title] ?? "#"}
                      >
                        <span
                          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                            isDone
                              ? "bg-emerald-100 text-emerald-700"
                              : isCurrent
                                ? "bg-[#0033a1] text-white"
                                : "bg-stone-100 text-stone-600"
                          }`}
                        >
                          {isDone ? <CheckCircle2 className="h-3.5 w-3.5" /> : index + 1}
                        </span>
                        <span className={`min-w-0 flex-1 truncate font-medium ${isDone ? "line-through text-stone-500" : "text-stone-900"}`}>
                          {step.title}
                        </span>
                        <span className="shrink-0 text-[10px] text-stone-500">{step.due}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          </>
        ) : (
          <div className="ns-card ns-card-primary col-span-12 p-5 lg:col-span-9">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <span className="inline-block rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-800">
                  Everboarding
                </span>
                <h2 className="mt-2 font-[family-name:var(--font-ns-display)] text-xl font-bold text-stone-900">
                  Q3 development focus
                </h2>
                <p className="mt-2 max-w-2xl text-sm text-stone-600">
                  Onboarding checklist removed after manager graduation. Focus on quarterly goals and practice cadence.
                </p>
              </div>
              <Link
                className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-[#0033a1] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#002878]"
                href="/growth"
              >
                Open growth plan
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              {[
                { label: "Competitive mastery", status: "In progress", href: "/simulations" },
                { label: "Q3 checkpoint evidence", status: "Due Aug 15", href: "/development" },
                { label: "Advanced ISC cert", status: "Not started", href: "/certifications" },
              ].map((goal) => (
                <Link className="rounded-lg border border-stone-200 bg-white px-3 py-3 hover:border-[#0033a1]/25" href={goal.href} key={goal.label}>
                  <Target className="h-4 w-4 text-[#0033a1]" />
                  <p className="mt-2 text-sm font-semibold text-stone-900">{goal.label}</p>
                  <p className="text-xs text-stone-500">{goal.status}</p>
                </Link>
              ))}
            </div>
          </div>
        )}

        <div className={`col-span-12 grid grid-cols-2 gap-4 sm:grid-cols-4 ${onboardingActive ? "lg:col-span-3 lg:grid-cols-1" : "lg:col-span-3 lg:grid-cols-2 xl:grid-cols-1"}`}>
          <div className="ns-card ns-card-blue p-4">
            <p className="text-[10px] font-medium uppercase tracking-wide text-stone-500">Sim score</p>
            <p className="mt-1 font-[family-name:var(--font-ns-display)] text-2xl font-bold text-stone-900">82</p>
            <Link className="mt-1 text-[11px] font-semibold text-[#0033a1] hover:underline" href="/simulations">
              Run sim →
            </Link>
          </div>
          <div className="ns-card ns-card-sage p-4">
            <p className="text-[10px] font-medium uppercase tracking-wide text-stone-500">Cert gates</p>
            <p className="mt-1 font-[family-name:var(--font-ns-display)] text-2xl font-bold text-stone-900">2/5</p>
            <Link className="mt-1 text-[11px] font-semibold text-[#0033a1] hover:underline" href="/certifications">
              ISC next →
            </Link>
          </div>
          <div className="ns-card ns-card-peach col-span-2 p-4 sm:col-span-2 lg:col-span-1">
            <p className="text-[10px] font-medium uppercase tracking-wide text-stone-500">Readiness trend</p>
            <ReadinessSparkline />
            <p className="text-[10px] text-stone-500">+6 pts · team avg 79%</p>
          </div>
          <div className="ns-card col-span-2 border border-stone-200 bg-white p-4 lg:col-span-1">
            <p className="text-[10px] font-medium uppercase tracking-wide text-stone-500">Manager</p>
            <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-stone-900">
              <Mail className="h-3.5 w-3.5 text-[#0033a1]" />
              {MOCK_USER.manager}
            </p>
            <Link className="mt-1 text-[11px] font-semibold text-[#0033a1] hover:underline" href="/feedback">
              View feedback →
            </Link>
          </div>
        </div>

        <div className="ns-card ns-card-blue col-span-12 p-4 md:col-span-6 lg:col-span-4">
          <h2 className="text-sm font-bold text-stone-900">Recent activity</h2>
          <ul className="mt-3 space-y-2">
            {RECENT_ACTIVITY.map((item) => (
              <li key={item.label}>
                <Link className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-[#e8f2fc]/50" href={item.href}>
                  <span className="truncate font-medium text-stone-800">{item.label}</span>
                  <span className="shrink-0 text-[10px] text-stone-500">{item.time}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="ns-card ns-card-lavender col-span-12 p-4 md:col-span-6 lg:col-span-4">
          <h2 className="text-sm font-bold text-stone-900">Sim performance · 7 days</h2>
          <SimBarChart />
        </div>

        <div className="ns-card ns-card-peach col-span-12 p-4 lg:col-span-4">
          <p className="text-[10px] font-medium uppercase tracking-wide text-orange-700/80">Deal prep</p>
          <h2 className="mt-1 text-sm font-bold text-stone-900">Acme Health · discovery Thu</h2>
          <p className="mt-1 text-xs text-stone-600">
            {onboardingActive ? "Optional until Day 7 plan step" : "Customer-facing — always available"}
          </p>
          <Link className="mt-3 inline-flex text-xs font-semibold text-[#0033a1] hover:underline" href="/prep">
            Open prep workspace →
          </Link>
        </div>
      </div>
    </NorthstarShell>
  );
}

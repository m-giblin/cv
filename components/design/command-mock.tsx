"use client";

import Link from "next/link";
import {
  Bot,
  Brain,
  LayoutDashboard,
  Mic,
  Radio,
  Shield,
  Sparkles,
  Target,
  Users,
} from "lucide-react";
import { useState } from "react";
import {
  MOCK_AI_INSIGHT,
  MOCK_OBJECTIONS,
  MOCK_PLAN_STEPS,
  MOCK_TEAM,
  MOCK_USER,
} from "@/components/design/mock-data";

type View = "se" | "manager" | "prep" | "sim";

const NAV: { id: View; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "se", label: "SE Ops", icon: LayoutDashboard },
  { id: "manager", label: "Command", icon: Users },
  { id: "prep", label: "Deal Prep", icon: Target },
  { id: "sim", label: "Simulation", icon: Bot },
];

export function CommandMock() {
  const [view, setView] = useState<View>("se");

  return (
    <div className="design-command dc-grid-bg flex min-h-[calc(100vh-52px)]">
      {/* Icon rail */}
      <aside className="hidden w-16 flex-col items-center gap-2 border-r border-cyan-500/10 bg-zinc-950 py-4 lg:flex">
        <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 font-bold text-white shadow-lg shadow-cyan-500/20">
          SE
        </div>
        {NAV.map((item) => {
          const Icon = item.icon;
          const active = view === item.id;
          return (
            <button
              className={`flex h-11 w-11 items-center justify-center rounded-lg transition ${
                active
                  ? "bg-cyan-500/20 text-cyan-400 dc-glow"
                  : "text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
              }`}
              key={item.id}
              onClick={() => setView(item.id)}
              title={item.label}
              type="button"
            >
              <Icon className="h-5 w-5" />
            </button>
          );
        })}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-cyan-500/10 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <Link className="text-xs text-zinc-500 hover:text-cyan-400 lg:hidden" href="/design">
              ← Lab
            </Link>
            <div>
              <p className="font-[family-name:var(--font-design-mono)] text-[10px] uppercase tracking-widest text-cyan-500">
                Design A · COMMAND
              </p>
              <h1 className="text-lg font-bold">{NAV.find((n) => n.id === view)?.label}</h1>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 font-[family-name:var(--font-design-mono)] text-[10px] text-emerald-400">
              <span className="design-pulse-dot h-1.5 w-1.5 rounded-full bg-emerald-400" />
              AI ONLINE
            </span>
            <span className="rounded-full border border-cyan-500/20 px-2.5 py-1 font-[family-name:var(--font-design-mono)] text-[10px] text-cyan-400/80">
              AAL2
            </span>
            <span className="rounded-full border border-zinc-700 px-2.5 py-1 font-[family-name:var(--font-design-mono)] text-[10px] text-zinc-500">
              {MOCK_USER.name}
            </span>
          </div>
        </header>

        {/* Mobile tabs */}
        <div className="flex gap-1 overflow-x-auto border-b border-cyan-500/10 px-4 py-2 lg:hidden">
          {NAV.map((item) => (
            <button
              className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold ${
                view === item.id ? "bg-cyan-500/20 text-cyan-400" : "text-zinc-500"
              }`}
              key={item.id}
              onClick={() => setView(item.id)}
              type="button"
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="flex flex-1 overflow-hidden">
          <main className="flex-1 overflow-y-auto p-4 sm:p-6">
            {view === "se" ? <CommandSeView /> : null}
            {view === "manager" ? <CommandManagerView /> : null}
            {view === "prep" ? <CommandPrepView /> : null}
            {view === "sim" ? <CommandSimView /> : null}
          </main>

          {/* AI rail */}
          <aside className="hidden w-72 shrink-0 flex-col border-l border-cyan-500/10 bg-zinc-950/80 p-4 xl:flex">
            <div className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-cyan-400" />
              <span className="text-sm font-bold">Enablement AI</span>
            </div>
            <div className="relative mt-4 flex-1 dc-panel dc-corner rounded-xl p-4">
              <p className="font-[family-name:var(--font-design-mono)] text-[10px] uppercase tracking-wider text-cyan-500">
                Live insight
              </p>
              <p className="mt-3 text-sm leading-relaxed text-zinc-300">{MOCK_AI_INSIGHT}</p>
              <div className="mt-4 space-y-2 border-t border-cyan-500/10 pt-4">
                <p className="font-[family-name:var(--font-design-mono)] text-[10px] text-zinc-500">
                  Suggested action
                </p>
                <button
                  className="w-full rounded-lg border border-cyan-500/30 bg-cyan-500/10 py-2 text-xs font-semibold text-cyan-300 transition hover:bg-cyan-500/20"
                  type="button"
                >
                  Launch objection drill →
                </button>
              </div>
            </div>
            <div className="mt-4 font-[family-name:var(--font-design-mono)] text-[10px] text-zinc-600">
              <Radio className="mr-1 inline h-3 w-3" />
              Telemetry active · grok-3-mini
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

function CommandSeView() {
  return (
    <div className="space-y-4">
      <div className="relative dc-panel dc-corner overflow-hidden rounded-xl p-6 dc-glow">
        <p className="font-[family-name:var(--font-design-mono)] text-xs text-cyan-400">OPERATOR</p>
        <h2 className="mt-1 text-2xl font-bold">Welcome back, Jordan</h2>
        <p className="mt-2 text-sm text-zinc-400">Week 2 ramp · 68% validated · Next: SLED roleplay</p>
        <div className="mt-4 flex gap-3">
          <button className="rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-2 text-sm font-bold text-white" type="button">
            Execute next step
          </button>
          <button className="rounded-lg border border-cyan-500/30 px-4 py-2 text-sm font-semibold text-cyan-400" type="button">
            Deal prep
          </button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Plan progress", value: "68%", icon: Target },
          { label: "Sim score", value: "82", icon: Bot },
          { label: "Cert gates", value: "2/5", icon: Shield },
        ].map((stat) => (
          <div className="dc-panel rounded-xl p-4" key={stat.label}>
            <stat.icon className="h-4 w-4 text-cyan-500" />
            <p className="mt-2 font-[family-name:var(--font-design-mono)] text-2xl font-bold">{stat.value}</p>
            <p className="text-xs text-zinc-500">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="dc-panel rounded-xl p-5">
        <p className="font-[family-name:var(--font-design-mono)] text-xs uppercase tracking-wider text-zinc-500">
          Mission queue
        </p>
        <ul className="mt-4 space-y-2">
          {MOCK_PLAN_STEPS.map((step) => (
            <li
              className={`flex items-center justify-between rounded-lg border px-3 py-2.5 ${
                step.status === "active"
                  ? "border-cyan-500/40 bg-cyan-500/10"
                  : step.status === "done"
                    ? "border-zinc-800 opacity-60"
                    : "border-zinc-800"
              }`}
              key={step.title}
            >
              <span className="text-sm">{step.title}</span>
              <span className="font-[family-name:var(--font-design-mono)] text-xs text-zinc-500">{step.due}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function CommandManagerView() {
  return (
    <div className="space-y-4">
      <div className="dc-panel rounded-xl p-5">
        <h2 className="text-xl font-bold">Team command</h2>
        <p className="text-sm text-zinc-400">3 operators · 2 reviews pending · 71% avg progress</p>
      </div>
      <div className="grid gap-3">
        {MOCK_TEAM.map((member) => (
          <div className="dc-panel flex items-center gap-4 rounded-xl p-4" key={member.name}>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-cyan-500/20 font-bold text-cyan-400">
              {member.name[0]}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{member.name}</p>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-zinc-800">
                <div className="h-full bg-gradient-to-r from-cyan-500 to-blue-500" style={{ width: `${member.progress}%` }} />
              </div>
            </div>
            <div className="text-right font-[family-name:var(--font-design-mono)] text-xs">
              <p className="text-cyan-400">SIM {member.sim}</p>
              <p className={member.health === "coach_now" ? "text-amber-400" : "text-emerald-400"}>
                {member.health.replace("_", " ")}
              </p>
            </div>
          </div>
        ))}
      </div>
      <div className="dc-panel rounded-xl p-5">
        <p className="text-xs font-bold uppercase tracking-wider text-cyan-500">Assign ramp</p>
        <p className="mt-2 text-sm text-zinc-400">Week 2 template · drag to assign (mock)</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {["Week 1", "Week 2", "Week 3", "90-day"].map((t) => (
            <span className="rounded border border-cyan-500/30 px-3 py-1 text-xs text-cyan-300" key={t}>
              {t}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function CommandPrepView() {
  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_1fr_0.9fr]">
      <div className="dc-panel space-y-3 rounded-xl p-4">
        <p className="text-xs font-bold text-cyan-500">INPUT</p>
        <div className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm">University of South Florida</div>
        <div className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm">Higher Ed · Discovery</div>
        <button className="w-full rounded-lg bg-cyan-500/20 py-2 text-sm font-bold text-cyan-300" type="button">
          <Sparkles className="mr-1 inline h-4 w-4" />
          Generate brief
        </button>
      </div>
      <div className="dc-panel space-y-4 rounded-xl p-4">
        <p className="text-xs font-bold text-cyan-500">BRIEF</p>
        <p className="text-sm font-semibold">One thing to nail</p>
        <p className="text-sm text-zinc-400">Secure IAM lead workshop before fiscal freeze.</p>
        <div>
          <p className="text-xs text-zinc-500">Objections</p>
          <ul className="mt-2 space-y-2">
            {MOCK_OBJECTIONS.map((o) => (
              <li className="rounded border border-zinc-800 p-2 text-xs text-zinc-300" key={o}>
                {o}
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="dc-panel rounded-xl p-4">
        <p className="text-xs font-bold text-cyan-500">PRACTICE</p>
        <p className="mt-2 text-xs text-zinc-500">Side-by-side objection drill</p>
        <div className="mt-3 rounded-lg border border-cyan-500/20 bg-zinc-900/80 p-3">
          <p className="font-[family-name:var(--font-design-mono)] text-[10px] text-cyan-500">BUYER</p>
          <p className="mt-1 text-sm">We already have Okta…</p>
        </div>
        <button className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-cyan-500/40 py-2 text-sm text-cyan-400" type="button">
          <Mic className="h-4 w-4" />
          Practice
        </button>
      </div>
    </div>
  );
}

function CommandSimView() {
  return (
    <div className="dc-panel rounded-xl p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">Live roleplay</h2>
        <span className="font-[family-name:var(--font-design-mono)] text-xs text-amber-400">ROUND 2/3</span>
      </div>
      <div className="mt-4 space-y-3 rounded-lg bg-zinc-900/80 p-4">
        <div className="ml-auto max-w-[85%] rounded-lg bg-blue-600/30 p-3 text-sm">SE: We reduce certification cycle time by 40% at peer IDNs…</div>
        <div className="max-w-[85%] rounded-lg border border-zinc-700 p-3 text-sm text-zinc-300">
          CISO: That sounds like every vendor pitch. What&apos;s different for SLED procurement?
        </div>
      </div>
      <div className="mt-4 flex gap-2">
        <button className="flex-1 rounded-lg bg-cyan-500 py-2 text-sm font-bold text-zinc-950" type="button">
          Send turn
        </button>
        <button className="rounded-lg border border-zinc-600 px-4 py-2 text-sm" type="button">
          HINT:
        </button>
      </div>
    </div>
  );
}

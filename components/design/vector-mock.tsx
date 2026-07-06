"use client";

import Link from "next/link";
import {
  ArrowRight,
  Bot,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Lock,
  Mic,
  Search,
  Shield,
  Sparkles,
  Target,
  Users,
  Zap,
} from "lucide-react";
import { useState } from "react";
import {
  MOCK_OBJECTIONS,
  MOCK_PLAN_STEPS,
  MOCK_TEAM,
  MOCK_USER,
} from "@/components/design/mock-data";
import {
  MANAGER_WORKFLOW_PRIORITIES,
  RESEARCH_INSIGHTS,
  SE_WORKFLOW_PRIORITIES,
} from "@/components/design/research-notes";

type View = "se" | "manager" | "prep" | "sim";

const NAV: { id: View; label: string; desc: string }[] = [
  { id: "se", label: "Today", desc: "SE workspace" },
  { id: "manager", label: "Team", desc: "Manager triage" },
  { id: "prep", label: "Deal Prep", desc: "Brief + practice" },
  { id: "sim", label: "Simulation", desc: "Roleplay" },
];

export function VectorMock() {
  const [view, setView] = useState<View>("se");
  const [assignStep, setAssignStep] = useState(1);

  return (
    <div className="design-vector vx-mesh flex min-h-[calc(100vh-52px)]">
      {/* Labeled sidebar — easier than icon-only for new hires */}
      <aside className="hidden w-56 shrink-0 flex-col border-r border-[rgba(0,51,161,0.25)] bg-[#060d1a]/95 lg:flex">
        <div className="border-b border-[rgba(0,51,161,0.2)] px-4 py-5">
          <p className="font-[family-name:var(--font-design-mono)] text-[10px] font-medium uppercase tracking-[0.25em] text-[#d70fb6]">
            Design C · VECTOR
          </p>
          <p className="mt-1 text-lg font-bold text-white">Enablement</p>
        </div>
        <nav className="flex-1 space-y-0.5 p-3">
          {NAV.map((item) => {
            const active = view === item.id;
            return (
              <button
                className={`flex w-full flex-col rounded-lg px-3 py-2.5 text-left transition ${
                  active ? "vx-nav-active" : "text-[#8b9cb8] hover:bg-[#0c1529] hover:text-white"
                }`}
                key={item.id}
                onClick={() => setView(item.id)}
                type="button"
              >
                <span className="text-sm font-semibold">{item.label}</span>
                <span className="text-[11px] opacity-70">{item.desc}</span>
              </button>
            );
          })}
        </nav>
        <div className="border-t border-[rgba(0,51,161,0.2)] p-4">
          <div className="vx-badge-secure flex items-center gap-2 rounded-lg px-3 py-2">
            <Lock className="h-3.5 w-3.5" />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wide">AAL2 verified</p>
              <p className="text-[10px] opacity-80">Session secure</p>
            </div>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Global header: search + trust — patterns from portal UX research */}
        <header className="flex flex-wrap items-center gap-3 border-b border-[rgba(0,51,161,0.2)] bg-[#060d1a]/80 px-4 py-3 backdrop-blur-md sm:px-6">
          <Link className="text-xs text-[#8b9cb8] hover:text-[#d70fb6] lg:hidden" href="/design">
            ← Lab
          </Link>
          <div className="relative min-w-[200px] flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8b9cb8]" />
            <input
              className="w-full rounded-lg border border-[rgba(0,51,161,0.3)] bg-[#0c1529] py-2 pl-9 pr-3 text-sm text-white placeholder:text-[#8b9cb8]/60 focus:border-[#d70fb6]/50 focus:outline-none"
              placeholder="Search prep, sims, resources…"
              readOnly
              type="search"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="vx-badge-secure hidden items-center gap-1.5 rounded-full px-2.5 py-1 font-[family-name:var(--font-design-mono)] text-[10px] sm:inline-flex">
              <Shield className="h-3 w-3" />
              MFA active
            </span>
            <span className="rounded-full border border-[rgba(0,51,161,0.4)] px-2.5 py-1 text-xs text-[#8b9cb8]">
              {MOCK_USER.name}
            </span>
          </div>
        </header>

        {/* Mobile nav */}
        <div className="flex gap-1 overflow-x-auto border-b border-[rgba(0,51,161,0.15)] px-4 py-2 lg:hidden">
          {NAV.map((item) => (
            <button
              className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold ${
                view === item.id ? "bg-[#0033a1]/40 text-white" : "text-[#8b9cb8]"
              }`}
              key={item.id}
              onClick={() => setView(item.id)}
              type="button"
            >
              {item.label}
            </button>
          ))}
        </div>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          {view === "se" ? <VectorSeView /> : null}
          {view === "manager" ? <VectorManagerView assignStep={assignStep} setAssignStep={setAssignStep} /> : null}
          {view === "prep" ? <VectorPrepView /> : null}
          {view === "sim" ? <VectorSimView /> : null}
        </main>
      </div>
    </div>
  );
}

/** SE-first: one next action, then context — Dock/Highspot "what matters now" pattern */
function VectorSeView() {
  const nextStep = MOCK_PLAN_STEPS.find((s) => s.status === "active");

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <p className="font-[family-name:var(--font-design-mono)] text-xs uppercase tracking-widest text-[#d70fb6]">
          Good afternoon, Jordan
        </p>
        <h1 className="mt-1 text-2xl font-bold text-white sm:text-3xl">Your next move is clear.</h1>
      </div>

      {/* Primary action — largest element on page */}
      <div className="vx-panel vx-panel-accent relative overflow-hidden rounded-2xl p-6 sm:p-8">
        <div className="absolute right-0 top-0 h-32 w-32 rounded-full bg-[#d70fb6]/10 blur-3xl" />
        <p className="font-[family-name:var(--font-design-mono)] text-[10px] uppercase tracking-wider text-[#d70fb6]">
          Do this now
        </p>
        <h2 className="mt-2 text-xl font-bold text-white sm:text-2xl">{nextStep?.title ?? "Continue your plan"}</h2>
        <p className="mt-2 max-w-xl text-sm text-[#8b9cb8]">
          Due {nextStep?.due}. AI flagged competitive landmines — run a 5-min drill before your Acme call.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <button className="vx-cta inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-bold" type="button">
            <Zap className="h-4 w-4" />
            Start SLED roleplay
            <ArrowRight className="h-4 w-4" />
          </button>
          <button
            className="rounded-lg border border-[rgba(0,51,161,0.5)] bg-[#0033a1]/20 px-4 py-2.5 text-sm font-semibold text-white"
            type="button"
          >
            Prep Acme deal instead
          </button>
        </div>
      </div>

      {/* At-a-glance metrics — max 3 numbers per research */}
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { label: "Plan validated", value: "68%", hint: "Week 2 ramp" },
          { label: "Last sim score", value: "82", hint: "+14 vs last week" },
          { label: "Cert gates", value: "2 / 5", hint: "ISC next" },
        ].map((m) => (
          <div className="vx-panel rounded-xl p-4" key={m.label}>
            <p className="text-xs text-[#8b9cb8]">{m.label}</p>
            <p className="mt-1 text-2xl font-bold text-white">{m.value}</p>
            <p className="mt-1 text-[11px] text-[#d70fb6]">{m.hint}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        {/* Mission queue */}
        <div className="vx-panel rounded-xl p-5 lg:col-span-3">
          <h3 className="text-sm font-bold text-white">This week&apos;s plan</h3>
          <ul className="mt-4 space-y-2">
            {MOCK_PLAN_STEPS.map((step) => (
              <li
                className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 ${
                  step.status === "active"
                    ? "vx-step-active border-[#d70fb6]/40"
                    : step.status === "done"
                      ? "border-[rgba(0,51,161,0.2)] opacity-55"
                      : "border-[rgba(0,51,161,0.15)]"
                }`}
                key={step.title}
              >
                {step.status === "done" ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                ) : (
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-[#8b9cb8]/40 text-[9px]">
                    {step.due.replace("Day ", "")}
                  </span>
                )}
                <span className="min-w-0 flex-1 text-sm">{step.title}</span>
                {step.status === "active" ? (
                  <ChevronRight className="h-4 w-4 text-[#d70fb6]" />
                ) : null}
              </li>
            ))}
          </ul>
        </div>

        {/* AI nudge with action — not a chat panel */}
        <div className="vx-panel rounded-xl p-5 lg:col-span-2">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[#d70fb6]" />
            <h3 className="text-sm font-bold text-white">AI coach</h3>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-[#8b9cb8]">
            Your Okta reframe improved. Before Thursday, drill the &ldquo;we already have SSO&rdquo; objection once.
          </p>
          <button
            className="mt-4 w-full rounded-lg border border-[#d70fb6]/40 bg-[#d70fb6]/10 py-2 text-sm font-semibold text-[#f0a8e8]"
            type="button"
          >
            5-min objection drill
          </button>
        </div>
      </div>

      {/* Quick tools — 1-click row */}
      <div className="flex flex-wrap gap-2">
        {["Deal Prep", "Simulations", "Resources", "Certifications"].map((tool) => (
          <button
            className="rounded-lg border border-[rgba(0,51,161,0.35)] bg-[#0c1529] px-4 py-2 text-xs font-semibold text-[#8b9cb8] transition hover:border-[#d70fb6]/40 hover:text-white"
            key={tool}
            type="button"
          >
            {tool}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Manager: triage first, assign in 3 steps — Seismic contextual panel pattern */
function VectorManagerView({
  assignStep,
  setAssignStep,
}: {
  assignStep: number;
  setAssignStep: (n: number) => void;
}) {
  const coachCount = MOCK_TEAM.filter((m) => m.health === "coach_now").length;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Team command</h1>
        <p className="mt-1 text-sm text-[#8b9cb8]">Triage → act → done. No digging through menus.</p>
      </div>

      {/* Triage strip */}
      <div className="grid gap-3 sm:grid-cols-3">
        <button className="vx-panel flex items-center justify-between rounded-xl p-4 text-left transition hover:border-[#d70fb6]/30" type="button">
          <div>
            <p className="text-xs text-[#8b9cb8]">Needs review</p>
            <p className="text-2xl font-bold text-white">2</p>
          </div>
          <ClipboardCheck className="h-8 w-8 text-[#0033a1]" />
        </button>
        <button
          className={`vx-panel flex items-center justify-between rounded-xl p-4 text-left ${
            coachCount > 0 ? "vx-panel-accent" : ""
          }`}
          type="button"
        >
          <div>
            <p className="text-xs text-[#8b9cb8]">Coach now</p>
            <p className="text-2xl font-bold text-[#d70fb6]">{coachCount}</p>
          </div>
          <Users className="h-8 w-8 text-[#d70fb6]" />
        </button>
        <button
          className="vx-panel flex items-center justify-between rounded-xl p-4 text-left"
          onClick={() => setAssignStep(1)}
          type="button"
        >
          <div>
            <p className="text-xs text-[#8b9cb8]">Assign ramp</p>
            <p className="text-sm font-bold text-white">3-step flow →</p>
          </div>
          <Target className="h-8 w-8 text-[#0033a1]" />
        </button>
      </div>

      {/* Inline 3-step assign — visible without modal */}
      <div className="vx-panel rounded-xl p-5">
        <p className="text-xs font-bold uppercase tracking-wider text-[#d70fb6]">Quick assign onboarding plan</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {[
            { n: 1, label: "Pick template" },
            { n: 2, label: "Pick SE" },
            { n: 3, label: "Confirm" },
          ].map((s) => (
            <button
              className={`rounded-lg px-4 py-2 text-xs font-semibold ${
                assignStep === s.n ? "vx-cta" : "border border-[rgba(0,51,161,0.3)] text-[#8b9cb8]"
              }`}
              key={s.n}
              onClick={() => setAssignStep(s.n)}
              type="button"
            >
              {s.n}. {s.label}
            </button>
          ))}
        </div>
        {assignStep === 1 ? (
          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            {["Week 2 ramp", "60-day", "90-day"].map((t) => (
              <button
                className="rounded-lg border border-[rgba(0,51,161,0.3)] bg-[#0c1529] p-3 text-left text-sm hover:border-[#d70fb6]/40"
                key={t}
                onClick={() => setAssignStep(2)}
                type="button"
              >
                <p className="font-semibold text-white">{t}</p>
                <p className="text-[11px] text-[#8b9cb8]">5 steps · click to select</p>
              </button>
            ))}
          </div>
        ) : null}
        {assignStep === 2 ? (
          <div className="mt-4 space-y-2">
            {MOCK_TEAM.map((m) => (
              <button
                className="flex w-full items-center justify-between rounded-lg border border-[rgba(0,51,161,0.25)] px-3 py-2 text-sm hover:border-[#d70fb6]/40"
                key={m.name}
                onClick={() => setAssignStep(3)}
                type="button"
              >
                {m.name}
                <ChevronRight className="h-4 w-4" />
              </button>
            ))}
          </div>
        ) : null}
        {assignStep === 3 ? (
          <div className="mt-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4">
            <p className="text-sm font-semibold text-emerald-300">Week 2 ramp → Sam Okonkwo</p>
            <button className="vx-cta mt-3 rounded-lg px-4 py-2 text-sm font-bold" type="button">
              Assign plan
            </button>
          </div>
        ) : null}
      </div>

      {/* Team roster — health at a glance */}
      <div className="vx-panel overflow-hidden rounded-xl">
        <div className="border-b border-[rgba(0,51,161,0.2)] px-5 py-3">
          <h3 className="text-sm font-bold">Roster</h3>
        </div>
        <div className="divide-y divide-[rgba(0,51,161,0.15)]">
          {MOCK_TEAM.map((member) => (
            <div className="flex items-center gap-4 px-5 py-4" key={member.name}>
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#0033a1]/30 text-sm font-bold text-white">
                {member.name[0]}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold text-white">{member.name}</p>
                  <span className="font-[family-name:var(--font-design-mono)] text-xs text-[#8b9cb8]">
                    Sim {member.sim}
                  </span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#0c1529]">
                  <div className="vx-progress h-full rounded-full" style={{ width: `${member.progress}%` }} />
                </div>
              </div>
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                  member.health === "coach_now"
                    ? "bg-[#d70fb6]/20 text-[#f0a8e8]"
                    : "bg-emerald-500/15 text-emerald-300"
                }`}
              >
                {member.health.replace("_", " ")}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Deal prep: horizontal workflow steps — progressive disclosure */
function VectorPrepView() {
  const steps = ["Context", "Generate", "Brief", "Practice"];
  const activeIdx = 2;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <h1 className="text-2xl font-bold text-white">Deal Prep</h1>

      <div className="flex flex-wrap gap-2">
        {steps.map((label, i) => (
          <div
            className={`flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold ${
              i === activeIdx ? "bg-[#d70fb6]/20 text-[#f0a8e8]" : i < activeIdx ? "text-emerald-400" : "text-[#8b9cb8]"
            }`}
            key={label}
          >
            <span className="font-[family-name:var(--font-design-mono)]">{i + 1}</span>
            {label}
            {i < steps.length - 1 ? <ChevronRight className="h-3 w-3 opacity-40" /> : null}
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-12">
        <div className="vx-panel rounded-xl p-4 lg:col-span-3">
          <p className="text-xs font-bold text-[#8b9cb8]">Account</p>
          <p className="mt-2 font-semibold text-white">Univ. of South Florida</p>
          <p className="mt-4 text-xs text-[#8b9cb8]">Higher Ed · Discovery · Okta incumbent</p>
        </div>
        <div className="vx-panel rounded-xl p-5 lg:col-span-5">
          <p className="text-xs font-bold uppercase tracking-wider text-[#d70fb6]">Brief</p>
          <div className="mt-4 rounded-lg border border-[#0033a1]/40 bg-[#0033a1]/10 p-4">
            <p className="text-xs font-bold text-[#d70fb6]">One thing to nail</p>
            <p className="mt-1 text-sm text-white">Secure IAM workshop before fiscal freeze.</p>
          </div>
          <ul className="mt-4 space-y-2">
            {MOCK_OBJECTIONS.map((o) => (
              <li className="rounded-lg border border-[rgba(0,51,161,0.2)] px-3 py-2 text-xs text-[#8b9cb8]" key={o}>
                {o}
              </li>
            ))}
          </ul>
        </div>
        <div className="vx-panel vx-panel-accent rounded-xl p-5 lg:col-span-4">
          <p className="text-xs font-bold text-[#d70fb6]">Practice inline</p>
          <p className="mt-1 text-sm text-[#8b9cb8]">Brief stays visible. No page jump.</p>
          <div className="mt-4 rounded-lg bg-[#060d1a]/80 p-3 text-sm text-white">
            &ldquo;We already have Okta for SSO — why add another platform?&rdquo;
          </div>
          <button
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-[#d70fb6]/50 py-2.5 text-sm font-semibold text-[#f0a8e8]"
            type="button"
          >
            <Mic className="h-4 w-4" />
            Practice this objection
          </button>
        </div>
      </div>
    </div>
  );
}

function VectorSimView() {
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">SLED roleplay</h1>
        <span className="font-[family-name:var(--font-design-mono)] text-xs text-[#d70fb6]">Round 2 / 3</span>
      </div>
      <div className="vx-panel rounded-xl p-5">
        <div className="space-y-3">
          <div className="ml-auto max-w-[85%] rounded-xl bg-[#0033a1]/40 px-4 py-3 text-sm text-white">
            SE: We reduce cert cycle time 40% at peer IDNs by mapping ISC workflows first…
          </div>
          <div className="max-w-[85%] rounded-xl border border-[rgba(0,51,161,0.3)] bg-[#0c1529] px-4 py-3 text-sm text-[#8b9cb8]">
            CISO: Every vendor says that. What&apos;s different for SLED procurement?
          </div>
        </div>
        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <button className="vx-cta flex-1 rounded-lg py-2.5 text-sm font-bold" type="button">
            Send turn
          </button>
          <button className="flex-1 rounded-lg border border-[rgba(0,51,161,0.4)] py-2.5 text-sm font-semibold text-[#8b9cb8]" type="button">
            AI hint
          </button>
          <button className="flex-1 rounded-lg border border-[rgba(0,51,161,0.4)] py-2.5 text-sm font-semibold text-[#8b9cb8]" type="button">
            Back to brief
          </button>
        </div>
      </div>
    </div>
  );
}

export function VectorResearchPanel() {
  return (
    <section className="border-t border-[rgba(0,51,161,0.2)] bg-[#060d1a] px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <h2 className="text-lg font-bold text-white">Research → layout decisions</h2>
        <p className="mt-1 text-sm text-[#8b9cb8]">
          Patterns from Highspot, Seismic, Dock, WorkRamp, and portal UX guides applied to VECTOR.
        </p>
        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#d70fb6]">Market patterns</h3>
            <ul className="mt-3 space-y-2">
              {RESEARCH_INSIGHTS.map((r) => (
                <li className="text-xs text-[#8b9cb8]" key={r.source}>
                  <span className="font-semibold text-white">{r.source}:</span> {r.takeaway}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#d70fb6]">SE shoes</h3>
            <ul className="mt-3 space-y-2">
              {SE_WORKFLOW_PRIORITIES.map((p) => (
                <li className="flex gap-2 text-xs text-[#8b9cb8]" key={p}>
                  <Bot className="h-3.5 w-3.5 shrink-0 text-[#0033a1]" />
                  {p}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#d70fb6]">Manager shoes</h3>
            <ul className="mt-3 space-y-2">
              {MANAGER_WORKFLOW_PRIORITIES.map((p) => (
                <li className="flex gap-2 text-xs text-[#8b9cb8]" key={p}>
                  <Users className="h-3.5 w-3.5 shrink-0 text-[#0033a1]" />
                  {p}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

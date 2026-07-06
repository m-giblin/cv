"use client";

import Link from "next/link";
import {
  ArrowUpRight,
  Bot,
  Brain,
  Flame,
  LayoutDashboard,
  Mic,
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

type View = "se" | "manager" | "prep" | "sim";

export function ForgeMock() {
  const [view, setView] = useState<View>("se");

  const tabs: { id: View; label: string }[] = [
    { id: "se", label: "Workspace" },
    { id: "manager", label: "Team" },
    { id: "prep", label: "Deal Prep" },
    { id: "sim", label: "Sim" },
  ];

  return (
    <div className="design-forge df-stripe min-h-[calc(100vh-52px)]">
      {/* Hero strip */}
      <div className="border-b-2 border-zinc-900 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-end justify-between gap-4 px-4 py-6 sm:px-6">
          <div>
            <Link className="text-xs font-bold uppercase tracking-widest text-violet-600 hover:underline" href="/design">
              ← Design Lab
            </Link>
            <h1 className="mt-2 text-4xl font-black uppercase tracking-tight sm:text-5xl">
              FORGE<span className="text-violet-600">.</span>
            </h1>
            <p className="mt-1 max-w-md text-sm font-medium text-zinc-600">
              Design B — AI-forward enablement with brutal clarity and zero fluff.
            </p>
          </div>
          <div className="df-card-invert flex items-center gap-3 rounded-none px-4 py-3">
            <Brain className="h-6 w-6 text-violet-400" />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-violet-300">AI Engine</p>
              <p className="text-sm font-bold">Ready · 3 insights queued</p>
            </div>
          </div>
        </div>
        <nav className="mx-auto flex max-w-6xl gap-0 overflow-x-auto border-t-2 border-zinc-900 px-4 sm:px-6">
          {tabs.map((tab) => (
            <button
              className={`shrink-0 border-r-2 border-zinc-900 px-5 py-3 text-sm font-black uppercase tracking-wide transition last:border-r-0 ${
                view === tab.id ? "bg-violet-600 text-white" : "bg-white hover:bg-zinc-100"
              }`}
              key={tab.id}
              onClick={() => setView(tab.id)}
              type="button"
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        {view === "se" ? <ForgeSeView /> : null}
        {view === "manager" ? <ForgeManagerView /> : null}
        {view === "prep" ? <ForgePrepView /> : null}
        {view === "sim" ? <ForgeSimView /> : null}
      </div>
    </div>
  );
}

function ForgeSeView() {
  return (
    <div className="grid gap-6 lg:grid-cols-12">
      <div className="lg:col-span-8 space-y-6">
        <div className="df-card p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-violet-600">Your move</p>
              <h2 className="mt-2 text-3xl font-black">{MOCK_USER.name}</h2>
              <p className="mt-1 font-medium text-zinc-600">{MOCK_USER.level} · Week 2 ramp</p>
            </div>
            <div className="df-card bg-violet-600 px-4 py-2 text-white shadow-none">
              <p className="text-3xl font-black">68%</p>
              <p className="text-[10px] font-bold uppercase">Validated</p>
            </div>
          </div>
          <button className="mt-6 inline-flex items-center gap-2 bg-zinc-900 px-5 py-3 text-sm font-bold text-white" type="button">
            <Zap className="h-4 w-4" />
            Run SLED roleplay now
            <ArrowUpRight className="h-4 w-4" />
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { icon: Target, label: "Next step", value: "Simulation" },
            { icon: Bot, label: "Last sim", value: "82/100" },
            { icon: Flame, label: "Streak", value: "4 days" },
          ].map((item) => (
            <div className="df-card p-4" key={item.label}>
              <item.icon className="h-5 w-5" />
              <p className="mt-3 text-2xl font-black">{item.value}</p>
              <p className="text-xs font-bold uppercase text-zinc-500">{item.label}</p>
            </div>
          ))}
        </div>

        <div className="df-card p-5">
          <h3 className="font-black uppercase tracking-wide">Plan checklist</h3>
          <ul className="mt-4 divide-y-2 divide-zinc-900 border-t-2 border-zinc-900">
            {MOCK_PLAN_STEPS.map((step) => (
              <li className="flex items-center justify-between py-3" key={step.title}>
                <span className={`font-semibold ${step.status === "done" ? "line-through opacity-50" : ""}`}>
                  {step.title}
                </span>
                <span className="text-xs font-bold uppercase">{step.due}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="lg:col-span-4">
        <div className="df-card-invert sticky top-24 p-5">
          <Sparkles className="h-6 w-6 text-pink-400" />
          <p className="mt-3 text-lg font-black leading-snug">
            Practice competitive landmines before Thursday&apos;s Acme call.
          </p>
          <p className="mt-3 text-sm text-zinc-400">AI detected weak Okta reframe in last sim. +14pt potential.</p>
          <button className="mt-4 w-full border-2 border-white bg-white py-2 text-sm font-black text-zinc-900" type="button">
            Start AI drill
          </button>
        </div>
      </div>
    </div>
  );
}

function ForgeManagerView() {
  return (
    <div className="space-y-6">
      <div className="df-card flex flex-wrap items-center justify-between gap-4 p-5">
        <div>
          <h2 className="text-2xl font-black uppercase">Team overview</h2>
          <p className="text-sm font-medium text-zinc-600">Assign ramps. Review work. Move fast.</p>
        </div>
        <button className="bg-violet-600 px-4 py-2 text-sm font-black text-white" type="button">
          + Assign plan
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {MOCK_TEAM.map((member) => (
          <div className="df-card p-4" key={member.name}>
            <div className="flex items-center justify-between">
              <p className="font-black">{member.name}</p>
              <span className="text-2xl font-black">{member.progress}%</span>
            </div>
            <div className="mt-3 h-3 border-2 border-zinc-900 bg-white">
              <div className="h-full bg-violet-600" style={{ width: `${member.progress}%` }} />
            </div>
            <p className="mt-2 text-xs font-bold uppercase text-zinc-500">Sim avg {member.sim}</p>
          </div>
        ))}
      </div>

      <div className="df-card p-5">
        <p className="text-xs font-black uppercase tracking-widest text-violet-600">Ramp library</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {["Week 1", "Week 2", "Week 3", "Week 4", "60-day", "90-day"].map((name) => (
            <button
              className="border-2 border-zinc-900 bg-white p-4 text-left transition hover:bg-violet-50 hover:shadow-[3px_3px_0_#7c3aed]"
              key={name}
              type="button"
            >
              <LayoutDashboard className="h-4 w-4" />
              <p className="mt-2 font-black">{name}</p>
              <p className="text-xs text-zinc-500">5 steps · grab & assign</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function ForgePrepView() {
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="df-card p-5">
        <p className="text-xs font-black uppercase text-violet-600">Context</p>
        <div className="mt-4 space-y-3">
          <input className="w-full border-2 border-zinc-900 px-3 py-2 font-semibold" readOnly value="University of South Florida" />
          <textarea className="h-32 w-full border-2 border-zinc-900 p-3 text-sm" readOnly value="First discovery. Okta incumbent. Fiscal pressure Q3." />
        </div>
        <button className="mt-4 w-full bg-zinc-900 py-3 text-sm font-black text-white" type="button">
          Generate AI brief
        </button>
      </div>
      <div className="df-card p-5 lg:col-span-1">
        <p className="text-xs font-black uppercase">Brief output</p>
        <div className="mt-4 border-l-4 border-violet-600 pl-4">
          <p className="font-black">One thing to nail</p>
          <p className="mt-1 text-sm text-zinc-600">Book IAM workshop before budget freeze.</p>
        </div>
        <ul className="mt-6 space-y-2">
          {MOCK_OBJECTIONS.map((o) => (
            <li className="flex items-start justify-between gap-2 border-t-2 border-zinc-200 pt-2 text-sm" key={o}>
              <span>{o}</span>
              <button className="shrink-0 font-black text-violet-600" type="button">
                <Mic className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      </div>
      <div className="df-card-invert p-5">
        <Users className="h-5 w-5" />
        <p className="mt-2 font-black">Practice panel</p>
        <p className="mt-2 text-sm text-zinc-400">Brief stays visible. Drill runs here.</p>
        <div className="mt-4 border-2 border-zinc-700 p-3 text-sm">
          &ldquo;We already have Okta for SSO…&rdquo;
        </div>
        <button className="mt-4 w-full border-2 border-white py-2 text-sm font-black" type="button">
          Open mic
        </button>
      </div>
    </div>
  );
}

function ForgeSimView() {
  return (
    <div className="df-card max-w-3xl p-6">
      <div className="flex items-center justify-between border-b-2 border-zinc-900 pb-4">
        <h2 className="text-xl font-black uppercase">Roleplay</h2>
        <span className="bg-pink-600 px-2 py-1 text-xs font-black text-white">LIVE</span>
      </div>
      <div className="mt-6 space-y-4">
        <div className="ml-auto max-w-[80%] bg-zinc-900 p-4 text-sm text-white">
          SE: We map ISC workflows to your top two identity risks…
        </div>
        <div className="max-w-[80%] border-2 border-zinc-900 bg-white p-4 text-sm">
          CISO: Every vendor says that. Prove it for SLED procurement.
        </div>
      </div>
      <div className="mt-6 flex flex-col gap-2 sm:flex-row">
        <button className="flex-1 bg-violet-600 py-3 text-sm font-black text-white" type="button">
          Send turn
        </button>
        <button className="flex-1 border-2 border-zinc-900 py-3 text-sm font-black" type="button">
          Quick feedback
        </button>
        <button className="flex-1 border-2 border-zinc-900 py-3 text-sm font-black" type="button">
          Back to brief
        </button>
      </div>
    </div>
  );
}

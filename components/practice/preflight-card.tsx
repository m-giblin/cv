"use client";

import Link from "next/link";
import { useEffect, useId, useMemo, useState } from "react";
import { toast } from "sonner";
import { FIELD_CLS, LABEL_CLS, SELECT_CLS } from "@/components/se/form-classes";
import { cn } from "@/lib/utils";

export type PreflightTool = "market-pulse" | "deal-prep" | "simulations" | "flight-check";

type Row = { tool: PreflightTool; title: string; sub: string; minutes: number; href: string };

const STORAGE_KEY = "se-preflight-v1";

type Saved = { account: string; persona: string; date: string; built: boolean; done: Record<string, boolean> };

function buildRows(account: string, persona: string, tools: PreflightTool[]): Row[] {
  const audience = persona.split(/[—(]/)[0]!.trim() || "buyer";
  const all: Row[] = [
    {
      tool: "market-pulse",
      title: "Market Pulse refresher",
      sub: "Competitive positioning for this conversation",
      minutes: 5,
      href: "/practice/quizzes",
    },
    {
      tool: "deal-prep",
      title: "Deal prep brief",
      sub: `${account.trim() || "Account"}: discovery questions and likely objections`,
      minutes: 10,
      href: "/practice/deal-prep",
    },
    {
      tool: "simulations",
      title: `Simulation: ${audience}`,
      sub: "Scored coaching card to your manager",
      minutes: 15,
      href: "/practice/simulations",
    },
    {
      tool: "flight-check",
      title: "Flight Check",
      sub: "Adaptive readiness check",
      minutes: 5,
      href: "/practice/flight-check",
    },
  ];
  return all.filter((row) => tools.includes(row.tool));
}

/**
 * Practice › Pre-flight (artboard 3a, prototype "practice"): pick the call, build a short path that
 * chains Market Pulse, Deal prep, a simulation and Flight Check. Progress is kept in this browser.
 */
export function PreflightCard({ personas, tools }: { personas: string[]; tools: PreflightTool[] }) {
  const ids = { account: useId(), persona: useId(), date: useId(), path: useId() };
  const [account, setAccount] = useState("");
  const [persona, setPersona] = useState(personas[0] ?? "");
  const [date, setDate] = useState("");
  const [built, setBuilt] = useState(false);
  const [done, setDone] = useState<Record<string, boolean>>({});

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw) as Saved;
      setAccount(saved.account ?? "");
      if (saved.persona && personas.includes(saved.persona)) setPersona(saved.persona);
      setDate(saved.date ?? "");
      setBuilt(Boolean(saved.built));
      setDone(saved.done ?? {});
    } catch {
      // storage unavailable
    }
  }, [personas]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ account, persona, date, built, done } satisfies Saved));
    } catch {
      // storage unavailable
    }
  }, [account, persona, date, built, done]);

  const rows = useMemo(() => buildRows(account, persona, tools), [account, persona, tools]);
  const minutes = rows.reduce((sum, row) => sum + row.minutes, 0);
  const doneCount = rows.filter((row) => done[row.tool]).length;

  function build() {
    setBuilt(true);
    setDone({});
    toast(`Pre-flight built for ${persona || "your call"}`);
  }

  function toggle(tool: PreflightTool) {
    const nextDone = { ...done, [tool]: !done[tool] };
    setDone(nextDone);
    if (!done[tool] && rows.every((row) => nextDone[row.tool])) {
      toast("Pre-flight complete. You're cleared for the call.");
    }
  }

  return (
    <section
      aria-labelledby="preflight-heading"
      className="grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-8 rounded-[14px] border-[1.5px] border-ink bg-white px-6 py-[22px]"
    >
      <form
        className="flex flex-col gap-3.5"
        onSubmit={(event) => {
          event.preventDefault();
          build();
        }}
      >
        <div className="flex flex-col gap-1">
          <span className="font-mono text-xs font-medium uppercase text-blue">Pre-flight</span>
          <h2 className="text-2xl font-extrabold tracking-[-0.015em] text-ink" id="preflight-heading">
            Prepare for a call
          </h2>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className={LABEL_CLS} htmlFor={ids.account}>
            Account
          </label>
          <input
            className={FIELD_CLS}
            id={ids.account}
            onChange={(event) => setAccount(event.target.value)}
            placeholder="e.g. Mercy Health System"
            value={account}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className={LABEL_CLS} htmlFor={ids.persona}>
            Who you&apos;re meeting
          </label>
          <select
            className={SELECT_CLS}
            id={ids.persona}
            onChange={(event) => {
              setPersona(event.target.value);
              setDone({});
            }}
            value={persona}
          >
            {personas.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className={LABEL_CLS} htmlFor={ids.date}>
            Call date
          </label>
          <input
            className={cn(FIELD_CLS, "w-[200px]")}
            id={ids.date}
            onChange={(event) => setDate(event.target.value)}
            type="date"
            value={date}
          />
        </div>
        <button className="btn-primary mt-1 self-start" type="submit">
          {built ? "Rebuild pre-flight" : "Build my pre-flight"}
        </button>
      </form>

      <div className="flex flex-col gap-2">
        <div className="flex justify-between gap-3 font-mono text-xs uppercase">
          <span className="font-medium text-muted" id={ids.path}>
            Your pre-flight
          </span>
          <span className="font-medium text-ink" role="status">
            {built ? `${doneCount}/${rows.length} done · ` : ""}~{minutes} min
          </span>
        </div>
        {built ? (
          <ol aria-labelledby={ids.path} className="flex flex-col gap-2">
            {rows.map((row, index) => {
              const isDone = Boolean(done[row.tool]);
              return (
                <li
                  className={cn(
                    "grid grid-cols-[52px_minmax(0,1fr)_auto] items-stretch overflow-hidden rounded-[14px] bg-white",
                    isDone ? "border-[1.5px] border-blue bg-blue-soft" : "border border-line",
                  )}
                  key={row.tool}
                >
                  <button
                    aria-label={`${isDone ? "Mark not done" : "Mark done"}: ${row.title}`}
                    aria-pressed={isDone}
                    className={cn(
                      "grid place-items-center text-[22px] font-extrabold tracking-[-0.03em]",
                      isDone ? "bg-signal text-ink" : "bg-blue text-white hover:bg-blue-2",
                    )}
                    onClick={() => toggle(row.tool)}
                    type="button"
                  >
                    {isDone ? "✓" : String(index + 1).padStart(2, "0")}
                  </button>
                  <span className="-ml-0.5 flex min-w-0 flex-col gap-0.5 border-l-2 border-dashed border-line-strong px-3.5 py-2.5">
                    <Link className="text-[15px] font-bold text-ink underline decoration-signal decoration-2 underline-offset-[3px] hover:decoration-ink" href={row.href}>
                      {row.title}
                    </Link>
                    <span className="text-[13px] text-ink-2">{row.sub}</span>
                  </span>
                  <span className="self-center px-3.5 font-mono text-xs text-muted uppercase">
                    {isDone ? "✓ Done" : `${row.minutes} min`}
                  </span>
                </li>
              );
            })}
          </ol>
        ) : (
          <p className="rounded-[14px] border-[1.5px] border-dashed border-line-strong p-7 text-center text-[15px] leading-[1.5] text-muted">
            Pick who you&apos;re meeting and build your pre-flight. It chains Market Pulse, Deal prep, a simulation and
            Flight Check.
          </p>
        )}
      </div>
    </section>
  );
}

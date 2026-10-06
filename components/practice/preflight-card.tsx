"use client";

import Link from "next/link";
import { useEffect, useId, useMemo, useState } from "react";
import { toast } from "sonner";
import { FIELD_CLS, LABEL_CLS, SELECT_CLS } from "@/components/se/form-classes";
import { PREFLIGHT_MINUTES, type PreflightTool } from "@/lib/se/preflight";
import { cn } from "@/lib/utils";

export type { PreflightTool } from "@/lib/se/preflight";


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
      minutes: PREFLIGHT_MINUTES["market-pulse"],
      href: "/practice/quizzes",
    },
    {
      tool: "deal-prep",
      title: "Deal prep brief",
      sub: account.trim() ? `${account.trim()}: discovery questions and likely objections` : "Discovery questions and likely objections",
      minutes: PREFLIGHT_MINUTES["deal-prep"],
      href: "/practice/deal-prep",
    },
    {
      tool: "simulations",
      title: `Simulation: ${audience}`,
      sub: "Scored card goes to your manager",
      minutes: PREFLIGHT_MINUTES.simulations,
      href: "/practice/simulations",
    },
    {
      tool: "flight-check",
      title: "Flight Check",
      sub: "A short adaptive readiness check",
      minutes: PREFLIGHT_MINUTES["flight-check"],
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
      className="grid gap-9 rounded-[14px] border border-line bg-white px-[26px] py-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]"
    >
      <form
        className="flex flex-col gap-3.5"
        onSubmit={(event) => {
          event.preventDefault();
          build();
        }}
      >
        <p className="label-caps label-caps--blue">Pre-flight</p>
        <h2 className="text-2xl font-extrabold tracking-[-0.015em] text-ink" id="preflight-heading">
          Prepare for a call
        </h2>
        <div className="flex flex-col gap-1.5">
          <label className={LABEL_CLS} htmlFor={ids.account}>
            Account
          </label>
          <input
            className={FIELD_CLS}
            id={ids.account}
            onChange={(event) => setAccount(event.target.value)}
            placeholder="For example, Mercy Health System"
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
            className={FIELD_CLS}
            id={ids.date}
            onChange={(event) => setDate(event.target.value)}
            type="date"
            value={date}
          />
        </div>
        <button className="btn-primary mt-1 self-start" type="submit">
          {built ? "Rebuild my pre-flight" : "Build my pre-flight"}
        </button>
      </form>

      <div className="flex flex-col">
        <div className="flex items-baseline justify-between gap-3 pb-2.5">
          <h3 className="text-[15px] font-bold text-ink" id={ids.path}>
            Your plan
          </h3>
          <span className="text-sm text-muted" role="status">
            {built ? `${doneCount} of ${rows.length} done, about ${minutes} min` : `About ${minutes} min`}
          </span>
        </div>
        <ol aria-labelledby={ids.path} className="flex flex-col">
          {rows.map((row, index) => {
            const isDone = built && Boolean(done[row.tool]);
            return (
              <li
                className={cn(
                  "grid grid-cols-[44px_minmax(0,1fr)_auto] items-center gap-3.5 border-t border-divider py-3",
                  isDone && "-mx-3 rounded-[10px] bg-blue-soft px-3",
                )}
                key={row.tool}
              >
                {built ? (
                  <button
                    aria-label={`${isDone ? "Mark not done" : "Mark done"}: ${row.title}`}
                    aria-pressed={isDone}
                    className={cn(
                      "grid h-9 w-9 place-items-center rounded-full text-[15px] font-extrabold",
                      isDone ? "bg-blue text-white" : "bg-blue-soft text-blue hover:bg-[#D3DEF6]",
                    )}
                    onClick={() => toggle(row.tool)}
                    type="button"
                  >
                    {isDone ? (
                      <span aria-hidden className="block h-3 w-1.5 -translate-y-px rotate-45 border-r-2 border-b-2 border-white" />
                    ) : (
                      index + 1
                    )}
                  </button>
                ) : (
                  <span
                    aria-hidden
                    className="grid h-9 w-9 place-items-center rounded-full bg-blue-soft text-[15px] font-extrabold text-blue"
                  >
                    {index + 1}
                  </span>
                )}
                <span className="flex min-w-0 flex-col gap-0.5">
                  {built ? (
                    <Link className="text-[15px] font-bold text-ink hover:underline hover:decoration-signal hover:decoration-2 hover:underline-offset-4" href={row.href}>
                      {row.title}
                    </Link>
                  ) : (
                    <span className="text-[15px] font-bold text-ink">{row.title}</span>
                  )}
                  <span className="truncate text-[13px] text-muted">{row.sub}</span>
                </span>
                <span className="text-sm text-muted">{isDone ? "Done" : `${row.minutes} min`}</span>
              </li>
            );
          })}
        </ol>
        {!built ? (
          <p className="border-t border-divider pt-3 text-[13px] text-muted">
            Pick who you&apos;re meeting and build the plan. Then tick each step off as you go.
          </p>
        ) : null}
      </div>
    </section>
  );
}

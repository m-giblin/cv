"use client";

import { ExternalLink, Loader2, RefreshCw, Sparkles } from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Drawer } from "@/components/ui/drawer";
import { StatusPill } from "@/components/ui/status-pill";
import type { AdminQuestion, BankSource } from "@/lib/question-bank/data";
import { SOLUTION_AREAS, SOURCE_LABEL, areasFor, solutionOrder, sourceKey, type QuestionSourceKind, type SolutionArea } from "@/lib/question-bank/model";

type Bank = { questions: AdminQuestion[]; sources: BankSource[]; playbooks: { id: string; title: string }[] };

const INPUT_CLASS = "w-full rounded-[10px] border border-line-strong bg-white px-3 py-2 text-[15px] font-normal text-ink";
const LETTERS = ["A", "B", "C", "D", "E", "F"];

async function post(url: string, body: unknown, method = "POST") {
  const response = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const json = (await response.json().catch(() => null)) as { error?: string } | null;
  if (response.status === 401) throw new Error("Your session timed out. Refresh the page, sign in again, then try once more.");
  if (!response.ok) throw new Error(json?.error ?? "Something went wrong.");
  return json;
}

function sourceBody(source: Pick<BankSource, "kind" | "playbookId" | "topic">) {
  return source.kind === "playbook" ? { kind: "playbook", playbookId: source.playbookId } : { kind: source.kind, topic: source.topic };
}

const SITE_GROUP: Record<SolutionArea["site"], string> = {
  docs: "documentation.sailpoint.com",
  developer: "developer.sailpoint.com",
  field: "Field skills",
};

/** Solution options grouped the way the two SailPoint sites group them. */
function SolutionOptions({ areas }: { areas: SolutionArea[] }) {
  return (
    <>
      {(["docs", "developer", "field"] as const)
        .filter((site) => areas.some((area) => area.site === site))
        .map((site) => (
          <optgroup key={site} label={SITE_GROUP[site]}>
            {areas
              .filter((area) => area.site === site)
              .map((area) => (
                <option key={area.name} value={area.name}>
                  {area.name}
                </option>
              ))}
          </optgroup>
        ))}
    </>
  );
}

/** Generate panel: pick a source, get a batch of drafts to review. */
function GeneratePanel({ playbooks, onDone }: { playbooks: Bank["playbooks"]; onDone: (key: string) => void }) {
  const [kind, setKind] = useState<Exclude<QuestionSourceKind, "manual">>("playbook");
  const [playbookId, setPlaybookId] = useState(playbooks[0]?.id ?? "");
  const [topic, setTopic] = useState("");
  const [count, setCount] = useState(8);
  const [solution, setSolution] = useState<string>(SOLUTION_AREAS[0]!.name);
  const area = SOLUTION_AREAS.find((item) => item.name === solution);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function generate() {
    setError("");
    if (kind === "playbook" && !playbookId) return setError("Publish a playbook first, then pick it here.");
    if (kind !== "playbook" && topic.trim().length < 3) return setError("Enter a topic, such as access profiles or the identities API.");
    setBusy(true);
    try {
      const result = (await post(
        "/api/admin/question-bank/generate",
        kind === "playbook" ? { kind, playbookId, count, solution } : { kind, topic, count, solution },
      )) as {
        count: number;
      };
      toast.success(`${result.count} draft questions ready to review`);
      onDone(kind === "playbook" ? `playbook:${playbookId}` : `${kind}:${topic.trim().toLowerCase()}`);
      setTopic("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Couldn't generate questions.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="flex flex-col gap-4">
      <p className="text-sm text-muted">
        The AI drafts questions from the source, then opens them for review. Nothing reaches learners until you approve it.
      </p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3" role="group" aria-label="Source">
        {(["playbook", "docs", "developer"] as const).map((option) => (
          <button
            aria-pressed={kind === option}
            className={`rounded-[10px] border px-3 py-2.5 text-left text-sm ${kind === option ? "border-2 border-blue bg-blue-soft font-bold text-blue" : "border-line text-ink hover:border-line-strong"}`}
            key={option}
            onClick={() => {
              setKind(option);
              // Keep the solution valid for the new source: developer topics use developer sections.
              const fits = areasFor(option);
              if (!fits.some((item) => item.name === solution)) setSolution(fits[0]!.name);
            }}
            type="button"
          >
            {option === "playbook" ? "A playbook chapter" : option === "docs" ? "SailPoint docs topic" : "Developer portal topic"}
          </button>
        ))}
      </div>
      <label className="flex flex-col gap-1.5 text-sm font-semibold text-ink">
        {kind === "developer" ? "Developer area" : "SailPoint solution"}
        <select className={INPUT_CLASS} onChange={(event) => setSolution(event.target.value)} value={solution}>
          <SolutionOptions areas={areasFor(kind)} />
        </select>
        <span className="text-[13px] font-normal text-muted">The bank is filed under this. You can move it later.</span>
      </label>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_120px]">
        {kind === "playbook" ? (
          <label className="flex flex-col gap-1.5 text-sm font-semibold text-ink">
            Playbook
            <select className={INPUT_CLASS} onChange={(event) => setPlaybookId(event.target.value)} value={playbookId}>
              {playbooks.length ? null : <option value="">No published playbooks</option>}
              {playbooks.map((playbook) => (
                <option key={playbook.id} value={playbook.id}>
                  {playbook.title}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <label className="flex flex-col gap-1.5 text-sm font-semibold text-ink">
            Topic on {kind === "docs" ? "documentation" : "developer"}.sailpoint.com
            <input
              className={INPUT_CLASS}
              onChange={(event) => setTopic(event.target.value)}
              list="question-topic-suggestions"
              placeholder={area?.topics[0] ?? (kind === "docs" ? `${solution} overview` : `${solution} basics`)}
              value={topic}
            />
            <datalist id="question-topic-suggestions">
              {(area?.topics ?? []).map((item) => (
                <option key={item} value={item} />
              ))}
            </datalist>
            {area?.topics.length ? (
              <span className="flex flex-wrap gap-1.5 pt-1 font-normal">
                {area.topics.slice(0, 6).map((item) => (
                  <button
                    className="rounded-full border border-line px-2.5 py-0.5 text-[13px] text-muted hover:border-line-strong hover:text-ink"
                    key={item}
                    onClick={() => setTopic(item)}
                    type="button"
                  >
                    {item}
                  </button>
                ))}
              </span>
            ) : null}
          </label>
        )}
        <label className="flex flex-col gap-1.5 text-sm font-semibold text-ink">
          How many
          <select className={INPUT_CLASS} onChange={(event) => setCount(Number(event.target.value))} value={count}>
            {[5, 8, 10, 15].map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
      </div>
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      <div>
        <button className="btn-primary inline-flex items-center gap-2" disabled={busy} onClick={() => void generate()} type="button">
          {busy ? <Loader2 aria-hidden className="animate-spin" size={16} /> : <Sparkles aria-hidden size={16} />}
          {busy ? (kind === "playbook" ? "Writing questions" : "Searching the docs and writing questions") : "Generate questions"}
        </button>
      </div>
    </section>
  );
}

/** One question: read view with actions, or an inline editor. */
function QuestionCard({ question, onChanged }: { question: AdminQuestion; onChanged: () => void }) {
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [stem, setStem] = useState(question.stem);
  const [choices, setChoices] = useState(question.choices);
  const [correctIndex, setCorrectIndex] = useState(question.correctIndex);
  const [explanation, setExplanation] = useState(question.explanation);
  const [difficulty, setDifficulty] = useState(question.difficulty);

  async function run(label: string, action: () => Promise<unknown>) {
    setBusy(true);
    try {
      await action();
      toast.success(label);
      onChanged();
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : "Couldn't save.");
    } finally {
      setBusy(false);
    }
  }

  if (editing) {
    return (
      <li className="flex flex-col gap-3 border-b border-divider bg-bg px-4 py-4 last:border-b-0">
        <label className="flex flex-col gap-1 text-[13px] font-semibold text-ink">
          Question
          <textarea className={INPUT_CLASS} onChange={(event) => setStem(event.target.value)} rows={2} value={stem} />
        </label>
        {choices.map((choice, index) => (
          <label className="flex items-center gap-2 text-sm" key={index}>
            <input checked={correctIndex === index} name={`correct-${question.id}`} onChange={() => setCorrectIndex(index)} type="radio" />
            <span className="w-5 font-bold text-muted">{LETTERS[index]}</span>
            <input
              className={INPUT_CLASS}
              onChange={(event) => setChoices((current) => current.map((item, i) => (i === index ? event.target.value : item)))}
              value={choice}
            />
          </label>
        ))}
        <p className="text-[13px] text-muted">Select the radio button next to the right answer.</p>
        <label className="flex flex-col gap-1 text-[13px] font-semibold text-ink">
          Why it&apos;s right
          <textarea className={INPUT_CLASS} onChange={(event) => setExplanation(event.target.value)} rows={2} value={explanation} />
        </label>
        <label className="flex w-40 flex-col gap-1 text-[13px] font-semibold text-ink">
          Difficulty
          <select className={INPUT_CLASS} onChange={(event) => setDifficulty(event.target.value as typeof difficulty)} value={difficulty}>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </label>
        <div className="flex gap-2">
          <button
            className="btn-primary"
            disabled={busy}
            onClick={() =>
              void run("Question saved", async () => {
                await post(`/api/admin/question-bank/${question.id}`, { stem, choices, correctIndex, explanation, difficulty }, "PATCH");
                setEditing(false);
              })
            }
            type="button"
          >
            Save
          </button>
          <button className="btn-secondary" onClick={() => setEditing(false)} type="button">
            Cancel
          </button>
        </div>
      </li>
    );
  }

  const isDraft = question.status === "draft";
  return (
    <li className="flex flex-col gap-2 border-b border-divider px-4 py-3 last:border-b-0">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-bold text-ink">{question.stem}</p>
        <span className="flex shrink-0 gap-1.5">
          {question.replacesId ? <StatusPill tone="blue">Rewrite</StatusPill> : null}
          <StatusPill tone="neutral">{question.difficulty}</StatusPill>
        </span>
      </div>
      <ol className="flex flex-col gap-0.5 text-sm">
        {question.choices.map((choice, index) => (
          <li className={index === question.correctIndex ? "font-bold text-success" : "text-ink"} key={index}>
            {LETTERS[index]}. {choice}
            {!isDraft && question.stats.shown ? (
              <span className="font-normal text-muted"> · picked {question.stats.picks[index] ?? 0}</span>
            ) : null}
          </li>
        ))}
      </ol>
      <p className="text-[13px] text-muted">{question.explanation}</p>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px]">
        {question.competency ? <span className="text-muted">{question.competency}</span> : null}
        {question.sourceUrl ? (
          <a className="link inline-flex items-center gap-1" href={question.sourceUrl} rel="noreferrer" target="_blank">
            {question.sourceTitle ?? "Source"} <ExternalLink aria-hidden size={12} />
          </a>
        ) : null}
        {!isDraft ? (
          <span className={question.health.flag ? "font-bold text-warning" : "text-muted"}>{question.health.label}</span>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
        {isDraft ? (
          <>
            <button
              className="link"
              disabled={busy}
              onClick={() => void run("Approved", () => post("/api/admin/question-bank/review", { ids: [question.id], action: "approve" }))}
              type="button"
            >
              Approve
            </button>
            <button className="link" onClick={() => setEditing(true)} type="button">
              Edit
            </button>
            <button
              className="link text-danger"
              disabled={busy}
              onClick={() => void run("Rejected", () => post("/api/admin/question-bank/review", { ids: [question.id], action: "reject" }))}
              type="button"
            >
              Reject
            </button>
          </>
        ) : (
          <>
            <button
              className="link inline-flex items-center gap-1"
              disabled={busy}
              onClick={() => void run("Rewrite drafted for review", () => post(`/api/admin/question-bank/${question.id}/improve`, {}))}
              type="button"
            >
              <Sparkles aria-hidden size={14} /> Improve with AI
            </button>
            <button className="link" onClick={() => setEditing(true)} type="button">
              Edit
            </button>
            <button
              className="link text-danger"
              disabled={busy}
              onClick={() => void run("Retired", () => post("/api/admin/question-bank/review", { ids: [question.id], action: "reject" }))}
              type="button"
            >
              Retire
            </button>
          </>
        )}
      </div>
    </li>
  );
}

type Tab = "review" | "rotation" | "retired";

function QuestionList({ questions, onChanged, empty }: { questions: AdminQuestion[]; onChanged: () => void; empty: ReactNode }) {
  if (!questions.length) return <p className="rounded-[14px] border border-dashed border-line px-4 py-8 text-center text-sm text-muted">{empty}</p>;
  return (
    <ul className="overflow-hidden rounded-[14px] border border-line bg-white shadow-[var(--shadow-card)]">
      {questions.map((question) => (
        <QuestionCard key={question.id} onChanged={onChanged} question={question} />
      ))}
    </ul>
  );
}

/** One bank (a playbook or docs topic) as a workbench: review drafts, manage the rotation, see what's retired. */
function BankWorkbench({
  source,
  questions,
  initialTab,
  onChanged,
  onClose,
}: {
  source: BankSource;
  questions: AdminQuestion[];
  initialTab: Tab;
  onChanged: () => void;
  onClose: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const drafts = questions.filter((question) => question.status === "draft");
  const active = questions.filter((question) => question.status === "active").sort((a, b) => Number(Boolean(b.health.flag)) - Number(Boolean(a.health.flag)));
  const retired = questions.filter((question) => question.status === "retired");
  const [tab, setTab] = useState<Tab>(initialTab === "review" && !drafts.length ? "rotation" : initialTab);
  const answered = active.reduce((sum, question) => sum + question.stats.shown, 0);
  const correct = active.reduce((sum, question) => sum + question.stats.correct, 0);

  async function run(label: string, action: () => Promise<unknown>, after?: () => void) {
    setBusy(true);
    try {
      await action();
      toast.success(label);
      after?.();
      onChanged();
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : "Couldn't save.");
    } finally {
      setBusy(false);
    }
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "review", label: `To review (${drafts.length})` },
    { id: "rotation", label: `In rotation (${active.length})` },
    { id: "retired", label: `Retired (${retired.length})` },
  ];

  return (
    <Drawer
      bodyWidth="full"
      eyebrow={SOURCE_LABEL[source.kind]}
      mainLabel="Questions"
      onClose={onClose}
      open
      side={
        <div className="flex flex-col gap-5">
          <dl className="grid grid-cols-2 overflow-hidden rounded-[14px] border border-line bg-white shadow-[var(--shadow-card)]">
            {[
              { label: "Live", value: active.length },
              { label: "To review", value: drafts.length },
              { label: "Answers", value: answered },
              { label: "Correct", value: answered ? `${Math.round((correct / answered) * 100)}%` : "None" },
            ].map((stat) => (
              <div className="flex flex-col gap-1 border-b border-r border-divider px-3 py-3 [&:nth-child(2n)]:border-r-0 [&:nth-child(n+3)]:border-b-0" key={stat.label}>
                <dt className="label-caps">{stat.label}</dt>
                <dd className="num text-[22px] leading-none font-extrabold text-blue">{stat.value}</dd>
              </div>
            ))}
          </dl>
          {source.flagged ? (
            <p className="rounded-[12px] border border-warning bg-warning-soft px-3 py-2 text-sm text-ink">
              {source.flagged} question{source.flagged === 1 ? "" : "s"} flagged by the stats. They&apos;re at the top of In rotation; use Improve with AI.
            </p>
          ) : null}
          <div className="flex flex-col gap-2 rounded-[14px] border border-line bg-white p-4 shadow-[var(--shadow-card)]">
            <h3 className="font-bold text-ink">Keep it fresh</h3>
            <p className="text-sm text-muted">Draft new questions that don&apos;t repeat any already written. You choose whether they join or replace the current set.</p>
            <button
              className="btn-secondary inline-flex items-center justify-center gap-2"
              disabled={busy}
              onClick={() => void run("Fresh set drafted for review", () => post("/api/admin/question-bank/generate", { ...sourceBody(source), count: 8 }), () => setTab("review"))}
              type="button"
            >
              {busy ? <Loader2 aria-hidden className="animate-spin" size={16} /> : <RefreshCw aria-hidden size={16} />}
              Generate a fresh set
            </button>
          </div>
          <label className="flex flex-col gap-1.5 text-sm font-semibold text-ink">
            Filed under
            <select
              className={INPUT_CLASS}
              disabled={busy}
              onChange={(event) =>
                void run(`Moved to ${event.target.value}`, () =>
                  post("/api/admin/question-bank/solution", {
                    kind: source.kind,
                    playbookId: source.playbookId,
                    topic: source.topic,
                    solution: event.target.value,
                  }),
                )
              }
              value={source.solution}
            >
              <SolutionOptions areas={areasFor(source.kind)} />
            </select>
          </label>
          <a className="link text-sm" href={`/learn/knowledge-checks?source=${encodeURIComponent(source.key)}`} rel="noreferrer" target="_blank">
            Try it as a learner
          </a>
        </div>
      }
      sideLabel="Bank"
      title={source.title}
    >
      <div className="flex flex-col gap-4">
        <div className="flex gap-1.5" role="tablist">
          {tabs.map((item) => (
            <button
              aria-selected={tab === item.id}
              className={`rounded-[8px] px-3 py-1.5 text-sm ${tab === item.id ? "bg-blue-soft font-bold text-blue" : "text-muted hover:text-ink"}`}
              key={item.id}
              onClick={() => setTab(item.id)}
              role="tab"
              type="button"
            >
              {item.label}
            </button>
          ))}
        </div>

        {tab === "review" ? (
          <>
            {drafts.length ? (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-[12px] bg-blue-soft px-4 py-3">
                <p className="text-sm text-blue">Approve one at a time, or all at once:</p>
                <div className="flex flex-wrap gap-2">
                  <button
                    className="btn-secondary"
                    disabled={busy}
                    onClick={() =>
                      void run(
                        "Added to the rotation",
                        () => post("/api/admin/question-bank/review", { ids: drafts.map((question) => question.id), action: "approve", mode: "add" }),
                        () => setTab("rotation"),
                      )
                    }
                    type="button"
                  >
                    Add all to rotation
                  </button>
                  {active.length ? (
                    <button
                      className="btn-primary"
                      disabled={busy}
                      onClick={() => {
                        if (!window.confirm(`Replace the ${active.length} current questions with these ${drafts.length}? The old ones are retired, not deleted.`)) return;
                        void run(
                          "Current set replaced",
                          () => post("/api/admin/question-bank/review", { ids: drafts.map((question) => question.id), action: "approve", mode: "replace" }),
                          () => setTab("rotation"),
                        );
                      }}
                      type="button"
                    >
                      Replace current set
                    </button>
                  ) : null}
                </div>
              </div>
            ) : null}
            <QuestionList empty="Nothing waiting. Generate a fresh set to draft more." onChanged={onChanged} questions={drafts} />
          </>
        ) : tab === "rotation" ? (
          <QuestionList empty="Nothing live yet. Approve drafts to start the rotation." onChanged={onChanged} questions={active} />
        ) : (
          <QuestionList empty="Nothing retired. Replaced and rejected questions land here, so they're never repeated." onChanged={onChanged} questions={retired} />
        )}
      </div>
    </Drawer>
  );
}

export function QuestionBankAdmin() {
  const [bank, setBank] = useState<Bank | null>(null);
  const [error, setError] = useState("");
  const [open, setOpen] = useState<{ key: string; tab: Tab } | null>(null);
  const [generating, setGenerating] = useState(false);
  const [search, setSearch] = useState("");
  const [kindFilter, setKindFilter] = useState<QuestionSourceKind | "all">("all");
  const [solutionFilter, setSolutionFilter] = useState<string>("all");

  const load = useCallback(() => {
    void fetch("/api/admin/question-bank")
      .then(async (response) => {
        const body = (await response.json().catch(() => null)) as (Bank & { error?: string }) | null;
        if (!response.ok || !body) throw new Error(body?.error ?? "The question bank couldn't load.");
        setBank(body);
        setError("");
      })
      .catch((caught: Error) => setError(caught.message));
  }, []);
  useEffect(() => load(), [load]);

  const rows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return (bank?.sources ?? []).filter(
      (source) =>
        (kindFilter === "all" || source.kind === kindFilter) &&
        (solutionFilter === "all" || source.solution === solutionFilter) &&
        (!query || source.title.toLowerCase().includes(query)),
    );
  }, [bank, search, kindFilter, solutionFilter]);
  const groups = useMemo(() => {
    const map = new Map<string, BankSource[]>();
    for (const source of rows) map.set(source.solution, [...(map.get(source.solution) ?? []), source]);
    return [...map.entries()].sort((a, b) => solutionOrder(a[0]) - solutionOrder(b[0]));
  }, [rows]);

  if (error) return <p className="rounded-[10px] bg-danger-soft px-4 py-3 text-sm text-danger">{error}</p>;
  if (!bank) return <p className="text-sm text-muted">Loading the question bank</p>;

  const totals = {
    banks: bank.sources.length,
    active: bank.sources.reduce((sum, source) => sum + source.active, 0),
    drafts: bank.sources.reduce((sum, source) => sum + source.drafts, 0),
    flagged: bank.sources.reduce((sum, source) => sum + source.flagged, 0),
  };
  const openSource = open ? bank.sources.find((source) => source.key === open.key) : null;

  return (
    <div className="flex flex-col gap-6">
      <dl className="grid grid-cols-2 overflow-hidden rounded-[14px] border border-line bg-white sm:grid-cols-4">
        {[
          { label: "Banks", value: totals.banks, tone: "text-blue" },
          { label: "Questions live", value: totals.active, tone: "text-blue" },
          { label: "Waiting for review", value: totals.drafts, tone: totals.drafts ? "text-warning" : "text-blue" },
          { label: "Flagged by the stats", value: totals.flagged, tone: totals.flagged ? "text-warning" : "text-blue" },
        ].map((stat) => (
          <div className="flex flex-col gap-1.5 border-r border-divider px-4 py-3 last:border-r-0" key={stat.label}>
            <dt className="label-caps">{stat.label}</dt>
            <dd className={`num text-[24px] leading-none font-extrabold ${stat.tone}`}>{stat.value}</dd>
          </div>
        ))}
      </dl>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <input
          aria-label="Search banks"
          className={`${INPUT_CLASS} sm:max-w-[280px]`}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search banks"
          value={search}
        />
        <select
          aria-label="Source"
          className={`${INPUT_CLASS} sm:w-auto sm:max-w-[260px]`}
          onChange={(event) => setKindFilter(event.target.value as QuestionSourceKind | "all")}
          value={kindFilter}
        >
          <option value="all">All sources</option>
          <option value="playbook">Playbooks</option>
          <option value="docs">SailPoint docs</option>
          <option value="developer">Developer portal</option>
        </select>
        <select
          aria-label="Solution"
          className={`${INPUT_CLASS} sm:w-auto sm:max-w-[260px]`}
          onChange={(event) => setSolutionFilter(event.target.value)}
          value={solutionFilter}
        >
          <option value="all">All solutions</option>
          <SolutionOptions areas={SOLUTION_AREAS} />
        </select>
        <button className="btn-primary ml-auto inline-flex items-center gap-2" onClick={() => setGenerating(true)} type="button">
          <Sparkles aria-hidden size={16} /> Generate questions
        </button>
      </div>

      {rows.length ? (
        <div className="flex flex-col gap-6">
          {groups.map(([solution, sources]) => (
            <section aria-label={solution} className="flex flex-col gap-2" key={solution}>
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="text-[18px] font-extrabold text-ink">{solution}</h2>
                <span className="text-[13px] text-muted">
                  {sources.length} bank{sources.length === 1 ? "" : "s"} · {sources.reduce((sum, source) => sum + source.active, 0)} questions live
                  {sources.some((source) => source.drafts) ? (
                    <span className="font-bold text-blue"> · {sources.reduce((sum, source) => sum + source.drafts, 0)} to review</span>
                  ) : null}
                </span>
              </div>
              <div className="overflow-hidden rounded-[14px] border border-line bg-white shadow-[var(--shadow-card)]">
                <div className="grid grid-cols-[minmax(0,1fr)_140px_70px_90px_90px] gap-3 border-b border-divider px-4 py-2 text-[13px] text-muted max-md:hidden">
                  <span>Bank</span>
                  <span>Source</span>
                  <span>Live</span>
                  <span>To review</span>
                  <span>Flagged</span>
                </div>
                <ul>
                  {sources.map((source) => (
                    <li className="border-b border-divider last:border-b-0" key={source.key}>
                      <button
                        className="grid w-full grid-cols-[minmax(0,1fr)_140px_70px_90px_90px] items-center gap-3 px-4 py-3 text-left hover:bg-bg max-md:grid-cols-1 max-md:gap-1"
                        onClick={() => setOpen({ key: source.key, tab: source.drafts ? "review" : "rotation" })}
                        type="button"
                      >
                        <span className="truncate font-bold text-ink">{source.title}</span>
                        <span className="text-sm text-muted">{SOURCE_LABEL[source.kind]}</span>
                        <span className="num text-sm text-ink">{source.active}</span>
                        <span className={`num text-sm ${source.drafts ? "font-bold text-blue" : "text-muted"}`}>{source.drafts || "None"}</span>
                        <span className={`num text-sm ${source.flagged ? "font-bold text-warning" : "text-muted"}`}>{source.flagged || "None"}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          ))}
        </div>
      ) : (
        <p className="rounded-[14px] border border-dashed border-line px-4 py-8 text-center text-sm text-muted">
          {bank.sources.length ? "No banks match that search." : "No questions yet. Generate a set from a playbook or a docs topic to get started."}
        </p>
      )}

      {generating ? (
        <Drawer onClose={() => setGenerating(false)} open size="form" title="Generate questions">
          <GeneratePanel
            onDone={(key) => {
              setGenerating(false);
              setOpen({ key, tab: "review" });
              load();
            }}
            playbooks={bank.playbooks}
          />
        </Drawer>
      ) : null}

      {open && openSource ? (
        <BankWorkbench
          initialTab={open.tab}
          key={open.key}
          onChanged={load}
          onClose={() => setOpen(null)}
          questions={bank.questions.filter((question) => sourceKey(question) === open.key)}
          source={openSource}
        />
      ) : null}
    </div>
  );
}

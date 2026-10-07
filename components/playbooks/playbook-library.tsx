"use client";

import { Check, ChevronRight, ListChecks, Mic, Search, Swords } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { AssignWorkbench, MyAssignments, TeamAssignments } from "@/components/playbooks/playbook-assignments";
import { QuizPlayer, type Check as KnowledgeCheck } from "@/components/question-bank/knowledge-checks";
import { GuideOverview } from "@/components/playbooks/guide-overview";
import { PlaybookView } from "@/components/playbooks/playbook-view";
import { SegmentedToggle } from "@/components/ui/segmented-toggle";
import type { AssignablePerson } from "@/lib/playbooks/assignment-access";
import { dueLabel, type PlaybookAssignment } from "@/lib/playbooks/assignment-model";
import { Drawer } from "@/components/ui/drawer";
import type { CapabilityPlaybook, PlaybookGuide } from "@/lib/playbooks/types";

function matches(playbook: CapabilityPlaybook, query: string, leadWhen = "") {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return true;
  const body = playbook.body;
  const haystack = [
    playbook.title,
    leadWhen,
    body.subtitle,
    body.whereFits,
    ...body.pitches.map((pitch) => pitch.text),
    ...body.objections.map((item) => item.objection),
    ...body.buyingTriggers,
  ]
    .join(" ")
    .toLowerCase();
  return words.every((word) => haystack.includes(word));
}

/** Learn › Playbooks: every published capability playbook, opened in a full workbench. */
export function PlaybookLibrary({
  guides,
  playbooks,
  pitchDrills = {},
  myAssignments = [],
  readIds = [],
  canAssign = false,
  people = [],
  teamAssignments = [],
}: {
  guides: PlaybookGuide[];
  playbooks: CapabilityPlaybook[];
  pitchDrills?: Record<string, { id: string; label: string }[]>;
  myAssignments?: PlaybookAssignment[];
  readIds?: string[];
  canAssign?: boolean;
  people?: AssignablePerson[];
  teamAssignments?: PlaybookAssignment[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [guideId, setGuideId] = useState(guides[0]?.id ?? "");
  const [query, setQuery] = useState("");
  const [aboutOpen, setAboutOpen] = useState(false);
  const [view, setView] = useState<"library" | "team">("library");
  const [assigning, setAssigning] = useState<string[] | null>(null);
  const [read, setRead] = useState(() => new Set(readIds));
  const [marking, setMarking] = useState(false);

  const guide = guides.find((item) => item.id === guideId) ?? guides[0];
  const chapters = useMemo(() => playbooks.filter((playbook) => playbook.guideId === guide?.id), [guide?.id, playbooks]);
  // "Lead with this when…" from the guide's routing table, shown under each playbook and searchable.
  const leadWhenByChapter = useMemo(() => new Map(guide.body.routing.map((row) => [row.chapter, row.leadWhen])), [guide.body.routing]);
  const visible = useMemo(
    () => chapters.filter((playbook) => matches(playbook, query, leadWhenByChapter.get(playbook.chapter))),
    [chapters, leadWhenByChapter, query],
  );

  const openSlug = searchParams.get("playbook");
  // Assigned playbooks may belong to another guide, so fall back to the whole library.
  const open =
    chapters.find((playbook) => playbook.slug === openSlug) ?? playbooks.find((playbook) => playbook.slug === openSlug) ?? null;
  const openAssignment = open
    ? myAssignments.find((item) => item.playbookId === open.id && item.status === "active") ?? null
    : null;

  async function markRead(playbookId: string) {
    setMarking(true);
    const response = await fetch(`/api/playbooks/${playbookId}/read`, { method: "POST" }).catch(() => null);
    setMarking(false);
    if (response?.ok) {
      setRead((set) => new Set(set).add(playbookId));
      router.refresh();
    }
  }
  const setOpen = (slug: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (slug) params.set("playbook", slug);
    else params.delete("playbook");
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  if (!guide) {
    return (
      <div className="rounded-[14px] border border-line bg-white px-6 py-8">
        <p className="text-[15px] font-bold text-ink">No playbooks published yet.</p>
        <p className="mt-1 text-sm text-ink-2">Your admin publishes them from Content › Playbooks.</p>
      </div>
    );
  }


  const assignWorkbench = assigning ? (
    <AssignWorkbench initialPlaybookIds={assigning} onClose={() => setAssigning(null)} people={people} playbooks={playbooks} />
  ) : null;

  if (canAssign && view === "team") {
    return (
      <div className="flex flex-col gap-6">
        <ViewSwitch onChange={setView} value={view} />
        <TeamAssignments assignments={teamAssignments} onAssign={() => setAssigning([])} />
        {assignWorkbench}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      {canAssign ? <ViewSwitch onChange={setView} value={view} /> : null}
      <MyAssignments assignments={myAssignments} onOpen={(slug) => setOpen(slug)} />
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          {guides.length > 1 ? (
            <label className="flex flex-col gap-1.5 text-[13px] text-ink-2">
              Guide
              <select
                className="rounded-[10px] border border-line-strong bg-white px-3 py-2 text-[15px] font-bold text-ink"
                onChange={(event) => setGuideId(event.target.value)}
                value={guide.id}
              >
                {guides.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.title}
                    {item.segmentLabel ? ` · ${item.segmentLabel}` : ""}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <span className="text-[18px] font-extrabold text-ink">{guide.title}</span>
          )}
          <span className="text-sm text-muted">
            {[guide.segmentLabel, guide.edition ? `Edition ${guide.edition}` : null, `${chapters.length} playbooks`]
              .filter(Boolean)
              .join(" · ")}
          </span>
        </div>
        {guide.body.sections.length ? (
          <button className="btn-secondary" onClick={() => setAboutOpen(true)} type="button">
            How to use this guide
          </button>
        ) : null}
      </div>

      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-col gap-0.5">
            <h2 className="text-[18px] font-extrabold text-ink">Which playbook for this deal?</h2>
            <p className="m-0 text-sm text-muted">Each playbook says when to lead with it. Search what the prospect just told you.</p>
          </div>
          <label className="relative block w-full max-w-[360px]">
            <span className="sr-only">Search playbooks</span>
            <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              className="w-full rounded-[10px] border border-line-strong bg-white py-2 pr-3 pl-9 text-[14px] text-ink focus:border-blue focus:outline-none"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Try audit, contractors, AI agents"
              type="search"
              value={query}
            />
          </label>
        </div>
        {visible.length ? (
          <ul className="divide-y divide-line overflow-hidden rounded-[14px] border border-line-strong bg-white shadow-[var(--shadow-card)]">
            {visible.map((playbook) => (
              <li key={playbook.id}>
                <button
                  className="group flex w-full items-center gap-4 px-5 py-4 text-left hover:bg-blue-soft/40 focus-visible:bg-blue-soft/40 focus-visible:outline-none"
                  onClick={() => setOpen(playbook.slug)}
                  type="button"
                >
                  <span className="num grid h-8 w-8 shrink-0 place-items-center rounded-full bg-bg text-[13px] font-extrabold text-ink-2">
                    {playbook.chapter}
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="text-[16px] font-bold text-ink group-hover:text-blue">{playbook.title}</span>
                    {leadWhenByChapter.get(playbook.chapter) ? (
                      <span className="text-[14px] leading-snug text-ink-2">
                        <span className="font-semibold text-ink">Lead with it when:</span> {leadWhenByChapter.get(playbook.chapter)}
                      </span>
                    ) : (
                      <span className="text-[14px] leading-snug text-ink-2">{playbook.body.subtitle}</span>
                    )}
                  </span>
                  {read.has(playbook.id) ? (
                    <span className="hidden shrink-0 items-center gap-1 text-[13px] font-bold text-success sm:inline-flex">
                      <Check aria-hidden className="h-3.5 w-3.5" /> Read
                    </span>
                  ) : null}
                  <span className="num hidden shrink-0 text-[13px] text-muted sm:inline">
                    {playbook.body.objections.length} objections
                  </span>
                  <ChevronRight aria-hidden className="h-4 w-4 shrink-0 text-muted group-hover:text-blue" />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted">No playbooks match “{query}”.</p>
        )}
      </section>

      {open ? (
        <Drawer
          eyebrow={`Playbook ${open.chapter} · ${guide.title}`}
          footer={
            <>
              {read.has(open.id) ? (
                <span className="inline-flex items-center gap-1.5 px-2 text-[14px] font-bold text-success">
                  <Check aria-hidden className="h-4 w-4" /> Read
                </span>
              ) : (
                <button className="btn-primary" disabled={marking} onClick={() => void markRead(open.id)} type="button">
                  {marking ? "Saving…" : "Mark as read"}
                </button>
              )}
              {canAssign ? (
                <button className="btn-secondary" onClick={() => setAssigning([open.id])} type="button">
                  Assign
                </button>
              ) : null}
            </>
          }
          footerNote={
            openAssignment
              ? `Assigned to you · ${dueLabel(openAssignment.progress, openAssignment.dueDate)}`
              : "Mark it read when you've worked through it."
          }
          key={open.id}
          onClose={() => setOpen(null)}
          open
          subtitle={open.body.subtitle}
          title={open.title}
        >
          <div className="flex flex-col gap-8">
            <PracticeStrip pitchDrills={pitchDrills[open.id] ?? []} playbook={open} />
            <PlaybookView body={open.body} />
          </div>
        </Drawer>
      ) : null}

      {assignWorkbench}

      {aboutOpen ? <GuideOverview guide={guide} onClose={() => setAboutOpen(false)} /> : null}
    </div>
  );
}

/** Start practising straight from the playbook: pitch drills in Pitch Studio, objections as a simulation. */
function PracticeStrip({
  playbook,
  pitchDrills,
}: {
  playbook: CapabilityPlaybook;
  pitchDrills: { id: string; label: string }[];
}) {
  const router = useRouter();
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [check, setCheck] = useState<KnowledgeCheck | null>(null);
  const [quizOpen, setQuizOpen] = useState(false);
  const hasObjections = playbook.body.objections.length > 0;

  // The chapter's knowledge check, if the question bank has approved questions for it.
  useEffect(() => {
    let cancelled = false;
    void fetch("/api/question-bank/quiz")
      .then((response) => (response.ok ? response.json() : { checks: [] }))
      .then((body: { checks?: KnowledgeCheck[] }) => {
        if (!cancelled) setCheck(body.checks?.find((item) => item.key === `playbook:${playbook.id}`) ?? null);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [playbook.id]);

  if (!pitchDrills.length && !hasObjections && !check) return null;

  async function startObjectionDrill() {
    setStarting(true);
    setError(null);
    const response = await fetch(`/api/playbooks/${playbook.id}/objection-drill`, { method: "POST" }).catch(() => null);
    const body = (await response?.json().catch(() => null)) as { redirectUrl?: string; error?: string } | null;
    if (!response?.ok || !body?.redirectUrl) {
      setStarting(false);
      setError(body?.error ?? "The drill couldn't start. Try again.");
      return;
    }
    router.push(body.redirectUrl);
  }

  return (
    <section className="flex flex-col gap-3 rounded-[14px] border border-line-strong bg-white p-4 sm:p-5">
      <div className="flex flex-col gap-0.5">
        <h3 className="m-0 text-[16px] font-extrabold text-ink">Practise this</h3>
        <p className="m-0 text-[13px] text-muted">
          Private practice: say it on video, by voice or typed, and the AI scores it against this playbook. Check what stuck with a quick
          five-question quiz. Your manager isn&apos;t notified.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {pitchDrills.map((drill, index) => (
          <Link
            className="btn-secondary no-underline"
            href={`/practice/pitch?scenario=${drill.id}`}
            key={drill.id}
          >
            <Mic aria-hidden className="h-4 w-4" />
            {pitchDrills.length === 1 ? "Practise the pitch" : drill.label.split(": ").pop() || `Pitch ${index + 1}`}
          </Link>
        ))}
        {check ? (
          <button aria-expanded={quizOpen} className="btn-secondary" onClick={() => setQuizOpen((value) => !value)} type="button">
            <ListChecks aria-hidden className="h-4 w-4" />
            {quizOpen
              ? "Hide the knowledge check"
              : check.lastScore === null
                ? `Take the knowledge check (${check.questions} questions)`
                : `Retake the knowledge check (last ${check.lastScore}%)`}
          </button>
        ) : null}
        {hasObjections ? (
          <button className="btn-primary" disabled={starting} onClick={() => void startObjectionDrill()} type="button">
            <Swords aria-hidden className="h-4 w-4" />
            {starting ? "Starting…" : `Practise these objections (${Math.min(playbook.body.objections.length, 6)})`}
          </button>
        ) : null}
      </div>
      {check && quizOpen ? (
        <div className="border-t border-divider pt-4">
          <QuizPlayer check={check} onDone={() => undefined} />
        </div>
      ) : null}
      {error ? (
        <p className="m-0 rounded-[10px] bg-danger-soft px-3 py-2 text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}

function ViewSwitch({ value, onChange }: { value: "library" | "team"; onChange: (value: "library" | "team") => void }) {
  return (
    <SegmentedToggle
      className="self-start"
      label="Playbooks view"
      onChange={(id) => onChange(id as "library" | "team")}
      options={[
        { id: "library", label: "Library" },
        { id: "team", label: "Team assignments" },
      ]}
      value={value}
    />
  );
}

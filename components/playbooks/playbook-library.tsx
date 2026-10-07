"use client";

import { ChevronRight, Mic, Search, Swords } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { PlaybookView } from "@/components/playbooks/playbook-view";
import { Drawer } from "@/components/ui/drawer";
import type { CapabilityPlaybook, PlaybookGuide } from "@/lib/playbooks/types";
import { cn } from "@/lib/utils";

function matches(playbook: CapabilityPlaybook, query: string) {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return true;
  const body = playbook.body;
  const haystack = [
    playbook.title,
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
}: {
  guides: PlaybookGuide[];
  playbooks: CapabilityPlaybook[];
  pitchDrills?: Record<string, { id: string; label: string }[]>;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [guideId, setGuideId] = useState(guides[0]?.id ?? "");
  const [query, setQuery] = useState("");
  const [aboutOpen, setAboutOpen] = useState(false);

  const guide = guides.find((item) => item.id === guideId) ?? guides[0];
  const chapters = useMemo(() => playbooks.filter((playbook) => playbook.guideId === guide?.id), [guide?.id, playbooks]);
  const visible = useMemo(() => chapters.filter((playbook) => matches(playbook, query)), [chapters, query]);

  const openSlug = searchParams.get("playbook");
  const open = chapters.find((playbook) => playbook.slug === openSlug) ?? null;
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

  const routable = guide.body.routing.filter((row) => chapters.some((playbook) => playbook.chapter === row.chapter));
  const slugFor = (chapter: number) => chapters.find((playbook) => playbook.chapter === chapter)?.slug;

  return (
    <div className="flex flex-col gap-8">
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

      {routable.length ? (
        <section className="flex flex-col gap-3">
          <h2 className="text-[18px] font-extrabold text-ink">Which playbook for this deal?</h2>
          <div className="overflow-hidden rounded-[14px] border border-line-strong bg-white shadow-[var(--shadow-card)]">
            <table className="w-full border-collapse text-left text-[14px]">
              <thead className="bg-bg text-[12px] font-bold tracking-wide text-muted uppercase">
                <tr>
                  <th className="px-4 py-2.5">Lead with this when…</th>
                  <th className="px-4 py-2.5">Playbook</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {routable.map((row) => (
                  <tr className="hover:bg-blue-soft/40" key={row.chapter}>
                    <td className="px-4 py-2.5 text-ink-2">{row.leadWhen}</td>
                    <td className="px-4 py-2.5">
                      <button className="link text-left font-bold" onClick={() => setOpen(slugFor(row.chapter) ?? null)} type="button">
                        {row.capability}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-[18px] font-extrabold text-ink">All playbooks</h2>
          <label className="relative block w-full max-w-[360px]">
            <span className="sr-only">Search playbooks</span>
            <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              className="w-full rounded-[10px] border border-line-strong bg-white py-2 pr-3 pl-9 text-[14px] text-ink focus:border-blue focus:outline-none"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search pitches and objections"
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
                    <span className="text-[14px] leading-snug text-ink-2">{playbook.body.subtitle}</span>
                  </span>
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

      {aboutOpen ? (
        <Drawer eyebrow={guide.title} onClose={() => setAboutOpen(false)} open title="How to use this guide">
          <div className="flex flex-col gap-7 text-[15px] leading-relaxed text-ink-2">
            {guide.body.audience ? <p className="m-0 font-bold text-ink">{guide.body.audience}</p> : null}
            {guide.body.sections.map((section) => (
              <section className="flex flex-col gap-2" key={section.title}>
                <h3 className={cn("text-[18px] font-extrabold text-ink")}>{section.title}</h3>
                {section.paragraphs.map((paragraph, index) => (
                  <p className="m-0" key={index}>
                    {paragraph}
                  </p>
                ))}
              </section>
            ))}
          </div>
        </Drawer>
      ) : null}
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
  const hasObjections = playbook.body.objections.length > 0;
  if (!pitchDrills.length && !hasObjections) return null;

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
          Private practice: say it on video, by voice or typed, and the AI scores it against this playbook. Your manager isn&apos;t notified.
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
        {hasObjections ? (
          <button className="btn-primary" disabled={starting} onClick={() => void startObjectionDrill()} type="button">
            <Swords aria-hidden className="h-4 w-4" />
            {starting ? "Starting…" : `Practise these objections (${Math.min(playbook.body.objections.length, 6)})`}
          </button>
        ) : null}
      </div>
      {error ? (
        <p className="m-0 rounded-[10px] bg-danger-soft px-3 py-2 text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}

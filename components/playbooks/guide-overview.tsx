"use client";

import type { ReactNode } from "react";
import { Drawer } from "@/components/ui/drawer";
import type { PlaybookGuide } from "@/lib/playbooks/types";
import { cn } from "@/lib/utils";

/**
 * The guide's front matter ("How to use this guide", foreword, introduction, part openers,
 * conclusion) laid out for reading. The imported text is flat paragraphs, so each line is read for
 * its shape: short unpunctuated lines are headings, "Label — detail" lines are definitions,
 * quoted lines are questions to ask, and the guide's colour-coded boxes get their colours.
 */

type Block =
  | { kind: "heading"; text: string; step?: string }
  | { kind: "kicker"; text: string }
  | { kind: "terms"; items: { label: string; detail: string }[] }
  | { kind: "quote"; text: string }
  | { kind: "para"; text: string };

const BOX_COLOURS: Record<string, string> = {
  blue: "bg-blue",
  red: "bg-danger",
  amber: "bg-warning",
  green: "bg-success",
};

function classify(line: string): Block | { kind: "term"; label: string; detail: string } {
  const text = line.trim();
  if (/^["“]/.test(text)) return { kind: "quote", text: text.replace(/^["“]|["”]$/g, "") };
  if (/ · /.test(text) && text.length < 90) return { kind: "kicker", text };
  const step = /^(\d+)\.\s+(.{2,40})$/.exec(text);
  if (step) return { kind: "heading", step: step[1], text: step[2]! };
  const dash = /^(.{2,48}?)\s+—\s+(.+)$/.exec(text);
  if (dash) return { kind: "term", label: dash[1]!, detail: dash[2]! };
  const paren = /^([^.]{3,50}\))\.\s+(.+)$/.exec(text);
  if (paren) return { kind: "term", label: paren[1]!, detail: paren[2]! };
  if (text.length < 70 && !/[.?!:,;"”]$/.test(text)) return { kind: "heading", text };
  return { kind: "para", text };
}

/** Lines into blocks; neighbouring definitions are grouped, and a colour box's next line becomes its detail. */
export function guideBlocks(paragraphs: string[]): Block[] {
  const blocks: Block[] = [];
  for (const line of paragraphs) {
    const block = classify(line);
    const last = blocks.at(-1);
    if (block.kind === "term") {
      if (last?.kind === "terms") last.items.push({ label: block.label, detail: block.detail });
      else blocks.push({ kind: "terms", items: [{ label: block.label, detail: block.detail }] });
      continue;
    }
    // "Blue — Objectives…" is followed by a line describing that box; fold it in.
    const colourTerm = last?.kind === "terms" ? last.items.at(-1) : null;
    if (block.kind === "para" && colourTerm && BOX_COLOURS[colourTerm.label.toLowerCase()] && !colourTerm.detail.includes("\n")) {
      colourTerm.detail = `${colourTerm.detail}\n${block.text}`;
      continue;
    }
    blocks.push(block);
  }
  return blocks;
}

function Terms({ items }: { items: { label: string; detail: string }[] }) {
  const coloured = items.every((item) => BOX_COLOURS[item.label.toLowerCase()]);
  return (
    <dl className={cn("grid gap-2", coloured || items.length <= 3 ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2")}>
      {items.map((item, index) => {
        const [first, ...rest] = item.detail.split("\n");
        const swatch = BOX_COLOURS[item.label.toLowerCase()];
        return (
          <div className="flex gap-3 rounded-[12px] border border-line bg-white px-4 py-3 shadow-[var(--shadow-card)]" key={`${item.label}-${index}`}>
            {swatch ? (
              <span aria-hidden className={cn("mt-1 h-3 w-3 shrink-0 rounded-full", swatch)} />
            ) : (
              <span className="num mt-px w-5 shrink-0 text-[13px] font-extrabold text-blue">{index + 1}</span>
            )}
            <div className="min-w-0">
              <dt className="text-[15px] font-bold text-ink">
                {item.label}
                {swatch ? <span className="font-normal text-ink-2">: {first}</span> : null}
              </dt>
              <dd className="m-0 text-sm leading-relaxed text-ink-2">{swatch ? rest.join(" ") : item.detail}</dd>
            </div>
          </div>
        );
      })}
    </dl>
  );
}

function Blocks({ blocks }: { blocks: Block[] }) {
  return (
    <>
      {blocks.map((block, index) => {
        if (block.kind === "heading") {
          return (
            <h4 className="mt-3 flex items-center gap-2.5 text-[17px] font-extrabold text-ink first:mt-0" key={index}>
              {block.step ? (
                <span className="num grid h-7 w-7 place-items-center rounded-full bg-blue text-[13px] text-white">{block.step}</span>
              ) : null}
              {block.text}
            </h4>
          );
        }
        if (block.kind === "kicker") return <p className="label-caps m-0 text-blue" key={index}>{block.text}</p>;
        if (block.kind === "terms") return <Terms items={block.items} key={index} />;
        if (block.kind === "quote") {
          return (
            <blockquote className="m-0 border-l-4 border-blue bg-blue-soft px-4 py-3 text-[16px] font-bold text-ink" key={index}>
              “{block.text}”
            </blockquote>
          );
        }
        return (
          <p className="m-0 text-[15px] leading-relaxed text-ink-2" key={index}>
            {block.text}
          </p>
        );
      })}
    </>
  );
}

function slug(title: string) {
  return `guide-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
}

function SectionCard({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={`${id}-title`} className="scroll-mt-4 rounded-[16px] border border-line bg-bg p-5 shadow-[var(--shadow-card)] sm:p-6" id={id}>
      <h3 className="m-0 mb-4 text-[22px] font-extrabold tracking-[-0.01em] text-ink" id={`${id}-title`}>
        {title}
      </h3>
      <div className="flex flex-col gap-3">{children}</div>
    </section>
  );
}

export function GuideOverview({ guide, onClose }: { guide: PlaybookGuide; onClose: () => void }) {
  const { audience, routing, sections } = guide.body;
  const [first, ...rest] = sections;
  const toc = [
    ...(first ? [first.title] : []),
    ...(routing.length ? ["Which chapter to lead with"] : []),
    ...rest.map((section) => section.title),
  ];

  return (
    <Drawer
      bodyWidth="full"
      eyebrow={guide.title}
      mainLabel="Guide"
      onClose={onClose}
      open
      side={
        <nav aria-label="On this page" className="flex flex-col gap-1">
          <h3 className="label-caps mb-1">On this page</h3>
          {toc.map((title) => (
            <a className="rounded-[8px] px-3 py-1.5 text-sm text-ink-2 no-underline hover:bg-white hover:text-blue" href={`#${slug(title)}`} key={title}>
              {title}
            </a>
          ))}
        </nav>
      }
      sideLabel="Contents"
      subtitle={guide.edition ? `Edition ${guide.edition}` : undefined}
      title="How to use this guide"
    >
      <div className="flex flex-col gap-6">
        {audience ? (
          <div className="rounded-[16px] bg-ink px-6 py-5 text-white shadow-[var(--shadow-card)]">
            <p className="label-caps m-0 text-signal">Written for</p>
            <p className="m-0 mt-1 text-[20px] font-extrabold">{audience}</p>
          </div>
        ) : null}

        {first ? (
          <SectionCard id={slug(first.title)} title={first.title}>
            <Blocks blocks={guideBlocks(first.paragraphs)} />
          </SectionCard>
        ) : null}

        {routing.length ? (
          <SectionCard id={slug("Which chapter to lead with")} title="Which chapter to lead with">
            <p className="m-0 text-[15px] text-ink-2">Match what the prospect just told you to the chapter that answers it.</p>
            <div className="overflow-hidden rounded-[12px] border border-line bg-white">
              {routing.map((row) => (
                <div className="grid grid-cols-[44px_minmax(0,1fr)] gap-3 border-b border-divider px-4 py-2.5 last:border-b-0 sm:grid-cols-[44px_220px_minmax(0,1fr)]" key={row.chapter}>
                  <span className="num text-[15px] font-extrabold text-blue">{row.chapter}</span>
                  <span className="text-sm font-bold text-ink">{row.capability}</span>
                  <span className="col-start-2 text-sm text-ink-2 sm:col-start-auto">{row.leadWhen}</span>
                </div>
              ))}
            </div>
          </SectionCard>
        ) : null}

        {rest.map((section) => (
          <SectionCard id={slug(section.title)} key={section.title} title={section.title}>
            <Blocks blocks={guideBlocks(section.paragraphs)} />
          </SectionCard>
        ))}
      </div>
    </Drawer>
  );
}

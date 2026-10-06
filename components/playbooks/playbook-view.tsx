"use client";

import type { ReactNode } from "react";
import { STORY_SEGMENT_LABELS, type PlaybookBody } from "@/lib/playbooks/types";
import { cn } from "@/lib/utils";

function Section({ title, children, className }: { title: string; children: ReactNode; className?: string }) {
  return (
    <section className={cn("flex flex-col gap-3", className)}>
      <h3 className="text-[18px] font-extrabold text-ink">{title}</h3>
      {children}
    </section>
  );
}

function Paragraphs({ items }: { items: string[] }) {
  return (
    <>
      {items.map((item, index) => (
        <p className="m-0" key={index}>
          {item}
        </p>
      ))}
    </>
  );
}

function Bullets({ items, numbered = false }: { items: string[]; numbered?: boolean }) {
  const List = numbered ? "ol" : "ul";
  return (
    <List className={cn("m-0 flex flex-col gap-2 pl-5", numbered ? "list-decimal" : "list-disc")}>
      {items.map((item, index) => (
        <li className="pl-1" key={index}>
          {item}
        </li>
      ))}
    </List>
  );
}

function Quote({ children }: { children: ReactNode }) {
  return <blockquote className="m-0 border-l-4 border-blue pl-4 text-[16px] leading-relaxed text-ink">{children}</blockquote>;
}

/** The 60-second card the guide calls Fast Track: pitch, three questions, top objection. */
export function FastTrackCard({ body }: { body: PlaybookBody }) {
  const card = body.fastTrack;
  const pitch = card?.pitch || body.pitches[0]?.text;
  const questions = card?.questions.length ? card.questions : body.discoveryQuestions.slice(0, 3);
  const objection = card?.objection ? { objection: card.objection, response: card.response } : body.objections[0];
  if (!pitch && !questions.length && !objection) return null;

  return (
    <section className="on-navy flex flex-col gap-4 rounded-[16px] bg-navy px-5 py-5 text-white sm:px-6">
      <span className="text-[12px] font-bold tracking-[0.12em] text-signal uppercase">Fast Track · the 60 seconds before you dial</span>
      {pitch ? (
        <div className="flex flex-col gap-1.5">
          <span className="text-[13px] font-bold text-on-navy-muted">The pitch</span>
          <p className="m-0 text-[16px] leading-relaxed text-white">“{pitch}”</p>
        </div>
      ) : null}
      {questions.length ? (
        <div className="flex flex-col gap-1.5">
          <span className="text-[13px] font-bold text-on-navy-muted">Ask these</span>
          <ul className="m-0 flex list-disc flex-col gap-1.5 pl-5 text-[15px] text-white">
            {questions.map((question, index) => (
              <li key={index}>{question}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {objection ? (
        <div className="flex flex-col gap-1.5">
          <span className="text-[13px] font-bold text-on-navy-muted">Top objection</span>
          <p className="m-0 text-[15px] font-bold text-white">“{objection.objection}”</p>
          <p className="m-0 text-[15px] leading-relaxed text-white/90">{objection.response}</p>
        </div>
      ) : null}
    </section>
  );
}

/** A full capability playbook, in the guide's own order, with the Fast Track card first. */
export function PlaybookView({ body }: { body: PlaybookBody }) {
  return (
    <article className="flex flex-col gap-8 text-[15px] leading-relaxed text-ink-2">
      <FastTrackCard body={body} />

      {body.hook.length ? (
        <Section title="Open cold with this">
          <div className="flex flex-col gap-3 rounded-[14px] bg-[#FFF6E0] px-5 py-4 text-ink">
            <Paragraphs items={body.hook} />
          </div>
        </Section>
      ) : null}

      {body.preview.length || body.whereFits || body.objectives.length ? (
        <Section title="What this chapter covers">
          <Paragraphs items={body.preview} />
          {body.whereFits ? (
            <p className="m-0 rounded-[12px] bg-blue-soft px-4 py-3 text-ink">
              <b>Where this fits:</b> {body.whereFits}
            </p>
          ) : null}
          {body.objectives.length ? (
            <>
              <span className="label-caps">You&apos;ll be able to</span>
              <Bullets items={body.objectives} />
            </>
          ) : null}
        </Section>
      ) : null}

      {body.problem.paragraphs.length || body.costs.length ? (
        <Section title={body.problem.title ? `The problem: ${body.problem.title}` : "The problem"}>
          <Paragraphs items={body.problem.paragraphs} />
          {body.costs.length ? (
            <div className="grid gap-3 md:grid-cols-2">
              {body.costs.map((cost, index) => (
                <div className="flex flex-col gap-1 rounded-[12px] border border-line bg-white p-4" key={index}>
                  <span className="label-caps">What it costs · {STORY_SEGMENT_LABELS[cost.segment]}</span>
                  <p className="m-0 text-ink">{cost.text}</p>
                </div>
              ))}
            </div>
          ) : null}
        </Section>
      ) : null}

      {body.solution.parts.length || body.solution.intro.length ? (
        <Section title={body.solution.title ? `The solution: ${body.solution.title}` : "The solution"}>
          <Paragraphs items={body.solution.intro} />
          <div className="flex flex-col gap-3">
            {body.solution.parts.map((part, index) => (
              <div className="flex flex-col gap-1.5 rounded-[12px] border border-line bg-white p-4" key={index}>
                <span className="text-[16px] font-bold text-ink">{part.title}</span>
                <Paragraphs items={part.paragraphs} />
              </div>
            ))}
          </div>
        </Section>
      ) : null}

      {body.motion.teach || body.motion.tailor || body.motion.takeControl ? (
        <Section title="Selling motion">
          <dl className="m-0 flex flex-col gap-3">
            {(
              [
                ["Teach", body.motion.teach],
                ["Tailor", body.motion.tailor],
                ["Take control", body.motion.takeControl],
              ] as const
            )
              .filter(([, value]) => value)
              .map(([label, value]) => (
                <div className="flex flex-col gap-1" key={label}>
                  <dt className="label-caps label-caps--blue">{label}</dt>
                  <dd className="m-0 text-ink">“{value}”</dd>
                </div>
              ))}
          </dl>
        </Section>
      ) : null}

      {body.pitches.length ? (
        <Section title={body.pitches.length > 1 ? "Elevator pitches" : "Elevator pitch"}>
          {body.pitches.map((pitch, index) => (
            <div className="flex flex-col gap-2" key={index}>
              {body.pitches.length > 1 ? <span className="text-[15px] font-bold text-ink">{pitch.title}</span> : null}
              <Quote>“{pitch.text}”</Quote>
            </div>
          ))}
        </Section>
      ) : null}

      {body.discoveryQuestions.length ? (
        <Section title="Discovery questions">
          <p className="m-0 text-sm text-muted">Ask these before you pitch, so the prospect describes the problem in their own words.</p>
          <Bullets items={body.discoveryQuestions} />
        </Section>
      ) : null}

      {body.buyingTriggers.length ? (
        <Section title="Buying triggers">
          <Bullets items={body.buyingTriggers} />
        </Section>
      ) : null}

      {body.stories.length ? (
        <Section title="Stories">
          <div className="grid gap-3 md:grid-cols-2">
            {body.stories.map((story, index) => (
              <div className="flex flex-col gap-1 rounded-[12px] border border-line bg-white p-4" key={index}>
                <span className="label-caps">{STORY_SEGMENT_LABELS[story.segment]}</span>
                <p className="m-0 text-ink">{story.text}</p>
              </div>
            ))}
          </div>
        </Section>
      ) : null}

      {body.objections.length ? (
        <Section title="Objection handling">
          <div className="flex flex-col gap-3">
            {body.objections.map((item, index) => (
              <div className="flex flex-col gap-2 rounded-[12px] border border-line bg-white p-4" key={index}>
                <p className="m-0 font-bold text-danger">“{item.objection}”</p>
                <p className="m-0 whitespace-pre-line text-ink">{item.response}</p>
              </div>
            ))}
          </div>
        </Section>
      ) : null}

      {body.mistakes.length ? (
        <Section title="Common mistakes">
          <ul className="m-0 flex flex-col gap-3 p-0">
            {body.mistakes.map((mistake, index) => (
              <li className="list-none rounded-[12px] bg-[#FFF6E0] px-4 py-3" key={index}>
                <span className="font-bold text-ink">{mistake.title}</span> <span className="text-ink-2">{mistake.body}</span>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {body.takeaways.length ? (
        <Section title="Key takeaways">
          <div className="rounded-[14px] bg-[#E7F5EC] px-5 py-4 text-ink">
            <Bullets items={body.takeaways} />
          </div>
        </Section>
      ) : null}

      {body.retrievalCheck.length ? (
        <Section title="Test yourself">
          <p className="m-0 text-sm text-muted">Answer these without looking back.</p>
          <Bullets items={body.retrievalCheck} numbered />
        </Section>
      ) : null}
    </article>
  );
}

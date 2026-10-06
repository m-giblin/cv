import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Navy "definition" card: word, part of speech in serif italic, body, optional inner element and link. One per screen. */
export function DefinitionCard({
  word,
  partOfSpeech,
  children,
  inner,
  link,
  className,
}: {
  word: string;
  partOfSpeech: string;
  children: ReactNode;
  inner?: ReactNode;
  link?: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("on-navy flex flex-col gap-4 rounded-[16px] bg-navy p-[26px] text-on-navy shadow-[var(--shadow-navy)]", className)}>
      <div className="flex flex-wrap items-baseline gap-x-3">
        <h2 className="text-[38px] leading-none font-extrabold tracking-[-0.02em] text-white">{word}</h2>
        <span className="serif-accent text-xl text-on-navy-muted">{partOfSpeech}</span>
      </div>
      <div className="text-[15px] leading-relaxed text-on-navy">{children}</div>
      {inner}
      {link ? <div className="text-sm">{link}</div> : null}
    </section>
  );
}

/** Dashed aside for context the user doesn't have to act on. */
export function Note({ title, children, className }: { title: string; children: ReactNode; className?: string }) {
  return (
    <aside className={cn("flex flex-col gap-2 rounded-[12px] border border-dashed border-line-strong px-[18px] py-4", className)}>
      <h2 className="label-caps label-caps--blue">{title}</h2>
      <div className="text-sm leading-normal text-ink-2">{children}</div>
    </aside>
  );
}

/** Navy banner with a large amber numeral, a sentence, an explanation and the primary action. */
export function GapBanner({
  value,
  of,
  title,
  children,
  action,
  className,
}: {
  value: ReactNode;
  of?: ReactNode;
  title: ReactNode;
  children?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("on-navy flex flex-wrap items-center gap-6 rounded-[16px] bg-navy px-[26px] py-[22px]", className)}>
      <span className="flex items-baseline gap-1.5">
        <span className="num text-[56px] leading-[0.85] font-extrabold tracking-[-0.04em] text-signal">{value}</span>
        {of ? <span className="text-xl font-bold text-on-navy-muted">of {of}</span> : null}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="text-lg font-extrabold text-white">{title}</p>
        {children ? <p className="text-[15px] text-on-navy">{children}</p> : null}
      </div>
      {action}
    </section>
  );
}

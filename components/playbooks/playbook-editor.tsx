"use client";

import { Plus, Trash2 } from "lucide-react";
import { useId, useRef, useState, type ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { STORY_SEGMENTS, STORY_SEGMENT_LABELS, type PlaybookBody, type StorySegment } from "@/lib/playbooks/types";

/** Form for every part of a playbook. Lists are edited one item per line; pairs get their own rows. */

function Group({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <fieldset className="m-0 flex flex-col gap-3 rounded-[14px] border border-line bg-white p-4 sm:p-5">
      <legend className="px-1 text-[16px] font-extrabold text-ink">{title}</legend>
      {hint ? <p className="m-0 -mt-1 text-[13px] text-muted">{hint}</p> : null}
      {children}
    </fieldset>
  );
}

function Field({ label, children, htmlFor }: { label: string; children: ReactNode; htmlFor: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[13px] font-bold text-ink-2" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
    </div>
  );
}

function TextField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  const id = useId();
  return (
    <Field htmlFor={id} label={label}>
      <Input id={id} onChange={(event) => onChange(event.target.value)} value={value} />
    </Field>
  );
}

function AreaField({
  label,
  value,
  onChange,
  rows = 3,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
}) {
  const id = useId();
  return (
    <Field htmlFor={id} label={label}>
      <Textarea className="min-h-0" id={id} onChange={(event) => onChange(event.target.value)} rows={rows} value={value} />
    </Field>
  );
}

/** One item per line. Keeps the raw text while typing so blank lines don't vanish mid-edit. */
function LinesField({
  label,
  values,
  onChange,
  rows = 4,
}: {
  label: string;
  values: string[];
  onChange: (values: string[]) => void;
  rows?: number;
}) {
  const id = useId();
  const [raw, setRaw] = useState(values.join("\n"));
  return (
    <Field htmlFor={id} label={`${label} (one per line)`}>
      <Textarea
        className="min-h-0"
        id={id}
        onChange={(event) => {
          setRaw(event.target.value);
          onChange(
            event.target.value
              .split("\n")
              .map((line) => line.trim())
              .filter(Boolean),
          );
        }}
        rows={Math.max(rows, Math.min(12, values.length + 1))}
        value={raw}
      />
    </Field>
  );
}

function Rows<T>({
  items,
  onChange,
  blank,
  addLabel,
  render,
}: {
  items: T[];
  onChange: (items: T[]) => void;
  blank: T;
  addLabel: string;
  render: (item: T, update: (item: T) => void) => ReactNode;
}) {
  // Stable keys, so removing a row doesn't hand its neighbour's text boxes to the wrong item.
  const nextKey = useRef(items.length);
  const [keys, setKeys] = useState(() => items.map((_, index) => index));
  return (
    <div className="flex flex-col gap-3">
      {items.map((item, index) => (
        <div className="flex gap-2 rounded-[12px] bg-bg p-3" key={keys[index] ?? `extra-${index}`}>
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            {render(item, (next) => onChange(items.map((current, position) => (position === index ? next : current))))}
          </div>
          <button
            aria-label="Remove"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-muted hover:bg-white hover:text-danger"
            onClick={() => {
              setKeys(keys.filter((_, position) => position !== index));
              onChange(items.filter((_, position) => position !== index));
            }}
            type="button"
          >
            <Trash2 aria-hidden className="h-4 w-4" />
          </button>
        </div>
      ))}
      <button
        className="btn-secondary self-start"
        onClick={() => {
          setKeys([...keys, nextKey.current++]);
          onChange([...items, blank]);
        }}
        type="button"
      >
        <Plus aria-hidden className="h-4 w-4" /> {addLabel}
      </button>
    </div>
  );
}

function SegmentSelect({ value, onChange }: { value: StorySegment; onChange: (value: StorySegment) => void }) {
  return (
    <select
      aria-label="Segment"
      className="self-start rounded-[10px] border border-line-strong bg-white px-3 py-2 text-[14px] text-ink"
      onChange={(event) => onChange(event.target.value as StorySegment)}
      value={value}
    >
      {STORY_SEGMENTS.map((segment) => (
        <option key={segment} value={segment}>
          {STORY_SEGMENT_LABELS[segment]}
        </option>
      ))}
    </select>
  );
}

function PlainArea({ value, onChange, rows = 3, label }: { value: string; onChange: (value: string) => void; rows?: number; label: string }) {
  return (
    <Textarea aria-label={label} className="min-h-0" onChange={(event) => onChange(event.target.value)} rows={rows} value={value} />
  );
}

function PlainLines({ values, onChange, label }: { values: string[]; onChange: (values: string[]) => void; label: string }) {
  const [raw, setRaw] = useState(values.join("\n"));
  return (
    <Textarea
      aria-label={label}
      className="min-h-0"
      onChange={(event) => {
        setRaw(event.target.value);
        onChange(
          event.target.value
            .split("\n")
            .map((line) => line.trim())
            .filter(Boolean),
        );
      }}
      rows={Math.max(3, Math.min(10, values.length + 1))}
      value={raw}
    />
  );
}

function PlainInput({ value, onChange, label }: { value: string; onChange: (value: string) => void; label: string }) {
  return <Input aria-label={label} onChange={(event) => onChange(event.target.value)} value={value} />;
}

export function PlaybookEditor({
  title,
  onTitleChange,
  body,
  onChange,
}: {
  title: string;
  onTitleChange: (title: string) => void;
  body: PlaybookBody;
  onChange: (body: PlaybookBody) => void;
}) {
  const set = <K extends keyof PlaybookBody>(key: K, value: PlaybookBody[K]) => onChange({ ...body, [key]: value });
  const fastTrack = body.fastTrack ?? { pitch: "", questions: [], objection: "", response: "" };

  return (
    <div className="flex flex-col gap-5">
      <Group title="Basics">
        <TextField label="Title" onChange={onTitleChange} value={title} />
        <TextField label="Subtitle" onChange={(value) => set("subtitle", value)} value={body.subtitle} />
        <AreaField label="Where this fits" onChange={(value) => set("whereFits", value)} value={body.whereFits} />
        <LinesField label="Chapter preview paragraphs" onChange={(value) => set("preview", value)} values={body.preview} />
        <LinesField label="Learning objectives" onChange={(value) => set("objectives", value)} values={body.objectives} />
      </Group>

      <Group hint="Shown first in Learn. Leave blank to use the first pitch, questions and objection." title="Fast Track card">
        <AreaField label="Pitch" onChange={(value) => set("fastTrack", { ...fastTrack, pitch: value })} rows={4} value={fastTrack.pitch} />
        <LinesField label="Ask these" onChange={(value) => set("fastTrack", { ...fastTrack, questions: value })} values={fastTrack.questions} />
        <AreaField label="Top objection" onChange={(value) => set("fastTrack", { ...fastTrack, objection: value })} rows={2} value={fastTrack.objection} />
        <AreaField label="Response" onChange={(value) => set("fastTrack", { ...fastTrack, response: value })} rows={4} value={fastTrack.response} />
      </Group>

      <Group title="Cold-open hook">
        <LinesField label="Hook paragraphs" onChange={(value) => set("hook", value)} rows={3} values={body.hook} />
      </Group>

      <Group title="The problem">
        <TextField label="Headline" onChange={(value) => set("problem", { ...body.problem, title: value })} value={body.problem.title} />
        <LinesField label="Paragraphs" onChange={(value) => set("problem", { ...body.problem, paragraphs: value })} values={body.problem.paragraphs} />
        <span className="text-[13px] font-bold text-ink-2">What it costs</span>
        <Rows
          addLabel="Add cost example"
          blank={{ segment: "state_local" as StorySegment, text: "" }}
          items={body.costs}
          onChange={(value) => set("costs", value)}
          render={(item, update) => (
            <>
              <SegmentSelect onChange={(segment) => update({ ...item, segment })} value={item.segment} />
              <PlainArea label="Cost example" onChange={(text) => update({ ...item, text })} value={item.text} />
            </>
          )}
        />
      </Group>

      <Group title="The solution">
        <TextField label="Headline" onChange={(value) => set("solution", { ...body.solution, title: value })} value={body.solution.title} />
        <LinesField label="Intro paragraphs" onChange={(value) => set("solution", { ...body.solution, intro: value })} rows={2} values={body.solution.intro} />
        <Rows
          addLabel="Add part"
          blank={{ title: "", paragraphs: [] as string[] }}
          items={body.solution.parts}
          onChange={(parts) => set("solution", { ...body.solution, parts })}
          render={(item, update) => (
            <>
              <PlainInput label="Part title" onChange={(value) => update({ ...item, title: value })} value={item.title} />
              <PlainLines
                label="Part paragraphs, one per line"
                onChange={(paragraphs) => update({ ...item, paragraphs })}
                values={item.paragraphs}
              />
            </>
          )}
        />
      </Group>

      <Group title="Selling motion">
        <AreaField label="Teach" onChange={(value) => set("motion", { ...body.motion, teach: value })} value={body.motion.teach} />
        <AreaField label="Tailor" onChange={(value) => set("motion", { ...body.motion, tailor: value })} value={body.motion.tailor} />
        <AreaField label="Take control" onChange={(value) => set("motion", { ...body.motion, takeControl: value })} value={body.motion.takeControl} />
      </Group>

      <Group title="Elevator pitches">
        <Rows
          addLabel="Add pitch"
          blank={{ title: "Elevator pitch", text: "" }}
          items={body.pitches}
          onChange={(value) => set("pitches", value)}
          render={(item, update) => (
            <>
              <PlainInput label="Pitch name" onChange={(value) => update({ ...item, title: value })} value={item.title} />
              <PlainArea label="Pitch" onChange={(value) => update({ ...item, text: value })} rows={4} value={item.text} />
            </>
          )}
        />
      </Group>

      <Group title="Discovery and triggers">
        <LinesField label="Discovery questions" onChange={(value) => set("discoveryQuestions", value)} values={body.discoveryQuestions} />
        <LinesField label="Buying triggers" onChange={(value) => set("buyingTriggers", value)} values={body.buyingTriggers} />
      </Group>

      <Group title="Stories">
        <Rows
          addLabel="Add story"
          blank={{ segment: "state_local" as StorySegment, text: "" }}
          items={body.stories}
          onChange={(value) => set("stories", value)}
          render={(item, update) => (
            <>
              <SegmentSelect onChange={(segment) => update({ ...item, segment })} value={item.segment} />
              <PlainArea label="Story" onChange={(text) => update({ ...item, text })} rows={4} value={item.text} />
            </>
          )}
        />
      </Group>

      <Group title="Objection handling">
        <Rows
          addLabel="Add objection"
          blank={{ objection: "", response: "" }}
          items={body.objections}
          onChange={(value) => set("objections", value)}
          render={(item, update) => (
            <>
              <PlainInput label="Objection" onChange={(value) => update({ ...item, objection: value })} value={item.objection} />
              <PlainArea label="Response" onChange={(value) => update({ ...item, response: value })} rows={4} value={item.response} />
            </>
          )}
        />
      </Group>

      <Group title="Common mistakes">
        <Rows
          addLabel="Add mistake"
          blank={{ title: "", body: "" }}
          items={body.mistakes}
          onChange={(value) => set("mistakes", value)}
          render={(item, update) => (
            <>
              <PlainInput label="Mistake" onChange={(value) => update({ ...item, title: value })} value={item.title} />
              <PlainArea label="Why it hurts" onChange={(value) => update({ ...item, body: value })} rows={2} value={item.body} />
            </>
          )}
        />
      </Group>

      <Group title="Summary and self-test">
        <LinesField label="Key takeaways" onChange={(value) => set("takeaways", value)} values={body.takeaways} />
        <LinesField label="Test yourself questions" onChange={(value) => set("retrievalCheck", value)} values={body.retrievalCheck} />
      </Group>
    </div>
  );
}

import Link from "next/link";
import { PracticeToolPage } from "@/components/practice/practice-tool-page";
import { StatusPill } from "@/components/ui/status-pill";
import { Tag } from "@/components/ui/tag";
import type { CatalogueEntry, SimulationCatalogue as Catalogue } from "@/lib/simulations/catalogue";
import { daysUntil, formatDay } from "@/lib/se/ramp-model";

function statusTone(status: CatalogueEntry["status"]) {
  if (status === "Done") return "success" as const;
  if (status === "In progress") return "blue" as const;
  return "neutral" as const;
}

function DueLine({ dueDate, done }: { dueDate?: string | null; done: boolean }) {
  const due = formatDay(dueDate);
  if (!due || done) return null;
  const days = daysUntil(dueDate);
  const overdue = days !== null && days < 0;
  return (
    <span className={overdue ? "text-[13px] font-bold text-danger" : "text-[13px] font-bold text-warning"}>
      {overdue ? "Overdue since" : "Due"} {due}
    </span>
  );
}

function EntryCard({ entry, actionLabel }: { entry: CatalogueEntry; actionLabel: string }) {
  const label = entry.status === "In progress" ? "Resume" : entry.status === "Done" ? "Practice again" : actionLabel;
  return (
    <li className="flex flex-col gap-1.5 rounded-[14px] border border-line bg-white px-[18px] py-4">
      <div className="flex items-start justify-between gap-3">
        <DueLine done={entry.status === "Done"} dueDate={entry.dueDate} />
        {entry.status !== "Not started" ? (
          <StatusPill className="ml-auto" tone={statusTone(entry.status)}>
            {entry.status}
          </StatusPill>
        ) : null}
      </div>
      <h3 className="text-base font-extrabold text-ink">{entry.title}</h3>
      <span className="text-[13px] text-muted">{entry.detail}</span>
      {entry.tags.length ? (
        <div className="mt-1 flex flex-wrap gap-1.5">
          {entry.tags.map((tag) => (
            <Tag key={tag}>{tag}</Tag>
          ))}
        </div>
      ) : null}
      <Link className="link mt-1 self-start text-sm" href={entry.href}>
        {label}
        <span className="sr-only"> {entry.title}</span>
      </Link>
    </li>
  );
}

function Section({
  id,
  title,
  subtitle,
  entries,
  actionLabel,
}: {
  id: string;
  title: string;
  subtitle?: string;
  entries: CatalogueEntry[];
  actionLabel: string;
}) {
  if (!entries.length) return null;
  return (
    <section aria-labelledby={id} className="flex flex-col gap-3">
      <div>
        <h2 className="text-xl font-extrabold text-ink" id={id}>
          {title}
        </h2>
        {subtitle ? <p className="mt-0.5 text-sm text-muted">{subtitle}</p> : null}
      </div>
      <ul className="grid gap-3.5 md:grid-cols-2 xl:grid-cols-3">
        {entries.map((entry) => (
          <EntryCard actionLabel={actionLabel} entry={entry} key={entry.key} />
        ))}
      </ul>
    </section>
  );
}

/** Simulations landing page. Every card opens the full session view; nothing expands in place. */
export function SimulationCatalogue({ catalogue, testMode }: { catalogue: Catalogue; testMode: boolean }) {
  const hasOwnWork = catalogue.ramp.length + catalogue.assigned.length + catalogue.inProgress.length > 0;
  return (
    <PracticeToolPage
      subtitle="Role-play with an AI buyer and get a scored coaching card. Your ramp steps come first."
      testMode={testMode}
      title="Simulations"
    >
      <Section
        actionLabel="Start"
        entries={catalogue.ramp}
        id="sim-ramp"
        subtitle="Simulation steps on your ramp plan."
        title="From your ramp"
      />
      <Section actionLabel="Start" entries={catalogue.assigned} id="sim-assigned" title="Assigned to you" />
      <Section actionLabel="Resume" entries={catalogue.inProgress} id="sim-in-progress" title="Your practice in progress" />

      <section aria-labelledby="sim-browse" className="flex flex-col gap-5">
        <div>
          <h2 className="text-xl font-extrabold text-ink" id="sim-browse">
            Browse scenarios
          </h2>
          <p className="mt-0.5 text-sm text-muted">
            {hasOwnWork
              ? "Try anything else here. Practice rounds are never scored; only what you submit reaches your manager."
              : "Nothing is assigned yet. Start with a foundational scenario. Practice rounds are never scored."}
          </p>
        </div>
        {catalogue.browse.length ? (
          catalogue.browse.map((group) => (
            <div className="flex flex-col gap-3" key={group.difficulty}>
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
                <h3 className="label-caps">{group.label}</h3>
                <p className="text-[13px] text-muted">{group.blurb}</p>
              </div>
              <ul className="grid gap-3.5 md:grid-cols-2 xl:grid-cols-3">
                {group.entries.map((entry) => (
                  <EntryCard actionLabel="Start" entry={entry} key={entry.key} />
                ))}
              </ul>
            </div>
          ))
        ) : (
          <p className="rounded-[14px] border border-line bg-white px-[18px] py-4 text-sm text-muted">
            No scenarios are published for your team yet. Enablement adds them in Admin, Practice library.
          </p>
        )}
      </section>
    </PracticeToolPage>
  );
}

import Link from "next/link";
import { Note } from "@/components/ui/editorial";
import { Tag } from "@/components/ui/tag";

export type PracticeToolCard = {
  id: string;
  title: string;
  description: string;
  /** Last activity, one plain sentence ("Last run Oct 2, scored 81"). */
  last: string;
  assigned: number;
  href: string;
  linkLabel: string;
};

/** "Keep skills sharp" (artboard 3a): three line cards, each with an "n assigned" badge when there is work waiting. */
export function PracticeToolCards({ cards }: { cards: PracticeToolCard[] }) {
  if (cards.length === 0) return null;
  return (
    <section aria-labelledby="keep-sharp" className="flex flex-col gap-3">
      <h2 className="text-xl font-extrabold text-ink" id="keep-sharp">
        Keep skills sharp
      </h2>
      <ul className="grid gap-4 md:grid-cols-[repeat(auto-fit,minmax(220px,1fr))]">
        {cards.map((card) => (
          <li className="flex flex-col gap-2.5 rounded-[14px] border border-line bg-white px-5 py-[18px]" key={card.id}>
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-lg font-extrabold text-ink">{card.title}</h3>
              {card.assigned > 0 ? <Tag tone="warning">{card.assigned} assigned</Tag> : null}
            </div>
            <p className="text-sm leading-normal text-ink-2">{card.description}</p>
            <p className="mt-auto text-[13px] text-muted">{card.last}</p>
            <Link className="link self-start text-sm" href={card.href}>
              {card.linkLabel}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export type AssignedPractice = {
  id: string;
  title: string;
  /** "Simulation, from enablement" */
  source: string;
  due?: string | null;
  overdue?: boolean;
  href: string;
};

/** Rail: work assigned by enablement or the manager, then "A note on scores". */
export function AssignedToYou({ items }: { items: AssignedPractice[] }) {
  return (
    <>
      <section aria-labelledby="assigned-to-you" className="flex flex-col gap-3.5">
        <h2 className="label-caps" id="assigned-to-you">
          Assigned to you
        </h2>
        {items.length > 0 ? (
          <ul className="flex flex-col gap-3.5">
            {items.map((item) => (
              <li className="flex flex-col gap-1.5 rounded-[14px] border border-line bg-white px-[18px] py-4" key={item.id}>
                {item.due ? (
                  <span className={item.overdue ? "text-[13px] font-bold text-danger" : "text-[13px] font-bold text-warning"}>
                    {item.overdue ? "Overdue since" : "Due"} {item.due}
                  </span>
                ) : null}
                <h3 className="text-base font-extrabold text-ink">{item.title}</h3>
                <span className="text-[13px] text-muted">{item.source}</span>
                <Link className="link mt-1 self-start text-sm" href={item.href}>
                  Start<span className="sr-only"> {item.title}</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-[14px] border border-line bg-white px-[18px] py-4 text-sm text-muted">
            Nothing assigned right now. When enablement or your manager assigns practice, it shows up here.
          </p>
        )}
      </section>
      <Note title="A note on scores">
        Practice rounds are never scored. Only the attempt you submit reaches your manager.
      </Note>
    </>
  );
}

import Link from "next/link";

export type SharpRow = { id: string; tool: string; last: string; meta: string; href: string; action: string };

/** "Keep skills sharp": Schedule-styled blue list of practice tools with last activity and a link. */
export function KeepSkillsSharp({ rows }: { rows: SharpRow[] }) {
  if (rows.length === 0) return null;
  return (
    <section aria-labelledby="keep-sharp" className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="text-lg font-extrabold text-ink" id="keep-sharp">
          Keep skills sharp
        </h2>
        <Link className="link text-sm" href="/practice/challenges">
          Browse library
        </Link>
      </div>
      <ul className="rounded-[14px] bg-blue p-1">
        {rows.map((row, index) => (
          <li key={row.id}>
            {index > 0 ? <div aria-hidden className="mx-3 h-px bg-blue-2" /> : null}
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 px-4 py-3 text-[15px] text-white md:grid-cols-[170px_minmax(0,1fr)_120px_70px]">
              <span className="font-bold">{row.tool}</span>
              <span className="order-3 col-span-2 text-on-blue md:order-none md:col-span-1">{row.last}</span>
              <span className="order-4 font-mono text-xs text-signal uppercase md:order-none">{row.meta}</span>
              <Link
                aria-label={`${row.action} ${row.tool}`}
                className="order-2 text-right text-sm font-bold text-white underline decoration-signal decoration-2 underline-offset-[3px] hover:decoration-white md:order-none"
                href={row.href}
              >
                {row.action}
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

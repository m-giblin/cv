import Link from "next/link";
import { LINE_CARD_CLS } from "@/components/se/form-classes";
import { Tag } from "@/components/ui/tag";
import { analyzeCompetencyGaps } from "@/lib/development/plan-utils";
import { DashboardData } from "@/lib/types";

export function CompetencyGapsCard({ data }: { data: DashboardData }) {
  const gaps = analyzeCompetencyGaps(data, data.currentUser.id);

  if (gaps.length === 0) {
    return null;
  }

  return (
    <section aria-labelledby="competency-focus-heading" className={`${LINE_CARD_CLS} overflow-hidden`}>
      <div className="border-b border-divider px-5 py-3.5">
        <h2 className="text-base font-bold text-ink" id="competency-focus-heading">
          Competency focus areas
        </h2>
        <p className="mt-0.5 text-[13px] text-muted">From simulations, coaching cards, and open plan steps.</p>
      </div>
      <ul className="divide-y divide-divider">
        {gaps.map((gap) => (
          <li className="flex items-center justify-between gap-3 px-5 py-3" key={gap.competencyId}>
            <div className="min-w-0">
              <p className="text-[15px] font-semibold text-ink">{gap.competencyName}</p>
              <p className="font-mono text-xs uppercase tracking-[0.03em] text-muted">{gap.category}</p>
            </div>
            <Tag tone="danger">
              ▲ {gap.gapCount} signal{gap.gapCount === 1 ? "" : "s"}
            </Tag>
          </li>
        ))}
      </ul>
      <div className="border-t border-divider px-5 py-3">
        <Link className="link text-sm" href="/development">
          View annual goals →
        </Link>
      </div>
    </section>
  );
}

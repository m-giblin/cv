import { TrendingDown } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { analyzeCompetencyGaps } from "@/lib/development/plan-utils";
import { DashboardData } from "@/lib/types";

export function CompetencyGapsCard({ data }: { data: DashboardData }) {
  const gaps = analyzeCompetencyGaps(data, data.currentUser.id);

  if (gaps.length === 0) {
    return null;
  }

  return (
    <div className="overflow-hidden rounded-xl border border-[#e2eaf5] bg-white shadow-[0_1px_4px_rgba(0,20,58,0.04)]">
      <div className="border-b border-[#f1f5f9] p-[16px_18px]">
        <p className="flex items-center gap-2 text-[15px] font-bold text-[#0a1628]">
          <TrendingDown className="h-5 w-5 text-sp-magenta" />
          Competency focus areas
        </p>
        <p className="text-[12px] text-[#64748b]">From simulations, coaching cards, and open plan steps.</p>
      </div>
      <div className="space-y-2 p-[16px_18px]">
        {gaps.map((gap) => (
          <div className="flex items-center justify-between rounded-xl bg-sp-magenta-soft/20 px-3 py-2 text-sm" key={gap.competencyId}>
            <div>
              <p className="font-semibold text-sp-navy">{gap.competencyName}</p>
              <p className="text-xs text-sp-navy-muted">{gap.category}</p>
            </div>
            <Badge tone="magenta">
              {gap.gapCount} signal{gap.gapCount === 1 ? "" : "s"}
            </Badge>
          </div>
        ))}
        <Link className="inline-block text-sm font-semibold text-sp-blue hover:text-sp-blue-deep" href="/development">
          View annual goals →
        </Link>
      </div>
    </div>
  );
}

import { TrendingDown } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { analyzeCompetencyGaps } from "@/lib/development/plan-utils";
import { DashboardData } from "@/lib/types";

export function CompetencyGapsCard({ data }: { data: DashboardData }) {
  const gaps = analyzeCompetencyGaps(data, data.currentUser.id);

  if (gaps.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <TrendingDown className="h-5 w-5 text-sp-magenta" />
          Competency focus areas
        </CardTitle>
        <CardDescription>From simulations, coaching cards, and open plan steps.</CardDescription>
      </CardHeader>
      <div className="space-y-2">
        {gaps.map((gap) => (
          <div className="flex items-center justify-between rounded-xl bg-sp-magenta-soft/20 px-3 py-2 text-sm" key={gap.competencyId}>
            <div>
              <p className="font-semibold text-sp-navy">{gap.competencyName}</p>
              <p className="text-xs text-sp-navy-muted">{gap.category}</p>
            </div>
            <Badge tone="magenta">{gap.gapCount} signal{gap.gapCount === 1 ? "" : "s"}</Badge>
          </div>
        ))}
      </div>
      <Link className="mt-3 inline-block text-sm font-semibold text-sp-blue hover:text-sp-blue-deep" href="/development">
        View annual goals →
      </Link>
    </Card>
  );
}

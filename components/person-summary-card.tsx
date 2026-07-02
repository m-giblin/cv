import { ArrowRight, ClipboardCheck } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Profile, UserPlan } from "@/lib/types";
import { formatPercent, initials } from "@/lib/utils";

export function PersonSummaryCard({
  profile,
  plan,
  openReviews,
  href = "/manager",
}: {
  profile: Profile;
  plan?: UserPlan;
  openReviews: number;
  href?: string;
}) {
  return (
    <Card className="transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start gap-4">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-900 text-sm font-bold text-white">
          {initials(profile.fullName)}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-semibold text-slate-950">{profile.fullName}</h3>
              <p className="text-sm capitalize text-slate-500">{profile.level} • {profile.role.replaceAll("_", " ")}</p>
            </div>
            {openReviews > 0 ? <Badge tone="amber">{openReviews} review</Badge> : <Badge tone="green">clear</Badge>}
          </div>
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="inline-flex items-center gap-1 text-slate-500">
                <ClipboardCheck className="h-4 w-4" />
                {plan?.name ?? "No active plan"}
              </span>
              <span className="font-medium text-slate-700">{formatPercent(plan?.progress ?? 0)}</span>
            </div>
            <Progress value={plan?.progress ?? 0} />
          </div>
          <Link className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700" href={href}>
            View timeline and work items
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </Card>
  );
}

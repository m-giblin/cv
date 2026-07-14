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
 <Card className="transition hover:-translate-y-0.5 hover:border-sp-blue/25 hover:hover:shadow-sp-blue/5">
 <div className="flex items-start gap-4">
 <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-sp-blue to-sp-magenta text-sm font-bold text-white">
 {initials(profile.fullName)}
 </span>
 <div className="min-w-0 flex-1">
 <div className="flex items-start justify-between gap-3">
 <div>
 <h3 className="font-bold text-sp-navy">{profile.fullName}</h3>
 <p className="text-sm capitalize text-sp-navy-muted">
 {profile.level} • {profile.role.replaceAll("_", " ")}
 </p>
 </div>
 {openReviews > 0 ? (
 <Badge tone="amber">{openReviews} review</Badge>
 ) : (
 <Badge tone="green">clear</Badge>
 )}
 </div>
 <div className="mt-4 space-y-2">
 <div className="flex items-center justify-between text-sm">
 <span className="inline-flex items-center gap-1 text-sp-navy-muted">
 <ClipboardCheck className="h-4 w-4" />
 {plan?.name ?? "No active plan"}
 </span>
 <span className="font-semibold text-sp-navy">{formatPercent(plan?.progress ?? 0)}</span>
 </div>
 <Progress value={plan?.progress ?? 0} />
 </div>
 <Link
 className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-sp-blue hover:text-sp-blue-deep"
 href={href}
 >
 View timeline and work items
 <ArrowRight className="h-4 w-4" />
 </Link>
 </div>
 </div>
 </Card>
 );
}

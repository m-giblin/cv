import { Award, CheckCircle2, Lock, Sparkles, Trophy } from "lucide-react";
import type { AccountBadge } from "@/lib/account/achievements";
import type { CompletionBadge } from "@/lib/account/completion-badges";
import type { Profile } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

function milestoneStyles(tone: AccountBadge["tone"], earned: boolean) {
  if (!earned) {
    return "border-sp-blue/10 bg-sp-surface-muted/40 opacity-70 grayscale";
  }

  switch (tone) {
    case "gold":
      return "border-amber-300/80 bg-gradient-to-br from-amber-50 via-white to-amber-100/80 shadow-sm shadow-amber-100";
    case "magenta":
      return "border-sp-magenta/25 bg-gradient-to-br from-sp-magenta-soft/40 via-white to-sp-blue-soft/30";
    case "green":
      return "border-emerald-200 bg-emerald-50/80";
    default:
      return "border-sp-blue/20 bg-sp-blue-soft/30";
  }
}

function trophyStyles(tone: CompletionBadge["tone"]) {
  switch (tone) {
    case "gold":
      return "border-amber-300/70 bg-gradient-to-br from-amber-50 via-white to-yellow-50 shadow-md shadow-amber-100/80";
    case "magenta":
      return "border-sp-magenta/30 bg-gradient-to-br from-sp-magenta-soft/50 via-white to-sp-blue-soft/20 shadow-md shadow-sp-magenta/10";
    case "purple":
      return "border-violet-200 bg-gradient-to-br from-violet-50 via-white to-sp-magenta-soft/20 shadow-md shadow-violet-100/60";
    case "green":
      return "border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-sp-blue-soft/20 shadow-md shadow-emerald-100/60";
    default:
      return "border-sp-blue/25 bg-gradient-to-br from-sp-blue-soft/40 via-white to-white shadow-md shadow-sp-blue/10";
  }
}

function formatEarnedDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function AccountProfilePanel({
  profile,
  milestones,
  trophies,
  planProgress,
}: {
  profile: Profile;
  milestones: AccountBadge[];
  trophies: CompletionBadge[];
  planProgress: number | null;
}) {
  const initials = profile.fullName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const earnedMilestones = milestones.filter((badge) => badge.earned).length;
  const totalEarned = earnedMilestones + trophies.length;

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border-sp-blue/10">
        <div className="bg-gradient-to-br from-sp-blue/10 via-white to-sp-magenta/10 px-6 py-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
            <span className="flex h-20 w-20 shrink-0 items-center justify-center rounded-3xl bg-gradient-to-br from-sp-blue to-sp-magenta text-2xl font-bold text-white shadow-lg shadow-sp-blue/20">
              {initials}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold uppercase tracking-wider text-sp-magenta">SailPoint SE Enablement</p>
              <h2 className="mt-1 text-2xl font-bold text-sp-navy">{profile.fullName}</h2>
              <p className="mt-1 text-sm text-sp-navy-muted">{profile.email}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge tone="blue">{profile.role.replaceAll("_", " ")}</Badge>
                <Badge tone="magenta">{profile.level} SE</Badge>
                <Badge tone="green">
                  {totalEarned} badge{totalEarned === 1 ? "" : "s"} earned
                </Badge>
              </div>
            </div>
          </div>
          {planProgress !== null ? (
            <div className="mt-6 max-w-md">
              <div className="mb-2 flex justify-between text-sm">
                <span className="font-medium text-sp-navy">Onboarding progress</span>
                <span className="font-bold text-sp-blue">{planProgress}%</span>
              </div>
              <Progress value={planProgress} />
            </div>
          ) : null}
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-amber-500" />
            Trophy case
          </CardTitle>
          <CardDescription>
            Fun badges for every challenge and simulation your manager has approved — proof you earned it.
          </CardDescription>
        </CardHeader>
        {trophies.length > 0 ? (
          <div className="grid gap-4 px-6 pb-6 sm:grid-cols-2 lg:grid-cols-3">
            {trophies.map((trophy) => (
              <div
                className={`relative rounded-2xl border p-5 transition hover:-translate-y-0.5 ${trophyStyles(trophy.tone)}`}
                key={trophy.id}
              >
                <Sparkles className="absolute right-4 top-4 h-4 w-4 text-amber-400" />
                <div className="mb-3 text-4xl leading-none">{trophy.emoji}</div>
                <p className="text-lg font-bold text-sp-navy">{trophy.funTitle}</p>
                <p className="mt-1 text-sm leading-5 text-sp-navy-muted">{trophy.subtitle}</p>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <Badge tone={trophy.kind === "challenge" ? "blue" : "magenta"}>
                    {trophy.kind === "challenge" ? "Challenge" : "Simulation"}
                  </Badge>
                  <span className="text-xs font-semibold text-emerald-700">
                    Earned {formatEarnedDate(trophy.earnedAt)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="mx-6 mb-6 rounded-2xl border border-dashed border-sp-blue/20 bg-sp-blue-soft/20 p-8 text-center">
            <div className="text-4xl">🏆</div>
            <p className="mt-3 text-sm font-semibold text-sp-navy">No trophies yet</p>
            <p className="mt-1 text-sm text-sp-navy-muted">
              Complete a challenge or simulation, submit for manager review, and your trophy shows up here when they
              approve it.
            </p>
          </div>
        )}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5 text-amber-500" />
            Career milestones
          </CardTitle>
          <CardDescription>Bigger-picture badges for onboarding, certifications, and your first approved win.</CardDescription>
        </CardHeader>
        <div className="grid gap-4 px-6 pb-6 sm:grid-cols-2 lg:grid-cols-3">
          {milestones.map((badge) => (
            <div
              className={`relative rounded-2xl border p-5 transition ${milestoneStyles(badge.tone, badge.earned)}`}
              key={badge.id}
            >
              {badge.earned ? (
                <CheckCircle2 className="absolute right-4 top-4 h-5 w-5 text-emerald-600" />
              ) : (
                <Lock className="absolute right-4 top-4 h-4 w-4 text-sp-navy-muted/60" />
              )}
              <div
                className={`mb-3 inline-flex rounded-2xl p-3 text-2xl ${
                  badge.earned ? "bg-white/80" : "bg-white/60 grayscale"
                }`}
              >
                {badge.emoji ?? "🏅"}
              </div>
              <p className="font-bold text-sp-navy">{badge.funTitle ?? badge.title}</p>
              <p className="mt-2 text-sm leading-6 text-sp-navy-muted">{badge.description}</p>
              {badge.earned ? (
                <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-emerald-700">
                  {badge.earnedAt ? `Earned ${formatEarnedDate(badge.earnedAt)}` : "Earned"}
                </p>
              ) : (
                <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-sp-navy-muted">In progress</p>
              )}
            </div>
          ))}
        </div>
      </Card>

      <Card className="border-sp-blue/10 bg-sp-blue-soft/10">
        <div className="flex items-start gap-3 p-6">
          <Lock className="mt-0.5 h-5 w-5 shrink-0 text-sp-blue" />
          <div className="text-sm text-sp-navy-muted">
            <p className="font-semibold text-sp-navy">Session security</p>
            <p className="mt-1 leading-6">
              Sessions expire after 15 minutes of inactivity. Password changes require a fresh MFA verification.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}

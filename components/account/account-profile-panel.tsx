import Link from "next/link";
import type { AccountBadge } from "@/lib/account/achievements";
import type { CompletionBadge } from "@/lib/account/completion-badges";
import { getAccessTier } from "@/lib/auth/rbac";
import type { Profile } from "@/lib/types";
import { Progress } from "@/components/ui/progress";
import { Stamp } from "@/components/ui/stamp";
import { StatusPill } from "@/components/ui/status-pill";
import { Tag } from "@/components/ui/tag";

/** "Thu, Oct 9" (plus the year when it isn't this year). */
function formatEarnedDate(iso: string) {
 const date = new Date(iso);
 const sameYear = date.getFullYear() === new Date().getFullYear();
 return date.toLocaleDateString("en-US", {
 weekday: "short",
 month: "short",
 day: "numeric",
 ...(sameYear ? {} : { year: "numeric" }),
 });
}

function sentenceCase(value: string) {
 const text = value.replaceAll("_", " ");
 return text.charAt(0).toUpperCase() + text.slice(1);
}

export function AccountProfilePanel({
 profile,
 manager,
 milestones,
 trophies,
 planProgress,
}: {
 profile: Profile;
 manager?: Profile | null;
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
 const isSe = getAccessTier(profile.role) === "se";

 return (
 <div className="flex flex-wrap gap-[var(--rail-gap)] min-[1100px]:grid min-[1100px]:grid-cols-[minmax(0,1fr)_320px]">
 <div className="min-w-0 flex-1 space-y-7">
 <section className="rounded-[14px] border border-line bg-white p-6">
 <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
 <span
 aria-hidden
 className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-blue-soft text-lg font-bold text-blue"
 >
 {initials}
 </span>
 <div className="min-w-0 flex-1">
 <h2 className="text-2xl leading-[1.15] font-extrabold tracking-[-0.015em] text-ink">{profile.fullName}</h2>
 <p className="mt-0.5 text-sm text-muted">{profile.email}</p>
 <div className="mt-3 flex flex-wrap gap-2">
 <Tag tone="blue">{sentenceCase(profile.role)}</Tag>
 <Tag>{profile.level} SE</Tag>
 <Tag tone="success">
 {totalEarned} badge{totalEarned === 1 ? "" : "s"} earned
 </Tag>
 </div>
 </div>
 </div>
 {planProgress !== null ? (
 <div className="mt-6 max-w-md">
 <div className="mb-2 flex items-baseline justify-between">
 <span className="label-caps">Ramp progress</span>
 <span className="num text-xl font-extrabold text-blue">{planProgress}%</span>
 </div>
 <Progress value={planProgress} />
 </div>
 ) : null}
 </section>

 <section className="overflow-hidden rounded-[14px] border border-line bg-white">
 <div className="border-b border-divider px-5 py-3.5">
 <h2 className="text-lg leading-[1.3] font-extrabold text-ink">Trophy case</h2>
 <p className="text-sm text-muted">Every challenge and simulation your manager has approved.</p>
 </div>
 {trophies.length > 0 ? (
 <ul>
 {trophies.map((trophy) => (
 <li
 className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-4 border-b border-divider px-5 py-3.5 last:border-b-0 sm:grid-cols-[auto_minmax(0,1fr)_auto]"
 key={trophy.id}
 >
 <Stamp label={`${trophy.funTitle}: earned`} size={30} state="earned" />
 <div className="min-w-0">
 <p className="text-[15px] font-bold text-ink">{trophy.funTitle}</p>
 <p className="text-sm text-ink-2">{trophy.subtitle}</p>
 </div>
 <div className="col-start-2 flex flex-wrap items-center gap-2 sm:col-start-auto sm:justify-end">
 <Tag tone="blue">{trophy.kind === "challenge" ? "Challenge" : "Simulation"}</Tag>
 <span className="text-[13px] text-muted">{formatEarnedDate(trophy.earnedAt)}</span>
 </div>
 </li>
 ))}
 </ul>
 ) : (
 <div className="px-5 py-6">
 <p className="text-[15px] font-semibold text-ink">No trophies yet</p>
 <p className="mt-1 text-sm text-ink-2">
 Finish a challenge or simulation and submit it for review. It shows up here when your manager approves it.
 </p>
 <Link className="link mt-3 inline-block text-sm" href="/practice">
 Go to Practice
 </Link>
 </div>
 )}
 </section>

 <section className="overflow-hidden rounded-[14px] border border-line bg-white">
 <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-divider px-5 py-3.5">
 <h2 className="text-lg leading-[1.3] font-extrabold text-ink">Career milestones</h2>
 <span className="num text-[13px] text-muted">
 {earnedMilestones} of {milestones.length} earned
 </span>
 </div>
 <ul>
 {milestones.map((badge) => (
 <li
 className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 border-b border-divider px-5 py-3.5 last:border-b-0"
 key={badge.id}
 >
 <Stamp
 label={`${badge.funTitle ?? badge.title}: ${badge.earned ? "earned" : "in progress"}`}
 size={30}
 state={badge.earned ? "earned" : "none"}
 />
 <div className="min-w-0">
 <p className="text-[15px] font-bold text-ink">{badge.funTitle ?? badge.title}</p>
 <p className="text-sm text-ink-2">{badge.description}</p>
 </div>
 {badge.earned ? (
 <StatusPill tone="success">
 {badge.earnedAt ? `Earned ${formatEarnedDate(badge.earnedAt)}` : "Earned"}
 </StatusPill>
 ) : (
 <StatusPill tone="neutral">In progress</StatusPill>
 )}
 </li>
 ))}
 </ul>
 </section>
 </div>

 <aside className="w-full min-w-0 space-y-5 min-[1100px]:w-auto">
 {isSe ? (
 <section className="rounded-[14px] border border-line bg-white p-5">
 <p className="label-caps">Your manager</p>
 {manager ? (
 <>
 <p className="mt-1.5 text-base font-bold text-ink">{manager.fullName}</p>
 <p className="text-[13px] text-muted">{manager.email}</p>
 <p className="mt-3 text-sm leading-normal text-ink-2">
 Challenge submissions, simulation coaching cards and pitch reviews go to this manager when you submit
 for review.
 </p>
 </>
 ) : (
 <p className="mt-1.5 text-sm leading-normal text-ink-2">
 No manager is assigned yet. Contact your program admin if submissions should go to someone.
 </p>
 )}
 </section>
 ) : null}
 <section className="rounded-[14px] border border-line bg-white p-5">
 <p className="label-caps">Security</p>
 <p className="mt-1.5 text-sm leading-normal text-ink-2">
 Changing your password needs a fresh authenticator code.
 </p>
 <Link className="link mt-3 inline-block text-sm" href="/account/change-password">
 Change password
 </Link>
 </section>
 </aside>
 </div>
 );
}

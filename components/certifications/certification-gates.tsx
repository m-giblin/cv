"use client";

import Link from "next/link";
import { ArrowLeft, CheckCircle2, ChevronRight, Clock, Loader2, User } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import {
 CertificationGateCard,
 CertificationProgressHero,
 certGateLocked,
 certPrerequisiteLabel,
} from "@/components/certifications/certification-gate-card";
import type { CertificationRecord } from "@/lib/data/get-certifications-data";
import {
 AGENTIC_CERT_ORDER,
 ALL_CERT_ORDER,
 CERT_ORDER,
 type CertType,
 certLabel,
 stageForCert,
} from "@/lib/certifications/gate-metadata";
import { CAREER_STAGES, computeCareerProgress } from "@/lib/growth/career-readiness";
import type { SeLevel } from "@/lib/types";

type Certification = {
 id: string;
 user_id: string;
 certification_type: string;
 status: string;
 evidence_text: string | null;
 evidence_url: string | null;
 manager_notes: string | null;
 approved_at: string | null;
};

type TeamProfile = {
 id: string;
 fullName: string;
 level: SeLevel;
};

function TeamOverview({
 profiles,
 teamCerts,
}: {
 profiles: TeamProfile[];
 teamCerts: CertificationRecord[];
}) {
 const pending = useMemo(
 () =>
 teamCerts
 .filter((cert) => cert.status === "submitted")
 .map((cert) => ({
 ...cert,
 profileName: profiles.find((profile) => profile.id === cert.userId)?.fullName ?? "Unknown",
 })),
 [profiles, teamCerts],
 );

 const roster = useMemo(() => {
 return profiles.map((profile) => {
 const userCerts = teamCerts.filter((cert) => cert.userId === profile.id);
 const approved = userCerts.filter((cert) => cert.status === "approved").length;
 const submitted = userCerts.filter((cert) => cert.status === "submitted").length;
 return { profile, approved, submitted, total: ALL_CERT_ORDER.length };
 });
 }, [profiles, teamCerts]);

 return (
 <div className="space-y-8">
 {pending.length > 0 ? (
 <section className="space-y-4">
 <div className="flex items-center justify-between gap-4">
 <div>
 <h2 className="text-lg font-semibold text-sp-navy">Pending sign-offs</h2>
 <p className="text-sm text-sp-navy-muted">
 {pending.length} submission{pending.length === 1 ? "" : "s"} waiting for your review.
 </p>
 </div>
 <Badge tone="amber">{pending.length} pending</Badge>
 </div>
 <div className="grid gap-3">
 {pending.map((cert) => (
 <Link
 key={cert.id}
 className="group flex items-center justify-between gap-4 border border-amber-200/80 bg-amber-50/60 p-4 transition hover:border-amber-300 hover:bg-amber-50"
 href={`/certifications?profile=${cert.userId}`}
 >
 <div className="min-w-0">
 <p className="font-semibold text-sp-navy">{certLabel(cert.certificationType)}</p>
 <p className="text-sm text-sp-navy-muted">
 {cert.profileName} · submitted for manager sign-off
 </p>
 </div>
 <ChevronRight className="h-5 w-5 shrink-0 text-sp-navy-muted transition group-hover:translate-x-0.5" />
 </Link>
 ))}
 </div>
 </section>
 ) : (
 <div className="border border-dashed border-[#E2DFD9] bg-white p-[18px]">
 <p className="text-[15px] font-bold text-[#0D0E12]">No pending sign-offs</p>
 <p className="mt-1 text-[12px] text-[#6B6860]">
 When an SE submits evidence, it will appear here for quick review.
 </p>
 </div>
 )}

 <section className="space-y-4">
 <div>
 <h2 className="text-lg font-semibold text-sp-navy">Team readiness roster</h2>
 <p className="text-sm text-sp-navy-muted">
 Who is cleared for what — open any SE to review gates and approve evidence.
 </p>
 </div>
 <div className="overflow-hidden border border-sp-blue/10 bg-white">
 <table className="w-full text-left text-sm">
 <thead className="border-b border-sp-blue/10 bg-sp-surface-muted/50 text-xs uppercase tracking-wide text-sp-navy-muted">
 <tr>
 <th className="px-4 py-3 font-semibold">SE</th>
 <th className="px-4 py-3 font-semibold">Level</th>
 <th className="px-4 py-3 font-semibold">Cleared</th>
 <th className="px-4 py-3 font-semibold">Pending</th>
 <th className="px-4 py-3 font-semibold" />
 </tr>
 </thead>
 <tbody>
 {roster.map(({ profile, approved, submitted, total }) => (
 <tr key={profile.id} className="border-b border-sp-blue/5 last:border-0">
 <td className="px-4 py-3 font-medium text-sp-navy">{profile.fullName}</td>
 <td className="px-4 py-3 text-sp-navy-muted">{profile.level}</td>
 <td className="px-4 py-3">
 <span className="font-semibold text-sp-navy">{approved}</span>
 <span className="text-sp-navy-muted"> / {total}</span>
 </td>
 <td className="px-4 py-3">
 {submitted > 0 ? (
 <Badge tone="amber">{submitted} pending</Badge>
 ) : (
 <span className="text-sp-navy-muted">—</span>
 )}
 </td>
 <td className="px-4 py-3 text-right">
 <Link
 className="inline-flex items-center gap-1 font-semibold text-sp-blue hover:text-sp-blue-deep"
 href={`/certifications?profile=${profile.id}`}
 >
 View gates
 <ChevronRight className="h-4 w-4" />
 </Link>
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 </section>
 </div>
 );
}

function CareerLadder({
 currentLevel,
 approvedCerts,
}: {
 currentLevel: SeLevel;
 approvedCerts: string[];
}) {
 return (
 <div className="grid gap-3 md:grid-cols-3">
 {CAREER_STAGES.map((stage) => {
 const stageApproved = stage.certifications.filter((cert) => approvedCerts.includes(cert)).length;
 const isCurrent = stage.level === currentLevel;
 const isComplete = stageApproved === stage.certifications.length;

 return (
 <div
 key={stage.level}
 className={`border p-4 ${
 isCurrent
 ? "border-sp-blue/30 bg-sp-blue/5 ring-1 ring-sp-blue/20"
 : isComplete
 ? "border-emerald-200 bg-emerald-50/50"
 : "border-sp-blue/10 bg-white"
 }`}
 >
 <div className="flex items-start justify-between gap-2">
 <div>
 <p className="text-xs font-semibold uppercase tracking-wide text-sp-navy-muted">{stage.level}</p>
 <p className="mt-1 font-semibold text-sp-navy">{stage.title}</p>
 </div>
 {isComplete ? (
 <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
 ) : isCurrent ? (
 <Clock className="h-5 w-5 shrink-0 text-sp-blue" />
 ) : null}
 </div>
 <ul className="mt-3 space-y-1.5">
 {stage.certifications.map((cert) => {
 const cleared = approvedCerts.includes(cert);
 return (
 <li key={cert} className="flex items-center gap-2 text-sm text-sp-navy-muted">
 {cleared ? (
 <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
 ) : (
 <span className="h-3.5 w-3.5 shrink-0 rounded-full border border-sp-blue/20" />
 )}
 {certLabel(cert)}
 </li>
 );
 })}
 </ul>
 </div>
 );
 })}
 </div>
 );
}

export function CertificationGates({
 viewerId,
 userId,
 isManager,
 profileName,
 profileLevel,
 teamProfiles,
 initialTeamCerts,
 planProgress = 0,
 avgSimScore = null,
}: {
 viewerId: string;
 userId: string | null;
 isManager: boolean;
 profileName?: string;
 profileLevel?: SeLevel;
 teamProfiles?: TeamProfile[];
 initialTeamCerts?: CertificationRecord[];
 planProgress?: number;
 avgSimScore?: number | null;
}) {
 const [certs, setCerts] = useState<Certification[]>([]);
 const [isLoading, setIsLoading] = useState(Boolean(userId));

 const load = useCallback(async () => {
 if (!userId) return;
 setIsLoading(true);
 const response = await fetch(`/api/certifications?userId=${userId}`);
 if (response.ok) {
 const body = (await response.json()) as { certifications: Certification[] };
 const ordered = [...body.certifications].sort(
 (left, right) =>
 ALL_CERT_ORDER.indexOf(left.certification_type as CertType) -
 ALL_CERT_ORDER.indexOf(right.certification_type as CertType),
 );
 setCerts(ordered);
 }
 setIsLoading(false);
 }, [userId]);

 useEffect(() => {
 void load();
 }, [load]);

 if (!userId && isManager && teamProfiles) {
 return <TeamOverview profiles={teamProfiles} teamCerts={initialTeamCerts ?? []} />;
 }

 if (isLoading) {
 return (
 <div className="flex min-h-40 items-center justify-center">
 <Loader2 className="h-6 w-6 animate-spin text-sp-blue" />
 </div>
 );
 }

 const approvedCerts = certs.filter((cert) => cert.status === "approved").map((cert) => cert.certification_type);
 const level = profileLevel ?? "Basic";
 const progress = computeCareerProgress({
 currentLevel: level,
 approvedCerts,
 planProgress,
 avgSimScore,
 });
 const clearedCount = approvedCerts.filter((c) => CERT_ORDER.includes(c as CertType)).length;
 const careerCerts = certs.filter((c) => CERT_ORDER.includes(c.certification_type as CertType));
 const agenticCerts = certs.filter((c) => AGENTIC_CERT_ORDER.includes(c.certification_type as CertType));
 const agenticCleared = agenticCerts.filter((c) => c.status === "approved").length;

 return (
 <div className="space-y-8">
 {isManager && userId !== viewerId ? (
 <Link
 className="inline-flex items-center gap-2 text-sm font-semibold text-sp-blue hover:text-sp-blue-deep"
 href="/certifications"
 >
 <ArrowLeft className="h-4 w-4" />
 Back to team roster
 </Link>
 ) : null}

 <CertificationProgressHero
 clearedCount={clearedCount}
 nextMilestone={progress.nextStage?.title}
 readinessPercent={progress.nextStage ? progress.readinessPercent : undefined}
 totalCount={CERT_ORDER.length}
 />

 <section className="space-y-3">
 <h2 className="text-[13px] font-bold text-[#0D0E12]">Career ladder</h2>
 <p className="text-sm text-sp-navy-muted">
 Gates unlock field readiness at each level — submit evidence, get manager sign-off, build your clearance roster.
 </p>
 <CareerLadder approvedCerts={approvedCerts} currentLevel={level} />
 </section>

 <section className="space-y-4">
 <h2 className="text-lg font-semibold text-sp-navy">Career gates</h2>
 <div className="grid gap-4 lg:grid-cols-2">
 {careerCerts.map((cert) => (
 <CertificationGateCard
 cert={cert}
 isLocked={certGateLocked(cert, approvedCerts, CERT_ORDER)}
 isManager={isManager}
 isSelf={userId === viewerId}
 key={cert.id}
 onReload={() => void load()}
 prerequisiteLabel={certPrerequisiteLabel(cert.certification_type as CertType, CERT_ORDER)}
 />
 ))}
 </div>
 </section>

 <section className="space-y-4">
 <h2 className="text-lg font-semibold text-sp-navy">Agentic enablement · 2026</h2>
 <p className="text-sm text-sp-navy-muted">
 {agenticCleared} of {AGENTIC_CERT_ORDER.length} agentic gates cleared — required for AIS / Agentic Fabric customer readiness.
 </p>
 <div className="grid gap-4 lg:grid-cols-2">
 {agenticCerts.map((cert) => (
 <CertificationGateCard
 cert={cert}
 isLocked={certGateLocked(cert, approvedCerts, AGENTIC_CERT_ORDER)}
 isManager={isManager}
 isSelf={userId === viewerId}
 key={cert.id}
 onReload={() => void load()}
 prerequisiteLabel={certPrerequisiteLabel(cert.certification_type as CertType, AGENTIC_CERT_ORDER)}
 />
 ))}
 </div>
 </section>
 </div>
 );
}

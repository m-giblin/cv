"use client";

import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  Clock,
  ExternalLink,
  Loader2,
  ShieldCheck,
  Trophy,
  User,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import type { CertificationRecord } from "@/lib/data/get-certifications-data";
import {
  CERT_DETAILS,
  CERT_ORDER,
  type CertType,
  certLabel,
  stageForCert,
  statusActionLabel,
  statusTone,
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
      return { profile, approved, submitted, total: CERT_ORDER.length };
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
                className="group flex items-center justify-between gap-4 rounded-2xl border border-amber-200/80 bg-amber-50/60 p-4 transition hover:border-amber-300 hover:bg-amber-50"
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
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="text-base">No pending sign-offs</CardTitle>
            <CardDescription>
              When an SE submits evidence, it will appear here for quick review.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-sp-navy">Team readiness roster</h2>
          <p className="text-sm text-sp-navy-muted">
            Who is cleared for what — open any SE to review gates and approve evidence.
          </p>
        </div>
        <div className="overflow-hidden rounded-2xl border border-sp-blue/10 bg-white">
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
            className={`rounded-2xl border p-4 ${
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

function GateCard({
  cert,
  isManager,
  isSelf,
  onReload,
}: {
  cert: Certification;
  isManager: boolean;
  isSelf: boolean;
  onReload: () => void;
}) {
  const type = cert.certification_type as CertType;
  const details = CERT_DETAILS[type];
  const stage = stageForCert(type);
  const [isOpen, setIsOpen] = useState(false);
  const [evidenceText, setEvidenceText] = useState(cert.evidence_text ?? "");
  const [evidenceUrl, setEvidenceUrl] = useState(cert.evidence_url ?? "");
  const [managerNotes, setManagerNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const canSubmit =
    isSelf && !isManager && (cert.status === "not_started" || cert.status === "revoked");
  const canReview = isManager && cert.status === "submitted";

  async function submit() {
    setIsSaving(true);
    const response = await fetch("/api/certifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        certificationType: cert.certification_type,
        evidenceText,
        evidenceUrl,
      }),
    });

    setIsSaving(false);

    if (!response.ok) {
      toast.error("Submission failed — include at least 20 characters of evidence.");
      return;
    }

    toast.success("Submitted for manager approval.");
    setIsOpen(false);
    onReload();
  }

  async function review(status: "approved" | "revoked") {
    setIsSaving(true);
    const response = await fetch(`/api/certifications/${cert.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status,
        managerNotes:
          managerNotes.trim() ||
          (status === "approved" ? "Cleared for field readiness." : "Needs more evidence before sign-off."),
      }),
    });

    setIsSaving(false);

    if (!response.ok) {
      toast.error("Review failed.");
      return;
    }

    toast.success(status === "approved" ? "Certification approved." : "Sent back for more evidence.");
    onReload();
  }

  return (
    <Card className={cert.status === "submitted" && isManager ? "border-amber-200 ring-1 ring-amber-100" : undefined}>
      <CardHeader className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-sp-navy-muted">
              {stage?.title ?? details?.careerLevel ?? "Field readiness"}
            </p>
            <CardTitle className="text-base">{certLabel(cert.certification_type)}</CardTitle>
          </div>
          <Badge tone={statusTone(cert.status)}>{cert.status.replaceAll("_", " ")}</Badge>
        </div>
        <CardDescription className="text-sm leading-6">
          {details?.description ?? "Field readiness gate — evidence + manager sign-off."}
        </CardDescription>
        <p className="text-xs font-medium text-sp-blue">
          {statusActionLabel(cert.status, isManager)}
        </p>
      </CardHeader>

      <div className="space-y-4 px-6 pb-6">
        {cert.evidence_text ? (
          <div className="rounded-xl bg-sp-surface-muted/60 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-sp-navy-muted">Evidence</p>
            <p className="mt-1 text-sm leading-6 text-sp-navy">{cert.evidence_text}</p>
            {cert.evidence_url ? (
              <a
                className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-sp-blue hover:text-sp-blue-deep"
                href={cert.evidence_url}
                rel="noopener noreferrer"
                target="_blank"
              >
                View attachment
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            ) : null}
          </div>
        ) : null}

        {cert.manager_notes && cert.status !== "not_started" ? (
          <div className="rounded-xl border border-sp-blue/10 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-sp-navy-muted">Manager notes</p>
            <p className="mt-1 text-sm leading-6 text-sp-navy">{cert.manager_notes}</p>
            {cert.approved_at ? (
              <p className="mt-2 text-xs text-sp-navy-muted">
                Reviewed {new Date(cert.approved_at).toLocaleDateString()}
              </p>
            ) : null}
          </div>
        ) : null}

        {canSubmit && !isOpen ? (
          <Button onClick={() => setIsOpen(true)} size="sm" variant="outline">
            <ShieldCheck className="h-4 w-4" />
            Submit evidence
          </Button>
        ) : null}

        {canSubmit && isOpen ? (
          <div className="space-y-3 rounded-xl border border-sp-blue/10 bg-sp-surface-muted/30 p-4">
            <p className="text-sm text-sp-navy-muted">{details?.evidenceHint}</p>
            <Textarea
              onChange={(event) => setEvidenceText(event.target.value)}
              placeholder="Describe what you did, who was in the room, and the outcome..."
              rows={4}
              value={evidenceText}
            />
            <Input
              onChange={(event) => setEvidenceUrl(event.target.value)}
              placeholder="Link to recording, deck, or deal recap (optional)"
              type="url"
              value={evidenceUrl}
            />
            <div className="flex flex-wrap gap-2">
              <Button disabled={isSaving || evidenceText.trim().length < 20} onClick={() => void submit()} size="sm">
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                Submit for approval
              </Button>
              <Button onClick={() => setIsOpen(false)} size="sm" variant="ghost">
                Cancel
              </Button>
            </div>
          </div>
        ) : null}

        {canReview ? (
          <div className="space-y-3 rounded-xl border border-amber-200 bg-amber-50/40 p-4">
            <Textarea
              onChange={(event) => setManagerNotes(event.target.value)}
              placeholder="Optional sign-off notes for the SE..."
              rows={2}
              value={managerNotes}
            />
            <div className="flex flex-wrap gap-2">
              <Button disabled={isSaving} onClick={() => void review("approved")} size="sm">
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                Approve
              </Button>
              <Button disabled={isSaving} onClick={() => void review("revoked")} size="sm" variant="outline">
                <XCircle className="h-4 w-4" />
                Send back
              </Button>
            </div>
          </div>
        ) : null}

        {cert.status === "approved" ? (
          <div className="flex items-center gap-2 text-sm font-medium text-emerald-700">
            <Trophy className="h-4 w-4" />
            Cleared for field readiness
          </div>
        ) : null}
      </div>
    </Card>
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
          CERT_ORDER.indexOf(left.certification_type as CertType) -
          CERT_ORDER.indexOf(right.certification_type as CertType),
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
  const clearedCount = approvedCerts.length;

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

      <section className="rounded-3xl border border-sp-blue/10 bg-white p-6">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            {isManager && profileName ? (
              <p className="mb-1 flex items-center gap-2 text-sm font-medium text-sp-navy-muted">
                <User className="h-4 w-4" />
                {profileName} · {level} SE
              </p>
            ) : (
              <p className="mb-1 text-sm font-medium text-sp-navy-muted">Your field readiness</p>
            )}
            <h2 className="text-2xl font-bold text-sp-navy">
              {clearedCount} of {CERT_ORDER.length} gates cleared
            </h2>
            {progress.nextStage ? (
              <p className="mt-2 text-sm text-sp-navy-muted">
                Next milestone: {progress.nextStage.title} · {progress.readinessPercent}% readiness
              </p>
            ) : (
              <p className="mt-2 text-sm text-emerald-700">All advisory gates cleared — top of the ladder.</p>
            )}
          </div>
          <div className="w-full max-w-xs space-y-2">
            <Progress value={(clearedCount / CERT_ORDER.length) * 100} />
            <p className="text-xs text-sp-navy-muted">Career certification progress</p>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-sp-navy">Career ladder</h2>
        <p className="text-sm text-sp-navy-muted">
          Gates unlock field readiness at each level — submit evidence, get manager sign-off, build your clearance roster.
        </p>
        <CareerLadder approvedCerts={approvedCerts} currentLevel={level} />
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-sp-navy">{isManager && userId !== viewerId ? "Gates" : "Your gates"}</h2>
        <div className="grid gap-4 lg:grid-cols-2">
          {certs.map((cert) => (
            <GateCard
              key={cert.id}
              cert={cert}
              isManager={isManager}
              isSelf={userId === viewerId}
              onReload={() => void load()}
            />
          ))}
        </div>
      </section>
    </div>
  );
}

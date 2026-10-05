"use client";

import Link from "next/link";
import { type ReactNode, useCallback, useEffect, useId, useMemo, useState } from "react";
import { toast } from "sonner";
import { CredentialBadge } from "@/components/se/credential-badge";
import { FIELD_CLS, LABEL_CLS, TEXTAREA_CLS } from "@/components/se/form-classes";
import { Drawer } from "@/components/ui/drawer";
import { Stamp } from "@/components/ui/stamp";
import { Tag } from "@/components/ui/tag";
import type { CertificationRecord } from "@/lib/data/get-certifications-data";
import { ALL_CERT_ORDER, CERT_DETAILS, certLabel } from "@/lib/certifications/gate-metadata";
import { CAREER_STAGES } from "@/lib/growth/career-readiness";
import {
  SIM_PASS_SCORE,
  buildAgenticRows,
  buildGateRows,
  canSubmitGate,
  nextGate,
  type GateRecord,
  type GateRow,
  type MatrixCell,
} from "@/lib/se/gate-matrix";
import { createClient } from "@/lib/supabase/client";
import type { Challenge, ChallengeSubmission, CoachingCard, Profile, SeLevel } from "@/lib/types";
import { cn } from "@/lib/utils";

type TeamProfile = {
  id: string;
  fullName: string;
  level: SeLevel;
};

const CERT_BASE = "/readiness/certification";

const STATUS_TEXT: Record<GateRow["status"], { label: string; className: string }> = {
  cleared: { label: "✓ Cleared", className: "text-blue" },
  submitted: { label: "● Submitted", className: "text-blue" },
  ready: { label: "Ready to submit", className: "text-ink font-medium" },
  in_progress: { label: "In progress", className: "text-muted" },
  not_started: { label: "Not started", className: "text-muted" },
  locked: { label: "○ Locked", className: "text-muted" },
};

function MatrixStamp({ cell, label }: { cell: MatrixCell; label: string }) {
  if (cell.kind === "na") {
    return <span className="grid h-[30px] place-items-center font-mono text-xs text-dash">N/A</span>;
  }
  return (
    <>
      <Stamp
        className={cn(cell.state === "earned" && "rotate-[-8deg] bg-blue text-white")}
        label={`${label}: ${cell.caption || cell.state}`}
        size={30}
        state={cell.state}
      />
      {cell.caption ? (
        <span className={cn("font-mono text-xs uppercase", cell.tone === "danger" ? "text-danger" : "text-ink-2")}>
          {cell.caption}
        </span>
      ) : null}
    </>
  );
}

const MATRIX_COLS = "grid grid-cols-[minmax(0,1fr)_repeat(4,104px)_150px]";

function EvidenceMatrix({
  rows,
  agentic,
  onAct,
  actLabel,
  canAct,
}: {
  rows: GateRow[];
  agentic: GateRow[];
  onAct: (row: GateRow) => void;
  actLabel: string;
  canAct: (row: GateRow) => boolean;
}) {
  const ready = rows.find((row) => row.status === "ready")?.type;
  const agenticCleared = agentic.filter((row) => row.status === "cleared").length;
  const agenticSubmitted = agentic.filter((row) => row.status === "submitted").length;
  const agenticNext = agentic.find((row) => canAct(row));
  const agenticEvidence = agentic.filter((row) => row.record?.evidence_text).length;

  return (
    <div className="overflow-x-auto rounded-[14px] border border-line bg-white">
      <div className="min-w-[760px]" role="table" aria-label="Certification evidence matrix">
        <div className={cn(MATRIX_COLS, "bg-blue font-mono text-xs font-medium text-white uppercase")} role="row">
          <span className="px-[18px] py-[11px]" role="columnheader">
            Gate
          </span>
          {[`Sims ${SIM_PASS_SCORE}+`, "Challenge", "Evidence", "Sign-off"].map((label) => (
            <span className="px-1 py-[11px] text-center" key={label} role="columnheader">
              {label}
            </span>
          ))}
          <span className="px-[18px] py-[11px] text-right" role="columnheader">
            Status
          </span>
        </div>
        {rows.map((row) => (
          <div
            className={cn(
              MATRIX_COLS,
              "items-center border-b border-divider",
              row.type === ready && "bg-signal-soft",
            )}
            key={row.type}
            role="row"
          >
            <span className="px-[18px] text-[15px] font-bold text-ink" role="rowheader">
              {row.label}
            </span>
            {(
              [
                ["Sims", row.sims],
                ["Challenge", row.challenge],
                ["Evidence", row.evidence],
                ["Sign-off", row.signOff],
              ] as const
            ).map(([label, cell]) => (
              <span className="flex flex-col items-center gap-[3px] px-1 py-2.5" key={label} role="cell">
                <MatrixStamp cell={cell} label={`${row.label} ${label}`} />
              </span>
            ))}
            <span className="flex flex-col items-end gap-1 px-[18px] text-right font-mono text-xs uppercase" role="cell">
              <span className={STATUS_TEXT[row.status].className}>{STATUS_TEXT[row.status].label}</span>
              {canAct(row) && row.type !== ready ? (
                <button className="link font-sans text-sm normal-case" onClick={() => onAct(row)} type="button">
                  {actLabel}
                  <span className="sr-only"> for {row.label}</span>
                </button>
              ) : null}
            </span>
          </div>
        ))}
        {agentic.length > 0 ? (
          <div className={cn(MATRIX_COLS, "items-center")} role="row">
            <span className="flex flex-col px-[18px] py-2.5" role="rowheader">
              <span className="text-[15px] font-bold text-ink">Agentic track · 2026</span>
              <span className="text-[13px] text-muted">{agentic.map((row) => row.label).join(" · ")}</span>
            </span>
            <span className="grid place-items-center font-mono text-xs text-dash" role="cell">
              N/A
            </span>
            <span className="grid place-items-center font-mono text-xs text-dash" role="cell">
              N/A
            </span>
            <span className="flex flex-col items-center gap-[3px] px-1 py-2.5" role="cell">
              <MatrixStamp
                cell={{
                  kind: "stamp",
                  state: agenticEvidence === agentic.length ? "earned" : agenticEvidence > 0 ? "partial" : "none",
                  caption: `${agenticEvidence}/${agentic.length}`,
                }}
                label="Agentic evidence"
              />
            </span>
            <span className="flex flex-col items-center gap-[3px] px-1 py-2.5" role="cell">
              <MatrixStamp
                cell={{
                  kind: "stamp",
                  state: agenticCleared === agentic.length ? "earned" : agenticCleared > 0 ? "partial" : "none",
                  caption: `${agenticCleared}/${agentic.length} signed`,
                }}
                label="Agentic sign-off"
              />
            </span>
            <span className="flex flex-col items-end gap-1 px-[18px] text-right font-mono text-xs uppercase" role="cell">
              <span className={agenticCleared === agentic.length ? "text-blue" : "text-muted"}>
                {agenticCleared === agentic.length
                  ? "✓ Cleared"
                  : agenticSubmitted > 0
                    ? `● ${agenticSubmitted} submitted`
                    : `${agenticCleared} of ${agentic.length} cleared`}
              </span>
              {agenticNext ? (
                <button className="link font-sans text-sm normal-case" onClick={() => onAct(agenticNext)} type="button">
                  {actLabel}
                  <span className="sr-only"> for {agenticNext.label}</span>
                </button>
              ) : null}
            </span>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function Legend() {
  return (
    <ul className="flex flex-wrap gap-[18px] font-mono text-xs text-ink-2 uppercase">
      <li className="flex items-center gap-1.5">
        <span aria-hidden className="h-3 w-3 rounded-full bg-blue" />
        Met
      </li>
      <li className="flex items-center gap-1.5">
        <span aria-hidden className="h-3 w-3 rounded-full border border-ink bg-signal" />
        Ready to submit
      </li>
      <li className="flex items-center gap-1.5">
        <span aria-hidden className="h-3 w-3 rounded-full border-[1.5px] border-dashed border-blue" />
        Partial / in review
      </li>
      <li className="flex items-center gap-1.5">
        <span aria-hidden className="h-3 w-3 rounded-full border-[1.5px] border-line-strong" />
        Not yet
      </li>
    </ul>
  );
}

function FastestPath({ rows, nextLevel }: { rows: GateRow[]; nextLevel: string | null }) {
  const steps = rows
    .filter((row) => row.status !== "cleared" && row.status !== "submitted" && row.status !== "locked")
    .slice(0, 3)
    .map((row) => {
      if (row.status === "ready") return { title: `Submit ${row.label}`, sub: "All evidence met" };
      const simsShort = Math.max(0, row.simsRequired - row.simsMet);
      if (simsShort > 0)
        return {
          title: `${simsShort === 1 ? "One sim" : `${simsShort} sims`} at ${SIM_PASS_SCORE}+`,
          sub: `Unblocks ${row.label}`,
        };
      if (!row.challengeMet) return { title: "Complete a reviewed challenge", sub: `Unblocks ${row.label}` };
      return { title: `Add evidence for ${row.label}`, sub: "Then submit for sign-off" };
    });
  if (steps.length === 0) return null;
  return (
    <section aria-labelledby="fastest-path" className="overflow-hidden rounded-[14px] border border-line bg-white">
      <h2 className="border-b border-divider px-3.5 py-2.5 font-mono text-xs font-medium text-muted uppercase" id="fastest-path">
        Fastest path{nextLevel ? ` to ${nextLevel}` : ""}
      </h2>
      <ol>
        {steps.map((step, index) => (
          <li
            className="grid grid-cols-[36px_minmax(0,1fr)] items-start gap-2.5 border-b border-divider px-3.5 py-[11px] last:border-b-0"
            key={step.title}
          >
            <span aria-hidden className="text-xl leading-[1.1] font-extrabold tracking-[-0.03em] text-blue">
              {String(index + 1).padStart(2, "0")}
            </span>
            <span className="flex flex-col gap-0.5">
              <b className="text-sm text-ink">{step.title}</b>
              <span className="text-[13px] text-ink-2">{step.sub}</span>
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}

function SubmitDrawer({ row, onClose, onDone }: { row: GateRow | null; onClose: () => void; onDone: () => void }) {
  const ids = { text: useId(), url: useId(), file: useId() };
  const [evidenceText, setEvidenceText] = useState("");
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setEvidenceText(row?.record?.evidence_text ?? "");
    setEvidenceUrl(row?.record?.evidence_url?.startsWith("storage:") ? "" : (row?.record?.evidence_url ?? ""));
    setEvidenceFile(null);
  }, [row]);

  async function submit() {
    if (!row) return;
    if (evidenceText.trim().length < 20) {
      toast("Describe your evidence in at least 20 characters first");
      return;
    }
    setSaving(true);
    let evidencePath = "";
    if (evidenceFile) {
      const supabase = createClient();
      if (!supabase) {
        toast.error("Storage not configured.");
        setSaving(false);
        return;
      }
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setSaving(false);
        return;
      }
      const safeName = evidenceFile.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      evidencePath = `${user.id}/${Date.now()}-${safeName}`;
      const { error } = await supabase.storage.from("evidence").upload(evidencePath, evidenceFile);
      if (error) {
        toast.error("Upload failed.");
        setSaving(false);
        return;
      }
    }
    const response = await fetch("/api/certifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        certificationType: row.type,
        evidenceText,
        evidenceUrl: evidencePath ? "" : evidenceUrl,
        evidencePath: evidencePath || undefined,
      }),
    });
    setSaving(false);
    if (!response.ok) {
      toast.error("Submission failed — include at least 20 characters of evidence.");
      return;
    }
    toast(`${row.label} evidence sent for sign-off`);
    onDone();
  }

  return (
    <Drawer
      footer={
        <button className="btn-primary" disabled={saving} onClick={() => void submit()} type="button">
          {saving ? "Submitting…" : "Submit for sign-off"}
        </button>
      }
      onClose={onClose}
      open={Boolean(row)}
      title={row ? `Submit ${row.label} evidence` : ""}
    >
      {row ? (
        <div className="flex flex-col gap-4 text-[15px] leading-[1.5] text-ink-2">
          <p>{CERT_DETAILS[row.type]?.description}</p>
          <p className="rounded-[10px] bg-blue-soft px-3.5 py-2.5 text-sm">{CERT_DETAILS[row.type]?.evidenceHint}</p>
          <div className="flex flex-col gap-1.5">
            <label className={LABEL_CLS} htmlFor={ids.text}>
              What you did
            </label>
            <textarea
              className={TEXTAREA_CLS}
              id={ids.text}
              onChange={(event) => setEvidenceText(event.target.value)}
              placeholder="Account, who was in the room, and the outcome…"
              rows={5}
              value={evidenceText}
            />
            <span className="font-mono text-xs text-muted">{evidenceText.trim().length}/20 characters minimum</span>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={LABEL_CLS} htmlFor={ids.url}>
              Link to recording or recap (optional)
            </label>
            <input
              className={FIELD_CLS}
              id={ids.url}
              onChange={(event) => setEvidenceUrl(event.target.value)}
              placeholder="https://…"
              type="url"
              value={evidenceUrl}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={LABEL_CLS} htmlFor={ids.file}>
              Attach a file (optional)
            </label>
            <input
              accept=".pdf,.png,.jpg,.jpeg,.webp,.mp4,.webm,.pptx,.txt"
              className="rounded-[14px] border-[1.5px] border-dashed border-dash p-4 text-sm text-muted"
              id={ids.file}
              onChange={(event) => setEvidenceFile(event.target.files?.[0] ?? null)}
              type="file"
            />
          </div>
        </div>
      ) : null}
    </Drawer>
  );
}

function ReviewDrawer({ row, seName, onClose, onDone }: { row: GateRow | null; seName?: string; onClose: () => void; onDone: () => void }) {
  const notesId = useId();
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => setNotes(""), [row]);

  async function review(status: "approved" | "revoked") {
    if (!row?.record) return;
    setSaving(true);
    const response = await fetch(`/api/certifications/${row.record.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status,
        managerNotes:
          notes.trim() || (status === "approved" ? "Cleared for field readiness." : "Needs more evidence before sign-off."),
      }),
    });
    setSaving(false);
    if (!response.ok) {
      toast.error("Review failed.");
      return;
    }
    toast(status === "approved" ? `Approved · ${seName ?? "SE"} notified` : `Changes requested · ${seName ?? "SE"} notified`);
    onDone();
  }

  return (
    <Drawer
      footer={
        <>
          <button className="btn-primary" disabled={saving} onClick={() => void review("approved")} type="button">
            Approve
          </button>
          <button className="btn-secondary" disabled={saving} onClick={() => void review("revoked")} type="button">
            Request changes
          </button>
        </>
      }
      onClose={onClose}
      open={Boolean(row)}
      title={row ? row.label : ""}
    >
      {row ? (
        <div className="flex flex-col gap-4 text-[15px] leading-[1.5] text-ink-2">
          <p className="label-mono">
            {seName ?? "SE"} · sims {row.simsMet}/{row.simsRequired} at {SIM_PASS_SCORE}+ · challenge{" "}
            {row.challengeMet ? "met" : "missing"}
          </p>
          <p className="text-ink">{row.record?.evidence_text ?? "No evidence text."}</p>
          {row.record?.evidence_url && !row.record.evidence_url.startsWith("storage:") ? (
            <a className="link self-start text-sm" href={row.record.evidence_url} rel="noopener noreferrer" target="_blank">
              Open attachment<span className="sr-only"> (opens in a new tab)</span>
            </a>
          ) : row.record?.evidence_url ? (
            <span className="font-mono text-xs text-muted">File attached in evidence storage</span>
          ) : null}
          <div className="flex flex-col gap-1.5">
            <label className={LABEL_CLS} htmlFor={notesId}>
              Feedback
            </label>
            <textarea
              className={TEXTAREA_CLS}
              id={notesId}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Optional for approval"
              rows={4}
              value={notes}
            />
          </div>
        </div>
      ) : null}
    </Drawer>
  );
}

function TeamOverview({ profiles, teamCerts }: { profiles: TeamProfile[]; teamCerts: CertificationRecord[] }) {
  const pending = teamCerts
    .filter((cert) => cert.status === "submitted")
    .map((cert) => ({ ...cert, profileName: profiles.find((p) => p.id === cert.userId)?.fullName ?? "Unknown" }));
  const roster = profiles.map((profile) => {
    const certs = teamCerts.filter((cert) => cert.userId === profile.id);
    return {
      profile,
      approved: certs.filter((cert) => cert.status === "approved").length,
      submitted: certs.filter((cert) => cert.status === "submitted").length,
    };
  });

  return (
    <div className="flex flex-col gap-7">
      <section aria-labelledby="pending-signoffs" className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-lg font-extrabold text-ink" id="pending-signoffs">
            Pending sign-offs
          </h2>
          <span className="label-mono">{pending.length} waiting</span>
        </div>
        {pending.length > 0 ? (
          <ul className="overflow-hidden rounded-[14px] border border-line bg-white">
            {pending.map((cert) => (
              <li
                className="flex flex-wrap items-center justify-between gap-3 border-b border-divider bg-signal-soft px-5 py-3 last:border-b-0"
                key={cert.id}
              >
                <span className="flex flex-col">
                  <span className="text-[15px] font-bold text-ink">{certLabel(cert.certificationType)}</span>
                  <span className="text-sm text-ink-2">{cert.profileName} · submitted for sign-off</span>
                </span>
                <Link className="link text-sm" href={`${CERT_BASE}?profile=${cert.userId}`}>
                  Review
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-[14px] border-[1.5px] border-dashed border-line-strong p-6 text-[15px] text-muted">
            No pending sign-offs. When an SE submits evidence it appears here.
          </p>
        )}
      </section>

      <section aria-labelledby="team-roster" className="flex flex-col gap-2">
        <h2 className="text-lg font-extrabold text-ink" id="team-roster">
          Team readiness roster
        </h2>
        <div className="overflow-x-auto rounded-[14px] border border-line bg-white">
          <table className="w-full min-w-[640px] border-collapse text-left text-[15px]">
            <thead className="bg-blue font-mono text-xs text-white uppercase">
              <tr>
                <th className="px-5 py-[11px] font-medium" scope="col">SE</th>
                <th className="px-3 py-[11px] font-medium" scope="col">Level</th>
                <th className="px-3 py-[11px] font-medium" scope="col">Cleared</th>
                <th className="px-3 py-[11px] font-medium" scope="col">Pending</th>
                <th className="px-5 py-[11px]" scope="col">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {roster.map(({ profile, approved, submitted }) => (
                <tr className="border-b border-divider last:border-b-0" key={profile.id}>
                  <th className="px-5 py-3 font-bold text-ink" scope="row">{profile.fullName}</th>
                  <td className="px-3 py-3 font-mono text-xs uppercase">{profile.level}</td>
                  <td className="px-3 py-3">
                    <span className="text-[22px] font-extrabold tracking-[-0.03em] text-ink">{approved}</span>
                    <span className="text-muted"> / {ALL_CERT_ORDER.length}</span>
                  </td>
                  <td className="px-3 py-3">
                    {submitted > 0 ? <Tag tone="signal">● {submitted} pending</Tag> : <span className="text-muted">—</span>}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <Link className="link text-sm" href={`${CERT_BASE}?profile=${profile.id}`}>
                      View gates
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

/**
 * Readiness › Certification (artboard 5b). SEs see the evidence matrix and submit the next gate;
 * managers see the team roster, or one SE's matrix with Approve / Request changes.
 * Props stay compatible with the previous CertificationGates; the evidence inputs are optional.
 */
export function CertificationGates({
  viewerId,
  userId,
  isManager,
  profileName,
  profileLevel,
  teamProfiles,
  initialTeamCerts,
  profile,
  coachingCards = [],
  submissions = [],
  challenges = [],
  reviewerFirstName = null,
}: {
  viewerId: string;
  userId: string | null;
  isManager: boolean;
  profileName?: string;
  profileLevel?: SeLevel;
  teamProfiles?: TeamProfile[];
  initialTeamCerts?: CertificationRecord[];
  /** @deprecated kept for API compatibility */
  planProgress?: number;
  /** @deprecated kept for API compatibility */
  avgSimScore?: number | null;
  /** The SE whose gates are shown (for the ID badge). */
  profile?: Profile;
  coachingCards?: CoachingCard[];
  submissions?: ChallengeSubmission[];
  challenges?: Challenge[];
  reviewerFirstName?: string | null;
}) {
  const [records, setRecords] = useState<GateRecord[]>([]);
  const [loading, setLoading] = useState(Boolean(userId));
  const [submitting, setSubmitting] = useState<GateRow | null>(null);
  const [reviewing, setReviewing] = useState<GateRow | null>(null);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const response = await fetch(`/api/certifications?userId=${userId}`);
    if (response.ok) {
      const body = (await response.json()) as { certifications: GateRecord[] };
      setRecords(body.certifications);
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    void load();
  }, [load]);

  const input = useMemo(
    () => ({ records, coachingCards, submissions, challenges, userId: userId ?? "", reviewerFirstName }),
    [records, coachingCards, submissions, challenges, userId, reviewerFirstName],
  );
  const rows = useMemo(() => buildGateRows(input), [input]);
  const agentic = useMemo(() => buildAgenticRows(input), [input]);

  if (!userId && isManager && teamProfiles) {
    return (
      <div className="flex flex-col">
        <CertHeader eyebrow="Team · certification" title="Team certification readiness" />
        <div className="px-[var(--gutter)] pb-7">
          <TeamOverview profiles={teamProfiles} teamCerts={initialTeamCerts ?? []} />
        </div>
      </div>
    );
  }

  const level = profileLevel ?? "Basic";
  const stageIndex = CAREER_STAGES.findIndex((stage) => stage.level === level);
  const nextLevel = CAREER_STAGES[stageIndex + 1]?.level ?? null;
  const title = nextLevel ? `${level} → ${nextLevel}` : level;
  const isSelfView = !isManager && userId === viewerId;
  const primary = isSelfView ? nextGate(rows) : null;
  const primaryCanSubmit = primary ? canSubmitGate(primary) : false;
  const pendingReview = isManager ? [...rows, ...agentic].find((row) => row.status === "submitted") ?? null : null;

  const canAct = (row: GateRow) =>
    isSelfView ? canSubmitGate(row) : isManager ? row.status === "submitted" && Boolean(row.record) : false;
  const onAct = (row: GateRow) => (isSelfView ? setSubmitting(row) : setReviewing(row));

  return (
    <div className="flex flex-col">
      <CertHeader
        action={
          isSelfView && primary ? (
            primaryCanSubmit ? (
              <button className="btn-primary whitespace-nowrap" onClick={() => setSubmitting(primary)} type="button">
                Submit {primary.label} evidence
              </button>
            ) : (
              <button className="btn-primary whitespace-nowrap" disabled type="button">
                {primary.label} with {reviewerFirstName ?? "your manager"}
              </button>
            )
          ) : pendingReview ? (
            <button className="btn-primary whitespace-nowrap" onClick={() => setReviewing(pendingReview)} type="button">
              Review {pendingReview.label}
            </button>
          ) : null
        }
        backToTeam={isManager && userId !== viewerId}
        eyebrow={isManager && profileName ? `${profileName} · certification` : "Certification"}
        title={title}
      />
      <div className="flex flex-wrap items-start gap-6 px-[var(--gutter)] pb-7">
        <div className="flex min-w-0 flex-[1_1_620px] flex-col gap-2.5">
          {loading ? (
            <p className="rounded-[14px] border-[1.5px] border-dashed border-line-strong p-7 text-center text-[15px] text-muted" role="status">
              Loading gates…
            </p>
          ) : (
            <>
              <EvidenceMatrix
                actLabel={isSelfView ? "Submit evidence" : "Review"}
                agentic={agentic}
                canAct={canAct}
                onAct={onAct}
                rows={rows}
              />
              <Legend />
              <p className="text-[13px] text-muted">
                {isSelfView
                  ? `Submitting sends the gate to ${reviewerFirstName ?? "your manager"} for sign-off. Sims and challenges show what usually backs each gate.`
                  : "Approving clears the gate and notifies the SE."}
              </p>
            </>
          )}
        </div>
        <aside aria-label="Credential" className="flex w-[300px] max-w-full flex-none flex-col gap-3.5">
          {profile ? <CredentialBadge profile={profile} rows={rows} showFooter={false} /> : null}
          <FastestPath nextLevel={nextLevel} rows={rows} />
        </aside>
      </div>

      <SubmitDrawer
        onClose={() => setSubmitting(null)}
        onDone={() => {
          setSubmitting(null);
          void load();
        }}
        row={submitting}
      />
      <ReviewDrawer
        onClose={() => setReviewing(null)}
        onDone={() => {
          setReviewing(null);
          void load();
        }}
        row={reviewing}
        seName={profileName}
      />
    </div>
  );
}

function CertHeader({
  eyebrow,
  title,
  action,
  backToTeam = false,
}: {
  eyebrow: string;
  title: string;
  action?: ReactNode;
  backToTeam?: boolean;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-6 px-[var(--gutter)] pt-6 pb-[18px]">
      <div className="flex min-w-0 flex-col gap-1.5">
        <p className="label-mono">
          {backToTeam ? (
            <>
              <Link className="link text-xs" href={CERT_BASE}>
                Team
              </Link>{" "}
              / {eyebrow}
            </>
          ) : (
            <>
              <Link className="link text-xs" href="/readiness">
                Readiness
              </Link>{" "}
              / {eyebrow}
            </>
          )}
        </p>
        <h1 className="text-[32px] leading-[1.05] font-extrabold tracking-[-0.02em] text-ink">{title}</h1>
      </div>
      {action}
    </header>
  );
}


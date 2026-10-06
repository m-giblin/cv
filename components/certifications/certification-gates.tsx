"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useMemo, useState } from "react";
import { toast } from "sonner";
import { FIELD_CLS, LABEL_CLS, TEXTAREA_CLS } from "@/components/se/form-classes";
import { Drawer } from "@/components/ui/drawer";
import { DefinitionCard } from "@/components/ui/editorial";
import { PageBody, PageHeader } from "@/components/ui/page-header";
import { Stamp, type StampState } from "@/components/ui/stamp";
import { StatusPill, type StatusTone } from "@/components/ui/status-pill";
import { TableCard, TwoLineCell, rowHighlight, tdCls, thCls } from "@/components/ui/table";
import type { CertificationRecord } from "@/lib/data/get-certifications-data";
import { ALL_CERT_ORDER, CERT_DETAILS, certLabel } from "@/lib/certifications/gate-metadata";
import { CAREER_STAGES } from "@/lib/growth/career-readiness";
import {
  SIM_PASS_SCORE,
  badgeStampState,
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

const STATUS_PILL: Record<GateRow["status"], { label: string; tone: StatusTone }> = {
  cleared: { label: "Cleared", tone: "success" },
  submitted: { label: "Submitted", tone: "blue" },
  ready: { label: "Ready", tone: "warning" },
  in_progress: { label: "In progress", tone: "blue" },
  not_started: { label: "Not started", tone: "neutral" },
  locked: { label: "Locked", tone: "neutral" },
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function shortDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : `${MONTHS[date.getMonth()]} ${date.getDate()}`;
}

function rowSubline(row: GateRow, reviewer: string): { text: string; warning?: boolean } | null {
  if (row.status === "cleared") {
    const date = shortDate(row.record?.approved_at);
    return { text: date ? `Cleared ${date}` : "Cleared" };
  }
  if (row.status === "ready") return { text: "Ready for sign-off", warning: true };
  if (row.status === "submitted") return { text: `With ${reviewer} for sign-off` };
  if (row.status === "locked") return { text: row.hint };
  return null;
}

function MatrixStamp({ cell, label }: { cell: MatrixCell; label: string }) {
  if (cell.kind === "na") {
    return <span className="flex h-7 items-center text-[13px] text-muted">Not needed</span>;
  }
  return (
    <>
      <Stamp label={`${label}: ${cell.caption || cell.state}`} size={28} state={cell.state} />
      {cell.caption ? <span className="text-[13px] text-muted">{cell.caption}</span> : null}
    </>
  );
}

function EvidenceMatrix({
  rows,
  agentic,
  onAct,
  actLabel,
  canAct,
  primaryType,
  reviewer,
}: {
  rows: GateRow[];
  agentic: GateRow[];
  onAct: (row: GateRow) => void;
  actLabel: string;
  canAct: (row: GateRow) => boolean;
  primaryType: GateRow["type"] | null;
  reviewer: string;
}) {
  const ready = rows.find((row) => row.status === "ready")?.type;
  const agenticCleared = agentic.filter((row) => row.status === "cleared").length;
  const agenticSubmitted = agentic.filter((row) => row.status === "submitted").length;
  const agenticNext = agentic.find((row) => canAct(row));
  const agenticEvidence = agentic.filter((row) => row.record?.evidence_text).length;
  const stampCell = cn(tdCls, "w-[104px] px-2 py-3.5");
  const actionLink = (row: GateRow) =>
    canAct(row) && row.type !== primaryType ? (
      <button className="link text-sm" onClick={() => onAct(row)} type="button">
        {actLabel}
        <span className="sr-only"> for {row.label}</span>
      </button>
    ) : null;

  return (
    <TableCard minWidth={780}>
      <caption className="sr-only">Certification evidence by gate</caption>
      <thead>
        <tr>
          <th className={thCls} scope="col">
            Gate
          </th>
          {[`Sims ${SIM_PASS_SCORE}+`, "Challenge", "Evidence", "Sign-off"].map((label) => (
            <th className={cn(thCls, "w-[104px] px-2 text-center")} key={label} scope="col">
              {label}
            </th>
          ))}
          <th className={cn(thCls, "w-[140px] text-right")} scope="col">
            Status
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row, index) => {
          const sub = rowSubline(row, reviewer);
          const status = STATUS_PILL[row.status];
          return (
            <tr className={cn(row.type === ready && rowHighlight.ready)} key={row.type}>
              <th className={cn(tdCls, "py-3.5 font-normal", index === 0 && "border-t-0")} scope="row">
                <TwoLineCell
                  subline={sub && !sub.warning ? sub.text : undefined}
                  title={row.label}
                  warning={sub?.warning ? sub.text : undefined}
                />
              </th>
              {(
                [
                  ["Sims", row.sims],
                  ["Challenge", row.challenge],
                  ["Evidence", row.evidence],
                  ["Sign-off", row.signOff],
                ] as const
              ).map(([label, cell]) => (
                <td className={cn(stampCell, index === 0 && "border-t-0")} key={label}>
                  <span className="flex flex-col items-center gap-1.5">
                    <MatrixStamp cell={cell} label={`${row.label} ${label}`} />
                  </span>
                </td>
              ))}
              <td className={cn(tdCls, "py-3.5 text-right", index === 0 && "border-t-0")}>
                <span className="flex flex-col items-end gap-1">
                  <StatusPill tone={status.tone}>
                    {row.status === "submitted" ? `With ${reviewer}` : status.label}
                  </StatusPill>
                  {actionLink(row)}
                </span>
              </td>
            </tr>
          );
        })}
        {agentic.length > 0 ? (
          <tr>
            <th className={cn(tdCls, "py-3.5 font-normal")} scope="row">
              <TwoLineCell subline={agentic.map((row) => row.label).join(", ")} title="Agentic track, 2026" />
            </th>
            <td className={stampCell}>
              <span className="flex justify-center">
                <MatrixStamp cell={{ kind: "na" }} label="Agentic sims" />
              </span>
            </td>
            <td className={stampCell}>
              <span className="flex justify-center">
                <MatrixStamp cell={{ kind: "na" }} label="Agentic challenge" />
              </span>
            </td>
            <td className={stampCell}>
              <span className="flex flex-col items-center gap-1.5">
                <MatrixStamp
                  cell={{
                    kind: "stamp",
                    state: agenticEvidence === agentic.length ? "earned" : agenticEvidence > 0 ? "partial" : "none",
                    caption: `${agenticEvidence} of ${agentic.length}`,
                  }}
                  label="Agentic evidence"
                />
              </span>
            </td>
            <td className={stampCell}>
              <span className="flex flex-col items-center gap-1.5">
                <MatrixStamp
                  cell={{
                    kind: "stamp",
                    state: agenticCleared === agentic.length ? "earned" : agenticCleared > 0 ? "partial" : "none",
                    caption: `${agenticCleared} of ${agentic.length} signed`,
                  }}
                  label="Agentic sign-off"
                />
              </span>
            </td>
            <td className={cn(tdCls, "py-3.5 text-right")}>
              <span className="flex flex-col items-end gap-1">
                {agenticCleared === agentic.length ? (
                  <StatusPill tone="success">Cleared</StatusPill>
                ) : agenticSubmitted > 0 ? (
                  <StatusPill tone="blue">{agenticSubmitted} submitted</StatusPill>
                ) : (
                  <StatusPill tone="neutral">
                    {agenticCleared} of {agentic.length} cleared
                  </StatusPill>
                )}
                {agenticNext ? actionLink(agenticNext) : null}
              </span>
            </td>
          </tr>
        ) : null}
      </tbody>
    </TableCard>
  );
}

function Legend() {
  const items: { state: StampState; label: string }[] = [
    { state: "earned", label: "Earned" },
    { state: "ready", label: "Ready to submit" },
    { state: "partial", label: "Partly done" },
    { state: "none", label: "Not yet" },
  ];
  return (
    <ul aria-label="Stamp legend" className="flex flex-wrap items-center gap-6 text-[13px] text-muted">
      {items.map((item) => (
        <li className="flex items-center gap-2" key={item.state}>
          <Stamp size={18} state={item.state} />
          {item.label}
        </li>
      ))}
    </ul>
  );
}

function FastestPath({ rows, nextLevel }: { rows: GateRow[]; nextLevel: string | null }) {
  const steps = rows
    .filter((row) => row.status !== "cleared" && row.status !== "submitted" && row.status !== "locked")
    .slice(0, 3)
    .map((row) => {
      if (row.status === "ready") return { title: `Submit ${row.label.toLowerCase()} evidence`, sub: "All evidence is met" };
      const simsShort = Math.max(0, row.simsRequired - row.simsMet);
      if (simsShort > 0)
        return {
          title: `${simsShort === 1 ? "One simulation" : `${simsShort} simulations`} at ${SIM_PASS_SCORE}+`,
          sub: `Unblocks ${row.label.toLowerCase()}`,
        };
      if (!row.challengeMet) return { title: "Complete a reviewed challenge", sub: `Unblocks ${row.label.toLowerCase()}` };
      return { title: `Add evidence for ${row.label.toLowerCase()}`, sub: "Then submit it for sign-off" };
    });
  if (steps.length === 0) return null;
  return (
    <section aria-labelledby="fastest-path" className="flex flex-col gap-1">
      <h2 className="pb-1.5 text-lg font-extrabold text-ink" id="fastest-path">
        Fastest path{nextLevel ? ` to ${nextLevel}` : ""}
      </h2>
      <ol>
        {steps.map((step, index) => (
          <li className="grid grid-cols-[32px_minmax(0,1fr)] gap-2.5 border-t border-divider py-2.5" key={step.title}>
            <span aria-hidden className="text-xl font-extrabold text-blue">
              {index + 1}
            </span>
            <TwoLineCell subline={step.sub} title={step.title} />
          </li>
        ))}
      </ol>
    </section>
  );
}

function GateDefinition({ rows }: { rows: GateRow[] }) {
  const cleared = rows.filter((row) => row.status === "cleared").length;
  const next = nextGate(rows);
  return (
    <DefinitionCard
      inner={
        <>
          <ul className="flex gap-2">
            {rows.map((row) => (
              <li className="flex flex-1 justify-center" key={row.type}>
                <Stamp label={`${row.label}: ${STATUS_PILL[row.status].label}`} size={34} state={badgeStampState(row)} />
              </li>
            ))}
          </ul>
          <p className="text-sm text-[#C9D2E8]">
            {cleared} of {rows.length} cleared.{next ? ` ${next.short} is next.` : " Every gate is cleared."}
          </p>
        </>
      }
      partOfSpeech="noun, certification"
      word="gate"
    >
      A checkpoint where your manager confirms you can do this in front of a customer. Each one needs practice
      evidence and a sign-off.
    </DefinitionCard>
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
      size="form"
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
            <span className="text-[13px] text-muted">{evidenceText.trim().length} of 20 characters minimum</span>
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
              className="rounded-[14px] border border-dashed border-line-strong p-4 text-sm text-muted"
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
    toast(status === "approved" ? `Approved. ${seName ?? "The SE"} is notified.` : `Changes requested. ${seName ?? "The SE"} is notified.`);
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
          <p className="text-sm text-muted">
            {seName ?? "The SE"} has {row.simsMet} of {row.simsRequired} simulations at {SIM_PASS_SCORE}+, and the
            challenge is {row.challengeMet ? "met" : "missing"}.
          </p>
          <p className="text-ink">{row.record?.evidence_text ?? "No evidence text."}</p>
          {row.record?.evidence_url && !row.record.evidence_url.startsWith("storage:") ? (
            <a className="link self-start text-sm" href={row.record.evidence_url} rel="noopener noreferrer" target="_blank">
              Open attachment<span className="sr-only"> (opens in a new tab)</span>
            </a>
          ) : row.record?.evidence_url ? (
            <span className="text-[13px] text-muted">File attached in evidence storage</span>
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
          <span className="text-sm text-muted">{pending.length} waiting</span>
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
                  <span className="text-sm text-ink-2">{cert.profileName} submitted it for sign-off</span>
                </span>
                <Link className="link text-sm" href={`${CERT_BASE}?profile=${cert.userId}`}>
                  Review
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-[14px] border border-dashed border-line-strong p-6 text-[15px] text-muted">
            No pending sign-offs. When an SE submits evidence it appears here.
          </p>
        )}
      </section>

      <section aria-labelledby="team-roster" className="flex flex-col gap-2">
        <h2 className="text-lg font-extrabold text-ink" id="team-roster">
          Team readiness roster
        </h2>
        <TableCard minWidth={640}>
          <thead>
            <tr>
              <th className={thCls} scope="col">
                SE
              </th>
              <th className={thCls} scope="col">
                Level
              </th>
              <th className={thCls} scope="col">
                Cleared
              </th>
              <th className={thCls} scope="col">
                Pending
              </th>
              <th className={thCls} scope="col">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {roster.map(({ profile, approved, submitted }, index) => {
              const cell = cn(tdCls, index === 0 && "border-t-0");
              return (
                <tr key={profile.id}>
                  <th className={cn(cell, "font-bold text-ink")} scope="row">
                    {profile.fullName}
                  </th>
                  <td className={cn(cell, "text-sm text-ink-2")}>{profile.level}</td>
                  <td className={cell}>
                    <span className="num text-[22px] font-extrabold tracking-[-0.03em] text-ink">{approved}</span>
                    <span className="text-muted"> of {ALL_CERT_ORDER.length}</span>
                  </td>
                  <td className={cell}>
                    {submitted > 0 ? (
                      <StatusPill tone="warning">{submitted} pending</StatusPill>
                    ) : (
                      <span className="text-sm text-muted">None</span>
                    )}
                  </td>
                  <td className={cn(cell, "text-right")}>
                    <Link className="link text-sm" href={`${CERT_BASE}?profile=${profile.id}`}>
                      View gates
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </TableCard>
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
  /** @deprecated kept for API compatibility (the v2 ID badge). */
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
        <PageHeader accent="Who is ready to sign off." eyebrow="Team / Certification" title="Certification." />
        <PageBody className="pb-7">
          <TeamOverview profiles={teamProfiles} teamCerts={initialTeamCerts ?? []} />
        </PageBody>
      </div>
    );
  }

  const level = profileLevel ?? "Basic";
  const stageIndex = CAREER_STAGES.findIndex((stage) => stage.level === level);
  const nextLevel = CAREER_STAGES[stageIndex + 1]?.level ?? null;
  const title = nextLevel ? `${level} to ${nextLevel}.` : `${level}.`;
  const isSelfView = !isManager && userId === viewerId;
  const primary = isSelfView ? nextGate(rows) : null;
  const primaryCanSubmit = primary ? canSubmitGate(primary) : false;
  const pendingReview = isManager ? [...rows, ...agentic].find((row) => row.status === "submitted") ?? null : null;
  const reviewer = reviewerFirstName ?? "your manager";

  const canAct = (row: GateRow) =>
    isSelfView ? canSubmitGate(row) : isManager ? row.status === "submitted" && Boolean(row.record) : false;
  const onAct = (row: GateRow) => (isSelfView ? setSubmitting(row) : setReviewing(row));

  return (
    <div className="flex flex-col">
      <PageHeader
        accent="One gate at a time."
        actions={
          isSelfView && primary ? (
            primaryCanSubmit ? (
              <button className="btn-primary whitespace-nowrap" onClick={() => setSubmitting(primary)} type="button">
                Submit {primary.label.toLowerCase()} evidence
              </button>
            ) : (
              <button className="btn-primary whitespace-nowrap" disabled type="button">
                {primary.label} is with {reviewer}
              </button>
            )
          ) : pendingReview ? (
            <button className="btn-primary whitespace-nowrap" onClick={() => setReviewing(pendingReview)} type="button">
              Review {pendingReview.label.toLowerCase()}
            </button>
          ) : null
        }
        eyebrow={
          isManager && userId !== viewerId ? (
            <>
              <Link className="link" href={CERT_BASE}>
                Team
              </Link>
              &nbsp;/&nbsp;{profileName ?? "SE"}
            </>
          ) : (
            <>
              <Link className="link" href="/readiness">
                Readiness
              </Link>
              &nbsp;/&nbsp;Certification
            </>
          )
        }
        title={title}
      />
      <PageBody className="pb-7">
        <div className="grid items-start gap-[var(--rail-gap)] xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="flex min-w-0 flex-col gap-3.5">
            {loading ? (
              <p className="rounded-[14px] border border-dashed border-line-strong p-7 text-center text-[15px] text-muted" role="status">
                Loading gates…
              </p>
            ) : (
              <>
                <EvidenceMatrix
                  actLabel={isSelfView ? "Submit evidence" : "Review"}
                  agentic={agentic}
                  canAct={canAct}
                  onAct={onAct}
                  primaryType={primary?.type ?? pendingReview?.type ?? null}
                  reviewer={reviewer}
                  rows={rows}
                />
                <Legend />
                <p className="text-[13px] text-muted">
                  {isSelfView
                    ? `Submitting sends the gate to ${reviewer} for sign-off. Simulations and challenges show what usually backs each gate; they never block a submission.`
                    : "Approving clears the gate and notifies the SE."}
                </p>
              </>
            )}
          </div>
          <aside aria-label="About gates" className="flex min-w-0 flex-col gap-5">
            <GateDefinition rows={rows} />
            <FastestPath nextLevel={nextLevel} rows={rows} />
          </aside>
        </div>
      </PageBody>

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

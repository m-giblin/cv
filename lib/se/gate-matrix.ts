import { resolveCanonicalCompetency, type CanonicalCompetency } from "@/lib/competencies/canonical";
import { AGENTIC_CERT_ORDER, CERT_ORDER, type CertType, certLabel } from "@/lib/certifications/gate-metadata";
import type { Challenge, ChallengeSubmission, CoachingCard } from "@/lib/types";
import type { StampState } from "@/components/ui/stamp";

/**
 * Evidence matrix for the certification gates (Readiness › Certification, Today's ID badge).
 *
 * PROVISIONAL REQUIREMENT RULES — confirm with the enablement owner (see handoff README, "Fidelity").
 * Sims and challenges are guidance shown against each gate; they never block a submission.
 * Only the gate record itself (readiness_certifications) decides SUBMITTED / SIGNED.
 */
export const GATE_RULES: Record<
  CertType,
  { short: string; competencies: CanonicalCompetency[]; simsRequired: number; challengeRequired: number }
> = {
  solo_discovery: { short: "Disc.", competencies: ["Discovery"], simsRequired: 2, challengeRequired: 1 },
  executive_demo: {
    short: "Exec demo",
    competencies: ["Executive Demo Storytelling"],
    simsRequired: 2,
    challengeRequired: 1,
  },
  competitive_bakeoff: {
    short: "Bake-off",
    competencies: ["Competitive Positioning", "Objection Handling"],
    simsRequired: 2,
    challengeRequired: 1,
  },
  customer_workshop: {
    short: "Workshop",
    competencies: ["ISC Workflows and Forms", "Governance"],
    simsRequired: 1,
    challengeRequired: 1,
  },
  advisory_readiness: {
    short: "Advisory",
    competencies: ["SLED Vertical Knowledge", "Agentic AI"],
    simsRequired: 1,
    challengeRequired: 1,
  },
  agentic_fabric: { short: "Fabric", competencies: ["Agentic AI"], simsRequired: 0, challengeRequired: 0 },
  ais_readiness: { short: "AIS", competencies: ["Agentic AI"], simsRequired: 0, challengeRequired: 0 },
  mcp_governance: { short: "MCP", competencies: ["Governance"], simsRequired: 0, challengeRequired: 0 },
};

export const SIM_PASS_SCORE = 75;

export type GateRecord = {
  id: string;
  certification_type: string;
  status: string;
  evidence_text: string | null;
  evidence_url: string | null;
  manager_notes: string | null;
  approved_at: string | null;
};

export type MatrixCell =
  | { kind: "na" }
  | { kind: "stamp"; state: StampState; caption: string; tone?: "danger" };

export type GateRow = {
  type: CertType;
  label: string;
  short: string;
  record: GateRecord | null;
  status: "cleared" | "submitted" | "ready" | "in_progress" | "not_started" | "locked";
  sims: MatrixCell;
  challenge: MatrixCell;
  evidence: MatrixCell;
  signOff: MatrixCell;
  simsMet: number;
  simsRequired: number;
  challengeMet: boolean;
  /** Plain-language next step for this gate. */
  hint: string;
};

export type GateMatrixInput = {
  records: GateRecord[];
  coachingCards: CoachingCard[];
  submissions: ChallengeSubmission[];
  challenges: Challenge[];
  userId: string;
  reviewerFirstName?: string | null;
};

function cardMatches(card: CoachingCard, competencies: CanonicalCompetency[]): boolean {
  return card.linkedCompetencies.some((raw) => {
    const canonical = resolveCanonicalCompetency(raw);
    return canonical !== null && competencies.includes(canonical);
  });
}

function countCell(met: number, required: number): MatrixCell {
  if (required <= 0) return { kind: "na" };
  const capped = Math.min(met, required);
  const state: StampState = capped >= required ? "earned" : capped > 0 ? "partial" : "none";
  return { kind: "stamp", state, caption: `${capped}/${required}`, tone: capped === 0 ? "danger" : undefined };
}

export function buildGateRows(input: GateMatrixInput, order: CertType[] = CERT_ORDER): GateRow[] {
  const reviewer = (input.reviewerFirstName ?? "manager").toUpperCase();
  const cards = input.coachingCards.filter((card) => card.userId === input.userId && !card.isPractice);
  const reviewed = input.submissions.filter(
    (submission) => submission.userId === input.userId && submission.status === "reviewed",
  );
  const approved = new Set(
    input.records.filter((record) => record.status === "approved").map((record) => record.certification_type),
  );

  return order.map((type, index) => {
    const rules = GATE_RULES[type];
    const record = input.records.find((item) => item.certification_type === type) ?? null;
    const simsMet = cards.filter(
      (card) => card.score >= SIM_PASS_SCORE && cardMatches(card, rules.competencies),
    ).length;
    const challengeMet =
      rules.challengeRequired === 0 ||
      reviewed.some((submission) => {
        const challenge = input.challenges.find((item) => item.id === submission.challengeId);
        return (challenge?.competencyNames ?? []).some((raw) => {
          const canonical = resolveCanonicalCompetency(raw);
          return canonical !== null && rules.competencies.includes(canonical);
        });
      });
    const requirementsMet = simsMet >= rules.simsRequired && challengeMet;
    const previous = index > 0 ? order[index - 1] : undefined;
    const locked =
      Boolean(previous) &&
      !approved.has(previous!) &&
      record?.status !== "approved" &&
      record?.status !== "submitted";

    const recordStatus = record?.status ?? "not_started";
    const status: GateRow["status"] =
      recordStatus === "approved"
        ? "cleared"
        : recordStatus === "submitted"
          ? "submitted"
          : locked
            ? "locked"
            : requirementsMet
              ? "ready"
              : simsMet > 0 || challengeMet || Boolean(record?.evidence_text)
                ? "in_progress"
                : "not_started";

    const evidence: MatrixCell = record?.evidence_text
      ? { kind: "stamp", state: "earned", caption: "ATTACHED" }
      : status === "ready"
        ? { kind: "stamp", state: "none", caption: "TO ADD" }
        : { kind: "stamp", state: "none", caption: "MISSING", tone: "danger" };

    const signOff: MatrixCell =
      status === "cleared"
        ? { kind: "stamp", state: "earned", caption: "SIGNED" }
        : status === "submitted"
          ? { kind: "stamp", state: "partial", caption: `WITH ${reviewer}` }
          : status === "ready"
            ? { kind: "stamp", state: "ready", caption: "READY" }
            : { kind: "stamp", state: "none", caption: status === "locked" ? "LOCKED" : "" };

    const label = certLabel(type);
    const simsShort = Math.max(0, rules.simsRequired - simsMet);
    const hint =
      status === "cleared"
        ? `${label} is cleared.`
        : status === "submitted"
          ? `${label} is with your reviewer for sign-off.`
          : status === "ready"
            ? `${label} is ready to submit.`
            : status === "locked"
              ? `Clear ${certLabel(previous!)} first.`
              : simsShort > 0
                ? `${label} needs ${simsShort === 1 ? "one more sim" : `${simsShort} more sims`} at ${SIM_PASS_SCORE}+.`
                : `${label} needs a reviewed challenge.`;

    return {
      type,
      label,
      short: rules.short,
      record,
      status,
      sims: countCell(simsMet, rules.simsRequired),
      challenge:
        rules.challengeRequired === 0
          ? { kind: "na" }
          : challengeMet
            ? { kind: "stamp", state: "earned", caption: "MET" }
            : { kind: "stamp", state: "none", caption: "MISSING", tone: "danger" },
      evidence,
      signOff,
      simsMet,
      simsRequired: rules.simsRequired,
      challengeMet,
      hint,
    };
  });
}

export function buildAgenticRows(input: GateMatrixInput): GateRow[] {
  return buildGateRows(input, AGENTIC_CERT_ORDER);
}

/** Stamp state for the ID badge (dark): cleared → earned, ready → ready, submitted/in progress → partial. */
export function badgeStampState(row: GateRow): StampState {
  switch (row.status) {
    case "cleared":
      return "earned";
    case "ready":
      return "ready";
    case "submitted":
    case "in_progress":
      return "partial";
    default:
      return "none";
  }
}

/** The gate the SE should act on next: the first ready one, else the first submittable one. */
export function nextGate(rows: GateRow[]): GateRow | null {
  return (
    rows.find((row) => row.status === "ready") ??
    rows.find((row) => row.status === "in_progress" || row.status === "not_started") ??
    rows.find((row) => row.status === "submitted") ??
    null
  );
}

export function canSubmitGate(row: GateRow): boolean {
  return row.status === "ready" || row.status === "in_progress" || row.status === "not_started";
}

/** Server-side CertificationRecord (camelCase) → the API row shape the matrix uses. */
export function toGateRecords(
  certs: Array<{
    id: string;
    certificationType: string;
    status: string;
    evidenceText: string | null;
    evidenceUrl: string | null;
    managerNotes: string | null;
    approvedAt: string | null;
  }>,
): GateRecord[] {
  return certs.map((cert) => ({
    id: cert.id,
    certification_type: cert.certificationType,
    status: cert.status,
    evidence_text: cert.evidenceText,
    evidence_url: cert.evidenceUrl,
    manager_notes: cert.managerNotes,
    approved_at: cert.approvedAt,
  }));
}

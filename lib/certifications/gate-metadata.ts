import { CAREER_STAGES, CERT_LABELS } from "@/lib/growth/career-readiness";

export type CertType =
  | "solo_discovery"
  | "executive_demo"
  | "competitive_bakeoff"
  | "customer_workshop"
  | "advisory_readiness";

export const CERT_ORDER: CertType[] = [
  "solo_discovery",
  "executive_demo",
  "competitive_bakeoff",
  "customer_workshop",
  "advisory_readiness",
];

export const CERT_DETAILS: Record<
  CertType,
  { description: string; evidenceHint: string; careerLevel: string }
> = {
  solo_discovery: {
    careerLevel: "Basic SE",
    description: "Run a solo discovery call without a sales rep — qualify pain, map stakeholders, and exit with clear next steps.",
    evidenceHint: "Link a recording or write up: account, discovery outcomes, and manager shadow notes.",
  },
  executive_demo: {
    careerLevel: "Senior SE",
    description: "Deliver an executive-level demo — business outcomes first, crisp storyline, handles budget/timeline objections.",
    evidenceHint: "Recording or deal recap: exec audience, storyline used, and outcome.",
  },
  competitive_bakeoff: {
    careerLevel: "Senior SE",
    description: "Position SailPoint against a named competitor with differentiation, proof points, and trap-setting questions.",
    evidenceHint: "Competitive scenario write-up or bake-off recording with your positioning framework.",
  },
  customer_workshop: {
    careerLevel: "Advisory ASC",
    description: "Facilitate a customer workshop — whiteboard architecture, guide decisions, leave with a mutual action plan.",
    evidenceHint: "Workshop agenda, customer artifacts produced, and follow-up plan.",
  },
  advisory_readiness: {
    careerLevel: "Advisory ASC",
    description: "Demonstrate advisory posture — lead transformation conversations, mentor peers, and own executive relationships.",
    evidenceHint: "Advisory review packet: accounts influenced, mentoring examples, and director sign-off notes.",
  },
};

export function certLabel(type: string) {
  return CERT_LABELS[type] ?? type.replaceAll("_", " ");
}

export function stageForCert(type: CertType) {
  return CAREER_STAGES.find((stage) => stage.certifications.includes(type));
}

export function statusTone(status: string) {
  switch (status) {
    case "approved":
      return "green" as const;
    case "submitted":
      return "amber" as const;
    case "revoked":
      return "red" as const;
    default:
      return "blue" as const;
  }
}

export function statusActionLabel(status: string, isManager: boolean) {
  if (status === "approved") return "Cleared";
  if (status === "submitted") return isManager ? "Awaiting your sign-off" : "Pending manager review";
  if (status === "revoked") return "Resubmit evidence";
  return "Not started";
}

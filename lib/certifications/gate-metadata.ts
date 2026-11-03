import { CAREER_STAGES, CERT_LABELS } from "@/lib/growth/career-readiness";
import { DEFAULT_LEARNER_TERMS, type LearnerTerms } from "@/lib/tenant/learner-terms";

export type CertType =
  | "solo_discovery"
  | "executive_demo"
  | "competitive_bakeoff"
  | "customer_workshop"
  | "advisory_readiness"
  | "agentic_fabric"
  | "ais_readiness"
  | "mcp_governance";

export const CERT_ORDER: CertType[] = [
  "solo_discovery",
  "executive_demo",
  "competitive_bakeoff",
  "customer_workshop",
  "advisory_readiness",
];

export const AGENTIC_CERT_ORDER: CertType[] = [
  "agentic_fabric",
  "ais_readiness",
  "mcp_governance",
];

export const ALL_CERT_ORDER: CertType[] = [...CERT_ORDER, ...AGENTIC_CERT_ORDER];

type CertDetail = { description: string; evidenceHint: string; careerLevel: string };

/** What each gate asks for, with career levels worded in the tenant's term ("Senior SE", "Senior AE"). */
export function certDetails(terms: LearnerTerms = DEFAULT_LEARNER_TERMS): Record<CertType, CertDetail> {
  return {
    solo_discovery: {
      careerLevel: `Basic ${terms.one}`,
      description: "Run a solo discovery call without a sales rep — qualify pain, map stakeholders, and exit with clear next steps.",
      evidenceHint: "Link a recording or write up: account, discovery outcomes, and manager shadow notes.",
    },
    executive_demo: {
      careerLevel: `Senior ${terms.one}`,
      description: "Deliver an executive-level demo — business outcomes first, crisp storyline, handles budget/timeline objections.",
      evidenceHint: "Recording or deal recap: exec audience, storyline used, and outcome.",
    },
    competitive_bakeoff: {
      careerLevel: `Senior ${terms.one}`,
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
    agentic_fabric: {
      careerLevel: `All ${terms.many} · 2026`,
      description: "Position SailPoint Agentic Fabric — Discover, Govern, Protect for AI agents as first-class identities in ISC.",
      evidenceHint: "Challenge submission, sim recording, or write-up covering agent lifecycle governance and customer discovery.",
    },
    ais_readiness: {
      careerLevel: "Senior+ · AIS",
      description: "Lead Agent Identity Security conversations — agent registration, ownership, certification, and over-permission reporting.",
      evidenceHint: "AIS discovery deck, customer workshop notes, or approved agentic challenge with CISO-level framing.",
    },
    mcp_governance: {
      careerLevel: "Advisory · MCP",
      description: "Explain MCP Server as the governed bridge for third-party agents calling ISC APIs with policy and audit.",
      evidenceHint: "Architecture diagram, competitive takeout, or pitch video showing MCP governance story.",
    },
  };
}

export const CERT_DETAILS: Record<CertType, CertDetail> = certDetails();

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

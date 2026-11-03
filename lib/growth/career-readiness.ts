import { SeLevel } from "@/lib/types";
import { DEFAULT_LEARNER_TERMS, type LearnerTerms } from "@/lib/tenant/learner-terms";

export type CareerStage = {
  level: SeLevel;
  title: string;
  requirements: string[];
  certifications: string[];
};

/** The career ladder, worded with the tenant's term ("Basic SE", "Basic AE"). */
export function careerStages(terms: LearnerTerms = DEFAULT_LEARNER_TERMS): CareerStage[] {
  return [
    {
      level: "Basic",
      title: `Basic ${terms.one}`,
      requirements: ["Complete onboarding plan", "First ISC discovery challenge", "SLED roleplay simulation"],
      certifications: ["solo_discovery"],
    },
    {
      level: "Senior",
      title: `Senior ${terms.one}`,
      requirements: ["Executive demo storytelling", "Competitive positioning", "Quarterly dev plan on track"],
      certifications: ["executive_demo", "competitive_bakeoff"],
    },
    {
      level: "Advisory",
      title: "Advisory Solutions Consultant",
      requirements: ["Customer workshop facilitation", "Advisory readiness review", `Mentor other ${terms.many}`],
      certifications: ["customer_workshop", "advisory_readiness"],
    },
  ];
}

/** The career ladder with the default SE wording, for code that only reads levels and certifications. */
export const CAREER_STAGES: CareerStage[] = careerStages();

export const CERT_LABELS: Record<string, string> = {
  solo_discovery: "Solo discovery call",
  executive_demo: "Executive demo",
  competitive_bakeoff: "Competitive bake-off",
  customer_workshop: "Customer workshop",
  advisory_readiness: "Advisory readiness",
  agentic_fabric: "Agentic Fabric readiness",
  ais_readiness: "AIS readiness",
  mcp_governance: "MCP governance",
};

export function computeCareerProgress(params: {
  currentLevel: SeLevel;
  approvedCerts: string[];
  planProgress: number;
  avgSimScore: number | null;
  terms?: LearnerTerms;
}) {
  const stages = careerStages(params.terms);
  const stageIndex = stages.findIndex((stage) => stage.level === params.currentLevel);
  const nextStage = stages[stageIndex + 1];

  if (!nextStage) {
    return { currentStage: stages[stageIndex], nextStage: null, readinessPercent: 100 };
  }

  const certDone = nextStage.certifications.filter((cert) => params.approvedCerts.includes(cert)).length;
  const certTotal = nextStage.certifications.length;
  const certPercent = certTotal > 0 ? (certDone / certTotal) * 100 : 100;
  const planPercent = params.planProgress;
  const simPercent = params.avgSimScore !== null ? Math.min(100, (params.avgSimScore / 5) * 100) : 50;

  const readinessPercent = Math.round((certPercent * 0.5 + planPercent * 0.25 + simPercent * 0.25));

  return { currentStage: stages[stageIndex], nextStage, readinessPercent };
}

export function practiceCadenceMessage(lastSimDate: string | null): string {
  if (!lastSimDate) {
    return "No simulations yet — run your first roleplay this week.";
  }

  const daysSince = Math.floor((Date.now() - new Date(lastSimDate).getTime()) / (1000 * 60 * 60 * 24));

  if (daysSince > 30) {
    return "Overdue — schedule a maintenance simulation this month.";
  }

  if (daysSince > 14) {
    return "Due soon — keep sharp with a practice sim in the next two weeks.";
  }

  return "On track — great practice cadence.";
}

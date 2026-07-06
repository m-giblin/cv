import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import type { CertType } from "@/lib/certifications/gate-metadata";
import { SAILPOINT_CHALLENGE_LIBRARY } from "@/lib/challenges/sailpoint-challenge-library";
import { tokenizeQuery } from "@/lib/isc-lab/doc-index";

export type CertificationNudge = {
  certType: CertType;
  label: string;
  reason: string;
  href: string;
};

export type ChallengeNudge = {
  challengeId: string;
  title: string;
  reason: string;
  href: string;
};

function certForQuery(query: string): CertificationNudge | null {
  const q = query.toLowerCase();
  if (/mcp|model context|third.party agent|api bridge/.test(q)) {
    return {
      certType: "mcp_governance",
      label: "MCP governance certification",
      reason: "Your question maps to the MCP governance gate.",
      href: "/certifications#mcp_governance",
    };
  }
  if (/ais|agent identity|non.human|machine account|service principal/.test(q)) {
    return {
      certType: "ais_readiness",
      label: "AIS readiness certification",
      reason: "Agent identity depth aligns with the AIS readiness gate.",
      href: "/certifications#ais_readiness",
    };
  }
  if (/agentic|shadow ai|fabric|genai/.test(q)) {
    return {
      certType: "agentic_fabric",
      label: "Agentic Fabric certification",
      reason: "Agentic positioning practice maps to the Agentic Fabric gate.",
      href: "/certifications#agentic_fabric",
    };
  }
  if (/competitive|okta|entra|bake.?off/.test(q)) {
    return {
      certType: "competitive_bakeoff",
      label: "Competitive bake-off certification",
      reason: "Competitive framing practice supports the bake-off gate.",
      href: "/certifications",
    };
  }
  return null;
}

export async function buildCertificationAndChallengeNudges(
  supabase: SupabaseClient<Database>,
  userId: string,
  query: string,
): Promise<{ cert: CertificationNudge | null; challenge: ChallengeNudge | null }> {
  const certNudge = certForQuery(query);

  const { data: certs } = await supabase
    .from("readiness_certifications")
    .select("certification_type, status")
    .eq("user_id", userId);

  const approved = new Set(
    (certs ?? []).filter((row) => row.status === "approved").map((row) => row.certification_type),
  );

  const cert =
    certNudge && !approved.has(certNudge.certType)
      ? certNudge
      : null;

  const tokens = tokenizeQuery(query);
  const challenge = SAILPOINT_CHALLENGE_LIBRARY.find((entry) => {
    const haystack = `${entry.title} ${(entry.competencyNames ?? []).join(" ")}`.toLowerCase();
    return tokens.some((token) => haystack.includes(token));
  });

  const challengeNudge = challenge
    ? {
        challengeId: challenge.id,
        title: challenge.title,
        reason: "Practice this challenge to reinforce what you asked about.",
        href: `/challenges?challenge=${challenge.id}`,
      }
    : null;

  return { cert, challenge: challengeNudge };
}

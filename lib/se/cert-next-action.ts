import { CERT_LABELS, CAREER_STAGES } from "@/lib/growth/career-readiness";
import type { CertificationRecord } from "@/lib/data/get-certifications-data";
import type { SeLevel } from "@/lib/types";

export type CertNextAction = {
  certificationType: string;
  label: string;
  status: string;
  href: string;
};

export function computeCertNextAction(
  level: SeLevel,
  certs: CertificationRecord[],
): CertNextAction | null {
  const approved = new Set(
    certs.filter((cert) => cert.status === "approved").map((cert) => cert.certificationType),
  );

  const stage =
    CAREER_STAGES.find((item) => item.level === level) ??
    CAREER_STAGES.find((item) => item.certifications.some((cert) => !approved.has(cert)));

  if (!stage) {
    return null;
  }

  const nextType =
    stage.certifications.find((cert) => !approved.has(cert)) ??
    CAREER_STAGES.flatMap((item) => item.certifications).find((cert) => !approved.has(cert));

  if (!nextType) {
    return null;
  }

  const record = certs.find((cert) => cert.certificationType === nextType);
  const status = record?.status ?? "not_started";

  if (status === "approved") {
    return null;
  }

  if (status === "submitted") {
    return {
      certificationType: nextType,
      label: CERT_LABELS[nextType] ?? nextType.replaceAll("_", " "),
      status: "submitted",
      href: "/certifications",
    };
  }

  return {
    certificationType: nextType,
    label: CERT_LABELS[nextType] ?? nextType.replaceAll("_", " "),
    status,
    href: "/certifications",
  };
}

export function averageSimScore(scores: number[]) {
  if (scores.length === 0) {
    return null;
  }

  return scores.reduce((sum, score) => sum + score, 0) / scores.length;
}

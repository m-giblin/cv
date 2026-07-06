import type { DealPrepOutput } from "@/lib/ai/schemas";

export type BuyerRoomResource = {
  label: string;
  url?: string;
  body?: string;
};

export type BuyerRoomPayload = {
  executiveSummary: string;
  personalizationBullets: string[];
  resources: BuyerRoomResource[];
  proofPoints: string[];
  accountName: string;
  seName?: string;
};

export function buildRoomPayloadFromPrep(
  prep: DealPrepOutput,
  options?: { seName?: string; extraResources?: BuyerRoomResource[] },
): BuyerRoomPayload {
  const resources: BuyerRoomResource[] = [
    ...(options?.extraResources ?? []),
    ...prep.linkedResources.map((label) => ({ label, url: `/resources?q=${encodeURIComponent(label)}` })),
    ...prep.proofPoints.slice(0, 3).map((point) => ({ label: "Proof point", body: point })),
  ];

  return {
    accountName: prep.accountName,
    seName: options?.seName,
    executiveSummary: prep.executiveSummary,
    personalizationBullets: prep.personalizationBullets ?? [],
    resources,
    proofPoints: prep.proofPoints ?? [],
  };
}

export function shareUrl(token: string) {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3003";
  return `${base}/share/${token}`;
}

export function newShareToken() {
  return crypto.randomUUID().replace(/-/g, "");
}

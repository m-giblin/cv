import Link from "next/link";
import { IdBadge } from "@/components/ui/id-badge";
import { badgeStampState, nextGate, type GateRow } from "@/lib/se/gate-matrix";
import type { Profile } from "@/lib/types";
import { initials } from "@/lib/utils";

/** Short credential id derived from the profile id, e.g. "ID 3F2A". */
export function credentialId(profile: Pick<Profile, "id">): string {
  return `ID ${profile.id.replace(/[^a-z0-9]/gi, "").slice(0, 4).toUpperCase()}`;
}

/** ID badge with the career gate stamps. `showFooter` adds the "next stamp" line and link. */
export function CredentialBadge({
  profile,
  rows,
  showFooter = true,
}: {
  profile: Profile;
  rows: GateRow[];
  showFooter?: boolean;
}) {
  const next = nextGate(rows);
  return (
    <IdBadge
      footer={
        showFooter ? (
          <>
            <span className="text-sm leading-[1.45]">
              {next ? `Next stamp: ${next.hint}` : "Every career gate is cleared."}
            </span>
            <Link
              className="self-start text-sm font-bold text-signal underline decoration-signal decoration-2 underline-offset-[3px] hover:text-white hover:decoration-white"
              href="/readiness/certification"
            >
              View gates
            </Link>
          </>
        ) : undefined
      }
      gates={rows.map((row) => ({ id: row.type, label: row.short, state: badgeStampState(row) }))}
      idLine={`${profile.level} SE · ${credentialId(profile)}`}
      initials={initials(profile.fullName)}
      name={profile.fullName}
    />
  );
}

"use client";

import { EmptyLine, LineCard } from "@/components/platform/platform-ui";
import type { OperatorDigestEntry } from "@/lib/platform/mission-control-types";

export function PlatformOperatorDigest({ entries }: { entries: OperatorDigestEntry[] }) {
  return (
    <LineCard meta="Last 24 hours" title="Operator activity">
      {entries.length === 0 ? (
        <EmptyLine>No operator actions in the last 24 hours.</EmptyLine>
      ) : (
        <ul className="max-h-[360px] overflow-y-auto">
          {entries.map((entry) => (
            <li className="border-b border-divider px-5 py-3 last:border-b-0" key={entry.id}>
              <p className="text-sm font-semibold break-words text-ink">{entry.action}</p>
              <p className="mt-0.5 text-[13px] text-muted">
                {entry.actorName ?? "Operator"}, {entry.hoursAgo === 0 ? "within the hour" : `${entry.hoursAgo}h ago`}
                {entry.tenantId ? ` in tenant ${entry.tenantId.slice(0, 8)}` : ""}
              </p>
            </li>
          ))}
        </ul>
      )}
    </LineCard>
  );
}
